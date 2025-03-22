import { Prisma } from '@prisma/client';
import cron from 'node-cron';
import {
  generateGlobalRecommendedPlaylist,
  SystemPlaylistService,
} from '../../services/playlist.service';

// Create an instance of SystemPlaylistService
const systemPlaylistService = new SystemPlaylistService();

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

/**
 * Cập nhật tất cả Discover Weekly Playlists cho mọi người dùng
 */
export async function autoUpdateDiscoverWeeklyPlaylists(client: any) {
  console.log('[Playlist] Starting Discover Weekly playlists update...');
  try {
    // Tìm tất cả Discover Weekly playlists
    const discoverWeeklyPlaylists = await client.playlist.findMany({
      where: {
        name: 'Discover Weekly',
        type: 'SYSTEM',
      },
    });

    console.log(
      `[Playlist] Found ${discoverWeeklyPlaylists.length} Discover Weekly playlists`
    );

    // Nếu không có playlist nào, không cần cập nhật
    if (discoverWeeklyPlaylists.length === 0) {
      console.log('[Playlist] No Discover Weekly playlists found to update');
      return;
    }

    // Cập nhật từng playlist
    for (const playlist of discoverWeeklyPlaylists) {
      await systemPlaylistService.updateDiscoverWeeklyPlaylist(playlist.id);
      console.log(
        `[Playlist] Updated Discover Weekly playlist for user: ${playlist.userId}`
      );
    }

    console.log(
      '[Playlist] All Discover Weekly playlists updated successfully'
    );
  } catch (error) {
    console.error(
      '[Playlist] Error updating Discover Weekly playlists:',
      error
    );
  }
}

/**
 * Cập nhật tất cả New Releases Playlists
 */
export async function autoUpdateNewReleasesPlaylists(client: any) {
  console.log('[Playlist] Starting New Releases playlists update...');
  try {
    // Cập nhật New Releases playlists cho từng người dùng
    const newReleasesPlaylists = await client.playlist.findMany({
      where: {
        name: 'Soundwave Fresh: New Releases',
        type: 'SYSTEM',
      },
    });

    console.log(
      `[Playlist] Found ${newReleasesPlaylists.length} New Releases playlists`
    );

    if (newReleasesPlaylists.length === 0) {
      console.log('[Playlist] No New Releases playlists found to update');
      return;
    }

    // Cập nhật từng playlist
    for (const playlist of newReleasesPlaylists) {
      await systemPlaylistService.updateNewReleasesPlaylist(playlist.id);
      console.log(
        `[Playlist] Updated New Releases playlist for user: ${playlist.userId}`
      );
    }

    console.log('[Playlist] All New Releases playlists updated successfully');
  } catch (error) {
    console.error('[Playlist] Error updating New Releases playlists:', error);
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
    try {
      // Schedule daily cron job for Top Hits playlist
      const DAILY_CRON = '0 0 * * *'; // Run at midnight every day
      console.log(
        '[Playlist] Setting up daily cron schedule for Top Hits:',
        DAILY_CRON
      );
      cron.schedule(DAILY_CRON, () => {
        console.log(
          `[Playlist] Daily cron job triggered at ${new Date().toISOString()}`
        );
        autoUpdateGlobalPlaylist(client);
      });

      // Schedule weekly cron job for Discover Weekly playlists (Mondays at midnight)
      const MONDAY_CRON = '0 0 * * 1'; // Run at midnight every Monday
      console.log(
        '[Playlist] Setting up weekly cron schedule for Discover Weekly:',
        MONDAY_CRON
      );
      cron.schedule(MONDAY_CRON, () => {
        console.log(
          `[Playlist] Monday cron job triggered at ${new Date().toISOString()}`
        );
        autoUpdateDiscoverWeeklyPlaylists(client);
      });

      // Schedule multiple weekly cron jobs for New Releases playlists on Fridays
      // First update at midnight to catch early releases
      const FRIDAY_MIDNIGHT_CRON = '0 0 * * 5'; // Run at midnight (00:00) every Friday
      console.log(
        '[Playlist] Setting up Friday midnight cron for New Releases:',
        FRIDAY_MIDNIGHT_CRON
      );
      cron.schedule(FRIDAY_MIDNIGHT_CRON, () => {
        console.log(
          `[Playlist] Friday midnight cron triggered at ${new Date().toISOString()}`
        );
        autoUpdateNewReleasesPlaylists(client);
      });

      // Second update at noon to catch mid-day releases
      const FRIDAY_NOON_CRON = '0 12 * * 5'; // Run at noon (12:00) every Friday
      console.log(
        '[Playlist] Setting up Friday noon cron for New Releases:',
        FRIDAY_NOON_CRON
      );
      cron.schedule(FRIDAY_NOON_CRON, () => {
        console.log(
          `[Playlist] Friday noon cron triggered at ${new Date().toISOString()}`
        );
        autoUpdateNewReleasesPlaylists(client);
      });

      // Third update in the evening to catch afternoon releases
      const FRIDAY_EVENING_CRON = '0 18 * * 5'; // Run at 6 PM (18:00) every Friday
      console.log(
        '[Playlist] Setting up Friday evening cron for New Releases:',
        FRIDAY_EVENING_CRON
      );
      cron.schedule(FRIDAY_EVENING_CRON, () => {
        console.log(
          `[Playlist] Friday evening cron triggered at ${new Date().toISOString()}`
        );
        autoUpdateNewReleasesPlaylists(client);
      });

      console.log('[Playlist] All cron jobs successfully scheduled');
      cronJobInitialized = true;
    } catch (error) {
      console.error('[Playlist] Error setting up cron jobs:', error);
    }
  }

  return client.$extends({
    model: {
      playlist: {
        // Phương thức để cập nhật global playlist thủ công
        async updateGlobalPlaylist() {
          return autoUpdateGlobalPlaylist(client);
        },
        // Phương thức để cập nhật Discover Weekly playlists thủ công
        async updateDiscoverWeeklyPlaylists() {
          return autoUpdateDiscoverWeeklyPlaylists(client);
        },
        // Phương thức để cập nhật New Releases playlists thủ công
        async updateNewReleasesPlaylists() {
          return autoUpdateNewReleasesPlaylists(client);
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
