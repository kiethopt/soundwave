import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { Role } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { addHours } from 'date-fns';
import sgMail from '@sendgrid/mail';
import { sessionService } from '../services/session.service';
import { userSelect } from '../utils/prisma-selects';

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

// Helper function để tạo cache strategy
const cacheConfig = {
  short: { ttl: 300, swr: 60 }, // 5 phút cache + 1 phút stale
  medium: { ttl: 1800, swr: 300 }, // 30 phút cache + 5 phút stale
  long: { ttl: 3600, swr: 600 }, // 1 giờ cache + 10 phút stale
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

    // Sử dụng cacheStrategy vì:
    // 1. User data ít thay đổi
    // 2. Được gọi thường xuyên khi validate token
    // 3. Không cần real-time accuracy
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: userSelect,
      cacheStrategy: cacheConfig.medium,
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
      select: userSelect,
    });

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

    const validationError = validateLoginData({ email, password });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    // KHÔNG sử dụng cache cho login vì:
    // 1. Security-critical operation
    // 2. Cần real-time accuracy cho password và isActive status
    // 3. Không phải high-frequency operation
    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...userSelect, password: true, isActive: true },
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid email or password' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        message:
          'Your account has been deactivated. Please contact administrator.',
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Cập nhật lastLoginAt và currentProfile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        currentProfile: user.role === Role.ADMIN ? 'ADMIN' : 'USER', // Nếu là ADMIN thì currentProfile là ADMIN
      },
      select: userSelect,
    });

    // Sử dụng role thực tế của user (USER hoặc ADMIN)
    const token = generateToken(user.id, user.role);

    const sessionId = await sessionService.createSession({
      ...updatedUser,
      password: user.password,
    });

    // Trả về response với role thực tế của user
    const userResponse = {
      ...updatedUser,
      password: undefined,
    };

    res.json({
      message: 'Login successful',
      token,
      sessionId,
      user: userResponse,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Đăng xuất (Logout)
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const sessionId = req.header('Session-ID');

    if (!userId || !sessionId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      // Reset currentProfile về USER khi logout, trừ khi là ADMIN
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentProfile: req.user?.role === Role.ADMIN ? 'ADMIN' : 'USER',
        },
      });
    } catch (error) {
      // Nếu update thất bại (ví dụ user không tồn tại), vẫn tiếp tục xóa session
      console.error('Error updating user profile:', error);
    }

    // Xóa session hiện tại
    await sessionService.removeUserSession(userId, sessionId);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    // Vẫn trả về success nếu có lỗi để đảm bảo client xóa được token
    res.json({ message: 'Logged out successfully' });
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

// Hàm để switch profile sang Artist
export const switchProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const sessionId = req.header('Session-ID');

    if (!userId || !sessionId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { artistProfile: true },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Kiểm tra trạng thái active của artist profile
    if (user.artistProfile && !user.artistProfile.isActive) {
      res.status(403).json({
        message: 'Artist profile has been deactivated. Please contact admin.',
      });
      return;
    }

    // Kiểm tra verify và active status
    if (!user.artistProfile?.isVerified || !user.artistProfile?.isActive) {
      res.status(403).json({
        message: 'You do not have a verified and active artist profile',
      });
      return;
    }

    // Chỉ thay đổi currentProfile, giữ nguyên role là USER
    const newProfile = user.currentProfile === 'USER' ? 'ARTIST' : 'USER';

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { currentProfile: newProfile },
      select: userSelect,
    });

    // Cập nhật session
    await sessionService.updateSessionProfile(userId, sessionId, newProfile);

    res.json({
      message: 'Profile switched successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Switch profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
