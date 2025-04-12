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
                gte: twoMinutesAgo, // Only publish if release date was recent
                lte: new Date(),
              },
              // Only consider tracks that haven't been updated recently
              updatedAt: {
                lt: twoMinutesAgo, // Less than 2 minutes ago
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
  console.log('Running cron job to auto-publish tracks...');
  try {
    // Explicitly call the extended method
    // Assuming your extended prisma client is available
    // If not, you might need to instantiate it here or import the extended client
    await (prisma as any).track.autoPublishTracks();
  } catch (error) {
    console.error('Cron job error:', error);
  }
});
