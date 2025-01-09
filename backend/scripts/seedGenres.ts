import { PrismaClient } from '@prisma/client';

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

async function seedGenres() {
  try {
    for (const genreName of genres) {
      await prisma.genre.upsert({
        where: { name: genreName },
        update: {},
        create: { name: genreName },
      });
    }
    console.log('Genres seeded successfully');
  } catch (error) {
    console.error('Error seeding genres:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedGenres();
