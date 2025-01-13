import { Request, Response } from 'express';
import prisma from '../config/db';
import { FollowingType, HistoryType, Role } from '@prisma/client';
import { client, setCache } from '../middleware/cache.middleware';
import { uploadFile } from '../services/cloudinary.service';

const userSelect = {
  id: true,
  email: true,
  username: true,
  avatar: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
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
    for (const key in socialMediaLinks) {
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
export const requestArtistRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const {
      artistName,
      bio,
      socialMediaLinks: socialMediaLinksString,
      genres: genresString,
    } = req.body;
    const avatarFile = req.file; // Lấy file từ request

    // Chuyển đổi socialMediaLinks từ chuỗi JSON sang đối tượng JavaScript
    let socialMediaLinks = {};
    if (socialMediaLinksString) {
      try {
        socialMediaLinks = JSON.parse(socialMediaLinksString);
      } catch (error) {
        res
          .status(400)
          .json({ message: 'Invalid JSON format for socialMediaLinks' });
        return;
      }
    }

    // Chuyển đổi genres từ chuỗi sang mảng
    let genres = [];
    if (genresString) {
      try {
        genres = genresString.split(','); // Chuyển chuỗi thành mảng dựa trên dấu phẩy
      } catch (error) {
        res.status(400).json({ message: 'Invalid format for genres' });
        return;
      }
    }

    // Validate dữ liệu nghệ sĩ
    const validationError = validateArtistData({
      artistName,
      bio,
      socialMediaLinks,
      genres,
    });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    // Chỉ USER mới có thể yêu cầu trở thành ARTIST
    if (!user || user.role !== Role.USER) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Kiểm tra xem USER đã gửi yêu cầu trước đó chưa
    const existingRequest = await prisma.artistProfile.findUnique({
      where: { userId: user.id },
      select: { verificationRequestedAt: true },
    });

    if (existingRequest?.verificationRequestedAt) {
      res
        .status(400)
        .json({ message: 'You have already requested to become an artist' });
      return;
    }

    // Upload avatar lên Cloudinary
    let avatarUrl = null;
    if (avatarFile) {
      const uploadResult = await uploadFile(
        avatarFile.buffer,
        'artist-avatars'
      );
      avatarUrl = uploadResult.secure_url;
    }

    // Tạo ArtistProfile với thông tin cung cấp
    await prisma.artistProfile.create({
      data: {
        artistName,
        bio,
        socialMediaLinks,
        avatar: avatarUrl, // Lưu URL avatar vào database
        verificationRequestedAt: new Date(), // Cập nhật trường mới
        user: { connect: { id: user.id } },
        genres: {
          create: genres.map((genreId: string) => ({
            genre: { connect: { id: genreId } },
          })),
        },
      },
    });

    res.json({ message: 'Artist role request submitted successfully' });
  } catch (error) {
    console.error('Request artist role error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Tìm kiếm tổng hợp (Search All)
export const searchAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!q) {
      res.status(400).json({ message: 'Query is required' });
      return;
    }

    const searchQuery = String(q).trim();
    const cacheKey = `/search-all?q=${searchQuery}`;

    // Kiểm tra xem có sử dụng Redis cache không
    const useRedisCache = process.env.USE_REDIS_CACHE === 'true';

    if (useRedisCache) {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log('Serving from Redis cache:', cacheKey);
        res.json(JSON.parse(cachedData));
        return;
      }
    }

    // Lưu lịch sử tìm kiếm
    const existingHistory = await prisma.history.findFirst({
      where: {
        userId: user.id,
        type: HistoryType.SEARCH,
        query: {
          equals: searchQuery,
          mode: 'insensitive',
        },
      },
    });

    if (existingHistory) {
      await prisma.history.update({
        where: { id: existingHistory.id },
        data: { updatedAt: new Date() },
      });
    } else {
      await prisma.history.create({
        data: {
          type: HistoryType.SEARCH,
          query: searchQuery,
          userId: user.id,
        },
      });
    }

    // Thực hiện tìm kiếm album và track song song
    const [artists, albums, tracks, users] = await Promise.all([
      prisma.user.findMany({
        where: {
          isActive: true,
          role: Role.ARTIST,
          id: { not: user.id },
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { username: { contains: searchQuery, mode: 'insensitive' } },
            {
              artistProfile: {
                genres: { some: { genreId: { equals: searchQuery } } },
              },
            },
            {
              artistProfile: {
                artistName: { contains: searchQuery, mode: 'insensitive' },
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          role: true,
          isActive: true,
          artistProfile: {
            select: {
              id: true,
              artistName: true,
              bio: true,
              isVerified: true,
              avatar: true,
              socialMediaLinks: true,
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
            },
          },
        },
      }),

      prisma.album.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            {
              artist: {
                artistName: { contains: searchQuery, mode: 'insensitive' },
              },
            },
            {
              genres: {
                some: {
                  genre: {
                    name: { contains: searchQuery, mode: 'insensitive' },
                  },
                },
              },
            },
          ],
        },
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
          artist: {
            select: {
              id: true,
              artistName: true,
              avatar: true,
              isVerified: true,
            },
          },
          tracks: {
            where: { isActive: true },
            orderBy: { trackNumber: 'asc' },
            select: {
              id: true,
              title: true,
              duration: true,
              releaseDate: true,
              trackNumber: true,
              coverUrl: true,
              audioUrl: true,
              playCount: true,
              type: true,
              artist: {
                select: {
                  id: true,
                  artistName: true,
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
            },
          },
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
      }),

      prisma.track.findMany({
        where: {
          isActive: true,
          OR: [
            {
              title: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
            {
              artist: {
                artistName: {
                  contains: searchQuery,
                  mode: 'insensitive',
                },
              },
            },
            {
              featuredArtists: {
                some: {
                  artistProfile: {
                    artistName: {
                      contains: searchQuery,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
            {
              genres: {
                some: {
                  genre: {
                    name: {
                      contains: searchQuery,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          title: true,
          duration: true,
          releaseDate: true,
          trackNumber: true,
          coverUrl: true,
          audioUrl: true,
          playCount: true,
          type: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          artist: {
            select: {
              id: true,
              artistName: true,
              avatar: true,
              isVerified: true,
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
          album: {
            select: {
              id: true,
              title: true,
              coverUrl: true,
            },
          },
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
        orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
      }),

      prisma.user.findMany({
        where: {
          id: { not: user.id },
          role: Role.USER,
          isActive: true,
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { username: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          isActive: true,
        },
      }),
    ]);

    const searchResult = {
      artists,
      albums,
      tracks,
      users,
    };

    if (useRedisCache) {
      await setCache(cacheKey, searchResult, 600); // Cache trong 10 phút
    }

    res.json(searchResult);
  } catch (error) {
    console.error('Search all error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách tất cả thể loại hiện có
export const getAllGenres = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const genres = await prisma.genre.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    res.json(genres);
  } catch (error) {
    console.error('Get all genres error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Theo dõi người dùng
export const followUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id: followingId } = req.params;
    const { type } = req.body; // USER hoặc ARTIST

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Kiểm tra xem người dùng đã follow chưa
    const existingFollow = await prisma.userFollow.findFirst({
      where: {
        followerId: user.id,
        followingId,
        followingType: type,
      },
    });

    if (existingFollow) {
      res.status(400).json({ message: 'Already following this user/artist' });
      return;
    }

    // Tạo follow mới
    await prisma.userFollow.create({
      data: {
        followerId: user.id,
        followingId,
        followingType: type,
      },
    });

    res.json({ message: 'Followed successfully' });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Hủy theo dõi người dùng
export const unfollowUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id: followingId } = req.params;
    const { type } = req.body; // USER hoặc ARTIST

    // Xóa follow
    await prisma.userFollow.deleteMany({
      where: {
        followerId: user?.id,
        followingId,
        followingType: type,
      },
    });

    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách người theo dõi hiện tại
export const getFollowers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { type } = req.query; // Tùy chọn lọc theo type

    const followers = await prisma.userFollow.findMany({
      where: {
        followingId: user?.id,
        ...(type && { followingType: type as FollowingType }),
      },
      select: {
        follower: {
          select: userSelect,
        },
      },
    });

    res.json(followers.map((f) => f.follower));
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách người đang theo dõi hiện tại
export const getFollowing = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const following = await prisma.userFollow.findMany({
      where: {
        followerId: user.id,
      },
      select: {
        followingUser: {
          select: userSelect,
        },
        followingArtist: {
          select: {
            id: true,
            artistName: true,
            avatar: true,
            user: {
              select: userSelect,
            },
          },
        },
      },
    });

    const followingData = following
      .map((follow) => {
        if (follow.followingUser) {
          return follow.followingUser;
        } else if (follow.followingArtist) {
          return {
            ...follow.followingArtist.user,
            artistProfile: {
              ...follow.followingArtist,
            },
          };
        }
        return null;
      })
      .filter(Boolean);

    res.json(followingData);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
