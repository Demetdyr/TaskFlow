import path from 'node:path';
import { JsonCollection } from './json-collection.js';

export const COLLECTION_FILE_NAMES = Object.freeze({
  tasks: 'tasks.json',
  users: 'users.json',
  projects: 'projects.json',
});

export function createDatabase(dataDirectory) {
  return {
    tasks: new JsonCollection(path.join(dataDirectory, COLLECTION_FILE_NAMES.tasks)),
    users: new JsonCollection(path.join(dataDirectory, COLLECTION_FILE_NAMES.users)),
    projects: new JsonCollection(path.join(dataDirectory, COLLECTION_FILE_NAMES.projects)),
  };
}
