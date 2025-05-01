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

// Define a list of valid models here
const VALID_GEMINI_MODELS = [
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.5-pro-preview-03-25',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
];

type User = PrismaUser;

export const getUsers = async (req: Request, requestingUser: User) => {
  const { search, status, sortBy, sortOrder } = req.query;

  const where: Prisma.UserWhereInput = {
    id: { not: requestingUser.id },
  };

  if (search && typeof search === 'string') {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    where.isActive = status === 'true';
  }

  let orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: 'desc' };
  const validSortFields = [
    'name',
    'email',
    'username',
    'role',
    'isActive',
    'createdAt',
    'lastLoginAt',
  ];
  if (
    sortBy &&
    typeof sortBy === 'string' &&
    validSortFields.includes(sortBy)
  ) {
    const direction = sortOrder === 'asc' ? 'asc' : 'desc';
    orderBy = { [sortBy]: direction };
  }

  const options = {
    where,
    select: userSelect,
    orderBy,
  };

  const result = await paginate<User>(prisma.user, req, options);

  return {
    users: result.data,
    pagination: result.pagination,
  };
};

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

export const getArtistRequests = async (req: Request) => {
  const { search, startDate, endDate } = req.query;

  const where: Prisma.ArtistProfileWhereInput = {
    verificationRequestedAt: { not: null },
    user: {
      isActive: true,
    },
    isVerified: false,
    AND: [],
  };

  if (typeof search === 'string' && search.trim()) {
    const trimmedSearch = search.trim();
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

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (typeof startDate === 'string' && startDate) {
    try {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      dateFilter.gte = startOfDay;
    } catch (e) { console.error("Invalid start date format:", startDate); }
  }
  if (typeof endDate === 'string' && endDate) {
    try {
        const endOfDay = new Date(endDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        dateFilter.lte = endOfDay;
    } catch (e) { console.error("Invalid end date format:", endDate); }
  }

  if (dateFilter.gte || dateFilter.lte) {
     if (Array.isArray(where.AND)) {
       where.AND.push({ verificationRequestedAt: dateFilter });
     }
  }

  const options = {
      where,
      select: artistRequestSelect,
      orderBy: { verificationRequestedAt: 'desc' },
  };

  const result = await paginate<ArtistProfile>(prisma.artistProfile, req, options);

  return {
    requests: result.data,
    pagination: result.pagination,
  };
};

export const getArtistRequestDetail = async (id: string) => {
  let request = await prisma.artistProfile.findUnique({
    where: { id },
    select: artistRequestDetailsSelect,
  });

  // Nếu không tìm thấy artist profile, thử tìm bằng userId
  if (!request) {
    request = await prisma.artistProfile.findFirst({
      where: { 
        userId: id,
        verificationRequestedAt: { not: null }
      },
      select: artistRequestDetailsSelect,
    });
  }

  if (!request) {
    throw new Error('Request not found');
  }

  return request;
};

interface UpdateUserData {
  name?: string;
  username?: string;
  email?: string;
  newPassword?: string;
  isActive?: boolean;
  reason?: string;
}

export const updateUserInfo = async (
  id: string,
  data: UpdateUserData,
  requestingUser: User
) => {
  const { name, username, email, newPassword, isActive, reason } = data;

  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    throw new Error('User not found');
  }

  // Prevent non-admins from modifying admins
  if (requestingUser.role !== Role.ADMIN && existingUser.role === Role.ADMIN) {
      throw new Error(`Permission denied: Cannot modify Admin users.`); 
  }
  // Prevent admins from modifying other admins (optional, but can be a safety measure)
  if (requestingUser.role === Role.ADMIN && requestingUser.id !== id && existingUser.role === Role.ADMIN) {
      throw new Error(`Permission denied: Admins cannot modify other Admin users.`); 
  }

  // Prepare data for Prisma update
  const updateData: Prisma.UserUpdateInput = {};

  if (name !== undefined) {
    updateData.name = name;
  }

  if (email !== undefined && email !== existingUser.email) {
    const existingEmail = await prisma.user.findFirst({ where: { email, NOT: { id } } });
    if (existingEmail) throw new Error('Email already exists');
    updateData.email = email;
  }

  if (username !== undefined && username !== existingUser.username) {
    const existingUsername = await prisma.user.findFirst({ where: { username, NOT: { id } } });
    if (existingUsername) throw new Error('Username already exists');
    updateData.username = username;
  }

  if (isActive !== undefined) {
    const isActiveBool = toBooleanValue(isActive);
    if (isActiveBool === undefined) {
      throw new Error('Invalid value for isActive status');
    }
    if (requestingUser.id === id && !isActiveBool) {
      throw new Error("Permission denied: Cannot deactivate your own account.");
    }
    updateData.isActive = isActiveBool;
  }

  // Update password if newPassword is provided
  if (newPassword) {
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updateData).length === 0) {
      throw new Error("No valid data provided for update.");
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: userSelect,
  });

  // --- Send Notification/Email based on isActive change --- 
  if (updateData.isActive !== undefined && updateData.isActive !== existingUser.isActive) {
      const userName = updatedUser.name || updatedUser.username || 'User';
      if (updatedUser.isActive === false) { 
          prisma.notification.create({ 
              data: {
                  type: 'ACCOUNT_DEACTIVATED',
                  message: `Your account has been deactivated.${reason ? ` Reason: ${reason}` : ''}`,
                  recipientType: 'USER',
                  userId: id,
                  isRead: false,
              },
           }).catch(err => console.error('[Async Notify Error] Failed to create deactivation notification:', err));

          if (updatedUser.email) {
              try {
                  const emailOptions = emailService.createAccountDeactivatedEmail(
                      updatedUser.email,
                      userName,
                      'user',
                      reason
                  );
                  emailService.sendEmail(emailOptions).catch(err => console.error('[Async Email Error] Failed to send deactivation email:', err));
              } catch (syncError) {
                  console.error('[Email Setup Error] Failed to create deactivation email options:', syncError);
              }
          }
      } else if (updatedUser.isActive === true) { 
          prisma.notification.create({ 
              data: {
                  type: 'ACCOUNT_ACTIVATED',
                  message: 'Your account has been reactivated.',
                  recipientType: 'USER',
                  userId: id,
                  isRead: false,
              },
           }).catch(err => console.error('[Async Notify Error] Failed to create activation notification:', err));

          if (updatedUser.email) {
               try {
                  const emailOptions = emailService.createAccountActivatedEmail(
                      updatedUser.email,
                      userName,
                      'user'
                  );
                  emailService.sendEmail(emailOptions).catch(err => console.error('[Async Email Error] Failed to send activation email:', err));
              } catch (syncError) {
                  console.error('[Email Setup Error] Failed to create activation email options:', syncError);
              }
          }
      }
  }

  return updatedUser;
};

interface UpdateArtistData {
  artistName?: string;
  bio?: string;
  isActive?: boolean;
  reason?: string; // For deactivation reason
}

export const updateArtistInfo = async (
  id: string,
  data: UpdateArtistData
) => {
  const { artistName, bio, isActive, reason } = data;
  
  // Find the existing artist
  const existingArtist = await prisma.artistProfile.findUnique({
    where: { id },
    select: {
      id: true,
      artistName: true,
      isActive: true,
      userId: true,
      user: { select: { id: true, email: true, name: true, username: true } }
    }
  });

  if (!existingArtist) {
    throw new Error('Artist not found');
  }

  // Validate fields
  const validationErrors = [];
  
  if (artistName !== undefined) {
    if (artistName.length < 3) {
      validationErrors.push('Artist name must be at least 3 characters');
    }
    if (artistName.length > 100) {
      validationErrors.push('Artist name cannot exceed 100 characters');
    }
  }
  
  if (bio !== undefined && bio.length > 1000) {
    validationErrors.push('Biography cannot exceed 1000 characters');
  }
  
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }

  // Check for duplicate artist name
  let validatedArtistName = undefined;
  if (artistName && artistName !== existingArtist.artistName) {
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

  // Prepare update data
  const updateData: Prisma.ArtistProfileUpdateInput = {};
  
  if (validatedArtistName !== undefined) {
    updateData.artistName = validatedArtistName;
  }
  
  if (bio !== undefined) {
    updateData.bio = bio;
  }
  
  if (isActive !== undefined) {
    const isActiveBool = toBooleanValue(isActive);
    if (isActiveBool === undefined) {
      throw new Error('Invalid value for isActive status');
    }
    updateData.isActive = isActiveBool;
  }

  // If there's nothing to update, throw error
  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid data provided for update');
  }

  // Update the artist profile
  const updatedArtist = await prisma.artistProfile.update({
    where: { id },
    data: updateData,
    select: artistProfileSelect,
  });

  // Handle notifications and emails if isActive status changed
  if (isActive !== undefined && existingArtist.isActive !== updatedArtist.isActive) {
    const ownerUser = existingArtist.user;
    const ownerUserName = ownerUser?.name || ownerUser?.username || 'Artist';

    if (updatedArtist.isActive === false) {
      // Handle deactivation notification and email
      if (ownerUser?.id) {
        prisma.notification.create({
          data: {
            type: 'ACCOUNT_DEACTIVATED',
            message: `Your artist account has been deactivated.${reason ? ` Reason: ${reason}` : ''}`,
            recipientType: 'USER',
            userId: ownerUser.id,
            isRead: false,
          },
        }).catch(err => console.error('[Async Notify Error] Failed to create artist deactivation notification:', err));
      }

      if (ownerUser?.email) {
        try {
          const emailOptions = emailService.createAccountDeactivatedEmail(
            ownerUser.email,
            ownerUserName,
            'artist',
            reason
          );
          emailService.sendEmail(emailOptions).catch(err => console.error('[Async Email Error] Failed to send artist deactivation email:', err));
        } catch (syncError) {
          console.error('[Email Setup Error] Failed to create artist deactivation email options:', syncError);
        }
      }
    } else if (updatedArtist.isActive === true) {
      // Handle activation notification and email
      if (ownerUser?.id) {
        prisma.notification.create({
          data: {
            type: 'ACCOUNT_ACTIVATED',
            message: 'Your artist account has been reactivated.',
            recipientType: 'USER',
            userId: ownerUser.id,
            isRead: false,
          },
        }).catch(err => console.error('[Async Notify Error] Failed to create artist activation notification:', err));
      }

      if (ownerUser?.email) {
        try {
          const emailOptions = emailService.createAccountActivatedEmail(
            ownerUser.email,
            ownerUserName,
            'artist'
          );
          emailService.sendEmail(emailOptions).catch(err => console.error('[Async Email Error] Failed to send artist activation email:', err));
        } catch (syncError) {
          console.error('[Email Setup Error] Failed to create artist activation email options:', syncError);
        }
      }
    }
  }

  return updatedArtist;
};

export const deleteUserById = async (
  id: string,
  requestingUser: User,
  reason?: string
) => {
  const userToDelete = await prisma.user.findUnique({
    where: { id },
    select: { role: true, email: true, name: true, username: true },
  });

  if (!userToDelete) {
    throw new Error('User not found');
  }

  if (!requestingUser || !requestingUser.role) {
    throw new Error('Permission denied: Invalid requesting user data.');
  }

  if (userToDelete.role === Role.ADMIN) {
    if (requestingUser.id === id) {
      throw new Error('Permission denied: Admins cannot delete themselves.');
    }
    throw new Error(
      'Permission denied: Admins cannot delete other admins.'
    );
  }

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

  await prisma.user.delete({ where: { id } });

  return { message: `User ${id} deleted successfully. Reason: ${reason || 'No reason provided'}` };
};

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

  const associatedUser = artistToDelete.user;
  if (associatedUser && associatedUser.email) {
      try {
          const nameToSend = artistToDelete.artistName || associatedUser.name || associatedUser.username || 'Artist';
          const emailOptions = emailService.createAccountDeletedEmail(
              associatedUser.email,
              nameToSend,
              reason
          );
          emailService.sendEmail(emailOptions).catch(err =>
              console.error('[Async Email Error] Failed to send artist account deletion email:', err)
          );
      } catch (syncError) {
          console.error('[Email Setup Error] Failed to create artist deletion email options:', syncError);
      }
  }

  await prisma.artistProfile.delete({ where: { id: artistToDelete.id } });

  return { message: `Artist ${id} deleted permanently. Reason: ${reason || 'No reason provided'}` };
};

export const getArtists = async (req: Request) => {
  const { search, status, sortBy, sortOrder } = req.query;

  const where: Prisma.ArtistProfileWhereInput = {
    role: Role.ARTIST,
  };

  if (search && typeof search === 'string') {
    where.OR = [
      { artistName: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    where.isActive = status === 'true';
  }

  let orderBy: Prisma.ArtistProfileOrderByWithRelationInput | Prisma.ArtistProfileOrderByWithRelationInput[] = {
    createdAt: 'desc',
  };

  const validSortFields = [
    'artistName',
    'isActive',
    'monthlyListeners',
    'createdAt',
  ];

  if (
    sortBy &&
    typeof sortBy === 'string' &&
    validSortFields.includes(sortBy)
  ) {
    const direction = sortOrder === 'asc' ? 'asc' : 'desc';
    orderBy = { [sortBy]: direction };
  }

  const options = {
    where,
    select: artistProfileSelect,
    orderBy,
  };

  const result = await paginate<ArtistProfile>(prisma.artistProfile, req, options);

  return {
    artists: result.data,
    pagination: result.pagination,
  };
};

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
          albumId: null,
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

export const createNewGenre = async (name: string) => {
  const existingGenre = await prisma.genre.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existingGenre) {
    throw new Error('Genre name already exists');
  }
  return prisma.genre.create({
    data: { name },
  });
};

export const updateGenreInfo = async (id: string, name: string) => {
  const existingGenre = await prisma.genre.findUnique({
    where: { id },
  });

  if (!existingGenre) {
    throw new Error('Genre not found');
  }

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

  return prisma.genre.update({
    where: { id },
    data: { name },
  });
};

export const deleteGenreById = async (id: string) => {
  return prisma.genre.delete({ where: { id } });
};

export const approveArtistRequest = async (requestId: string) => {
  const artistProfile = await prisma.artistProfile.findFirst({
    where: {
      id: requestId,
      verificationRequestedAt: { not: null },
      isVerified: false,
    },
    include: {
      user: { select: { id: true, email: true, name: true, username: true } }
    }
  });

  if (!artistProfile) {
    throw new Error('Artist request not found, already verified, or rejected.');
  }

  const updatedProfile = await prisma.$transaction(async (tx) => {
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


  return {
    ...updatedProfile,
    hasPendingRequest: false
  };
};

export const rejectArtistRequest = async (requestId: string) => {
  const artistProfile = await prisma.artistProfile.findFirst({
    where: {
      id: requestId,
      verificationRequestedAt: { not: null },
      isVerified: false,
    },
    include: {
      user: { select: userSelect },
    },
  });

  if (!artistProfile) {
    throw new Error('Artist request not found, already verified, or rejected.');
  }

  await prisma.artistProfile.delete({
    where: { id: requestId },
  });

  return {
    user: artistProfile.user,
    hasPendingRequest: false,
  };
};

export const deleteArtistRequest = async (requestId: string) => {
  const artistProfile = await prisma.artistProfile.findFirst({
    where: {
      id: requestId,
      verificationRequestedAt: { not: null },
    },
  });

  if (!artistProfile) {
    throw new Error('Artist request not found or not in a deletable state (e.g., approved).');
  }

  await prisma.artistProfile.delete({
    where: { id: requestId },
  });

  return { deletedRequestId: requestId };
};

export const getDashboardStats = async () => {
  const coreStatsPromise = Promise.all([
    prisma.user.count({ where: { role: { not: Role.ADMIN } } }),
    prisma.artistProfile.count({ where: { role: Role.ARTIST, isVerified: true } }),
    prisma.artistProfile.count({ where: { verificationRequestedAt: { not: null }, isVerified: false } }),
    prisma.artistProfile.findMany({
      where: { role: Role.ARTIST, isVerified: true },
      orderBy: [{ monthlyListeners: 'desc' }],
      take: 4,
      select: { id: true, artistName: true, avatar: true, monthlyListeners: true },
    }),
    prisma.genre.count(),
    prisma.label.count(),
    prisma.album.count({ where: { isActive: true } }),
    prisma.track.count({ where: { isActive: true } }),
    prisma.playlist.count({ where: { type: PlaylistType.SYSTEM, userId: null } }),
  ]);

  const monthlyUserDataPromise = (async () => {
    const monthlyData: Array<{ month: string; users: number }> = [];
    const allMonths = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const now = new Date();

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

  const [coreStats, monthlyUserData] = await Promise.all([
    coreStatsPromise,
    monthlyUserDataPromise,
  ]);

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
    monthlyUserData,
    updatedAt: new Date().toISOString(),
  };
};

export const getSystemStatus = async (): Promise<SystemComponentStatus[]> => {
  const statuses: SystemComponentStatus[] = [];

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

  const useRedis = process.env.USE_REDIS_CACHE === 'true';
  if (useRedis) {
    if (redisClient && typeof redisClient.ping === 'function') {
      try {
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
          status: 'Issue',
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

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

      const model = genAI.getGenerativeModel({ model: modelName });
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

export const getCacheStatus = async (): Promise<{ enabled: boolean }> => {
  const useCache = process.env.USE_REDIS_CACHE === 'true';
  let redisConnected = false;
  if (redisClient && redisClient.isOpen) {
      try {
          await redisClient.ping();
          redisConnected = true;
      } catch (error) {
          console.error("Redis ping failed:", error);
          redisConnected = false;
      }
  }
  return { enabled: useCache && redisConnected };
};

export const getAIModelStatus = async (): Promise<{ model: string; validModels: string[] }> => {
  const currentModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  return {
    model: currentModel,
    validModels: VALID_GEMINI_MODELS,
  };
};

export const updateCacheStatus = async (enabled?: boolean): Promise<{ enabled: boolean }> => {
  try {
      const envPath = process.env.NODE_ENV === 'production'
          ? path.resolve(process.cwd(), '../.env')
          : path.resolve(process.cwd(), '.env');

      if (!fs.existsSync(envPath)) {
          console.error(`.env file not found at ${envPath}`);
          throw new Error('Environment file not found.');
      }

      const currentStatus = process.env.USE_REDIS_CACHE === 'true';

      if (enabled === undefined) {
          return { enabled: currentStatus };
      }

      if (enabled === currentStatus) {
          console.log(`[Redis] Cache status already ${enabled ? 'enabled' : 'disabled'}. No change needed.`);
          return { enabled };
      }

      let envContent = fs.readFileSync(envPath, 'utf8');
      const regex = /USE_REDIS_CACHE=.*/;
      const newLine = `USE_REDIS_CACHE=${enabled}`;

      if (envContent.match(regex)) {
          envContent = envContent.replace(regex, newLine);
      } else {
          envContent += `
${newLine}`;
      }
      fs.writeFileSync(envPath, envContent);

      process.env.USE_REDIS_CACHE = String(enabled);
      console.log(`[Redis] Cache ${enabled ? 'enabled' : 'disabled'}. Restart might be required for full effect.`);

      const { client: dynamicRedisClient } = require('../middleware/cache.middleware');

      if (enabled && dynamicRedisClient && !dynamicRedisClient.isOpen) {
          try {
              await dynamicRedisClient.connect();
              console.log('[Redis] Connected successfully.');
          } catch (connectError) {
              console.error('[Redis] Failed to connect after enabling:', connectError);
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
      const currentStatusAfterError = process.env.USE_REDIS_CACHE === 'true';
      throw new Error(`Failed to update cache status. Current status: ${currentStatusAfterError}`);
  }
};

export const updateAIModel = async (model?: string) => {
  try {
    const validModels = [
      'gemini-2.5-flash-preview-04-17',
      'gemini-2.5-pro-preview-03-25',
      'gemini-2.0-flash', 
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
    ];

    const currentModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const isEnabled = !!process.env.GEMINI_API_KEY;

    if (model === undefined) {
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

    if (!validModels.includes(model)) {
      throw new Error(
        `Invalid model name. Valid models are: ${validModels.join(', ')}`
      );
    }

    const envPath = process.env.NODE_ENV === 'production'
        ? path.resolve(process.cwd(), '../.env')
        : path.resolve(process.cwd(), '.env');

    if (!fs.existsSync(envPath)) {
      throw new Error(`.env file not found at ${envPath}`);
    }

    let envContent = fs.readFileSync(envPath, 'utf8');
    const regex = /GEMINI_MODEL=.*/;
    const newLine = `GEMINI_MODEL=${model}`;

    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += `
${newLine}`;
    }

    fs.writeFileSync(envPath, envContent);

    process.env.GEMINI_MODEL = model;

    console.log(`[Admin] AI model changed to: ${model}`);

    return {
      success: true,
      message: `AI model settings updated to ${model}`,
      data: {
        model,
        enabled: isEnabled,
        validModels,
      },
    };
  } catch (error) {
    console.error('[Admin] Error updating AI model:', error);
    return {
       success: false,
       message: error instanceof Error ? error.message : 'Failed to update AI model',
       error: true,
    }
  }
};
