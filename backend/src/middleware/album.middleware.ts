import { Prisma } from '@prisma/client';

export const albumExtension = Prisma.defineExtension((client) => {
  // Kiểm tra và cập nhật isActive định kỳ
  setInterval(async () => {
    const now = new Date();
    try {
      await client.$transaction([
        client.album.updateMany({
          where: {
            releaseDate: { lte: now },
            isActive: false,
          },
          data: { isActive: true },
        }),
        client.track.updateMany({
          where: {
            releaseDate: { lte: now },
            isActive: false,
            albumId: null,
          },
          data: { isActive: true },
        }),
      ]);
    } catch (error) {
      console.error('Release date check error:', error);
    }
  }, 1000 * 60 * 60); // Chạy mỗi giờ

  return client.$extends({
    query: {
      album: {
        async create({ args, query }) {
          // Set isActive dựa trên releaseDate khi tạo album
          const releaseDate = new Date(args.data.releaseDate);
          args.data.isActive = releaseDate <= new Date();
          return query(args);
        },
        async update({ args, query }) {
          // Kiểm tra và cập nhật isActive nếu có thay đổi releaseDate
          if (typeof args.data === 'object' && 'releaseDate' in args.data) {
            const releaseDate = new Date(args.data.releaseDate as string);
            args.data.isActive = releaseDate <= new Date();
          }

          const result = await query(args);

          if (typeof args.data === 'object') {
            // Cập nhật coverUrl cho tracks nếu có thay đổi
            if ('coverUrl' in args.data) {
              await client.track.updateMany({
                where: { albumId: result.id },
                data: { coverUrl: args.data.coverUrl as string },
              });
            }

            // Cập nhật isActive và releaseDate cho tracks
            if ('isActive' in args.data || 'releaseDate' in args.data) {
              await client.track.updateMany({
                where: { albumId: result.id },
                data: {
                  ...(args.data.isActive !== undefined && {
                    isActive: args.data.isActive as boolean,
                  }),
                  ...(args.data.releaseDate && {
                    releaseDate: args.data.releaseDate as Date,
                  }),
                },
              });
            }
          }

          return result;
        },
      },
      track: {
        async create({ args, query }) {
          const data = args.data as Prisma.TrackCreateInput;

          if (data.album) {
            const albumId = (data.album as any).connect?.id;
            if (albumId) {
              const album = await client.album.findUnique({
                where: { id: albumId },
                select: { isActive: true, releaseDate: true },
              });

              if (album) {
                args.data = {
                  ...data,
                  isActive: album.isActive,
                  releaseDate: album.releaseDate,
                };
              }
            }
          } else {
            // Track độc lập, set isActive dựa trên releaseDate
            const releaseDate = new Date(data.releaseDate);
            args.data = {
              ...data,
              isActive: releaseDate <= new Date(),
            };
          }

          const result = await query(args);

          if ((result as any).albumId) {
            await updateAlbumTotalTracks(client, (result as any).albumId);
          }

          return result;
        },

        async update({ args, query }) {
          const data = args.data as Prisma.TrackUpdateInput;
          const oldTrack = await client.track.findUnique({
            where: args.where,
            select: { albumId: true },
          });

          if (
            data.album &&
            typeof data.album === 'object' &&
            'connect' in data.album
          ) {
            const newAlbumId = (data.album.connect as any)?.id;
            if (newAlbumId && newAlbumId !== oldTrack?.albumId) {
              const newAlbum = await client.album.findUnique({
                where: { id: newAlbumId },
                select: { isActive: true, releaseDate: true },
              });

              if (newAlbum) {
                args.data = {
                  ...data,
                  isActive: newAlbum.isActive,
                  releaseDate: newAlbum.releaseDate,
                };
              }
            }
          }

          const result = await query(args);

          if (oldTrack?.albumId) {
            await updateAlbumTotalTracks(client, oldTrack.albumId);
          }
          if (
            (result as any).albumId &&
            (result as any).albumId !== oldTrack?.albumId
          ) {
            await updateAlbumTotalTracks(client, (result as any).albumId);
          }

          return result;
        },

        async delete({ args, query }) {
          const track = await client.track.findUnique({
            where: args.where,
            select: { albumId: true },
          });

          const result = await query(args);

          if (track?.albumId) {
            await updateAlbumTotalTracks(client, track.albumId);
          }

          return result;
        },
      },
    },
  });
});

async function updateAlbumTotalTracks(client: any, albumId: string) {
  try {
    const trackCount = await client.track.count({
      where: { albumId },
    });

    await client.album.update({
      where: { id: albumId },
      data: { totalTracks: trackCount },
    });
  } catch (error) {
    console.error('Error updating album totalTracks:', error);
    throw error;
  }
}
