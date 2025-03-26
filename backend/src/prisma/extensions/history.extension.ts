import { Prisma } from '@prisma/client';
import { clearCacheForEntity } from '../../middleware/cache.middleware';
import { client as redisClient } from '../../middleware/cache.middleware';
import * as playlistService from '../../services/playlist.service';

// Flag to prevent too frequent updates (we don't need to update on every play)
const userLastUpdateTime = new Map<string, number>();
const UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Throttled function to update Vibe Rewind playlist
 * Only updates if enough time has passed since last update
 */
const throttledPlaylistUpdate = async (userId: string) => {
  const now = Date.now();
  const lastUpdate = userLastUpdateTime.get(userId) || 0;

  // Check if enough time has passed since last update
  if (now - lastUpdate > UPDATE_INTERVAL) {
    try {
      await playlistService.updateVibeRewindPlaylist(userId);
      userLastUpdateTime.set(userId, now);
      console.log(
        `[HistoryExtension] Updated Vibe Rewind playlist for user ${userId}`
      );
    } catch (error) {
      console.error(
        `[HistoryExtension] Error updating Vibe Rewind playlist: ${error}`
      );
    }
  }
};

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

            // Update Vibe Rewind playlist (throttled)
            throttledPlaylistUpdate(args.data.userId);
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

            // If this is a completed play, update the playlist
            const isCompleted =
              typeof args.data === 'object' &&
              'completed' in args.data &&
              args.data.completed === true;

            if (isCompleted) {
              // Update Vibe Rewind playlist (throttled)
              throttledPlaylistUpdate(history.userId);
            }
          }

          return result;
        },
      },
    },
  });
});
