import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers/test-context.js';
import { createFakeClock } from './helpers/fake-clock.js';
import { createProject, createTask, createUser } from './helpers/fixtures.js';

describe('Raporlama servisleri', () => {
  let context;
  let mobileProject;

  before(async () => {
    const clock = createFakeClock('2026-10-01T09:00:00.000Z');
    context = await createTestContext({ clock });

    await createUser(context.api, { username: 'musa', fullName: 'Musa Demir', email: 'musa@taskflow.dev' });
    await createUser(context.api, { username: 'ayse', fullName: 'Ayşe Kaya', email: 'ayse@taskflow.dev' });
    mobileProject = await createProject(context.api);

    const apiSkeletonTask = await createTask(context.api, { title: 'API iskeletini kur', priority: 'high', assignee: 'musa' });
    await createTask(context.api, { title: 'Routing yapısı', priority: 'medium', assignee: 'musa', status: 'in-progress', dueDate: '2026-10-05' });
    await createTask(context.api, { title: 'Logger middleware', priority: 'high', assignee: 'ayse', dueDate: '2026-10-20' });
    await createTask(context.api, { title: 'Ödeme ekranı', priority: 'low', projectId: mobileProject.id, dueDate: '2026-10-08' });
    const cacheTask = await createTask(context.api, { title: 'Ürün önbelleği', priority: 'medium', assignee: 'ayse', projectId: mobileProject.id });

    clock.setTo('2026-10-01T13:00:00.000Z');
    await context.api.patch(`/tasks/${apiSkeletonTask.id}`).send({ status: 'completed' }).expect(200);

    clock.setTo('2026-10-09T09:00:00.000Z');
    await context.api.patch(`/tasks/${cacheTask.id}`).send({ status: 'completed' }).expect(200);

    clock.setTo('2026-10-10T12:00:00.000Z');
  });

  after(() => context.cleanup());

  it('GET /reports/completed tamamlanan görev istatistiklerini döndürür', async () => {
    const response = await context.api.get('/reports/completed').expect(200);

    assert.deepEqual(response.body.data, {
      completedCount: 2,
      totalTasks: 5,
      completionRate: 40,
      byPriority: { low: 0, medium: 1, high: 1 },
      completedLastSevenDays: 1,
      averageCompletionHours: 98,
    });
  });

  it('GET /reports/pending bekleyen ve geciken görevleri döndürür', async () => {
    const response = await context.api.get('/reports/pending').expect(200);
    const pendingReport = response.body.data;

    assert.deepEqual(
      { ...pendingReport, overdueTasks: pendingReport.overdueTasks.map(({ id, ...overdueTask }) => overdueTask) },
      {
        pendingCount: 2,
        inProgressCount: 1,
        openCount: 3,
        overdueCount: 2,
        unassignedCount: 1,
        byPriority: { low: 1, medium: 0, high: 1 },
        overdueTasks: [
          { title: 'Routing yapısı', status: 'in-progress', assignee: 'musa', dueDate: '2026-10-05', daysOverdue: 5 },
          { title: 'Ödeme ekranı', status: 'pending', assignee: null, dueDate: '2026-10-08', daysOverdue: 2 },
        ],
      },
    );
  });

  it('GET /reports/summary genel sistem özetini döndürür', async () => {
    const response = await context.api.get('/reports/summary').expect(200);

    assert.deepEqual(response.body.data, {
      generatedAt: '2026-10-10T12:00:00.000Z',
      totals: { tasks: 5, users: 2, projects: 1 },
      tasksByStatus: { pending: 2, inProgress: 1, completed: 2 },
      tasksByPriority: { low: 1, medium: 2, high: 2 },
      completionRate: 40,
      overdueCount: 2,
      unassignedCount: 1,
      workloadByAssignee: [
        { username: 'ayse', fullName: 'Ayşe Kaya', totalTasks: 2, pending: 1, inProgress: 0, completed: 1, overdue: 0 },
        { username: 'musa', fullName: 'Musa Demir', totalTasks: 2, pending: 0, inProgress: 1, completed: 1, overdue: 1 },
      ],
      progressByProject: [
        { projectId: mobileProject.id, name: 'Mobil Uygulama', status: 'active', totalTasks: 2, completed: 1, completionRate: 50 },
      ],
    });
  });

  it('veri yokken sıfır değerli raporlar üretir', async () => {
    const emptyContext = await createTestContext({ clock: createFakeClock('2026-10-10T12:00:00.000Z') });

    try {
      const completedResponse = await emptyContext.api.get('/reports/completed').expect(200);
      const summaryResponse = await emptyContext.api.get('/reports/summary').expect(200);

      assert.equal(completedResponse.body.data.completionRate, 0);
      assert.equal(completedResponse.body.data.averageCompletionHours, null);
      assert.deepEqual(summaryResponse.body.data.totals, { tasks: 0, users: 0, projects: 0 });
      assert.deepEqual(summaryResponse.body.data.workloadByAssignee, []);
    } finally {
      await emptyContext.cleanup();
    }
  });

  it('tanımsız bir rapor için 404 döndürür', async () => {
    await context.api.get('/reports/weekly').expect(404);
  });
});
