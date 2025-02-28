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
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
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

async function main() {
  try {
    await seedGenres();
    await seedAdmin();
    await seedArtists();
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
