import { TASK_PRIORITIES, TASK_SORT_FIELDS, TASK_STATUSES } from '../constants/task.constants.js';
import { createSortingQuerySchema, omitFields, paginationQuerySchema } from './query.schemas.js';
import { usernameRule } from './user.schemas.js';

export const taskBodySchema = Object.freeze({
  title: { type: 'string', required: true, minLength: 3, maxLength: 100 },
  description: { type: 'string', required: true, maxLength: 1000 },
  status: { type: 'string', lowercase: true, enum: TASK_STATUSES, default: 'pending' },
  priority: { type: 'string', lowercase: true, enum: TASK_PRIORITIES, default: 'medium' },
  assignee: { ...usernameRule, nullable: true, default: null },
  projectId: { type: 'string', nullable: true, format: 'uuid', default: null },
  dueDate: { type: 'string', nullable: true, format: 'date', default: null },
});

export const taskListQuerySchema = Object.freeze({
  ...paginationQuerySchema,
  ...createSortingQuerySchema(TASK_SORT_FIELDS),
  status: { type: 'string', lowercase: true, enum: TASK_STATUSES },
  priority: { type: 'string', lowercase: true, enum: TASK_PRIORITIES },
  assignee: usernameRule,
  projectId: { type: 'string', format: 'uuid' },
});

export const taskSearchQuerySchema = Object.freeze({
  keyword: { type: 'string', required: true, minLength: 2, maxLength: 100 },
  ...taskListQuerySchema,
});

export const assigneeTaskQuerySchema = Object.freeze(omitFields(taskListQuerySchema, 'assignee'));

export const projectTaskQuerySchema = Object.freeze(omitFields(taskListQuerySchema, 'projectId'));
