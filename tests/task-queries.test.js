import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers/test-context.js';
import { createFakeClock } from './helpers/fake-clock.js';
import { createProject, createTask, createUser, findErrorDetail } from './helpers/fixtures.js';

function titlesOf(response) {
  return response.body.data.map((task) => task.title);
}

describe('Gelişmiş görev sorguları', () => {
  let context;
  let mobileProject;

  before(async () => {
    const clock = createFakeClock('2026-10-01T09:00:00.000Z');
    context = await createTestContext({ clock });

    await createUser(context.api, { username: 'musa', email: 'musa@taskflow.dev' });
    await createUser(context.api, { username: 'ayse', fullName: 'Ayşe Kaya', email: 'ayse@taskflow.dev' });
    mobileProject = await createProject(context.api);

    const taskInputs = [
      { title: 'Backend projesini oluştur', description: 'Express iskeleti kurulacak.', status: 'completed', priority: 'high', assignee: 'musa', dueDate: '2026-10-03' },
      { title: 'Routing yapısını hazırla', description: 'Görev uçları için router yazılacak.', status: 'in-progress', priority: 'medium', assignee: 'musa', dueDate: '2026-10-08' },
      { title: 'Logger middleware yaz', description: 'İstekler konsola ve dosyaya yazılacak.', status: 'pending', priority: 'high', assignee: 'ayse' },
      { title: 'Ödeme ekranı tasarımı', description: 'Mobil uygulama için arayüz çalışması.', status: 'pending', priority: 'low', projectId: mobileProject.id, dueDate: '2026-10-05' },
      { title: 'Ürün listesini önbelleğe al', description: 'Backend tarafında yanıt süresi iyileştirilecek.', status: 'completed', priority: 'medium', assignee: 'ayse', projectId: mobileProject.id },
    ];

    for (const taskInput of taskInputs) {
      await createTask(context.api, taskInput);
      clock.advanceByMinutes(10);
    }
  });

  after(() => context.cleanup());

  describe('filtreleme', () => {
    it('duruma göre filtreler: GET /tasks?status=completed', async () => {
      const response = await context.api.get('/tasks?status=completed').expect(200);

      assert.deepEqual(titlesOf(response), ['Backend projesini oluştur', 'Ürün listesini önbelleğe al']);
    });

    it('önceliğe göre filtreler: GET /tasks?priority=high', async () => {
      const response = await context.api.get('/tasks?priority=high').expect(200);

      assert.deepEqual(titlesOf(response), ['Backend projesini oluştur', 'Logger middleware yaz']);
    });

    it('birden fazla filtreyi birlikte uygular', async () => {
      const response = await context.api.get('/tasks?status=pending&priority=high').expect(200);

      assert.deepEqual(titlesOf(response), ['Logger middleware yaz']);
    });

    it('projeye göre filtreler', async () => {
      const response = await context.api.get(`/tasks?projectId=${mobileProject.id}`).expect(200);

      assert.deepEqual(titlesOf(response), ['Ödeme ekranı tasarımı', 'Ürün listesini önbelleğe al']);
    });

    it('filtre değerlerinde büyük-küçük harf farkını gözetmez', async () => {
      const response = await context.api.get('/tasks?status=COMPLETED').expect(200);

      assert.equal(response.body.pagination.totalItems, 2);
    });
  });

  describe('arama: GET /tasks/search', () => {
    it('başlık ve açıklamada anahtar kelimeyi arar', async () => {
      const response = await context.api.get('/tasks/search?keyword=backend').expect(200);

      assert.deepEqual(titlesOf(response), ['Backend projesini oluştur', 'Ürün listesini önbelleğe al']);
    });

    it('Türkçe karakter ve büyük harf farklarından etkilenmez', async () => {
      const response = await context.api.get('/tasks/search').query({ keyword: 'ODEME EKRANI' }).expect(200);

      assert.deepEqual(titlesOf(response), ['Ödeme ekranı tasarımı']);
    });

    it('birden fazla kelimede tüm kelimeleri içeren görevleri döndürür', async () => {
      const response = await context.api.get('/tasks/search').query({ keyword: 'logger dosyaya' }).expect(200);

      assert.deepEqual(titlesOf(response), ['Logger middleware yaz']);
    });

    it('aramayı filtrelerle birleştirir', async () => {
      const response = await context.api.get('/tasks/search?keyword=backend&status=completed&assignee=ayse').expect(200);

      assert.deepEqual(titlesOf(response), ['Ürün listesini önbelleğe al']);
    });

    it('anahtar kelime gönderilmediğinde 400 döndürür', async () => {
      const response = await context.api.get('/tasks/search').expect(400);

      assert.equal(findErrorDetail(response.body, 'keyword').message, 'keyword parametresi zorunludur.');
    });
  });

  describe('kullanıcı bazlı listeleme: GET /tasks/assignee/:username', () => {
    it('çalışana atanmış görevleri listeler', async () => {
      const response = await context.api.get('/tasks/assignee/musa').expect(200);

      assert.deepEqual(titlesOf(response), ['Backend projesini oluştur', 'Routing yapısını hazırla']);
    });

    it('kullanıcı listesini ek filtrelerle daraltır', async () => {
      const response = await context.api.get('/tasks/assignee/ayse?status=completed').expect(200);

      assert.deepEqual(titlesOf(response), ['Ürün listesini önbelleğe al']);
    });

    it('olmayan bir çalışan için 404 döndürür', async () => {
      const response = await context.api.get('/tasks/assignee/olmayan.kisi').expect(404);

      assert.equal(response.body.error.code, 'NOT_FOUND');
    });
  });

  describe('sayfalama', () => {
    it('istenen sayfayı ve sayfa bilgilerini döndürür: GET /tasks?page=2&limit=2', async () => {
      const response = await context.api.get('/tasks?page=2&limit=2').expect(200);

      assert.deepEqual(titlesOf(response), ['Logger middleware yaz', 'Ödeme ekranı tasarımı']);
      assert.deepEqual(response.body.pagination, {
        page: 2,
        limit: 2,
        totalItems: 5,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('son sayfadan sonrası için boş liste döndürür', async () => {
      const response = await context.api.get('/tasks?page=9&limit=2').expect(200);

      assert.deepEqual(response.body.data, []);
      assert.equal(response.body.pagination.hasNextPage, false);
    });

    it('geçersiz sayfa ve limit değerlerini reddeder', async () => {
      const response = await context.api.get('/tasks?page=0&limit=500').expect(400);

      assert.equal(findErrorDetail(response.body, 'page').message, 'page parametresi en az 1 olmalıdır.');
      assert.equal(findErrorDetail(response.body, 'limit').message, 'limit parametresi en fazla 100 olabilir.');
    });

    it('sayısal olmayan sayfa değerini reddeder', async () => {
      const response = await context.api.get('/tasks?page=ilk').expect(400);

      assert.equal(findErrorDetail(response.body, 'page').message, 'page parametresi tam sayı olmalıdır.');
    });
  });

  describe('sıralama', () => {
    it('varsayılan olarak oluşturulma zamanına göre eskiden yeniye sıralar', async () => {
      const response = await context.api.get('/tasks?sort=createdAt').expect(200);

      assert.equal(titlesOf(response)[0], 'Backend projesini oluştur');
      assert.equal(titlesOf(response).at(-1), 'Ürün listesini önbelleğe al');
    });

    it('order=desc ile ters sıralar', async () => {
      const response = await context.api.get('/tasks?sort=createdAt&order=desc').expect(200);

      assert.equal(titlesOf(response)[0], 'Ürün listesini önbelleğe al');
    });

    it('önceliği anlamına göre sıralar', async () => {
      const response = await context.api.get('/tasks?sort=priority&order=desc').expect(200);

      assert.deepEqual(
        response.body.data.map((task) => task.priority),
        ['high', 'high', 'medium', 'medium', 'low'],
      );
    });

    it('bitiş tarihi olmayan görevleri her iki yönde de sona koyar', async () => {
      const ascendingResponse = await context.api.get('/tasks?sort=dueDate').expect(200);
      const descendingResponse = await context.api.get('/tasks?sort=dueDate&order=desc').expect(200);

      assert.deepEqual(ascendingResponse.body.data.map((task) => task.dueDate), ['2026-10-03', '2026-10-05', '2026-10-08', null, null]);
      assert.deepEqual(descendingResponse.body.data.map((task) => task.dueDate), ['2026-10-08', '2026-10-05', '2026-10-03', null, null]);
    });

    it('başlıkları Türkçe alfabeye göre sıralar', async () => {
      const response = await context.api.get('/tasks?sort=title').expect(200);

      assert.deepEqual(titlesOf(response), [
        'Backend projesini oluştur',
        'Logger middleware yaz',
        'Ödeme ekranı tasarımı',
        'Routing yapısını hazırla',
        'Ürün listesini önbelleğe al',
      ]);
    });

    it('desteklenmeyen sıralama alanını reddeder', async () => {
      const response = await context.api.get('/tasks?sort=assignee').expect(400);

      assert.match(findErrorDetail(response.body, 'sort').message, /createdAt, updatedAt, dueDate, priority, status, title/);
    });
  });

  it('tanımsız sorgu parametrelerini reddeder', async () => {
    const response = await context.api.get('/tasks?priorty=high').expect(400);

    assert.equal(findErrorDetail(response.body, 'priorty').location, 'query');
  });
});
