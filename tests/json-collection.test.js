import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { JsonCollection } from '../src/database/json-collection.js';

async function readRecordsFromDisk(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

describe('JsonCollection', () => {
  let temporaryDirectory;
  let collectionFilePath;
  let collection;

  beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'taskflow-collection-'));
    collectionFilePath = path.join(temporaryDirectory, 'nested', 'tasks.json');
    collection = new JsonCollection(collectionFilePath);
  });

  afterEach(() => rm(temporaryDirectory, { recursive: true, force: true }));

  it('dosya yoksa boş liste döndürür', async () => {
    assert.deepEqual(await collection.findAll(), []);
  });

  it('eklenen kaydı diske yazar', async () => {
    await collection.insert({ id: 'task-1', title: 'İlk görev' });

    assert.deepEqual(await readRecordsFromDisk(collectionFilePath), [{ id: 'task-1', title: 'İlk görev' }]);
  });

  it('mevcut dosyadaki kayıtları yükler', async () => {
    const existingFilePath = path.join(temporaryDirectory, 'existing.json');
    await writeFile(existingFilePath, JSON.stringify([{ id: 'user-1', username: 'musa' }]));

    const existingCollection = new JsonCollection(existingFilePath);

    assert.deepEqual(await existingCollection.findById('user-1'), { id: 'user-1', username: 'musa' });
  });

  it('kaydı birleştirerek günceller ve güncel halini döndürür', async () => {
    await collection.insert({ id: 'task-1', title: 'Eski başlık', priority: 'low' });

    const updatedRecord = await collection.updateById('task-1', { title: 'Yeni başlık' });

    assert.deepEqual(updatedRecord, { id: 'task-1', title: 'Yeni başlık', priority: 'low' });
    assert.deepEqual(await readRecordsFromDisk(collectionFilePath), [updatedRecord]);
  });

  it('olmayan bir kaydı güncellemeye çalışınca null döndürür', async () => {
    assert.equal(await collection.updateById('missing', { title: 'x' }), null);
  });

  it('kaydı siler ve sonucu boolean olarak bildirir', async () => {
    await collection.insert({ id: 'task-1' });

    assert.equal(await collection.deleteById('task-1'), true);
    assert.equal(await collection.deleteById('task-1'), false);
    assert.deepEqual(await readRecordsFromDisk(collectionFilePath), []);
  });

  it('eş zamanlı eklemelerin hiçbirini kaybetmez', async () => {
    const insertOperations = Array.from({ length: 25 }, (unused, index) => collection.insert({ id: `task-${index}` }));

    await Promise.all(insertOperations);

    assert.equal((await readRecordsFromDisk(collectionFilePath)).length, 25);
  });

  it('dışarı verdiği kayıtların değiştirilmesi koleksiyonu etkilemez', async () => {
    const insertedRecord = await collection.insert({ id: 'task-1', tags: ['backend'] });
    insertedRecord.tags.push('mutated');

    const [storedRecord] = await collection.findAll();
    storedRecord.title = 'mutated';

    assert.deepEqual(await collection.findById('task-1'), { id: 'task-1', tags: ['backend'] });
  });

  it('diske yazılamayan değişikliği bellekte de uygulamaz', async () => {
    const readOnlyDirectory = path.join(temporaryDirectory, 'read-only');
    await mkdir(readOnlyDirectory);
    await writeFile(path.join(readOnlyDirectory, 'tasks.json'), '[]');
    const readOnlyCollection = new JsonCollection(path.join(readOnlyDirectory, 'tasks.json'));
    await readOnlyCollection.findAll();
    await chmod(readOnlyDirectory, 0o555);

    try {
      await assert.rejects(readOnlyCollection.insert({ id: 'task-1' }));
      assert.deepEqual(await readOnlyCollection.findAll(), []);
    } finally {
      await chmod(readOnlyDirectory, 0o755);
    }
  });

  it('koşula uyan kayıtları sayar', async () => {
    await collection.replaceAll([
      { id: 'task-1', assignee: 'musa' },
      { id: 'task-2', assignee: 'ayse' },
      { id: 'task-3', assignee: 'musa' },
    ]);

    assert.equal(await collection.count((record) => record.assignee === 'musa'), 2);
    assert.equal(await collection.count((record) => record.assignee === 'zeynep'), 0);
  });

  it('koşula uyan ilk kaydı bulur', async () => {
    await collection.replaceAll([
      { id: 'user-1', username: 'ayse' },
      { id: 'user-2', username: 'musa' },
    ]);

    assert.deepEqual(await collection.findOne((record) => record.username === 'musa'), { id: 'user-2', username: 'musa' });
    assert.equal(await collection.findOne((record) => record.username === 'zeynep'), null);
  });
});
