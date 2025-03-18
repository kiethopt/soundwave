import { Request, Response } from 'express';
import prisma from '../config/db';
import { FollowingType, HistoryType, Role } from '@prisma/client';
import { client, setCache } from '../middleware/cache.middleware';
import { uploadFile } from '../services/upload.service';
import {
  searchAlbumSelect,
  searchTrackSelect,
  userSelect,
} from '../utils/prisma-selects';
import pusher from '../config/pusher';
import * as userService from '../services/user.service';
import { handleError } from 'src/utils/handle-utils';

const getMonthStartDate = (): Date => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Hàm validation cho dữ liệu nghệ sĩ
const validateArtistData = (data: any): string | null => {
  const { artistName, bio, socialMediaLinks, genres } = data;

  if (!artistName?.trim()) return 'Artist name is required';
  if (artistName.length < 3) return 'Artist name must be at least 3 characters';

  if (bio && bio.length > 500) return 'Bio must be less than 500 characters';

  // Kiểm tra socialMediaLinks
  if (socialMediaLinks) {
    if (
      typeof socialMediaLinks !== 'object' ||
      Array.isArray(socialMediaLinks)
    ) {
      return 'socialMediaLinks must be an object';
    }

    // Chỉ cho phép facebook và instagram
    const allowedPlatforms = ['facebook', 'instagram'];
    for (const key in socialMediaLinks) {
      if (!allowedPlatforms.includes(key)) {
        return `Invalid social media platform: ${key}`;
      }
      if (typeof socialMediaLinks[key] !== 'string') {
        return `socialMediaLinks.${key} must be a string`;
      }
    }
  }

  // Kiểm tra genres
  if (!genres || !Array.isArray(genres) || genres.length === 0) {
    return 'At least one genre is required';
  }

  return null;
};

// Yêu cầu trở thành Artist (Request Artist Role)
export const requestToBecomeArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await userService.requestArtistRole(req.user, req.body, req.file);
    res.json({ message: 'Artist role request submitted successfully' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Forbidden') {
        res.status(403).json({ message: 'Forbidden' });
        return;
      } else if (error.message.includes('already requested')) {
        res.status(400).json({ message: error.message });
        return;
      } else if (error.message.includes('Invalid JSON format')) {
        res.status(400).json({ message: error.message });
        return;
      }
    }
    handleError(res, error, 'Request artist role');
  }
};

// Tìm kiếm tổng hợp (Search All)
export const searchAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q) {
      res.status(400).json({ message: 'Query is required' });
      return;
    }

    const searchQuery = String(q).trim();
    const results = await userService.search(req.user, searchQuery);

    res.json(results);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    handleError(res, error, 'Search');
  }
};

// Lấy danh sách tất cả thể loại hiện có
export const getAllGenres = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const genres = await userService.getAllGenres();
    res.json(genres);
  } catch (error) {
    handleError(res, error, 'Get all genres');
  }
};

// Theo dõi người dùng
export const followUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id: followingId } = req.params;
    const result = await userService.followTarget(req.user, followingId);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Target not found') {
        res.status(404).json({ message: 'Target not found' });
        return;
      } else if (error.message === 'Cannot follow yourself') {
        res.status(400).json({ message: 'Cannot follow yourself' });
        return;
      } else if (error.message === 'Already following') {
        res.status(400).json({ message: 'Already following' });
        return;
      } else if (error.message === 'Unauthorized') {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
    }
    handleError(res, error, 'Follow user');
  }
};

// Hủy theo dõi người dùng
export const unfollowUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id: followingId } = req.params;
    const result = await userService.unfollowTarget(req.user, followingId);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Target not found') {
        res.status(404).json({ message: 'Target not found' });
        return;
      } else if (error.message === 'Not following this target') {
        res.status(400).json({ message: 'Not following this target' });
        return;
      } else if (error.message === 'Unauthorized') {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
    }
    handleError(res, error, 'Unfollow user');
  }
};

// Lấy danh sách người theo dõi hiện tại
export const getFollowers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const followers = await userService.getUserFollowers(req);
    res.json(followers);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    handleError(res, error, 'Get followers');
  }
};

// Lấy danh sách người đang theo dõi hiện tại
export const getFollowing = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const following = await userService.getUserFollowing(req);
    res.json(following);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    handleError(res, error, 'Get following');
  }
};

// Cập nhật thông tin người dùng thông tin là FormData
export const editProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { email, username, name, avatar } = req.body;
    const avatarFile = req.file; // Lấy file từ request

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Kiểm tra email đã tồn tại chưa
    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== user.id) {
        res.status(400).json({ message: 'Email already in use' });
        return;
      }
    }

    // Kiểm tra username đã tồn tại chưa
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUsername && existingUsername.id !== user.id) {
        res.status(400).json({ message: 'Username already in use' });
        return;
      }
    }

    // Upload avatar lên Cloudinary nếu có file
    let avatarUrl = null;
    if (avatarFile) {
      const uploadResult = await uploadFile(avatarFile.buffer, 'user-avatars');
      avatarUrl = uploadResult.secure_url;
    }

    // Xây dựng dữ liệu cập nhật chỉ với các trường hợp lệ
    const updateData: Record<string, any> = {};
    if (email) updateData.email = email;
    if (username) updateData.username = username;
    if (name) updateData.name = name;
    if (avatarFile) updateData.avatar = avatarUrl;
    else if (avatar) updateData.avatar = avatar;

    // Nếu không có gì để cập nhật
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ message: 'No data provided for update' });
      return;
    }

    // Cập nhật thông tin người dùng
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: userSelect,
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Edit profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Thêm hàm kiểm tra yêu cầu trở thành Artist
export const checkArtistRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const request = await userService.getArtistRequest(req.user.id);
    res.json(request);
  } catch (error) {
    handleError(res, error, 'Check artist request');
  }
};

export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatar: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách nghệ sĩ được đề xuất theo genre trong lịch sử nghe nhạc
export const getRecommendedArtists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const cacheKey = `/api/user/${user.id}/recommended-artists`;

    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        res.json(JSON.parse(cachedData));
        return;
      }
    }

    const history = await prisma.history.findMany({
      where: {
        userId: user.id,
        type: HistoryType.PLAY,
        playCount: { gt: 0 },
      },
      select: {
        track: {
          select: {
            artist: {
              select: {
                id: true,
                artistName: true,
                avatar: true,
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
          },
        },
      },
      take: 3,
    });

    const genreIds = history
      .flatMap((h) => h.track?.artist.genres.map((g) => g.genre.id) || [])
      .filter((id) => id !== null);

    const recommendedArtists = await prisma.artistProfile.findMany({
      where: {
        isVerified: true,
        genres: {
          some: {
            genreId: {
              in: genreIds,
            },
          },
        },
      },
      select: {
        id: true,
        artistName: true,
        bio: true,
        avatar: true,
        role: true,
        socialMediaLinks: true,
        monthlyListeners: true,
        isVerified: true,
        isActive: true,
        verificationRequestedAt: true,
        verifiedAt: true,
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
    });

    if (process.env.USE_REDIS_CACHE === 'true') {
      await setCache(cacheKey, recommendedArtists, 1800); // Cache for 30 mins
    }

    res.json(recommendedArtists);
  } catch (error) {
    console.error('Get recommended artists error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTopAlbums = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cacheKey = '/api/top-albums';
    const monthStart = getMonthStartDate();

    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        res.json(JSON.parse(cachedData));
        return;
      }
    }

    const albums = await prisma.album.findMany({
      where: {
        isActive: true,
        tracks: {
          some: {
            isActive: true,
            history: {
              some: {
                type: 'PLAY',
                createdAt: { gte: monthStart },
              },
            },
          },
        },
      },
      select: {
        id: true,
        title: true,
        coverUrl: true,
        type: true,
        artist: {
          select: {
            id: true,
            artistName: true,
            avatar: true,
          },
        },
        tracks: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            coverUrl: true,
            duration: true,
            audioUrl: true,
            playCount: true,
            history: {
              where: {
                type: 'PLAY',
                createdAt: { gte: monthStart },
              },
              select: {
                playCount: true,
              },
            },
          },
          orderBy: { trackNumber: 'asc' },
        },
        _count: {
          select: {
            tracks: {
              where: {
                isActive: true,
                history: {
                  some: {
                    type: 'PLAY',
                    createdAt: { gte: monthStart },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        tracks: {
          _count: 'desc',
        },
      },
      take: 20,
    });

    // Calculate monthly plays for each album
    const albumsWithMonthlyPlays = albums.map((album) => ({
      ...album,
      monthlyPlays: album.tracks.reduce(
        (sum, track) =>
          sum +
          track.history.reduce((plays, h) => plays + (h.playCount || 0), 0),
        0
      ),
    }));

    if (process.env.USE_REDIS_CACHE === 'true') {
      await setCache(cacheKey, albumsWithMonthlyPlays, 1800); // Cache for 30 mins
    }

    res.json(albumsWithMonthlyPlays);
  } catch (error) {
    console.error('Get top albums error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTopArtists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cacheKey = '/api/top-artists';
    const monthStart = getMonthStartDate();

    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        res.json(JSON.parse(cachedData));
        return;
      }
    }

    const artists = await prisma.artistProfile.findMany({
      where: {
        isVerified: true,
        tracks: {
          some: {
            isActive: true,
            history: {
              some: {
                type: 'PLAY',
                createdAt: { gte: monthStart },
              },
            },
          },
        },
      },
      select: {
        id: true,
        artistName: true,
        avatar: true,
        monthlyListeners: true,
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
        tracks: {
          where: { isActive: true },
          select: {
            history: {
              where: {
                type: 'PLAY',
                createdAt: { gte: monthStart },
              },
              select: {
                userId: true,
                playCount: true,
              },
            },
          },
        },
      },
    });

    // Calculate actual monthly listeners (unique users) and plays
    const artistsWithMonthlyMetrics = artists.map((artist) => {
      const uniqueListeners = new Set();
      let monthlyPlays = 0;

      artist.tracks.forEach((track) => {
        track.history.forEach((h) => {
          uniqueListeners.add(h.userId);
          monthlyPlays += h.playCount || 0;
        });
      });

      return {
        ...artist,
        monthlyListeners: uniqueListeners.size,
        monthlyPlays,
      };
    });

    // Sort by monthly listeners and take top 20
    const topArtists = artistsWithMonthlyMetrics
      .sort((a, b) => b.monthlyListeners - a.monthlyListeners)
      .slice(0, 20);

    if (process.env.USE_REDIS_CACHE === 'true') {
      await setCache(cacheKey, topArtists, 1800); // Cache for 30 mins
    }

    res.json(topArtists);
  } catch (error) {
    console.error('Get top artists error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTopTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cacheKey = '/api/top-tracks';
    const monthStart = getMonthStartDate();

    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        res.json(JSON.parse(cachedData));
        return;
      }
    }

    const tracks = await prisma.track.findMany({
      where: {
        isActive: true,
        history: {
          some: {
            type: 'PLAY',
            createdAt: { gte: monthStart },
          },
        },
      },
      select: {
        id: true,
        title: true,
        coverUrl: true,
        duration: true,
        audioUrl: true,
        playCount: true,
        artist: {
          select: {
            id: true,
            artistName: true,
            avatar: true,
          },
        },
        album: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
          },
        },
        featuredArtists: {
          select: {
            artistProfile: {
              select: {
                id: true,
                artistName: true,
              },
            },
          },
        },
        history: {
          where: {
            type: 'PLAY',
            createdAt: { gte: monthStart },
          },
          select: {
            playCount: true,
          },
        },
      },
      orderBy: {
        playCount: 'desc',
      },
      take: 20,
    });

    // Calculate monthly plays for each track
    const tracksWithMonthlyPlays = tracks.map((track) => ({
      ...track,
      monthlyPlays: track.history.reduce(
        (sum, h) => sum + (h.playCount || 0),
        0
      ),
    }));

    if (process.env.USE_REDIS_CACHE === 'true') {
      await setCache(cacheKey, tracksWithMonthlyPlays, 1800); // Cache for 30 mins
    }

    res.json(tracksWithMonthlyPlays);
  } catch (error) {
    console.error('Get top tracks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách track mới nhất
export const getNewestTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tracks = await prisma.track.findMany({
      where: { isActive: true },
      select: searchTrackSelect,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json(tracks);
  } catch (error) {
    console.error('Get newest tracks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách album mới nhất
export const getNewestAlbums = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const albums = await prisma.album.findMany({
      where: { isActive: true },
      select: searchAlbumSelect,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json(albums);
  } catch (error) {
    console.error('Get newest albums error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
