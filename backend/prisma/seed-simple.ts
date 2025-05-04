import { PrismaClient, Role, AlbumType, FollowingType, HistoryType } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import * as cliProgress from 'cli-progress';
import colors from 'colors';
import { faker } from '@faker-js/faker';
import * as mm from 'music-metadata'; // Namespace import
import fetch from 'node-fetch'; // Import node-fetch for manual stream fetching

// Import data from our modular structure
import { artists } from './data/artists';
import { albums } from './data/albums';
import { singles } from './data/tracks'; // Import singles
import { genreNames, labelData, getGenreIds, getLabelId } from './data/utils';

dotenv.config();

const prisma = new PrismaClient();

// --- Define the target date range ---
const startDate = new Date('2024-12-31T00:00:00.000Z');
const endDate = new Date('2025-05-04T23:59:59.999Z');
// ------------------------------------

// Helper function to get audio duration from URL using music-metadata via parseBuffer
async function getAudioDurationFromUrl(audioUrl: string): Promise<number> {
  if (!audioUrl) {
    console.warn(colors.yellow(`⚠️ Audio URL is missing. Returning 0.`));
    return 0;
  }
  try {
    // Fetch the entire audio file into a buffer
    const response = await fetch(audioUrl, { timeout: 30000 }); // Increase timeout for full download (30s)

    if (!response.ok) {
        console.warn(colors.yellow(`⚠️ HTTP error fetching ${audioUrl}: ${response.status} ${response.statusText}. Returning 0.`));
        return 0;
    }

    const buffer = await response.buffer(); // Get response as Buffer

    // Get content type from headers if available
    const contentType = response.headers.get('content-type') || undefined;

    // Use parseBuffer with the fetched buffer
    const metadata = await mm.parseBuffer(buffer, { mimeType: contentType }, { duration: true });

    if (metadata.format.duration) {
      return Math.round(metadata.format.duration); // Round to nearest integer
    }
    console.warn(colors.yellow(`⚠️ Could not read duration from metadata for: ${audioUrl}. Returning 0.`));
    return 0;
  } catch (error: any) {
    // Log more specific errors
    let errorMessage = error.message || String(error);
    if (error.type === 'request-timeout' || error.code === 'ETIMEDOUT' || errorMessage.includes('timeout')) {
        errorMessage = 'Timeout during fetch or parsing';
    } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        errorMessage = 'Network error or host not found';
    } else if (errorMessage.includes('Parse error')) {
        errorMessage = 'Could not parse audio metadata';
    } else if (errorMessage.includes('HTTP error')) {
        // Already handled above, but catch potential re-throws
    } else {
        errorMessage = `Unexpected error: ${errorMessage}`;
    }
    console.warn(colors.yellow(`⚠️ Error processing duration for ${audioUrl}: ${errorMessage}. Returning 0.`));
    return 0;
  }
}

async function main() {
  try {
    console.log(colors.cyan('🔄 Starting database seeding within specified date range...'));
    const hashedPassword = await bcrypt.hash('123456', 10);

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
    const adminBar = multibar.create(1, 0, { task: 'Seeding admin account' });
    await prisma.user.upsert({
      where: { email: 'admin@soundwave.com' },
      update: { isActive: true, role: Role.ADMIN },
      create: {
        email: 'admin@soundwave.com',
        username: 'admin',
        password: hashedPassword,
        name: 'Administrator',
        role: Role.ADMIN,
        isActive: true,
        createdAt: startDate, // Admin created at the start date
        updatedAt: startDate,
      },
    });
    adminBar.update(1);

    // === 4. Seed Artists (from artists.ts) ===
    const artistBar = multibar.create(artists.length, 0, { task: 'Seeding verified artists' });
    
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
          updatedAt: faker.date.between({ from: startDate, to: endDate }), // Update time within range
        },
        create: {
          ...artistData.user,
          avatar: artistData.profile.avatar,
          password: hashedPassword,
          isActive: true,
          role: Role.USER, // Initially USER, profile upsert will handle ARTIST role
          createdAt: faker.date.between({ from: startDate, to: endDate }), // Created within range
          updatedAt: faker.date.between({ from: startDate, to: endDate }), // Updated within range
        },
      });

      const createdDate = faker.date.between({ from: startDate, to: endDate }); // Use consistent date for profile
      const artistProfile = await prisma.artistProfile.upsert({
        where: { userId: user.id },
        update: {
          ...artistData.profile,
          isVerified: true,
          isActive: true,
          verifiedAt: createdDate, // Verified on the same day it was created/updated within range
          updatedAt: createdDate,
        },
        create: {
          ...artistData.profile,
          userId: user.id,
          role: Role.ARTIST,
          isVerified: true,
          isActive: true,
          verifiedAt: createdDate,
          createdAt: createdDate,
          updatedAt: createdDate,
        },
      });

      artistProfilesMap.set(artistProfile.artistName, artistProfile.id);
      artistBar.update(i + 1);
    }

    // === 4.1 Seed User Accounts Requesting Artist Role ===
    const requestUserCount = 20;
    const requestBar = multibar.create(requestUserCount, 0, { task: 'Seeding artist requests'});
    for (let i = 0; i < requestUserCount; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const username = faker.internet.username({ firstName, lastName }).toLowerCase() + `_${faker.string.alphanumeric(3)}`;
      const email = `${username}@soundwave-request.com`;
      const artistName = faker.music.genre() + ' ' + faker.word.adjective() + ' ' + faker.person.firstName(); // Generate a unique artist name
      const userCreatedAt = faker.date.between({ from: startDate, to: endDate });

      // Create the user account
      const requestingUser = await prisma.user.upsert({
          where: { email },
          update: {}, // No update needed if exists
          create: {
              email: email,
              username: username,
              password: hashedPassword,
              name: `${firstName} ${lastName}`,
              role: Role.USER,
              isActive: true,
              createdAt: userCreatedAt,
              updatedAt: userCreatedAt,
              avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}&backgroundColor=transparent`,
          },
      });

      const requestDate = faker.date.between({ from: userCreatedAt, to: endDate }); // Request date after user creation
      // Create the corresponding ArtistProfile representing the request
      await prisma.artistProfile.upsert({
          where: { userId: requestingUser.id },
          update: {}, // No update needed if somehow exists
          create: {
              userId: requestingUser.id,
              artistName: artistName,
              bio: faker.lorem.paragraph(),
              // Use DiceBear for the requested artist avatar as well
              avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${artistName.replace(/\s+/g, '_')}&backgroundColor=transparent`,
              socialMediaLinks: {
                  facebook: `https://facebook.com/${username}`,
                  instagram: `https://instagram.com/${username}`,
              },
              role: Role.ARTIST, // The profile *type* is ARTIST
              isVerified: false, // Not verified yet
              isActive: true, // Schema default, admin decides on approval
              verificationRequestedAt: requestDate, // Simulate request time within range
              requestedLabelName: faker.helpers.arrayElement([null, faker.company.name() + ' Records']), // Add requested label name (can be null)
              createdAt: requestDate, // Profile created when request is made
              updatedAt: requestDate,
          },
      });
      requestBar.increment();
    }

    // === 4.2 Seed Regular User Accounts ===
    const regularUserCount = 30;
    const userBar = multibar.create(regularUserCount, 0, { task: 'Seeding regular users' });
    const regularUserIds: string[] = [];

    for (let i = 0; i < regularUserCount; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      // Ensure unique usernames/emails, even with Faker
      const username = `${faker.internet.username({ firstName, lastName }).toLowerCase()}_${faker.string.alphanumeric(4)}`;
      const email = `${username}@soundwave-user.com`; // Use a different domain
      const userCreatedDate = faker.date.between({ from: startDate, to: endDate });

      const user = await prisma.user.upsert({
        where: { email },
        update: {}, // No update needed if somehow exists
        create: {
          email: email,
          username: username,
          password: hashedPassword,
          name: `${firstName} ${lastName}`,
          role: Role.USER,
          isActive: true,
          createdAt: userCreatedDate, // Users created within the specified range
          updatedAt: userCreatedDate,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`, // Use a different avatar style
        },
      });
      regularUserIds.push(user.id);
      userBar.increment();
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
      const albumReleaseDate = faker.date.between({ from: startDate, to: endDate }); // Release date within range

      // Fetch durations for all tracks in the album first
      const trackDurations = await Promise.all(
          albumData.tracks.map(trackData => getAudioDurationFromUrl(trackData.audioUrl))
      );

      // Calculate total album duration based on fetched durations
      const albumDuration = trackDurations.reduce((sum, duration) => sum + duration, 0);

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
          updatedAt: faker.date.between({ from: albumReleaseDate, to: endDate }), // Updated after release
        },
        create: {
          title: albumData.title,
          coverUrl: albumData.coverUrl,
          releaseDate: albumReleaseDate,
          duration: albumDuration,
          totalTracks: totalTracks,
          type: albumData.type,
          isActive: true,
          artistId: artistId,
          labelId: albumLabelId,
          createdAt: albumReleaseDate, // Created on release date
          updatedAt: albumReleaseDate,
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
      for (let trackIndex = 0; trackIndex < albumData.tracks.length; trackIndex++) {
        const trackData = albumData.tracks[trackIndex];
        const fetchedDuration = trackDurations[trackIndex]; // Get the pre-fetched duration
        const trackCreatedDate = faker.date.between({ from: album.releaseDate, to: endDate }); // Track created after album release

        const track = await prisma.track.upsert({
          where: { title_artistId: { title: trackData.title, artistId } },
          update: {
            audioUrl: trackData.audioUrl,
            trackNumber: trackData.trackNumber,
            coverUrl: trackData.coverUrl || album.coverUrl, // Use track cover if available, otherwise album cover
            duration: fetchedDuration, // Use fetched duration
            isActive: true,
            type: album.type,
            labelId: null, // Explicitly null for tracks within albums
            genres: {
              deleteMany: {},
              create: albumGenreIds.map((genreId) => ({ genreId })), // Inherit genres from album
            },
            updatedAt: faker.date.between({ from: trackCreatedDate, to: endDate }), // Updated after creation
          },
          create: {
            title: trackData.title,
            duration: fetchedDuration, // Use fetched duration
            releaseDate: album.releaseDate, // Use album's release date
            trackNumber: trackData.trackNumber,
            coverUrl: trackData.coverUrl || album.coverUrl,
            audioUrl: trackData.audioUrl,
            playCount: 0,
            type: album.type,
            isActive: true,
            artistId: artistId, // Main artist
            albumId: album.id, // Link to the album
            labelId: null, // Explicitly null for tracks within albums
            createdAt: trackCreatedDate, // Created after album release
            updatedAt: trackCreatedDate,
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
      const singleReleaseDate = faker.date.between({ from: startDate, to: endDate }); // Release date within range

      // Find featured artist IDs for this single
      const featuredArtistIds = singleData.featuredArtistNames
        .map((name) => ({ name, id: artistProfilesMap.get(name) }))
        .filter((item): item is { name: string, id: string } => {
          if (!item.id)
            console.warn(
              colors.yellow(`⚠️ Could not find featured artist ID for "${item.name}" on single "${singleData.title}".`)
            );
          return !!item.id;
        })
        .map(item => item.id);

      // Fetch single duration
      const singleDuration = await getAudioDurationFromUrl(singleData.audioUrl);

      // Create the single track
      const track = await prisma.track.upsert({
        where: { title_artistId: { title: singleData.title, artistId } }, // Unique constraint
        update: {
          duration: singleDuration, // Use fetched duration
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
          updatedAt: faker.date.between({ from: singleReleaseDate, to: endDate }), // Updated after release
        },
        create: {
          title: singleData.title,
          duration: singleDuration, // Use fetched duration
          releaseDate: singleReleaseDate,
          trackNumber: null, // Singles don't typically have track numbers
          coverUrl: singleData.coverUrl,
          audioUrl: singleData.audioUrl,
          playCount: singleData.playCount || 0, // Use the play count from the data
          type: AlbumType.SINGLE,
          isActive: true,
          artistId: artistId, // Main artist
          albumId: null, // No album link
          labelId: singleLabelId,
          createdAt: singleReleaseDate, // Created on release date
          updatedAt: singleReleaseDate,
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

    // === 7. Seed User Follows ===
    const followBar = multibar.create(regularUserIds.length * 3, 0, { task: 'Seeding user follows' }); // Estimate: users follow ~3 artists/users
    const artistProfileIds = Array.from(artistProfilesMap.values());

    for (const userId of regularUserIds) {
      // Follow 2-5 verified artists randomly
      const artistsToFollowCount = faker.number.int({ min: 2, max: 5 });
      const artistsToFollow = faker.helpers.arrayElements(artistProfileIds, artistsToFollowCount);
      for (const artistId of artistsToFollow) {
        await prisma.userFollow.upsert({
          where: { followerId_followingArtistId_followingType: { followerId: userId, followingArtistId: artistId, followingType: FollowingType.ARTIST } },
          update: {}, // No update needed
          create: {
            followerId: userId,
            followingArtistId: artistId,
            followingType: FollowingType.ARTIST,
            createdAt: faker.date.between({ from: startDate, to: endDate }), // Followed within the range
          },
        });
        followBar.increment();
      }

      // Follow 0-2 other regular users randomly (excluding self)
      const usersToFollowCount = faker.number.int({ min: 0, max: 2 });
      const otherUserIds = regularUserIds.filter(id => id !== userId);
      if (otherUserIds.length > 0) {
          const usersToFollow = faker.helpers.arrayElements(otherUserIds, Math.min(usersToFollowCount, otherUserIds.length));
          for (const followingUserId of usersToFollow) {
            await prisma.userFollow.upsert({
              where: { followerId_followingUserId_followingType: { followerId: userId, followingUserId: followingUserId, followingType: FollowingType.USER } },
              update: {}, // No update needed
              create: {
                followerId: userId,
                followingUserId: followingUserId,
                followingType: FollowingType.USER,
                createdAt: faker.date.between({ from: startDate, to: endDate }), // Followed within the range
              },
            });
            followBar.increment();
          }
      }
    }

    // === 8. Seed User Likes ===
    const likeBar = multibar.create(regularUserIds.length * 15, 0, { task: 'Seeding track likes' }); // Estimate: users like ~15 tracks
    const allTrackIds = await prisma.track.findMany({ where: { isActive: true }, select: { id: true } });
    const trackIdArray = allTrackIds.map(t => t.id);

    if (trackIdArray.length > 0) {
      for (const userId of regularUserIds) {
        const tracksToLikeCount = faker.number.int({ min: 5, max: 25 }); // Users like 5-25 tracks
        const tracksToLike = faker.helpers.arrayElements(trackIdArray, Math.min(tracksToLikeCount, trackIdArray.length));

        for (const trackId of tracksToLike) {
          await prisma.userLikeTrack.upsert({
            where: { userId_trackId: { userId, trackId } },
            update: {}, // No update needed
            create: {
              userId,
              trackId,
              createdAt: faker.date.between({ from: startDate, to: endDate }), // Liked within the range
            },
          });
          likeBar.increment();
        }
      }
    }

    // === 9. Seed User Playlists & Playlist Tracks ===
    const playlistBar = multibar.create(regularUserIds.length * 2, 0, { task: 'Seeding user playlists' }); // Estimate: ~2 playlists per user
    const playlistTrackBar = multibar.create(regularUserIds.length * 10, 0, { task: 'Seeding playlist tracks' }); // Estimate: ~10 tracks per playlist

    for (const userId of regularUserIds) {
      const numPlaylists = faker.number.int({ min: 1, max: 3 }); // Each user gets 1-3 playlists
      for (let p = 0; p < numPlaylists; p++) {
        const playlistCreatedDate = faker.date.between({ from: startDate, to: endDate });
        const playlist = await prisma.playlist.create({
          data: {
            userId,
            name: faker.music.songName() + " Mix", // Playlist name like "Groovy Drive Mix"
            description: faker.lorem.sentence(),
            privacy: faker.helpers.arrayElement(['PUBLIC', 'PRIVATE']),
            type: 'NORMAL',
            createdAt: playlistCreatedDate, // Playlist created within range
            updatedAt: playlistCreatedDate,
            coverUrl: `https://picsum.photos/seed/${faker.string.uuid()}/300/300` // Random placeholder image
          }
        });
        playlistBar.increment();

        // Add tracks to this playlist
        const tracksToAddCount = faker.number.int({ min: 5, max: 20 });
        const tracksToAdd = faker.helpers.arrayElements(trackIdArray, Math.min(tracksToAddCount, trackIdArray.length));
        let trackOrder = 1;
        let playlistDuration = 0;
        for (const trackId of tracksToAdd) {
          const track = await prisma.track.findUnique({ where: { id: trackId }, select: { duration: true } });
          if (track) {
            await prisma.playlistTrack.create({
              data: {
                playlistId: playlist.id,
                trackId,
                trackOrder: trackOrder++,
                addedAt: faker.date.between({ from: playlist.createdAt, to: endDate }) // Added after playlist creation, within range
              }
            });
            playlistDuration += track.duration || 0;
            playlistTrackBar.increment();
          }
        }
        // Update playlist counts
        await prisma.playlist.update({
          where: { id: playlist.id },
          data: { totalTracks: tracksToAdd.length, totalDuration: playlistDuration }
        });
      }
    }

    // === 10. Seed Play History for Trends ===
    const historyBar = multibar.create(regularUserIds.length * 30, 0, { task: 'Seeding play history' }); // Estimate: ~30 plays per user
    const historyEndDate = new Date();
    const historyStartDate = new Date();
    historyStartDate.setFullYear(historyStartDate.getFullYear() - 5); // History spanning 5 years

    // Get IDs of tracks from specific artists for focused seeding
    const vuArtistId = artistProfilesMap.get('Vũ.');
    const mtpArtistId = artistProfilesMap.get('Sơn Tùng M-TP');
    const ameeArtistId = artistProfilesMap.get('AMEE');
    const wrenArtistId = artistProfilesMap.get('Wren Evans');

    const focusedArtistIds = [vuArtistId, mtpArtistId, ameeArtistId, wrenArtistId].filter(id => !!id) as string[];
    const focusedTrackIds = await prisma.track.findMany({
        where: { artistId: { in: focusedArtistIds }, isActive: true },
        select: { id: true, duration: true }
    });
    const otherTrackIds = trackIdArray.filter(id => !focusedTrackIds.some(ft => ft.id === id));

    for (const userId of regularUserIds) {
        const totalPlays = faker.number.int({ min: 10, max: 50 }); // Each user has 10-50 total plays recorded
        let focusedPlays = 0;
        if (focusedTrackIds.length > 0) {
            focusedPlays = Math.floor(totalPlays * faker.number.float({ min: 0.4, max: 0.8 })); // 40-80% plays are focused
        }
        const otherPlays = totalPlays - focusedPlays;

        // Seed focused plays
        for (let i = 0; i < focusedPlays; i++) {
            const track = faker.helpers.arrayElement(focusedTrackIds);
            await prisma.history.create({
                data: {
                    userId,
                    trackId: track.id,
                    type: HistoryType.PLAY,
                    playCount: 1,
                    completed: true,
                    duration: track.duration,
                    createdAt: faker.date.between({ from: startDate, to: endDate }) // History within the specified range
                }
            });
            historyBar.increment();
        }

        // Seed other plays
         if (otherTrackIds.length > 0) {
             for (let i = 0; i < otherPlays; i++) {
                 const trackId = faker.helpers.arrayElement(otherTrackIds);
                 // Fetch duration for other tracks if needed (or assume an average)
                 const track = await prisma.track.findUnique({ where: {id: trackId}, select: { duration: true } });
                 await prisma.history.create({
                     data: {
                         userId,
                         trackId: trackId,
                         type: HistoryType.PLAY,
                         playCount: 1,
                         completed: true,
                         duration: track?.duration || 180, // Default to 180s if not found
                         createdAt: faker.date.between({ from: startDate, to: endDate }) // History within the specified range
                     }
                 });
                 historyBar.increment();
             }
         }
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
