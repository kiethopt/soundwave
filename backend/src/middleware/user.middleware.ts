import { Prisma } from '@prisma/client';
import { clearCacheForEntity } from './cache.middleware';
import { client as redisClient } from './cache.middleware';

export const userExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      userFollow: {
        async create({ args, query }) {
          const result = await query(args);

          await Promise.all([
            redisClient.del(`/api/user/following`),
            redisClient.del(`/api/user/followers`),
            clearCacheForEntity('user', {
              entityId: args.data.followerId,
              clearSearch: true,
            }),
            clearCacheForEntity('user', {
              entityId: (args.data.followingUserId ||
                args.data.followingArtistId ||
                '') as string,
              clearSearch: true,
            }),
          ]);

          return result;
        },

        async delete({ args, query }) {
          const followInfo = await client.userFollow.findFirst({
            where: args.where as any,
            select: {
              followerId: true,
              followingUserId: true,
              followingArtistId: true,
            },
          });

          const result = await query(args);

          if (followInfo) {
            const followerId = followInfo.followerId;
            const followingId =
              followInfo.followingUserId || followInfo.followingArtistId;

            const followingKeys = await redisClient.keys(
              `/api/user/following*userId=${followerId}*`
            );
            const followerKeys = await redisClient.keys(
              `/api/user/followers*userId=${followingId}*`
            );

            await Promise.all([
              ...(followingKeys.length
                ? followingKeys.map((k) => redisClient.del(k))
                : []),
              ...(followerKeys.length
                ? followerKeys.map((k) => redisClient.del(k))
                : []),
              redisClient.del(`/api/user/following?userId=${followerId}`),
              redisClient.del(`/api/user/followers?userId=${followingId}`),
              clearCacheForEntity('user', {
                entityId: followerId,
                clearSearch: true,
              }),
              clearCacheForEntity('user', {
                entityId: followingId as string,
                clearSearch: true,
              }),
            ]);
          }

          return result;
        },
      },

      user: {
        async update({ args, query }) {
          const result = await query(args);

          if ('id' in args.where) {
            await Promise.all([
              redisClient.del(`/api/users/${args.where.id}/followers`),
              redisClient.del(`/api/users/${args.where.id}/following`),
              redisClient.del(`/api/user/${args.where.id}/recommended-artists`), // Added
              clearCacheForEntity('user', {
                entityId: args.where.id as string,
                clearSearch: true,
              }),
            ]);
          }

          return result;
        },
      },

      // Add handling for history updates
      history: {
        async create({ args, query }) {
          const result = await query(args);

          if (args.data.userId && args.data.type === 'PLAY') {
            await Promise.all([
              redisClient.del(`/api/user/${args.data.userId}/recommended-artists`),
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
            select: { userId: true, type: true },
          });

          const result = await query(args);

          if (history?.userId && history.type === 'PLAY') {
            await Promise.all([
              redisClient.del(`/api/user/${history.userId}/recommended-artists`),
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