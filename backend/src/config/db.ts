import { PrismaClient } from '@prisma/client';
// import { withAccelerate } from '@prisma/extension-accelerate';
import { authExtension } from '../prisma/extensions/auth.extension';
import { adminExtension } from '../prisma/extensions/admin.extension';
import { artistExtension } from '../prisma/extensions/artist.extension';
import { userExtension } from '../prisma/extensions/user.extension';
import { albumExtension } from '../prisma/extensions/album.extension';
import { trackExtension } from '../prisma/extensions/track.extension';
import { playlistExtension } from '../prisma/extensions/playlist.extension';
import { eventExtension } from '../prisma/extensions/event.extension';
import { historyExtension } from '../prisma/extensions/history.extension';

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
  .$extends(playlistExtension)
  .$extends(eventExtension)
  .$extends(historyExtension);
// .$extends(withAccelerate());

export default extendedPrisma;
