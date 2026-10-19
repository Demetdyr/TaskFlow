import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import supertest from 'supertest';
import { createApp } from '../src/app.js';
import { createDatabase } from '../src/database/create-database.js';
import { seedDatabase } from '../src/database/seed-database.js';

describe('Örnek veri yükleme (seed)', () => {
  let dataDirectory;
  let database;
  const seedTime = new Date('2026-10-17T10:00:00.000Z');

  beforeEach(async () => {
    dataDirectory = await mkdtemp(path.join(tmpdir(), 'taskflow-seed-'));
    database = createDatabase(dataDirectory);
  });

  afterEach(() => rm(dataDirectory, { recursive: true, force: true }));

  it('çalışan, proje ve görev koleksiyonlarını doldurur', async () => {
    const seedSummary = await seedDatabase(database, seedTime);

    assert.deepEqual(seedSummary, { users: 5, projects: 3, tasks: 12 });
    assert.equal((await database.tasks.findAll()).length, 12);
  });

  it('görevlerdeki tüm çalışan ve proje referansları geçerlidir', async () => {
    await seedDatabase(database, seedTime);

    const usernames = new Set((await database.users.findAll()).map((user) => user.username));
    const projectIds = new Set((await database.projects.findAll()).map((project) => project.id));

    for (const task of await database.tasks.findAll()) {
      assert.ok(task.assignee === null || usernames.has(task.assignee), `${task.title}: ${task.assignee}`);
      assert.ok(task.projectId === null || projectIds.has(task.projectId), `${task.title}: ${task.projectId}`);
      assert.equal(task.completedAt !== null, task.status === 'completed', task.title);
    }
  });

  it('tekrar çalıştırıldığında verileri çoğaltmadan sıfırlar', async () => {
    await seedDatabase(database, seedTime);
    await database.tasks.insert({ id: 'gecici-gorev' });

    await seedDatabase(database, seedTime);

    assert.equal((await database.tasks.findAll()).length, 12);
  });

  it('bir koleksiyon yazılamazsa diğerlerini önceki haline döndürür', async () => {
    await database.users.replaceAll([{ id: 'eski-calisan', username: 'eski' }]);
    const databaseWithFailingTasks = {
      ...database,
      tasks: {
        findAll: async () => [],
        replaceAll: async () => {
          throw new Error('Disk dolu');
        },
      },
    };

    await assert.rejects(seedDatabase(databaseWithFailingTasks, seedTime), /Disk dolu/);

    assert.deepEqual(await database.users.findAll(), [{ id: 'eski-calisan', username: 'eski' }]);
    assert.deepEqual(await database.projects.findAll(), []);
  });

  it('yüklenen veriler API üzerinden sorgulanabilir', async () => {
    await seedDatabase(database, seedTime);
    const app = createApp({ dataDirectory, logging: { logToConsole: false, logToFile: false }, clock: () => seedTime });

    const searchResponse = await supertest(app).get('/tasks/search?keyword=backend').expect(200);
    const summaryResponse = await supertest(app).get('/reports/summary').expect(200);

    assert.ok(searchResponse.body.data.length >= 2);
    assert.equal(summaryResponse.body.data.overdueCount, 2);
  });
});
