import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers/test-context.js';
import { createTask, findErrorDetail, sampleTaskInput } from './helpers/fixtures.js';

async function expectValidationError(pendingRequest, expectedField) {
  const response = await pendingRequest.expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');

  const errorDetail = findErrorDetail(response.body, expectedField);
  assert.ok(errorDetail, `"${expectedField}" için hata detayı bekleniyordu: ${JSON.stringify(response.body)}`);
  return errorDetail;
}

describe('Görev doğrulama (validation) middleware', () => {
  let context;

  before(async () => {
    context = await createTestContext();
  });

  after(() => context.cleanup());

  describe('title', () => {
    it('eksik olduğunda 400 ve açıklayıcı mesaj döndürür', async () => {
      const errorDetail = await expectValidationError(
        context.api.post('/tasks').send({ description: sampleTaskInput.description }),
        'title',
      );

      assert.deepEqual(errorDetail, { field: 'title', location: 'body', message: 'title alanı zorunludur.' });
    });

    it('yalnızca boşluktan oluştuğunda reddedilir', async () => {
      const errorDetail = await expectValidationError(context.api.post('/tasks').send({ ...sampleTaskInput, title: '    ' }), 'title');

      assert.equal(errorDetail.message, 'title alanı boş bırakılamaz.');
    });

    it('3 karakterden kısa olduğunda reddedilir', async () => {
      const errorDetail = await expectValidationError(context.api.post('/tasks').send({ ...sampleTaskInput, title: 'ab' }), 'title');

      assert.equal(errorDetail.message, 'title alanı en az 3 karakter olmalıdır.');
    });

    it('100 karakterden uzun olduğunda reddedilir', async () => {
      const errorDetail = await expectValidationError(
        context.api.post('/tasks').send({ ...sampleTaskInput, title: 'x'.repeat(101) }),
        'title',
      );

      assert.equal(errorDetail.message, 'title alanı en fazla 100 karakter olabilir.');
    });

    it('metin dışında bir tür gönderildiğinde reddedilir', async () => {
      const errorDetail = await expectValidationError(context.api.post('/tasks').send({ ...sampleTaskInput, title: 42 }), 'title');

      assert.equal(errorDetail.message, 'title alanı metin (string) olmalıdır.');
    });
  });

  describe('description', () => {
    it('eksik olduğunda reddedilir', async () => {
      await expectValidationError(context.api.post('/tasks').send({ title: sampleTaskInput.title }), 'description');
    });

    it('1000 karakterden uzun olduğunda reddedilir', async () => {
      await expectValidationError(
        context.api.post('/tasks').send({ ...sampleTaskInput, description: 'a'.repeat(1001) }),
        'description',
      );
    });
  });

  describe('priority', () => {
    it('izin verilen değerler dışında olduğunda seçenekleri listeler', async () => {
      const errorDetail = await expectValidationError(
        context.api.post('/tasks').send({ ...sampleTaskInput, priority: 'urgent' }),
        'priority',
      );

      assert.equal(errorDetail.message, 'priority alanı şu değerlerden biri olmalıdır: low, medium, high.');
    });
  });

  describe('assignee', () => {
    it('kullanıcı adı kurallarına uymadığında reddedilir', async () => {
      const errorDetail = await expectValidationError(
        context.api.post('/tasks').send({ ...sampleTaskInput, assignee: 'Musa Demir' }),
        'assignee',
      );

      assert.match(errorDetail.message, /^assignee alanı yalnızca/);
    });

    it('boş metin yerine null bekler', async () => {
      await expectValidationError(context.api.post('/tasks').send({ ...sampleTaskInput, assignee: '' }), 'assignee');
    });

    it('null gönderildiğinde görevi atanmamış olarak kaydeder', async () => {
      const createdTask = await createTask(context.api, { assignee: null });

      assert.equal(createdTask.assignee, null);
    });
  });

  describe('diğer alanlar', () => {
    it('geçersiz durum değerini reddeder', async () => {
      await expectValidationError(context.api.post('/tasks').send({ ...sampleTaskInput, status: 'done' }), 'status');
    });

    it('takvimde olmayan bir bitiş tarihini reddeder', async () => {
      const errorDetail = await expectValidationError(
        context.api.post('/tasks').send({ ...sampleTaskInput, dueDate: '2026-02-30' }),
        'dueDate',
      );

      assert.equal(errorDetail.message, 'dueDate alanı YYYY-AA-GG biçiminde geçerli bir tarih olmalıdır.');
    });

    it('UUID biçiminde olmayan proje kimliğini reddeder', async () => {
      await expectValidationError(context.api.post('/tasks').send({ ...sampleTaskInput, projectId: '42' }), 'projectId');
    });

    it('tanımsız alanları reddeder', async () => {
      const errorDetail = await expectValidationError(context.api.post('/tasks').send({ ...sampleTaskInput, tags: ['api'] }), 'tags');

      assert.match(errorDetail.message, /^tags tanımlı bir alan değil\./);
    });

    it('sunucunun yönettiği alanların istemciden gönderilmesine izin vermez', async () => {
      const response = await context.api
        .post('/tasks')
        .send({ ...sampleTaskInput, id: 'kendi-kimligim', createdAt: '2020-01-01T00:00:00.000Z' })
        .expect(400);

      assert.ok(findErrorDetail(response.body, 'id'));
      assert.ok(findErrorDetail(response.body, 'createdAt'));
    });
  });

  describe('istek gövdesi', () => {
    it('birden fazla hatayı tek yanıtta bildirir', async () => {
      const response = await context.api.post('/tasks').send({ priority: 'urgent' }).expect(400);

      assert.deepEqual(response.body.error.details.map((detail) => detail.field).sort(), ['description', 'priority', 'title']);
    });

    it('JSON nesnesi yerine dizi gönderildiğinde reddedilir', async () => {
      const response = await context.api.post('/tasks').send([sampleTaskInput]).expect(400);

      assert.equal(response.body.error.details[0].field, 'body');
    });

    it('Content-Type JSON olmadığında yönlendirici bir mesajla reddedilir', async () => {
      const response = await context.api.post('/tasks').set('Content-Type', 'text/plain').send('title=Test').expect(400);

      assert.match(response.body.error.details[0].message, /Content-Type: application\/json/);
    });

    it('bozuk JSON gönderildiğinde 400 INVALID_JSON döndürür', async () => {
      const response = await context.api.post('/tasks').set('Content-Type', 'application/json').send('{"title": "Eksik').expect(400);

      assert.equal(response.body.error.code, 'INVALID_JSON');
    });
  });

  describe('güncelleme istekleri', () => {
    it('PUT isteğinde zorunlu alanlar eksikse reddedilir', async () => {
      const createdTask = await createTask(context.api);

      await expectValidationError(context.api.put(`/tasks/${createdTask.id}`).send({ title: 'Sadece başlık' }), 'description');
    });

    it('PATCH isteğinde boş gövdeyi reddeder', async () => {
      const createdTask = await createTask(context.api);

      const errorDetail = await expectValidationError(context.api.patch(`/tasks/${createdTask.id}`).send({}), 'body');

      assert.equal(errorDetail.message, 'Güncelleme için en az bir alan gönderilmelidir.');
    });

    it('PATCH isteğinde zorunlu bir alanın null yapılmasına izin vermez', async () => {
      const createdTask = await createTask(context.api);

      const errorDetail = await expectValidationError(context.api.patch(`/tasks/${createdTask.id}`).send({ title: null }), 'title');

      assert.equal(errorDetail.message, 'title alanı null olamaz.');
    });

    it('PATCH isteğinde geçersiz değerleri reddeder ve görevi değiştirmez', async () => {
      const createdTask = await createTask(context.api);

      await expectValidationError(context.api.patch(`/tasks/${createdTask.id}`).send({ priority: 'critical' }), 'priority');

      const response = await context.api.get(`/tasks/${createdTask.id}`).expect(200);
      assert.equal(response.body.data.priority, createdTask.priority);
    });
  });
});
