import { createProjectService } from './project.service.js';
import { createReportService } from './report.service.js';
import { createTaskService } from './task.service.js';
import { createUserService } from './user.service.js';

export function createServices({ database, clock }) {
  return {
    taskService: createTaskService({
      taskCollection: database.tasks,
      userCollection: database.users,
      projectCollection: database.projects,
      clock,
    }),
    userService: createUserService({
      userCollection: database.users,
      taskCollection: database.tasks,
      clock,
    }),
    projectService: createProjectService({
      projectCollection: database.projects,
      taskCollection: database.tasks,
      clock,
    }),
    reportService: createReportService({
      taskCollection: database.tasks,
      userCollection: database.users,
      projectCollection: database.projects,
      clock,
    }),
  };
}
