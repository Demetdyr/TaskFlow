export const TASK_STATUSES = Object.freeze(['pending', 'in-progress', 'completed']);

export const TASK_PRIORITIES = Object.freeze(['low', 'medium', 'high']);

export const TASK_SORT_FIELDS = Object.freeze(['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title']);

export const TASK_SEARCHABLE_FIELDS = Object.freeze(['title', 'description']);

export const TASK_PRIORITY_RANKS = Object.freeze({ low: 1, medium: 2, high: 3 });

export const TASK_STATUS_RANKS = Object.freeze({ pending: 1, 'in-progress': 2, completed: 3 });
