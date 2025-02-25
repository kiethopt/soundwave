import { PrismaClient } from '@prisma/client';
import { albumExtension } from '../middleware/album.middleware';
import { withAccelerate } from '@prisma/extension-accelerate';
import { authExtension } from '../middleware/auth.middleware';
import { artistExtension } from '../middleware/artist.middleware';
import { adminExtension } from '../middleware/admin.middleware';
import { userExtension } from '../middleware/user.middleware';
import { trackExtension } from '../middleware/track.middleware';

// Tạo Prisma Client và áp dụng extension
const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});

// Áp dụng extension
const extendedPrisma = prisma
  .$extends(authExtension)
  .$extends(adminExtension)
  .$extends(albumExtension)
  .$extends(artistExtension)
  .$extends(userExtension)
  .$extends(trackExtension)
  .$extends(withAccelerate());

export default extendedPrisma;
