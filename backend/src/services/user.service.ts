import prisma from '../config/db';
import { FollowingType, HistoryType, Role, User, ClaimStatus, NotificationType, RecipientType, RequestStatus, Prisma } from '@prisma/client';
import { uploadFile } from './upload.service';
import {
  searchAlbumSelect,
  searchTrackSelect,
  userSelect,
} from '../utils/prisma-selects';
import { client, setCache } from '../middleware/cache.middleware';
import * as emailService from './email.service';
import { getUserSockets, getIO } from '../config/socket';
import * as trackService from './track.service'

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

    // Chỉ cho phép facebook và instagram, nhưng BỎ QUA key tạm thời _requestedLabel
    const allowedPlatforms = ['facebook', 'instagram'];
    for (const key in socialMediaLinks) {
      // Bỏ qua key tạm thời của chúng ta
      if (key === '_requestedLabel') {
        continue;
      }
      // Kiểm tra các key còn lại
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
      take: 15,
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
      take: 15,
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
      take: 15,
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
      take: 15,
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

  const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

  let followingType: FollowingType;
  let followedUserEmail: string | null = null;
  let followedEntityName: string = 'Người dùng';
  let followedUserIdForPusher: string | null = null;
  let isSelfFollow = false;
  let recipientCurrentProfile: string | null = null;

  const targetUser = await prisma.user.findUnique({
    where: { id: followingId },
    select: { id: true, email: true, name: true, username: true, currentProfile: true },
  });

  const targetArtistProfile = await prisma.artistProfile.findUnique({
    where: { id: followingId },
    select: { id: true, artistName: true, userId: true },
  });

  if (targetUser) {
    followingType = FollowingType.USER;
    followedUserEmail = targetUser.email;
    followedEntityName = targetUser.name || targetUser.username || 'Người dùng';
    followedUserIdForPusher = targetUser.id;
    isSelfFollow = targetUser.id === follower.id;
    recipientCurrentProfile = targetUser.currentProfile;
  } else if (targetArtistProfile) {
    followingType = FollowingType.ARTIST;
    let artistOwner: { email: string | null, name: string | null, username: string | null, currentProfile: string | null } | null = null;
    if (targetArtistProfile.userId) {
      artistOwner = await prisma.user.findUnique({
        where: { id: targetArtistProfile.userId },
        select: { email: true, name: true, username: true, currentProfile: true },
      });
    }
    followedUserEmail = artistOwner?.email || null;
    followedEntityName = targetArtistProfile.artistName || 'Nghệ sĩ';
    followedUserIdForPusher = targetArtistProfile.userId;
    isSelfFollow = targetArtistProfile.userId === follower.id;
    recipientCurrentProfile = artistOwner?.currentProfile || null;
  } else {
    throw new Error('Target not found');
  }

  if (isSelfFollow) {
    throw new Error('Cannot follow yourself');
  }

  const existingFollow = await prisma.userFollow.findFirst({
    where: {
      followerId: follower.id,
      followingType: followingType,
      ...(followingType === 'USER' && { followingUserId: followingId }),
      ...(followingType === 'ARTIST' && { followingArtistId: followingId }),
    },
  });
  if (existingFollow) {
    throw new Error('Already following');
  }

  const followData: any = {
    followerId: follower.id,
    followingType: followingType,
    ...(followingType === 'USER' && { followingUserId: followingId }),
    ...(followingType === 'ARTIST' && { followingArtistId: followingId }),
  };

  return prisma.$transaction(async (tx) => {
    await tx.userFollow.create({ data: followData });

    const followerName = follower.name || follower.username || 'A user';
    const followerProfileLink = `${FRONTEND_URL}/user/${follower.id}`;

    let notificationMessage: string | null = null;
    let notificationRecipientType: FollowingType | null = null;

    // Determine message and recipient type based ONLY on who was followed
    if (followingType === FollowingType.USER) {
      notificationMessage = `${followerName} started following your profile.`;
      notificationRecipientType = FollowingType.USER;
    } else if (followingType === FollowingType.ARTIST) {
      notificationMessage = `You have a new follower on your artist profile.`;
      notificationRecipientType = FollowingType.ARTIST;
    }

    if (followedUserEmail && notificationMessage) {
      try {
        const emailOptions = emailService.createNewFollowerEmail(
          followedUserEmail,
          followerName,
          followedEntityName,
          followerProfileLink
        );
        await emailService.sendEmail(emailOptions);
      } catch (error) {
        console.error('Failed to send email:', error);
      }
    }

    // Send notification and socket event if a message was generated
    if (followedUserIdForPusher && notificationMessage && notificationRecipientType) {
      try {
        const notification = await tx.notification.create({
          data: {
            type: 'NEW_FOLLOW',
            message: notificationMessage,
            recipientType: notificationRecipientType,
            ...(notificationRecipientType === 'USER' && { userId: followingId }),
            ...(notificationRecipientType === 'ARTIST' && { artistId: followingId }),
            senderId: follower.id,
          },
        });

        // Emit directly to the user's socket ID if they are connected
        const io = getIO();
        const userSocketsMap = getUserSockets();
        const targetSocketId = userSocketsMap.get(followedUserIdForPusher);

        if (targetSocketId) {
           console.log(`[Socket Emit] Sending NEW_FOLLOW notification to user ${followedUserIdForPusher} via socket ${targetSocketId}`);
           io.to(targetSocketId).emit('notification', {
           id: notification.id,
           type: 'NEW_FOLLOW',
           message: notificationMessage,
           recipientType: notificationRecipientType,
           isRead: false,
           createdAt: notification.createdAt.toISOString(),
           sender: {
             id: follower.id,
             name: follower.name || follower.username,
             avatar: follower.avatar
           }
         });
        } else {
           console.log(`[Socket Emit] User ${followedUserIdForPusher} not connected, skipping NEW_FOLLOW socket event.`);
        }
      } catch (error) {
        console.error('Error creating or sending notification:', error);
      }
    }

    // Cập nhật monthlyListeners cho ARTIST (không phụ thuộc vào currentProfile)
    if (followingType === FollowingType.ARTIST) {
      await tx.artistProfile.update({
        where: { id: followingId },
        data: { monthlyListeners: { increment: 1 } },
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
    followingType: 'USER' as FollowingType,
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

  const follow = await prisma.userFollow.findFirst({
    where: whereConditions,
  });

  if (!follow) {
    throw new Error('Not following this target');
  }

  await prisma.$transaction(async (tx) => {
    await tx.userFollow.delete({
      where: { id: follow.id },
    });

    // Giảm monthlyListeners cho ARTIST (không phụ thuộc vào currentProfile)
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
export const getUserFollowers = async (userId: string) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      followVisibility: true,
      artistProfile: {
        select: {
          id: true
        }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const options = {
    where: {
      OR: [
        { followingUserId: userId, followingType: 'USER' as FollowingType },
      ],
    },
    select: {
      id: true,
      follower: {
        select: userSelect,
      },
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  };

  const followers = await prisma.userFollow.findMany(options);

  return {
    followers: followers.map((follow) => follow.follower),
    canView: true
  };
};

// Lấy danh sách người đang theo dõi
export const getUserFollowing = async (userId: string) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      followVisibility: true
    }
  });

  if (!user) {
    throw new Error('User not found');
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
    orderBy: { createdAt: 'desc' as const },
  };

  const following = await prisma.userFollow.findMany(options);

  // Mapping followed users and artists
  return following.map((follow) => {
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
  });
};

// Gửi yêu cầu trở thành Artist
export const requestArtistRole = async (
  user: Pick<User, 'id' | 'role'>,
  data: {
    artistName: string;
    bio?: string;
    socialMediaLinks?: string;
    requestedLabelName?: string;
    genres?: string;
  },
  avatarFileDirect?: Express.Multer.File,
  idVerificationDocumentFileDirect?: Express.Multer.File
) => {
  const {
    artistName,
    bio,
    socialMediaLinks: socialMediaLinksString,
    requestedLabelName,
    genres: genresString,
  } = data;

  // Basic validation
  if (!artistName?.trim()) {
    throw { status: 400, message: 'Artist name is required.' };
  }
  if (artistName.trim().length < 2) {
    throw { status: 400, message: 'Artist name must be at least 2 characters.' };
  }
  if (bio && bio.length > 1000) {
    throw { status: 400, message: 'Bio must be less than 1000 characters.' };
  }
  if (requestedLabelName && requestedLabelName.length > 100) {
    throw { status: 400, message: 'Requested label name cannot exceed 100 characters.' };
  }

  // Chỉ USER mới có thể yêu cầu trở thành ARTIST
  if (!user || user.role !== Role.USER) {
    throw { status: 403, message: 'Only users can request to become an artist.' };
  }

  // Kiểm tra xem USER đã gửi yêu cầu ArtistRequest nào đang PENDING chưa
  const existingPendingRequest = await prisma.artistRequest.findFirst({
    where: {
      userId: user.id,
      status: RequestStatus.PENDING,
    },
  });

  if (existingPendingRequest) {
    throw { status: 400, message: 'You already have a pending request to become an artist. Please wait for it to be processed.' };
  }

  // Xử lý socialMediaLinks từ chuỗi JSON
  let socialMediaLinksJson: Prisma.JsonValue | undefined = undefined;
  if (socialMediaLinksString) {
    try {
      socialMediaLinksJson = JSON.parse(socialMediaLinksString);
    } catch (e) {
      console.error("Error parsing socialMediaLinksString:", e);
      throw { status: 400, message: 'Invalid format for social media links.' };
    }
  }

  let avatarUrl: string | null = null;
  if (avatarFileDirect) {
    try {
      const uploadResult = await uploadFile(avatarFileDirect.buffer, 'artist-request-avatars');
      avatarUrl = uploadResult.secure_url;
    } catch (uploadError) {
      console.error("Error uploading avatar for artist request:", uploadError);
      throw { status: 500, message: "Failed to upload avatar. Please try again."};
    }
  }

  let idVerificationDocumentUrl: string | null = null;
  if (idVerificationDocumentFileDirect) {
    try {
      const uploadResult = await uploadFile(idVerificationDocumentFileDirect.buffer, 'artist-request-id-docs');
      idVerificationDocumentUrl = uploadResult.secure_url;
    } catch (uploadError) {
      console.error("Error uploading ID verification document for artist request:", uploadError);
      throw { status: 500, message: "Failed to upload ID verification document. Please try again."};
    }
  }
  
  // Process genres string into an array
  const requestedGenresArray = genresString?.split(',').map(g => g.trim()).filter(g => g) || [];

  // Tạo ArtistRequest mới
  const newArtistRequest = await prisma.artistRequest.create({
    data: {
      userId: user.id,
      artistName: artistName.trim(),
      bio: bio?.trim(),
      avatarUrl: avatarUrl,
      socialMediaLinks: socialMediaLinksJson || Prisma.JsonNull,
      requestedGenres: requestedGenresArray,
      requestedLabelName: requestedLabelName?.trim() || null,
      status: RequestStatus.PENDING,
    },
    select: {
      id: true,
      artistName: true,
      status: true,
      avatarUrl: true,
      requestedGenres: true,
      user: { select: { id: true, name: true, username: true, avatar: true } }, // Select user for notification
    }
  });

  // --- START: Notify Admins about new Artist Request ---
  try {
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    const requestingUserName = newArtistRequest.user.name || newArtistRequest.user.username || 'A user';
    const notificationMessage = `User '${requestingUserName}' has submitted a request to become artist '${newArtistRequest.artistName}'.`;

    const notificationPromises = admins.map(admin =>
      prisma.notification.create({
        data: {
          type: NotificationType.ARTIST_REQUEST_SUBMITTED,
          message: notificationMessage,
          recipientType: RecipientType.USER,
          userId: admin.id,
          senderId: user.id,
          artistRequestId: newArtistRequest.id,
        },
        select: {
          id: true, type: true, message: true, recipientType: true, userId: true, 
          senderId: true, artistRequestId: true, createdAt: true, isRead: true 
        }
      })
    );
    const createdNotifications = await Promise.all(notificationPromises);

    const io = getIO();
    const userSocketsMap = getUserSockets();

    createdNotifications.forEach(notification => {
      const adminSocketId = userSocketsMap.get(notification.userId as string);
      if (adminSocketId) {
        console.log(`[Socket Emit] Sending ARTIST_REQUEST_SUBMITTED notification to admin ${notification.userId} via socket ${adminSocketId}`);
        io.to(adminSocketId).emit('notification', {
          id: notification.id,
          type: notification.type,
          message: notification.message,
          recipientType: notification.recipientType,
          isRead: notification.isRead,
          createdAt: notification.createdAt.toISOString(),
          artistRequestId: notification.artistRequestId,
          senderId: notification.senderId,
          requestingUser: {
            id: newArtistRequest.user.id,
            name: newArtistRequest.user.name,
            username: newArtistRequest.user.username,
            avatar: newArtistRequest.user.avatar,
          },
          artistRequestDetails: {
            id: newArtistRequest.id,
            artistName: newArtistRequest.artistName,
            avatarUrl: newArtistRequest.avatarUrl,
          }
        });
      } else {
        console.log(`[Socket Emit] Admin ${notification.userId} not connected, skipping ARTIST_REQUEST_SUBMITTED socket event.`);
      }
    });

  } catch (notificationError) {
    console.error("[Notify Error] Failed to create admin notifications for new artist request:", notificationError);
  }
  // --- END: Notify Admins ---

  return {
    message: 'Artist request submitted successfully. It will be reviewed by an administrator.',
    request: newArtistRequest,
  };
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

// Function to get only genres with associated content for Discover page
export const getDiscoverGenres = async () => {
  const genres = await prisma.genre.findMany({
    where: {
      OR: [
        { tracks: { some: { track: { isActive: true } } } },       // Has at least one active track
        { albums: { some: { album: { isActive: true } } } },       // Has at least one active album
        { artistProfiles: { some: { artistProfile: { isActive: true, isVerified: true } } } } // Has at least one active & verified artist
      ],
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return genres;
};

export const editProfile = async (
  user: any,
  profileData: any,
  avatarFile: Express.Multer.File | undefined
) => {
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { email, username, name, avatar, password, currentPassword, newPassword, newEmail } = profileData;

  // Kiểm tra email đã tồn tại chưa
  if (newEmail) {
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser && existingUser.id !== user.id) {
      throw new Error('Email already in use');
    }

    // Verify currentPassword if changing email
    if (currentPassword) {
      const userWithPassword = await prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true }
      });
      
      const bcrypt = require('bcrypt');
      const isPasswordValid = await bcrypt.compare(currentPassword, userWithPassword?.password);
      
      if (!isPasswordValid) {
        throw new Error('Incorrect password');
      }
    } else {
      throw new Error('Current password is required to change email');
    }
  }

  // Kiểm tra username đã tồn tại chưa
  if (username) {
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername && existingUsername.id !== user.id) {
      throw new Error('Username already in use');
    }
  }

  // Handle password change
  if (newPassword && currentPassword) {
    const userWithPassword = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true }
    });
    
    const bcrypt = require('bcrypt');
    const isPasswordValid = await bcrypt.compare(currentPassword, userWithPassword?.password);
    
    if (!isPasswordValid) {
      throw new Error('Incorrect password');
    }
  } else if (newPassword && !currentPassword) {
    throw new Error('Current password is required to change password');
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
  if (newEmail) updateData.email = newEmail;
  if (username) updateData.username = username;
  if (name) updateData.name = name;
  if (avatarFile) updateData.avatar = avatarUrl;
  else if (avatar) updateData.avatar = avatar;
  
  // Hash password if provided
  if (newPassword) {
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    updateData.password = hashedPassword;
  } else if (password) {
    // Handle legacy plain password (should be removed in production)
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    updateData.password = hashedPassword;
  }

  // Nếu không có gì để cập nhật
  if (Object.keys(updateData).length === 0) {
    throw new Error('No data provided for update');
  }

  // Cập nhật thông tin người dùng
  return prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: userSelect,
  });
};

export const getUserProfile = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      followVisibility: true,
      username: true,
      avatar: true,
      role: true,
      isActive: true,
      playlists: {
        where: {
          privacy: 'PUBLIC',
        },
        select: {
          id: true,
          name: true,
          coverUrl: true,
          type: true,
          totalTracks: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 20,
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

export const getRecommendedArtists = async (user: any) => {
  if (!user) {
    throw new Error('Unauthorized');
  }

  const cacheKey = `/api/user/${user.id}/recommended-artists`;

  if (process.env.USE_REDIS_CACHE === 'true') {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
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
    .filter((id): id is string => typeof id === 'string');

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
    take: 15
  });

  if (process.env.USE_REDIS_CACHE === 'true') {
    await setCache(cacheKey, recommendedArtists, 1800); // Cache for 30 mins
  }

  return recommendedArtists;
};

export const getTopAlbums = async () => {
  const cacheKey = '/api/top-albums';
  const monthStart = getMonthStartDate();

  if (process.env.USE_REDIS_CACHE === 'true') {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
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
    select: searchAlbumSelect,
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (process.env.USE_REDIS_CACHE === 'true') {
    await setCache(cacheKey, albums, 1800); // Cache for 30 mins
  }

  return albums;
};

export const getTopArtists = async () => {
  const cacheKey = '/api/top-artists';
  const monthStart = getMonthStartDate();

  if (process.env.USE_REDIS_CACHE === 'true') {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
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

  return topArtists;
};

export const getTopTracks = async () => {
  const cacheKey = '/api/top-tracks';
  const monthStart = getMonthStartDate();

  if (process.env.USE_REDIS_CACHE === 'true') {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
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
    monthlyPlays: track.history.reduce((sum, h) => sum + (h.playCount || 0), 0),
  }));

  if (process.env.USE_REDIS_CACHE === 'true') {
    await setCache(cacheKey, tracksWithMonthlyPlays, 1800); // Cache for 30 mins
  }

  return tracksWithMonthlyPlays;
};

export const getNewestTracks = async () => {
  return prisma.track.findMany({
    where: { isActive: true },
    select: searchTrackSelect,
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
};

export const getNewestAlbums = async () => {
  return prisma.album.findMany({
    where: { isActive: true },
    select: searchAlbumSelect,
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
};

export const getUserTopTracks = async (user: any) => {
  if (!user) {
    throw new Error('Unauthorized');
  }

  const monthStart = getMonthStartDate();

  // Get user's history for the current month
  const history = await prisma.history.findMany({
    where: {
      userId: user.id,
      type: 'PLAY',
      createdAt: { gte: monthStart },
      track: {
        isActive: true,
      },
    },
    select: {
      trackId: true,
      playCount: true,
    },
  });

  // Aggregate play counts by track
  const trackPlayCounts = history.reduce((acc, curr) => {
    if (!curr.trackId) return acc;
    acc[curr.trackId] = (acc[curr.trackId] || 0) + (curr.playCount || 0);
    return acc;
  }, {} as Record<string, number>);

  // Sort track IDs by play count
  const sortedTrackIds = Object.entries(trackPlayCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([id]) => id)
    .slice(0, 10);

  if (sortedTrackIds.length === 0) {
    return [];
  }

  // Get track details and preserve user's play order
  const tracks = await prisma.track.findMany({
    where: {
      id: { in: sortedTrackIds },
      isActive: true,
    },
    select: searchTrackSelect,
  });

  // Create a map for sorting by user's play count
  const trackOrder = new Map(sortedTrackIds.map((id, index) => [id, index]));

  // Sort tracks according to user's play count order
  return tracks.sort(
    (a, b) => (trackOrder.get(a.id) || 0) - (trackOrder.get(b.id) || 0)
  );
};

export const getUserTopArtists = async (user: any) => {
  if (!user) {
    throw new Error('Unauthorized');
  }

  const monthStart = getMonthStartDate();

  // Get user's history for the current month
  const history = await prisma.history.findMany({
    where: {
      userId: user.id,
      type: 'PLAY',
      createdAt: { gte: monthStart },
      track: {
        isActive: true,
        artist: {
          isActive: true,
        },
      },
    },
    select: {
      track: {
        select: {
          artistId: true,
        },
      },
    },
  });

  // Aggregate play counts by artist
  const artistPlayCounts = history.reduce((acc, curr) => {
    if (!curr.track?.artistId) return acc;
    acc[curr.track.artistId] = (acc[curr.track.artistId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort artist IDs by play count
  const sortedArtistIds = Object.entries(artistPlayCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([id]) => id)
    .slice(0, 10);

  if (sortedArtistIds.length === 0) {
    return [];
  }

  // Get artist details and preserve user's play order
  const artists = await prisma.artistProfile.findMany({
    where: {
      id: { in: sortedArtistIds },
      isActive: true,
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
    },
  });

  // Create a map for sorting by user's play count
  const artistOrder = new Map(sortedArtistIds.map((id, index) => [id, index]));

  // Sort artists according to user's play count order
  return artists.sort(
    (a, b) => (artistOrder.get(a.id) || 0) - (artistOrder.get(b.id) || 0)
  );
};

export const getUserTopAlbums = async (user: any) => {
  if (!user) {
    throw new Error('Unauthorized');
  }

  const monthStart = getMonthStartDate();

  // Get user's history for the current month
  const history = await prisma.history.findMany({
    where: {
      userId: user.id,
      type: 'PLAY',
      createdAt: { gte: monthStart },
      track: {
        isActive: true,
        album: {
          isActive: true,
        },
      },
    },
    select: {
      track: {
        select: {
          albumId: true,
        },
      },
    },
  });

  const albumPlayCounts = history.reduce((acc, curr) => {
    if (!curr.track?.albumId) return acc;
    acc[curr.track.albumId] = (acc[curr.track.albumId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort album IDs by play count
  const sortedAlbumIds = Object.entries(albumPlayCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([id]) => id)
    .slice(0, 10);

  if (sortedAlbumIds.length === 0) {
    return [];
  }

  // Get album details and preserve user's play order
  const albums = await prisma.album.findMany({
    where: {
      id: { in: sortedAlbumIds },
      isActive: true,
    },
    select: searchAlbumSelect,
  });

  // Create a map for sorting by user's play count
  const albumOrder = new Map(sortedAlbumIds.map((id, index) => [id, index]));

  // Sort albums according to user's play count order
  return albums.sort(
    (a, b) => (albumOrder.get(a.id) || 0) - (albumOrder.get(b.id) || 0)
  );
};

export const getGenreTopAlbums = async (genreId: string) => {
  const cacheKey = `/api/genres/${genreId}/top-albums`;

  if (process.env.USE_REDIS_CACHE === 'true') {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  }

  const albums = await prisma.album.findMany({
    where: {
      isActive: true,
      genres: {
        some: {
          genreId,
        },
      },
    },
    select: searchAlbumSelect,
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (process.env.USE_REDIS_CACHE === 'true') {
    await setCache(cacheKey, albums, 1800); // Cache for 30 mins
  }

  return albums;
}

export const getGenreTopTracks = async (genreId: string) => {
  const cacheKey = `/api/genres/${genreId}/top-tracks`;

  if (process.env.USE_REDIS_CACHE === 'true') {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  }

  const tracks = await prisma.track.findMany({
    where: {
      isActive: true,
      genres: {
        some: {
          genreId,
        },
      },
      type: 'SINGLE',
    },
    select: searchTrackSelect,
    orderBy: { playCount: 'desc' },
    take: 20,
  });

  if (process.env.USE_REDIS_CACHE === 'true') {
    await setCache(cacheKey, tracks, 1800); // Cache for 30 mins
  }

  return tracks;
}

export const getGenreNewestTracks = async (genreId: string) => {
  const cacheKey = `/api/genres/${genreId}/newest-tracks`;

  if (process.env.USE_REDIS_CACHE === 'true') {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  }

  const tracks = await prisma.track.findMany({
    where: {
      isActive: true,
      genres: {
        some: {
          genreId,
        },
      },
      type: 'SINGLE',
    },
    select: searchTrackSelect,
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (process.env.USE_REDIS_CACHE === 'true') {
    await setCache(cacheKey, tracks, 1800); // Cache for 30 mins
  }

  return tracks;
}

export const getGenreTopArtists = async (genreId: string) => {
  const cacheKey = `/api/genres/${genreId}/top-artists`;

  if (process.env.USE_REDIS_CACHE === 'true') {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  }

  const artists = await prisma.artistProfile.findMany({
    where: {
      isVerified: true,
      genres: {
        some: {
          genreId,
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
    },
  });

  if (process.env.USE_REDIS_CACHE === 'true') {
    await setCache(cacheKey, artists, 1800); // Cache for 30 mins
  }

  return artists;
}

// Set user followVisibility 
export const setFollowVisibility = async (user: any, isPublic: boolean) => {
  if (!user) {
    throw new Error('Unauthorized');
  }

  return prisma.user.update({
    where: { id: user.id },
    data: { followVisibility: isPublic },
  });
};

export const getPlayHistory = async (user: any) => {
  if (!user) throw new Error('Unauthorized');

  const history = await prisma.history.findMany({
    where: {
      userId: user.id,
      type: HistoryType.PLAY,
    },
    select: {
      id: true,
      trackId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Filter out any null or undefined trackIds first
  const trackIds = history
    .map(h => h.trackId)
    .filter((id): id is string => typeof id === 'string');

  // If there are no valid trackIds, return empty array
  if (trackIds.length === 0) {
    return [];
  }

  // Fetch all tracks in one query for efficiency
  const tracks = await prisma.track.findMany({
    where: { 
      id: { in: trackIds },
      isActive: true 
    },
    select: searchTrackSelect,
  });

  return tracks;
}

// --- Artist Claim Functions ---

/**
 * Submit a request to claim an existing placeholder artist profile.
 */
export const submitArtistClaim = async (userId: string, artistProfileId: string, proof: string[]) => {
  if (!userId) {
    throw new Error('Unauthorized: User must be logged in to submit a claim.');
  }
  if (!artistProfileId) {
    throw new Error('Artist profile ID is required.');
  }
  if (!proof || !Array.isArray(proof) || proof.length === 0) {
    throw new Error('Proof is required to submit a claim.');
  }

  // 1. Verify the target profile exists and is a claimable placeholder
  const targetProfile = await prisma.artistProfile.findUnique({
    where: { id: artistProfileId },
    select: { id: true, userId: true, isVerified: true, artistName: true }
  });

  if (!targetProfile) {
    throw new Error('Artist profile not found.');
  }
  if (targetProfile.userId) {
    throw new Error('This artist profile is already associated with a user.');
  }
  if (targetProfile.isVerified) {
    throw new Error('This artist profile is already verified.');
  }

  // 2. Check if the user already submitted a claim for this profile
  const existingClaim = await prisma.artistClaimRequest.findFirst({
    where: {
      claimingUserId: userId,
      artistProfileId: artistProfileId,
    },
    select: { id: true, status: true },
  });

  if (existingClaim) {
    if (existingClaim.status === 'PENDING') {
      throw new Error('You already have a pending claim for this artist profile.');
    } else if (existingClaim.status === 'APPROVED') {
      throw new Error('Your claim for this artist profile has already been approved.');
    } else {
      // Allow resubmission if rejected?
      // For now, let's prevent resubmission after rejection to keep it simple.
      throw new Error('Your previous claim for this profile was rejected.');
    }
  }

  // 3. Create the claim request
  const newClaim = await prisma.artistClaimRequest.create({
    data: {
      claimingUserId: userId,
      artistProfileId: artistProfileId,
      proof: proof, // Pass the array directly, assuming the schema expects String[]
      status: ClaimStatus.PENDING,
    },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      claimingUser: { select: { id: true, name: true, username: true, avatar: true } },
      artistProfile: { select: { id: true, artistName: true, avatar: true } }
    }
  });

  // --- START: Gửi thông báo cho ADMIN --- 
  try {
    const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } });
    const userName = newClaim.claimingUser.name || newClaim.claimingUser.username || userId;
    const artistName = newClaim.artistProfile.artistName;

    const notificationPromises = admins.map(async (admin: { id: string }) => {
      const notificationRecord = await prisma.notification.create({
        data: {
          type: NotificationType.CLAIM_REQUEST_SUBMITTED,
          message: `User '${userName}' submitted a claim request for artist '${artistName}'.`,
          recipientType: RecipientType.USER,
          userId: admin.id,
          senderId: userId,
          artistId: artistProfileId,
          claimId: newClaim.id,
        },
        select: { id: true, type: true, message: true, recipientType: true, userId: true, senderId: true, artistId: true, createdAt: true, isRead: true, claimId: true }
      });
       return { adminId: admin.id, notification: notificationRecord };
    });

    const createdClaimNotifications = await Promise.all(notificationPromises);

     // Gửi socket event cho admin rooms
     const io = getIO();
     const userSocketsMap = getUserSockets();
     createdClaimNotifications.forEach(({ adminId, notification }) => {
       const adminSocketId = userSocketsMap.get(adminId);
       if (adminSocketId) {
          console.log(`[Socket Emit] Sending CLAIM_REQUEST_SUBMITTED notification to admin ${adminId} via socket ${adminSocketId}`);
          io.to(adminSocketId).emit('notification', {
          id: notification.id,
          type: notification.type,
          message: notification.message,
          recipientType: notification.recipientType,
          isRead: notification.isRead,
          createdAt: notification.createdAt.toISOString(),
          artistId: notification.artistId,
          senderId: notification.senderId,
          claimId: notification.claimId,
          sender: { id: userId, name: userName, avatar: newClaim.claimingUser.avatar },
          artistProfile: { id: newClaim.artistProfile.id, artistName: artistName, avatar: newClaim.artistProfile.avatar }
        });
       }
     });

  } catch (notificationError) {
    console.error("[Notify Error] Failed to create admin notifications for claim request:", notificationError);
  }
  // --- END: Gửi thông báo cho ADMIN --- 

  return newClaim;
};

/**
 * Get the status of claims submitted by the current user.
 */
export const getUserClaims = async (userId: string) => {
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const claims = await prisma.artistClaimRequest.findMany({
    where: {
      claimingUserId: userId,
    },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      reviewedAt: true,
      rejectionReason: true,
      artistProfile: {
        select: {
          id: true,
          artistName: true,
          avatar: true,
        }
      }
    },
    orderBy: {
      submittedAt: 'desc',
    },
  });

  return claims;
};

// --- End Artist Claim Functions ---

// --- Get Claimable Artist Profiles ---
/**
 * Get all artist profiles
 */
export const getAllArtistsProfile = async () => {
  const artists = await prisma.artistProfile.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      artistName: true,
      avatar: true,
      bio: true,
      userId: true,
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
    orderBy: { artistName: 'asc' },
  });
  return artists;
};
// --- End Get Claimable Artist Profiles ---