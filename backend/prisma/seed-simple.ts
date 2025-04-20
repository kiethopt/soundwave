import { PrismaClient, Role, AlbumType } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import * as cliProgress from 'cli-progress';
import colors from 'colors';

// Import data from our modular structure
import { artists } from './data/artists';
import { albums } from './data/albums';
import { singles } from './data/tracks'; // Import singles
import { genreNames, labelData, getGenreIds, getLabelId } from './data/utils';

dotenv.config();

const prisma = new PrismaClient();

// Helper function to convert MM:SS or M:SS string to seconds
function durationToSeconds(durationStr: string): number {
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) {
    const minutes = parts[0];
    const seconds = parts[1];
    if (!isNaN(minutes) && !isNaN(seconds)) {
      return minutes * 60 + seconds;
    }
  }
  console.warn(`⚠️ Invalid duration format: ${durationStr}. Returning 0.`);
  return 0; // Default or throw error if strict parsing is needed
}

async function main() {
  try {
    console.log(colors.cyan('🔄 Starting database seeding with optimized structure...'));
    const hashedPassword = await bcrypt.hash('123456', 10);
    const now = new Date();

    // Create a multi-progress bar container
    const multibar = new cliProgress.MultiBar({
      clearOnComplete: false,
      hideCursor: true,
      format: colors.cyan('{bar}') + ' | {percentage}% | {value}/{total} {task}',
    }, cliProgress.Presets.shades_grey);

    // === 1. Seed Genres ===
    const genreBar = multibar.create(genreNames.length, 0, { task: 'Seeding genres' });
    await prisma.genre.createMany({
      data: genreNames.map((name, index) => {
        genreBar.update(index + 1);
        return { name };
      }),
      skipDuplicates: true,
    });
    genreBar.update(genreNames.length);

    // === 2. Seed Labels ===
    const labelBar = multibar.create(labelData.length, 0, { task: 'Seeding labels' });
    for (let i = 0; i < labelData.length; i++) {
      const label = labelData[i];
      await prisma.label.upsert({
        where: { name: label.name },
        update: {
          description: label.description,
          logoUrl: label.logoUrl || null,
        },
        create: {
          name: label.name,
          description: label.description,
          logoUrl: label.logoUrl || null,
        },
      });
      labelBar.update(i + 1);
    }

    // === 3. Seed Admin Account ===
    const adminBar = multibar.create(2, 0, { task: 'Seeding admin accounts' });
    await prisma.user.upsert({
      where: { email: 'admin@soundwave.com' },
      update: { isActive: true, role: Role.ADMIN, adminLevel: 1 },
      create: {
        email: 'admin@soundwave.com',
        username: 'admin',
        password: hashedPassword,
        name: 'Administrator',
        role: Role.ADMIN,
        adminLevel: 1,
        isActive: true,
      },
    });
    adminBar.update(1);

    // === 3.1 Seed Admin Level 2 Account ===
    await prisma.user.upsert({
      where: { email: 'admin2@soundwave.com' },
      update: { isActive: true, role: Role.ADMIN, adminLevel: 2 },
      create: {
        email: 'admin2@soundwave.com',
        username: 'admin2',
        password: hashedPassword,
        name: 'Administrator Level 2',
        role: Role.ADMIN,
        adminLevel: 2,
        isActive: true,
      },
    });
    adminBar.increment();

    // === 4. Seed Artists (from artists.ts) ===
    const artistBar = multibar.create(artists.length, 0, { task: 'Seeding artists' });
    
    // Create a Map to store artistName -> artistId for easier lookup
    const artistProfilesMap = new Map<string, string>();

    // Seed all artists
    for (let i = 0; i < artists.length; i++) {
      const artistData = artists[i];
      const user = await prisma.user.upsert({
        where: { email: artistData.user.email },
        update: {
          name: artistData.user.name,
          username: artistData.user.username,
          avatar: artistData.profile.avatar,
        },
        create: {
          ...artistData.user,
          avatar: artistData.profile.avatar,
          password: hashedPassword,
          isActive: true,
          role: Role.USER,
        },
      });

      const artistProfile = await prisma.artistProfile.upsert({
        where: { userId: user.id },
        update: {
          ...artistData.profile,
          isVerified: true,
          isActive: true,
          verifiedAt: now,
        },
        create: {
          ...artistData.profile,
          userId: user.id,
          role: Role.ARTIST,
          isVerified: true,
          isActive: true,
          verifiedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      });
      artistProfilesMap.set(artistProfile.artistName, artistProfile.id);
      artistBar.update(i + 1);
    }

    // === 5. Seed Albums and Tracks (from albums.ts) ===
    const albumBar = multibar.create(albums.length, 0, { task: 'Seeding albums' });
    let totalTracksCount = 0; // Count total number of tracks across all albums
    albums.forEach(album => totalTracksCount += album.tracks.length);
    const trackBar = multibar.create(totalTracksCount, 0, { task: 'Seeding album tracks' });
    
    let processedTracks = 0;
    for (let i = 0; i < albums.length; i++) {
      const albumData = albums[i];
      const artistId = artistProfilesMap.get(albumData.artistName);
      if (!artistId) {
        console.warn(
          colors.yellow(`⚠️ Could not find artistId for ${albumData.artistName}. Skipping album "${albumData.title}".`)
        );
        albumBar.increment();
        continue;
      }

      const albumLabelId = await getLabelId(prisma, albumData.labelName);
      const albumGenreIds = await getGenreIds(prisma, albumData.genreNames);
      const totalTracks = albumData.tracks.length;
      const albumDuration = albumData.tracks.reduce(
        (sum, track) => sum + track.duration,
        0
      );

      // Create the album
      const album = await prisma.album.upsert({
        where: { title_artistId: { title: albumData.title, artistId } },
        update: {
          coverUrl: albumData.coverUrl,
          labelId: albumLabelId,
          type: albumData.type,
          isActive: true,
          totalTracks: totalTracks,
          duration: albumDuration,
          genres: {
            deleteMany: {},
            create: albumGenreIds.map((genreId) => ({ genreId })),
          },
        },
        create: {
          title: albumData.title,
          coverUrl: albumData.coverUrl,
          releaseDate: albumData.releaseDate || now,
          duration: albumDuration,
          totalTracks: totalTracks,
          type: albumData.type,
          isActive: true,
          artistId: artistId,
          labelId: albumLabelId,
          createdAt: now,
          updatedAt: now,
          genres: { create: albumGenreIds.map((genreId) => ({ genreId })) },
        },
      });
      albumBar.update(i + 1);

      // Find featured artist IDs mentioned for the whole album
      const albumFeaturedArtistIds = (
        albumData.featuredArtistNames ?? []
      )
        .map((name) => artistProfilesMap.get(name))
        .filter((id): id is string => !!id);

      // Create tracks for the album
      for (const trackData of albumData.tracks) {
        const track = await prisma.track.upsert({
          where: { title_artistId: { title: trackData.title, artistId } },
          update: {
            audioUrl: trackData.audioUrl,
            trackNumber: trackData.trackNumber,
            coverUrl: trackData.coverUrl || album.coverUrl, // Use track cover if available, otherwise album cover
            duration: trackData.duration,
            isActive: true,
            type: album.type,
            labelId: null, // Explicitly null for tracks within albums
            genres: {
              deleteMany: {},
              create: albumGenreIds.map((genreId) => ({ genreId })), // Inherit genres from album
            },
          },
          create: {
            title: trackData.title,
            duration: trackData.duration,
            releaseDate: albumData.releaseDate || now,
            trackNumber: trackData.trackNumber,
            coverUrl: trackData.coverUrl || album.coverUrl,
            audioUrl: trackData.audioUrl,
            playCount: 0,
            type: album.type,
            isActive: true,
            artistId: artistId, // Main artist
            albumId: album.id, // Link to the album
            labelId: null, // Explicitly null for tracks within albums
            createdAt: now,
            updatedAt: now,
            genres: { create: albumGenreIds.map((genreId) => ({ genreId })) },
          },
        });

        // Determine featured artists for this specific track
        let trackFeaturedArtistIds: string[] = [];
        if (trackData.featuredArtists && trackData.featuredArtists.length > 0) {
          // Use track-specific features if defined
          trackFeaturedArtistIds = trackData.featuredArtists
            .map((name) => artistProfilesMap.get(name))
            .filter((id): id is string => !!id);
        } else if (albumFeaturedArtistIds.length > 0) {
          // Fallback to album-level features if no track-specific features
          trackFeaturedArtistIds = albumFeaturedArtistIds;
        }

        // Add featured artists if any
        if (trackFeaturedArtistIds.length > 0) {
          await prisma.trackArtist.createMany({
            data: trackFeaturedArtistIds.map((featArtistId) => ({
              trackId: track.id,
              artistId: featArtistId,
            })),
            skipDuplicates: true,
          });
        }
        
        processedTracks++;
        trackBar.update(processedTracks);
      }
    }
    
    // === 6. Seed Standalone Singles (from tracks.ts) ===
    const singleBar = multibar.create(singles.length, 0, { task: 'Seeding standalone singles' });
    
    for (let i = 0; i < singles.length; i++) {
      const singleData = singles[i];
      const artistId = artistProfilesMap.get(singleData.artistName);
      if (!artistId) {
        console.warn(
          colors.yellow(`⚠️ Could not find artistId for ${singleData.artistName} while seeding single "${singleData.title}". Skipping.`)
        );
        singleBar.increment();
        continue;
      }

      const singleLabelId = await getLabelId(prisma, singleData.labelName);
      const singleGenreIds = await getGenreIds(prisma, singleData.genreNames);
      
      // Find featured artist IDs for this single
      const featuredArtistIds = singleData.featuredArtistNames
        .map((name) => artistProfilesMap.get(name))
        .filter((id): id is string => {
          if (!id)
            console.warn(
              colors.yellow(`⚠️ Could not find featured artist ID for "${name}" on single "${singleData.title}".`)
            );
          return !!id;
        });

      // Create the single track
      const track = await prisma.track.upsert({
        where: { title_artistId: { title: singleData.title, artistId } }, // Unique constraint
        update: {
          duration: singleData.duration,
          coverUrl: singleData.coverUrl,
          audioUrl: singleData.audioUrl,
          isActive: true,
          type: AlbumType.SINGLE,
          albumId: null, // Explicitly null for singles
          labelId: singleLabelId,
          playCount: singleData.playCount || 0, // Use the play count from the data
          genres: {
            deleteMany: {}, // Ensure genres are updated if track exists
            create: singleGenreIds.map((genreId) => ({ genreId })),
          },
        },
        create: {
          title: singleData.title,
          duration: singleData.duration,
          releaseDate: singleData.releaseDate || now,
          trackNumber: null, // Singles don't typically have track numbers
          coverUrl: singleData.coverUrl,
          audioUrl: singleData.audioUrl,
          playCount: singleData.playCount || 0, // Use the play count from the data
          type: AlbumType.SINGLE,
          isActive: true,
          artistId: artistId, // Main artist
          albumId: null, // No album link
          labelId: singleLabelId,
          createdAt: now,
          updatedAt: now,
          genres: { create: singleGenreIds.map((genreId) => ({ genreId })) },
        },
      });

      // Link featured artists if any
      if (featuredArtistIds.length > 0) {
        await prisma.trackArtist.createMany({
          data: featuredArtistIds.map((featArtistId) => ({
            trackId: track.id,
            artistId: featArtistId,
          })),
          skipDuplicates: true, // Avoid errors if feature link already exists
        });
      }
      
      singleBar.update(i + 1);
    }

    // Stop all progress bars when done
    multibar.stop();
    
    console.log(colors.green('\n🎉 Database seeding completed successfully!'));
  } catch (error) {
    console.error(colors.red('❌ Error during seeding:'), error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log(colors.cyan('🔌 Prisma client disconnected.'));
  }
}

main();
