import { TASK_PRIORITIES } from '../constants/task.constants.js';

const MILLISECONDS_PER_HOUR = 3_600_000;
const MILLISECONDS_PER_DAY = 86_400_000;
const RECENT_COMPLETION_WINDOW_IN_DAYS = 7;

const turkishCollator = new Intl.Collator('tr');

function countWhere(records, predicate) {
  return records.reduce((matchCount, record) => (predicate(record) ? matchCount + 1 : matchCount), 0);
}

function toPercentage(partCount, totalCount) {
  if (totalCount === 0) {
    return 0;
  }
  return Math.round((partCount / totalCount) * 10_000) / 100;
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function toCalendarDate(date) {
  return date.toISOString().slice(0, 10);
}

function countDaysBetween(earlierCalendarDate, laterCalendarDate) {
  return Math.round((Date.parse(laterCalendarDate) - Date.parse(earlierCalendarDate)) / MILLISECONDS_PER_DAY);
}

function isCompleted(task) {
  return task.status === 'completed';
}

function isOverdue(task, today) {
  return !isCompleted(task) && task.dueDate !== null && task.dueDate < today;
}

function countTasksByStatus(tasks) {
  return {
    pending: countWhere(tasks, (task) => task.status === 'pending'),
    inProgress: countWhere(tasks, (task) => task.status === 'in-progress'),
    completed: countWhere(tasks, isCompleted),
  };
}

function countTasksByPriority(tasks) {
  return Object.fromEntries(
    TASK_PRIORITIES.map((priority) => [priority, countWhere(tasks, (task) => task.priority === priority)]),
  );
}

function calculateAverageCompletionHours(completedTasks) {
  if (completedTasks.length === 0) {
    return null;
  }

  const totalCompletionHours = completedTasks.reduce(
    (hourSum, task) => hourSum + (Date.parse(task.completedAt) - Date.parse(task.createdAt)) / MILLISECONDS_PER_HOUR,
    0,
  );
  return roundToOneDecimal(totalCompletionHours / completedTasks.length);
}

function buildWorkloadByAssignee(users, tasks, today) {
  return users
    .map((user) => {
      const assignedTasks = tasks.filter((task) => task.assignee === user.username);
      return {
        username: user.username,
        fullName: user.fullName,
        totalTasks: assignedTasks.length,
        ...countTasksByStatus(assignedTasks),
        overdue: countWhere(assignedTasks, (task) => isOverdue(task, today)),
      };
    })
    .sort(
      (leftWorkload, rightWorkload) =>
        rightWorkload.totalTasks - leftWorkload.totalTasks || turkishCollator.compare(leftWorkload.username, rightWorkload.username),
    );
}

function buildProgressByProject(projects, tasks) {
  return projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    const completedTaskCount = countWhere(projectTasks, isCompleted);
    return {
      projectId: project.id,
      name: project.name,
      status: project.status,
      totalTasks: projectTasks.length,
      completed: completedTaskCount,
      completionRate: toPercentage(completedTaskCount, projectTasks.length),
    };
  });
}

export function createReportService({ taskCollection, userCollection, projectCollection, clock }) {
  return {
    async getCompletedTasksReport() {
      const tasks = await taskCollection.findAll();
      const completedTasks = tasks.filter(isCompleted);
      const recentWindowStartInMs = clock().getTime() - RECENT_COMPLETION_WINDOW_IN_DAYS * MILLISECONDS_PER_DAY;

      return {
        completedCount: completedTasks.length,
        totalTasks: tasks.length,
        completionRate: toPercentage(completedTasks.length, tasks.length),
        byPriority: countTasksByPriority(completedTasks),
        completedLastSevenDays: countWhere(completedTasks, (task) => Date.parse(task.completedAt) >= recentWindowStartInMs),
        averageCompletionHours: calculateAverageCompletionHours(completedTasks),
      };
    },

    async getPendingTasksReport() {
      const tasks = await taskCollection.findAll();
      const today = toCalendarDate(clock());
      const openTasks = tasks.filter((task) => !isCompleted(task));
      const pendingTasks = openTasks.filter((task) => task.status === 'pending');
      const overdueTasks = openTasks
        .filter((task) => isOverdue(task, today))
        .sort((leftTask, rightTask) => leftTask.dueDate.localeCompare(rightTask.dueDate));

      return {
        pendingCount: pendingTasks.length,
        inProgressCount: openTasks.length - pendingTasks.length,
        openCount: openTasks.length,
        overdueCount: overdueTasks.length,
        unassignedCount: countWhere(openTasks, (task) => task.assignee === null),
        byPriority: countTasksByPriority(pendingTasks),
        overdueTasks: overdueTasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          assignee: task.assignee,
          dueDate: task.dueDate,
          daysOverdue: countDaysBetween(task.dueDate, today),
        })),
      };
    },

    async getSummaryReport() {
      const [tasks, users, projects] = await Promise.all([
        taskCollection.findAll(),
        userCollection.findAll(),
        projectCollection.findAll(),
      ]);
      const now = clock();
      const today = toCalendarDate(now);
      const tasksByStatus = countTasksByStatus(tasks);

      return {
        generatedAt: now.toISOString(),
        totals: { tasks: tasks.length, users: users.length, projects: projects.length },
        tasksByStatus,
        tasksByPriority: countTasksByPriority(tasks),
        completionRate: toPercentage(tasksByStatus.completed, tasks.length),
        overdueCount: countWhere(tasks, (task) => isOverdue(task, today)),
        unassignedCount: countWhere(tasks, (task) => !isCompleted(task) && task.assignee === null),
        workloadByAssignee: buildWorkloadByAssignee(users, tasks, today),
        progressByProject: buildProgressByProject(projects, tasks),
      };
    },
  };
}
