import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { createApp } from '../src/app.js';
import { createTestContext } from './helpers/test-context.js';
import { createFakeClock } from './helpers/fake-clock.js';
import { UUID_PATTERN, createTask, sampleTaskInput } from './helpers/fixtures.js';

describe('Görev CRUD işlemleri', () => {
  let context;
  let clock;

  beforeEach(async () => {
    clock = createFakeClock('2026-10-01T09:00:00.000Z');
    context = await createTestContext({ clock });
  });

  afterEach(() => context.cleanup());

  describe('POST /tasks', () => {
    it('yeni görevi varsayılan değerlerle oluşturur ve 201 döndürür', async () => {
      const response = await context.api.post('/tasks').send(sampleTaskInput).expect(201);
      const createdTask = response.body.data;

      assert.match(createdTask.id, UUID_PATTERN);
      assert.deepEqual(createdTask, {
        id: createdTask.id,
        title: sampleTaskInput.title,
        description: sampleTaskInput.description,
        status: 'pending',
        priority: 'medium',
        assignee: null,
        projectId: null,
        dueDate: null,
        completedAt: null,
        createdAt: '2026-10-01T09:00:00.000Z',
        updatedAt: '2026-10-01T09:00:00.000Z',
      });
      assert.equal(response.headers.location, `/tasks/${createdTask.id}`);
    });

    it('metin alanlarının başındaki ve sonundaki boşlukları temizler', async () => {
      const createdTask = await createTask(context.api, { title: '   Rapor ekranı   ', description: '  Özet tablo  ' });

      assert.equal(createdTask.title, 'Rapor ekranı');
      assert.equal(createdTask.description, 'Özet tablo');
    });

    it('tamamlanmış olarak oluşturulan göreve tamamlanma zamanı atar', async () => {
      const createdTask = await createTask(context.api, { status: 'completed', dueDate: '2026-10-05' });

      assert.equal(createdTask.completedAt, '2026-10-01T09:00:00.000Z');
      assert.equal(createdTask.dueDate, '2026-10-05');
    });
  });

  describe('GET /tasks', () => {
    it('görev yokken boş bir liste döndürür', async () => {
      const response = await context.api.get('/tasks').expect(200);

      assert.deepEqual(response.body.data, []);
      assert.equal(response.body.pagination.totalItems, 0);
    });

    it('tüm görevleri sayfalama bilgisiyle listeler', async () => {
      await createTask(context.api, { title: 'Birinci görev' });
      await createTask(context.api, { title: 'İkinci görev' });

      const response = await context.api.get('/tasks').expect(200);

      assert.deepEqual(response.body.data.map((task) => task.title), ['Birinci görev', 'İkinci görev']);
      assert.deepEqual(response.body.pagination, {
        page: 1,
        limit: 10,
        totalItems: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });
  });

  describe('GET /tasks/:taskId', () => {
    it('kimliği verilen görevin detayını döndürür', async () => {
      const createdTask = await createTask(context.api);

      const response = await context.api.get(`/tasks/${createdTask.id}`).expect(200);

      assert.deepEqual(response.body.data, createdTask);
    });

    it('olmayan bir görev için 404 döndürür', async () => {
      const response = await context.api.get('/tasks/2b1f0d56-0000-4000-8000-000000000000').expect(404);

      assert.equal(response.body.error.code, 'NOT_FOUND');
      assert.match(response.body.error.message, /2b1f0d56-0000-4000-8000-000000000000/);
    });
  });

  describe('PUT /tasks/:taskId', () => {
    it('görevi tamamen değiştirir ve gönderilmeyen alanları varsayılana döndürür', async () => {
      const createdTask = await createTask(context.api, { priority: 'high', dueDate: '2026-10-10' });
      clock.advanceByMinutes(30);

      const response = await context.api
        .put(`/tasks/${createdTask.id}`)
        .send({ title: 'Yeni başlık', description: 'Yeni açıklama', status: 'in-progress' })
        .expect(200);

      assert.deepEqual(response.body.data, {
        ...createdTask,
        title: 'Yeni başlık',
        description: 'Yeni açıklama',
        status: 'in-progress',
        priority: 'medium',
        dueDate: null,
        updatedAt: '2026-10-01T09:30:00.000Z',
      });
    });

    it('olmayan bir görev için 404 döndürür', async () => {
      await context.api.put('/tasks/olmayan-gorev').send(sampleTaskInput).expect(404);
    });
  });

  describe('PATCH /tasks/:taskId', () => {
    it('yalnızca gönderilen alanları günceller', async () => {
      const createdTask = await createTask(context.api, { priority: 'low' });
      clock.advanceByMinutes(5);

      const response = await context.api.patch(`/tasks/${createdTask.id}`).send({ priority: 'high' }).expect(200);

      assert.deepEqual(response.body.data, { ...createdTask, priority: 'high', updatedAt: '2026-10-01T09:05:00.000Z' });
    });

    it('görev tamamlandığında tamamlanma zamanını kaydeder, yeniden açıldığında temizler', async () => {
      const createdTask = await createTask(context.api);
      clock.advanceByMinutes(60);

      const completedResponse = await context.api.patch(`/tasks/${createdTask.id}`).send({ status: 'completed' }).expect(200);
      assert.equal(completedResponse.body.data.completedAt, '2026-10-01T10:00:00.000Z');

      clock.advanceByMinutes(60);
      const renamedResponse = await context.api.patch(`/tasks/${createdTask.id}`).send({ title: 'Başlık düzeltildi' }).expect(200);
      assert.equal(renamedResponse.body.data.completedAt, '2026-10-01T10:00:00.000Z');

      const reopenedResponse = await context.api.patch(`/tasks/${createdTask.id}`).send({ status: 'in-progress' }).expect(200);
      assert.equal(reopenedResponse.body.data.completedAt, null);
    });

    it('olmayan bir görev için 404 döndürür', async () => {
      await context.api.patch('/tasks/olmayan-gorev').send({ priority: 'high' }).expect(404);
    });
  });

  describe('DELETE /tasks/:taskId', () => {
    it('görevi siler ve 204 döndürür', async () => {
      const createdTask = await createTask(context.api);

      const response = await context.api.delete(`/tasks/${createdTask.id}`).expect(204);

      assert.equal(response.text, '');
      await context.api.get(`/tasks/${createdTask.id}`).expect(404);
    });

    it('silinmiş ya da hiç olmamış bir görev için 404 döndürür', async () => {
      const createdTask = await createTask(context.api);
      await context.api.delete(`/tasks/${createdTask.id}`).expect(204);

      await context.api.delete(`/tasks/${createdTask.id}`).expect(404);
    });
  });

  it('görevler uygulama yeniden başlatıldığında korunur', async () => {
    const createdTask = await createTask(context.api);

    const restartedApp = createApp({
      dataDirectory: context.dataDirectory,
      logging: { logToConsole: false, logToFile: false },
    });

    const response = await supertest(restartedApp).get(`/tasks/${createdTask.id}`).expect(200);
    assert.deepEqual(response.body.data, createdTask);
  });
});
