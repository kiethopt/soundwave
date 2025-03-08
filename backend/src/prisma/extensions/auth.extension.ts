import { Prisma } from '@prisma/client';
import { clearCacheForEntity } from '../../middleware/cache.middleware';

export const authExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      user: {
        async create({ args, query }) {
          const result = await query(args);
          await Promise.all([
            clearCacheForEntity('user', { clearSearch: true }),
            clearCacheForEntity('stats', {}),
          ]);
          return result;
        },
        async update({ args, query }) {
          const result = await query(args);
          await Promise.all([
            clearCacheForEntity('user', {
              entityId: args.where.id,
              clearSearch: true,
            }),
            clearCacheForEntity('stats', {}),
          ]);
          return result;
        },
        async delete({ args, query }) {
          const result = await query(args);
          await Promise.all([
            clearCacheForEntity('user', {
              entityId: args.where.id,
              clearSearch: true,
            }),
            clearCacheForEntity('stats', {}),
          ]);
          return result;
        },
      },
    },
  });
});
