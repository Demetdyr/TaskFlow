import { createWriteStream, mkdirSync } from 'node:fs';
import path from 'node:path';

const NANOSECONDS_PER_MILLISECOND = 1_000_000;

function formatLogLine({ timestamp, method, endpoint, statusCode, durationInMs }) {
  return `[${timestamp}] ${method} ${endpoint} ${statusCode} ${durationInMs.toFixed(1)}ms`;
}

function createFileLogWriter(logFilePath) {
  mkdirSync(path.dirname(logFilePath), { recursive: true });
  const logFileStream = createWriteStream(logFilePath, { flags: 'a' });
  logFileStream.on('error', (streamError) => {
    console.error(`Log dosyasına yazılamadı (${logFilePath}): ${streamError.message}`);
  });
  return (logLine) => logFileStream.write(`${logLine}\n`);
}

function createLogWriters({ logToConsole, logToFile, logFilePath }) {
  const logWriters = [];
  if (logToConsole) {
    logWriters.push((logLine) => console.log(logLine));
  }
  if (logToFile) {
    logWriters.push(createFileLogWriter(logFilePath));
  }
  return logWriters;
}

export function createRequestLogger({ logToConsole = true, logToFile = false, logFilePath } = {}) {
  const logWriters = createLogWriters({ logToConsole, logToFile, logFilePath });

  return function requestLogger(request, response, next) {
    if (logWriters.length === 0) {
      return next();
    }

    const timestamp = new Date().toISOString();
    const startTime = process.hrtime.bigint();

    response.once('close', () => {
      const elapsedNanoseconds = Number(process.hrtime.bigint() - startTime);
      const logLine = formatLogLine({
        timestamp,
        method: request.method,
        endpoint: request.originalUrl,
        statusCode: response.writableFinished ? response.statusCode : 'ABORTED',
        durationInMs: elapsedNanoseconds / NANOSECONDS_PER_MILLISECOND,
      });
      logWriters.forEach((writeLogLine) => writeLogLine(logLine));
    });

    return next();
  };
}
