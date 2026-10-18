import { PROJECT_SORT_FIELDS, PROJECT_STATUSES } from '../constants/project.constants.js';
import { createSortingQuerySchema, paginationQuerySchema } from './query.schemas.js';

export const projectBodySchema = Object.freeze({
  name: { type: 'string', required: true, minLength: 3, maxLength: 100 },
  description: { type: 'string', nullable: true, maxLength: 1000, default: null },
  status: { type: 'string', lowercase: true, enum: PROJECT_STATUSES, default: 'active' },
});

export const projectListQuerySchema = Object.freeze({
  ...paginationQuerySchema,
  ...createSortingQuerySchema(PROJECT_SORT_FIELDS),
  status: { type: 'string', lowercase: true, enum: PROJECT_STATUSES },
});
