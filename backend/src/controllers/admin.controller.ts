import { Request, Response } from 'express';
import prisma from '../config/db';
import { Role } from '@prisma/client';

// Định nghĩa các select cho user
const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  avatar: true,
  role: true,
  isActive: true,
  bio: true,
  isVerified: true,
  verificationRequestedAt: true,
  verifiedAt: true,
  monthlyListeners: true,
  createdAt: true,
  updatedAt: true,
  artistProfile: {
    select: {
      id: true,
      artistName: true,
      bio: true,
      socialMediaLinks: true,
      createdAt: true,
      updatedAt: true,
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
  albums: {
    select: {
      id: true,
      title: true,
      coverUrl: true,
      releaseDate: true,
      trackCount: true,
      duration: true,
      type: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  tracks: {
    select: {
      id: true,
      title: true,
      duration: true,
      releaseDate: true,
      trackNumber: true,
      coverUrl: true,
      audioUrl: true,
      playCount: true,
      type: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  playlists: {
    select: {
      id: true,
      name: true,
      description: true,
      coverUrl: true,
      privacy: true,
      type: true,
      isAIGenerated: true,
      totalTracks: true,
      totalDuration: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  followedArtists: {
    select: {
      following: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
  },
  followers: {
    select: {
      follower: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
    },
  },
  notifications: {
    select: {
      id: true,
      type: true,
      message: true,
      isRead: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  events: {
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      startDate: true,
      endDate: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  likedTracks: {
    select: {
      track: {
        select: {
          id: true,
          title: true,
          duration: true,
          releaseDate: true,
          trackNumber: true,
          coverUrl: true,
          audioUrl: true,
          playCount: true,
          type: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  },
} as const;

// Định nghĩa các select cho artist
const artistSelect = {
  id: true,
  name: true,
  avatar: true,
  isVerified: true,
  artistProfile: {
    select: {
      id: true,
      artistName: true,
      bio: true,
      socialMediaLinks: true,
      createdAt: true,
      updatedAt: true,
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
  albums: {
    select: {
      id: true,
      title: true,
      coverUrl: true,
      releaseDate: true,
      trackCount: true,
      duration: true,
      type: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  tracks: {
    select: {
      id: true,
      title: true,
      duration: true,
      releaseDate: true,
      trackNumber: true,
      coverUrl: true,
      audioUrl: true,
      playCount: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

// Định nghĩa các select cho genre
const genreSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  albums: {
    select: {
      album: {
        select: {
          id: true,
          title: true,
          coverUrl: true,
          releaseDate: true,
          trackCount: true,
          duration: true,
          type: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  },
  artistProfiles: {
    select: {
      artistProfile: {
        select: {
          id: true,
          artistName: true,
          bio: true,
          socialMediaLinks: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
    },
  },
} as const;

// Lấy danh sách tất cả người dùng
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const users = await prisma.user.findMany({
      skip: offset,
      take: Number(limit),
      select: userSelect,
    });

    const totalUsers = await prisma.user.count();

    res.json({
      users,
      pagination: {
        total: totalUsers,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalUsers / Number(limit)),
      },
    });
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

    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user by id error:', error);
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
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isVerified: true,
        verificationRequestedAt: true,
        verifiedAt: true,
        artistProfile: true,
      },
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
      if (!currentUser.verificationRequestedAt) {
        res.status(400).json({
          message: 'User has not requested to become an artist',
        });
        return;
      }
    }

    // Case 3: Kiểm tra khi đã là ARTIST và verified
    if (currentUser.role === Role.ARTIST && currentUser.isVerified) {
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
      if (!currentUser.verificationRequestedAt) {
        res.status(400).json({
          message: 'User has not requested to become an artist',
        });
        return;
      }
    }

    // Xác định xem có phải đang verify một user request artist không
    const isVerifyingArtistRequest =
      isVerified === true &&
      currentUser.verificationRequestedAt &&
      !currentUser.isVerified;

    // Cập nhật dữ liệu user
    const updateData: any = {
      isVerified:
        isVerified !== undefined ? isVerified : currentUser.isVerified,
      ...(isVerifyingArtistRequest && {
        role: Role.ARTIST,
        verifiedAt: new Date(),
        verificationRequestedAt: null,
      }),
      ...(role && { role }),
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

      // Tạo artist profile nếu đang verify artist request và chưa có profile
      if (isVerifyingArtistRequest && !currentUser.artistProfile) {
        // Tạo một artistName duy nhất
        const artistName = `${
          currentUser.name || 'Artist'
        }-${currentUser.id.substring(0, 8)}`;

        await prisma.artistProfile.create({
          data: {
            artistName,
            userId: currentUser.id,
          },
        });
      }

      // Lấy lại thông tin user đã cập nhật với đầy đủ relations
      return await prisma.user.findUnique({
        where: { id },
        select: userSelect,
      });
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);

    // Xử lý các lỗi cụ thể từ Prisma
    if (error instanceof Error && 'code' in error) {
      switch ((error as any).code) {
        case 'P2002':
          res.status(400).json({ message: 'Username or email already exists' });
          return;
        case 'P2025':
          res.status(404).json({ message: 'User not found' });
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

// Xóa người dùng
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
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

    const artists = await prisma.user.findMany({
      where: { role: Role.ARTIST },
      skip: offset,
      take: Number(limit),
      select: artistSelect,
    });

    const totalArtists = await prisma.user.count({
      where: { role: Role.ARTIST },
    });

    res.json({
      artists,
      pagination: {
        total: totalArtists,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalArtists / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all artists error:', error);
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

    const genres = await prisma.genre.findMany({
      skip: offset,
      take: Number(limit),
      select: genreSelect,
    });

    const totalGenres = await prisma.genre.count();

    res.json({
      genres,
      pagination: {
        total: totalGenres,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalGenres / Number(limit)),
      },
    });
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
    const { userId } = req.body;
    const admin = req.user;

    // Chỉ ADMIN mới có thể duyệt yêu cầu
    if (!admin || admin.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Tìm người dùng cần duyệt
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isVerified: true,
        verificationRequestedAt: true,
        verifiedAt: true,
        artistProfile: {
          select: {
            artistName: true,
            bio: true,
            socialMediaLinks: true,
          },
        },
      },
    });

    // Kiểm tra xem user có tồn tại và đã gửi yêu cầu trở thành artist chưa
    if (!user || user.role !== Role.USER || !user.verificationRequestedAt) {
      res
        .status(404)
        .json({ message: 'User not found or not requested artist role' });
      return;
    }

    // Tạo một artistName duy nhất bằng cách thêm ID của user
    const artistName = `${user.name || 'Artist'}-${user.id.substring(0, 8)}`;

    // Cập nhật role thành ARTIST và tạo ArtistProfile
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          role: Role.ARTIST,
          isVerified: true, // Xác thực ARTIST
          verifiedAt: new Date(), // Thời gian xác thực
          verificationRequestedAt: null, // Reset trạng thái yêu cầu
        },
      }),
      prisma.artistProfile.create({
        data: {
          artistName, // Sử dụng artistName duy nhất
          user: { connect: { id: userId } },
        },
      }),
    ]);

    // Lấy lại thông tin người dùng sau khi cập nhật
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        isVerified: true,
        verificationRequestedAt: true,
        verifiedAt: true,
        artistProfile: {
          select: {
            artistName: true,
            bio: true,
            socialMediaLinks: true,
          },
        },
      },
    });

    res.json({
      message: 'Artist role approved successfully',
      user: updatedUser, // Trả về thông tin người dùng đã cập nhật
    });
  } catch (error) {
    console.error('Approve artist request error:', error);

    // Xử lý lỗi từ Prisma
    if (error instanceof Error && 'code' in error) {
      switch ((error as any).code) {
        case 'P2002': // Lỗi unique constraint
          res.status(400).json({ message: 'Artist name already exists' });
          return;
        case 'P2025': // Lỗi không tìm thấy bản ghi
          res.status(404).json({ message: 'User not found' });
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
