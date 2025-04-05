import { NextFunction, Request, Response, RequestHandler } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { Role } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { addHours } from 'date-fns';
import { userSelect } from '../utils/prisma-selects';
import * as emailService from '../services/email.service';
import * as aiService from '../services/ai.service';
import { OAuth2Client } from 'google-auth-library';
import fetch from 'node-fetch';
import { uploadToCloudinary } from '../utils/cloudinary';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET in environment variables');
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    // Tạo playlist mặc định cho người dùng mới
    try {
      // Tạo "Welcome Mix" bằng các bài hát phổ biến
      const defaultTrackIds = await aiService.generateDefaultPlaylistForNewUser(
        user.id
      ); // Lấy danh sách track IDs phổ biến

      if (defaultTrackIds.length > 0) {
        // Lấy thông tin tracks để tính duration (tùy chọn, có thể bỏ qua nếu không cần chính xác ngay)
        const tracksInfo = await prisma.track.findMany({
          where: { id: { in: defaultTrackIds } },
          select: { id: true, duration: true },
        });
        const totalDuration = tracksInfo.reduce(
          (sum, track) => sum + track.duration,
          0
        );
        const trackIdMap = new Map(tracksInfo.map((t) => [t.id, t]));

        // Sắp xếp lại trackIds theo thứ tự trả về từ generateDefaultPlaylistForNewUser
        const orderedTrackIds = defaultTrackIds.filter((id) =>
          trackIdMap.has(id)
        );

        await prisma.playlist.create({
          data: {
            name: 'Welcome Mix',
            description:
              'A selection of popular tracks to start your journey on Soundwave.',
            privacy: 'PRIVATE',
            type: 'NORMAL',
            isAIGenerated: false,
            userId: user.id, // Playlist này thuộc về người dùng
            totalTracks: orderedTrackIds.length,
            totalDuration: totalDuration,
            tracks: {
              createMany: {
                data: orderedTrackIds.map((trackId, index) => ({
                  trackId,
                  trackOrder: index,
                })),
              },
            },
          },
        });
        // Log này để test, sau khi ổn thì xóa đi
        console.log(
          `[Register] Created Welcome Mix for new user ${user.id} with ${orderedTrackIds.length} popular tracks.`
        );
      } else {
        console.log(
          `[Register] No popular tracks found to create Welcome Mix for user ${user.id}.`
        );
      }
    } catch (playlistError) {
      // Log lỗi nhưng không làm gián đoạn quá trình đăng ký
      console.error(
        `[Register] Error creating initial playlists for user ${user.id}:`,
        playlistError
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

    // Kiểm tra maintenance mode - chỉ cho phép ADMIN đăng nhập
    const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    if (maintenanceMode && user.role !== Role.ADMIN) {
      res.status(503).json({
        message:
          'The system is currently under maintenance. Please try again later.',
        code: 'MAINTENANCE_MODE',
      });
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
      user: userResponse,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Đăng nhập bằng Google OAuth
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'Google token is required' });
      return;
    }

    // Get user info using access token
    const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => res.json());

    if (!userInfo.email) {
      res.status(400).json({ message: 'Invalid Google token' });
      return;
    }

    const { email, name, sub: googleId } = userInfo;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(400).json({ 
        message: 'You do not have a SoundWave account connected to a Google account. If you have a SoundWave account, please try logging in with your SoundWave email or username. If you do not have a SoundWave account, please sign up.',
        code: 'GOOGLE_ACCOUNT_NOT_FOUND'
      });
      return;
    }

    const tokenResponse = generateToken(user.id, user.role);

    res.json({
      message: 'Login successful',
      token: tokenResponse,
      user,
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Đăng ký bằng Google OAuth
export const googleRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'Google token is required' });
      return;
    }

    // Get user info using access token
    const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => res.json());

    if (!userInfo.email) {
      res.status(400).json({ message: 'Invalid Google token' });
      return;
    }

    const { email, name, sub: googleId, picture: googleAvatarUrl } = userInfo;

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // If user exists, generate new token and login
      const tokenResponse = generateToken(user.id, user.role);
      res.json({
        message: 'Login successful',
        token: tokenResponse,
        user,
      });
      return;
    }

    // Convert Google avatar to Cloudinary
    let avatar = googleAvatarUrl;
    if (googleAvatarUrl) {
      try {
        const response = await fetch(googleAvatarUrl);
        const buffer = await response.arrayBuffer();
        const result = await uploadToCloudinary(Buffer.from(buffer), {
          folder: 'avatars',
          resource_type: 'image'
        }) as { secure_url: string };
        avatar = result.secure_url;
      } catch (error) {
        console.error('Error converting Google avatar:', error);
        // Continue with original avatar if conversion fails
      }
    }

    // If user doesn't exist, create new user
    const randomPassword = uuidv4();
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    user = await prisma.user.create({
      data: {
        email,
        name,
        role: Role.USER,
        password: hashedPassword,
        avatar,
      },
    });

    // Tạo playlist mặc định cho người dùng mới
    try {
      // Tạo "Welcome Mix" bằng các bài hát phổ biến
      const defaultTrackIds = await aiService.generateDefaultPlaylistForNewUser(
        user.id
      ); // Lấy danh sách track IDs phổ biến

      if (defaultTrackIds.length > 0) {
        // Lấy thông tin tracks để tính duration
        const tracksInfo = await prisma.track.findMany({
          where: { id: { in: defaultTrackIds } },
          select: { id: true, duration: true },
        });
        const totalDuration = tracksInfo.reduce(
          (sum, track) => sum + track.duration,
          0
        );
        const trackIdMap = new Map(tracksInfo.map((t) => [t.id, t]));

        // Sắp xếp lại trackIds theo thứ tự trả về từ generateDefaultPlaylistForNewUser
        const orderedTrackIds = defaultTrackIds.filter((id) =>
          trackIdMap.has(id)
        );

        await prisma.playlist.create({
          data: {
            name: 'Welcome Mix',
            description:
              'A selection of popular tracks to start your journey on Soundwave.',
            privacy: 'PRIVATE',
            type: 'NORMAL',
            isAIGenerated: false,
            userId: user.id, // Playlist này thuộc về người dùng
            totalTracks: orderedTrackIds.length,
            totalDuration: totalDuration,
            tracks: {
              createMany: {
                data: orderedTrackIds.map((trackId, index) => ({
                  trackId,
                  trackOrder: index,
                })),
              },
            },
          },
        });
        console.log(
          `[Google Register] Created Welcome Mix for new user ${user.id} with ${orderedTrackIds.length} popular tracks.`
        );
      } else {
        console.log(
          `[Google Register] No popular tracks found to create Welcome Mix for user ${user.id}.`
        );
      }
    } catch (playlistError) {
      // Log lỗi nhưng không làm gián đoạn quá trình đăng ký
      console.error(
        `[Google Register] Error creating initial playlists for user ${user.id}:`,
        playlistError
      );
    }

    const tokenResponse = generateToken(user.id, user.role);

    res.status(201).json({
      message: 'Registration successful',
      token: tokenResponse,
      user,
    });
  } catch (error) {
    console.error('Google register error:', error);
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
    console.log(`[Reset Password] Request received for email: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, username: true },
    });

    if (!user) {
      console.log(`[Reset Password] User not found for email: ${email}`);
      res.status(404).json({ message: 'User not found' });
      return;
    }
    console.log(`[Reset Password] User found: ${user.id}`);

    // Tạo token và thời gian hết hạn
    const resetToken = uuidv4();
    const resetTokenExpiry = addHours(new Date(), 1);

    // Lưu token và thời gian hết hạn vào database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpiry,
      },
    });
    console.log(
      `[Reset Password] Reset token generated and saved for user: ${user.id}`
    );

    // **Định nghĩa resetLink Ở ĐÂY, trước khi sử dụng**
    const resetLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Gửi email chứa link đặt lại mật khẩu
    try {
      const userName = user.name || user.username || 'bạn';
      // Tạo email options bằng hàm mới, resetLink đã được định nghĩa
      const emailOptions = emailService.createPasswordResetEmail(
        user.email,
        userName,
        resetLink
      );
      console.log(
        `[Reset Password] Attempting to send reset email to: ${user.email}`
      );
      // Gửi email bằng hàm chung
      await emailService.sendEmail(emailOptions);
      console.log(
        `[Reset Password] Email send attempt finished for: ${user.email}`
      );

      res.json({ message: 'Password reset email sent successfully' });
      return;
    } catch (emailError) {
      console.error('[Reset Password] Failed to send email:', emailError);
      res.status(500).json({ message: 'Failed to send password reset email' });
      return;
    }
  } catch (error) {
    console.error('[Reset Password] General error:', error);
    res.status(500).json({ message: 'Internal server error' });
    return;
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

    // Kiểm tra nếu mật khẩu mới trùng với mật khẩu cũ
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      res.status(400).json({
        message: 'New password cannot be the same as the old password',
      });
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

// Lấy trạng thái maintenance
export const getMaintenanceStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    res.json({ enabled: maintenanceMode });
  } catch (error) {
    console.error('Error getting maintenance status:', error);
    // Avoid exposing internal errors publicly
    res.status(500).json({ message: 'Could not retrieve maintenance status' });
  }
};

export const convertGoogleAvatar: RequestHandler = async (req, res) => {
  try {
    const { googleAvatarUrl } = req.body;
    
    if (!googleAvatarUrl) {
      res.status(400).json({ error: 'Google avatar URL is required' });
      return;
    }

    const response = await fetch(googleAvatarUrl);
    const buffer = await response.arrayBuffer();

    const result = await uploadToCloudinary(Buffer.from(buffer), {
      folder: 'avatars',
      resource_type: 'image'
    }) as { secure_url: string };

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Error converting Google avatar:', error);
    res.status(500).json({ error: 'Failed to convert Google avatar' });
  }
};
