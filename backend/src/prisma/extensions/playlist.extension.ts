import { Prisma } from '@prisma/client';
import { clearCacheForEntity } from '../../middleware/cache.middleware';
import cron from 'node-cron';
import { updateAllSystemPlaylists } from '../../services/playlist.service';

export const playlistExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      playlist: {
        async create({ args, query }) {
          const result = await query(args);

          // Clear cache when a new playlist is created
          await Promise.all([
            clearCacheForEntity('playlist', {
              entityId: result.id,
              clearSearch: true,
            }),
            args.data.userId
              ? clearCacheForEntity('user', {
                  entityId: args.data.userId,
                  clearSearch: false,
                })
              : Promise.resolve(),
          ]);

          return result;
        },
        async update({ args, query }) {
          const result = await query(args);

          // Clear cache when a playlist is updated
          await Promise.all([
            clearCacheForEntity('playlist', {
              entityId: args.where.id,
              clearSearch: true,
            }),
            // If this is a user playlist, clear user cache as well
            result.userId
              ? clearCacheForEntity('user', {
                  entityId: result.userId,
                  clearSearch: false,
                })
              : Promise.resolve(),
          ]);

          return result;
        },
        async delete({ args, query }) {
          // Get the playlist before deleting to know the userId
          const playlist = await client.playlist.findUnique({
            where: { id: args.where.id },
            select: { userId: true },
          });

          const result = await query(args);

          // Clear cache
          await Promise.all([
            clearCacheForEntity('playlist', {
              entityId: args.where.id,
              clearSearch: true,
            }),
            playlist?.userId
              ? clearCacheForEntity('user', {
                  entityId: playlist.userId,
                  clearSearch: false,
                })
              : Promise.resolve(),
          ]);

          return result;
        },
      },
      playlistTrack: {
        async createMany({ args, query }) {
          const result = await query(args);

          if (
            'data' in args &&
            Array.isArray(args.data) &&
            args.data.length > 0
          ) {
            const playlistId = args.data[0].playlistId;
            await clearCacheForEntity('playlist', {
              entityId: playlistId,
              clearSearch: true,
            });
          }

          return result;
        },
        async delete({ args, query }) {
          // Get the track to know its playlistId
          const track = await client.playlistTrack.findUnique({
            where: args.where,
            select: { playlistId: true },
          });

          const result = await query(args);

          if (track) {
            await clearCacheForEntity('playlist', {
              entityId: track.playlistId,
              clearSearch: true,
            });
          }

          return result;
        },
        async deleteMany({ args, query }) {
          // This is trickier - we can't easily get all playlist IDs
          // If where clause has a playlistId, use that
          let playlistId: string | undefined;

          if (args.where && 'playlistId' in args.where) {
            playlistId = args.where.playlistId as string;
          }

          const result = await query(args);

          if (playlistId) {
            await clearCacheForEntity('playlist', {
              entityId: playlistId,
              clearSearch: true,
            });
          } else {
            // If we can't determine specific playlist, clear all playlist cache
            await clearCacheForEntity('playlist', { clearSearch: true });
          }

          return result;
        },
      },
    },
  });
});

// Schedule cron job to update system playlists at midnight (00:00)
cron.schedule('0 0 * * *', async () => {
  console.log('[Cron] Starting nightly update of system playlists');
  try {
    const result = await updateAllSystemPlaylists();

    if (result.success) {
      console.log('[Cron] Successfully updated all system playlists');
    } else {
      console.error(
        `[Cron] System playlist update completed with ${result.errors.length} errors`
      );

      if (result.errors.length > 0) {
        // Log just a few errors as samples
        const sampleErrors = result.errors.slice(0, 3);
        console.error(
          '[Cron] Sample errors:',
          JSON.stringify(sampleErrors, null, 2)
        );

        if (result.errors.length > 3) {
          console.error(
            `[Cron] ...and ${result.errors.length - 3} more errors`
          );
        }
      }
    }
  } catch (error) {
    console.error('[Cron] Critical error updating system playlists:', error);
  }
});

// Also export the cron job registration function for manual use
// export const registerPlaylistCronJobs = () => {
//   console.log(
//     '[Cron] System playlist update job has been registered for midnight (00:00)'
//   );
//   // The job is already scheduled when the module is imported
// };
