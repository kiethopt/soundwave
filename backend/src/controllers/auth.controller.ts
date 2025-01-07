import { Request, Response } from 'express';
import prisma from '../config/db';
import jwt from 'jsonwebtoken';
import {
  deleteAllDiscordMessages,
  sendUserNotification,
} from '../services/discord.service';
import { clients } from '../index';
import multer from 'multer';
import { uploadFile } from '../services/cloudinary.service';

const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  avatar: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  followedArtists: {
    select: {
      artistId: true,
      createdAt: true,
    },
  },
} as const;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

// Cấu hình multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role, isAdmin } = req.body; // Thêm trường isAdmin
    const avatarFile = req.file;

    let avatarUrl: string | undefined;

    if (avatarFile) {
      const avatarUpload: any = await uploadFile(
        avatarFile.buffer,
        'avatars',
        'image'
      );
      avatarUrl = avatarUpload.secure_url;
    }

    // Xử lý đăng ký artist
    if (role === 'ARTIST') {
      const bio = req.body.bio || '';
      const newArtist = await prisma.artist.create({
        data: {
          email,
          name,
          password,
          bio,
          avatar: avatarUrl,
          role: 'ARTIST',
          isVerified: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isVerified: true,
        },
      });

      await sendUserNotification(`🎉 New artist registered: ${name}`);

      res.status(201).json({
        message: 'Đăng ký artist thành công',
        user: newArtist,
      });
      return;
    }

    // Xử lý đăng ký user thường hoặc admin
    const { username } = req.body;
    if (!username) {
      res
        .status(400)
        .json({ message: 'Username is required for regular users' });
      return;
    }

    // Xác định role dựa trên trường isAdmin hoặc role
    const userRole = isAdmin ? 'ADMIN' : role === 'ADMIN' ? 'ADMIN' : 'USER';

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password,
        name,
        avatar: avatarUrl,
        role: userRole, // Sử dụng role đã xác định
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
      },
    });

    // Gửi thông báo đến Discord khi user thường đăng ký
    await sendUserNotification(`🎉 New user registered: ${username}`);

    res.status(201).json({
      message: 'Đăng ký user thành công',
      user: newUser,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Tìm user hoặc artist với email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
      },
    });

    const artist = await prisma.artist.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        avatar: true,
        role: true,
        isActive: true,
        isVerified: true,
      },
    });

    const account = user || artist;

    if (!account) {
      res
        .status(404)
        .json({ message: 'Tài khoản không tồn tại trong hệ thống.' });
      return;
    }

    // Kiểm tra tài khoản có bị khóa không
    if (!account.isActive) {
      res
        .status(403)
        .json({ message: 'Tài khoản đã bị khóa. Vui lòng liên hệ Admin.' });
      return;
    }

    // Kiểm tra password (bạn cần thêm logic so sánh password hash)
    // Ví dụ: const isPasswordValid = await comparePassword(password, account.password);
    // if (!isPasswordValid) {
    //   res.status(401).json({ message: 'Sai mật khẩu' });
    //   return;
    // }

    // Generate JWT token
    const token = jwt.sign({ userId: account.id }, process.env.JWT_SECRET!, {
      expiresIn: '24h',
    });

    // Remove password from response
    const { password: _, ...accountWithoutPassword } = account;

    res.json({
      message: 'Đăng nhập thành công',
      user: accountWithoutPassword,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Tìm tất cả Users
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: userSelect,
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Tìm 1 user cụ thể theo id
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
      res
        .status(404)
        .json({ message: 'Không tìm thấy user này trong hệ thống.' });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Tìm 1 user cụ thể theo username
export const getUserByUsername = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({
      where: { username },
      select: userSelect,
    });

    if (!user) {
      res.status(404).json({
        message: `Không tìm thấy user với username: ${username}`,
      });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cập nhật thông tin user
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;
    const { name, email, avatar } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (!existingUser) {
      res.status(404).json({ message: 'User không tồn tại' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { username },
      data: {
        name,
        email,
        avatar,
        updatedAt: new Date(),
      },
      select: userSelect,
    });

    res.json({
      message: 'Cập nhật user thành công',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa user (Soft delete - chỉ vô hiệu hóa)
export const deactivateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        isActive: true,
      },
    });

    if (!existingUser) {
      res.status(404).json({ message: 'User không tồn tại' });
      return;
    }

    await prisma.user.update({
      where: { username },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Gửi event force logout ngay lập tức
    const logoutEvent = {
      type: 'FORCE_LOGOUT',
      userId: existingUser.id,
      timestamp: new Date().toISOString(),
    };

    console.log('Broadcasting logout event:', logoutEvent);
    clients.forEach((client) => {
      client(logoutEvent);
    });

    res.json({
      message: 'Đã vô hiệu hóa tài khoản thành công',
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Kích hoạt lại tài khoản
export const activateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (!existingUser) {
      res.status(404).json({ message: 'User không tồn tại' });
      return;
    }

    await prisma.user.update({
      where: { username },
      data: {
        isActive: true,
        updatedAt: new Date(),
      },
    });

    res.json({
      message: 'Đã kích hoạt lại tài khoản thành công',
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa user hoàn toàn (Hard delete)
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Gửi event force logout trước khi xóa
    const logoutEvent = {
      type: 'FORCE_LOGOUT',
      userId: user.id,
      message: 'Tài khoản không tồn tại',
      timestamp: new Date().toISOString(),
    };

    clients.forEach((client) => {
      client(logoutEvent);
    });

    // Xóa user
    await prisma.user.delete({
      where: { username },
    });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

// Xóa sạch dữ liệu
export const purgeAllData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Xóa tất cả tracks
    await prisma.track.deleteMany();

    // Xóa tất cả albums
    await prisma.album.deleteMany();

    // Xóa tất cả users ngoại trừ admin hiện tại
    await prisma.user.deleteMany({
      where: {
        NOT: {
          id: req.user?.id,
        },
      },
    });

    // Xóa messages trên Discord
    await deleteAllDiscordMessages();

    res.json({ message: 'All data purged successfully' });
  } catch (error) {
    console.error('Purge data error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
