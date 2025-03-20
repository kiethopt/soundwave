import { Prisma } from '@prisma/client';
import cron from 'node-cron';
import { generateGlobalRecommendedPlaylist } from '../../services/playlist.service';

/**
 * Tìm global playlist dựa trên tên
 */
async function findGlobalPlaylist(client: any) {
  try {
    const globalPlaylist = await client.playlist.findFirst({
      where: {
        name: 'Soundwave Hits: Trending Right Now',
      },
    });

    if (!globalPlaylist) {
      console.log('[Playlist] Global playlist not found');
      return null;
    }

    return globalPlaylist;
  } catch (error) {
    console.error('[Playlist] Error finding global playlist:', error);
    return null;
  }
}

/**
 * Cập nhật global playlist với bài hát mới
 */
export async function autoUpdateGlobalPlaylist(client: any) {
  console.log('[Playlist] Starting global playlist update...');
  try {
    // Tìm global playlist
    console.log('[Playlist] Finding global playlist...');
    const globalPlaylist = await findGlobalPlaylist(client);

    if (!globalPlaylist) {
      console.log('[Playlist] Global playlist not found, creating new one...');
      // Create the global playlist if it doesn't exist
      const recommendedPlaylist = await generateGlobalRecommendedPlaylist(20);

      const newPlaylist = await client.playlist.create({
        data: {
          name: 'Soundwave Hits: Trending Right Now',
          description:
            'Những bài hát được yêu thích nhất hiện nay trên nền tảng Soundwave, được cập nhật tự động dựa trên hoạt động nghe nhạc của cộng đồng.',
          type: 'SYSTEM', // Using SYSTEM type instead of NORMAL
          privacy: 'PUBLIC',
          totalTracks: recommendedPlaylist.tracks.length,
          totalDuration: recommendedPlaylist.totalDuration,
          coverUrl: recommendedPlaylist.coverUrl,
          // Assign to first admin user
          userId: (
            await client.user.findFirst({ where: { role: 'ADMIN' } })
          )?.id,
        },
      });

      // Add tracks to the new playlist
      for (let i = 0; i < recommendedPlaylist.tracks.length; i++) {
        await client.playlistTrack.create({
          data: {
            playlistId: newPlaylist.id,
            trackId: recommendedPlaylist.tracks[i].id,
            trackOrder: i,
          },
        });
      }

      console.log(
        '[Playlist] Created new global playlist with ID:',
        newPlaylist.id
      );
      return;
    }

    console.log('[Playlist] Global playlist found:', globalPlaylist.id);

    // If global playlist doesn't have SYSTEM type, update it
    if (globalPlaylist.type !== 'SYSTEM') {
      await client.playlist.update({
        where: { id: globalPlaylist.id },
        data: {
          type: 'SYSTEM', // Update to SYSTEM type
          privacy: 'PUBLIC',
        },
      });
      console.log('[Playlist] Updated global playlist to SYSTEM type');
    }

    // Generate new recommended tracks
    console.log('[Playlist] Generating recommended tracks...');
    const recommendedPlaylist = await generateGlobalRecommendedPlaylist(20);
    console.log(
      '[Playlist] Recommended tracks generated, count:',
      recommendedPlaylist.tracks.length,
      'First few tracks:',
      recommendedPlaylist.tracks.slice(0, 2).map((t: any) => t.id)
    );

    // Update playlist tracks
    console.log('[Playlist] Deleting existing playlist tracks...');
    await client.playlistTrack.deleteMany({
      where: { playlistId: globalPlaylist.id },
    });
    console.log('[Playlist] Existing playlist tracks deleted');

    // Add new tracks
    console.log('[Playlist] Adding new tracks to playlist...');
    for (let i = 0; i < recommendedPlaylist.tracks.length; i++) {
      await client.playlistTrack.create({
        data: {
          playlistId: globalPlaylist.id,
          trackId: recommendedPlaylist.tracks[i].id,
          trackOrder: i,
        },
      });
    }
    console.log(
      '[Playlist] Added',
      recommendedPlaylist.tracks.length,
      'tracks to playlist'
    );

    // Update playlist metadata
    console.log('[Playlist] Updating playlist metadata...');
    await client.playlist.update({
      where: { id: globalPlaylist.id },
      data: {
        totalTracks: recommendedPlaylist.tracks.length,
        totalDuration: recommendedPlaylist.totalDuration,
        updatedAt: new Date(),
      },
    });
    console.log('[Playlist] Playlist metadata updated');

    console.log('[Playlist] Global playlist updated successfully');
  } catch (error) {
    console.error('[Playlist] Error updating global playlist:', error);
  }
}

// Store cron job in module scope
let cronJobInitialized = false;

/**
 * Prisma Extension for playlist management
 */
export const playlistExtension = Prisma.defineExtension((client) => {
  // Only set up the cron job once
  if (!cronJobInitialized) {
    const CRON_EXPRESSION = '0 0 * * *'; // Run at midnight every day
    console.log('[Playlist] Setting up cron schedule:', CRON_EXPRESSION);

    try {
      // Schedule the cron job without storing a reference
      cron.schedule(CRON_EXPRESSION, () => {
        console.log(
          `[Playlist] Cron job triggered at ${new Date().toISOString()}`
        );
        autoUpdateGlobalPlaylist(client);
      });

      console.log('[Playlist] Cron job successfully scheduled');
      cronJobInitialized = true;
    } catch (error) {
      console.error('[Playlist] Error setting up cron job:', error);
    }
  }

  return client.$extends({
    model: {
      playlist: {
        // Phương thức để cập nhật global playlist thủ công
        async updateGlobalPlaylist() {
          return autoUpdateGlobalPlaylist(client);
        },
      },
    },
    query: {
      playlist: {
        async create({ args, query }) {
          const result = await query(args);
          return result;
        },
        async update({ args, query }) {
          const result = await query(args);
          return result;
        },
        async delete({ args, query }) {
          const result = await query(args);
          return result;
        },
      },
    },
  });
});
