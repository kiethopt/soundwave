import { Prisma } from '@prisma/client';
import { clearCacheForEntity } from './cache.middleware';

export const adminExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      genre: {
        async create({ args, query }) {
          const result = await query(args);
          await Promise.all([
            clearCacheForEntity('genre', { clearSearch: true }),
            clearCacheForEntity('track', { clearSearch: true }),
            clearCacheForEntity('stats', {}),
          ]);
          return result;
        },
        async update({ args, query }) {
          const result = await query(args);
          await Promise.all([
            clearCacheForEntity('genre', {
              entityId: args.where.id,
              clearSearch: true,
            }),
            clearCacheForEntity('track', { clearSearch: true }),
          ]);
          return result;
        },
        async delete({ args, query }) {
          const result = await query(args);
          await Promise.all([
            clearCacheForEntity('genre', {
              entityId: args.where.id,
              clearSearch: true,
            }),
            clearCacheForEntity('track', { clearSearch: true }),
            clearCacheForEntity('stats', {}),
          ]);
          return result;
        },
        async findMany({ args, query }) {
          const result = await query(args);
          return result;
        },
        async count({ args, query }) {
          const result = await query(args);
          return result;
        },
      },
    },
  });
});
