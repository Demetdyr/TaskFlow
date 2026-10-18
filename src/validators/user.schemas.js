import { USER_ROLES, USER_SORT_FIELDS, USERNAME_PATTERN, USERNAME_PATTERN_DESCRIPTION } from '../constants/user.constants.js';
import { createSortingQuerySchema, paginationQuerySchema } from './query.schemas.js';

export const usernameRule = Object.freeze({
  type: 'string',
  lowercase: true,
  pattern: USERNAME_PATTERN,
  patternDescription: USERNAME_PATTERN_DESCRIPTION,
});

export const userCreateBodySchema = Object.freeze({
  username: { ...usernameRule, required: true },
  fullName: { type: 'string', required: true, minLength: 3, maxLength: 100 },
  email: { type: 'string', required: true, lowercase: true, maxLength: 254, format: 'email' },
  role: { type: 'string', lowercase: true, enum: USER_ROLES, default: 'developer' },
});

export const userUpdateBodySchema = Object.freeze({
  ...userCreateBodySchema,
  username: { immutable: true },
});

export const userListQuerySchema = Object.freeze({
  ...paginationQuerySchema,
  ...createSortingQuerySchema(USER_SORT_FIELDS),
  role: { type: 'string', lowercase: true, enum: USER_ROLES },
});
