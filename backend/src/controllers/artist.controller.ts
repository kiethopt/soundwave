import { Request, Response } from 'express';
import prisma from '../config/db';
import { Role } from '@prisma/client';

const artistSelect = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  createdAt: true,
  artistProfile: {
    select: {
      id: true,
      artistName: true,
      bio: true,
      avatar: true,
      socialMediaLinks: true,
      monthlyListeners: true,
      isVerified: true,
      verificationRequestedAt: true,
      verifiedAt: true,
      createdAt: true,
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

// Cho phép tất cả các Artist xem thông tin của nhau
const canViewArtistData = async (
  user: any,
  artistProfileId: string
): Promise<boolean> => {
  if (user.role === Role.ADMIN || user.role === Role.ARTIST) return true;
  return false;
};

// Chỉ cho phép Admin hoặc chính Artist đó chỉnh sửa thông tin
const canEditArtistData = async (
  user: any,
  artistProfileId: string
): Promise<{ canEdit: boolean; message?: string }> => {
  if (user.role === Role.ADMIN) {
    return { canEdit: true };
  }

  const artistProfile = await prisma.artistProfile.findUnique({
    where: { id: artistProfileId },
    select: { userId: true },
  });

  if (!artistProfile) {
    return { canEdit: false, message: 'Artist profile not found' };
  }

  if (artistProfile.userId === user.id) {
    return { canEdit: true };
  }

  return {
    canEdit: false,
    message: 'You do not have permission to edit this profile',
  };
};

const validateUpdateArtistProfile = (data: any): string | null => {
  const { bio, socialMediaLinks, genreIds } = data;

  // Validate bio và socialMediaLinks như cũ
  if (bio && bio.length > 500) {
    return 'Bio must be less than 500 characters';
  }

  if (socialMediaLinks) {
    if (typeof socialMediaLinks !== 'object') {
      return 'Social media links must be an object';
    }

    const validKeys = ['facebook', 'instagram', 'twitter', 'youtube'];
    for (const key of Object.keys(socialMediaLinks)) {
      if (!validKeys.includes(key)) {
        return `Invalid social media key: ${key}`;
      }
      if (typeof socialMediaLinks[key] !== 'string') {
        return `Social media link for ${key} must be a string`;
      }
    }
  }

  // Validate genreIds
  if (genreIds) {
    if (!Array.isArray(genreIds)) {
      return 'Genre IDs must be an array';
    }
    if (genreIds.some((id) => typeof id !== 'string')) {
      return 'All genre IDs must be strings';
    }
  }

  return null;
};

// Lấy danh sách tất cả profile của các Artist (ADMIN only)
export const getAllArtistsProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const offset = (pageNumber - 1) * limitNumber;

    const [artists, total] = await Promise.all([
      prisma.artistProfile.findMany({
        skip: offset,
        take: limitNumber,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              role: true,
            },
          },
          genres: {
            include: {
              genre: true,
            },
          },
        },
      }),
      prisma.artistProfile.count(),
    ]);

    res.json({
      artists,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error('Get all artists profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getArtistProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const artist = await prisma.artistProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: artistSelect,
        },
      },
    });

    if (!artist) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    res.json(artist.user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getArtistAlbums = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user;

  const canAccess = await canViewArtistData(user, id);
  if (!canAccess) {
    res.status(403).json({
      message: "You do not have permission to view this artist's albums",
    });
    return;
  }

  try {
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!artistProfile) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    const albums = await prisma.album.findMany({
      where: { artistId: artistProfile.userId },
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
    console.error('Error fetching artist albums:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getArtistTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user;

  const canAccess = await canViewArtistData(user, id);
  if (!canAccess) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  try {
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!artistProfile) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    const tracks = await prisma.track.findMany({
      where: { artistId: artistProfile.userId },
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

export const getArtistStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const user = req.user;

  const canAccess = await canViewArtistData(user, id);
  if (!canAccess) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  try {
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id },
      select: { userId: true, monthlyListeners: true },
    });

    if (!artistProfile) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    const totalAlbums = await prisma.album.count({
      where: { artistId: artistProfile.userId },
    });

    const totalTracks = await prisma.track.count({
      where: { artistId: artistProfile.userId },
    });

    const totalPlays = await prisma.track.aggregate({
      where: { artistId: artistProfile.userId },
      _sum: { playCount: true },
    });

    res.json({
      totalAlbums,
      totalTracks,
      totalPlays: totalPlays._sum.playCount || 0,
      monthlyListeners: artistProfile.monthlyListeners,
    });
  } catch (error) {
    console.error('Error fetching artist stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateArtistProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { bio, socialMediaLinks, genreIds, isVerified, avatar } = req.body;
  const user = req.user;

  const { canEdit, message } = await canEditArtistData(user, id);
  if (!canEdit) {
    res.status(403).json({ message: message || 'Forbidden' });
    return;
  }

  const error = validateUpdateArtistProfile(req.body);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  try {
    // Kiểm tra sự tồn tại của genres nếu có
    if (genreIds && genreIds.length > 0) {
      const existingGenres = await prisma.genre.findMany({
        where: { id: { in: genreIds } },
      });

      if (existingGenres.length !== genreIds.length) {
        res.status(400).json({ message: 'One or more genres do not exist' });
        return;
      }
    }

    // Cập nhật ArtistProfile
    const updatedArtistProfile = await prisma.artistProfile.update({
      where: { id },
      data: {
        bio,
        avatar, // Thêm trường avatar vào đây
        socialMediaLinks,
        isVerified,
        verifiedAt: isVerified ? new Date() : null,
        genres: {
          deleteMany: {}, // Xóa tất cả genres hiện tại
          create: genreIds?.map((genreId: string) => ({
            genreId,
          })),
        },
      },
    });

    res.json(updatedArtistProfile);
  } catch (error) {
    console.error('Update artist profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
