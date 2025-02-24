import { Prisma } from '@prisma/client';
import { clearCacheForEntity } from './cache.middleware';
import { client as redisClient } from './cache.middleware';

export const userExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      userFollow: {
        async create({ args, query }) {
          const result = await query(args);

          // Clear cache cho cả người follow và người được follow
          await Promise.all([
            // Clear cache cho người follow
            redisClient.del(`/api/users/${args.data.followerId}/following`),

            // Clear cache cho người được follow (user hoặc artist)
            redisClient.del(
              `/api/users/${
                args.data.followingUserId || args.data.followingArtistId
              }/followers`
            ),

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
          // Lấy thông tin follow trước khi xóa
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
            await Promise.all([
              // Clear cache cho người unfollow
              redisClient.del(`/api/users/${followInfo.followerId}/following`),

              // Clear cache cho người bị unfollow
              redisClient.del(
                `/api/users/${
                  followInfo.followingUserId || followInfo.followingArtistId
                }/followers`
              ),

              // Clear cache tổng quát
              clearCacheForEntity('user', {
                entityId: followInfo.followerId,
                clearSearch: true,
              }),
              clearCacheForEntity('user', {
                entityId: (followInfo.followingUserId ||
                  followInfo.followingArtistId ||
                  '') as string,
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
