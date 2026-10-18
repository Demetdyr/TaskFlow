export function createProjectController({ projectService, taskService }) {
  return {
    async listProjects(request, response) {
      const { items, pagination } = await projectService.listProjects(request.validated.query);
      response.json({ data: items, pagination });
    },

    async getProject(request, response) {
      const project = await projectService.getProjectById(request.params.projectId);
      response.json({ data: project });
    },

    async listProjectTasks(request, response) {
      const project = await projectService.getProjectById(request.params.projectId);
      const { items, pagination } = await taskService.listTasksByProject(project.id, request.validated.query);
      response.json({ data: items, pagination });
    },

    async createProject(request, response) {
      const createdProject = await projectService.createProject(request.validated.body);
      response.status(201).location(`/projects/${createdProject.id}`).json({ data: createdProject });
    },

    async updateProject(request, response) {
      const updatedProject = await projectService.updateProject(request.params.projectId, request.validated.body);
      response.json({ data: updatedProject });
    },

    async deleteProject(request, response) {
      await projectService.deleteProject(request.params.projectId);
      response.status(204).end();
    },
  };
}
