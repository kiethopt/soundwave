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
import { Prisma } from '@prisma/client';
import { ArtistProfile } from '@prisma/client';

// Lấy danh sách user
export const getUsers = async (req: Request) => {
  const { search = '', status } = req.query;

  const where = {
    role: 'USER',
    ...(search
      ? {
          OR: [
            { email: { contains: String(search), mode: 'insensitive' } },
            { username: { contains: String(search), mode: 'insensitive' } },
            { name: { contains: String(search), mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(status !== undefined ? { isActive: status === 'true' } : {}),
  };

  const options = {
    where,
    include: {
      artistProfile: true,
    },
    orderBy: { createdAt: 'desc' },
  };

  const result = await paginate(prisma.user, req, options);

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

  // Status filter (isVerified)
  const isVerified = toBooleanValue(status);
  if (isVerified !== undefined) {
    if (Array.isArray(where.AND)) {
      where.AND.push({ isVerified: isVerified });
    }
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
      // Use 'lte' (less than or equal to) for end date
      dateFilter.verificationRequestedAt = {
        gte: parsedStartDate,
        lte: endOfDay,
      };
    } else {
      // Only startDate is provided, filter from start date onwards
      dateFilter.verificationRequestedAt = {
        gte: parsedStartDate,
      };
    }
    // Explicitly check if where.AND is an array before push
    if (Array.isArray(where.AND)) {
      where.AND.push(dateFilter);
    }
  }
  // If only endDate is provided, we could potentially filter up to that date, but it's less common.
  // Current logic requires startDate to be present for date filtering.

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

// Cập nhật thông tin user
export const updateUserInfo = async (
  id: string,
  data: any,
  avatarFile?: Express.Multer.File
) => {
  // Kiểm tra user tồn tại
  const currentUser = await prisma.user.findUnique({
    where: { id },
    select: { ...userSelect, password: true },
  });

  if (!currentUser) {
    throw new Error('User not found');
  }

  const { name, email, username, isActive, role, password, currentPassword } =
    data;
  let passwordHash;
  if (password) {
    const bcrypt = require('bcrypt');

    // Kiểm tra mk hiện tại người dùng nhập có phải là mk cũ không
    if (currentPassword) {
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        currentUser.password
      );
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Mã hóa mk mới
      passwordHash = await bcrypt.hash(password, 10);
    }
  }

  // Kiểm tra trùng lặp email nếu có thay đổi
  if (email && email !== currentUser.email) {
    const existingEmail = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    });
    if (existingEmail) {
      throw new Error('Email already exists');
    }
  }

  // Kiểm tra trùng lặp username nếu có thay đổi
  if (username && username !== currentUser.username) {
    const existingUsername = await prisma.user.findFirst({
      where: { username, NOT: { id } },
    });
    if (existingUsername) {
      throw new Error('Username already exists');
    }
  }

  // Xử lý avatar nếu có
  let avatarUrl = currentUser.avatar;
  if (avatarFile) {
    const uploadResult = await uploadFile(avatarFile.buffer, 'users/avatars');
    avatarUrl = uploadResult.secure_url;
  }

  // Chuyển đổi isActive thành boolean nếu có
  const isActiveBool =
    isActive !== undefined ? toBooleanValue(isActive) : undefined;

  // Cập nhật user với các trường đã gửi
  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(username !== undefined && { username }),
      ...(avatarUrl !== currentUser.avatar && { avatar: avatarUrl }),
      ...(isActiveBool !== undefined && { isActive: isActiveBool }),
      ...(role !== undefined && { role }),
      ...(passwordHash && { password: passwordHash }),
    },
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
  if (socialMediaLinks) {
    try {
      // Assuming socialMediaLinks is passed as a JSON string from FormData
      const parsedLinks = typeof socialMediaLinks === 'string' ? JSON.parse(socialMediaLinks) : socialMediaLinks;
      // Simple validation: ensure it's an object
      if (typeof parsedLinks === 'object' && parsedLinks !== null) {
        socialMediaLinksUpdate = parsedLinks;
      } else {
        console.warn('Invalid socialMediaLinks format received:', socialMediaLinks);
        // Keep existing links if parsing fails or format is wrong
      }
    } catch (error) {
      console.error('Error parsing socialMediaLinks JSON:', error);
      // Keep existing links if parsing fails
    }
  } else if (socialMediaLinks === null || socialMediaLinks === '') {
    // Allow clearing social media links
    socialMediaLinksUpdate = null;
  }

  // Cập nhật artist trực tiếp với các trường đã gửi
  const updatedArtist = await prisma.artistProfile.update({
    where: { id },
    data: {
      ...(validatedArtistName && { artistName: validatedArtistName }),
      ...(bio !== undefined && { bio }),
      ...(isActive !== undefined && { isActive: toBooleanValue(isActive) }),
      ...(isVerified !== undefined && {
        isVerified: toBooleanValue(isVerified),
        // Optionally update verifiedAt based on isVerified status
        verifiedAt: toBooleanValue(isVerified) ? new Date() : null,
      }),
      ...(avatarUrl && { avatar: avatarUrl }),
      ...(socialMediaLinks !== undefined && { socialMediaLinks: socialMediaLinksUpdate }), // Update social media links
    },
    select: artistProfileSelect,
  });

  return updatedArtist;
};

// Xóa user theo ID
export const deleteUserById = async (id: string) => {
  return prisma.user.delete({ where: { id } });
};

export const deleteArtistById = async (id: string) => {
  return prisma.artistProfile.delete({ where: { id } });
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
    where: { name },
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

  // Kiểm tra trùng lặp tên
  if (name !== existingGenre.name) {
    const existingGenreWithName = await prisma.genre.findFirst({
      where: { name, NOT: { id } },
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
      isVerified: false,
    },
  });

  if (!artistProfile) {
    throw new Error('Artist request not found or already verified');
  }

  return prisma.artistProfile.update({
    where: { id: requestId },
    data: {
      role: Role.ARTIST,
      isVerified: true,
      verifiedAt: new Date(),
      verificationRequestedAt: null,
    },
    include: {
      user: { select: userSelect },
    },
  });
};

// Từ chối yêu cầu trở thành nghệ sĩ
export const rejectArtistRequest = async (requestId: string) => {
  const artistProfile = await prisma.artistProfile.findFirst({
    where: {
      id: requestId,
      verificationRequestedAt: { not: null },
      isVerified: false,
    },
    include: {
      // **Sửa ở đây: Sử dụng userSelect thay vì select thủ công**
      user: { select: userSelect },
    },
  });

  if (!artistProfile) {
    throw new Error('Artist request not found or already verified');
  }

  // Xóa artist profile khi từ chối
  await prisma.artistProfile.delete({
    where: { id: requestId },
  });

  // Trả về thông tin user đã được select bởi userSelect (bao gồm cả username)
  return {
    user: artistProfile.user,
    hasPendingRequest: false,
  };
};

// Xóa yêu cầu trở thành nghệ sĩ
export const deleteArtistRequest = async (requestId: string) => {
  const artistProfile = await prisma.artistProfile.findFirst({
    where: {
      id: requestId,
      verificationRequestedAt: { not: null },
      isVerified: false,
    },
  });

  if (!artistProfile) {
    throw new Error('Artist request not found or already verified/rejected');
  }

  await prisma.artistProfile.delete({
    where: { id: requestId },
  });

  return { deletedRequestId: requestId };
};

// Lấy thống kê dashboard
export const getDashboardStats = async () => {
  // Sử dụng Promise.all để thực hiện đồng thời các truy vấn
  const stats = await Promise.all([
    prisma.user.count({ where: { role: Role.USER } }),
    prisma.artistProfile.count({
      where: {
        role: Role.ARTIST,
        isVerified: true,
      },
    }), // Tổng số nghệ sĩ đã xác minh
    prisma.artistProfile.count({
      where: {
        verificationRequestedAt: { not: null },
        isVerified: false,
      },
    }), // Tổng số yêu cầu nghệ sĩ đang chờ
    prisma.artistProfile.findMany({
      where: {
        role: Role.ARTIST,
        isVerified: true,
      },
      orderBy: [{ monthlyListeners: 'desc' }],
      take: 4,
      select: {
        id: true,
        artistName: true,
        avatar: true,
        monthlyListeners: true,
      },
    }), // Nghệ sĩ nổi bật nhất
    prisma.genre.count(), // Tổng số thể loại nhạc
  ]);

  const [
    totalUsers,
    totalArtists,
    totalArtistRequests,
    topArtists,
    totalGenres,
  ] = stats;

  return {
    totalUsers,
    totalArtists,
    totalArtistRequests,
    totalGenres,
    topArtists: topArtists.map((artist) => ({
      id: artist.id,
      artistName: artist.artistName,
      avatar: artist.avatar,
      monthlyListeners: artist.monthlyListeners,
    })),
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
    // Check 1: Kiểm tra xem có bị lỗi hay không
    if (typeof redisClient.ping !== 'function') {
      console.warn('[System Status] Redis check inconsistent: Cache enabled but using mock client (restart required).');
      statuses.push({
        name: 'Cache (Redis)',
        status: 'Issue',
        message: 'Inconsistent config: Cache enabled, but mock client active (restart needed).',
      });
    } else {
      // Check 2: Kiểm tra xem client có kết nối hay không
      if (!redisClient.isOpen) {
         statuses.push({ name: 'Cache (Redis)', status: 'Outage', message: 'Client not connected' });
      } else {
        // Check 3: Kiểm tra xem có bị lỗi hay không
        try {
          await redisClient.ping();
          statuses.push({ name: 'Cache (Redis)', status: 'Available' });
        } catch (error) {
          console.error('[System Status] Redis ping failed:', error);
          statuses.push({
            name: 'Cache (Redis)',
            status: 'Issue', // Sử dụng 'Issue' cho vấn đề kết nối sau khi kết nối ban đầu
            message: error instanceof Error ? error.message : 'Ping failed',
          });
        }
      }
    }
  } else {
    statuses.push({ name: 'Cache (Redis)', status: 'Disabled', message: 'USE_REDIS_CACHE is false' });
  }

  // 3. Check Cloudinary
  try {
    // Import Cloudinary locally
    const cloudinary = (await import('cloudinary')).v2;
    const pingResult = await cloudinary.api.ping();
    if (pingResult?.status === 'ok') {
       statuses.push({ name: 'Cloudinary (Media Storage)', status: 'Available' });
    } else {
       statuses.push({ name: 'Cloudinary (Media Storage)', status: 'Issue', message: 'Ping failed or unexpected status' });
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
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

      // Kiểm tra xem có bị lỗi hay không
      const model = genAI.getGenerativeModel({ model: modelName });
      await model.countTokens(""); // Gọi hàm countTokens để kiểm tra xem có bị lỗi hay không

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
      // Verify the connection
      await nodemailerTransporter.verify();
      statuses.push({ name: 'Email (Nodemailer)', status: 'Available' });
    } catch (error: any) {
      console.error('[System Status] Nodemailer verification failed:', error);
      statuses.push({
        name: 'Email (Nodemailer)',
        status: 'Outage',
        message: error.message || 'Verification failed',
      });
    }
  } else {
    // Transporter is null (likely due to missing config)
    statuses.push({
      name: 'Email (Nodemailer)',
      status: 'Disabled',
      message: 'SMTP configuration incomplete or verification failed',
    });
  }

  return statuses;
};

// Cập nhật trạng thái cache
export const updateCacheStatus = async (enabled: boolean) => {
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');

    if (enabled === undefined) {
      const currentStatus = process.env.USE_REDIS_CACHE === 'true';
      return { enabled: currentStatus };
    }

    // Update USE_REDIS_CACHE
    const updatedContent = envContent.replace(
      /USE_REDIS_CACHE=.*/,
      `USE_REDIS_CACHE=${enabled}`
    );

    fs.writeFileSync(envPath, updatedContent);

    // Cập nhật biến môi trường và xử lý kết nối Redis
    const previousStatus = process.env.USE_REDIS_CACHE === 'true';
    process.env.USE_REDIS_CACHE = String(enabled);

    console.log(`[Redis] Cache ${enabled ? 'enabled' : 'disabled'}`);

    // Xử lý kết nối Redis dựa trên trạng thái mới
    const { client } = require('../middleware/cache.middleware');

    if (enabled && !previousStatus && !client.isOpen) {
      await client.connect();
    } else if (!enabled && previousStatus && client.isOpen) {
      await client.disconnect();
    }

    return { enabled };
  } catch (error) {
    console.error('Error updating cache status', error);
    throw new Error('Failed to update cache status');
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

    // If no model is specified in the request, return current settings
    if (!model) {
      return {
        success: true,
        message: 'Current AI model settings retrieved',
        data: {
          model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
          enabled: !!process.env.GEMINI_API_KEY,
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

    let envPath;
    // In development, modify .env file
    if (process.env.NODE_ENV === 'development') {
      envPath = path.join(process.cwd(), '.env');
    } else {
      // In production, assume it's one directory up from the current working directory
      envPath = path.join(process.cwd(), '..', '.env');
    }

    if (!fs.existsSync(envPath)) {
      throw new Error(`.env file not found at ${envPath}`);
    }

    let envContent = fs.readFileSync(envPath, 'utf8');

    // Update GEMINI_MODEL in .env file
    if (envContent.includes('GEMINI_MODEL=')) {
      envContent = envContent.replace(
        /GEMINI_MODEL=.*/,
        `GEMINI_MODEL=${model}`
      );
    } else {
      envContent += `\nGEMINI_MODEL=${model}`;
    }

    fs.writeFileSync(envPath, envContent);

    // Update environment variable for current process
    process.env.GEMINI_MODEL = model;

    console.log(`[Admin] AI model changed to: ${model}`);

    return {
      success: true,
      message: `AI model settings updated to ${model}`,
      data: {
        model,
        enabled: true,
        validModels,
      },
    };
  } catch (error) {
    console.error('[Admin] Error updating AI model:', error);
    throw error;
  }
};

// Cập nhật trạng thái bảo trì
export const updateMaintenanceMode = async (enabled?: boolean) => {
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');

    if (enabled === undefined) {
      const currentStatus = process.env.MAINTENANCE_MODE === 'true';
      return { enabled: currentStatus };
    }

    // Update MAINTENANCE_MODE trong file .env
    if (envContent.includes('MAINTENANCE_MODE=')) {
      const updatedContent = envContent.replace(
        /MAINTENANCE_MODE=.*/,
        `MAINTENANCE_MODE=${enabled}`
      );
      fs.writeFileSync(envPath, updatedContent);
    } else {
      // Nếu env không có thì thêm vào
      fs.writeFileSync(envPath, `${envContent}\nMAINTENANCE_MODE=${enabled}`);
    }

    process.env.MAINTENANCE_MODE = String(enabled);

    console.log(
      `[System] Maintenance mode ${enabled ? 'enabled' : 'disabled'}`
    );

    return { enabled };
  } catch (error) {
    console.error('Error updating maintenance mode', error);
    throw new Error('Failed to update maintenance mode');
  }
};
