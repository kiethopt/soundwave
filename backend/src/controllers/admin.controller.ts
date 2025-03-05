import { Request, Response } from 'express';
import prisma from '../config/db';
import { Role } from '@prisma/client';
import {
  artistProfileSelect,
  artistRequestDetailsSelect,
  artistRequestSelect,
  genreSelect,
  userSelect,
} from '../utils/prisma-selects';
import { uploadFile } from '../services/cloudinary.service';
import {
  handleCache,
  handleError,
  paginate,
  runValidations,
  toBooleanValue,
  validateField,
} from 'src/utils/handle-utils';

// Lấy danh sách tất cả người dùng - ADMIN only
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { search = '', status } = req.query;

    // Build where conditions
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

    // Use the paginate helper
    const result = await paginate(prisma.user, req, {
      where,
      include: {
        artistProfile: {
          include: { genres: { include: { genre: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format the response
    res.json({
      users: result.data.map((user: any) => ({
        ...user,
        artistProfile: user.artistProfile
          ? {
              ...user.artistProfile,
              socialMediaLinks: user.artistProfile.socialMediaLinks || {},
              verifiedAt: user.artistProfile.verifiedAt,
            }
          : null,
      })),
      pagination: result.pagination,
    });
  } catch (error) {
    handleError(res, error, 'Get all users');
  }
};

// Lấy thông tin chi tiết của một người dùng - ADMIN only
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await handleCache(req, async () => {
      return prisma.user.findUnique({
        where: { id },
        select: userSelect,
      });
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    handleError(res, error, 'Get user by id');
  }
};

// Lấy tất cả request yêu cầu trở thành Artist từ User - ADMIN only
export const getAllArtistRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { startDate, endDate, status, search } = req.query;

    // Xây dựng điều kiện where
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

    const result = await paginate(prisma.artistProfile, req, {
      where,
      select: artistRequestSelect,
      orderBy: { verificationRequestedAt: 'desc' },
    });

    res.json({
      requests: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    handleError(res, error, 'Get artist requests');
  }
};

// Xem chi tiết request yêu cầu trở thành Artist từ User - ADMIN only
export const getArtistRequestDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const request = await handleCache(req, async () => {
      return prisma.artistProfile.findUnique({
        where: { id },
        select: artistRequestDetailsSelect,
      });
    });

    if (!request) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }

    res.json(request);
  } catch (error) {
    handleError(res, error, 'Get artist request details');
  }
};

// Cập nhật thông tin người dùng - ADMIN only
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, username, isActive, role } = req.body;
    const avatarFile = req.file;

    // Validation
    const validationErrors = runValidations([
      validateField(id, 'User ID', { required: true }),
      email &&
        validateField(email, 'Email', {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: 'Invalid email format',
        }),
      username && validateField(username, 'Username', { minLength: 3 }),
      role &&
        validateField(role, 'Role', { enum: ['USER', 'ARTIST', 'ADMIN'] }),
    ]);

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
    const isActiveBool = toBooleanValue(isActive);

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
        ...(role && { role }),
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
    handleError(res, error, 'Update user');
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
    const validationErrors = runValidations([
      validateField(id, 'Artist ID', { required: true }),
      artistName && validateField(artistName, 'Artist name', { minLength: 2 }),
      bio && validateField(bio, 'Bio', { maxLength: 1000 }),
    ]);

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
    const isActiveBool = toBooleanValue(isActive);

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
    handleError(res, error, 'Update artist');
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
    handleError(res, error, 'Delete user');
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
    handleError(res, error, 'Delete artist');
  }
};

// Lấy danh sách tất cả nghệ sĩ - ADMIN only
export const getAllArtists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { search = '', status } = req.query;

    // Xây dựng điều kiện where
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

    const result = await paginate(prisma.artistProfile, req, {
      where,
      select: artistProfileSelect,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      artists: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    handleError(res, error, 'Get all artists');
  }
};

// Lấy thông tin chi tiết của một nghệ sĩ - ADMIN only
export const getArtistById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const artist = await handleCache(req, async () => {
      return prisma.artistProfile.findUnique({
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
    });

    if (!artist) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    res.json(artist);
  } catch (error) {
    handleError(res, error, 'Get artist by id');
  }
};

// Lấy danh sách tất cả thể loại nhạc - ADMIN only
export const getAllGenres = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { search = '' } = req.query;

    // Xây dựng điều kiện where
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

    const result = await paginate(prisma.genre, req, {
      where,
      select: genreSelect,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      genres: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    handleError(res, error, 'Get all genres');
  }
};

// Tạo thể loại nhạc mới - ADMIN only
export const createGenre = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name } = req.body;

    // Validation
    const validationErrors = runValidations([
      validateField(name, 'Name', { required: true }),
      name && validateField(name.trim(), 'Name', { minLength: 1 }),
      name && validateField(name, 'Name', { maxLength: 50 }),
    ]);

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
    handleError(res, error, 'Create genre');
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

    // Validation
    const validationErrors = runValidations([
      validateField(id, 'Genre ID', { required: true }),
      validateField(name, 'Name', { required: true }),
      name && validateField(name.trim(), 'Name', { minLength: 1 }),
      name && validateField(name, 'Name', { maxLength: 50 }),
    ]);

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
    handleError(res, error, 'Update genre');
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
    handleError(res, error, 'Delete genre');
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
    handleError(res, error, 'Approve artist request');
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
    handleError(res, error, 'Reject artist request');
  }
};

// Lấy thông số tổng quan để thống kê - ADMIN only
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const statsData = await handleCache(
      req,
      async () => {
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
      },
      3600 // TTL 1 giờ
    );

    res.json(statsData);
  } catch (error) {
    handleError(res, error, 'Get stats');
  }
};
