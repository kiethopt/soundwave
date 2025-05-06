import { PrismaClient } from '@prisma/client';
import { authExtension } from '../prisma/extensions/auth.extension';
import { adminExtension } from '../prisma/extensions/admin.extension';
import { artistExtension } from '../prisma/extensions/artist.extension';
import { userExtension } from '../prisma/extensions/user.extension';
import { albumExtension } from '../prisma/extensions/album.extension';
import { trackExtension } from '../prisma/extensions/track.extension';
import { historyExtension } from '../prisma/extensions/history.extension';
import { labelExtension } from '../prisma/extensions/label.extension';
import { playlistExtension } from '../prisma/extensions/playlist.extension';

// Tạo Prisma Client và áp dụng extension
const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});

// Áp dụng extension
const extendedPrisma = prisma
  .$extends(authExtension)
  .$extends(adminExtension)
  .$extends(artistExtension)
  .$extends(userExtension)
  .$extends(trackExtension)
  .$extends(albumExtension)
  .$extends(historyExtension)
  .$extends(labelExtension)
  .$extends(playlistExtension);

// Export the extended client instance
export default extendedPrisma;

// Export the type of the extended client
export type ExtendedPrismaClient = typeof extendedPrisma;
