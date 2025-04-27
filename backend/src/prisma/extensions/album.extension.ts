import { Prisma } from '@prisma/client';
import cron from 'node-cron';
import { getIO } from '../../config/socket';

async function checkAndUpdateAlbumStatus(client: any) {
  try {
    const now = new Date();

    // Tìm các album chưa active, đã đến ngày phát hành, và updatedAt <= releaseDate
    const albumsToPublish = await client.album.findMany({
      where: {
        isActive: false,
        releaseDate: {
          lte: now,
        },
        updatedAt: {
          lte: client.album.fields.releaseDate,
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (albumsToPublish.length > 0) {
      const albumIds = albumsToPublish.map((album: any) => album.id);

      // Cập nhật trạng thái các album
      await client.album.updateMany({
        where: {
          id: { in: albumIds },
        },
        data: { isActive: true },
      });

      // Cập nhật trạng thái các track thuộc album (chỉ những track đang false)
      await client.track.updateMany({
        where: {
          albumId: { in: albumIds },
          isActive: false, // Chỉ cập nhật track đang inactive trong album sắp publish
        },
        data: { isActive: true },
      });

      // Emit WebSocket event for each published album
      const io = getIO();
      for (const album of albumsToPublish) {
        io.emit('album:visibilityChanged', { albumId: album.id, isActive: true });
        // Hoặc có thể gửi cả album nếu cần:
        // const publishedAlbum = await client.album.findUnique({ where: { id: album.id }, select: albumSelect }); // Cần import albumSelect
        // if (publishedAlbum) io.emit('album:updated', { album: publishedAlbum });
      }

      console.log(
        `Auto published ${albumsToPublish.length} albums: ${albumsToPublish
          .map((a: any) => a.title)
          .join(', ')}`
      );
    }
  } catch (error) {
    console.error('Album auto publish error:', error);
  }
}

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

export const albumExtension = Prisma.defineExtension((client) => {
  // Thiết lập cron job để kiểm tra và cập nhật trạng thái album mỗi phút
  // Thêm log để biết cron job đang chạy
  cron.schedule('* * * * *', () => {
   // console.log('Running cron job to check and update album status...');
    checkAndUpdateAlbumStatus(client);
  });

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
          if (typeof args.data === 'object' && args.data !== null && 'releaseDate' in args.data && args.data.releaseDate !== undefined) {
            const releaseDate = new Date(args.data.releaseDate as string | Date);
            // Check if isActive is being explicitly set
            if (!('isActive' in args.data)) {
              args.data.isActive = releaseDate <= new Date();
            }
          }

          const result = await query(args);

          if (typeof args.data === 'object' && args.data !== null) {
            // Cập nhật coverUrl cho tracks nếu có thay đổi
            if ('coverUrl' in args.data && args.data.coverUrl !== undefined) {
              await client.track.updateMany({
                where: { albumId: result.id },
                data: { coverUrl: args.data.coverUrl as string },
              });
            }

            // Cập nhật isActive và releaseDate cho tracks
            const trackUpdateData: Prisma.TrackUpdateManyMutationInput = {};
            let shouldUpdateTracks = false;

            if ('isActive' in args.data && args.data.isActive !== undefined) {
              trackUpdateData.isActive = args.data.isActive as boolean;
              shouldUpdateTracks = true;
            }
            if ('releaseDate' in args.data && args.data.releaseDate !== undefined) {
              trackUpdateData.releaseDate = args.data.releaseDate as Date;
              shouldUpdateTracks = true;
            }

            if (shouldUpdateTracks) {
              await client.track.updateMany({
                where: { albumId: result.id },
                data: trackUpdateData,
              });
            }
          }

          return result;
        },
      },
      track: {
        async create({ args, query }) {
          const data = args.data as Prisma.TrackCreateInput;

          if (data.album?.connect?.id) {
            const albumId = data.album.connect.id;
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
            } else {
              // Handle case where album doesn't exist? Or throw error?
              console.warn(`Album with id ${albumId} not found when creating track.`);
              // Fallback to track's releaseDate if album not found
              const releaseDate = new Date(data.releaseDate);
              args.data = {
                ...data,
                isActive: releaseDate <= new Date(),
              };
            }
          } else if (data.releaseDate) {
            // Track độc lập, set isActive dựa trên releaseDate
            const releaseDate = new Date(data.releaseDate);
            args.data = {
              ...data,
              isActive: releaseDate <= new Date(),
            };
          } else {
             // Track không có album và không có releaseDate? Set active?
             args.data = { ...data, isActive: true };
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

          // Check if album connection is changing
          let newAlbumId: string | undefined = undefined;
          if (data.album?.connect?.id) {
            newAlbumId = data.album.connect.id;
          } else if (data.album && typeof data.album === 'string') {
             newAlbumId = data.album;
          }

          if (newAlbumId && newAlbumId !== oldTrack?.albumId) {
            const newAlbum = await client.album.findUnique({
              where: { id: newAlbumId },
              select: { isActive: true, releaseDate: true },
            });

            if (newAlbum) {
              // If track moves to a new album, inherit its status unless explicitly set
              args.data = {
                ...data,
                isActive: data.isActive !== undefined ? data.isActive as boolean : newAlbum.isActive,
                releaseDate: data.releaseDate !== undefined ? data.releaseDate as Date : newAlbum.releaseDate,
              };
            } else {
                console.warn(`New album with id ${newAlbumId} not found during track update.`);
                // If new album not found, keep track's existing status/release or set based on track's releaseDate if provided
                if (data.releaseDate) {
                   const releaseDate = new Date(data.releaseDate as string | Date);
                   args.data = {
                       ...data,
                       isActive: data.isActive !== undefined ? data.isActive as boolean : releaseDate <= new Date(),
                   };
                }
            }
          } else if (data.releaseDate && !newAlbumId && !oldTrack?.albumId) {
             // If track is standalone and releaseDate is updated
             const releaseDate = new Date(data.releaseDate as string | Date);
              // Only update isActive based on releaseDate if isActive is not explicitly set
             if (data.isActive === undefined) {
                args.data = {
                    ...data,
                    isActive: releaseDate <= new Date(),
                };
             }
          }

          const result = await query(args);

          // Update track count for old album if track moved away
          if (oldTrack?.albumId && newAlbumId !== oldTrack.albumId) {
            await updateAlbumTotalTracks(client, oldTrack.albumId);
          }
          // Update track count for new album if track moved in or created in album
          if (newAlbumId && newAlbumId !== oldTrack?.albumId) {
            await updateAlbumTotalTracks(client, newAlbumId);
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
