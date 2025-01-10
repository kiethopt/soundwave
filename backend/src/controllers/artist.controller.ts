import { Request, Response } from 'express';
import prisma from '../config/db';
import { Role } from '@prisma/client';

const artistSelect = {
  id: true,
  name: true,
  avatar: true,
  isVerified: true,
  artistProfile: {
    select: {
      id: true,
      artistName: true,
      bio: true,
      socialMediaLinks: true,
      createdAt: true,
      updatedAt: true,
      genres: {
        select: {
          genre: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
  albums: {
    select: {
      id: true,
      title: true,
      coverUrl: true,
      releaseDate: true,
      trackCount: true,
      duration: true,
      type: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  tracks: {
    select: {
      id: true,
      title: true,
      duration: true,
      releaseDate: true,
      trackNumber: true,
      coverUrl: true,
      audioUrl: true,
      playCount: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

/*
    Artist chỉ có thể xem và thao tác trên dữ liệu của chính họ, không xem hoặc thay đổi dữ liệu của artist khác.
    Admin có quyền xem và thao tác trên dữ liệu của tất cả artists.
*/

// Valid quyền truy cập data (Artist & Admin ONLY)
const canAccessArtistData = (user: any, artistId: string): boolean => {
  return (
    user.role === Role.ADMIN || // Admin có quyền truy cập mọi artist
    (user.role === Role.ARTIST && user.id === artistId) // Artist chỉ truy cập được dữ liệu của chính họ
  );
};

// Valid update profile artist
const validateUpdateArtistProfile = (data: any): string | null => {
  const { bio, socialMediaLinks } = data;

  // Kiểm tra độ dài của bio (tối đa 500 ký tự)
  if (bio && bio.length > 500) {
    return 'Bio must be less than 500 characters';
  }

  // Kiểm tra socialMediaLinks có phải là object không
  if (socialMediaLinks && typeof socialMediaLinks !== 'object') {
    return 'Social media links must be an object';
  }

  return null;
};

// Lấy thông tin chi tiết của artist
export const getArtistProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  // asdasd
};

// Cập nhật thông tin artist
export const updateArtistProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  // asdasd
};

// Lấy danh sách album của artist
export const getArtistAlbums = async (
  req: Request,
  res: Response
): Promise<void> => {
  // asdasd
};

// Lấy danh sách track của artist
export const getArtistTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  // asdasd
};

// Lấy thống kê của artist (totalAlbums, totalTracks, totalPlays, monthlyListeners)
export const getArtistStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  // asdasd
};
