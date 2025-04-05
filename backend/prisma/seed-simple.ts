import { PrismaClient, Role, AlbumType } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

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
    console.log('🔄 Starting database seeding with optimized structure...');
    const hashedPassword = await bcrypt.hash('123456', 10);
    const now = new Date();

    // === 1. Seed Genres ===
    console.log('🔄 Seeding genres...');
    await prisma.genre.createMany({
      data: genreNames.map((name) => ({ name })),
      skipDuplicates: true,
    });
    console.log('✅ Genres seeded successfully.');

    // === 2. Seed Labels ===
    console.log('🔄 Seeding labels...');
    for (const label of labelData) {
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
    }
    console.log('✅ Labels seeded successfully.');

    // === 3. Seed Admin Account ===
    console.log('🔄 Seeding admin account...');
    await prisma.user.upsert({
      where: { email: 'admin@soundwave.com' },
      update: { isActive: true, role: Role.ADMIN },
      create: {
        email: 'admin@soundwave.com',
        username: 'admin',
        password: hashedPassword,
        name: 'System Administrator',
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log('✅ Admin account seeded successfully.');

    // === 4. Seed Artists (from artists.ts) ===
    console.log('🔄 Seeding artists...');
    
    // Create a Map to store artistName -> artistId for easier lookup
    const artistProfilesMap = new Map<string, string>();

    // Seed all artists
    for (const artistData of artists) {
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
      console.log(`✅ Seeded Artist: ${artistData.profile.artistName}`);
    }

    // === 5. Seed Albums and Tracks (from albums.ts) ===
    console.log('🔄 Seeding albums and tracks...');

    for (const albumData of albums) {
      const artistId = artistProfilesMap.get(albumData.artistName);
      if (!artistId) {
        console.warn(
          `⚠️ Could not find artistId for ${albumData.artistName}. Skipping album "${albumData.title}".`
        );
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
      console.log(`✅ Seeded Album: ${album.title} by ${albumData.artistName}`);

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
          console.log(`  → Added ${trackFeaturedArtistIds.length} featured artists to track: ${track.title}`);
        }
      }
      console.log(`✅ Seeded ${totalTracks} Tracks for Album: ${album.title}`);
    }
    
    // === 6. Seed Standalone Singles (from tracks.ts) ===
    console.log('🔄 Seeding standalone singles...');
    for (const singleData of singles) {
      const artistId = artistProfilesMap.get(singleData.artistName);
      if (!artistId) {
        console.warn(
          `⚠️ Could not find artistId for ${singleData.artistName} while seeding single "${singleData.title}". Skipping.`
        );
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
              `⚠️ Could not find featured artist ID for "${name}" on single "${singleData.title}".`
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
      console.log(
        `✅ Seeded Single: "${track.title}" by ${singleData.artistName}`
      );

      // Link featured artists if any
      if (featuredArtistIds.length > 0) {
        await prisma.trackArtist.createMany({
          data: featuredArtistIds.map((featArtistId) => ({
            trackId: track.id,
            artistId: featArtistId,
          })),
          skipDuplicates: true, // Avoid errors if feature link already exists
        });
        console.log(
          `   -> Added features: ${singleData.featuredArtistNames.join(', ')}`
        );
      }
    }
    console.log('✅ Standalone singles seeded successfully.');

    console.log('🎉 Database seeding completed with modular data structure!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Prisma client disconnected.');
  }
}

main();
