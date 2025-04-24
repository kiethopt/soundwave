import { Role } from '@prisma/client';
import { Request } from 'express';
import prisma from '../config/db';
import {
  userSelect,
  artistProfileSelect,
  artistRequestSelect,
  artistRequestDetailsSelect,
  genreSelect,
} from '../utils/prisma-selects';
import { uploadFile } from './upload.service';
import { paginate, toBooleanValue } from '../utils/handle-utils';
import * as fs from 'fs';
import * as path from 'path';
import { SystemComponentStatus } from '../types/system.types';
import { client as redisClient } from '../middleware/cache.middleware';
import { transporter as nodemailerTransporter } from './email.service';
import { Prisma, User as PrismaUser, PlaylistType } from '@prisma/client';
import { ArtistProfile } from '@prisma/client';
import bcrypt from 'bcrypt';
import { subMonths, endOfMonth } from 'date-fns';
import * as emailService from './email.service';

type User = PrismaUser & { adminLevel?: number | null };

export const getUsers = async (req: Request, requestingUser: User) => {
  const { search = '', status, role } = req.query;

  let roleFilter: Prisma.UserWhereInput['role'] = {};
  if (requestingUser.adminLevel !== 1) {
    roleFilter = Role.USER; // Level 2+ Admins chỉ xem được USER
  }

  // Level 1 Admin có thể xem tất cả các role
  if (requestingUser.adminLevel === 1 && role) {
    const requestedRoles = Array.isArray(role)
      ? (role as string[])
      : [role as string];

    const validRoles = requestedRoles
      .map((r) => r.toUpperCase())
      .filter((r) => Object.values(Role).includes(r as Role)) as Role[];

    if (validRoles.length > 0) {
      roleFilter = { in: validRoles };
    }
  }

  const where: Prisma.UserWhereInput = {
    ...(Object.keys(roleFilter).length > 0 ? { role: roleFilter } : {}),
    // Level 1 Admin không xem được chính mình
    ...(requestingUser.adminLevel === 1 ? { id: { not: requestingUser.id } } : {}),
    // Tìm kiếm theo email, username, name
    ...(search
      ? {
          OR: [
            { email: { contains: String(search), mode: 'insensitive' } },
            { username: { contains: String(search), mode: 'insensitive' } },
            { name: { contains: String(search), mode: 'insensitive' } },
          ],
        }
      : {}),
    // Kết hợp với filter status
    ...(status !== undefined ? { isActive: toBooleanValue(status) } : {}),
  };

  const options = {
    where,
    select: userSelect,
    orderBy: { createdAt: 'desc' },
  };

  // Phân trang và sắp xếp theo ngày tạo
  const result = await paginate<User>(prisma.user, req, options);

  return {
    users: result.data,
    pagination: result.pagination,
  };
};

// Lấy user theo ID
export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

// Lấy tất cả request yêu cầu trở thành Artist từ User - ADMIN only
export const getArtistRequests = async (req: Request) => {
  const { search, status, startDate, endDate } = req.query;

  const where: Prisma.ArtistProfileWhereInput = {
    verificationRequestedAt: { not: null },
    user: {
      isActive: true,
    },
    AND: [],
  };

  // Search filter (applies to artistName and user's name/email)
  if (typeof search === 'string' && search.trim()) {
    const trimmedSearch = search.trim();
    // Explicitly check if where.AND is an array before push
    if (Array.isArray(where.AND)) {
      where.AND.push({
        OR: [
          { artistName: { contains: trimmedSearch, mode: 'insensitive' } },
          { user: { name: { contains: trimmedSearch, mode: 'insensitive' } } },
          {
            user: { email: { contains: trimmedSearch, mode: 'insensitive' } },
          },
        ],
      });
    }
  }

  // Status filter for isVerified (assuming status param means isVerified for requests)
  const isVerifiedFilter = toBooleanValue(status);
  if (isVerifiedFilter !== undefined && Array.isArray(where.AND)) {
    where.AND.push({ isVerified: isVerifiedFilter });
  }

  // Date range filter for verificationRequestedAt
  const dateFilter: Prisma.ArtistProfileWhereInput = {};
  const parsedStartDate = startDate ? new Date(startDate as string) : null;
  const parsedEndDate = endDate ? new Date(endDate as string) : null;

  if (parsedStartDate && !isNaN(parsedStartDate.getTime())) {
    if (parsedEndDate && !isNaN(parsedEndDate.getTime())) {
      // Ensure endDate includes the whole day
      const endOfDay = new Date(parsedEndDate);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter.verificationRequestedAt = {
        gte: parsedStartDate,
        lte: endOfDay,
      };
    } else {
      dateFilter.verificationRequestedAt = { gte: parsedStartDate };
    }
    if (Array.isArray(where.AND)) {
      where.AND.push(dateFilter);
    }
  }

  const paginationResult = await paginate<ArtistProfile>(prisma.artistProfile, req, {
    where,
    select: artistRequestSelect,
    orderBy: { verificationRequestedAt: 'desc' }, // Default sort by request date
  });

  return {
    requests: paginationResult.data,
    pagination: paginationResult.pagination,
  };
};

// Lấy chi tiết yêu cầu trở thành nghệ sĩ
export const getArtistRequestDetail = async (id: string) => {
  const request = await prisma.artistProfile.findUnique({
    where: { id },
    select: artistRequestDetailsSelect,
  });

  if (!request) {
    throw new Error('Request not found');
  }

  return request;
};

export const updateUserInfo = async (
  id: string,
  data: any,
  avatarFile?: Express.Multer.File
) => {
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, username: true, password: true, avatar: true, role: true, adminLevel: true }
  });

  if (!targetUser) {
    throw new Error('User not found');
  }

  const { name, email, username, isActive, password, role, adminLevel } = data;
  const updateData: Prisma.UserUpdateInput = {};

  // Handle potential role/level promotion/change if provided
  if (role && Object.values(Role).includes(role)) {
    updateData.role = role as Role;
  }
  if (adminLevel !== undefined && adminLevel !== null && !isNaN(Number(adminLevel))) {
    // Allow setting level only if role is ADMIN (or becoming ADMIN)
    if (updateData.role === Role.ADMIN || (targetUser.role === Role.ADMIN && !updateData.role)) {
       updateData.adminLevel = Number(adminLevel);
    } else if (role === Role.ADMIN) { // Explicitly promoting
        updateData.adminLevel = Number(adminLevel);
    } else {
        // If setting level but not ADMIN, remove adminLevel (or set to null)
        updateData.adminLevel = null;
    }
  } else if (updateData.role && updateData.role !== Role.ADMIN) {
    // If role is changed to non-admin, ensure level is nullified
    updateData.adminLevel = null;
  }

  // Name
  if (name !== undefined) updateData.name = name;

  // Email (check uniqueness if changed)
  if (email !== undefined && email !== targetUser.email) {
    const existingEmail = await prisma.user.findFirst({ where: { email, NOT: { id } } });
    if (existingEmail) throw new Error('Email already exists');
    updateData.email = email;
  }

  // Username (check uniqueness if changed)
  if (username !== undefined && username !== targetUser.username) {
    const existingUsername = await prisma.user.findFirst({ where: { username, NOT: { id } } });
    if (existingUsername) throw new Error('Username already exists');
    updateData.username = username;
  }

  // isActive status
  if (isActive !== undefined) {
    // Deactivation of Level 1 Admin should be prevented in middleware
    updateData.isActive = toBooleanValue(isActive);
  }

  // Password (Admin sets directly - length validation)
  if (password) {
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    updateData.password = await bcrypt.hash(password, 10);
  }

  // Avatar
  if (avatarFile) {
    const uploadResult = await uploadFile(avatarFile.buffer, 'users/avatars');
    updateData.avatar = uploadResult.secure_url;
  } else if (data.avatar === null && targetUser.avatar) {
    // Handle explicit avatar removal if `avatar: null` is passed
    updateData.avatar = null;
  }

  // Perform Update if there are changes
  if (Object.keys(updateData).length === 0 && !avatarFile && !(data.avatar === null && targetUser.avatar)) {
      throw new Error("No valid data provided for update.");
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: userSelect,
  });

  return updatedUser;
};

// Cập nhật thông tin nghệ sĩ
export const updateArtistInfo = async (
  id: string,
  data: any,
  avatarFile?: Express.Multer.File
) => {
  // Kiểm tra artist có tồn tại không
  const existingArtist = await prisma.artistProfile.findUnique({
    where: { id },
    // Select user details needed for potential async tasks later in controller
    select: {
      id: true,
      artistName: true,
      isActive: true,
      isVerified: true,
      socialMediaLinks: true,
      userId: true,
      user: { select: { email: true, name: true, username: true } }
    }
  });

  if (!existingArtist) {
    throw new Error('Artist not found');
  }

  const { artistName, bio, isActive, isVerified, socialMediaLinks } = data;

  // Kiểm tra tên nghệ sĩ nếu có thay đổi
  let validatedArtistName = undefined;
  if (artistName && artistName !== existingArtist.artistName) {
    // Kiểm tra tên đã tồn tại chưa
    const nameExists = await prisma.artistProfile.findFirst({
      where: {
        artistName,
        id: { not: id },
      },
    });

    if (nameExists) {
      throw new Error('Artist name already exists');
    }
    validatedArtistName = artistName;
  }

  // Xử lý avatar nếu có file tải lên
  let avatarUrl = undefined;
  if (avatarFile) {
    const result = await uploadFile(
      avatarFile.buffer,
      'artists/avatars',
      'image'
    );
    avatarUrl = result.secure_url;
  }

  // Prepare social media links update (ensure it's a valid JSON or null)
  let socialMediaLinksUpdate = existingArtist.socialMediaLinks;
  if (socialMediaLinks !== undefined) { // Allow updating even if empty string/null is passed
    try {
        // If it's an empty string or explicitly null, set to null
        if (socialMediaLinks === '' || socialMediaLinks === null) {
             socialMediaLinksUpdate = null;
        } else {
             // Assuming socialMediaLinks is passed as a JSON string from FormData
             const parsedLinks = typeof socialMediaLinks === 'string' ? JSON.parse(socialMediaLinks) : socialMediaLinks;
             // Simple validation: ensure it's an object
             if (typeof parsedLinks === 'object' && parsedLinks !== null) {
                 socialMediaLinksUpdate = parsedLinks;
             } else {
                 console.warn('Invalid socialMediaLinks format received:', socialMediaLinks);
                 // Keep existing links if parsing fails or format is wrong
             }
        }
    } catch (error) {
      console.error('Error processing socialMediaLinks JSON:', error);
      // Keep existing links if parsing fails
    }
  }


  // Cập nhật artist trực tiếp với các trường đã gửi
  const updatedArtist = await prisma.artistProfile.update({
    where: { id },
    data: {
      ...(validatedArtistName && { artistName: validatedArtistName }),
      ...(bio !== undefined && { bio }), // Allow empty string for bio
      ...(isActive !== undefined && { isActive: toBooleanValue(isActive) }),
      ...(isVerified !== undefined && {
        isVerified: toBooleanValue(isVerified),
        // Optionally update verifiedAt based on isVerified status
        verifiedAt: toBooleanValue(isVerified) ? new Date() : null,
      }),
      ...(avatarUrl && { avatar: avatarUrl }),
      // Update social media links only if it was present in the request data
      ...(socialMediaLinks !== undefined && { socialMediaLinks: socialMediaLinksUpdate }),
    },
    // Use artistProfileSelect to ensure consistent return data,
    // it already includes the necessary user fields.
    select: artistProfileSelect,
  });

  return updatedArtist;
};

// Xóa user theo ID
export const deleteUserById = async (
  id: string,
  requestingUser: User,
  reason?: string
) => {
  // Check permission
  const userToDelete = await prisma.user.findUnique({
    where: { id },
    select: { role: true, adminLevel: true, email: true, name: true, username: true },
  });

  if (!userToDelete) {
    throw new Error('User not found');
  }

  // Basic check: ensure requestUser exists and has a role/level
  if (!requestingUser || typeof requestingUser.adminLevel !== 'number') {
    throw new Error('Permission denied: Invalid requesting user data.');
  }

  // Admins cannot delete other admins with the same or higher level
  if (userToDelete.role === Role.ADMIN) {
    if (requestingUser.id === id) {
      throw new Error('Permission denied: Admins cannot delete themselves.');
    }
    const targetAdminLevel = userToDelete.adminLevel ?? Infinity; // Treat null level as highest
    const requesterAdminLevel = requestingUser.adminLevel ?? Infinity;
    if (requesterAdminLevel >= targetAdminLevel) {
      throw new Error(
        'Permission denied: Cannot delete an admin with the same or higher level.'
      );
    }
  }

  // --- Send Deletion Email (Asynchronous) --- 
  if (userToDelete.email) {
      try {
          const userName = userToDelete.name || userToDelete.username || 'User';
          const emailOptions = emailService.createAccountDeletedEmail(
              userToDelete.email,
              userName,
              reason
          );
          emailService.sendEmail(emailOptions).catch(err => 
              console.error('[Async Email Error] Failed to send account deletion email:', err)
          );
      } catch (syncError) {
          console.error('[Email Setup Error] Failed to create deletion email options:', syncError);
      }
  }

  // Delete user
  await prisma.user.delete({ where: { id } });

  return { message: `User ${id} deleted successfully. Reason: ${reason || 'No reason provided'}` };
};

// Delete Artist by ID, now accepts reason and sends notification
export const deleteArtistById = async (id: string, reason?: string) => {
  const artistToDelete = await prisma.artistProfile.findUnique({
    where: { id },
    select: {
      id: true,
      artistName: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          username: true
        }
      }
    }
  });

  if (!artistToDelete) {
    throw new Error('Artist not found');
  }

  // 2. Send Deletion Email (Asynchronous) to the associated user
  const associatedUser = artistToDelete.user;
  if (associatedUser && associatedUser.email) {
      try {
          // Use artistName if available, otherwise fallback to username or generic
          const nameToSend = artistToDelete.artistName || associatedUser.name || associatedUser.username || 'Artist';
          const emailOptions = emailService.createAccountDeletedEmail(
              associatedUser.email,
              nameToSend,
              reason
          );
          // Send email asynchronously
          emailService.sendEmail(emailOptions).catch(err =>
              console.error('[Async Email Error] Failed to send artist account deletion email:', err)
          );
      } catch (syncError) {
          console.error('[Email Setup Error] Failed to create artist deletion email options:', syncError);
      }
  }

  // 3. Delete the artist profile (onDelete: Cascade in User model will NOT delete the User)
  await prisma.artistProfile.delete({ where: { id: artistToDelete.id } });

  return { message: `Artist ${id} deleted permanently. Reason: ${reason || 'No reason provided'}` };
};

// Lấy danh sách nghệ sĩ
export const getArtists = async (req: Request) => {
  const { search = '', status, isVerified } = req.query;

  const where: Prisma.ArtistProfileWhereInput = {
    role: Role.ARTIST,
    verificationRequestedAt: null, // Luôn loại bỏ các ArtistProfile đang pending
    ...(isVerified !== undefined && { isVerified: isVerified === 'true' }),
    ...(search
      ? {
          OR: [
            { artistName: { contains: String(search), mode: 'insensitive' } },
            {
              user: {
                email: { contains: String(search), mode: 'insensitive' },
              },
            },
            { // Also search user name for artists
              user: {
                name: { contains: String(search), mode: 'insensitive' },
              },
            },
          ],
        }
      : {}),
    ...(status !== undefined ? { isActive: status === 'true' } : {}),
  };

  const options = {
    where,
    select: artistProfileSelect,
    orderBy: { createdAt: 'desc' },
  };

  const result = await paginate(prisma.artistProfile, req, options);

  return {
    artists: result.data,
    pagination: result.pagination,
  };
};

// Lấy thông tin nghệ sĩ theo ID
export const getArtistById = async (id: string) => {
  const artist = await prisma.artistProfile.findUnique({
    where: { id },
    select: {
      ...artistProfileSelect,
      albums: {
        orderBy: { releaseDate: 'desc' },
        select: artistProfileSelect.albums.select,
      },
      tracks: {
        where: {
          type: 'SINGLE',
          albumId: null, // Chỉ lấy track không thuộc album nào
        },
        orderBy: { releaseDate: 'desc' },
        select: artistProfileSelect.tracks.select,
      },
    },
  });

  if (!artist) {
    throw new Error('Artist not found');
  }

  return artist;
};

// Lấy danh sách thể loại
export const getGenres = async (req: Request) => {
  const { search = '' } = req.query;

  const where = search
    ? {
        name: {
          contains: String(search),
          mode: 'insensitive',
        },
      }
    : {};

  const options = {
    where,
    select: genreSelect,
    orderBy: { createdAt: 'desc' },
  };

  const result = await paginate(prisma.genre, req, options);

  return {
    genres: result.data,
    pagination: result.pagination,
  };
};

// Tạo thể loại mới
export const createNewGenre = async (name: string) => {
  const existingGenre = await prisma.genre.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } }, // Case-insensitive check
  });
  if (existingGenre) {
    throw new Error('Genre name already exists');
  }
  return prisma.genre.create({
    data: { name },
  });
};

// Cập nhật thông tin thể loại
export const updateGenreInfo = async (id: string, name: string) => {
  const existingGenre = await prisma.genre.findUnique({
    where: { id },
  });

  if (!existingGenre) {
    throw new Error('Genre not found');
  }

  // Kiểm tra trùng lặp tên (case-insensitive)
  if (name.toLowerCase() !== existingGenre.name.toLowerCase()) {
    const existingGenreWithName = await prisma.genre.findFirst({
      where: {
         name: { equals: name, mode: 'insensitive' },
         NOT: { id }
      },
    });
    if (existingGenreWithName) {
      throw new Error('Genre name already exists');
    }
  }

  // Cập nhật genre
  return prisma.genre.update({
    where: { id },
    data: { name },
  });
};

export const deleteGenreById = async (id: string) => {
  return prisma.genre.delete({ where: { id } });
};

// Xác nhận yêu cầu trở thành nghệ sĩ
export const approveArtistRequest = async (requestId: string) => {
  const artistProfile = await prisma.artistProfile.findFirst({
    where: {
      id: requestId,
      verificationRequestedAt: { not: null },
      isVerified: false, // Ensure it's not already verified
    },
    // Include user to get email later
    include: {
      user: { select: { id: true, email: true, name: true, username: true } }
    }
  });

  if (!artistProfile) {
    throw new Error('Artist request not found, already verified, or rejected.');
  }

  // Use transaction to update profile and user role atomically
  const updatedProfile = await prisma.$transaction(async (tx) => {
     // Update ArtistProfile
     const profile = await tx.artistProfile.update({
         where: { id: requestId },
         data: {
             role: Role.ARTIST, 
             isVerified: true,
             verifiedAt: new Date(),
             verificationRequestedAt: null,
         },
         include: { user: { select: userSelect }}
     });

     return profile;
  });


  return updatedProfile; // Return profile which includes nested user data
};

// Từ chối yêu cầu trở thành nghệ sĩ
export const rejectArtistRequest = async (requestId: string) => {
  const artistProfile = await prisma.artistProfile.findFirst({
    where: {
      id: requestId,
      verificationRequestedAt: { not: null },
      isVerified: false, // Ensure it's not already verified or rejected (by deletion)
    },
    include: {
      user: { select: userSelect }, // Select necessary user fields
    },
  });

  if (!artistProfile) {
    throw new Error('Artist request not found, already verified, or rejected.');
  }

  // Just delete the artist profile on rejection
  await prisma.artistProfile.delete({
    where: { id: requestId },
  });

  // Return the user data and indication that there's no longer a pending request
  return {
    user: artistProfile.user, // Return the user data selected earlier
    hasPendingRequest: false,
  };
};

// Xóa yêu cầu trở thành nghệ sĩ
export const deleteArtistRequest = async (requestId: string) => {
  // Find the request first to ensure it exists and meets criteria
  const artistProfile = await prisma.artistProfile.findFirst({
    where: {
      id: requestId,
      verificationRequestedAt: { not: null }, // Must be a pending request
      // No isVerified check here, allow deletion even if rejected (profile deleted)
    },
  });

  if (!artistProfile) {
    // If not found, it might have been approved, rejected, or never existed.
    // Consider if throwing an error or returning success is better.
    // Let's throw an error for clarity that the target wasn't a deletable request.
    throw new Error('Artist request not found or not in a deletable state (e.g., approved).');
  }

  // Delete the artist profile associated with the request
  await prisma.artistProfile.delete({
    where: { id: requestId },
  });

  return { deletedRequestId: requestId };
};

// Lấy thống kê dashboard
export const getDashboardStats = async () => {
  const coreStatsPromise = Promise.all([
    prisma.user.count({ where: { role: { not: Role.ADMIN } } }), // Total non-admin users
    prisma.artistProfile.count({ where: { role: Role.ARTIST, isVerified: true } }), // Total verified artists
    prisma.artistProfile.count({ where: { verificationRequestedAt: { not: null }, isVerified: false } }), // Total pending artist requests
    prisma.artistProfile.findMany({ // Top artists
      where: { role: Role.ARTIST, isVerified: true },
      orderBy: [{ monthlyListeners: 'desc' }],
      take: 4,
      select: { id: true, artistName: true, avatar: true, monthlyListeners: true },
    }),
    prisma.genre.count(), // Total genres
    prisma.label.count(), // Total labels
    prisma.album.count({ where: { isActive: true } }), // Total active albums
    prisma.track.count({ where: { isActive: true } }), // Total active tracks
    prisma.playlist.count({ where: { type: PlaylistType.SYSTEM, userId: null } }), // Total base system playlists
  ]);

  // --- Tính toán dữ liệu tháng ---
  const monthlyUserDataPromise = (async () => {
    const monthlyData: Array<{ month: string; users: number }> = [];
    const allMonths = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const now = new Date();

    // Tính toán cho 12 tháng gần đây nhất
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const endOfMonthDate = endOfMonth(monthDate);
      const monthLabel = allMonths[monthDate.getMonth()];

      const userCount = await prisma.user.count({
        where: {
          createdAt: { lte: endOfMonthDate },
        },
      });

      monthlyData.push({ month: monthLabel, users: userCount });
    }
    return monthlyData;
  })();

  // --- Chờ tất cả các promise --- 
  const [coreStats, monthlyUserData] = await Promise.all([
    coreStatsPromise,
    monthlyUserDataPromise,
  ]);

  // --- Tách dữ liệu cơ bản --- 
  const [
    totalUsers,
    totalArtists,
    totalArtistRequests,
    topArtists,
    totalGenres,
    totalLabels,
    totalAlbums,
    totalTracks,
    totalSystemPlaylists,
  ] = coreStats;

  // --- Trả về dữ liệu kết hợp --- 
  return {
    totalUsers,
    totalArtists,
    totalArtistRequests,
    totalGenres,
    totalLabels,
    totalAlbums,
    totalTracks,
    totalSystemPlaylists,
    topArtists: topArtists.map((artist) => ({
      id: artist.id,
      artistName: artist.artistName,
      avatar: artist.avatar,
      monthlyListeners: artist.monthlyListeners,
    })),
    monthlyUserData, // Dữ liệu tháng thực tế
    updatedAt: new Date().toISOString(),
  };
};

// Kiểm tra trạng thái hệ thống
export const getSystemStatus = async (): Promise<SystemComponentStatus[]> => {
  const statuses: SystemComponentStatus[] = [];

  // 1. Check Database (Prisma)
  try {
    await prisma.$queryRaw`SELECT 1`;
    statuses.push({ name: 'Database (PostgreSQL)', status: 'Available' });
  } catch (error) {
    console.error('[System Status] Database check failed:', error);
    statuses.push({
      name: 'Database (PostgreSQL)',
      status: 'Outage',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // 2. Check Redis Cache
  const useRedis = process.env.USE_REDIS_CACHE === 'true';
  if (useRedis) {
    // Ensure redisClient exists and has the ping method
    if (redisClient && typeof redisClient.ping === 'function') {
      try {
         // Check connection state before pinging
         if (!redisClient.isOpen) {
            statuses.push({ name: 'Cache (Redis)', status: 'Outage', message: 'Client not connected' });
         } else {
            await redisClient.ping();
            statuses.push({ name: 'Cache (Redis)', status: 'Available' });
         }
      } catch (error) {
        console.error('[System Status] Redis ping failed:', error);
        statuses.push({
          name: 'Cache (Redis)',
          status: 'Issue', // Use 'Issue' for problems after initial connection attempt
          message: error instanceof Error ? error.message : 'Ping failed',
        });
      }
    } else {
      console.warn('[System Status] Redis client seems uninitialized or mock.');
      statuses.push({
        name: 'Cache (Redis)',
        status: 'Issue',
        message: 'Redis client not properly initialized or is a mock.',
      });
    }
  } else {
    statuses.push({ name: 'Cache (Redis)', status: 'Disabled', message: 'USE_REDIS_CACHE is false' });
  }

  // 3. Check Cloudinary
  try {
    const cloudinary = (await import('cloudinary')).v2;
    const pingResult = await cloudinary.api.ping();
    if (pingResult?.status === 'ok') {
       statuses.push({ name: 'Cloudinary (Media Storage)', status: 'Available' });
    } else {
       statuses.push({ name: 'Cloudinary (Media Storage)', status: 'Issue', message: `Ping failed or unexpected status: ${pingResult?.status}` });
    }
  } catch (error) {
    console.error('[System Status] Cloudinary check failed:', error);
    statuses.push({
      name: 'Cloudinary (Media Storage)',
      status: 'Outage',
      message: error instanceof Error ? error.message : 'Connection or Auth failed',
    });
  }

  // 4. Check Gemini AI
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash'; // Default model name

      // Attempt to get the model - throws error if invalid key/config
      const model = genAI.getGenerativeModel({ model: modelName });
      // Optional: Make a light request like counting tokens to verify further
      await model.countTokens("test");

      statuses.push({ name: 'Gemini AI (Playlists)', status: 'Available', message: `API Key valid. Configured model: ${modelName}` });

    } catch (error: any) {
      console.error('[System Status] Gemini AI check failed:', error);
      statuses.push({
        name: 'Gemini AI (Playlists)',
        status: 'Issue',
        message: error.message || 'Failed to initialize or connect to Gemini',
      });
    }
  } else {
    statuses.push({ name: 'Gemini AI (Playlists)', status: 'Disabled', message: 'GEMINI_API_KEY not set' });
  }

  // 5. Check Nodemailer (Email Service)
  if (nodemailerTransporter) {
    try {
      const verified = await nodemailerTransporter.verify();
      if (verified) {
        statuses.push({ name: 'Email (Nodemailer)', status: 'Available' });
      } else {
         statuses.push({ name: 'Email (Nodemailer)', status: 'Issue', message: 'Verification returned false' });
      }
    } catch (error: any) {
      console.error('[System Status] Nodemailer verification failed:', error);
      statuses.push({
        name: 'Email (Nodemailer)',
        status: 'Outage',
        message: error.message || 'Verification failed',
      });
    }
  } else {
    statuses.push({
      name: 'Email (Nodemailer)',
      status: 'Disabled',
      message: 'SMTP configuration incomplete or transporter not initialized',
    });
  }

  return statuses;
};

// Cập nhật trạng thái cache
export const updateCacheStatus = async (enabled?: boolean): Promise<{ enabled: boolean }> => {
  try {
      // Determine the correct path to .env file
      const envPath = process.env.NODE_ENV === 'production'
          ? path.resolve(process.cwd(), '../.env') // Adjust if your production structure differs
          : path.resolve(process.cwd(), '.env'); // Development path

      if (!fs.existsSync(envPath)) {
          console.error(`.env file not found at ${envPath}`);
          throw new Error('Environment file not found.');
      }

      const currentStatus = process.env.USE_REDIS_CACHE === 'true';

      // If enabled is undefined, just return the current status
      if (enabled === undefined) {
          return { enabled: currentStatus };
      }

      // If the requested status is the same as current, do nothing
      if (enabled === currentStatus) {
          console.log(`[Redis] Cache status already ${enabled ? 'enabled' : 'disabled'}. No change needed.`);
          return { enabled };
      }

      // Update .env file content
      let envContent = fs.readFileSync(envPath, 'utf8');
      const regex = /USE_REDIS_CACHE=.*/;
      const newLine = `USE_REDIS_CACHE=${enabled}`;

      if (envContent.match(regex)) {
          envContent = envContent.replace(regex, newLine);
      } else {
          envContent += `
${newLine}`; // Add if not found
      }
      fs.writeFileSync(envPath, envContent);

      // Update process.env for the current running instance
      process.env.USE_REDIS_CACHE = String(enabled);
      console.log(`[Redis] Cache ${enabled ? 'enabled' : 'disabled'}. Restart might be required for full effect.`);

      // Handle Redis connection based on the new status
      // Re-require or import client logic might be necessary depending on setup
      const { client: dynamicRedisClient } = require('../middleware/cache.middleware');

      if (enabled && dynamicRedisClient && !dynamicRedisClient.isOpen) {
          try {
              await dynamicRedisClient.connect();
              console.log('[Redis] Connected successfully.');
          } catch (connectError) {
              console.error('[Redis] Failed to connect after enabling:', connectError);
              // Optionally revert the .env change or notify admin
          }
      } else if (!enabled && dynamicRedisClient && dynamicRedisClient.isOpen) {
          try {
              await dynamicRedisClient.disconnect();
              console.log('[Redis] Disconnected successfully.');
          } catch (disconnectError) {
              console.error('[Redis] Failed to disconnect after disabling:', disconnectError);
          }
      }

      return { enabled };
  } catch (error) {
      console.error('Error updating cache status:', error);
      // Determine current status again in case of error during update
      const currentStatusAfterError = process.env.USE_REDIS_CACHE === 'true';
      throw new Error(`Failed to update cache status. Current status: ${currentStatusAfterError}`);
  }
};

// Cập nhật trạng thái model AI
export const updateAIModel = async (model?: string) => {
  try {
    // Validating model name
    const validModels = [
      'gemini-2.5-pro-exp-03-25', // Newest experimental model
      'gemini-2.0-flash', // Default model
      'gemini-2.0-flash-lite', // Lighter version
      'gemini-1.5-flash', // Older model - faster
      'gemini-1.5-flash-8b', // Lighter older model
      'gemini-1.5-pro', // Older but more complex reasoning
    ];

    const currentModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash'; // Get current before potentially changing
    const isEnabled = !!process.env.GEMINI_API_KEY;

    // If no model is specified in the request, return current settings
    if (model === undefined) { // Check for undefined instead of !model to allow empty string if needed
      return {
        success: true,
        message: 'Current AI model settings retrieved',
        data: {
          model: currentModel,
          enabled: isEnabled,
          validModels,
        },
      };
    }

    // Validate model
    if (!validModels.includes(model)) {
      throw new Error(
        `Invalid model name. Valid models are: ${validModels.join(', ')}`
      );
    }

    // Determine .env path based on environment
    const envPath = process.env.NODE_ENV === 'production'
        ? path.resolve(process.cwd(), '../.env') // Adjust if needed for prod structure
        : path.resolve(process.cwd(), '.env');

    if (!fs.existsSync(envPath)) {
      throw new Error(`.env file not found at ${envPath}`);
    }

    let envContent = fs.readFileSync(envPath, 'utf8');
    const regex = /GEMINI_MODEL=.*/;
    const newLine = `GEMINI_MODEL=${model}`;

    // Update GEMINI_MODEL in .env file
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += `
${newLine}`; // Append if it doesn't exist
    }

    fs.writeFileSync(envPath, envContent);

    // Update environment variable for the currently running process
    process.env.GEMINI_MODEL = model;

    console.log(`[Admin] AI model changed to: ${model}`);

    return {
      success: true,
      message: `AI model settings updated to ${model}`,
      data: {
        model,
        enabled: isEnabled, // Enabled status doesn't change here, only model
        validModels,
      },
    };
  } catch (error) {
    console.error('[Admin] Error updating AI model:', error);
    // Return a consistent error structure if possible
    return {
       success: false,
       message: error instanceof Error ? error.message : 'Failed to update AI model',
       error: true, // Indicate an error occurred
    }
    // Or re-throw if the controller should handle it
    // throw error;
  }
};

// Cập nhật trạng thái bảo trì
export const updateMaintenanceMode = async (enabled?: boolean): Promise<{enabled: boolean}> => {
    try {
        const envPath = process.env.NODE_ENV === 'production'
            ? path.resolve(process.cwd(), '../.env')
            : path.resolve(process.cwd(), '.env');

        if (!fs.existsSync(envPath)) {
            throw new Error(`.env file not found at ${envPath}`);
        }

        const currentStatus = process.env.MAINTENANCE_MODE === 'true';

        // If enabled is undefined, return current status
        if (enabled === undefined) {
            return { enabled: currentStatus };
        }

        // If status isn't changing, do nothing
        if (enabled === currentStatus) {
             console.log(`[System] Maintenance mode already ${enabled ? 'enabled' : 'disabled'}.`);
             return { enabled };
        }

        // Update .env file
        let envContent = fs.readFileSync(envPath, 'utf8');
        const regex = /MAINTENANCE_MODE=.*/;
        const newLine = `MAINTENANCE_MODE=${enabled}`;

        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, newLine);
        } else {
            envContent += `
${newLine}`;
        }
        fs.writeFileSync(envPath, envContent);

        // Update current process environment variable
        process.env.MAINTENANCE_MODE = String(enabled);

        console.log(
            `[System] Maintenance mode ${enabled ? 'enabled' : 'disabled'}.`
        );

        return { enabled };
    } catch (error) {
        console.error('Error updating maintenance mode:', error);
        // Return current status in case of error
        const currentStatusAfterError = process.env.MAINTENANCE_MODE === 'true';
        throw new Error(`Failed to update maintenance mode. Current status: ${currentStatusAfterError}`);
    }
};
