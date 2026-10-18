import { Router } from 'express';

export function createReportRouter(reportController) {
  const router = Router();

  router.get('/completed', reportController.getCompletedTasksReport);
  router.get('/pending', reportController.getPendingTasksReport);
  router.get('/summary', reportController.getSummaryReport);

  return router;
}
