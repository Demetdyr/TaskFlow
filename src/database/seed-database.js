import { createSeedData } from './seed-data.js';

const SEEDED_COLLECTION_NAMES = Object.freeze(['users', 'projects', 'tasks']);

async function restoreCollections(database, previousRecordsByCollection) {
  await Promise.allSettled(
    SEEDED_COLLECTION_NAMES.map((collectionName) =>
      database[collectionName].replaceAll(previousRecordsByCollection[collectionName]),
    ),
  );
}

export async function seedDatabase(database, seedTime = new Date()) {
  const seedData = createSeedData(seedTime);
  const previousRecordsByCollection = Object.fromEntries(
    await Promise.all(
      SEEDED_COLLECTION_NAMES.map(async (collectionName) => [collectionName, await database[collectionName].findAll()]),
    ),
  );

  try {
    for (const collectionName of SEEDED_COLLECTION_NAMES) {
      await database[collectionName].replaceAll(seedData[collectionName]);
    }
  } catch (seedError) {
    await restoreCollections(database, previousRecordsByCollection);
    throw seedError;
  }

  return { users: seedData.users.length, projects: seedData.projects.length, tasks: seedData.tasks.length };
}
