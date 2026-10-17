import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import supertest from 'supertest';
import { createRequestLogger } from '../src/middlewares/request-logger.js';
import { createApp } from '../src/app.js';
import { waitForFileContent } from './helpers/wait-for-file.js';

const LOG_LINE_PATTERN = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] GET \/tasks\?status=completed 200 \d+\.\dms$/;

function createAppWithLogger(loggerOptions) {
  const app = express();
  app.use(createRequestLogger(loggerOptions));
  app.use(express.json());
  app.get('/tasks', (request, response) => response.json({ data: [] }));
  app.post('/tasks', (request, response) => response.status(201).json({ data: request.body }));
  app.use((error, request, response, next) => response.status(400).json({ error: error.message }));
  return app;
}

describe('İstek loglama middleware', () => {
  let temporaryDirectory;
  let consoleLogMock;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'taskflow-logger-'));
    consoleLogMock = mock.method(console, 'log', () => {});
  });

  afterEach(async () => {
    consoleLogMock.mock.restore();
    await rm(temporaryDirectory, { recursive: true, force: true });
  });

  it('method, endpoint, zaman damgası, durum kodu ve süreyi konsola yazar', async () => {
    const app = createAppWithLogger({ logToConsole: true, logToFile: false });

    await supertest(app).get('/tasks?status=completed').expect(200);

    assert.equal(consoleLogMock.mock.callCount(), 1);
    assert.match(consoleLogMock.mock.calls[0].arguments[0], LOG_LINE_PATTERN);
  });

  it('log satırlarını klasörünü de oluşturarak dosyaya ekler', async () => {
    const logFilePath = path.join(temporaryDirectory, 'logs', 'requests.log');
    const app = createAppWithLogger({ logToConsole: false, logToFile: true, logFilePath });

    await supertest(app).get('/tasks?status=completed').expect(200);
    await supertest(app).get('/tasks?status=completed').expect(200);

    const logFileContent = await waitForFileContent(logFilePath, (content) => content.trim().split('\n').length === 2);
    for (const logLine of logFileContent.trim().split('\n')) {
      assert.match(logLine, LOG_LINE_PATTERN);
    }
  });

  it('gövdesi bozuk olduğu için reddedilen istekleri de kaydeder', async () => {
    const app = createAppWithLogger({ logToConsole: true, logToFile: false });

    await supertest(app).post('/tasks').set('Content-Type', 'application/json').send('{"title":').expect(400);

    assert.match(consoleLogMock.mock.calls[0].arguments[0], /\] POST \/tasks 400 /);
  });

  it('konsol ve dosya kapalıyken hiçbir çıktı üretmez', async () => {
    const app = createAppWithLogger({ logToConsole: false, logToFile: false });

    await supertest(app).get('/tasks').expect(200);

    assert.equal(consoleLogMock.mock.callCount(), 0);
  });

  it('uygulamadaki tüm isteklere bağlıdır', async () => {
    const logFilePath = path.join(temporaryDirectory, 'app-requests.log');
    const app = createApp({
      dataDirectory: temporaryDirectory,
      logging: { logToConsole: false, logToFile: true, logFilePath },
    });

    await supertest(app).get('/health').expect(200);
    await supertest(app).get('/olmayan').expect(404);

    const logFileContent = await waitForFileContent(logFilePath, (content) => content.includes('GET /olmayan 404'));
    assert.match(logFileContent, /GET \/health 200/);
  });
});
