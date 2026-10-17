import { Router } from 'express';

export function createSystemRouter({ appName, appVersion }) {
  const router = Router();

  router.get('/', (request, response) => {
    response.json({
      data: {
        name: appName,
        version: appVersion,
        description: 'Görev ve Proje Yönetim Sistemi REST API',
        resources: {
          tasks: '/tasks',
          users: '/users',
          projects: '/projects',
          reports: '/reports/summary',
        },
        health: '/health',
      },
    });
  });

  router.get('/health', (request, response) => {
    response.json({
      data: {
        status: 'ok',
        uptimeInSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  });

  return router;
}
