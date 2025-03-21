import prisma from '../src/config/db';

async function createTestData() {
  try {
    console.log('Starting test data creation...');

    // Define our user IDs
    const userId1 = 'cm8ijxphz0000ubkglh6s1dnz';
    const userId2 = 'cm8ik7gem0000ub4giopryz1x';
    const userId3 = 'cm8iqtugo0011ubpg1f7s28av';
    const userId4 = 'cm8iqu08w001subpgatye666b';
    const userId5 = 'cm8iqu4uv002jubpgisy34bid';

    console.log('Retrieving artists and their tracks...');

    // Get tracks from various artists to create diverse listening patterns
    let [
      chilliesTracks,
      kendrickTracks,
      dragonTracks,
      sonTungTracks,
      theCureTracksOrNightwish,
    ] = await Promise.all([
      // User 1 favorites
      prisma.track.findMany({
        where: { artist: { artistName: 'Chillies' } },
        take: 6,
      }),
      // User 2 favorites
      prisma.track.findMany({
        where: { artist: { artistName: 'Kendrick Lamar' } },
        take: 6,
      }),
      // User 3 favorites
      prisma.track.findMany({
        where: { artist: { artistName: 'Playboi Carti' } },
        take: 6,
      }),
      // User 4 favorites
      prisma.track.findMany({
        where: { artist: { artistName: 'Sơn Tùng M-TP' } },
        take: 6,
      }),
      // User 5 favorites - for variety will try 2 different artists
      prisma.track.findMany({
        where: {
          OR: [
            { artist: { artistName: 'Nightwish' } },
            { artist: { artistName: 'The Cure' } },
          ],
        },
        take: 6,
      }),
    ]);

    // Make sure we found tracks for testing
    const allTracks = [
      ...chilliesTracks,
      ...kendrickTracks,
      ...dragonTracks,
      ...sonTungTracks,
      ...theCureTracksOrNightwish,
    ];

    if (allTracks.length < 10) {
      // Fallback to any available tracks if specified artists not found
      console.log(
        'Not enough artist-specific tracks found. Fetching general tracks...'
      );
      const generalTracks = await prisma.track.findMany({
        where: { isActive: true },
        take: 30,
      });

      if (generalTracks.length === 0) {
        throw new Error(
          'No tracks found in the database. Please seed the database first.'
        );
      }

      // Distribute tracks among different arrays for testing
      const trackChunks = [];
      const chunkSize = Math.ceil(generalTracks.length / 5);

      for (let i = 0; i < 5; i++) {
        trackChunks.push(
          generalTracks.slice(i * chunkSize, (i + 1) * chunkSize)
        );
      }

      [
        chilliesTracks,
        kendrickTracks,
        dragonTracks,
        sonTungTracks,
        theCureTracksOrNightwish,
      ] = trackChunks;
    }

    // Log what we found
    console.log('Found:');
    console.log(`- ${chilliesTracks.length} Chillies tracks`);
    console.log(`- ${kendrickTracks.length} Kendrick tracks`);
    console.log(`- ${dragonTracks.length} Playboi Carti tracks`);
    console.log(`- ${sonTungTracks.length} Sơn Tùng tracks`);
    console.log(
      `- ${theCureTracksOrNightwish.length} The Cure/Nightwish tracks`
    );

    console.log('\nCreating listening history for User 1 (Chillies fan)...');
    await createUserHistory({
      userId: userId1,
      primaryTracks: chilliesTracks,
      primaryPlayCount: { min: 8, max: 15 },
      primaryLikeProb: 0.8,
      secondaryTracks: kendrickTracks,
      secondaryPlayCount: { min: 1, max: 2 },
      secondaryLikeProb: 0.2,
    });

    console.log('\nCreating listening history for User 2 (Kendrick fan)...');
    await createUserHistory({
      userId: userId2,
      primaryTracks: kendrickTracks,
      primaryPlayCount: { min: 10, max: 18 },
      primaryLikeProb: 0.9,
      secondaryTracks: chilliesTracks,
      secondaryPlayCount: { min: 2, max: 4 },
      secondaryLikeProb: 0.3,
    });

    console.log(
      '\nCreating listening history for User 3 (Imagine Dragons fan)...'
    );
    await createUserHistory({
      userId: userId3,
      primaryTracks: dragonTracks,
      primaryPlayCount: { min: 7, max: 12 },
      primaryLikeProb: 0.7,
      secondaryTracks: sonTungTracks.slice(0, 2),
      secondaryPlayCount: { min: 1, max: 3 },
      secondaryLikeProb: 0.2,
    });

    console.log('\nCreating listening history for User 4 (Sơn Tùng fan)...');
    await createUserHistory({
      userId: userId4,
      primaryTracks: sonTungTracks,
      primaryPlayCount: { min: 9, max: 16 },
      primaryLikeProb: 0.85,
      secondaryTracks: dragonTracks.slice(0, 3),
      secondaryPlayCount: { min: 2, max: 4 },
      secondaryLikeProb: 0.3,
    });

    console.log(
      '\nCreating listening history for User 5 (The Cure/Nightwish fan)...'
    );
    await createUserHistory({
      userId: userId5,
      primaryTracks: theCureTracksOrNightwish,
      primaryPlayCount: { min: 6, max: 14 },
      primaryLikeProb: 0.75,
      secondaryTracks: [
        ...kendrickTracks.slice(0, 2),
        ...chilliesTracks.slice(0, 2),
      ],
      secondaryPlayCount: { min: 1, max: 2 },
      secondaryLikeProb: 0.25,
    });

    console.log('\nTest data creation complete!');
  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

// Helper function to create a user's listening history
async function createUserHistory(options: {
  userId: string;
  primaryTracks: any[];
  primaryPlayCount: { min: number; max: number };
  primaryLikeProb: number;
  secondaryTracks: any[];
  secondaryPlayCount: { min: number; max: number };
  secondaryLikeProb: number;
}) {
  const {
    userId,
    primaryTracks,
    primaryPlayCount,
    primaryLikeProb,
    secondaryTracks,
    secondaryPlayCount,
    secondaryLikeProb,
  } = options;

  // Create play history for primary tracks (the user's favorites)
  for (const track of primaryTracks) {
    // Random play count within the specified range
    const playCount = Math.floor(
      Math.random() * (primaryPlayCount.max - primaryPlayCount.min + 1) +
        primaryPlayCount.min
    );

    // High completion rate for favorite tracks
    const completionRate = 0.85 + Math.random() * 0.15; // 85% - 100%

    await prisma.history.upsert({
      where: {
        userId_trackId_type: {
          userId: userId,
          trackId: track.id,
          type: 'PLAY',
        },
      },
      update: {
        playCount,
        duration: Math.floor(track.duration * completionRate),
        completed: true,
      },
      create: {
        userId: userId,
        trackId: track.id,
        type: 'PLAY',
        playCount,
        duration: Math.floor(track.duration * completionRate),
        completed: true,
      },
    });

    // Like with higher probability for favorite tracks
    if (Math.random() < primaryLikeProb) {
      await prisma.userLikeTrack.upsert({
        where: {
          userId_trackId: {
            userId: userId,
            trackId: track.id,
          },
        },
        update: {},
        create: {
          userId: userId,
          trackId: track.id,
        },
      });
      console.log(`User ${userId} liked track: ${track.title}`);
    }
  }

  // Create play history for secondary tracks (tracks the user occasionally listens to)
  for (const track of secondaryTracks) {
    // Random play count within the specified range
    const playCount = Math.floor(
      Math.random() * (secondaryPlayCount.max - secondaryPlayCount.min + 1) +
        secondaryPlayCount.min
    );

    // Lower completion rate for secondary tracks
    const completionRate = 0.6 + Math.random() * 0.25; // 60% - 85%

    // 50-50 chance of marking as completed
    const completed = Math.random() > 0.5;

    await prisma.history.upsert({
      where: {
        userId_trackId_type: {
          userId: userId,
          trackId: track.id,
          type: 'PLAY',
        },
      },
      update: {
        playCount,
        duration: Math.floor(track.duration * completionRate),
        completed,
      },
      create: {
        userId: userId,
        trackId: track.id,
        type: 'PLAY',
        playCount,
        duration: Math.floor(track.duration * completionRate),
        completed,
      },
    });

    // Like with lower probability for secondary tracks
    if (Math.random() < secondaryLikeProb) {
      await prisma.userLikeTrack.upsert({
        where: {
          userId_trackId: {
            userId: userId,
            trackId: track.id,
          },
        },
        update: {},
        create: {
          userId: userId,
          trackId: track.id,
        },
      });
      console.log(`User ${userId} liked track: ${track.title}`);
    }
  }
}

createTestData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error creating test data:', error);
    process.exit(1);
  });
