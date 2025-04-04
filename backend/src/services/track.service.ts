import prisma from '../config/db';
import { Prisma, Role } from '@prisma/client';
import { Request } from 'express';
import { paginate } from '../utils/handle-utils';

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
  await prisma.userLikeTrack.create({
    data: {
      userId,
      trackId,
    },
  });

  // Add to favorite playlist
  // First find the favorite playlist
  const favoritePlaylist = await prisma.playlist.findFirst({
    where: {
      userId,
      type: 'FAVORITE',
    },
  });

  if (!favoritePlaylist) {
    throw new Error('Favorite playlist not found');
  }

  // Get the current count of tracks in the playlist to set the order
  const tracksCount = await prisma.playlistTrack.count({
    where: {
      playlistId: favoritePlaylist.id,
    },
  });

  return prisma.playlistTrack.create({
    data: {
      playlistId: favoritePlaylist.id,
      trackId,
      trackOrder: tracksCount + 1,
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
  await prisma.userLikeTrack.delete({
    where: {
      userId_trackId: {
        userId,
        trackId,
      },
    },
  });

  return prisma.playlistTrack.deleteMany({
    where: {
      playlist: {
        userId,
        type: 'FAVORITE',
      },
      trackId,
    },
  });
};

// Lấy TẤT CẢ tracks (cho admin view, với phân trang, tìm kiếm, sắp xếp)
export const getAllTracks = async (req: Request) => {
  const { search, sortBy, sortOrder } = req.query;
  const user = req.user; // Lấy thông tin user từ request

  // Điều kiện tìm kiếm
  const whereClause: Prisma.TrackWhereInput = {};

  // Nếu không phải ADMIN, chỉ hiển thị track của nghệ sĩ hiện tại
  if (user && user.role !== Role.ADMIN && user.artistProfile?.id) {
    whereClause.artistId = user.artistProfile.id;
  }

  // Tìm kiếm theo title, artist, album, genres, featuredArtists
  if (search && typeof search === 'string') {
    whereClause.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { artist: { artistName: { contains: search, mode: 'insensitive' } } },
      { album: { title: { contains: search, mode: 'insensitive' } } },
      {
        genres: {
          some: {
            genre: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
      },
      {
        featuredArtists: {
          some: {
            artistProfile: {
              artistName: { contains: search, mode: 'insensitive' },
            },
          },
        },
      },
    ];
  }

  // Sắp xếp
  const orderByClause: Prisma.TrackOrderByWithRelationInput = {};
  if (
    sortBy &&
    typeof sortBy === 'string' &&
    (sortOrder === 'asc' || sortOrder === 'desc')
  ) {
    if (
      sortBy === 'title' ||
      sortBy === 'duration' ||
      sortBy === 'releaseDate' ||
      sortBy === 'createdAt' ||
      sortBy === 'isActive'
    ) {
      orderByClause[sortBy] = sortOrder;
    } else if (sortBy === 'album') {
      orderByClause.album = { title: sortOrder };
    } else if (sortBy === 'artist') {
      orderByClause.artist = { artistName: sortOrder };
    } else {
      orderByClause.releaseDate = 'desc';
    }
  } else {
    orderByClause.releaseDate = 'desc';
  }

  const result = await paginate<any>(prisma.track, req, {
    where: whereClause,
    include: {
      artist: {
        select: { id: true, artistName: true, avatar: true },
      },
      album: { select: { id: true, title: true } },
      genres: { include: { genre: true } },
      featuredArtists: {
        include: { artistProfile: { select: { id: true, artistName: true } } },
      },
    },
    orderBy: orderByClause,
  });

  // Map data để đảm bảo cấu trúc và thêm trường dẫn đến genre và featuredArtists
  const formattedTracks = result.data.map((track: any) => ({
    ...track,
    genres: track.genres,
    featuredArtists: track.featuredArtists,
  }));

  return {
    data: formattedTracks,
    pagination: result.pagination,
  };
};
