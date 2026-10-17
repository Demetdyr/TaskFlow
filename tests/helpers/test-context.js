import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import supertest from 'supertest';
import { createApp } from '../../src/app.js';

export async function createTestContext(appOptions = {}) {
  const dataDirectory = await mkdtemp(path.join(tmpdir(), 'taskflow-test-'));
  const app = createApp({
    dataDirectory,
    logging: { logToConsole: false, logToFile: false },
    ...appOptions,
  });

  return {
    api: supertest(app),
    dataDirectory,
    cleanup: () => rm(dataDirectory, { recursive: true, force: true }),
  };
}
