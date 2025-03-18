import { Request } from 'express';
import prisma from '../config/db';
import { FollowingType, HistoryType, Role } from '@prisma/client';
import { uploadFile } from './upload.service';
import {
  artistProfileSelect,
  searchAlbumSelect,
  searchTrackSelect,
  userSelect,
} from '../utils/prisma-selects';
import { paginate, toBooleanValue } from '../utils/handle-utils';
import { client, setCache } from '../middleware/cache.middleware';
import pusher from '../config/pusher';

// Hàm helper để lấy ngày đầu tháng hiện tại
const getMonthStartDate = (): Date => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

// Hàm validation cho dữ liệu nghệ sĩ
export const validateArtistData = (data: any): string | null => {
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

// Tìm kiếm tất cả
export const search = async (user: any, query: string) => {
  if (!user) {
    throw new Error('Unauthorized');
  }

  const searchQuery = query.trim();
  const cacheKey = `/search-all?q=${searchQuery}`;
  const useRedisCache = process.env.USE_REDIS_CACHE === 'true';

  // Kiểm tra cache
  if (useRedisCache) {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log('Serving from Redis cache:', cacheKey);
      return JSON.parse(cachedData);
    }
  }

  // Lưu lịch sử tìm kiếm
  await saveSearchHistory(user.id, searchQuery);

  // Thực hiện tìm kiếm song song để tối ưu hiệu suất
  const [artists, albums, tracks, users] = await Promise.all([
    // Artist
    prisma.artistProfile.findMany({
      where: {
        isActive: true,
        isVerified: true, // Chỉ lấy nghệ sĩ đã được xác minh
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
      select: {
        id: true,
        artistName: true,
        bio: true,
        isVerified: true,
        avatar: true,
        socialMediaLinks: true,
        monthlyListeners: true,
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            avatar: true,
            role: true,
            isActive: true,
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
      take: 5,
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
      take: 5,
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
      take: 5,
    }),

    // User
    prisma.user.findMany({
      where: {
        id: { not: user.id }, // Không hiển thị chính mình
        role: 'USER', // Chỉ tìm USER, không tìm ADMIN
        isActive: true,
        OR: [
          { username: { contains: searchQuery, mode: 'insensitive' } },
          { name: { contains: searchQuery, mode: 'insensitive' } },
        ],
      },
      select: userSelect,
      take: 5,
    }),
  ]);

  const searchResult = { artists, albums, tracks, users };

  // Cache kết quả
  if (useRedisCache) {
    await setCache(cacheKey, searchResult, 600); // Cache trong 10 phút
  }

  return searchResult;
};

// Helper function để lưu lịch sử tìm kiếm
const saveSearchHistory = async (userId: string, searchQuery: string) => {
  const existingHistory = await prisma.history.findFirst({
    where: {
      userId,
      type: 'SEARCH',
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
        type: 'SEARCH',
        query: searchQuery,
        userId,
      },
    });
  }
};

// Theo dõi người dùng
export const followTarget = async (follower: any, followingId: string) => {
  if (!follower) {
    throw new Error('Unauthorized');
  }

  console.log('=== DEBUG: followUser => route called');
  console.log('=== DEBUG: user =', follower.id);
  console.log('=== DEBUG: followingId =', followingId);

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
    followerId: follower.id,
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
    throw new Error('Target not found');
  }

  // Validate self-follow
  if (
    ((followingType === 'USER' || followingType === 'ARTIST') &&
      followingId === follower.id) ||
    followingId === follower.artistProfile?.id
  ) {
    throw new Error('Cannot follow yourself');
  }

  // Check existing follow
  const existingFollow = await prisma.userFollow.findFirst({
    where: {
      followerId: follower.id,
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
    throw new Error('Already following');
  }

  // Transaction
  return prisma.$transaction(async (tx) => {
    // 1) Tạo record follow
    await tx.userFollow.create({ data: followData });

    // 2) Lấy info user (follower) để hiển thị
    const currentUser = await tx.user.findUnique({
      where: { id: follower.id },
      select: { username: true, email: true },
    });
    const followerName =
      currentUser?.username || currentUser?.email || 'Unknown';

    // 3) Tạo NOTIFICATION cho người được theo dõi
    if (followingType === 'ARTIST') {
      console.log(
        '=== DEBUG: followUser => about to create notification for ARTIST'
      );
      const notification = await tx.notification.create({
        data: {
          type: 'NEW_FOLLOW',
          message: `New follower: ${followerName}`,
          recipientType: 'ARTIST',
          artistId: followingId,
          senderId: follower.id,
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
      console.log(
        '=== DEBUG: followUser => about to create notification for USER->USER follow'
      );
      const notification = await tx.notification.create({
        data: {
          type: 'NEW_FOLLOW',
          message: `New follower: ${followerName}`,
          recipientType: 'USER',
          userId: followingId,
          senderId: follower.id,
        },
      });
      console.log(
        '=== DEBUG: followUser => notification for followed USER created!'
      );

      // Phát sự kiện realtime qua Pusher cho user được follow
      await pusher.trigger(`user-${followingId}`, 'notification', {
        type: 'NEW_FOLLOW',
        message: `New follower: ${followerName}`,
        notificationId: notification.id,
      });
    }

    return { message: 'Followed successfully' };
  });
};

// Hủy theo dõi người dùng
export const unfollowTarget = async (follower: any, followingId: string) => {
  if (!follower) {
    throw new Error('Unauthorized');
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
  const whereConditions: any = {
    followerId: follower.id,
    followingType: 'USER' as FollowingType, // mặc định
  };

  if (userExists) {
    followingType = FollowingType.USER;
    whereConditions.followingUserId = followingId;
  } else if (artistExists) {
    followingType = FollowingType.ARTIST;
    whereConditions.followingArtistId = followingId;
    whereConditions.followingType = FollowingType.ARTIST;
  } else {
    throw new Error('Target not found');
  }

  // Find and delete the follow relation
  const follow = await prisma.userFollow.findFirst({
    where: whereConditions,
  });

  if (!follow) {
    throw new Error('Not following this target');
  }

  // Delete the follow relation and handle artist stats
  await prisma.$transaction(async (tx) => {
    // Delete follow record
    await tx.userFollow.delete({
      where: { id: follow.id },
    });

    // Update artist monthly listeners if unfollowing an artist
    if (followingType === FollowingType.ARTIST) {
      await tx.artistProfile.update({
        where: { id: followingId },
        data: {
          monthlyListeners: {
            decrement: 1,
          },
        },
      });
    }
  });

  return { message: 'Unfollowed successfully' };
};

// Lấy danh sách người theo dõi
export const getUserFollowers = async (req: Request) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const options = {
    where: {
      OR: [
        { followingUserId: userId, followingType: 'USER' },
        {
          followingArtistId: req.user?.artistProfile?.id,
          followingType: 'ARTIST',
        },
      ],
    },
    select: {
      id: true,
      follower: {
        select: userSelect,
      },
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  };

  const result = await paginate(prisma.userFollow, req, options);

  return {
    followers: result.data.map(
      (follow: { follower: typeof userSelect }) => follow.follower
    ),
    pagination: result.pagination,
  };
};

// Lấy danh sách người đang theo dõi
export const getUserFollowing = async (req: Request) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const options = {
    where: {
      followerId: userId,
    },
    select: {
      id: true,
      followingType: true,
      followingUser: {
        select: userSelect,
      },
      followingArtist: {
        select: {
          id: true,
          artistName: true,
          avatar: true,
          bio: true,
          monthlyListeners: true,
          socialMediaLinks: true,
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
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  };

  const result = await paginate(prisma.userFollow, req, options);

  // Mapping followed users and artists
  const following = result.data.map(
    (follow: {
      followingType: 'USER' | 'ARTIST';
      followingUser: any;
      followingArtist: any;
    }) => {
      if (follow.followingType === 'USER') {
        return {
          type: 'USER',
          ...follow.followingUser,
        };
      } else {
        return {
          type: 'ARTIST',
          ...follow.followingArtist,
          user: follow.followingArtist?.user,
        };
      }
    }
  );

  // Trả về mảng trực tiếp thay vì object có pagination
  return following;
};

// Gửi yêu cầu trở thành Artist
export const requestArtistRole = async (
  user: any,
  data: any,
  avatarFile?: Express.Multer.File
) => {
  const {
    artistName,
    bio,
    socialMediaLinks: socialMediaLinksString,
    genres: genresString,
  } = data;

  // Chuyển đổi socialMediaLinks từ chuỗi JSON sang đối tượng JavaScript
  let socialMediaLinks = {};
  if (socialMediaLinksString) {
    socialMediaLinks = JSON.parse(socialMediaLinksString);
  }

  // Chuyển đổi genres từ chuỗi sang mảng
  let genres = [];
  if (genresString) {
    genres = genresString.split(','); // Chuyển chuỗi thành mảng dựa trên dấu phẩy
  }

  // Validate dữ liệu nghệ sĩ
  const validationError = validateArtistData({
    artistName,
    bio,
    socialMediaLinks,
    genres,
  });
  if (validationError) {
    throw new Error(validationError);
  }

  // Chỉ USER mới có thể yêu cầu trở thành ARTIST
  if (
    !user ||
    user.role !== Role.USER ||
    user.artistProfile?.role === Role.ARTIST
  ) {
    throw new Error('Forbidden');
  }

  // Kiểm tra xem USER đã gửi yêu cầu trước đó chưa
  const existingRequest = await prisma.artistProfile.findUnique({
    where: { userId: user.id },
    select: { verificationRequestedAt: true },
  });

  if (existingRequest?.verificationRequestedAt) {
    throw new Error('You have already requested to become an artist');
  }

  // Upload avatar lên Cloudinary
  let avatarUrl = null;
  if (avatarFile) {
    const uploadResult = await uploadFile(avatarFile.buffer, 'artist-avatars');
    avatarUrl = uploadResult.secure_url;
  }

  // Tạo ArtistProfile với thông tin cung cấp
  return prisma.artistProfile.create({
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
};

// Lấy thông tin yêu cầu trở thành nghệ sĩ của người dùng
export const getArtistRequest = async (userId: string) => {
  const artistProfile = await prisma.artistProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      artistName: true,
      avatar: true,
      bio: true,
      isVerified: true,
      verificationRequestedAt: true,
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

  if (!artistProfile) {
    return { hasPendingRequest: false };
  }

  const { verificationRequestedAt, isVerified, ...profileData } = artistProfile;

  return {
    hasPendingRequest: !!verificationRequestedAt && !isVerified,
    profileData,
  };
};

// Lấy tất cả thể loại nhạc
export const getAllGenres = async () => {
  const genres = await prisma.genre.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return genres;
};
