import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { Role } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { addHours } from 'date-fns';
import sgMail from '@sendgrid/mail';
import { clearCacheForEntity } from '../middleware/cache.middleware';
import { sessionService } from 'src/services/session.service';

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
  lastLoginAt: true,
  passwordResetToken: true,
  passwordResetExpires: true,
  artistProfile: {
    select: {
      id: true,
      artistName: true,
      bio: true,
      avatar: true,
      socialMediaLinks: true,
      monthlyListeners: true,
      isVerified: true,
      verificationRequestedAt: true,
      verifiedAt: true,
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
      followers: {
        select: {
          id: true,
          followerId: true,
          follower: {
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
  followed: {
    select: {
      id: true,
      followingType: true,
      followingUserId: true,
      followingArtistId: true,
      followingUser: {
        select: {
          id: true,
          name: true,
          avatar: true,
        },
      },
      followingArtist: {
        select: {
          id: true,
          artistName: true,
          avatar: true,
        },
      },
    },
  },
  followers: {
    select: {
      id: true,
      followerId: true,
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
      recipientType: true,
      senderId: true,
      count: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in environment variables');
}

// Hàm kiểm tra định dạng email
const validateEmail = (email: string): string | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex để kiểm tra định dạng email
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }
  return null;
};

// Validation functions (Register)
const validateRegisterData = (data: any): string | null => {
  const { email, password, username } = data;

  if (!email?.trim()) return 'Email is required';
  const emailValidationError = validateEmail(email);
  if (emailValidationError) return emailValidationError; // Kiểm tra định dạng email

  if (!password?.trim()) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';

  if (!username?.trim()) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (/\s/.test(username)) return 'Username cannot contain spaces'; // Kiểm tra dấu cách ở username

  return null;
};

// Validation functions (Login)
const validateLoginData = (data: any): string | null => {
  const { email, password } = data;

  if (!email?.trim()) return 'Email is required';
  if (!password?.trim()) return 'Password is required';

  return null;
};

// Helper function để tạo JWT token
const generateToken = (userId: string, role: Role, artistProfile?: any) => {
  return jwt.sign(
    {
      id: userId,
      role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Route kiểm tra token
export const validateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ message: 'Access denied. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      role: Role;
      isVerified: boolean;
      verificationRequestedAt?: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: userSelect,
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      message: 'Token is valid',
      user,
    });
  } catch (error) {
    next(error);
  }
};

// Đăng ký (Admin)
export const registerAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password, name, username } = req.body;

    const validationError = validateRegisterData({ email, password, username });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Email already exists' });
      return;
    }

    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
      });
      if (existingUsername) {
        res.status(400).json({ message: 'Username already exists' });
        return;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        username,
        role: Role.ADMIN, // Role là ADMIN
      },
      select: userSelect, // Sử dụng userSelect để trả về thông tin người dùng
    });

    res.status(201).json({ message: 'Admin registered successfully', user });
  } catch (error) {
    console.error('Register admin error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Đăng ký (Register)
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, username } = req.body;

    // Validate dữ liệu đăng ký
    const validationError = validateRegisterData({ email, password, username });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Email already exists' });
      return;
    }

    // Kiểm tra username đã tồn tại chưa
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
      });
      if (existingUsername) {
        res.status(400).json({ message: 'Username already exists' });
        return;
      }
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo người dùng mới với role mặc định là USER
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        username,
        role: Role.USER, // Mặc định là USER
      },
      select: userSelect, // Sử dụng userSelect để trả về thông tin người dùng
    });

    // Clear cache sau khi tạo user mới
    await clearCacheForEntity('user', { clearSearch: true });

    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Đăng nhập (Login)
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate dữ liệu đăng nhập
    const validationError = validateLoginData({ email, password });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    // Tìm người dùng theo email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...userSelect, password: true, role: true, isActive: true },
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid email or password' });
      return;
    }

    // Kiểm tra trạng thái tài khoản trước khi cho phép đăng nhập
    if (!user.isActive) {
      res.status(403).json({
        message:
          'Your account has been deactivated. Please contact administrator.',
      });
      return;
    }

    // Kiểm tra mật khẩu
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Cập nhật thời gian đăng nhập cuối cùng
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Tạo JWT token
    const token = generateToken(user.id, user.role, user.artistProfile);

    // Tạo session mới
    const sessionId = await sessionService.createSession(user);

    // Loại bỏ password khỏi phản hồi
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,
      sessionId,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Yêu cầu đặt lại mật khẩu
export const requestPasswordReset = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    // Tìm người dùng theo email
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Tạo token và thời gian hết hạn
    const resetToken = uuidv4();
    const resetTokenExpiry = addHours(new Date(), 1); // Token hết hạn sau 1 giờ

    // Lưu token và thời gian hết hạn vào database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpiry,
      },
    });

    // Gửi email chứa link đặt lại mật khẩu
    const resetLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendEmail(
      user.email,
      'Password Reset',
      `Click here to reset your password: ${resetLink}`
    );

    res.json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Đặt lại mật khẩu
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    // Tìm người dùng với token hợp lệ và chưa hết hạn
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() }, // Token chưa hết hạn
      },
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired token' });
      return;
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu và xóa token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Hàm gửi email với SendGrid
const sendEmail = async (
  to: string,
  subject: string,
  text: string
): Promise<void> => {
  // Thiết lập API Key của SendGrid
  sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

  // Cấu hình email
  const msg = {
    to, // Email nhận
    from: process.env.EMAIL_USER as string, // Email gửi đi
    subject, // Tiêu đề email
    text, // Nội dung email (dạng plain text)
    html: `<p>${text}</p>`, // Nội dung email (dạng HTML, tùy chọn)
  };

  // Gửi email
  try {
    await sgMail.send(msg);
    console.log('Email sent successfully to:', to);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};
