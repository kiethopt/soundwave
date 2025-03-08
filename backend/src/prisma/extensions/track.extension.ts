import prisma from '../../config/db';
import cron from 'node-cron';
import { Prisma } from '@prisma/client';

// Tạo extension cho track
export const trackExtension = Prisma.defineExtension({
  name: 'trackExtension',
  model: {
    track: {
      async autoPublishTracks() {
        try {
          const tracks = await prisma.track.findMany({
            where: {
              isActive: false,
              releaseDate: {
                lte: new Date(),
              },
            },
          });

          for (const track of tracks) {
            await prisma.track.update({
              where: { id: track.id },
              data: { isActive: true },
            });
            console.log(`Auto published track: ${track.title}`);
          }
        } catch (error) {
          console.error('Auto publish error:', error);
        }
      },
    },
  },
});

// Cron job để tự động publish tracks
cron.schedule('* * * * *', async () => {
  try {
    await prisma.track.autoPublishTracks();
  } catch (error) {
    console.error('Cron job error:', error);
  }
});
