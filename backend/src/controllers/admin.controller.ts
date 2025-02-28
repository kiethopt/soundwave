import { Request, Response } from 'express';
import prisma from '../config/db';
import { Role } from '@prisma/client';
import { client } from '../middleware/cache.middleware';
import {
  artistProfileSelect,
  artistRequestDetailsSelect,
  artistRequestSelect,
  genreSelect,
  userSelect,
} from '../utils/prisma-selects';
import { uploadFile } from '../services/cloudinary.service';

// Lấy danh sách tất cả người dùng - ADMIN only
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const offset = (pageNumber - 1) * limitNumber;

    // Xây dựng điều kiện where gộp tất cả điều kiện
    const where: any = {
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

    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: offset,
        take: limitNumber,
        include: {
          artistProfile: {
            include: {
              genres: {
                include: {
                  genre: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users: users.map((user) => ({
        ...user,
        artistProfile: user.artistProfile
          ? {
              ...user.artistProfile,
              socialMediaLinks: user.artistProfile.socialMediaLinks || {},
              verifiedAt: user.artistProfile.verifiedAt,
            }
          : null,
      })),
      pagination: {
        total: totalUsers,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalUsers / limitNumber),
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy thông tin chi tiết của một người dùng - ADMIN only
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const cacheKey = req.originalUrl;

    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log(`[Redis] Cache hit for key: ${cacheKey}`);
        res.json(JSON.parse(cachedData));
        return;
      }
      console.log(`[Redis] Cache miss for key: ${cacheKey}`);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (process.env.USE_REDIS_CACHE === 'true') {
      console.log(`[Redis] Caching data for key: ${cacheKey}`);
      await client.setEx(cacheKey, 300, JSON.stringify(user));
    }

    res.json(user);
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy tất cả request yêu cầu trở thành Artist từ User - ADMIN only
export const getAllArtistRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      status,
      search,
    } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const offset = (pageNumber - 1) * limitNumber;

    // Xây dựng điều kiện where gộp tất cả điều kiện
    const where: any = {
      verificationRequestedAt: { not: null }, // Chỉ lấy các request đã được gửi
      ...(status === 'pending' ? { isVerified: false } : {}),
      ...(startDate && endDate
        ? {
            verificationRequestedAt: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string),
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

    const [requests, totalRequests] = await Promise.all([
      prisma.artistProfile.findMany({
        where,
        skip: offset,
        take: limitNumber,
        select: artistRequestSelect,
        orderBy: {
          verificationRequestedAt: 'desc',
        },
      }),
      prisma.artistProfile.count({ where }),
    ]);

    res.json({
      requests,
      pagination: {
        total: totalRequests,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalRequests / limitNumber),
      },
    });
  } catch (error) {
    console.error('Get artist requests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xem chi tiết request yêu cầu trở thành Artist từ User - ADMIN only
export const getArtistRequestDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const cacheKey = req.originalUrl;

    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log(`[Redis] Cache hit for key: ${cacheKey}`);
        res.json(JSON.parse(cachedData));
        return;
      }
      console.log(`[Redis] Cache miss for key: ${cacheKey}`);
    }

    const request = await prisma.artistProfile.findUnique({
      where: { id },
      select: artistRequestDetailsSelect,
    });

    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    if (process.env.USE_REDIS_CACHE === 'true') {
      console.log(`[Redis] Caching data for key: ${cacheKey}`);
      await client.setEx(cacheKey, 300, JSON.stringify(request));
    }

    res.json(request);
  } catch (error) {
    console.error('Get artist request details error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cập nhật thông tin người dùng - ADMIN only
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, username, isActive } = req.body;
    const avatarFile = req.file;

    // Validation
    const validationErrors = [];
    if (!id) validationErrors.push('User ID is required');
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      validationErrors.push('Invalid email format');
    }
    if (username && username.length < 3) {
      validationErrors.push('Username must be at least 3 characters long');
    }
    if (validationErrors.length > 0) {
      res
        .status(400)
        .json({ message: 'Validation failed', errors: validationErrors });
      return;
    }

    // Kiểm tra user tồn tại
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!currentUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Kiểm tra trùng lặp email/username
    if (email && email !== currentUser.email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (existingEmail) {
        res.status(400).json({ message: 'Email already exists' });
        return;
      }
    }

    if (username && username !== currentUser.username) {
      const existingUsername = await prisma.user.findFirst({
        where: { username, NOT: { id } },
      });
      if (existingUsername) {
        res.status(400).json({ message: 'Username already exists' });
        return;
      }
    }

    // Xử lý avatar
    let avatarUrl = currentUser.avatar;
    if (avatarFile) {
      const uploadResult = await uploadFile(avatarFile.buffer, 'users/avatars');
      avatarUrl = uploadResult.secure_url;
    }

    // Chuyển đổi isActive thành boolean
    const isActiveBool =
      isActive !== undefined
        ? isActive === 'true' || isActive === true
        : undefined;

    // Cập nhật user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(username && { username }),
        ...(avatarUrl &&
          avatarUrl !== currentUser.avatar && { avatar: avatarUrl }),
        ...(isActiveBool !== undefined && { isActive: isActiveBool }),
      },
      select: userSelect,
    });

    res.json({
      message:
        isActiveBool !== undefined
          ? `User ${isActiveBool ? 'activated' : 'deactivated'} successfully`
          : 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cập nhật thông tin nghệ sĩ - ADMIN only
export const updateArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { artistName, bio, socialMediaLinks, isActive } = req.body;
    const avatarFile = req.file;

    // Validation
    const validationErrors = [];
    if (!id) validationErrors.push('Artist ID is required');
    if (artistName && artistName.length < 2) {
      validationErrors.push('Artist name must be at least 2 characters long');
    }
    if (bio && bio.length > 1000) {
      validationErrors.push('Bio must not exceed 1000 characters');
    }
    if (validationErrors.length > 0) {
      res
        .status(400)
        .json({ message: 'Validation failed', errors: validationErrors });
      return;
    }

    // Kiểm tra artist tồn tại
    const existingArtist = await prisma.artistProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingArtist) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    // Kiểm tra trùng lặp artist name
    if (artistName && artistName !== existingArtist.artistName) {
      const existingArtistName = await prisma.artistProfile.findFirst({
        where: { artistName, NOT: { id } },
      });
      if (existingArtistName) {
        res.status(400).json({ message: 'Artist name already exists' });
        return;
      }
    }

    // Xử lý avatar
    let avatarUrl = existingArtist.avatar;
    if (avatarFile) {
      const uploadResult = await uploadFile(
        avatarFile.buffer,
        'artists/avatars'
      );
      avatarUrl = uploadResult.secure_url;
    }

    // Chuyển đổi isActive thành boolean
    const isActiveBool =
      isActive !== undefined
        ? isActive === 'true' || isActive === true
        : undefined;

    // Cập nhật artist
    const updatedArtist = await prisma.artistProfile.update({
      where: { id },
      data: {
        ...(artistName && { artistName }),
        ...(bio && { bio }),
        ...(socialMediaLinks && { socialMediaLinks }),
        ...(avatarUrl &&
          avatarUrl !== existingArtist.avatar && { avatar: avatarUrl }),
        ...(isActiveBool !== undefined && { isActive: isActiveBool }),
      },
      select: artistProfileSelect,
    });

    res.json({
      message:
        isActiveBool !== undefined
          ? `Artist ${isActiveBool ? 'activated' : 'deactivated'} successfully`
          : 'Artist updated successfully',
      artist: updatedArtist,
    });
  } catch (error) {
    console.error('Update artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa người dùng - ADMIN only
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa nghệ sĩ - ADMIN only
export const deleteArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.artistProfile.delete({ where: { id } });
    res.json({ message: 'Artist deleted permanently' });
  } catch (error) {
    console.error('Delete artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách tất cả nghệ sĩ - ADMIN only
export const getAllArtists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const offset = (pageNumber - 1) * limitNumber;

    // Xây dựng điều kiện where gộp tất cả điều kiện
    const where: any = {
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

    const [artists, totalArtists] = await Promise.all([
      prisma.artistProfile.findMany({
        where,
        skip: offset,
        take: limitNumber,
        select: artistProfileSelect,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.artistProfile.count({ where }),
    ]);

    res.json({
      artists,
      pagination: {
        total: totalArtists,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalArtists / limitNumber),
      },
    });
  } catch (error) {
    console.error('Get all artists error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy thông tin chi tiết của một nghệ sĩ - ADMIN only
export const getArtistById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const cacheKey = req.originalUrl;

    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log(`[Redis] Cache hit for key: ${cacheKey}`);
        res.json(JSON.parse(cachedData));
        return;
      }
      console.log(`[Redis] Cache miss for key: ${cacheKey}`);
    }

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
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    if (process.env.USE_REDIS_CACHE === 'true') {
      console.log(`[Redis] Caching data for key: ${cacheKey}`);
      await client.setEx(cacheKey, 300, JSON.stringify(artist));
    }

    res.json(artist);
  } catch (error) {
    console.error('Get artist by id error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách tất cả thể loại nhạc - ADMIN only
export const getAllGenres = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const offset = (pageNumber - 1) * limitNumber;

    // Xây dựng điều kiện where gộp tất cả điều kiện
    const where: any = {
      ...(search
        ? {
            name: {
              contains: String(search),
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [genres, totalGenres] = await Promise.all([
      prisma.genre.findMany({
        where,
        skip: offset,
        take: limitNumber,
        select: genreSelect,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.genre.count({ where }),
    ]);

    res.json({
      genres,
      pagination: {
        total: totalGenres,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalGenres / limitNumber),
      },
    });
  } catch (error) {
    console.error('Get all genres error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Tạo thể loại nhạc mới - ADMIN only
export const createGenre = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name } = req.body;

    // Validation tập trung
    const validationErrors = [];
    if (!name) validationErrors.push('Name is required');
    if (name && name.trim() === '')
      validationErrors.push('Name cannot be empty');
    if (name && name.length > 50) {
      validationErrors.push('Name exceeds maximum length (50 characters)');
    }
    if (validationErrors.length > 0) {
      res
        .status(400)
        .json({ message: 'Validation failed', errors: validationErrors });
      return;
    }

    // Kiểm tra trùng lặp tên thể loại
    const existingGenre = await prisma.genre.findFirst({
      where: { name },
    });
    if (existingGenre) {
      res.status(400).json({ message: 'Genre name already exists' });
      return;
    }

    // Tạo thể loại mới
    const genre = await prisma.genre.create({
      data: { name },
    });

    res.status(201).json({ message: 'Genre created successfully', genre });
  } catch (error) {
    console.error('Create genre error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cập nhật thể loại nhạc - ADMIN only
export const updateGenre = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validation tập trung
    const validationErrors = [];
    if (!id) validationErrors.push('Genre ID is required');
    if (!name) validationErrors.push('Name is required');
    if (name && name.trim() === '')
      validationErrors.push('Name cannot be empty');
    if (name && name.length > 50) {
      validationErrors.push('Name exceeds maximum length (50 characters)');
    }
    if (validationErrors.length > 0) {
      res
        .status(400)
        .json({ message: 'Validation failed', errors: validationErrors });
      return;
    }

    // Kiểm tra genre tồn tại
    const existingGenre = await prisma.genre.findUnique({
      where: { id },
    });

    if (!existingGenre) {
      res.status(404).json({ message: 'Genre not found' });
      return;
    }

    // Kiểm tra trùng lặp tên
    if (name !== existingGenre.name) {
      const existingGenreWithName = await prisma.genre.findFirst({
        where: { name, NOT: { id } },
      });
      if (existingGenreWithName) {
        res.status(400).json({ message: 'Genre name already exists' });
        return;
      }
    }

    // Cập nhật genre
    const updatedGenre = await prisma.genre.update({
      where: { id },
      data: { name },
    });

    res.json({
      message: 'Genre updated successfully',
      genre: updatedGenre,
    });
  } catch (error) {
    console.error('Update genre error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa thể loại nhạc - ADMIN only
export const deleteGenre = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.genre.delete({ where: { id } });
    res.json({ message: 'Genre deleted successfully' });
  } catch (error) {
    console.error('Delete genre error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Duyệt yêu cầu trở thành Artist (Approve Artist Request) - ADMIN only
export const approveArtistRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { requestId } = req.body;

    // Lấy và kiểm tra ArtistProfile
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!artistProfile?.verificationRequestedAt || artistProfile.isVerified) {
      res
        .status(404)
        .json({ message: 'Artist request not found or already verified' });
      return;
    }

    // Cập nhật ArtistProfile và lấy thông tin user ngay trong một truy vấn
    const updatedProfile = await prisma.artistProfile.update({
      where: { id: requestId },
      data: {
        role: Role.ARTIST,
        isVerified: true,
        verifiedAt: new Date(),
        verificationRequestedAt: null,
      },
      include: { user: { select: userSelect } },
    });

    res.json({
      message: 'Artist role approved successfully',
      user: updatedProfile.user,
    });
  } catch (error) {
    console.error('Approve artist request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Từ chối yêu cầu trở thành Artist (Reject Artist Request) - ADMIN only
export const rejectArtistRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { requestId } = req.body;

    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id: requestId },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
    });

    if (
      !artistProfile ||
      !artistProfile.verificationRequestedAt ||
      artistProfile.isVerified
    ) {
      res
        .status(404)
        .json({ message: 'Artist request not found or already verified' });
      return;
    }

    await prisma.artistProfile.delete({
      where: { id: requestId },
    });

    res.json({
      message: 'Artist role request rejected successfully',
      user: artistProfile.user,
      hasPendingRequest: false,
    });
  } catch (error) {
    console.error('Reject artist request error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy thông số tổng quan để thống kê - ADMIN only
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = req.originalUrl;

    // Kiểm tra cache Redis nếu được bật
    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedStats = await client.get(cacheKey);
      if (cachedStats) {
        console.log(`[Redis] Cache hit for key: ${cacheKey}`);
        res.json(JSON.parse(cachedStats));
        return;
      }
      console.log(`[Redis] Cache miss for key: ${cacheKey}`);
    }

    // Sử dụng Promise.all để thực hiện đồng thời các truy vấn
    const stats = await Promise.all([
      prisma.user.count(), // Tổng số user
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
      prisma.artistProfile.findFirst({
        where: {
          role: Role.ARTIST,
          isVerified: true,
        },
        orderBy: [{ monthlyListeners: 'desc' }],
        select: {
          id: true,
          artistName: true,
          monthlyListeners: true,
        },
      }), // Nghệ sĩ nổi bật nhất
      prisma.genre.count(), // Tổng số thể loại nhạc
    ]);

    const [
      totalUsers,
      totalArtists,
      totalArtistRequests,
      mostActiveArtist,
      totalGenres,
    ] = stats;

    const statsData = {
      totalUsers,
      totalArtists,
      totalArtistRequests,
      totalGenres,
      trendingArtist: {
        id: mostActiveArtist?.id || '',
        artistName: mostActiveArtist?.artistName || '',
        monthlyListeners: mostActiveArtist?.monthlyListeners || 0,
      },
      updatedAt: new Date().toISOString(),
    };

    if (process.env.USE_REDIS_CACHE === 'true') {
      console.log(`[Redis] Caching data for key: ${cacheKey}`);
      await client.setEx(cacheKey, 3600, JSON.stringify(statsData)); // Tăng TTL lên 1 giờ
    }

    res.json(statsData);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
