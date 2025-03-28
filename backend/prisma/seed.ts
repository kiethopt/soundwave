import {
  PrismaClient,
  Role,
  AlbumType,
  User,
  Track,
  Genre,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

dotenv.config();

const prisma = new PrismaClient();

// Helper function to get random genres
async function getRandomGenres(count: number): Promise<Genre[]> {
  const allGenres = await prisma.genre.findMany();
  if (allGenres.length === 0) return [];
  // Đảm bảo không lấy nhiều hơn số lượng genre có sẵn
  const numToTake = Math.min(count, allGenres.length);
  // Trộn mảng và lấy số lượng cần thiết
  const shuffled = allGenres.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numToTake);
}

async function main() {
  try {
    // === 1. Seed Genres ===
    const genreNames = [
      'Pop',
      'Rock',
      'Hip-Hop',
      'R&B',
      'Electronic',
      'Jazz',
      'Classical',
      'Country',
      'Folk',
      'Soul',
      'Blues',
      'Indie',
      'Alternative',
      'Latin',
      'K-Pop',
      'V-Pop',
      'Rap',
    ];

    console.log('🔄 Seeding genres...');
    const seededGenres: { [key: string]: Genre } = {};
    for (const name of genreNames) {
      const genre = await prisma.genre.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      seededGenres[name] = genre; // Lưu trữ genre đã seed để dễ truy cập
    }
    console.log('✅ Genres seeded/ensured.');

    // Lấy ID các genre cụ thể (Đảm bảo chúng tồn tại)
    const indieGenre = seededGenres['Indie'];
    const popGenre = seededGenres['Pop'];
    const alternativeGenre = seededGenres['Alternative'];
    const hiphopGenre = seededGenres['Hip-Hop'];
    const rnbGenre = seededGenres['R&B'];
    const countryGenre = seededGenres['Country'];
    const rapGenre = seededGenres['Rap'];
    const vpopGenre = seededGenres['V-Pop'];
    const classicalGenre = seededGenres['Classical']; // Thêm classical

    // === 2. Seed Admin ===
    console.log('🔄 Seeding admin user...');
    const hashedAdminPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'admin123@', // Lấy từ env hoặc dùng default
      10
    );
    await prisma.user.upsert({
      where: { email: 'admin@soundwave.com' },
      update: {
        // Có thể cập nhật nếu cần, ví dụ: đảm bảo isActive
        isActive: true,
        role: Role.ADMIN,
      },
      create: {
        email: 'admin@soundwave.com',
        username: 'admin',
        password: hashedAdminPassword,
        name: 'Admin User',
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log('✅ Admin user seeded/ensured.');

    // === 3. Seed Existing Verified Artists (Using upsert) ===
    console.log(
      '🔄 Seeding verified artists (Chillies, Carti, Kendrick, Taylor, Weeknd)...'
    );

    // --- Artist: Chillies ---
    const chilliesPassword = await bcrypt.hash('Chillies123!', 10);
    const chilliesUser = await prisma.user.upsert({
      where: { email: 'chillies@example.com' },
      update: { role: Role.ARTIST, currentProfile: 'ARTIST', isActive: true },
      create: {
        email: 'chillies@example.com',
        username: 'chillies',
        password: chilliesPassword,
        name: 'Chillies',
        avatar:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742539893/testAlbum/Qua%20Khung%20C%E1%BB%ADa%20S%E1%BB%95/f6pdrcj6i2rjg68afsci.jpg',
        role: Role.ARTIST,
        currentProfile: 'ARTIST',
        isActive: true,
      },
    });
    const chillies = await prisma.artistProfile.upsert({
      where: { userId: chilliesUser.id },
      update: { isVerified: true, isActive: true, role: Role.ARTIST },
      create: {
        artistName: 'Chillies',
        bio: 'Indie/Alternative band from Vietnam.',
        avatar: chilliesUser.avatar,
        socialMediaLinks: {
          instagram: 'https://instagram.com/chillies.band', // Nên để full URL nếu FE cần
          facebook: 'https://facebook.com/chilliesband', // Nên để full URL
        },
        isVerified: true,
        isActive: true,
        verifiedAt: new Date(),
        userId: chilliesUser.id,
        role: Role.ARTIST,
      },
    });
    // Add genres using upsert
    const chilliesGenres = [
      indieGenre,
      popGenre,
      vpopGenre,
      alternativeGenre,
    ].filter((g) => g); // Lọc bỏ undefined
    for (const genre of chilliesGenres) {
      await prisma.artistGenre.upsert({
        where: {
          artistId_genreId: { artistId: chillies.id, genreId: genre.id },
        },
        update: {},
        create: { artistId: chillies.id, genreId: genre.id },
      });
    }
    console.log('  -> Chillies artist seeded/ensured.');

    // --- Artist: Playboi Carti ---
    const cartiPassword = await bcrypt.hash('Carti123!', 10);
    const cartiUser = await prisma.user.upsert({
      where: { email: 'playboicarti@example.com' },
      update: { role: Role.ARTIST, currentProfile: 'ARTIST', isActive: true },
      create: {
        email: 'playboicarti@example.com',
        username: 'playboicarti',
        password: cartiPassword,
        name: 'Playboi Carti',
        avatar:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742540118/testAlbum/MUSIC/h7ocs5fd3byinvj4prpm.jpg',
        role: Role.ARTIST,
        currentProfile: 'ARTIST',
        isActive: true,
      },
    });
    const playboi = await prisma.artistProfile.upsert({
      where: { userId: cartiUser.id },
      update: { isVerified: true, isActive: true, role: Role.ARTIST },
      create: {
        artistName: 'Playboi Carti',
        bio: 'American rapper, singer, and songwriter.',
        avatar: cartiUser.avatar,
        socialMediaLinks: {
          instagram: 'https://instagram.com/playboicarti',
          facebook: 'https://facebook.com/playboicarti',
        },
        isVerified: true,
        isActive: true,
        verifiedAt: new Date(),
        userId: cartiUser.id,
        role: Role.ARTIST,
      },
    });
    const cartiGenres = [hiphopGenre, rapGenre].filter((g) => g);
    for (const genre of cartiGenres) {
      await prisma.artistGenre.upsert({
        where: {
          artistId_genreId: { artistId: playboi.id, genreId: genre.id },
        },
        update: {},
        create: { artistId: playboi.id, genreId: genre.id },
      });
    }
    console.log('  -> Playboi Carti artist seeded/ensured.');

    // --- Artist: Kendrick Lamar ---
    const kendrickPassword = await bcrypt.hash('Kendrick123!', 10);
    const kendrickUser = await prisma.user.upsert({
      where: { email: 'kendricklamar@example.com' },
      update: { role: Role.ARTIST, currentProfile: 'ARTIST', isActive: true },
      create: {
        email: 'kendricklamar@example.com',
        username: 'kendricklamar',
        password: kendrickPassword,
        name: 'Kendrick Lamar',
        avatar:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742540304/testAlbum/GNX/zgqgjfvh6gxs90pwwj1x.jpg',
        role: Role.ARTIST,
        currentProfile: 'ARTIST',
        isActive: true,
      },
    });
    const kendrick = await prisma.artistProfile.upsert({
      where: { userId: kendrickUser.id },
      update: { isVerified: true, isActive: true, role: Role.ARTIST },
      create: {
        artistName: 'Kendrick Lamar',
        bio: 'American rapper, songwriter, and record producer.',
        avatar: kendrickUser.avatar,
        socialMediaLinks: {
          instagram: 'https://instagram.com/kendricklamar',
          facebook: 'https://facebook.com/kendricklamar',
        },
        isVerified: true,
        isActive: true,
        verifiedAt: new Date(),
        userId: kendrickUser.id,
        role: Role.ARTIST,
      },
    });
    const kendrickGenres = [hiphopGenre, rapGenre, rnbGenre].filter((g) => g);
    for (const genre of kendrickGenres) {
      await prisma.artistGenre.upsert({
        where: {
          artistId_genreId: { artistId: kendrick.id, genreId: genre.id },
        },
        update: {},
        create: { artistId: kendrick.id, genreId: genre.id },
      });
    }
    console.log('  -> Kendrick Lamar artist seeded/ensured.');

    // --- Artist: Taylor Swift ---
    const taylorPassword = await bcrypt.hash('TaylorS123!', 10);
    const taylorUser = await prisma.user.upsert({
      where: { email: 'taylorswift@example.com' },
      update: { role: Role.ARTIST, currentProfile: 'ARTIST', isActive: true },
      create: {
        email: 'taylorswift@example.com',
        username: 'taylorswift',
        password: taylorPassword,
        name: 'Taylor Swift',
        avatar: faker.image.avatarLegacy(), // Use faker for avatar
        role: Role.ARTIST,
        currentProfile: 'ARTIST',
        isActive: true,
      },
    });
    const taylor = await prisma.artistProfile.upsert({
      where: { userId: taylorUser.id },
      update: {
        isVerified: true,
        isActive: true,
        role: Role.ARTIST,
        avatar: taylorUser.avatar,
      },
      create: {
        artistName: 'Taylor Swift',
        bio: 'Global pop and country superstar.',
        avatar: taylorUser.avatar,
        socialMediaLinks: {
          instagram: 'https://instagram.com/taylorswift',
          facebook: 'https://facebook.com/TaylorSwift',
          website: 'https://taylorswift.com', // Website là tùy chọn
        },
        isVerified: true,
        isActive: true,
        verifiedAt: new Date(),
        userId: taylorUser.id,
        role: Role.ARTIST,
      },
    });
    const taylorGenres = [popGenre, countryGenre].filter((g) => g);
    for (const genre of taylorGenres) {
      await prisma.artistGenre.upsert({
        where: {
          artistId_genreId: { artistId: taylor.id, genreId: genre.id },
        },
        update: {},
        create: { artistId: taylor.id, genreId: genre.id },
      });
    }
    console.log('  -> Taylor Swift artist seeded/ensured.');

    // --- Artist: The Weeknd ---
    const weekndPassword = await bcrypt.hash('Weeknd123!', 10);
    const weekndUser = await prisma.user.upsert({
      where: { email: 'theweeknd@example.com' },
      update: { role: Role.ARTIST, currentProfile: 'ARTIST', isActive: true },
      create: {
        email: 'theweeknd@example.com',
        username: 'theweeknd',
        password: weekndPassword,
        name: 'The Weeknd',
        avatar: faker.image.avatar(),
        role: Role.ARTIST,
        currentProfile: 'ARTIST',
        isActive: true,
      },
    });
    const weeknd = await prisma.artistProfile.upsert({
      where: { userId: weekndUser.id },
      update: {
        isVerified: true,
        isActive: true,
        role: Role.ARTIST,
        avatar: weekndUser.avatar,
      },
      create: {
        artistName: 'The Weeknd',
        bio: 'Canadian singer, songwriter, and record producer.',
        avatar: weekndUser.avatar,
        socialMediaLinks: {
          instagram: 'https://instagram.com/theweeknd',
          facebook: 'https://facebook.com/theweeknd',
        },
        isVerified: true,
        isActive: true,
        verifiedAt: new Date(),
        userId: weekndUser.id,
        role: Role.ARTIST,
      },
    });
    const weekndGenres = [popGenre, rnbGenre].filter((g) => g);
    for (const genre of weekndGenres) {
      await prisma.artistGenre.upsert({
        where: {
          artistId_genreId: { artistId: weeknd.id, genreId: genre.id },
        },
        update: {},
        create: { artistId: weeknd.id, genreId: genre.id },
      });
    }
    console.log('  -> The Weeknd artist seeded/ensured.');
    console.log('✅ Verified artists seeded/ensured.');

    // === 4. Seed Normal Users ===
    console.log('🔄 Seeding normal users...');
    const users: User[] = [];
    const totalUsersToSeed = 45; // Giữ nguyên số lượng user
    const defaultPassword = await bcrypt.hash('User123!', 10);

    for (let i = 1; i <= totalUsersToSeed; i++) {
      const email = `user${i}@example.com`;
      const username = `user_${faker.internet
        .userName()
        .toLowerCase()
        .replace(/[\W_]+/g, '')}${i}`;

      const user = await prisma.user.upsert({
        where: { email: email },
        update: {
          role: Role.USER,
          isActive: true,
          currentProfile: 'USER',
        },
        create: {
          email: email,
          username: username,
          password: defaultPassword,
          name: `User ${faker.person.firstName()}`,
          avatar: faker.image.avatar(),
          role: Role.USER,
          isActive: true,
          currentProfile: 'USER',
        },
      });
      users.push(user);
    }
    console.log(`✅ Total normal users seeded/ensured: ${users.length}`);

    // === 5. Seed Albums and Tracks for Verified Artists ===
    console.log('🔄 Seeding albums and tracks for verified artists...');
    const allSeededTracks: Track[] = [];

    // --- Chillies Album & Tracks ---
    const chilliesAlbum = await prisma.album.upsert({
      where: {
        title_artistId: { title: 'Qua Khung Cửa Sổ', artistId: chillies.id },
      },
      update: {},
      create: {
        title: 'Qua Khung Cửa Sổ',
        coverUrl: chillies.avatar, // Use artist avatar as cover
        releaseDate: new Date('2021-05-15'),
        type: AlbumType.ALBUM,
        isActive: true,
        artistId: chillies.id,
      },
    });
    // Add album genres
    for (const genre of chilliesGenres) {
      await prisma.albumGenre.upsert({
        where: {
          albumId_genreId: { albumId: chilliesAlbum.id, genreId: genre.id },
        },
        update: {},
        create: { albumId: chilliesAlbum.id, genreId: genre.id },
      });
    }
    const chilliesTracksData = [
      {
        title: 'Vùng Ký Ức',
        duration: 254,
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742539938/testAlbum/Qua%20Khung%20C%E1%BB%ADa%20S%E1%BB%95/xfl4mrclnw3ft833eo2i.mp3',
        trackNumber: 1,
      },
      {
        title: 'Mộng Du',
        duration: 228,
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742539929/testAlbum/Qua%20Khung%20C%E1%BB%ADa%20S%E1%BB%95/wpvbccdtkfnrdxyys5go.mp3',
        trackNumber: 2,
      },
      {
        title: 'Qua Khung Cửa Sổ',
        duration: 241,
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742539938/testAlbum/Qua%20Khung%20C%E1%BB%ADa%20S%E1%BB%95/tqhzgu72gwiogxl8thsp.mp3',
        trackNumber: 3,
      },
      {
        title: 'Một Cái Tên',
        duration: 232,
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742539932/testAlbum/Qua%20Khung%20C%E1%BB%ADa%20S%E1%BB%95/jgacx8ts8tnkkjawclrl.mp3',
        trackNumber: 4,
      },
    ];
    for (const trackData of chilliesTracksData) {
      const track = await prisma.track.upsert({
        where: {
          title_artistId: { title: trackData.title, artistId: chillies.id },
        },
        update: {},
        create: {
          title: trackData.title,
          duration: trackData.duration,
          releaseDate: chilliesAlbum.releaseDate,
          trackNumber: trackData.trackNumber,
          coverUrl: chilliesAlbum.coverUrl,
          audioUrl: trackData.audioUrl,
          playCount: faker.number.int({ min: 100, max: 5000 }),
          type: AlbumType.ALBUM,
          isActive: true,
          artistId: chillies.id,
          albumId: chilliesAlbum.id,
        },
      });
      allSeededTracks.push(track);
      // Add track genres
      for (const genre of chilliesGenres) {
        await prisma.trackGenre.upsert({
          where: {
            trackId_genreId: { trackId: track.id, genreId: genre.id },
          },
          update: {},
          create: { trackId: track.id, genreId: genre.id },
        });
      }
    }
    console.log('  -> Chillies album & tracks seeded/ensured.');

    // --- Playboi Carti Album & Tracks ---
    const cartiAlbum = await prisma.album.upsert({
      where: { title_artistId: { title: 'MUSIC', artistId: playboi.id } },
      update: {},
      create: {
        title: 'MUSIC',
        coverUrl: playboi.avatar,
        releaseDate: new Date('2023-09-10'),
        type: AlbumType.ALBUM,
        isActive: true,
        artistId: playboi.id,
      },
    });
    for (const genre of cartiGenres) {
      await prisma.albumGenre.upsert({
        where: {
          albumId_genreId: { albumId: cartiAlbum.id, genreId: genre.id },
        },
        update: {},
        create: { albumId: cartiAlbum.id, genreId: genre.id },
      });
    }
    const cartiTracksData = [
      {
        title: 'PHILLY',
        duration: 181,
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742540171/testAlbum/MUSIC/z3lh67ygrlyc0qvyx8hk.mp3',
        trackNumber: 1,
      },
      {
        title: 'RATHER LIE',
        duration: 164,
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742540166/testAlbum/MUSIC/dikzevnomueqpdmhgzhw.mp3',
        trackNumber: 2,
      },
      {
        title: 'BACKD00R',
        duration: 173,
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742540175/testAlbum/MUSIC/blyhwlcqhuf5uf29hecr.mp3',
        trackNumber: 3,
      },
    ];
    for (const trackData of cartiTracksData) {
      const track = await prisma.track.upsert({
        where: {
          title_artistId: { title: trackData.title, artistId: playboi.id },
        },
        update: {},
        create: {
          title: trackData.title,
          duration: trackData.duration,
          releaseDate: cartiAlbum.releaseDate,
          trackNumber: trackData.trackNumber,
          coverUrl: cartiAlbum.coverUrl,
          audioUrl: trackData.audioUrl,
          playCount: faker.number.int({ min: 100, max: 10000 }),
          type: AlbumType.ALBUM,
          isActive: true,
          artistId: playboi.id,
          albumId: cartiAlbum.id,
        },
      });
      allSeededTracks.push(track);
      for (const genre of cartiGenres) {
        await prisma.trackGenre.upsert({
          where: {
            trackId_genreId: { trackId: track.id, genreId: genre.id },
          },
          update: {},
          create: { trackId: track.id, genreId: genre.id },
        });
      }
    }
    console.log('  -> Playboi Carti album & tracks seeded/ensured.');

    // --- Kendrick Lamar Album & Tracks ---
    const kendrickAlbum = await prisma.album.upsert({
      where: { title_artistId: { title: 'GNX', artistId: kendrick.id } },
      update: {},
      create: {
        title: 'GNX',
        coverUrl: kendrick.avatar,
        releaseDate: new Date('2024-01-05'),
        type: AlbumType.ALBUM,
        isActive: true,
        artistId: kendrick.id,
      },
    });
    for (const genre of kendrickGenres) {
      await prisma.albumGenre.upsert({
        where: {
          albumId_genreId: { albumId: kendrickAlbum.id, genreId: genre.id },
        },
        update: {},
        create: { albumId: kendrickAlbum.id, genreId: genre.id },
      });
    }
    const kendrickTracksData = [
      {
        title: 'wacced out murals',
        duration: 224,
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742540722/testAlbum/GNX/srd0aeofrrxhxodgqjgs.mp3',
        trackNumber: 1,
      },
      {
        title: 'luther',
        duration: 213,
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742540717/testAlbum/GNX/xheoiq4ny7flu2zack5g.mp3',
        trackNumber: 2,
      },
      {
        title: 'tv off',
        duration: 197,
        audioUrl:
          'https://res.cloudinary.com/dsw1dm5ka/video/upload/v1742540719/testAlbum/GNX/a0i5pakxq2i9vzan9exd.mp3',
        trackNumber: 3,
      },
    ];
    for (const trackData of kendrickTracksData) {
      const track = await prisma.track.upsert({
        where: {
          title_artistId: { title: trackData.title, artistId: kendrick.id },
        },
        update: {},
        create: {
          title: trackData.title,
          duration: trackData.duration,
          releaseDate: kendrickAlbum.releaseDate,
          trackNumber: trackData.trackNumber,
          coverUrl: kendrickAlbum.coverUrl,
          audioUrl: trackData.audioUrl,
          playCount: faker.number.int({ min: 500, max: 15000 }),
          type: AlbumType.ALBUM,
          isActive: true,
          artistId: kendrick.id,
          albumId: kendrickAlbum.id,
        },
      });
      allSeededTracks.push(track);
      for (const genre of kendrickGenres) {
        await prisma.trackGenre.upsert({
          where: {
            trackId_genreId: { trackId: track.id, genreId: genre.id },
          },
          update: {},
          create: { trackId: track.id, genreId: genre.id },
        });
      }
    }
    console.log('  -> Kendrick Lamar album & tracks seeded/ensured.');
    console.log(
      `✅ Albums & Tracks for verified artists seeded/ensured. Total tracks: ${allSeededTracks.length}`
    );

    // === 6. Seed Artist Requests (Unverified Artist Profiles) ===
    console.log('🔄 Seeding artist requests (unverified artist profiles)...');
    const numberOfRequestsToCreate = 35;
    let requestsCreatedCount = 0;

    const usersWithProfiles = await prisma.artistProfile.findMany({
      select: { userId: true },
    });
    const userIdsWithProfiles = new Set(usersWithProfiles.map((p) => p.userId));

    const usersEligibleForRequest = users.filter(
      (user) => user.role === Role.USER && !userIdsWithProfiles.has(user.id)
    );

    const actualRequestsToCreate = Math.min(
      numberOfRequestsToCreate,
      usersEligibleForRequest.length
    );

    if (actualRequestsToCreate === 0) {
      console.log(
        '  -> No eligible users found to create new artist requests.'
      );
    } else {
      const selectedUsersForRequest = usersEligibleForRequest
        .sort(() => 0.5 - Math.random())
        .slice(0, actualRequestsToCreate);

      for (const user of selectedUsersForRequest) {
        const artistName = `Artist ${faker.person.lastName()} ${user.id.substring(
          0,
          8
        )}`;

        // Tạo slug duy nhất cho link mạng xã hội (an toàn hơn)
        const socialSlug = `${artistName
          .toLowerCase()
          .replace(/\s+/g, '')}_${user.id.substring(0, 4)}`;

        const requestProfile = await prisma.artistProfile.create({
          data: {
            artistName: artistName,
            bio: `Aspiring ${faker.music.genre()} artist from ${faker.location.city()}. User ID: ${user.id.substring(
              0,
              8
            )}...`,
            avatar: user.avatar || faker.image.avatarGitHub(),
            // --- THAY ĐỔI CHÍNH Ở ĐÂY ---
            socialMediaLinks: {
              // Luôn tạo cả Instagram và Facebook
              instagram: `https://instagram.com/${socialSlug}`,
              facebook: `https://facebook.com/${socialSlug}`,
              // Twitter là tùy chọn, có thể giữ hoặc bỏ
              // twitter: `https://twitter.com/${socialSlug}`,
            },
            // --- KẾT THÚC THAY ĐỔI ---
            isVerified: false,
            isActive: false, // Request thì chưa active
            verificationRequestedAt: faker.date.recent({ days: 30 }),
            userId: user.id,
            role: Role.USER, // Profile này thuộc về USER, chưa phải ARTIST
          },
        });
        requestsCreatedCount++;

        const randomGenresForRequest = await getRandomGenres(
          faker.number.int({ min: 1, max: 3 })
        );
        for (const genre of randomGenresForRequest) {
          await prisma.artistGenre.upsert({
            where: {
              artistId_genreId: {
                artistId: requestProfile.id,
                genreId: genre.id,
              },
            },
            update: {},
            create: { artistId: requestProfile.id, genreId: genre.id },
          });
        }
      }
      console.log(`✅ Created ${requestsCreatedCount} new artist requests.`);
    }

    // === 7. Seed User Interactions (Listens & Likes) ===
    console.log('🔄 Seeding user interactions (listens and likes)...');
    const allNormalUsers = await prisma.user.findMany({
      where: { role: Role.USER, isActive: true },
    });
    const allActiveTracks = await prisma.track.findMany({
      where: { isActive: true },
    });

    let interactionsSeeded = 0;
    if (allActiveTracks.length > 0 && allNormalUsers.length > 0) {
      for (const user of allNormalUsers) {
        const numberOfTracksToInteract = faker.number.int({
          min: 5,
          max: Math.min(25, allActiveTracks.length),
        });
        const tracksToInteract = allActiveTracks
          .sort(() => 0.5 - Math.random())
          .slice(0, numberOfTracksToInteract);

        for (const track of tracksToInteract) {
          // Seed lượt nghe (History)
          const playCount = faker.number.int({ min: 1, max: 15 });
          await prisma.history.upsert({
            where: {
              userId_trackId_type: {
                userId: user.id,
                trackId: track.id,
                type: 'PLAY',
              },
            },
            update: {
              playCount: { increment: playCount },
              updatedAt: new Date(),
              completed: Math.random() > 0.1, // 90% completed
            },
            create: {
              type: 'PLAY',
              playCount: playCount,
              completed: true,
              userId: user.id,
              trackId: track.id,
            },
          });

          // ~40% cơ hội user thích track
          if (Math.random() < 0.4) {
            await prisma.userLikeTrack.upsert({
              where: { userId_trackId: { userId: user.id, trackId: track.id } },
              update: {},
              create: { userId: user.id, trackId: track.id },
            });
          }
          interactionsSeeded++;
        }
      }
      console.log(`✅ Seeded ${interactionsSeeded} user-track interactions.`);
    } else {
      console.log(
        '⚠️ No active tracks or normal users found to seed interactions.'
      );
    }

    console.log('\n🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Prisma client disconnected.');
  }
}

main();
