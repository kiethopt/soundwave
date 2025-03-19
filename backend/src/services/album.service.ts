import { albumSelect } from 'src/utils/prisma-selects';
import prisma from '../config/db';

export const deleteAlbumById = async (id: string) => {
  // Kiểm tra xem album có tồn tại không
  const album = await prisma.album.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!album) {
    throw new Error('Album not found');
  }

  // Xóa album
  return prisma.album.delete({
    where: { id },
  });
};

// Lấy album mới nhất
export const getNewestAlbums = async (limit = 10) => {
  return prisma.album.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      releaseDate: 'desc',
    },
    take: limit,
    select: albumSelect,
  });
};

// Lấy album hot nhất (dựa trên lượt nghe bài hát trong album)
export const getHotAlbums = async (limit = 10) => {
  return prisma.album.findMany({
    where: {
      isActive: true,
      tracks: {
        some: {
          isActive: true,
        },
      },
    },
    orderBy: [
      {
        tracks: {
          _count: 'desc',
        },
      },
      {
        releaseDate: 'desc',
      },
    ],
    take: limit,
    select: albumSelect,
  });
};
