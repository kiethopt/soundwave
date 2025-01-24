import { PrismaClient } from '@prisma/client';
import { albumExtension } from '../middleware/album.middleware';

// Tạo Prisma Client và áp dụng extension
const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});

// Áp dụng extension
const extendedPrisma = prisma.$extends(albumExtension);

export default extendedPrisma;
