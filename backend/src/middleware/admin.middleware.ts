import { Prisma, Role } from '@prisma/client';
import { clearCacheForEntity } from './cache.middleware';
import { client as redis } from './cache.middleware';

export const adminExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      user: {
        async update({ args, query }) {
          // Kiểm tra nếu role được cập nhật thành ADMIN
          if (args.data.role === Role.ADMIN) {
            // Tìm và xóa ArtistProfile nếu tồn tại
            const existingArtistProfile = await client.artistProfile.findUnique(
              {
                where: { userId: args.where.id },
              }
            );
            if (existingArtistProfile) {
              await client.artistProfile.delete({
                where: { userId: args.where.id },
              });
            }
          }

          const result = await query(args);

          // Nếu user bị deactivate, xóa tất cả session của họ
          if (args.data.isActive === false) {
            await redis.del(`user_sessions:${args.where.id}`);
          }

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
      artistProfile: {
        async update({ args, query }) {
          const result = await query(args);

          // Nếu artist profile bị deactivate, tìm user ID và xóa sessions
          if (args.data.isActive === false) {
            const artistProfile = await client.artistProfile.findUnique({
              where: { id: args.where.id },
              select: { userId: true },
            });
            if (artistProfile) {
              await redis.del(`user_sessions:${artistProfile.userId}`);

              // Cập nhật user về profile USER nếu đang ở profile ARTIST
              await client.user.update({
                where: { id: artistProfile.userId },
                data: { currentProfile: 'USER' },
              });
            }
          }

          await Promise.all([
            clearCacheForEntity('artist', {
              entityId: args.where.id,
              clearSearch: true,
            }),
            clearCacheForEntity('stats', {}),
          ]);
          return result;
        },
      },
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
      },
    },
  });
});
