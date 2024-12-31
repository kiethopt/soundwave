import { Request, Response } from 'express';
import prisma from '../config/db';

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

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password, name } = req.body;

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
      },
    });

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

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
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
