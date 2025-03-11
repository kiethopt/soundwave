import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const genres = [
  'Pop',
  'Rock',
  'Hip-Hop',
  'R&B',
  'Country',
  'Jazz',
  'Classical',
  'Electronic',
  'Blues',
  'Reggae',
  'Metal',
  'Folk',
  'Punk',
  'Soul',
  'Funk',
  'Disco',
  'Techno',
  'House',
  'Trance',
  'Dance',
  'Indie',
  'Alternative',
  'K-Pop',
  'Latin',
  'World',
];

// Dữ liệu mẫu cho User với ArtistProfile
const artists = [
  {
    email: 'taylor.swift@example.com',
    username: 'taylorswift',
    name: 'Taylor Swift',
    password: 'Taylor123!',
    artistName: 'Taylor Swift',
    bio: 'Singer-songwriter known for narrative songwriting.',
    avatar: 'https://i.scdn.co/image/ab6761670000ecd4cfb500c2d2059c6cf61f507c',
    socialMediaLinks: { instagram: 'taylorswift', twitter: 'taylorswift13' },
  },
  {
    email: 'ed.sheeran@example.com',
    username: 'edsheeran',
    name: 'Ed Sheeran',
    password: 'Ed123!',
    artistName: 'Ed Sheeran',
    bio: 'British singer-songwriter with soulful hits.',
    avatar: 'https://i.scdn.co/image/ab6761670000ecd4e110fb3ba78e05dc6f79e61a',
    socialMediaLinks: { instagram: 'teddysphotos', twitter: 'edsheeran' },
  },
  {
    email: 'billie.eilish@example.com',
    username: 'billieeilish',
    name: 'Billie Eilish',
    password: 'Billie123!',
    artistName: 'Billie Eilish',
    bio: 'Alternative pop sensation with a unique style.',
    avatar: 'https://i.scdn.co/image/ab6761670000ecd4b970fb40e80ed10c870c20d4',
    socialMediaLinks: { instagram: 'billieeilish', twitter: 'billieeilish' },
  },
];

// Dữ liệu mẫu cho Event
const events = [
  {
    title: 'Summer Vibes Concert',
    description: 'Một đêm nhạc đầy sôi động với những bản hit mới nhất',
    location: 'Nhà hát Hòa Bình, Quận 10, TP.HCM',
    startDate: new Date('2024-07-15T18:00:00Z'),
    endDate: new Date('2024-07-15T22:00:00Z'),
    isActive: true,
  },
  {
    title: 'Acoustic Night',
    description: 'Đêm nhạc acoustic ấm cúng với những bản ballad nhẹ nhàng',
    location: 'Cung Văn hóa Hữu nghị Việt Xô, Hà Nội',
    startDate: new Date('2024-08-20T19:00:00Z'),
    endDate: new Date('2024-08-20T22:30:00Z'),
    isActive: true,
  },
  {
    title: 'Fan Meeting 2024',
    description: 'Gặp gỡ và giao lưu cùng người hâm mộ',
    location: 'Trung tâm Hội nghị Quốc gia, Hà Nội',
    startDate: new Date('2024-09-10T14:00:00Z'),
    endDate: new Date('2024-09-10T17:00:00Z'),
    isActive: true,
  },
  {
    title: 'Album Release Party',
    description: 'Buổi ra mắt album mới với nhiều hoạt động thú vị',
    location: 'Gem Center, Quận 1, TP.HCM',
    startDate: new Date('2024-10-05T18:30:00Z'),
    endDate: new Date('2024-10-05T23:00:00Z'),
    isActive: true,
  },
  {
    title: 'Year End Festival',
    description: 'Festival âm nhạc cuối năm quy tụ nhiều nghệ sĩ nổi tiếng',
    location: 'Sân vận động Mỹ Đình, Hà Nội',
    startDate: new Date('2024-12-28T16:00:00Z'),
    endDate: new Date('2024-12-28T23:59:00Z'),
    isActive: true,
  },
];

// ID đã cung cấp
const userIds = [
  'cm81wkqcm0000ml0viizqrklg',
  'cm81ws3m90008ml0vnncrw3jj',
  'cm81wsop60009ml0v6yam7o9o',
  'cm81wsulm000dml0vff7k8020',
  'cm81wt2fs000eml0vrvctejje',
];

const artistIds = [
  'cm7wuqmxf000th10xt4bazgjr',
  'cm7wuqmq4000rh10xu4o5hgw4',
  'cm7wuqn4j000vh10xao4p3tk8',
];

const playlistIds = [
  'cm7wustaw001th10xvil4ael0',
  'cm7wuv65d001wh10xm77aa1e0',
  'cm7x33j1q0020h10x9cdt4zaw',
  'cm7x33j9t0022h10xvb491je6',
  'cm81wky9x0002ml0v0vt2gup0',
];

async function seedGenres() {
  console.log('Seeding genres...');
  for (const genreName of genres) {
    await prisma.genre.upsert({
      where: { name: genreName },
      update: {},
      create: { name: genreName },
    });
  }
  console.log('Genres seeded successfully');
}

async function seedAdmin() {
  console.log('Seeding admin account...');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      username: 'admin',
      name: 'Administrator',
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(`Admin account created with email: ${adminEmail}`);
}

async function seedArtists() {
  console.log('Seeding artist accounts...');
  for (const artist of artists) {
    const hashedPassword = await bcrypt.hash(artist.password, 10);

    // Tạo User với ArtistProfile đi kèm
    await prisma.user.upsert({
      where: { email: artist.email },
      update: {},
      create: {
        email: artist.email,
        username: artist.username,
        name: artist.name,
        password: hashedPassword,
        role: Role.USER, // Role của User là USER
        isActive: true,
        artistProfile: {
          create: {
            artistName: artist.artistName,
            bio: artist.bio,
            avatar: artist.avatar,
            role: Role.ARTIST, // Role trong ArtistProfile là ARTIST
            socialMediaLinks: artist.socialMediaLinks,
            monthlyListeners: 0,
            isVerified: true, // Giả định đã được duyệt
            isActive: true,
          },
        },
      },
    });

    console.log(`Artist ${artist.artistName} seeded successfully`);
  }
  console.log('All artists seeded successfully');
}

async function seedEvents() {
  console.log('Seeding events...');

  // Lấy artistId từ database
  const artistId = 'cm81wuzr9000jml0vj56x8bnn'; // ID của artist đã được chỉ định

  // Kiểm tra xem artist có tồn tại không
  const artist = await prisma.artistProfile.findUnique({
    where: { id: artistId },
  });

  if (!artist) {
    console.log(
      `Artist with ID ${artistId} not found. Events will not be seeded.`
    );
    return;
  }

  // Tạo các sự kiện cho artist
  for (const event of events) {
    await prisma.event.create({
      data: {
        title: event.title,
        description: event.description,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        isActive: event.isActive,
        artistId: artistId,
      },
    });

    console.log(
      `Event "${event.title}" created for artist ${artist.artistName}`
    );
  }

  console.log('All events seeded successfully');
}

async function seedPlaylistTracks() {
  console.log('Seeding playlist tracks...');

  // Lấy danh sách tracks từ database
  const tracks = await prisma.track.findMany({
    where: {
      isActive: true,
    },
    take: 20, // Lấy tối đa 20 tracks
  });

  if (tracks.length === 0) {
    console.log('No active tracks found. Playlist tracks will not be seeded.');
    return;
  }

  // Kiểm tra xem playlists có tồn tại không
  for (const playlistId of playlistIds) {
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      console.log(`Playlist with ID ${playlistId} not found. Skipping.`);
      continue;
    }

    // Số lượng tracks ngẫu nhiên cho mỗi playlist (3-8 tracks)
    const numTracks = Math.floor(Math.random() * 6) + 3;
    const selectedTracks = tracks
      .sort(() => 0.5 - Math.random()) // Xáo trộn mảng
      .slice(0, numTracks); // Lấy số lượng tracks cần thiết

    // Thêm tracks vào playlist
    for (let i = 0; i < selectedTracks.length; i++) {
      const track = selectedTracks[i];

      try {
        await prisma.playlistTrack.create({
          data: {
            playlistId: playlistId,
            trackId: track.id,
            trackOrder: i + 1,
            addedAt: new Date(
              Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
            ), // Ngày ngẫu nhiên trong 30 ngày qua
          },
        });

        console.log(
          `Added track "${track.title}" to playlist ${playlist.name}`
        );
      } catch (error) {
        console.log(`Error adding track to playlist: ${error.message}`);
        // Nếu đã tồn tại, bỏ qua
      }
    }

    // Cập nhật totalTracks và totalDuration cho playlist
    const playlistTracks = await prisma.playlistTrack.findMany({
      where: { playlistId: playlistId },
      include: { track: true },
    });

    const totalTracks = playlistTracks.length;
    const totalDuration = playlistTracks.reduce(
      (sum, pt) => sum + (pt.track?.duration || 0),
      0
    );

    await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        totalTracks,
        totalDuration,
      },
    });

    console.log(
      `Updated playlist ${playlist.name} with ${totalTracks} tracks and ${totalDuration} seconds duration`
    );
  }

  console.log('All playlist tracks seeded successfully');
}

async function seedUserLikeTracks() {
  console.log('Seeding user likes for tracks...');

  // Lấy danh sách tracks từ database
  const tracks = await prisma.track.findMany({
    where: {
      isActive: true,
    },
    take: 30, // Lấy tối đa 30 tracks
  });

  if (tracks.length === 0) {
    console.log('No active tracks found. User likes will not be seeded.');
    return;
  }

  // Kiểm tra xem users có tồn tại không
  for (const userId of userIds) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log(`User with ID ${userId} not found. Skipping.`);
      continue;
    }

    // Số lượng tracks ngẫu nhiên mà user thích (5-15 tracks)
    const numLikes = Math.floor(Math.random() * 11) + 5;
    const likedTracks = tracks
      .sort(() => 0.5 - Math.random()) // Xáo trộn mảng
      .slice(0, numLikes); // Lấy số lượng tracks cần thiết

    // Thêm likes cho user
    for (const track of likedTracks) {
      try {
        await prisma.userLikeTrack.create({
          data: {
            userId: userId,
            trackId: track.id,
            createdAt: new Date(
              Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000
            ), // Ngày ngẫu nhiên trong 60 ngày qua
          },
        });

        console.log(
          `User ${user.name || user.username} liked track "${track.title}"`
        );
      } catch (error) {
        console.log(`Error adding like: ${error.message}`);
        // Nếu đã tồn tại, bỏ qua
      }
    }
  }

  console.log('All user likes seeded successfully');
}

async function main() {
  try {
    await seedGenres();
    await seedAdmin();
    await seedArtists();
    // await seedEvents();
    // await seedPlaylistTracks();
    // await seedUserLikeTracks();
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
