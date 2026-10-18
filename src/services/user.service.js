import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '../errors/http-errors.js';
import { queryRecords } from '../utils/record-query.js';

export function createUserService({ userCollection, taskCollection, clock }) {
  let identityWriteQueue = Promise.resolve();

  function runWithUniqueIdentity(writeOperation) {
    const queuedOperation = identityWriteQueue.then(writeOperation);
    identityWriteQueue = queuedOperation.catch(() => {});
    return queuedOperation;
  }

  async function findUserOrFail(userId) {
    const user = await userCollection.findById(userId);
    if (!user) {
      throw new NotFoundError(`${userId} kimlikli çalışan bulunamadı.`);
    }
    return user;
  }

  async function assertIdentityIsUnique({ username, email }, currentUserId = null) {
    const isOtherUser = (user) => user.id !== currentUserId;

    if (username && (await userCollection.findOne((user) => isOtherUser(user) && user.username === username))) {
      throw new ConflictError(`"${username}" kullanıcı adı başka bir çalışan tarafından kullanılıyor.`);
    }
    if (email && (await userCollection.findOne((user) => isOtherUser(user) && user.email === email))) {
      throw new ConflictError(`${email} e-posta adresi başka bir çalışana kayıtlı.`);
    }
  }

  return {
    async listUsers({ role, sort, order, page, limit }) {
      const users = await userCollection.findAll();
      return queryRecords(users, { filters: { role }, sort, order, page, limit });
    },

    getUserById(userId) {
      return findUserOrFail(userId);
    },

    createUser(userInput) {
      return runWithUniqueIdentity(async () => {
        await assertIdentityIsUnique(userInput);

        const timestamp = clock().toISOString();
        return userCollection.insert({
          id: randomUUID(),
          ...userInput,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      });
    },

    updateUser(userId, userChanges) {
      return runWithUniqueIdentity(async () => {
        await findUserOrFail(userId);
        await assertIdentityIsUnique(userChanges, userId);

        return userCollection.updateById(userId, { ...userChanges, updatedAt: clock().toISOString() });
      });
    },

    async deleteUser(userId) {
      const user = await findUserOrFail(userId);
      const assignedTaskCount = await taskCollection.count((task) => task.assignee === user.username);

      if (assignedTaskCount > 0) {
        throw new ConflictError(
          `"${user.username}" kullanıcısına atanmış ${assignedTaskCount} görev olduğu için çalışan silinemez. Önce görevleri başka bir çalışana atayın.`,
        );
      }

      await userCollection.deleteById(userId);
    },
  };
}
