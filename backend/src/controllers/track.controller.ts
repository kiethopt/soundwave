import { Request, Response } from 'express';
import prisma from '../config/db';
import {
  uploadFile,
  CloudinaryUploadResult,
} from '../services/cloudinary.service';
import { AlbumType, Role, HistoryType } from '@prisma/client';
import { historySelect } from './history.controller';

const trackSelect = {
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
  artistId: true,
  artist: {
    select: {
      id: true,
      name: true,
      avatar: true,
      artistProfile: {
        select: {
          artistName: true,
          isVerified: true,
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
} as const;

// Function để kiểm tra quyền
const canManageTrack = (user: any, trackArtistId: string) => {
  return (
    user.role === Role.ADMIN ||
    (user.role === Role.ARTIST && user.id === trackArtistId)
  );
};

// Validation functions
const validateTrackData = (
  data: any,
  isSingleTrack: boolean = true
): string | null => {
  const {
    title,
    duration,
    releaseDate,
    trackNumber,
    coverUrl,
    audioUrl,
    type,
    featuredArtists,
  } = data;

  // Validate các trường bắt buộc
  if (!title?.trim()) return 'Title is required';
  if (duration === undefined || duration < 0)
    return 'Duration must be a non-negative number';
  if (!releaseDate || isNaN(Date.parse(releaseDate)))
    return 'Valid release date is required';
  if (!coverUrl?.trim()) return 'Cover URL is required';
  if (!audioUrl?.trim()) return 'Audio URL is required';
  if (type && !Object.values(AlbumType).includes(type))
    return 'Invalid track type';

  // Nếu là SINGLE track, không cần trackNumber
  if (!isSingleTrack && (trackNumber === undefined || trackNumber <= 0)) {
    return 'Track number must be a positive integer';
  }

  // Validate featuredArtists (nếu có)
  if (featuredArtists) {
    if (!Array.isArray(featuredArtists)) {
      return 'Featured artists must be an array';
    }
    for (const artistProfileId of featuredArtists) {
      if (typeof artistProfileId !== 'string' || !artistProfileId.trim()) {
        return 'Each featured artist ID must be a non-empty string';
      }
    }
  }

  return null; // Track hợp lệ
};

// Validation functions cho file
const validateFile = (
  file: Express.Multer.File,
  isAudio: boolean = false
): string | null => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3'];
  const maxFileNameLength = 100; // Giới hạn độ dài tên file

  // Kiểm tra kích thước file
  if (file.size > maxSize) {
    return 'File size too large. Maximum allowed size is 5MB.';
  }

  // Kiểm tra loại file
  if (isAudio) {
    if (!allowedAudioTypes.includes(file.mimetype)) {
      return `Invalid audio file type. Only ${allowedAudioTypes.join(
        ', '
      )} are allowed.`;
    }
  } else {
    if (!allowedImageTypes.includes(file.mimetype)) {
      return `Invalid image file type. Only ${allowedImageTypes.join(
        ', '
      )} are allowed.`;
    }
  }

  // Kiểm tra tên file
  if (file.originalname.length > maxFileNameLength) {
    return `File name too long. Maximum allowed length is ${maxFileNameLength} characters.`;
  }

  // Kiểm tra ký tự đặc biệt trong tên file
  const invalidChars = /[<>:"/\\|?*]/g;
  if (invalidChars.test(file.originalname)) {
    return 'File name contains invalid characters.';
  }

  return null; // File hợp lệ
};

// Tạo track mới (ADMIN & ARTIST only)
export const createTrack = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    // Kiểm tra xem user có tồn tại và có quyền tạo track không
    if (!user) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Lấy thông tin đầy đủ của user từ database
    const fullUserInfo = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        artistProfile: {
          select: {
            isVerified: true,
            verificationRequestedAt: true,
          },
        },
      },
    });

    if (!fullUserInfo) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Kiểm tra trạng thái verification
    if (
      fullUserInfo.role === Role.USER &&
      fullUserInfo.artistProfile?.verificationRequestedAt
    ) {
      res.status(403).json({
        message:
          'Your artist request is pending approval. Please wait for admin approval.',
      });
      return;
    }

    // Nếu user là ARTIST, kiểm tra xem họ đã được xác thực chưa
    if (
      fullUserInfo.role === Role.ARTIST &&
      !fullUserInfo.artistProfile?.isVerified
    ) {
      res.status(403).json({
        message: 'Artist is not verified. Please wait for admin approval.',
      });
      return;
    }

    // Nếu user không phải ADMIN hoặc ARTIST, trả về Forbidden
    if (fullUserInfo.role !== Role.ADMIN && fullUserInfo.role !== Role.ARTIST) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const {
      title,
      duration,
      releaseDate,
      trackNumber,
      albumId,
      featuredArtists,
      genreIds, // Thêm trường genreIds để nhận danh sách thể loại
    } = req.body;

    // Chuyển đổi featuredArtists từ string thành array
    const featuredArtistsArray = featuredArtists
      ? featuredArtists.split(',').map((id: string) => id.trim())
      : [];

    // Chuyển đổi genreIds từ string thành array
    const genreIdsArray = genreIds
      ? genreIds.split(',').map((id: string) => id.trim())
      : [];

    // Kiểm tra xem req.files có tồn tại không
    if (!req.files) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    // Ép kiểu req.files để TypeScript hiểu cấu trúc của nó
    const files = req.files as {
      audioFile?: Express.Multer.File[];
      coverFile?: Express.Multer.File[];
    };

    const audioFile = files.audioFile ? files.audioFile[0] : null;
    const coverFile = files.coverFile ? files.coverFile[0] : null;

    // Validation
    const validationError = validateTrackData({
      title,
      duration,
      releaseDate,
      trackNumber,
      coverUrl: coverFile ? 'placeholder' : '',
      audioUrl: audioFile ? 'placeholder' : '',
    });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    // Kiểm tra file upload (nếu có)
    if (audioFile) {
      const fileValidationError = validateFile(audioFile, true); // Kiểm tra file audio
      if (fileValidationError) {
        res.status(400).json({ message: fileValidationError });
        return;
      }
    }
    if (coverFile) {
      const fileValidationError = validateFile(coverFile, false); // Kiểm tra file ảnh
      if (fileValidationError) {
        res.status(400).json({ message: fileValidationError });
        return;
      }
    }

    // Kiểm tra xem audioFile có tồn tại không
    if (!audioFile) {
      res.status(400).json({ message: 'Audio file is required' });
      return;
    }

    // Upload audio và cover
    const audioUpload: CloudinaryUploadResult = await uploadFile(
      audioFile.buffer,
      'tracks',
      'auto'
    );
    const coverUrl = coverFile
      ? (await uploadFile(coverFile.buffer, 'covers', 'image')).secure_url
      : null;

    // Kiểm tra sự tồn tại của các featuredArtists
    if (featuredArtistsArray.length > 0) {
      const existingArtists = await prisma.artistProfile.findMany({
        where: { id: { in: featuredArtistsArray } },
      });

      if (existingArtists.length !== featuredArtistsArray.length) {
        res
          .status(400)
          .json({ message: 'One or more featured artists do not exist' });
        return;
      }
    }

    // Kiểm tra sự tồn tại của các genreIds
    if (genreIdsArray.length > 0) {
      const existingGenres = await prisma.genre.findMany({
        where: { id: { in: genreIdsArray } },
      });

      if (existingGenres.length !== genreIdsArray.length) {
        res.status(400).json({ message: 'One or more genres do not exist' });
        return;
      }
    }

    // Tạo track
    const track = await prisma.track.create({
      data: {
        title,
        duration: Number(duration),
        releaseDate: new Date(releaseDate),
        trackNumber: trackNumber ? Number(trackNumber) : null,
        coverUrl,
        audioUrl: audioUpload.secure_url,
        artistId: user.id,
        albumId: albumId || null,
        type: albumId ? undefined : 'SINGLE',
        featuredArtists:
          featuredArtistsArray.length > 0
            ? {
                create: featuredArtistsArray.map((artistProfileId: string) => ({
                  artistProfileId,
                })),
              }
            : undefined,
        genres:
          genreIdsArray.length > 0
            ? {
                create: genreIdsArray.map((genreId: string) => ({
                  genreId,
                })),
              }
            : undefined,
      },
      select: trackSelect,
    });

    res.status(201).json({
      message: 'Track created successfully',
      track,
    });
  } catch (error) {
    console.error('Create track error:', error);

    // Kiểm tra kiểu của error trước khi truy cập thuộc tính code
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      res.status(400).json({
        message: 'A track with the same title already exists for this artist.',
      });
      return;
    }

    // Xử lý các lỗi khác
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cập nhật track (ADMIN & ARTIST only)
export const updateTrack = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    const {
      title,
      duration,
      releaseDate,
      trackNumber,
      albumId,
      featuredArtists,
      genreIds, // Thêm trường genreIds để nhận danh sách thể loại
    } = req.body;

    // Kiểm tra xem user có tồn tại và có quyền cập nhật track không
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.ARTIST)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Lấy thông tin track hiện tại
    const track = await prisma.track.findUnique({
      where: { id },
      select: { artistId: true },
    });

    if (!track) {
      res.status(404).json({ message: 'Track not found' });
      return;
    }

    // Kiểm tra quyền sở hữu track
    if (!canManageTrack(user, track.artistId)) {
      res.status(403).json({ message: 'You can only update your own tracks' });
      return;
    }

    // Validation
    const validationError = validateTrackData({
      title,
      duration,
      releaseDate,
      trackNumber,
      coverUrl: 'placeholder',
      audioUrl: 'placeholder',
    });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    // Kiểm tra featuredArtists (nếu có)
    if (featuredArtists && featuredArtists.length > 0) {
      const existingArtists = await prisma.artistProfile.findMany({
        where: { id: { in: featuredArtists } },
      });

      if (existingArtists.length !== featuredArtists.length) {
        res
          .status(400)
          .json({ message: 'One or more featured artists do not exist' });
        return;
      }
    }

    // Kiểm tra sự tồn tại của các genreIds
    const genreIdsArray = genreIds
      ? genreIds.split(',').map((id: string) => id.trim())
      : [];
    if (genreIdsArray.length > 0) {
      const existingGenres = await prisma.genre.findMany({
        where: { id: { in: genreIdsArray } },
      });

      if (existingGenres.length !== genreIdsArray.length) {
        res.status(400).json({ message: 'One or more genres do not exist' });
        return;
      }
    }

    // Cập nhật track
    const updatedTrack = await prisma.track.update({
      where: { id },
      data: {
        title,
        duration: Number(duration),
        releaseDate: new Date(releaseDate),
        trackNumber: trackNumber ? Number(trackNumber) : null,
        albumId: albumId || null,
        featuredArtists: {
          deleteMany: {}, // Xóa tất cả featuredArtists cũ
          create: featuredArtists?.map((artistProfileId: string) => ({
            artistProfileId,
          })),
        },
        genres: {
          deleteMany: {}, // Xóa tất cả genres cũ
          create: genreIdsArray.map((genreId: string) => ({
            genreId,
          })),
        },
      },
      select: trackSelect,
    });

    res.json({
      message: 'Track updated successfully',
      track: updatedTrack,
    });
  } catch (error) {
    console.error('Update track error:', error);

    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      res.status(400).json({
        message: 'A track with the same title already exists for this artist.',
      });
      return;
    }

    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa track (ADMIN & ARTIST only) - Hard delete
export const deleteTrack = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    // Kiểm tra xem user có tồn tại và có quyền xóa track không
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.ARTIST)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Lấy thông tin track hiện tại
    const track = await prisma.track.findUnique({
      where: { id },
      select: { artistId: true },
    });

    if (!track) {
      res.status(404).json({ message: 'Track not found' });
      return;
    }

    // Kiểm tra quyền sở hữu track
    if (!canManageTrack(user, track.artistId)) {
      res.status(403).json({ message: 'You can only delete your own tracks' });
      return;
    }

    // Hard delete track
    await prisma.track.delete({
      where: { id },
    });

    res.json({ message: 'Track deleted successfully' });
  } catch (error) {
    console.error('Delete track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Tìm track
export const searchTrack = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { q } = req.query;
    const user = req.user;

    if (!q) {
      res.status(400).json({ message: 'Query is required' });
      return;
    }

    const searchQuery = String(q).trim();

    // Lưu lịch sử tìm kiếm nếu người dùng đã đăng nhập
    if (user) {
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
    }

    // Tìm kiếm track
    const tracks = await prisma.track.findMany({
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
        ],
      },
      select: trackSelect,
      orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
    });

    res.json(tracks);
  } catch (error) {
    console.error('Search track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách tracks theo loại
export const getTracksByType = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Kiểm tra xem type có hợp lệ không
    if (!Object.values(AlbumType).includes(type as AlbumType)) {
      res.status(400).json({ message: 'Invalid track type' });
      return;
    }

    // Lấy danh sách tracks với phân trang
    const tracks = await prisma.track.findMany({
      where: {
        type: type as AlbumType,
        isActive: true,
      },
      select: trackSelect,
      orderBy: { createdAt: 'desc' }, // Sắp xếp theo thời gian tạo mới nhất
      skip: offset,
      take: Number(limit),
    });

    // Đếm tổng số tracks
    const totalTracks = await prisma.track.count({
      where: {
        type: type as AlbumType,
        isActive: true,
      },
    });

    // Trả về kết quả với thông tin phân trang
    res.json({
      tracks,
      pagination: {
        total: totalTracks,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalTracks / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get tracks by type error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách tất cả các tracks (ADMIN & ARTIST only)
export const getAllTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    // Kiểm tra quyền truy cập
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.ARTIST)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Nếu là ARTIST, chỉ lấy track của chính họ
    const whereClause = user.role === Role.ARTIST ? { artistId: user.id } : {};

    const tracks = await prisma.track.findMany({
      skip: offset,
      take: Number(limit),
      where: { ...whereClause, isActive: true },
      select: trackSelect,
      orderBy: { createdAt: 'desc' },
    });

    const totalTracks = await prisma.track.count({
      where: { ...whereClause, isActive: true },
    });

    res.json({
      tracks,
      pagination: {
        total: totalTracks,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalTracks / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all tracks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách tất cả các tracks theo thể loại
export const getTracksByGenre = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { genreId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Kiểm tra xem genreId có tồn tại không
    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
    });

    if (!genre) {
      res.status(404).json({ message: 'Genre not found' });
      return;
    }

    // Lấy danh sách tracks với phân trang
    const tracks = await prisma.track.findMany({
      where: {
        genres: {
          some: {
            genreId: genreId, // Chỉ lấy các track có chứa genreId này
          },
        },
        isActive: true, // Chỉ lấy các track đang active
      },
      select: {
        ...trackSelect,
        genres: {
          where: {
            genreId: genreId, // Chỉ lấy genre đang tìm kiếm
          },
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
      orderBy: { createdAt: 'desc' }, // Sắp xếp theo thời gian tạo mới nhất
      skip: offset,
      take: Number(limit),
    });

    // Đếm tổng số tracks
    const totalTracks = await prisma.track.count({
      where: {
        genres: {
          some: {
            genreId: genreId, // Chỉ đếm các track có chứa genreId này
          },
        },
        isActive: true, // Chỉ đếm các track đang active
      },
    });

    // Trả về kết quả với thông tin phân trang
    res.json({
      tracks,
      pagination: {
        total: totalTracks,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalTracks / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get tracks by genre error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách tracks theo type và genre
export const getTracksByTypeAndGenre = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { type, genreId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Kiểm tra xem type có hợp lệ không
    if (!Object.values(AlbumType).includes(type as AlbumType)) {
      res.status(400).json({ message: 'Invalid track type' });
      return;
    }

    // Kiểm tra xem genreId có tồn tại không
    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
    });

    if (!genre) {
      res.status(404).json({ message: 'Genre not found' });
      return;
    }

    // Lấy danh sách tracks với phân trang
    const tracks = await prisma.track.findMany({
      where: {
        type: type as AlbumType,
        genres: {
          some: {
            genreId,
          },
        },
        isActive: true,
      },
      select: {
        ...trackSelect,
        genres: {
          where: {
            genreId: genreId, // Chỉ lấy genre đang tìm kiếm
          },
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
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: Number(limit),
    });

    // Đếm tổng số tracks
    const totalTracks = await prisma.track.count({
      where: {
        type: type as AlbumType,
        genres: {
          some: {
            genreId,
          },
        },
        isActive: true,
      },
    });

    // Trả về kết quả với thông tin phân trang
    res.json({
      tracks,
      pagination: {
        total: totalTracks,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalTracks / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get tracks by type and genre error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Phát một track
export const playTrack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trackId } = req.params;
    const { duration, completed } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Kiểm tra xem track có tồn tại không
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: trackSelect,
    });

    if (!track) {
      res.status(404).json({ message: 'Track not found' });
      return;
    }

    // Kiểm tra xem user đã có lịch sử nghe track này chưa
    const existingHistory = await prisma.history.findFirst({
      where: {
        userId: user.id,
        trackId,
        type: HistoryType.PLAY,
      },
    });

    // Tính toán điều kiện để tăng playCount và monthlyListeners
    const shouldIncrementPlayCount =
      completed || (duration && duration >= track.duration / 2);

    // Tạo hoặc cập nhật lịch sử nghe nhạc
    const history = await prisma.history.upsert({
      where: {
        userId_trackId_type: {
          userId: user.id,
          trackId,
          type: HistoryType.PLAY,
        },
      },
      create: {
        type: HistoryType.PLAY,
        duration,
        completed,
        trackId,
        userId: user.id,
        playCount: 1,
      },
      update: {
        duration,
        completed,
        playCount: { increment: 1 },
        updatedAt: new Date(),
      },
      select: historySelect,
    });

    let updatedTrack = track;
    if (shouldIncrementPlayCount) {
      // Kiểm tra xem user đã nghe track này trong tháng này chưa
      const currentMonth = new Date().getMonth();
      const lastPlayedMonth = existingHistory?.createdAt?.getMonth();

      // Chỉ tăng monthlyListeners nếu user chưa nghe track này trong tháng này
      const shouldIncrementMonthlyListeners = lastPlayedMonth !== currentMonth;

      // Tăng playCount của track
      updatedTrack = await prisma.track.update({
        where: { id: trackId },
        data: {
          playCount: { increment: 1 },
        },
        select: trackSelect,
      });

      // Tăng monthlyListeners của artist nếu cần
      if (shouldIncrementMonthlyListeners) {
        await prisma.artistProfile.update({
          where: { userId: track.artistId },
          data: {
            monthlyListeners: { increment: 1 },
          },
        });
      }
    }

    res.json({
      message: 'Track played successfully',
      history,
      track: updatedTrack,
    });
  } catch (error) {
    console.error('Play track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
