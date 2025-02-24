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
            // Clear cache cho người follow
            redisClient.del(`/api/user/following`),

            // Clear cache cho người được follow
            redisClient.del(`/api/user/followers`),

            // Clear cache tổng quát
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

            // Sửa pattern matching cho Redis keys
            const followingKeys = await redisClient.keys(
              `/api/user/following*userId=${followerId}*` // Thay ? thành *
            );
            const followerKeys = await redisClient.keys(
              `/api/user/followers*userId=${followingId}*` // Thay ? thành *
            );

            // Thêm xóa cache cho cả 2 phía
            await Promise.all([
              ...(followingKeys.length
                ? followingKeys.map((k) => redisClient.del(k))
                : []),
              ...(followerKeys.length
                ? followerKeys.map((k) => redisClient.del(k))
                : []),
              redisClient.del(`/api/user/following?userId=${followerId}`),
              redisClient.del(`/api/user/followers?userId=${followingId}`),

              // Clear cache tổng quát
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

      // Thêm xử lý cho user update để clear cache khi thông tin user thay đổi
      user: {
        async update({ args, query }) {
          const result = await query(args);

          if ('id' in args.where) {
            await Promise.all([
              redisClient.del(`/api/users/${args.where.id}/followers`),
              redisClient.del(`/api/users/${args.where.id}/following`),
              clearCacheForEntity('user', {
                entityId: args.where.id as string,
                clearSearch: true,
              }),
            ]);
          }

          return result;
        },
      },
    },
  });
});
