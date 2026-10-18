import { Router } from 'express';
import { validateRequest } from '../middlewares/validate-request.js';
import {
  assigneeTaskQuerySchema,
  taskBodySchema,
  taskListQuerySchema,
  taskSearchQuerySchema,
} from '../validators/task.schemas.js';

export function createTaskRouter(taskController) {
  const router = Router();

  router.get('/', validateRequest({ query: taskListQuerySchema }), taskController.listTasks);
  router.post('/', validateRequest({ body: taskBodySchema }), taskController.createTask);

  router.get('/search', validateRequest({ query: taskSearchQuerySchema }), taskController.searchTasks);
  router.get('/assignee/:username', validateRequest({ query: assigneeTaskQuerySchema }), taskController.listTasksByAssignee);

  router.get('/:taskId', taskController.getTask);
  router.put('/:taskId', validateRequest({ body: taskBodySchema }), taskController.updateTask);
  router.patch('/:taskId', validateRequest({ body: taskBodySchema, isPartialBody: true }), taskController.updateTask);
  router.delete('/:taskId', taskController.deleteTask);

  return router;
}
