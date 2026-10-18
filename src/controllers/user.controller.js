export function createUserController(userService) {
  return {
    async listUsers(request, response) {
      const { items, pagination } = await userService.listUsers(request.validated.query);
      response.json({ data: items, pagination });
    },

    async getUser(request, response) {
      const user = await userService.getUserById(request.params.userId);
      response.json({ data: user });
    },

    async createUser(request, response) {
      const createdUser = await userService.createUser(request.validated.body);
      response.status(201).location(`/users/${createdUser.id}`).json({ data: createdUser });
    },

    async updateUser(request, response) {
      const updatedUser = await userService.updateUser(request.params.userId, request.validated.body);
      response.json({ data: updatedUser });
    },

    async deleteUser(request, response) {
      await userService.deleteUser(request.params.userId);
      response.status(204).end();
    },
  };
}
