import { Request, Response } from 'express';
import prisma from '../config/db';
import jwt from 'jsonwebtoken';
import {
  deleteAllDiscordMessages,
  sendUserNotification,
} from '../services/discord.service';
import { clients } from '../index';

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
} as const;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password, name, isAdmin } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      res.status(400).json({ message: 'Email hoặc username đã tồn tại!' });
      return;
    }

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password,
        name,
        role: isAdmin ? 'ADMIN' : 'USER',
      },
      select: userSelect,
    });

    // Gửi thông báo đến Discord
    await sendUserNotification(username);

    res.status(201).json({
      message: 'User mới đã được tạo thành công',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

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

    if (!user) {
      res.status(404).json({ message: 'User không tồn tại trong hệ thống.' });
      return;
    }

    // Kiểm tra tài khoản có bị khóa không
    if (!user.isActive) {
      res
        .status(403)
        .json({ message: 'Tài khoản đã bị khóa. Vui lòng liên hệ Admin.' });
      return;
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: '24h',
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Đăng nhập thành công',
      user: userWithoutPassword,
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
    const users = await prisma.user.findMany();
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
