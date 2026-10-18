import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers/test-context.js';
import { createFakeClock } from './helpers/fake-clock.js';
import { UUID_PATTERN, createProject, createTask, findErrorDetail, sampleProjectInput, sampleTaskInput } from './helpers/fixtures.js';

describe('Proje işlemleri', () => {
  let context;
  let clock;

  beforeEach(async () => {
    clock = createFakeClock('2026-10-01T09:00:00.000Z');
    context = await createTestContext({ clock });
  });

  afterEach(() => context.cleanup());

  describe('POST /projects', () => {
    it('projeyi varsayılan durumla oluşturur', async () => {
      const response = await context.api.post('/projects').send(sampleProjectInput).expect(201);
      const createdProject = response.body.data;

      assert.match(createdProject.id, UUID_PATTERN);
      assert.deepEqual(createdProject, {
        id: createdProject.id,
        ...sampleProjectInput,
        status: 'active',
        createdAt: '2026-10-01T09:00:00.000Z',
        updatedAt: '2026-10-01T09:00:00.000Z',
      });
      assert.equal(response.headers.location, `/projects/${createdProject.id}`);
    });

    it('açıklama verilmezse null olarak kaydeder', async () => {
      const createdProject = await createProject(context.api, { description: undefined });

      assert.equal(createdProject.description, null);
    });

    it('aynı isimde ikinci projeyi büyük-küçük harf gözetmeden 409 ile reddeder', async () => {
      await createProject(context.api);

      const response = await context.api.post('/projects').send({ name: 'MOBİL UYGULAMA' }).expect(409);

      assert.equal(response.body.error.code, 'CONFLICT');
    });

    it('ASCII büyük I ile yazılan aynı adı da mükerrer sayar', async () => {
      await createProject(context.api);

      await context.api.post('/projects').send({ name: 'MOBIL UYGULAMA' }).expect(409);
    });

    it('proje adı olmadan oluşturmayı reddeder', async () => {
      const response = await context.api.post('/projects').send({ description: 'İsimsiz' }).expect(400);

      assert.ok(findErrorDetail(response.body, 'name'));
    });
  });

  describe('GET /projects', () => {
    it('projeleri duruma göre filtreler', async () => {
      await createProject(context.api, { name: 'Raporlama Modülü', status: 'planned' });
      await createProject(context.api);

      const response = await context.api.get('/projects?status=planned').expect(200);

      assert.deepEqual(response.body.data.map((project) => project.name), ['Raporlama Modülü']);
    });
  });

  describe('GET /projects/:projectId/tasks', () => {
    it('yalnızca projeye ait görevleri filtrelerle birlikte listeler', async () => {
      const mobileProject = await createProject(context.api);
      await createTask(context.api, { title: 'Giriş ekranı', projectId: mobileProject.id, priority: 'high' });
      await createTask(context.api, { title: 'Bildirimler', projectId: mobileProject.id, priority: 'low' });
      await createTask(context.api, { title: 'Projesiz görev' });

      const response = await context.api.get(`/projects/${mobileProject.id}/tasks?priority=high`).expect(200);

      assert.deepEqual(response.body.data.map((task) => task.title), ['Giriş ekranı']);
    });

    it('olmayan bir proje için 404 döndürür', async () => {
      await context.api.get('/projects/0f8d6b2c-1111-4111-8111-111111111111/tasks').expect(404);
    });
  });

  describe('güncelleme ve silme', () => {
    it('PATCH ile proje durumunu günceller', async () => {
      const createdProject = await createProject(context.api);
      clock.advanceByMinutes(1);

      const response = await context.api.patch(`/projects/${createdProject.id}`).send({ status: 'completed' }).expect(200);

      assert.deepEqual(response.body.data, { ...createdProject, status: 'completed', updatedAt: '2026-10-01T09:01:00.000Z' });
    });

    it('PUT ile projeyi tamamen değiştirir', async () => {
      const createdProject = await createProject(context.api, { status: 'planned' });

      const response = await context.api.put(`/projects/${createdProject.id}`).send({ name: 'Mobil Uygulama v2' }).expect(200);

      assert.equal(response.body.data.name, 'Mobil Uygulama v2');
      assert.equal(response.body.data.description, null);
      assert.equal(response.body.data.status, 'active');
    });

    it('başka bir projenin adına geçişi 409 ile reddeder', async () => {
      await createProject(context.api, { name: 'Web Paneli' });
      const mobileProject = await createProject(context.api);

      await context.api.patch(`/projects/${mobileProject.id}`).send({ name: 'web paneli' }).expect(409);
    });

    it('görevi olmayan projeyi siler', async () => {
      const createdProject = await createProject(context.api);

      await context.api.delete(`/projects/${createdProject.id}`).expect(204);
      await context.api.get(`/projects/${createdProject.id}`).expect(404);
    });

    it('görevleri olan projenin silinmesini 409 ile engeller', async () => {
      const createdProject = await createProject(context.api);
      await createTask(context.api, { projectId: createdProject.id });

      const response = await context.api.delete(`/projects/${createdProject.id}`).expect(409);

      assert.match(response.body.error.message, /1 görev/);
    });
  });

  it('olmayan bir projeye görev bağlanmasını 400 ile reddeder', async () => {
    const response = await context.api
      .post('/tasks')
      .send({ ...sampleTaskInput, projectId: '0f8d6b2c-1111-4111-8111-111111111111' })
      .expect(400);

    assert.match(findErrorDetail(response.body, 'projectId').message, /proje bulunamadı/);
  });
});
