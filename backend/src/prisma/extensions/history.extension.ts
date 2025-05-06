import { Prisma } from '@prisma/client';
import { clearCacheForEntity } from '../../middleware/cache.middleware';
import { client as redisClient } from '../../middleware/cache.middleware';

export const historyExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      history: {
        async create({ args, query }) {
          const result = await query(args);

          if (
            args.data.userId &&
            args.data.type === 'PLAY' &&
            args.data.completed
          ) {
            // Clear caches
            await Promise.all([
              redisClient.del(
                `/api/user/${args.data.userId}/recommended-artists`
              ),
              redisClient.del('/api/top-tracks'),
              redisClient.del('/api/top-albums'),
              redisClient.del('/api/top-artists'),
              clearCacheForEntity('history', {
                userId: args.data.userId,
              }),
            ]);
          }

          return result;
        },

        async update({ args, query }) {
          const history = await client.history.findFirst({
            where: args.where as any,
            select: { userId: true, type: true, completed: true },
          });

          const result = await query(args);

          if (history?.userId && history.type === 'PLAY') {
            // Clear caches
            await Promise.all([
              redisClient.del(
                `/api/user/${history.userId}/recommended-artists`
              ),
              redisClient.del('/api/top-tracks'),
              redisClient.del('/api/top-albums'),
              redisClient.del('/api/top-artists'),
              clearCacheForEntity('history', {
                userId: history.userId,
              }),
            ]);
          }

          return result;
        },
      },
    },
  });
});
