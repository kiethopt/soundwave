import { PrismaClient } from '@prisma/client';
import { albumExtension } from '../middleware/album.middleware';
// import { withOptimize } from '@prisma/extension-optimize';
import { withAccelerate } from '@prisma/extension-accelerate';
import { authExtension } from '../middleware/auth.middleware';
import { artistExtension } from '../middleware/artist.middleware';
import { adminExtension } from '../middleware/admin.middleware';

// Tạo Prisma Client và áp dụng extension
const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});

// Kiểm tra environment variable trước khi khởi tạo
if (!process.env.OPTIMIZE_API_KEY) {
  throw new Error('OPTIMIZE_API_KEY is missing in environment variables');
}

// Áp dụng extension
const extendedPrisma = prisma
  .$extends(authExtension)
  .$extends(adminExtension)
  .$extends(albumExtension)
  .$extends(artistExtension)
  // .$extends(withOptimize({ apiKey: process.env.OPTIMIZE_API_KEY }))
  .$extends(withAccelerate());

export default extendedPrisma;
