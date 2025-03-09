import prisma from '../config/db';

export const deleteTrackById = async (id: string) => {
  // Kiểm tra xem bài hát có tồn tại không
  const track = await prisma.track.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!track) {
    throw new Error('Track not found');
  }

  // Có thì xóa
  return prisma.track.delete({
    where: { id },
  });
};
