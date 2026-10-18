import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers/test-context.js';
import { createFakeClock } from './helpers/fake-clock.js';
import { UUID_PATTERN, createTask, createUser, findErrorDetail, sampleTaskInput, sampleUserInput } from './helpers/fixtures.js';

describe('Çalışan (users) işlemleri', () => {
  let context;
  let clock;

  beforeEach(async () => {
    clock = createFakeClock('2026-10-01T09:00:00.000Z');
    context = await createTestContext({ clock });
  });

  afterEach(() => context.cleanup());

  describe('POST /users', () => {
    it('çalışanı oluşturur ve 201 döndürür', async () => {
      const response = await context.api.post('/users').send(sampleUserInput).expect(201);
      const createdUser = response.body.data;

      assert.match(createdUser.id, UUID_PATTERN);
      assert.deepEqual(createdUser, {
        id: createdUser.id,
        ...sampleUserInput,
        createdAt: '2026-10-01T09:00:00.000Z',
        updatedAt: '2026-10-01T09:00:00.000Z',
      });
      assert.equal(response.headers.location, `/users/${createdUser.id}`);
    });

    it('kullanıcı adını ve e-postayı küçük harfe çevirir, rol verilmezse developer atar', async () => {
      const createdUser = await createUser(context.api, { username: ' Elif.Kara ', email: 'Elif.Kara@TaskFlow.dev', role: undefined });

      assert.equal(createdUser.username, 'elif.kara');
      assert.equal(createdUser.email, 'elif.kara@taskflow.dev');
      assert.equal(createdUser.role, 'developer');
    });

    it('aynı kullanıcı adıyla ikinci kaydı 409 ile reddeder', async () => {
      await createUser(context.api);

      const response = await context.api.post('/users').send({ ...sampleUserInput, email: 'baska@taskflow.dev' }).expect(409);

      assert.equal(response.body.error.code, 'CONFLICT');
      assert.match(response.body.error.message, /"musa" kullanıcı adı/);
    });

    it('aynı anda gelen iki kayıttan yalnızca birini kabul eder', async () => {
      const responses = await Promise.all([
        context.api.post('/users').send(sampleUserInput),
        context.api.post('/users').send({ ...sampleUserInput, email: 'musa.ikinci@taskflow.dev' }),
      ]);

      assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
      const listResponse = await context.api.get('/users').expect(200);
      assert.equal(listResponse.body.pagination.totalItems, 1);
    });

    it('aynı e-posta adresiyle ikinci kaydı 409 ile reddeder', async () => {
      await createUser(context.api);

      await context.api.post('/users').send({ ...sampleUserInput, username: 'musa2', email: 'MUSA@taskflow.dev' }).expect(409);
    });

    it('geçersiz e-posta ve rol değerlerini reddeder', async () => {
      const response = await context.api.post('/users').send({ ...sampleUserInput, email: 'musa-at-taskflow', role: 'ceo' }).expect(400);

      assert.equal(findErrorDetail(response.body, 'email').message, 'email alanı geçerli bir e-posta adresi olmalıdır.');
      assert.ok(findErrorDetail(response.body, 'role'));
    });
  });

  describe('GET /users', () => {
    it('çalışanları role göre filtreleyip kullanıcı adına göre sıralar', async () => {
      await createUser(context.api, { username: 'zeynep', email: 'zeynep@taskflow.dev', role: 'tester' });
      await createUser(context.api, { username: 'can', email: 'can@taskflow.dev', role: 'tester' });
      await createUser(context.api);

      const response = await context.api.get('/users?role=tester&sort=username').expect(200);

      assert.deepEqual(response.body.data.map((user) => user.username), ['can', 'zeynep']);
      assert.equal(response.body.pagination.totalItems, 2);
    });
  });

  describe('GET /users/:userId', () => {
    it('çalışan detayını döndürür, olmayan için 404 verir', async () => {
      const createdUser = await createUser(context.api);

      const response = await context.api.get(`/users/${createdUser.id}`).expect(200);
      assert.deepEqual(response.body.data, createdUser);

      await context.api.get('/users/olmayan-calisan').expect(404);
    });
  });

  describe('PUT ve PATCH /users/:userId', () => {
    it('PATCH ile yalnızca gönderilen alanları günceller', async () => {
      const createdUser = await createUser(context.api);
      clock.advanceByMinutes(15);

      const response = await context.api.patch(`/users/${createdUser.id}`).send({ role: 'manager' }).expect(200);

      assert.deepEqual(response.body.data, { ...createdUser, role: 'manager', updatedAt: '2026-10-01T09:15:00.000Z' });
    });

    it('PUT ile çalışanı tamamen günceller', async () => {
      const createdUser = await createUser(context.api, { role: 'manager' });

      const response = await context.api
        .put(`/users/${createdUser.id}`)
        .send({ fullName: 'Musa Can Demir', email: 'musa.demir@taskflow.dev' })
        .expect(200);

      assert.equal(response.body.data.fullName, 'Musa Can Demir');
      assert.equal(response.body.data.role, 'developer');
      assert.equal(response.body.data.username, 'musa');
    });

    it('kullanıcı adının değiştirilmesine izin vermez', async () => {
      const createdUser = await createUser(context.api);

      const response = await context.api.patch(`/users/${createdUser.id}`).send({ username: 'yeni.ad' }).expect(400);

      assert.equal(findErrorDetail(response.body, 'username').message, 'username alanı oluşturulduktan sonra değiştirilemez.');
    });

    it('başka bir çalışanın e-postasına geçişi 409 ile reddeder', async () => {
      await createUser(context.api, { username: 'ayse', email: 'ayse@taskflow.dev' });
      const secondUser = await createUser(context.api);

      await context.api.patch(`/users/${secondUser.id}`).send({ email: 'ayse@taskflow.dev' }).expect(409);
    });

    it('çalışan kendi e-postasını yeniden gönderdiğinde çakışma saymaz', async () => {
      const createdUser = await createUser(context.api);

      await context.api.patch(`/users/${createdUser.id}`).send({ email: sampleUserInput.email, fullName: 'Musa D.' }).expect(200);
    });
  });

  describe('DELETE /users/:userId', () => {
    it('görevi olmayan çalışanı siler', async () => {
      const createdUser = await createUser(context.api);

      await context.api.delete(`/users/${createdUser.id}`).expect(204);
      await context.api.get(`/users/${createdUser.id}`).expect(404);
    });

    it('atanmış görevi olan çalışanın silinmesini 409 ile engeller', async () => {
      const createdUser = await createUser(context.api);
      await createTask(context.api, { assignee: 'musa' });
      await createTask(context.api, { assignee: 'musa' });

      const response = await context.api.delete(`/users/${createdUser.id}`).expect(409);

      assert.match(response.body.error.message, /2 görev/);
    });

    it('olmayan bir çalışan için 404 döndürür', async () => {
      await context.api.delete('/users/olmayan-calisan').expect(404);
    });
  });

  describe('görev ataması', () => {
    it('kayıtlı olmayan bir çalışana görev atanmasını 400 ile reddeder', async () => {
      const response = await context.api.post('/tasks').send({ ...sampleTaskInput, assignee: 'hayalet' }).expect(400);

      assert.equal(findErrorDetail(response.body, 'assignee').message, '"hayalet" kullanıcı adına sahip bir çalışan bulunamadı.');
    });

    it('kullanıcı adını büyük harfle gönderilse de eşleştirir', async () => {
      await createUser(context.api);

      const createdTask = await createTask(context.api, { assignee: 'MUSA' });

      assert.equal(createdTask.assignee, 'musa');
    });

    it('güncellemede de çalışanın varlığını kontrol eder', async () => {
      const createdTask = await createTask(context.api);

      await context.api.patch(`/tasks/${createdTask.id}`).send({ assignee: 'hayalet' }).expect(400);
    });
  });
});
