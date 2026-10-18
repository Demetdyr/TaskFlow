import { Router } from 'express';
import { validateRequest } from '../middlewares/validate-request.js';
import { projectBodySchema, projectListQuerySchema } from '../validators/project.schemas.js';
import { projectTaskQuerySchema } from '../validators/task.schemas.js';

export function createProjectRouter(projectController) {
  const router = Router();

  router.get('/', validateRequest({ query: projectListQuerySchema }), projectController.listProjects);
  router.post('/', validateRequest({ body: projectBodySchema }), projectController.createProject);

  router.get('/:projectId', projectController.getProject);
  router.get('/:projectId/tasks', validateRequest({ query: projectTaskQuerySchema }), projectController.listProjectTasks);
  router.put('/:projectId', validateRequest({ body: projectBodySchema }), projectController.updateProject);
  router.patch('/:projectId', validateRequest({ body: projectBodySchema, isPartialBody: true }), projectController.updateProject);
  router.delete('/:projectId', projectController.deleteProject);

  return router;
}
