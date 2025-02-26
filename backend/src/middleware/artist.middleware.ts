import { Prisma } from '@prisma/client';
import { clearCacheForEntity } from './cache.middleware';
import cron from 'node-cron';

export const artistExtension = Prisma.defineExtension((client) => {
  // Cron job chạy mỗi ngày lúc 0:00 để cập nhật số lượng người nghe hàng tháng cho tất cả artists đã được xác thực
  cron.schedule('0 0 * * *', async () => {
    try {
      const artists = await client.artistProfile.findMany({
        where: { role: 'ARTIST', isVerified: true },
        select: { id: true },
      });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const artist of artists) {
        const trackIds = await client.track
          .findMany({
            where: { artistId: artist.id },
            select: { id: true },
          })
          .then((tracks) => tracks.map((track) => track.id));

        const uniqueListeners = await client.history.findMany({
          where: {
            trackId: { in: trackIds },
            type: 'PLAY',
            createdAt: { gte: thirtyDaysAgo },
          },
          distinct: ['userId'],
        });

        await client.artistProfile.update({
          where: { id: artist.id },
          data: { monthlyListeners: uniqueListeners.length },
        });
      }
      console.log('Updated monthly listeners for all artists');
    } catch (error) {
      console.error('Auto update monthly listeners error:', error);
    }
  });

  return client.$extends({
    query: {
      artistProfile: {
        async create({ args, query }) {
          const result = await query(args);
          await Promise.all([
            clearCacheForEntity('artist', { clearSearch: true }),
            clearCacheForEntity('artist-requests', { clearSearch: true }),
            clearCacheForEntity('stats', {}),
          ]);
          return result;
        },
        async update({ args, query }) {
          const result = await query(args);
          await Promise.all([
            clearCacheForEntity('artist', {
              entityId: args.where.id,
              clearSearch: true,
            }),
            clearCacheForEntity('artist-requests', { clearSearch: true }),
            clearCacheForEntity('stats', {}),
          ]);
          return result;
        },
        async delete({ args, query }) {
          const result = await query(args);
          await Promise.all([
            clearCacheForEntity('artist', {
              entityId: args.where.id,
              clearSearch: true,
            }),
            clearCacheForEntity('artist-requests', { clearSearch: true }),
            clearCacheForEntity('stats', {}),
            clearCacheForEntity('album', { clearSearch: true }),
            clearCacheForEntity('track', { clearSearch: true }),
          ]);
          return result;
        },
      },
      album: {
        async create({ args, query }) {
          const result = await query(args);
          await Promise.all([
            clearCacheForEntity('artist', {
              entityId: args.data.artistId,
              clearSearch: true,
            }),
            clearCacheForEntity('album', { clearSearch: true }),
            clearCacheForEntity('stats', {}),
          ]);
          return result;
        },
        async update({ args, query }) {
          const result = await query(args);
          const album = await client.album.findUnique({
            where: { id: args.where.id },
            select: { artistId: true },
          });
          if (album) {
            await Promise.all([
              clearCacheForEntity('artist', {
                entityId: album.artistId,
                clearSearch: true,
              }),
              clearCacheForEntity('album', {
                entityId: args.where.id,
                clearSearch: true,
              }),
            ]);
          }
          return result;
        },
        async delete({ args, query }) {
          const album = await client.album.findUnique({
            where: { id: args.where.id },
            select: { artistId: true },
          });
          const result = await query(args);
          if (album) {
            await Promise.all([
              clearCacheForEntity('artist', {
                entityId: album.artistId,
                clearSearch: true,
              }),
              clearCacheForEntity('album', {
                entityId: args.where.id,
                clearSearch: true,
              }),
              clearCacheForEntity('track', { clearSearch: true }),
            ]);
          }
          return result;
        },
      },
      track: {
        async create({ args, query }) {
          const result = await query(args);
          await Promise.all([
            clearCacheForEntity('artist', {
              entityId: args.data.artistId,
              clearSearch: true,
            }),
            clearCacheForEntity('track', { clearSearch: true }),
            clearCacheForEntity('stats', {}),
            args.data.albumId &&
              clearCacheForEntity('album', {
                entityId: args.data.albumId,
                clearSearch: true,
              }),
          ]);
          return result;
        },
        async update({ args, query }) {
          const result = await query(args);
          const track = await client.track.findUnique({
            where: { id: args.where.id },
            select: { artistId: true, albumId: true },
          });
          if (track) {
            await Promise.all([
              clearCacheForEntity('artist', {
                entityId: track.artistId,
                clearSearch: true,
              }),
              clearCacheForEntity('track', {
                entityId: args.where.id,
                clearSearch: true,
              }),
              track.albumId &&
                clearCacheForEntity('album', {
                  entityId: track.albumId,
                  clearSearch: true,
                }),
            ]);
          }
          return result;
        },
        async delete({ args, query }) {
          const track = await client.track.findUnique({
            where: { id: args.where.id },
            select: { artistId: true, albumId: true },
          });
          const result = await query(args);
          if (track) {
            await Promise.all([
              clearCacheForEntity('artist', {
                entityId: track.artistId,
                clearSearch: true,
              }),
              clearCacheForEntity('track', {
                entityId: args.where.id,
                clearSearch: true,
              }),
              track.albumId &&
                clearCacheForEntity('album', {
                  entityId: track.albumId,
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
