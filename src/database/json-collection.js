import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class JsonCollection {
  #filePath;
  #recordsPromise = null;
  #mutationQueue = Promise.resolve();

  constructor(filePath) {
    this.#filePath = filePath;
  }

  async findAll() {
    const records = await this.#getRecords();
    return structuredClone(records);
  }

  async findById(id) {
    return this.findOne((record) => record.id === id);
  }

  async findOne(predicate) {
    const records = await this.#getRecords();
    const matchingRecord = records.find(predicate);
    return matchingRecord ? structuredClone(matchingRecord) : null;
  }

  async count(predicate) {
    const records = await this.#getRecords();
    return records.filter(predicate).length;
  }

  insert(record) {
    return this.#mutate((records) => {
      records.push(structuredClone(record));
      return structuredClone(record);
    });
  }

  updateById(id, changes) {
    return this.#mutate((records) => {
      const recordIndex = records.findIndex((record) => record.id === id);
      if (recordIndex === -1) {
        return null;
      }
      records[recordIndex] = { ...records[recordIndex], ...structuredClone(changes) };
      return structuredClone(records[recordIndex]);
    });
  }

  deleteById(id) {
    return this.#mutate((records) => {
      const recordIndex = records.findIndex((record) => record.id === id);
      if (recordIndex === -1) {
        return false;
      }
      records.splice(recordIndex, 1);
      return true;
    });
  }

  async replaceAll(newRecords) {
    await this.#mutate((records) => {
      records.splice(0, records.length, ...structuredClone(newRecords));
    });
  }

  #getRecords() {
    this.#recordsPromise ??= this.#loadFromDisk().catch((loadError) => {
      this.#recordsPromise = null;
      throw loadError;
    });
    return this.#recordsPromise;
  }

  async #loadFromDisk() {
    let fileContent;
    try {
      fileContent = await readFile(this.#filePath, 'utf8');
    } catch (readError) {
      if (readError.code === 'ENOENT') {
        return [];
      }
      throw readError;
    }

    const parsedContent = JSON.parse(fileContent);
    if (!Array.isArray(parsedContent)) {
      throw new Error(`${this.#filePath} dosyası bir JSON dizisi içermelidir.`);
    }
    return parsedContent;
  }

  #mutate(applyChange) {
    const mutation = this.#mutationQueue.then(async () => {
      const records = await this.#getRecords();
      const nextRecords = structuredClone(records);
      const result = applyChange(nextRecords);

      if (result !== null && result !== false) {
        await this.#writeAtomically(nextRecords);
        records.splice(0, records.length, ...nextRecords);
      }
      return result;
    });

    this.#mutationQueue = mutation.catch(() => {});
    return mutation;
  }

  async #writeAtomically(records) {
    await mkdir(path.dirname(this.#filePath), { recursive: true });
    const temporaryFilePath = `${this.#filePath}.${process.pid}.tmp`;
    await writeFile(temporaryFilePath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
    await rename(temporaryFilePath, this.#filePath);
  }
}
