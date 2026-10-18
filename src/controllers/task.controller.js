export function createTaskController(taskService) {
  return {
    async listTasks(request, response) {
      const { items, pagination } = await taskService.listTasks(request.validated.query);
      response.json({ data: items, pagination });
    },

    async searchTasks(request, response) {
      const { items, pagination } = await taskService.searchTasks(request.validated.query);
      response.json({ data: items, pagination });
    },

    async listTasksByAssignee(request, response) {
      const { items, pagination } = await taskService.listTasksByAssignee(request.params.username, request.validated.query);
      response.json({ data: items, pagination });
    },

    async getTask(request, response) {
      const task = await taskService.getTaskById(request.params.taskId);
      response.json({ data: task });
    },

    async createTask(request, response) {
      const createdTask = await taskService.createTask(request.validated.body);
      response.status(201).location(`/tasks/${createdTask.id}`).json({ data: createdTask });
    },

    async updateTask(request, response) {
      const updatedTask = await taskService.updateTask(request.params.taskId, request.validated.body);
      response.json({ data: updatedTask });
    },

    async deleteTask(request, response) {
      await taskService.deleteTask(request.params.taskId);
      response.status(204).end();
    },
  };
}
