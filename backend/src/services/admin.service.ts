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
import Matrix from 'ml-matrix';

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
  // Kiểm tra trùng lặp tên thể loại
  const existingGenre = await prisma.genre.findFirst({
    where: { name },
  });
  if (existingGenre) {
    throw new Error('Genre name already exists');
  }

  // Tạo thể loại mới
  return prisma.genre.create({
    data: { name },
  });
};

export const updateGenreInfo = async (id: string, name: string) => {
  // Kiểm tra genre tồn tại
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
  // Kiểm tra request có tồn tại, đang chờ duyệt và artist chưa đc xác minh
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

  // Cập nhật trạng thái
  return prisma.artistProfile.update({
    where: { id: requestId },
    data: {
      role: Role.ARTIST,
      isVerified: true,
      verifiedAt: new Date(),
      verificationRequestedAt: null,
    },
    include: { user: { select: userSelect } },
  });
};

export const rejectArtistRequest = async (requestId: string) => {
  // Kiểm tra hồ sơ dựa vào id, có thời gian xác minh khác null, và artist chưa được xác minh
  const artistProfile = await prisma.artistProfile.findFirst({
    where: {
      id: requestId,
      verificationRequestedAt: { not: null },
      isVerified: false,
    },
    include: {
      // lấy thêm thông tin User đã gửi request
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  });

  if (!artistProfile) {
    throw new Error('Artist request not found or already verified');
  }

  // Xóa artist profile
  await prisma.artistProfile.delete({
    where: { id: requestId },
  });

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
    const envPath = path.resolve(__dirname, '../../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');

    // Danh sách model được hỗ trợ
    const supportedModels = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-thinking-exp-01-21', // Experimental model
      'gemini-2.0-flash-lite',
      'gemini-2.0-pro-exp-02-05',
      'gemini-1.5-flash',
    ];

    // Nếu chỉ lấy model hiện tại mà không cập nhật
    if (model === undefined) {
      const currentModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      return {
        model: currentModel,
        supportedModels,
      };
    }

    // Kiểm tra model có hợp lệ không
    if (!supportedModels.includes(model)) {
      throw new Error('Unsupported AI model');
    }

    // Cập nhật GEMINI_MODEL trong file .env
    if (envContent.includes('GEMINI_MODEL=')) {
      // Nếu biến đã tồn tại, cập nhật giá trị
      const updatedContent = envContent.replace(
        /GEMINI_MODEL=.*/,
        `GEMINI_MODEL=${model}`
      );
      fs.writeFileSync(envPath, updatedContent);
    } else {
      // Nếu biến chưa tồn tại, thêm mới
      fs.writeFileSync(envPath, `${envContent}\nGEMINI_MODEL=${model}`);
    }

    // Cập nhật biến môi trường
    process.env.GEMINI_MODEL = model;

    console.log(`[AI] Model set to: ${model}`);

    return {
      model,
      supportedModels,
    };
  } catch (error) {
    console.error('Error updating AI model', error);
    throw new Error('Failed to update AI model');
  }
};

// Lấy ma trận tương tác giữa các bài hát và người dùng
export const getRecommendationMatrix = async (limit = 100) => {
  try {
    // Lấy những user có lượt play > 2 bài
    const activeUsers = await prisma.user.findMany({
      where: {
        history: {
          some: {
            type: 'PLAY',
            playCount: { gt: 2 },
          },
        },
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
      },
      take: limit,
    });

    if (activeUsers.length < 2) {
      return {
        success: false,
        message: 'Not enough user data for matrix analysis',
        data: null,
      };
    }

    const userIds = activeUsers.map((u) => u.id);

    // Lấy bài hát được nghe nhiều nhất
    const popularTracks = await prisma.track.findMany({
      where: {
        history: {
          some: {
            userId: { in: userIds },
          },
        },
      },
      orderBy: { playCount: 'desc' },
      select: {
        id: true,
        title: true,
        artistId: true,
        artist: {
          select: {
            artistName: true,
          },
        },
        playCount: true,
        coverUrl: true,
      },
      take: limit,
    });

    const trackIds = popularTracks.map((t) => t.id);

    // Lấy lịch sử nghe của các user
    const userHistory = await prisma.history.findMany({
      where: {
        userId: { in: userIds },
        trackId: { in: trackIds },
        type: 'PLAY',
      },
      select: {
        userId: true,
        trackId: true,
        playCount: true,
      },
    });

    // Lấy lượt like
    const userLikes = await prisma.userLikeTrack.findMany({
      where: {
        userId: { in: userIds },
        trackId: { in: trackIds },
      },
      select: {
        userId: true,
        trackId: true,
      },
    });

    // Tạo mapping index
    const userIdToIndex = new Map<string, number>();
    const trackIdToIndex = new Map<string, number>();

    activeUsers.forEach((user, index) => {
      userIdToIndex.set(user.id, index);
    });

    popularTracks.forEach((track, index) => {
      trackIdToIndex.set(track.id, index);
    });

    // Tạo ma trận tương tác
    const matrix = new Matrix(userIds.length, trackIds.length);

    // Điền dữ liệu từ lịch sử nghe
    userHistory.forEach((history) => {
      const userIndex = userIdToIndex.get(history.userId);
      const trackIndex = trackIdToIndex.get(history.trackId!);

      if (userIndex !== undefined && trackIndex !== undefined) {
        matrix.set(userIndex, trackIndex, history.playCount || 1);
      }
    });

    // Tăng trọng số cho lượt like
    userLikes.forEach((like) => {
      const userIndex = userIdToIndex.get(like.userId);
      const trackIndex = trackIdToIndex.get(like.trackId);

      if (userIndex !== undefined && trackIndex !== undefined) {
        const currentValue = matrix.get(userIndex, trackIndex);
        matrix.set(userIndex, trackIndex, currentValue + 3); // Tăng trọng số cho like
      }
    });

    // Chuẩn hóa ma trận
    const normalizedMatrix = normalizeMatrix(matrix);

    // Tính toán ma trận tương đồng giữa các bài hát
    const itemSimilarityMatrix = calculateItemSimilarity(normalizedMatrix);

    // Format dữ liệu để hiển thị trên frontend
    return {
      success: true,
      data: {
        users: activeUsers,
        tracks: popularTracks,
        matrix: matrix.to2DArray(),
        normalizedMatrix: normalizedMatrix.to2DArray(),
        itemSimilarityMatrix: itemSimilarityMatrix.to2DArray(),
        stats: {
          userCount: activeUsers.length,
          trackCount: popularTracks.length,
          totalInteractions: userHistory.length + userLikes.length,
          sparsity: calculateSparsity(matrix),
        },
      },
    };
  } catch (error) {
    console.error('Error fetching recommendation matrix:', error);
    return {
      success: false,
      message: 'Failed to retrieve recommendation matrix',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Hàm tiện ích để tính toán độ thưa thớt của ma trận
const calculateSparsity = (matrix: Matrix): number => {
  const rows = matrix.rows;
  const cols = matrix.columns;
  let nonZeroCount = 0;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (matrix.get(i, j) !== 0) {
        nonZeroCount++;
      }
    }
  }

  return 1 - nonZeroCount / (rows * cols);
};

// Chuẩn hóa ma trận
const normalizeMatrix = (matrix: Matrix): Matrix => {
  const normalizedMatrix = matrix.clone();
  const rows = normalizedMatrix.rows;
  const columns = normalizedMatrix.columns;

  for (let i = 0; i < rows; i++) {
    const rowValues = normalizedMatrix.getRow(i);
    const sum = rowValues.reduce((acc, val) => acc + val, 0);

    if (sum > 0) {
      for (let j = 0; j < columns; j++) {
        const currentValue = normalizedMatrix.get(i, j);
        const normalizedValue = currentValue / sum;
        normalizedMatrix.set(i, j, normalizedValue);
      }
    }
  }

  return normalizedMatrix;
};

// Tính toán ma trận tương đồng giữa các bài hát
const calculateItemSimilarity = (matrix: Matrix): Matrix => {
  const transposedMatrix = matrix.transpose();
  const itemCount = transposedMatrix.rows;
  const similarityMatrix = new Matrix(itemCount, itemCount);

  for (let i = 0; i < itemCount; i++) {
    for (let j = 0; j < itemCount; j++) {
      if (i === j) {
        similarityMatrix.set(i, j, 1);
      } else {
        const itemVectorI = transposedMatrix.getRow(i);
        const itemVectorJ = transposedMatrix.getRow(j);
        const similarity = cosineSimilarity(itemVectorI, itemVectorJ);
        similarityMatrix.set(i, j, similarity);
      }
    }
  }

  return similarityMatrix;
};

// Tính cosine similarity giữa hai vector
const cosineSimilarity = (vectorA: number[], vectorB: number[]): number => {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
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
