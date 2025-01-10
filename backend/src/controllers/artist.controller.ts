import { Request, Response } from 'express';
import prisma from '../config/db';
import { Prisma, Role } from '@prisma/client';

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

export const getAllArtistsProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const artists = await prisma.user.findMany({
      where: { role: Role.ARTIST },
      select: artistSelect,
    });

    res.json(artists);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Lấy thông tin chi tiết của artist
export const getArtistProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  
  try {
    const artist = await prisma.user.findUnique({
      where: { id },
      select: artistSelect,
    });

    if (!artist) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    res.json(artist);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cập nhật thông tin artist
export const updateArtistProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const data = req.body;
  const user = req.user;


  if (!canAccessArtistData(user, id)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const error = validateUpdateArtistProfile(data);

  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  try {
    const updatedArtist = await prisma.user.update({
      where: { id },
      data: {
        artistProfile: {
          update: data,
        },
      },
      select: artistSelect,
    });

    res.json(updatedArtist);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách album của artist
export const getArtistAlbums = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user;

  if (!canAccessArtistData(user, id)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  try {
    const albums = await prisma.album.findMany({
      where: { artistId: id },
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
    });

    res.json(albums);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách track của artist
export const getArtistTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user;

  if (!canAccessArtistData(user, id)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  try {
    const tracks = await prisma.track.findMany({
      where: { artistId: id },
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
    });

    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy thống kê của artist (totalAlbums, totalTracks, totalPlays, monthlyListeners)
export const getArtistStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user;

  if (!canAccessArtistData(user, id)) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  try {
    const totalAlbums = await prisma.album.count({
      where: { artistId: id },
    });

    const totalTracks = await prisma.track.count({
      where: { artistId: id },
    });

    const totalPlays = await prisma.track.aggregate({
      where: { artistId: id },
      _sum: { playCount: true },
    });

    res.json({
      totalAlbums,
      totalTracks,
      totalPlays: totalPlays._sum.playCount || 0,
    });
  } catch (error) {
    console.error('Error fetching artist stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};