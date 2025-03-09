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
