import { Request, Response } from 'express';
import prisma from '../config/db';
import { FollowingType, HistoryType, Role } from '@prisma/client';
import { client, setCache } from '../middleware/cache.middleware';
import { uploadFile } from '../services/cloudinary.service';
import {
  searchAlbumSelect,
  searchTrackSelect,
  userSelect,
} from '../utils/prisma-selects';
import pusher from '../config/pusher';

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
    if (
      !user ||
      user.role !== Role.USER ||
      user.artistProfile?.role === Role.ARTIST
    ) {
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
        avatar: avatarUrl,
        role: Role.ARTIST,
        verificationRequestedAt: new Date(),
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
      // Artist
      prisma.user.findMany({
        where: {
          isActive: true,
          artistProfile: {
            isActive: true,
            OR: [
              {
                artistName: { contains: searchQuery, mode: 'insensitive' },
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

      // Album
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
        select: searchAlbumSelect,
      }),

      // Track
      prisma.track.findMany({
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
              featuredArtists: {
                some: {
                  artistProfile: {
                    artistName: { contains: searchQuery, mode: 'insensitive' },
                  },
                },
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
        select: searchTrackSelect,
        orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
      }),

      // User
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
    console.log('=== DEBUG: followUser => route called');
    const user = req.user; // Người đang follow
    const { id: followingId } = req.params;

    console.log('=== DEBUG: user =', user?.id);
    console.log('=== DEBUG: followingId =', followingId);

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Kiểm tra xem đang follow User hay Artist
    const [userExists, artistExists] = await Promise.all([
      prisma.user.findUnique({ where: { id: followingId } }),
      prisma.artistProfile.findUnique({
        where: { id: followingId },
        select: { id: true },
      }),
    ]);

    let followingType: FollowingType;
    const followData: any = {
      followerId: user.id,
      followingType: 'USER' as FollowingType, // mặc định
    };

    if (userExists) {
      // follow user
      followingType = FollowingType.USER;
      followData.followingUserId = followingId;
    } else if (artistExists) {
      // follow artist
      followingType = FollowingType.ARTIST;
      followData.followingArtistId = followingId;
      followData.followingType = FollowingType.ARTIST;
    } else {
      res.status(404).json({ message: 'Target not found' });
      return;
    }

    // Validate self-follow
    if (
      ((followingType === 'USER' || followingType === 'ARTIST') &&
        followingId === user.id) ||
      followingId === user.artistProfile?.id
    ) {
      res.status(400).json({ message: 'Cannot follow yourself' });
      return;
    }

    // Check existing follow
    const existingFollow = await prisma.userFollow.findFirst({
      where: {
        followerId: user.id,
        OR: [
          {
            followingUserId: followingId,
            followingType: FollowingType.USER,
          },
          {
            followingArtistId: followingId,
            followingType: FollowingType.ARTIST,
          },
        ],
      },
    });
    if (existingFollow) {
      res.status(400).json({ message: 'Already following' });
      return;
    }

    // Transaction
    await prisma.$transaction(async (tx) => {
      // 1) Tạo record follow
      await tx.userFollow.create({ data: followData });

      // 2) Lấy info user (follower) để hiển thị
      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { username: true, email: true },
      });
      const followerName = currentUser?.username || currentUser?.email || 'Unknown';

      // 3) Tạo NOTIFICATION cho người được theo dõi
      if (followingType === 'ARTIST') {
        console.log('=== DEBUG: followUser => about to create notification for ARTIST');
        const notification = await tx.notification.create({
          data: {
            type: 'NEW_FOLLOW',
            message: `New follower: ${followerName}`,
            recipientType: 'ARTIST',
            artistId: followingId,
            senderId: user.id,
          },
        });

        // Update artist stats
        await tx.artistProfile.update({
          where: { id: followingId },
          data: { monthlyListeners: { increment: 1 } },
        });

        // Phát sự kiện realtime qua Pusher cho artist
        await pusher.trigger(`user-${followingId}`, 'notification', {
          type: 'NEW_FOLLOW',
          message: `New follower: ${followerName}`,
          notificationId: notification.id, // Nếu cần gửi ID
        });
      } else {
        // follow user => Tạo noti cho user bị follow
        console.log('=== DEBUG: followUser => about to create notification for USER->USER follow');
        const notification = await tx.notification.create({
          data: {
            type: 'NEW_FOLLOW',
            message: `New follower: ${followerName}`,
            recipientType: 'USER',
            userId: followingId,
            senderId: user.id,
          },
        });
        console.log('=== DEBUG: followUser => notification for followed USER created!');

        // Phát sự kiện realtime qua Pusher cho user được follow
        await pusher.trigger(`user-${followingId}`, 'notification', {
          type: 'NEW_FOLLOW',
          message: `New follower: ${followerName}`,
          notificationId: notification.id,
        });
      }
    });


    // 4) Tạo NOTIFICATION cho CHÍNH user (follower)
    //    để user thấy mình vừa follow ai
    // await tx.notification.create({
    //   data: {
    //     type: 'FOLLOW_CONFIRMATION',
    //     message:
    //       followingType === 'ARTIST'
    //         ? `You are now following artist with id: ${followingId}`
    //         : `You are now following user with id: ${followingId}`,
    //     recipientType: 'USER',     // Vì follower luôn là 1 user
    //     userId: user.id,           // Gửi cho chính user
    //     senderId: user.id,
    //   },
    // });
    // console.log('=== DEBUG: followUser => notification for the follower created!');


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

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Tự động xác định followingType bằng cách kiểm tra followingId
    const [userExists, artistExists] = await Promise.all([
      prisma.user.findUnique({ where: { id: followingId } }),
      prisma.artistProfile.findUnique({ where: { id: followingId } }),
    ]);

    let followingType: FollowingType | null = null;

    if (userExists) {
      followingType = FollowingType.USER;
    } else if (artistExists) {
      followingType = FollowingType.ARTIST;
    } else {
      res.status(404).json({ message: 'Target not found' });
      return;
    }

    // Xóa dựa trên followingType
    const deleteConditions = {
      followerId: user.id,
      followingType: followingType,
      ...(followingType === FollowingType.USER
        ? { followingUserId: followingId }
        : { followingArtistId: followingId }),
    };

    const result = await prisma.userFollow.deleteMany({
      where: deleteConditions,
    });

    if (result.count === 0) {
      res.status(404).json({ message: 'Follow not found' });
      return;
    }

    // Cập nhật monthlyListeners nếu unfollow artist
    if (followingType === FollowingType.ARTIST) {
      await prisma.artistProfile.update({
        where: { id: followingId },
        data: { monthlyListeners: { decrement: 1 } },
      });
    }

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
    const { type } = req.query;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Xây dựng điều kiện where
    const whereConditions: any = {
      OR: [
        {
          followingUserId: user.id, // User
          followingType: FollowingType.USER,
        },
        {
          followingArtistId: user?.artistProfile?.id, // Artist
          followingType: FollowingType.ARTIST,
        },
      ],
    };

    // Lọc theo type nếu có
    if (type) {
      if (type === 'USER') {
        whereConditions.OR = [
          {
            followingUserId: user.id,
            followingType: FollowingType.USER,
          },
        ];
      } else if (type === 'ARTIST') {
        whereConditions.OR = [
          {
            followingArtistId: user.id,
            followingType: FollowingType.ARTIST,
          },
        ];
      }
    }

    const followers = await prisma.userFollow.findMany({
      where: whereConditions,
      select: {
        follower: {
          select: userSelect,
        },
        followingType: true,
      },
    });

    // Format kết quả
    const result = followers.map((f) => ({
      ...f.follower,
      followingType: f.followingType,
    }));

    res.json(result);
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
        followingUserId: true,
        followingArtistId: true,
        followingType: true,
        followingUser: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            artistProfile: {
              select: {
                id: true,
                artistName: true,
              },
            },
          },
        },
        followingArtist: {
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
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    const formattedResults = following.map((follow) => {
      if (follow.followingType === 'USER') {
        return {
          type: 'USER',
          ...follow.followingUser,
        };
      }
      return {
        type: 'ARTIST',
        ...follow.followingArtist,
        user: follow.followingArtist?.user,
      };
    });

    res.json(formattedResults);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Internal server error' });
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
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Kiểm tra xem người dùng đã có yêu cầu trở thành Artist chưa
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        isVerified: true,
        verificationRequestedAt: true,
      },
    });

    if (artistProfile) {
      res.json({
        hasPendingRequest: !!artistProfile.verificationRequestedAt,
        isVerified: artistProfile.isVerified,
      });
    } else {
      res.json({ hasPendingRequest: false, isVerified: false });
    }
  } catch (error) {
    console.error('Check artist request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }

};


export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
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
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({ message: "Internal server error" });
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

    res.json(recommendedArtists);
  } catch (error) {
    console.error('Get recommended artists error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getTopAlbums = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const monthStart = getMonthStartDate();
    
    const albums = await prisma.album.findMany({
      where: { 
        isActive: true,
        tracks: {
          some: {
            isActive: true,
            history: {
              some: {
                type: 'PLAY',
                createdAt: { gte: monthStart }
              }
            }
          }
        }
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
            avatar: true
          }
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
                createdAt: { gte: monthStart }
              },
              select: {
                playCount: true
              }
            }
          },
          orderBy: { trackNumber: 'asc' }
        },
        _count: {
          select: {
            tracks: {
              where: {
                isActive: true,
                history: {
                  some: {
                    type: 'PLAY',
                    createdAt: { gte: monthStart }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        tracks: {
          _count: 'desc'
        }
      },
      take: 20
    });

    // Calculate monthly plays for each album
    const albumsWithMonthlyPlays = albums.map(album => ({
      ...album,
      monthlyPlays: album.tracks.reduce((sum, track) => 
        sum + track.history.reduce((plays, h) => plays + (h.playCount || 0), 0), 0
      )
    }));

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
    const monthStart = getMonthStartDate();

    const artists = await prisma.artistProfile.findMany({
      where: { 
        isVerified: true,
        tracks: {
          some: {
            isActive: true,
            history: {
              some: {
                type: 'PLAY',
                createdAt: { gte: monthStart }
              }
            }
          }
        }
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
                name: true
              }
            }
          }
        },
        tracks: {
          where: { isActive: true },
          select: {
            history: {
              where: {
                type: 'PLAY',
                createdAt: { gte: monthStart }
              },
              select: {
                userId: true,
                playCount: true
              }
            }
          }
        }
      }
    });

    // Calculate actual monthly listeners (unique users) and plays
    const artistsWithMonthlyMetrics = artists.map(artist => {
      const uniqueListeners = new Set();
      let monthlyPlays = 0;

      artist.tracks.forEach(track => {
        track.history.forEach(h => {
          uniqueListeners.add(h.userId);
          monthlyPlays += h.playCount || 0;
        });
      });

      return {
        ...artist,
        monthlyListeners: uniqueListeners.size,
        monthlyPlays
      };
    });

    // Sort by monthly listeners and take top 20
    const topArtists = artistsWithMonthlyMetrics
      .sort((a, b) => b.monthlyListeners - a.monthlyListeners)
      .slice(0, 20);

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
    const monthStart = getMonthStartDate();

    const tracks = await prisma.track.findMany({
      where: {
        isActive: true,
        history: {
          some: {
            type: 'PLAY',
            createdAt: { gte: monthStart }
          }
        }
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
            avatar: true
          }
        },
        album: {
          select: {
            id: true,
            title: true,
            coverUrl: true
          }
        },
        featuredArtists: {
          select: {
            artistProfile: {
              select: {
                id: true,
                artistName: true
              }
            }
          }
        },
        history: {
          where: {
            type: 'PLAY',
            createdAt: { gte: monthStart }
          },
          select: {
            playCount: true
          }
        }
      },
      orderBy: {
        playCount: 'desc'
      },
      take: 20
    });

    // Calculate monthly plays for each track
    const tracksWithMonthlyPlays = tracks.map(track => ({
      ...track,
      monthlyPlays: track.history.reduce((sum, h) => sum + (h.playCount || 0), 0)
    }));

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
}

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
}