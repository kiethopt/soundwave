import { Request, Response } from 'express';
import prisma from '../config/db';
import { Role } from '@prisma/client';
import { uploadFile } from '../services/cloudinary.service';
import bcrypt from 'bcrypt';
import {
  clearCacheForEntity,
  client,
  setCache,
} from '../middleware/cache.middleware';
import { sessionService } from '../services/session.service';
import {
  albumSelect,
  artistProfileSelect,
  artistRequestDetailsSelect,
  artistRequestSelect,
  genreSelect,
  searchTrackSelect,
  userSelect,
} from '../utils/prisma-selects';

// Tạo 1 artist mới
export const createArtist = async (req: Request, res: Response) => {
  try {
    const { name, email, artistName, bio, genres, socialMediaLinks } = req.body;
    const avatarFile = req.file;

    const user = req.user;
    if (!user || user.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Generate username từ name hoặc email
    let username =
      name?.toLowerCase().replace(/\s+/g, '') || email.split('@')[0];

    // Kiểm tra xem username đã tồn tại chưa
    let existingUser = await prisma.user.findUnique({
      where: { username },
    });

    // Nếu username đã tồn tại, thêm một số ngẫu nhiên vào cuối
    if (existingUser) {
      let isUnique = false;
      let counter = 1;
      while (!isUnique) {
        const newUsername = `${username}${counter}`;
        existingUser = await prisma.user.findUnique({
          where: { username: newUsername },
        });
        if (!existingUser) {
          username = newUsername;
          isUnique = true;
        }
        counter++;
      }
    }

    let avatarUrl = null;
    if (avatarFile) {
      const uploadResult = await uploadFile(
        avatarFile.buffer,
        'avatars',
        'image'
      );
      avatarUrl = uploadResult.secure_url;
    }

    // Parse socialMediaLinks from string to object
    let parsedSocialMediaLinks = {};
    try {
      parsedSocialMediaLinks = JSON.parse(socialMediaLinks);
    } catch (e) {
      console.error('Error parsing socialMediaLinks:', e);
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('artist123', saltRounds);

    // Tạo artist mới với username và ArtistProfile
    const artist = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name,
        avatar: avatarUrl,
        role: Role.USER,
        artistProfile: {
          create: {
            artistName: artistName || name,
            bio: bio || null,
            avatar: avatarUrl,
            role: Role.ARTIST,
            socialMediaLinks: parsedSocialMediaLinks,
            monthlyListeners: 0,
            isVerified: true, // Artist được tạo bởi ADMIN mặc định là verified
            verifiedAt: new Date(),
          },
        },
      },
      include: {
        artistProfile: true,
      },
    });

    res.status(201).json({ message: 'Artist created successfully', artist });
  } catch (error) {
    console.error('Create artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách tất cả người dùng
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const offset = (pageNumber - 1) * limitNumber;

    // Sử dụng req.originalUrl làm cache key
    const cacheKey = req.originalUrl;

    // Nếu cache được bật, thử lấy dữ liệu từ cache
    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log(`[Redis] Cache hit for key: ${cacheKey}`);
        res.json(JSON.parse(cachedData));
        return;
      }
      console.log(`[Redis] Cache miss for key: ${cacheKey}`);
    }

    // Lấy tất cả người dùng, không phân biệt role
    const users = await prisma.user.findMany({
      skip: offset,
      take: limitNumber,
      select: userSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalUsers = await prisma.user.count();

    const response = {
      users,
      pagination: {
        total: totalUsers,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalUsers / limitNumber),
      },
    };

    // Lưu vào cache nếu caching được bật
    if (process.env.USE_REDIS_CACHE === 'true') {
      console.log(`[Redis] Caching data for key: ${cacheKey}`);
      await client.setEx(cacheKey, 300, JSON.stringify(response));
    }

    res.json(response);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy thông tin chi tiết của một người dùng
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

// Lấy tất cả request yêu cầu trở thành Artist từ User
export const getArtistRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
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

    const requests = await prisma.artistProfile.findMany({
      where: {
        verificationRequestedAt: { not: null },
        isVerified: false,
      },
      skip: offset,
      take: Number(limit),
      select: artistRequestSelect,
    });

    const totalRequests = await prisma.artistProfile.count({
      where: {
        verificationRequestedAt: { not: null },
        isVerified: false,
      },
    });

    const response = {
      requests,
      pagination: {
        total: totalRequests,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalRequests / Number(limit)),
      },
    };

    if (process.env.USE_REDIS_CACHE === 'true') {
      console.log(`[Redis] Caching data for key: ${cacheKey}`);
      await client.setEx(cacheKey, 300, JSON.stringify(response));
    }

    res.json(response);
  } catch (error) {
    console.error('Get artist requests error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xem chi tiết request yêu cầu trở thành Artist từ User
export const getArtistRequestDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

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

// Cập nhật thông tin người dùng
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { role, isVerified, name, email, username } = req.body;

    // Validation cơ bản
    if (!id) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }

    // Kiểm tra role hợp lệ
    if (role && !Object.values(Role).includes(role)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    // Lấy thông tin người dùng hiện tại
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!currentUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Kiểm tra xem email mới có trùng với user khác không
    if (email && email !== currentUser.email) {
      const existingUserWithEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUserWithEmail) {
        res.status(400).json({ message: 'Email already exists' });
        return;
      }
    }

    // Kiểm tra xem username mới có trùng với user khác không
    if (username && username !== currentUser.username) {
      const existingUserWithUsername = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUserWithUsername) {
        res.status(400).json({ message: 'Username already exists' });
        return;
      }
    }

    // Case 1: Không thể thay đổi role của ADMIN
    if (currentUser.role === Role.ADMIN) {
      res.status(403).json({ message: 'Cannot modify ADMIN role' });
      return;
    }

    // Case 2: Kiểm tra khi chuyển từ USER sang ARTIST
    if (role === Role.ARTIST && currentUser.role === Role.USER) {
      if (!currentUser.artistProfile?.verificationRequestedAt) {
        res.status(400).json({
          message: 'User has not requested to become an artist',
        });
        return;
      }
    }

    // Case 3: Kiểm tra khi đã là ARTIST và verified
    if (
      currentUser.role === Role.ARTIST &&
      currentUser.artistProfile?.isVerified
    ) {
      if (role === Role.USER) {
        res.status(400).json({
          message: 'Cannot change role from ARTIST to USER once verified',
        });
        return;
      }
      if (isVerified === false) {
        res.status(400).json({
          message: 'Cannot unverify a verified artist',
        });
        return;
      }
    }

    // Case 4: Kiểm tra khi đặt isVerified thành true
    if (isVerified === true) {
      // Nếu user chưa gửi request, không cho phép đặt isVerified thành true
      if (!currentUser.artistProfile?.verificationRequestedAt) {
        res.status(400).json({
          message: 'User has not requested to become an artist',
        });
        return;
      }
    }

    // Xác định xem có phải đang verify một user request artist không
    const isVerifyingArtistRequest =
      isVerified === true &&
      currentUser.artistProfile?.verificationRequestedAt &&
      !currentUser.artistProfile.isVerified;

    // Cập nhật dữ liệu user
    const updateData: any = {
      ...(name && { name }),
      ...(email && { email }),
      ...(username && { username }),
    };

    // Thực hiện cập nhật trong transaction
    const updatedUser = await prisma.$transaction(async (prisma) => {
      // Cập nhật user
      await prisma.user.update({
        where: { id },
        data: updateData,
      });

      // Cập nhật ArtistProfile nếu đang verify artist request
      if (isVerifyingArtistRequest) {
        await prisma.artistProfile.update({
          where: { userId: id },
          data: {
            isVerified: true,
            verifiedAt: new Date(),
            verificationRequestedAt: null,
            role: Role.ARTIST,
          },
        });
      }

      // Lấy lại thông tin user đã cập nhật với đầy đủ relations
      return await prisma.user.findUnique({
        where: { id },
        select: userSelect,
      });
    });

    // Clear cache
    await clearCacheForEntity('user', { entityId: id, clearSearch: true });
    if (isVerifyingArtistRequest) {
      await clearCacheForEntity('artist', { clearSearch: true });
    }

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa người dùng
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Xóa ArtistProfile nếu có
    await prisma.artistProfile.deleteMany({
      where: { userId: id },
    });

    // Xóa User
    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa nghệ sĩ
export const deleteArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Xóa toàn bộ dữ liệu liên quan
    await prisma.$transaction([
      prisma.track.deleteMany({ where: { artistId: id } }),
      prisma.album.deleteMany({ where: { artistId: id } }),
      prisma.artistProfile.delete({ where: { id } }),
    ]);

    // Clear cache
    await Promise.all([
      clearCacheForEntity('artist', { entityId: id, clearSearch: true }),
      clearCacheForEntity('album', { clearSearch: true }),
      clearCacheForEntity('track', { clearSearch: true }),
    ]);

    res.json({ message: 'Artist deleted permanently' });
  } catch (error) {
    console.error('Delete artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Deactivate user (Khóa tài khoản người dùng)
export const deactivateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const admin = req.user;

    // Kiểm tra quyền admin
    if (!admin || admin.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Kiểm tra user tồn tại
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        isActive: true,
        email: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Không cho phép deactivate ADMIN
    if (user.role === Role.ADMIN) {
      res.status(403).json({ message: 'Cannot deactivate admin users' });
      return;
    }

    // Cập nhật trạng thái user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isActive: isActive,
      },
      select: userSelect,
    });

    // Clear tất cả cache liên quan đến users list
    const keys = await client.keys('users:list:*');
    if (keys.length) {
      await Promise.all(keys.map((key) => client.del(key)));
    }

    // Clear cache của user cụ thể và các cache liên quan
    await Promise.all([
      clearCacheForEntity('user', {
        entityId: id,
        clearSearch: true,
      }),
      clearCacheForEntity('stats', {}),
      user.role === Role.ARTIST
        ? clearCacheForEntity('artist', { clearSearch: true })
        : null,
    ]);

    // Chỉ gửi thông báo Pusher khi deactivate tài khoản
    if (!isActive) {
      await sessionService.handleUserDeactivation(user.id);
    }

    res.json({
      message: isActive
        ? 'User activated successfully'
        : 'User deactivated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Deactivate artist (Khóa tài khoản nghệ sĩ)
export const deactivateArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const artist = await prisma.artistProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!artist) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    // Cập nhật trạng thái user và artist profile
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: artist.userId },
        data: {
          isActive,
          ...(!isActive ? { currentProfile: 'USER' } : {}), // Reset profile nếu deactivate
        },
        select: userSelect,
      }),
      prisma.artistProfile.update({
        where: { id },
        data: { isActive },
      }),
    ]);

    // Clear cache
    await Promise.all([
      clearCacheForEntity('user', { entityId: artist.userId }),
      clearCacheForEntity('artist', { entityId: id }),
    ]);

    res.json({
      message: `Artist ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Deactivate artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách tất cả nghệ sĩ
export const getAllArtists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
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

    const artists = await prisma.artistProfile.findMany({
      where: {
        role: Role.ARTIST,
        isVerified: true,
      },
      skip: offset,
      take: Number(limit),
      select: artistProfileSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalArtists = await prisma.artistProfile.count({
      where: {
        role: Role.ARTIST,
        isVerified: true,
      },
    });

    const response = {
      artists,
      pagination: {
        total: totalArtists,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalArtists / Number(limit)),
      },
    };

    if (process.env.USE_REDIS_CACHE === 'true') {
      console.log(`[Redis] Caching data for key: ${cacheKey}`);
      await client.setEx(cacheKey, 300, JSON.stringify(response));
    }

    res.json(response);
  } catch (error) {
    console.error('Get all artists error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy thông tin chi tiết của một nghệ sĩ
export const getArtistById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      albumPage = 1,
      albumLimit = 6,
      trackPage = 1,
      trackLimit = 10,
    } = req.query;
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
          skip: (Number(albumPage) - 1) * Number(albumLimit),
          take: Number(albumLimit),
          orderBy: { releaseDate: 'desc' },
          select: artistProfileSelect.albums.select,
        },
        tracks: {
          skip: (Number(trackPage) - 1) * Number(trackLimit),
          take: Number(trackLimit),
          orderBy: { releaseDate: 'desc' },
          select: artistProfileSelect.tracks.select,
        },
        _count: {
          select: {
            albums: true,
            tracks: true,
          },
        },
      },
    });

    if (!artist) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    const { _count, ...artistData } = artist;
    const response = {
      ...artistData,
      albums: {
        data: artist.albums,
        total: _count.albums,
        page: Number(albumPage),
        limit: Number(albumLimit),
        totalPages: Math.ceil(_count.albums / Number(albumLimit)),
      },
      tracks: {
        data: artist.tracks,
        total: _count.tracks,
        page: Number(trackPage),
        limit: Number(trackLimit),
        totalPages: Math.ceil(_count.tracks / Number(trackLimit)),
      },
    };

    if (process.env.USE_REDIS_CACHE === 'true') {
      console.log(`[Redis] Caching data for key: ${cacheKey}`);
      await client.setEx(cacheKey, 300, JSON.stringify(response));
    }

    res.json(response);
  } catch (error) {
    console.error('Get artist by id error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách tất cả thể loại nhạc
export const getAllGenres = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
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

    const genres = await prisma.genre.findMany({
      skip: offset,
      take: Number(limit),
      select: genreSelect,
    });

    const totalGenres = await prisma.genre.count();

    const response = {
      genres,
      pagination: {
        total: totalGenres,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalGenres / Number(limit)),
      },
    };

    if (process.env.USE_REDIS_CACHE === 'true') {
      console.log(`[Redis] Caching data for key: ${cacheKey}`);
      await client.setEx(cacheKey, 300, JSON.stringify(response));
    }

    res.json(response);
  } catch (error) {
    console.error('Get all genres error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Tạo thể loại nhạc mới
export const createGenre = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name } = req.body;

    const genre = await prisma.genre.create({
      data: { name },
    });

    // Clear cache
    await Promise.all([
      clearCacheForEntity('genre', { clearSearch: true }),
      clearCacheForEntity('track', { clearSearch: true }),
      clearCacheForEntity('stats', {}),
    ]);

    res.status(201).json({ message: 'Genre created successfully', genre });
  } catch (error) {
    console.error('Create genre error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cập nhật thể loại nhạc
export const updateGenre = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validation: Kiểm tra body có trống không
    if (!name) {
      res.status(400).json({ message: 'Name is required' });
      return;
    }

    // Validation: Kiểm tra tên không được trống
    if (name.trim() === '') {
      res.status(400).json({ message: 'Name cannot be empty' });
      return;
    }

    // Validation: Kiểm tra độ dài tên (tối đa 50 ký tự)
    if (name.length > 50) {
      res.status(400).json({
        message: 'Name exceeds maximum length (50 characters)',
        maxLength: 50,
        currentLength: name.length,
      });
      return;
    }

    // Kiểm tra xem genre có tồn tại không
    const existingGenre = await prisma.genre.findUnique({
      where: { id },
    });

    if (!existingGenre) {
      res.status(404).json({ message: 'Genre not found' });
      return;
    }

    // Kiểm tra xem tên thể loại đã tồn tại chưa (trừ genre hiện tại)
    const existingGenreWithName = await prisma.genre.findFirst({
      where: {
        name,
        NOT: {
          id,
        },
      },
    });

    if (existingGenreWithName) {
      res.status(400).json({ message: 'Genre name already exists' });
      return;
    }

    // Cập nhật genre
    const updatedGenre = await prisma.genre.update({
      where: { id },
      data: { name },
    });

    // Clear cache
    await clearCacheForEntity('genre', { entityId: id, clearSearch: true });
    await clearCacheForEntity('track', { clearSearch: true });

    res.json({
      message: 'Genre updated successfully',
      genre: updatedGenre,
    });
  } catch (error) {
    console.error('Update genre error:', error);

    // Xử lý lỗi từ Prisma
    if (error instanceof Error && 'code' in error) {
      switch ((error as any).code) {
        case 'P2002': // Lỗi unique constraint
          res.status(400).json({ message: 'Genre name already exists' });
          return;
        case 'P2025': // Lỗi không tìm thấy bản ghi
          res.status(404).json({ message: 'Genre not found' });
          return;
        default:
          console.error('Prisma error:', error);
          res.status(500).json({ message: 'Internal server error' });
          return;
      }
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa thể loại nhạc
export const deleteGenre = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.genre.delete({
      where: { id },
    });

    // Clear cache
    await clearCacheForEntity('genre', { entityId: id, clearSearch: true });
    await clearCacheForEntity('track', { clearSearch: true });

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
    const admin = req.user;

    // Chỉ ADMIN mới có thể duyệt yêu cầu
    if (!admin || admin.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Tìm ArtistProfile bằng requestId
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

    // Kiểm tra xem yêu cầu có tồn tại và chưa được xác thực không
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

    // Cập nhật ArtistProfile: chuyển thành ARTIST, xác thực và xóa trường verificationRequestedAt
    await prisma.$transaction([
      prisma.artistProfile.update({
        where: { id: requestId },
        data: {
          role: Role.ARTIST,
          isVerified: true,
          verifiedAt: new Date(),
          verificationRequestedAt: null,
        },
      }),
    ]);

    // Lấy lại thông tin người dùng sau khi cập nhật
    const updatedUser = await prisma.user.findUnique({
      where: { id: artistProfile.userId },
      select: userSelect,
    });

    // Clear cache: thêm clear cache cho admin artist requests
    await Promise.all([
      clearCacheForEntity('artist', { clearSearch: true }),
      clearCacheForEntity('user', { clearSearch: true }),
      clearCacheForEntity('stats', {}),
      clearCacheForEntity('album', { clearSearch: true }),
      clearCacheForEntity('track', { clearSearch: true }),
      clearCacheForEntity('artist-requests', { clearSearch: true }),
    ]);

    await sessionService.handleArtistRequestApproval(artistProfile.user.id);

    res.json({
      message: 'Artist role approved successfully',
      user: updatedUser,
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
    console.log('[Admin] Starting reject artist request process'); // Log debug
    const { requestId } = req.body;
    const admin = req.user;

    if (!admin || admin.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
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

    // Xóa artist profile
    await prisma.artistProfile.delete({
      where: { id: requestId },
    });

    // Clear cache: xóa cache cho danh sách artist requests
    await clearCacheForEntity('artist-requests', { clearSearch: true });

    // Gửi thông báo realtime qua Pusher
    await sessionService.handleArtistRequestRejection(artistProfile.user.id);

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

// Xác thực artist (Verify Artist) - ADMIN only
export const verifyArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.body;
    const admin = req.user;

    if (!admin || admin.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Tìm ArtistProfile trực tiếp bằng id
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id: userId },
      include: {
        user: true,
      },
    });

    if (!artistProfile || artistProfile.isVerified) {
      res.status(404).json({ message: 'Artist not found or already verified' });
      return;
    }

    // Cập nhật ArtistProfile
    await prisma.artistProfile.update({
      where: { id: userId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: artistProfile.userId },
      include: {
        artistProfile: true,
      },
    });

    res.json({
      message: 'Artist verified successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Verify artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update số lượng người nghe hàng tháng của các Artists - ADMIN only
export const updateMonthlyListeners = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params; // id này là artistProfileId
    const user = req.user;

    // Kiểm tra quyền truy cập
    if (!user || (user.role !== Role.ADMIN && user.artistProfile?.id !== id)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Tìm ArtistProfile
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id },
      include: {
        tracks: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!artistProfile) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    const trackIds = artistProfile.tracks.map((track) => track.id);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Đếm số lượng người nghe duy nhất trong 30 ngày gần nhất
    const uniqueListeners = await prisma.history.findMany({
      where: {
        trackId: {
          in: trackIds,
        },
        type: 'PLAY',
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      distinct: ['userId'], // Đảm bảo mỗi user chỉ được tính một lần
    });

    // Cập nhật monthlyListeners với số lượng người nghe duy nhất
    const updatedArtistProfile = await prisma.artistProfile.update({
      where: { id },
      data: {
        monthlyListeners: uniqueListeners.length,
      },
    });

    res.json({
      message: 'Monthly listeners updated successfully',
      artistProfile: updatedArtistProfile,
    });
  } catch (error) {
    console.error('Update monthly listeners error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy thông số tổng quan để thống kê
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = '/api/admin/stats';
    const user = req.user;

    if (!user || user.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedStats = await client.get(cacheKey);
      if (cachedStats) {
        console.log(`[Redis] Cache hit for key: ${cacheKey}`);
        res.json(JSON.parse(cachedStats));
        return;
      }
      console.log(`[Redis] Cache miss for key: ${cacheKey}`);
    }

    const [
      totalUsers,
      totalArtists,
      totalArtistRequests,
      mostActiveArtist,
      totalGenres,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.artistProfile.count({
        where: {
          role: Role.ARTIST,
          isVerified: true,
        },
      }),
      prisma.artistProfile.count({
        where: {
          verificationRequestedAt: { not: null },
          isVerified: false,
        },
      }),
      prisma.artistProfile.findFirst({
        where: {
          role: Role.ARTIST,
          isVerified: true,
        },
        orderBy: [{ monthlyListeners: 'desc' }, { tracks: { _count: 'desc' } }],
        select: {
          id: true,
          artistName: true,
          monthlyListeners: true,
          _count: {
            select: {
              tracks: true,
            },
          },
        },
      }),
      prisma.genre.count(),
    ]);

    const statsData = {
      totalUsers,
      totalArtists,
      totalArtistRequests,
      totalGenres,
      trendingArtist: {
        id: mostActiveArtist?.id || '',
        artistName: mostActiveArtist?.artistName || '',
        monthlyListeners: mostActiveArtist?.monthlyListeners || 0,
        trackCount: mostActiveArtist?._count.tracks || 0,
      },
      updatedAt: new Date().toISOString(),
    };

    if (process.env.USE_REDIS_CACHE === 'true') {
      console.log(`[Redis] Caching data for key: ${cacheKey}`);
      await client.setEx(cacheKey, 300, JSON.stringify(statsData));
    }

    res.json(statsData);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
