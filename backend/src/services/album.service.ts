import { albumSelect } from '../utils/prisma-selects';
import prisma from '../config/db';
import { Prisma, Role } from '@prisma/client';
import { Request } from 'express';
import { paginate } from '../utils/handle-utils';

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

// Lấy TẤT CẢ albums (cho admin view, với phân trang, tìm kiếm, sắp xếp)
export const getAllAlbums = async (req: Request) => {
  const { search, sortBy, sortOrder } = req.query;
  const user = req.user; // Lấy thông tin user từ request

  const whereClause: Prisma.AlbumWhereInput = {};

  // Nếu không phải ADMIN, chỉ hiển thị album của nghệ sĩ hiện tại
  if (user && user.role !== Role.ADMIN && user.artistProfile?.id) {
    whereClause.artistId = user.artistProfile.id;
  }

  // Thêm điều kiện tìm kiếm nếu có từ khóa tìm kiếm
  if (search && typeof search === 'string') {
    whereClause.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { artist: { artistName: { contains: search, mode: 'insensitive' } } },
      {
        genres: {
          some: {
            genre: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
      },
    ];
  }

  const orderByClause: Prisma.AlbumOrderByWithRelationInput = {};
  if (
    sortBy &&
    typeof sortBy === 'string' &&
    (sortOrder === 'asc' || sortOrder === 'desc')
  ) {
    if (sortBy === 'title' || sortBy === 'type' || sortBy === 'releaseDate') {
      orderByClause[sortBy] = sortOrder;
    } else if (sortBy === 'totalTracks') {
      orderByClause.tracks = {
        _count: sortOrder,
      };
    } else {
      orderByClause.releaseDate = 'desc';
    }
  } else {
    orderByClause.releaseDate = 'desc';
  }

  const result = await paginate<any>(prisma.album, req, {
    where: whereClause,
    include: {
      artist: { select: { id: true, artistName: true, avatar: true } },
      genres: { include: { genre: true } },
      _count: { select: { tracks: true } },
    },
    orderBy: orderByClause,
  });

  // Map data để đảm bảo cấu trúc và thêm trường dẫn đến genre
  const formattedAlbums = result.data.map((album: any) => ({
    ...album,
    totalTracks: album._count?.tracks ?? 0,
    genres: album.genres,
  }));

  return {
    data: formattedAlbums,
    pagination: result.pagination,
  };
};
