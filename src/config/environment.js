import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const environmentFilePath = path.join(projectRoot, '.env');

if (existsSync(environmentFilePath)) {
  process.loadEnvFile(environmentFilePath);
}

const packageManifest = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

function readBoolean(variableName, fallbackValue) {
  const rawValue = process.env[variableName];
  if (rawValue === undefined || rawValue.trim() === '') {
    return fallbackValue;
  }
  return rawValue.trim().toLowerCase() === 'true';
}

function readPort(variableName, fallbackValue) {
  const rawValue = process.env[variableName];
  if (rawValue === undefined || rawValue.trim() === '') {
    return fallbackValue;
  }

  const port = Number(rawValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${variableName} 1 ile 65535 arasında bir tam sayı olmalıdır. Gelen değer: "${rawValue}"`);
  }
  return port;
}

function resolveProjectPath(variableName, fallbackRelativePath) {
  const configuredPath = process.env[variableName]?.trim();
  return path.resolve(projectRoot, configuredPath || fallbackRelativePath);
}

export const environment = Object.freeze({
  appName: 'TaskFlow API',
  appVersion: packageManifest.version,
  port: readPort('PORT', 3000),
  dataDirectory: resolveProjectPath('DATA_DIRECTORY', 'data'),
  logging: Object.freeze({
    logToConsole: readBoolean('LOG_TO_CONSOLE', true),
    logToFile: readBoolean('LOG_TO_FILE', true),
    logFilePath: resolveProjectPath('LOG_FILE_PATH', 'logs/requests.log'),
  }),
});
