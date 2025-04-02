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

// User management services
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

// Artist request services
export const getArtistRequests = async (req: Request) => {
  const { startDate, endDate, status, search } = req.query;

  const where = {
    verificationRequestedAt: { not: null }, // Chỉ lấy các request đã được gửi
    ...(status === 'pending' ? { isVerified: false } : {}),
    ...(startDate && endDate
      ? {
          verificationRequestedAt: {
            gte: new Date(String(startDate)),
            lte: new Date(String(endDate)),
          },
        }
      : {}),
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
  };

  const options = {
    where,
    select: artistRequestSelect,
    orderBy: { verificationRequestedAt: 'desc' },
  };

  const result = await paginate(prisma.artistProfile, req, options);

  return {
    requests: result.data,
    pagination: result.pagination,
  };
};

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

// User update services
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

// Artist update services
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

  const { artistName, bio, isActive } = data;

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

  // Cập nhật artist trực tiếp với các trường đã gửi
  const updatedArtist = await prisma.artistProfile.update({
    where: { id },
    data: {
      ...(validatedArtistName && { artistName: validatedArtistName }),
      ...(bio !== undefined && { bio }),
      ...(isActive !== undefined && { isActive: toBooleanValue(isActive) }),
      ...(avatarUrl && { avatar: avatarUrl }),
    },
    select: artistProfileSelect,
  });

  return updatedArtist;
};

// Delete services
export const deleteUserById = async (id: string) => {
  return prisma.user.delete({ where: { id } });
};

export const deleteArtistById = async (id: string) => {
  return prisma.artistProfile.delete({ where: { id } });
};

// Artist listing services
export const getArtists = async (req: Request) => {
  const { search = '', status } = req.query;

  const where = {
    role: Role.ARTIST,
    isVerified: true,
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

// Genre management services
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
    where: { name },
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

// Artist request approval services
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

// Stats services
export const getSystemStats = async () => {
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

// System settings services
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
