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
          // Add a time threshold (e.g., 2 minutes ago)
          const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

          const tracksToPublish = await prisma.track.findMany({
            where: {
              isActive: false,
              releaseDate: {
                lte: new Date(), // Activate if releaseDate is now or in the past
              },
              // Only activate if the track wasn't updated AFTER its release date
              // This implies it wasn't manually hidden after being released.
              updatedAt: {
                lte: prisma.track.fields.releaseDate, // Compare updatedAt with releaseDate field
              },
            },
          });

          if (tracksToPublish.length === 0) {
            // console.log('No tracks to auto-publish at this time.');
            return;
          }

          console.log(`Found ${tracksToPublish.length} tracks to auto-publish.`);

          for (const track of tracksToPublish) {
            try {
              await prisma.track.update({
                where: { id: track.id },
                data: { isActive: true },
              });
              console.log(`Auto published track: ${track.title} (ID: ${track.id})`);
            } catch (updateError) {
              console.error(`Failed to auto-publish track ${track.id}:`, updateError);
            }
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
  // console.log('Running cron job to auto-publish tracks...'); // Removed log message
  try {

    await (prisma as any).track.autoPublishTracks();
  } catch (error) {
    console.error('Cron job error:', error);
  }
});
