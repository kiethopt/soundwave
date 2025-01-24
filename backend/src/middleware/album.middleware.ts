import { Prisma } from '@prisma/client';

export const albumExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      track: {
        async create({ args, query }) {
          // Thực hiện tạo track
          const result = await query(args);

          // Cập nhật totalTracks nếu track thuộc album
          if (result.albumId) {
            await updateAlbumTotalTracks(client, result.albumId);
          }

          return result;
        },

        async update({ args, query }) {
          // Lấy thông tin track cũ trước khi update
          const oldTrack = await client.track.findUnique({
            where: { id: args.where.id },
            select: { albumId: true },
          });

          // Thực hiện update track
          const result = await query(args);

          // Cập nhật totalTracks cho album cũ và mới nếu có thay đổi
          if (oldTrack?.albumId) {
            await updateAlbumTotalTracks(client, oldTrack.albumId);
          }
          if (result.albumId && result.albumId !== oldTrack?.albumId) {
            await updateAlbumTotalTracks(client, result.albumId);
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
        isActive: true,
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
