import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { Role, HistoryType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { addHours } from 'date-fns';
import sgMail from '@sendgrid/mail';
import { client, setCache } from '../middleware/cache.middleware';
import { uploadFile } from '../services/cloudinary.service';

const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  avatar: true,
  role: true,
  isActive: true,
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
    },
  },
} as const;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

// Hàm validation cho dữ liệu nghệ sĩ
const validateArtistData = (data: any): string | null => {
  const { artistName, bio, socialMediaLinks, genres } = data;

  if (!artistName?.trim()) return 'Artist name is required';
  if (artistName.length < 3) return 'Artist name must be at least 3 characters';

  if (bio && bio.length > 500) return 'Bio must be less than 500 characters';

  // Kiểm tra socialMediaLinks
  if (socialMediaLinks) {
    if (
      typeof socialMediaLinks !== 'object' ||
      Array.isArray(socialMediaLinks)
    ) {
      return 'socialMediaLinks must be an object';
    }
    for (const key in socialMediaLinks) {
      if (typeof socialMediaLinks[key] !== 'string') {
        return `socialMediaLinks.${key} must be a string`;
      }
    }
  }

  // Kiểm tra genres
  if (!genres || !Array.isArray(genres) || genres.length === 0) {
    return 'At least one genre is required';
  }

  return null;
};

// Helper function để tạo JWT token
// const generateToken = (
//   userId: string,
//   role: Role,
//   artistProfile?: {
//     isVerified: boolean;
//     verificationRequestedAt?: Date | null;
//   } | null
// ): string => {
//   return jwt.sign(
//     {
//       id: userId,
//       role,
//       isVerified: artistProfile?.isVerified || false,
//       verificationRequestedAt:
//         artistProfile?.verificationRequestedAt?.toISOString(),
//     },
//     JWT_SECRET,
//     {
//       expiresIn: '1h',
//     }
//   );
// };

const generateToken = (
  userId: string,
  role: Role,
  artistProfile?: {
    isVerified: boolean;
    verificationRequestedAt?: Date | null;
  } | null
): string => {
  return jwt.sign(
    {
      id: userId,
      role,
      isVerified: artistProfile?.isVerified || false,
      verificationRequestedAt:
        artistProfile?.verificationRequestedAt?.toISOString(),
    },
    JWT_SECRET,
    {
      expiresIn: '24h',
    }
  );
};

// Route kiểm tra token
export const validateToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ message: 'Access denied. No token provided.' });
      return;
    }

    // Xác thực token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      role: Role;
      isVerified: boolean;
      verificationRequestedAt?: string;
    };

    // Tìm người dùng trong database
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
    console.error('Validate token error:', error);
    res.status(400).json({ message: 'Invalid token' });
  }
};

// Đăng ký (Admin)
export const registerAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
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

    // Tạo người dùng mới với role là ADMIN
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
      select: { ...userSelect, password: true },
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid email or password' });
      return;
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(400).json({ message: 'Invalid email or password' });
      return;
    }

    // Cập nhật thời gian đăng nhập cuối cùng
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Loại bỏ password khỏi phản hồi
    const { password: _, ...userWithoutPassword } = user;

    // Tạo JWT token
    const token = generateToken(user.id, user.role, user.artistProfile);

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Yêu cầu trở thành Artist (Request Artist Role)
export const requestArtistRole = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const {
      artistName,
      bio,
      socialMediaLinks: socialMediaLinksString,
      genres: genresString,
    } = req.body;
    const avatarFile = req.file; // Lấy file từ request

    // Chuyển đổi socialMediaLinks từ chuỗi JSON sang đối tượng JavaScript
    let socialMediaLinks = {};
    if (socialMediaLinksString) {
      try {
        socialMediaLinks = JSON.parse(socialMediaLinksString);
      } catch (error) {
        res
          .status(400)
          .json({ message: 'Invalid JSON format for socialMediaLinks' });
        return;
      }
    }

    // Chuyển đổi genres từ chuỗi sang mảng
    let genres = [];
    if (genresString) {
      try {
        genres = genresString.split(','); // Chuyển chuỗi thành mảng dựa trên dấu phẩy
      } catch (error) {
        res.status(400).json({ message: 'Invalid format for genres' });
        return;
      }
    }

    // Validate dữ liệu nghệ sĩ
    const validationError = validateArtistData({
      artistName,
      bio,
      socialMediaLinks,
      genres,
    });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    // Chỉ USER mới có thể yêu cầu trở thành ARTIST
    if (!user || user.role !== Role.USER) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Kiểm tra xem USER đã gửi yêu cầu trước đó chưa
    const existingRequest = await prisma.artistProfile.findUnique({
      where: { userId: user.id },
      select: { verificationRequestedAt: true },
    });

    if (existingRequest?.verificationRequestedAt) {
      res
        .status(400)
        .json({ message: 'You have already requested to become an artist' });
      return;
    }

    // Upload avatar lên Cloudinary
    let avatarUrl = null;
    if (avatarFile) {
      const uploadResult = await uploadFile(
        avatarFile.buffer,
        'artist-avatars'
      );
      avatarUrl = uploadResult.secure_url;
    }

    // Tạo ArtistProfile với thông tin cung cấp
    await prisma.artistProfile.create({
      data: {
        artistName,
        bio,
        socialMediaLinks,
        avatar: avatarUrl, // Lưu URL avatar vào database
        verificationRequestedAt: new Date(), // Cập nhật trường mới
        user: { connect: { id: user.id } },
        genres: {
          create: genres.map((genreId: string) => ({
            genre: { connect: { id: genreId } },
          })),
        },
      },
    });

    res.json({ message: 'Artist role request submitted successfully' });
  } catch (error) {
    console.error('Request artist role error:', error);
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

// Tìm kiếm tổng hợp (Search All)
export const searchAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!q) {
      res.status(400).json({ message: 'Query is required' });
      return;
    }

    const searchQuery = String(q).trim();
    const cacheKey = `/search-all?q=${searchQuery}`;

    // Kiểm tra xem có sử dụng Redis cache không
    const useRedisCache = process.env.USE_REDIS_CACHE === 'true';

    if (useRedisCache) {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log('Serving from Redis cache:', cacheKey);
        res.json(JSON.parse(cachedData));
        return;
      }
    }

    // Lưu lịch sử tìm kiếm
    const existingHistory = await prisma.history.findFirst({
      where: {
        userId: user.id,
        type: HistoryType.SEARCH,
        query: {
          equals: searchQuery,
          mode: 'insensitive',
        },
      },
    });

    if (existingHistory) {
      await prisma.history.update({
        where: { id: existingHistory.id },
        data: { updatedAt: new Date() },
      });
    } else {
      await prisma.history.create({
        data: {
          type: HistoryType.SEARCH,
          query: searchQuery,
          userId: user.id,
        },
      });
    }

    // Thực hiện tìm kiếm album và track song song
    const [artists, albums, tracks, users] = await Promise.all([
      prisma.user.findMany({
        where: {
          isActive: true,
          role: Role.ARTIST,
          id: { not: user.id },
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { username: { contains: searchQuery, mode: 'insensitive' } },
            { artistProfile: {genres: {some: {genreId: {equals: searchQuery}}}}},
            { artistProfile: {artistName: {contains: searchQuery, mode: 'insensitive'}}},
          ],
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          role: true,
          isActive: true,
          artistProfile: {
            select: {
              id: true,
              artistName: true,
              bio: true,
              isVerified: true,
              avatar: true,
              socialMediaLinks: true,
              monthlyListeners: true,
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
        },
      }),

      prisma.album.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { artist: {name: {contains: searchQuery, mode: 'insensitive'}} },
            { genres: {some: {genreId: {equals: searchQuery}}} },
          ],
        },
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
          artist: {
            select: {
              id: true,
              name: true,
              avatar: true,
              artistProfile: {
                select: {
                  isVerified: true,
                  artistName: true,
                },
              },
            },
          },
          tracks: {
            where: { isActive: true },
            orderBy: { trackNumber: 'asc' },
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
              artist: {
                select: {
                  id: true,
                  name: true,
                  artistProfile: {
                    select: {
                      artistName: true,
                    },
                  },
                },
              },
              featuredArtists: {
                select: {
                  artistProfile: {
                    select: {
                      id: true,
                      artistName: true,
                      user: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
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
      }),
      prisma.track.findMany({
        where: {
          isActive: true,
          OR: [
            {
              title: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
            {
              artist: {
                name: {
                  contains: searchQuery,
                  mode: 'insensitive',
                },
              },
            },
            {
              artist: {
                artistProfile: {
                  artistName: {
                    contains: searchQuery,
                    mode: 'insensitive',
                  },
                },
              },
            },
            {
              featuredArtists: {
                some: {
                  artistProfile: {
                    artistName: {
                      contains: searchQuery,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            },
            {
              genres: {
                some: {
                  genreId: {
                    equals: searchQuery,
                  },
                },
              },
            },
          ],
        },
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
          artist: {
            select: {
              id: true,
              name: true,
              avatar: true,
              artistProfile: {
                select: {
                  isVerified: true,
                  artistName: true,
                },
              },
            },
          },
          featuredArtists: {
            select: {
              artistProfile: {
                select: {
                  id: true,
                  artistName: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          album: {
            select: {
              id: true,
              title: true,
              coverUrl: true,
            },
          },
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
        orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.user.findMany({
        where: {
          id: { not: user.id },
          role: Role.USER,
          isActive: true,
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { username: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          isActive: true,
        },
      }),
    ]);

    const searchResult = {
      artists,
      albums,
      tracks,
      users,
    };

    if (useRedisCache) {
      await setCache(cacheKey, searchResult, 600); // Cache trong 10 phút
    }

    res.json(searchResult);
  } catch (error) {
    console.error('Search all error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
