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

// Like a track
export const likeTrack = async (userId: string, trackId: string) => {
  // Check if track exists and is active
  const track = await prisma.track.findFirst({
    where: {
      id: trackId,
      isActive: true,
    },
  });

  if (!track) {
    throw new Error('Track not found or not active');
  }

  // Check if already liked
  const existingLike = await prisma.userLikeTrack.findUnique({
    where: {
      userId_trackId: {
        userId,
        trackId,
      },
    },
  });

  if (existingLike) {
    throw new Error('Track already liked');
  }

  // Create like record
  return prisma.userLikeTrack.create({
    data: {
      userId,
      trackId,
    },
    include: {
      track: {
        include: {
          artist: true,
        },
      },
    },
  });
};

// Unlike a track
export const unlikeTrack = async (userId: string, trackId: string) => {
  // Check if like exists
  const existingLike = await prisma.userLikeTrack.findUnique({
    where: {
      userId_trackId: {
        userId,
        trackId,
      },
    },
  });

  if (!existingLike) {
    throw new Error('Track not liked');
  }

  // Delete like record
  return prisma.userLikeTrack.delete({
    where: {
      userId_trackId: {
        userId,
        trackId,
      },
    },
  });
};
