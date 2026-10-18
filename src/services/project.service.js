import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '../errors/http-errors.js';
import { queryRecords } from '../utils/record-query.js';
import { normalizeForSearch } from '../utils/search-text.js';

export function createProjectService({ projectCollection, taskCollection, clock }) {
  async function findProjectOrFail(projectId) {
    const project = await projectCollection.findById(projectId);
    if (!project) {
      throw new NotFoundError(`${projectId} kimlikli proje bulunamadı.`);
    }
    return project;
  }

  async function assertNameIsUnique(projectName, currentProjectId = null) {
    if (!projectName) {
      return;
    }

    const comparableName = normalizeForSearch(projectName);
    const conflictingProject = await projectCollection.findOne(
      (project) => project.id !== currentProjectId && normalizeForSearch(project.name) === comparableName,
    );
    if (conflictingProject) {
      throw new ConflictError(`"${conflictingProject.name}" adında bir proje zaten var.`);
    }
  }

  return {
    async listProjects({ status, sort, order, page, limit }) {
      const projects = await projectCollection.findAll();
      return queryRecords(projects, { filters: { status }, sort, order, page, limit });
    },

    getProjectById(projectId) {
      return findProjectOrFail(projectId);
    },

    async createProject(projectInput) {
      await assertNameIsUnique(projectInput.name);

      const timestamp = clock().toISOString();
      return projectCollection.insert({
        id: randomUUID(),
        ...projectInput,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    },

    async updateProject(projectId, projectChanges) {
      await findProjectOrFail(projectId);
      await assertNameIsUnique(projectChanges.name, projectId);

      return projectCollection.updateById(projectId, { ...projectChanges, updatedAt: clock().toISOString() });
    },

    async deleteProject(projectId) {
      const project = await findProjectOrFail(projectId);
      const projectTaskCount = await taskCollection.count((task) => task.projectId === projectId);

      if (projectTaskCount > 0) {
        throw new ConflictError(
          `"${project.name}" projesine bağlı ${projectTaskCount} görev olduğu için proje silinemez. Önce görevleri silin ya da başka bir projeye taşıyın.`,
        );
      }

      await projectCollection.deleteById(projectId);
    },
  };
}
