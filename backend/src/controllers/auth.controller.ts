import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { Role } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { addHours } from 'date-fns';
import sgMail from '@sendgrid/mail';
import { userSelect } from '../utils/prisma-selects';
import { systemPlaylistService } from '../services/playlist.service';

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
    const { email, password, confirmPassword, name, username } = req.body;

    // Kiểm tra password và confirmPassword có khớp không
    if (password !== confirmPassword) {
      res.status(400).json({ message: 'Passwords do not match' });
      return;
    }

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

    // Khởi tạo các playlist hệ thống cho người dùng mới
    try {
      await systemPlaylistService.initializeForNewUser(user.id);
      console.log(`System playlists initialized for new user: ${user.id}`);
    } catch (error) {
      console.error(
        'Failed to initialize system playlists for new user:',
        error
      );
    }

    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Đăng nhập (Login)
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { emailOrUsername, password } = req.body;

    // Kiểm tra xem emailOrUsername và password có được cung cấp không
    if (!emailOrUsername || !password) {
      res
        .status(400)
        .json({ message: 'Email/username and password are required' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
      select: { ...userSelect, password: true, isActive: true },
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid email/username or password' });
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
      res.status(401).json({ message: 'Invalid email/username or password' });
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

    // Trả về response với role thực tế của user
    const userResponse = {
      ...updatedUser,
      password: undefined,
    };

    res.json({
      message: 'Login successful',
      token,
      // sessionId,
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

    if (!userId) {
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
    await sendEmail(user.email, 'Password Reset', resetLink);

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
  resetLink: string
): Promise<void> => {
  // Thiết lập API Key của SendGrid
  sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

  // Cấu hình email
  const msg = {
    to, // Email nhận
    from: process.env.EMAIL_USER as string, // Email gửi đi
    subject, // Tiêu đề email
    text: `Click here to reset your password: ${resetLink}`, // Nội dung email (dạng plain text)
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your SoundWave Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9; color: #333333;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-spacing: 0; border-collapse: collapse;">
          <!-- Header with logo -->
          <tr>
            <td style="padding: 0;">
              <table width="100%" style="border-spacing: 0; border-collapse: collapse;">
                <tr>
                  <td style="background-color: #1a1a1a; padding: 20px 0; text-align: center;">
                    <img src="https://res.cloudinary.com/dsw1dm5ka/image/upload/v1743396192/fcazc9wdyqvaz1c3xwg7.png" alt="SoundWave" width="200" style="display: block; margin: 0 auto;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Rest of the email template remains the same -->
          <tr>
            <td style="padding: 0;">
              <div style="background: linear-gradient(135deg, #A57865 0%, #3a3a3a 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Reset Your Password</h1>
                <p style="color: #ffffff; opacity: 0.9; margin: 15px 0 0; font-size: 16px;">We've received a request to reset your password</p>
              </div>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding: 40px 30px; background-color: #ffffff;">
              <table width="100%" style="border-spacing: 0; border-collapse: collapse;">
                <tr>
                  <td>
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">Hi ${
                      to.split('@')[0]
                    },</p>
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">We received a request to reset your SoundWave password. Use the button below to set up a new password for your account. This link is only valid for the next hour.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${resetLink}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 15px 35px; border-radius: 6px; font-weight: 600; font-size: 16px; border: 2px solid #000000; transition: all 0.3s ease;">RESET PASSWORD</a>
                    </div>
                    
                    <p style="margin: 30px 0 0; font-size: 16px; line-height: 1.6; color: #333333;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Security note section -->
          <tr>
            <td style="padding: 0;">
              <table width="100%" style="border-spacing: 0; border-collapse: collapse;">
                <tr>
                  <td style="background-color: #f5f5f5; padding: 25px 30px; border-top: 1px solid #eeeeee;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #666666;">For security, this request was received from your SoundWave account. This link will expire in 60 minutes.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer with music note decoration -->
          <tr>
            <td style="padding: 0;">
              <table width="100%" style="border-spacing: 0; border-collapse: collapse;">
                <tr>
                  <td style="background-color: #1a1a1a; padding: 30px; text-align: center;">
                    <div style="margin-bottom: 20px; font-size: 0;">
                      <!-- Music notes decoration -->
                      <span style="display: inline-block; width: 8px; height: 8px; background-color: #A57865; margin: 0 5px; border-radius: 50%;"></span>
                      <span style="display: inline-block; width: 8px; height: 15px; background-color: #A57865; margin: 0 5px; border-radius: 4px;"></span>
                      <span style="display: inline-block; width: 8px; height: 12px; background-color: #A57865; margin: 0 5px; border-radius: 4px;"></span>
                      <span style="display: inline-block; width: 8px; height: 18px; background-color: #A57865; margin: 0 5px; border-radius: 4px;"></span>
                      <span style="display: inline-block; width: 8px; height: 8px; background-color: #A57865; margin: 0 5px; border-radius: 50%;"></span>
                    </div>
                    
                    <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.6; color: #ffffff;">This email was sent to ${to}</p>
                    <p style="margin: 0 0 15px; font-size: 14px; line-height: 1.6; color: #cccccc;">This is an automated message. Please do not reply.</p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #cccccc;">© ${new Date().getFullYear()} SoundWave. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `, // Nội dung email (dạng HTML)
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

    if (!userId) {
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

    res.json({
      message: 'Profile switched successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Switch profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
