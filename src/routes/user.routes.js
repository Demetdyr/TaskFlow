import { Router } from 'express';
import { validateRequest } from '../middlewares/validate-request.js';
import { userCreateBodySchema, userListQuerySchema, userUpdateBodySchema } from '../validators/user.schemas.js';

export function createUserRouter(userController) {
  const router = Router();

  router.get('/', validateRequest({ query: userListQuerySchema }), userController.listUsers);
  router.post('/', validateRequest({ body: userCreateBodySchema }), userController.createUser);

  router.get('/:userId', userController.getUser);
  router.put('/:userId', validateRequest({ body: userUpdateBodySchema }), userController.updateUser);
  router.patch('/:userId', validateRequest({ body: userUpdateBodySchema, isPartialBody: true }), userController.updateUser);
  router.delete('/:userId', userController.deleteUser);

  return router;
}
