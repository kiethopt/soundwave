import { Request, Response } from 'express';
import prisma from '../config/db';
import { Role } from '@prisma/client';
import { uploadFile } from '../services/cloudinary.service';
import { client } from '../middleware/cache.middleware';
import {
  albumSelect,
  artistProfileSelect,
  trackSelect,
} from '../utils/prisma-selects';
import exp from 'constants';

// Cho phép tất cả các Artist xem thông tin của nhau
const canViewArtistData = async (
  user: any,
  artistProfileId: string
): Promise<boolean> => {
  if (!user) return false;
  if (user.role === Role.ADMIN) return true;
  // Kiểm tra nếu user có artistProfile và đã được verify
  if (user.artistProfile?.isVerified) return true;
  return false;
};

// Chỉ cho phép Admin hoặc chính Artist đó chỉnh sửa thông tin
const canEditArtistData = async (
  user: any,
  artistProfileId: string
): Promise<{ canEdit: boolean; message?: string }> => {
  if (!user) {
    return { canEdit: false, message: 'Unauthorized' };
  }

  if (user.role === Role.ADMIN) {
    return { canEdit: true };
  }

  const artistProfile = await prisma.artistProfile.findUnique({
    where: { id: artistProfileId },
    select: { userId: true, isVerified: true },
  });

  if (!artistProfile) {
    return { canEdit: false, message: 'Artist profile not found' };
  }

  // Chỉ cho phép chính artist đó chỉnh sửa và phải đã được verify
  if (artistProfile.userId === user.id && artistProfile.isVerified) {
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

// Lấy danh sách tất cả profile của các Artist (ADMIN & ARTIST only)
export const getAllArtistsProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const offset = (pageNumber - 1) * limitNumber;

    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Kiểm tra quyền truy cập
    if (
      user.role !== Role.ADMIN &&
      (!user.artistProfile?.isVerified || user.currentProfile !== 'ARTIST')
    ) {
      res.status(403).json({
        message: 'You do not have permission to perform this action',
        code: 'SWITCH_TO_ARTIST_PROFILE',
      });
      return;
    }

    // Chỉ lấy các artist đã được verify
    const whereCondition = {
      isVerified: true,
      role: Role.ARTIST,
    };

    const [artists, total] = await Promise.all([
      prisma.artistProfile.findMany({
        where: whereCondition,
        skip: offset,
        take: limitNumber,
        select: artistProfileSelect,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.artistProfile.count({
        where: whereCondition,
      }),
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
      select: artistProfileSelect,
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

export const getArtistAlbums = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const user = req.user;

  if (!user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id },
      select: { id: true, isVerified: true, userId: true },
    });

    if (!artistProfile) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    let whereCondition: any = { artistId: id };

    // Nếu là user thường: chỉ xem album active
    if (user.role !== Role.ADMIN && user.id !== artistProfile.userId) {
      whereCondition.isActive = true;

      // Kiểm tra artist đã verify chưa
      if (!artistProfile.isVerified) {
        res.status(403).json({ message: 'Artist is not verified' });
        return;
      }
    }

    // Nếu là chính artist: xem cả active và inactive
    if (user.id === artistProfile.userId) {
      whereCondition = { artistId: id };
    }

    const [albums, total] = await Promise.all([
      prisma.album.findMany({
        where: whereCondition,
        skip: offset,
        take: Number(limit),
        select: albumSelect,
        orderBy: { releaseDate: 'desc' },
      }),
      prisma.album.count({
        where: whereCondition,
      }),
    ]);

    res.json({
      albums,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
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
  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const user = req.user;

  if (!user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id },
      select: { id: true, isVerified: true, userId: true },
    });

    if (!artistProfile) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    let whereCondition: any = { artistId: id };

    if (user.role !== Role.ADMIN && user.id !== artistProfile.userId) {
      whereCondition.isActive = true;
      if (!artistProfile.isVerified) {
        res.status(403).json({ message: 'Artist is not verified' });
        return;
      }
    }

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where: whereCondition,
        skip: offset,
        take: Number(limit),
        select: trackSelect,
        orderBy: { releaseDate: 'desc' },
      }),
      prisma.track.count({
        where: whereCondition,
      }),
    ]);

    res.json({
      tracks,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching artist tracks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateArtistProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { bio, socialMediaLinks, genreIds, isVerified, artistName } = req.body;
  const user = req.user;

  try {
    const { canEdit, message } = await canEditArtistData(user, id);
    if (!canEdit) {
      res.status(403).json({ success: false, message });
      return;
    }

    // Kiểm tra nếu user không phải ADMIN mà cố gắng thay đổi trạng thái verify
    if (isVerified !== undefined && user?.role !== Role.ADMIN) {
      res.status(403).json({
        success: false,
        message: 'Only admin can change verification status',
      });
      return;
    }

    // Parse socialMediaLinks nếu là string
    let parsedSocialMediaLinks = socialMediaLinks;
    if (typeof socialMediaLinks === 'string') {
      try {
        parsedSocialMediaLinks = JSON.parse(socialMediaLinks);
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid socialMediaLinks format',
        });
        return;
      }
    }

    // Parse genreIds nếu là string
    let parsedGenreIds = genreIds;
    if (typeof genreIds === 'string') {
      try {
        parsedGenreIds = genreIds.split(',');
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid genreIds format',
        });
        return;
      }
    }

    const error = validateUpdateArtistProfile({
      bio,
      socialMediaLinks: parsedSocialMediaLinks,
      genreIds: parsedGenreIds,
    });
    if (error) {
      res.status(400).json({
        success: false,
        message: error,
      });
      return;
    }

    // Upload avatar nếu có
    let avatarUrl = undefined;
    if (req.file) {
      const result = await uploadFile(
        req.file.buffer,
        'artist-avatars',
        'image'
      );
      avatarUrl = result.secure_url;
    }

    // Kiểm tra genres nếu có
    if (parsedGenreIds?.length > 0) {
      const existingGenres = await prisma.genre.findMany({
        where: { id: { in: parsedGenreIds } },
      });

      if (existingGenres.length !== parsedGenreIds.length) {
        res.status(400).json({
          success: false,
          message: 'One or more genres do not exist',
        });
        return;
      }
    }

    // Cập nhật ArtistProfile
    const updatedArtistProfile = await prisma.artistProfile.update({
      where: { id },
      data: {
        artistName, // Thêm artistName vào đây
        bio,
        ...(avatarUrl && { avatar: avatarUrl }),
        ...(parsedSocialMediaLinks && {
          socialMediaLinks: parsedSocialMediaLinks,
        }),
        ...(isVerified !== undefined && {
          isVerified,
          verifiedAt: isVerified ? new Date() : null,
        }),
        ...(parsedGenreIds && {
          genres: {
            deleteMany: {},
            create: parsedGenreIds.map((genreId: string) => ({
              genreId,
            })),
          },
        }),
      },
      select: artistProfileSelect,
    });

    // Xóa cache liên quan đến artist
    await client.del(`/api/artists/profile/${id}`);
    await client.del(`/api/artists/tracks/${id}`);
    await client.del(`/api/artists/albums/${id}`);
    await client.del(`/api/artists/stats/${id}`);

    res.status(200).json({
      success: true,
      message: 'Artist profile updated successfully',
      data: updatedArtistProfile,
    });
  } catch (error) {
    console.error('Update artist profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * getArtistStats – Lấy thống kê cho Artist
 *  - monthlyListeners: Số người nghe hàng tháng
 *  - albumCount: Số album mà artist có
 *  - trackCount: Số track của artist
 *  - topTracks: 5 track có playCount cao nhất của artist
 */
export const getArtistStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    // Kiểm tra người dùng có profile artist hay không
    if (!user || !user.artistProfile) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    const artistProfileId = user.artistProfile.id;

    // Lấy thông tin: monthlyListeners, số album và số track của artist
    const artistStats = await prisma.artistProfile.findUnique({
      where: { id: artistProfileId },
      select: {
        monthlyListeners: true,
        _count: {
          select: {
            albums: true,
            tracks: true,
          },
        },
      },
    });

    if (!artistStats) {
      res.status(404).json({ message: 'Artist profile not found' });
      return;
    }

    // Truy vấn danh sách Top Tracks: lấy 5 track có playCount cao nhất của artist
    const topTracks = await prisma.track.findMany({
      where: { artistId: artistProfileId },
      select: trackSelect,
      orderBy: { playCount: 'desc' },
      take: 5,
    });

    res.json({
      monthlyListeners: artistStats.monthlyListeners,
      albumCount: artistStats._count.albums,
      trackCount: artistStats._count.tracks,
      topTracks,
    });
  } catch (error) {
    console.error('Get artist stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRelatedArtists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id },
      select: { genres: { select: { genreId: true } } },
    });

    if (!artistProfile) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    const genreIds = artistProfile.genres.map((genre) => genre.genreId);

    const relatedArtist = await prisma.artistProfile.findMany({
      where: {
        genres: {
          some: {
            genreId: {
              in: genreIds,
            },
          },
        },
        isVerified: true,
        id: { not: id },
      },
      select: artistProfileSelect,
      take: 10,
    });

    res.json(relatedArtist);
  } catch (error) {
    console.error('Get similar artists error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
