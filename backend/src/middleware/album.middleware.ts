import { Prisma } from '@prisma/client';

export const albumExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      album: {
        async update({ args, query }) {
          // Thực hiện update album
          const result = await query(args);

          // Kiểm tra data có phải là object và có coverUrl không
          if (typeof args.data === 'object') {
            // Nếu có thay đổi coverUrl
            if ('coverUrl' in args.data) {
              await client.track.updateMany({
                where: { albumId: result.id },
                data: { coverUrl: args.data.coverUrl as string },
              });
            }

            // Nếu có thay đổi isActive
            if ('isActive' in args.data) {
              await client.track.updateMany({
                where: { albumId: result.id },
                data: { isActive: args.data.isActive as boolean },
              });
            }
          }

          return result;
        },
      },
      track: {
        async create({ args, query }) {
          const data = args.data as Prisma.TrackCreateInput;

          // Nếu track được thêm vào album, kiểm tra trạng thái của album
          if (data.album) {
            const albumId = (data.album as any).connect?.id;
            if (albumId) {
              const album = await client.album.findUnique({
                where: { id: albumId },
                select: { isActive: true },
              });

              // Nếu album đang ẩn, track mới cũng sẽ ẩn
              if (album && !album.isActive) {
                args.data = {
                  ...data,
                  isActive: false,
                };
              }
            }
          }

          // Thực hiện tạo track
          const result = await query(args);

          // Cập nhật totalTracks nếu track thuộc album
          if ((result as any).albumId) {
            await updateAlbumTotalTracks(client, (result as any).albumId);
          }

          return result;
        },

        async update({ args, query }) {
          const data = args.data as Prisma.TrackUpdateInput;

          // Lấy thông tin track cũ trước khi update
          const oldTrack = await client.track.findUnique({
            where: args.where,
            select: { albumId: true },
          });

          // Nếu track được chuyển sang album khác
          if (
            data.album &&
            typeof data.album === 'object' &&
            'connect' in data.album
          ) {
            const newAlbumId = (data.album.connect as any)?.id;

            if (newAlbumId && newAlbumId !== oldTrack?.albumId) {
              const newAlbum = await client.album.findUnique({
                where: { id: newAlbumId },
                select: { isActive: true },
              });

              // Nếu album mới đang ẩn, track cũng sẽ ẩn
              if (newAlbum && !newAlbum.isActive) {
                args.data = {
                  ...data,
                  isActive: false,
                };
              }
            }
          }

          // Thực hiện update track
          const result = await query(args);

          // Cập nhật totalTracks cho album cũ và mới nếu có thay đổi
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
          // Lấy thông tin track trước khi xóa
          const track = await client.track.findUnique({
            where: args.where,
            select: { albumId: true },
          });

          // Thực hiện xóa track
          const result = await query(args);

          // Cập nhật totalTracks nếu track thuộc album
          if (track?.albumId) {
            await updateAlbumTotalTracks(client, track.albumId);
          }

          return result;
        },
      },
    },
  });
});

// Hàm helper để cập nhật totalTracks
async function updateAlbumTotalTracks(client: any, albumId: string) {
  try {
    const trackCount = await client.track.count({
      where: {
        albumId,
      },
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
