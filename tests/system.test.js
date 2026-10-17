import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers/test-context.js';

describe('Sistem uçları', () => {
  let context;

  before(async () => {
    context = await createTestContext();
  });

  after(() => context.cleanup());

  it('GET /health servis durumunu döndürür', async () => {
    const response = await context.api.get('/health').expect(200);

    assert.equal(response.body.data.status, 'ok');
    assert.equal(typeof response.body.data.uptimeInSeconds, 'number');
  });

  it('GET / API bilgisini ve kaynak bağlantılarını döndürür', async () => {
    const response = await context.api.get('/').expect(200);

    assert.equal(response.body.data.name, 'TaskFlow API');
    assert.deepEqual(Object.keys(response.body.data.resources), ['tasks', 'users', 'projects', 'reports']);
  });

  it('tanımsız bir endpoint için 404 ve açıklayıcı hata döndürür', async () => {
    const response = await context.api.get('/olmayan-endpoint').expect(404);

    assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
    assert.match(response.body.error.message, /GET \/olmayan-endpoint/);
  });

  it('desteklenmeyen karakter kodlamasını 500 yerine 415 ile reddeder', async () => {
    const response = await context.api
      .post('/tasks')
      .set('Content-Type', 'application/json; charset=latin1')
      .send('{"title":"Görev"}')
      .expect(415);

    assert.equal(response.body.error.code, 'UNSUPPORTED_CHARSET');
  });

  it('X-Powered-By başlığını göndermez', async () => {
    const response = await context.api.get('/health');

    assert.equal(response.headers['x-powered-by'], undefined);
  });
});
