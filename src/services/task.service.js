import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError } from '../errors/http-errors.js';
import { TASK_PRIORITY_RANKS, TASK_SEARCHABLE_FIELDS, TASK_STATUS_RANKS } from '../constants/task.constants.js';
import { queryRecords } from '../utils/record-query.js';
import { createKeywordMatcher } from '../utils/search-text.js';

const taskSortValueResolvers = Object.freeze({
  priority: (task) => TASK_PRIORITY_RANKS[task.priority],
  status: (task) => TASK_STATUS_RANKS[task.status],
});

function resolveCompletedAt(previousTask, nextStatus, timestamp) {
  if (nextStatus !== 'completed') {
    return null;
  }
  return previousTask?.status === 'completed' ? previousTask.completedAt : timestamp;
}

function createTaskNotFoundError(taskId) {
  return new NotFoundError(`${taskId} kimlikli görev bulunamadı.`);
}

export function createTaskService({ taskCollection, userCollection, projectCollection, clock }) {
  async function findTaskOrFail(taskId) {
    const task = await taskCollection.findById(taskId);
    if (!task) {
      throw createTaskNotFoundError(taskId);
    }
    return task;
  }

  async function assertReferencedRecordsExist({ assignee, projectId }) {
    const referenceErrors = [];

    if (assignee) {
      const assignedUser = await userCollection.findOne((user) => user.username === assignee);
      if (!assignedUser) {
        referenceErrors.push({
          field: 'assignee',
          location: 'body',
          message: `"${assignee}" kullanıcı adına sahip bir çalışan bulunamadı.`,
        });
      }
    }

    if (projectId) {
      const referencedProject = await projectCollection.findById(projectId);
      if (!referencedProject) {
        referenceErrors.push({
          field: 'projectId',
          location: 'body',
          message: `${projectId} kimlikli bir proje bulunamadı.`,
        });
      }
    }

    if (referenceErrors.length > 0) {
      throw new ValidationError(referenceErrors);
    }
  }

  async function queryTasks({ status, priority, assignee, projectId, sort, order, page, limit }, matchesKeyword) {
    const tasks = await taskCollection.findAll();
    return queryRecords(tasks, {
      filters: { status, priority, assignee, projectId },
      matchesKeyword,
      sort,
      order,
      page,
      limit,
      sortValueResolvers: taskSortValueResolvers,
    });
  }

  return {
    listTasks(listQuery) {
      return queryTasks(listQuery);
    },

    searchTasks({ keyword, ...listQuery }) {
      return queryTasks(listQuery, createKeywordMatcher(keyword, TASK_SEARCHABLE_FIELDS));
    },

    async listTasksByAssignee(username, listQuery) {
      const normalizedUsername = username.toLowerCase();
      const assignedUser = await userCollection.findOne((user) => user.username === normalizedUsername);
      if (!assignedUser) {
        throw new NotFoundError(`"${username}" kullanıcı adına sahip bir çalışan bulunamadı.`);
      }
      return queryTasks({ ...listQuery, assignee: normalizedUsername });
    },

    listTasksByProject(projectId, listQuery) {
      return queryTasks({ ...listQuery, projectId });
    },

    getTaskById(taskId) {
      return findTaskOrFail(taskId);
    },

    async createTask(taskInput) {
      await assertReferencedRecordsExist(taskInput);

      const timestamp = clock().toISOString();
      return taskCollection.insert({
        id: randomUUID(),
        ...taskInput,
        completedAt: resolveCompletedAt(null, taskInput.status, timestamp),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    },

    async updateTask(taskId, taskChanges) {
      const existingTask = await findTaskOrFail(taskId);
      await assertReferencedRecordsExist(taskChanges);

      const timestamp = clock().toISOString();
      const nextStatus = taskChanges.status ?? existingTask.status;
      return taskCollection.updateById(taskId, {
        ...taskChanges,
        completedAt: resolveCompletedAt(existingTask, nextStatus, timestamp),
        updatedAt: timestamp,
      });
    },

    async deleteTask(taskId) {
      const isDeleted = await taskCollection.deleteById(taskId);
      if (!isDeleted) {
        throw createTaskNotFoundError(taskId);
      }
    },
  };
}
