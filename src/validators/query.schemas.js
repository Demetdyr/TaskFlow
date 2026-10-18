import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, SORT_ORDERS } from '../constants/query.constants.js';

export const paginationQuerySchema = Object.freeze({
  page: { type: 'integer', min: 1, default: DEFAULT_PAGE },
  limit: { type: 'integer', min: 1, max: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE },
});

export function createSortingQuerySchema(sortFields, defaultSortField = 'createdAt') {
  return {
    sort: { type: 'string', enum: sortFields, default: defaultSortField },
    order: { type: 'string', lowercase: true, enum: SORT_ORDERS, default: 'asc' },
  };
}

export function omitFields(schema, ...fieldNames) {
  return Object.fromEntries(Object.entries(schema).filter(([fieldName]) => !fieldNames.includes(fieldName)));
}
