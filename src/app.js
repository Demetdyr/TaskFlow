import express from 'express';
import { environment } from './config/environment.js';
import { createProjectController } from './controllers/project.controller.js';
import { createReportController } from './controllers/report.controller.js';
import { createTaskController } from './controllers/task.controller.js';
import { createUserController } from './controllers/user.controller.js';
import { createDatabase } from './database/create-database.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFoundHandler } from './middlewares/not-found-handler.js';
import { createRequestLogger } from './middlewares/request-logger.js';
import { createProjectRouter } from './routes/project.routes.js';
import { createReportRouter } from './routes/report.routes.js';
import { createSystemRouter } from './routes/system.routes.js';
import { createTaskRouter } from './routes/task.routes.js';
import { createUserRouter } from './routes/user.routes.js';
import { createServices } from './services/create-services.js';

export function createApp({
  dataDirectory = environment.dataDirectory,
  logging = environment.logging,
  clock = () => new Date(),
} = {}) {
  const database = createDatabase(dataDirectory);
  const { taskService, userService, projectService, reportService } = createServices({ database, clock });

  const app = express();
  app.disable('x-powered-by');

  app.use(createRequestLogger(logging));
  app.use(express.json({ limit: '100kb' }));

  app.use(createSystemRouter({ appName: environment.appName, appVersion: environment.appVersion }));
  app.use('/tasks', createTaskRouter(createTaskController(taskService)));
  app.use('/users', createUserRouter(createUserController(userService)));
  app.use('/projects', createProjectRouter(createProjectController({ projectService, taskService })));
  app.use('/reports', createReportRouter(createReportController(reportService)));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
