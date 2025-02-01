import { Request, Response } from 'express';
import prisma from '../config/db';
import { uploadFile } from '../services/cloudinary.service';
import { AlbumType, Role, HistoryType, Prisma } from '@prisma/client';
import { clearCacheForEntity, setCache } from '../middleware/cache.middleware';
import { sessionService } from '../services/session.service';
import { trackSelect } from '../utils/prisma-selects';

// Function để kiểm tra quyền
const canManageTrack = (user: any, trackArtistId: string): boolean => {
  if (!user) return false;

  // ADMIN luôn có quyền
  if (user.role === Role.ADMIN) return true;

  // Kiểm tra user có artistProfile đã verify và có role ARTIST không
  return (
    user.artistProfile?.isVerified &&
    user.artistProfile?.isActive &&
    user.artistProfile?.role === Role.ARTIST &&
    user.artistProfile?.id === trackArtistId
  );
};

// Validation functions
const validateTrackData = (
  data: any,
  isSingleTrack: boolean = true,
  validateRequired: boolean = true
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

  // Validate các trường bắt buộc nếu validateRequired = true
  if (validateRequired) {
    if (!title?.trim()) return 'Title is required';
    if (duration === undefined || duration < 0)
      return 'Duration must be a non-negative number';
    if (!releaseDate || isNaN(Date.parse(releaseDate)))
      return 'Valid release date is required';
    if (!coverUrl?.trim()) return 'Cover URL is required';
    if (!audioUrl?.trim()) return 'Audio URL is required';
  } else {
    // Validate các trường nếu chúng được cung cấp
    if (title !== undefined && !title.trim()) return 'Title cannot be empty';
    if (duration !== undefined && duration < 0)
      return 'Duration must be a non-negative number';
    if (releaseDate !== undefined && isNaN(Date.parse(releaseDate)))
      return 'Invalid release date format';
  }

  if (type && !Object.values(AlbumType).includes(type))
    return 'Invalid track type';

  // Nếu là SINGLE track, không cần trackNumber
  if (!isSingleTrack && trackNumber !== undefined && trackNumber <= 0) {
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

    // Kiểm tra xác thực và quyền
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const {
      title,
      releaseDate,
      trackNumber,
      albumId,
      featuredArtists,
      genreIds,
      artistId, // Cho ADMIN tạo track cho artist
    } = req.body;

    // Xác định artistId: nếu là ADMIN thì dùng artistId từ request, nếu là artist thì dùng từ profile
    const finalArtistId =
      user.role === 'ADMIN' ? artistId : user.artistProfile?.id;

    // Kiểm tra quyền và xác thực
    if (!finalArtistId) {
      res.status(400).json({
        message:
          user.role === 'ADMIN'
            ? 'Artist ID is required'
            : 'Only verified artists can create tracks',
      });
      return;
    }

    // Nếu là artist, kiểm tra verified
    if (user.role !== 'ADMIN' && !user.artistProfile?.isVerified) {
      res.status(403).json({
        message: 'Only verified artists can create tracks',
      });
      return;
    }

    // Kiểm tra files
    if (!req.files) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    const files = req.files as {
      audioFile?: Express.Multer.File[];
      coverFile?: Express.Multer.File[];
    };

    const audioFile = files.audioFile?.[0];
    const coverFile = files.coverFile?.[0];

    if (!audioFile) {
      res.status(400).json({ message: 'Audio file is required' });
      return;
    }

    // Validate file types
    if (audioFile) {
      const audioValidationError = validateFile(audioFile, true);
      if (audioValidationError) {
        res.status(400).json({ message: audioValidationError });
        return;
      }
    }

    if (coverFile) {
      const coverValidationError = validateFile(coverFile, false);
      if (coverValidationError) {
        res.status(400).json({ message: coverValidationError });
        return;
      }
    }

    // Upload files to cloudinary
    const audioUpload = await uploadFile(audioFile.buffer, 'tracks', 'auto');
    const coverUrl = coverFile
      ? (await uploadFile(coverFile.buffer, 'covers', 'image')).secure_url
      : null;

    // Get audio duration using music-metadata
    const mm = await import('music-metadata');
    const metadata = await mm.parseBuffer(audioFile.buffer);
    const duration = Math.floor(metadata.format.duration || 0);

    // Process arrays
    const featuredArtistsArray = featuredArtists
      ? featuredArtists.split(',').map((id: string) => id.trim())
      : [];

    const genreIdsArray = genreIds
      ? genreIds.split(',').map((id: string) => id.trim())
      : [];

    // Tạo track
    const track = await prisma.track.create({
      data: {
        title,
        duration,
        releaseDate: new Date(releaseDate),
        trackNumber: trackNumber ? Number(trackNumber) : null,
        coverUrl,
        audioUrl: audioUpload.secure_url,
        artistId: finalArtistId,
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

    // Clear cache
    await clearCacheForEntity('track', {
      userId: finalArtistId,
      adminId: user.role === Role.ADMIN ? user.id : undefined,
      clearSearch: true,
    });

    res.status(201).json({
      message: 'Track created successfully',
      track,
    });
  } catch (error) {
    console.error('Create track error:', error);
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
      genreIds,
    } = req.body;

    // Kiểm tra xem user có tồn tại không
    if (!user) {
      res.status(401).json({ message: 'Unauthorized: User not found' });
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
      res.status(403).json({
        message: 'You can only update your own tracks',
        code: 'NOT_TRACK_OWNER',
      });
      return;
    }

    // Xử lý files nếu có
    const files = req.files as {
      audioFile?: Express.Multer.File[];
      coverFile?: Express.Multer.File[];
    };

    // Tạo object data để update
    const updateData: any = {};

    // Upload và cập nhật audioUrl nếu có file audio mới
    if (files?.audioFile?.[0]) {
      const audioFile = files.audioFile[0];
      // Validate file audio
      const audioValidationError = validateFile(audioFile, true);
      if (audioValidationError) {
        res.status(400).json({ message: audioValidationError });
        return;
      }
      const audioUpload = await uploadFile(audioFile.buffer, 'tracks', 'auto');
      updateData.audioUrl = audioUpload.secure_url;

      // Cập nhật duration nếu có file audio mới
      const mm = await import('music-metadata');
      const metadata = await mm.parseBuffer(audioFile.buffer);
      updateData.duration = Math.floor(metadata.format.duration || 0);
    }

    // Upload và cập nhật coverUrl nếu có file cover mới
    if (files?.coverFile?.[0]) {
      const coverFile = files.coverFile[0];
      // Validate file cover
      const coverValidationError = validateFile(coverFile, false);
      if (coverValidationError) {
        res.status(400).json({ message: coverValidationError });
        return;
      }
      const coverUpload = await uploadFile(coverFile.buffer, 'covers', 'image');
      updateData.coverUrl = coverUpload.secure_url;
    }

    // Validation với validateRequired = false vì đây là update
    const validationError = validateTrackData(
      {
        title,
        duration: updateData.duration || duration,
        releaseDate,
        trackNumber,
        coverUrl: updateData.coverUrl || 'placeholder',
        audioUrl: updateData.audioUrl || 'placeholder',
      },
      true,
      false
    );

    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    // Cập nhật các trường thông thường
    if (title !== undefined) updateData.title = title;
    if (duration !== undefined && !updateData.duration) {
      updateData.duration = Number(duration);
    }
    if (releaseDate !== undefined)
      updateData.releaseDate = new Date(releaseDate);
    if (trackNumber !== undefined) updateData.trackNumber = Number(trackNumber);
    if (albumId !== undefined) updateData.albumId = albumId || null;

    // Xử lý featuredArtists nếu được cung cấp
    if (featuredArtists) {
      const featuredArtistsArray = Array.isArray(featuredArtists)
        ? featuredArtists
        : featuredArtists.split(',').map((id: string) => id.trim());

      updateData.featuredArtists = {
        deleteMany: {},
        create: featuredArtistsArray.map((artistProfileId: string) => ({
          artistProfileId,
        })),
      };
    }

    // Xử lý genres nếu được cung cấp
    if (genreIds) {
      const genreIdsArray = Array.isArray(genreIds)
        ? genreIds
        : genreIds.split(',').map((id: string) => id.trim());

      updateData.genres = {
        deleteMany: {},
        create: genreIdsArray.map((genreId: string) => ({
          genreId,
        })),
      };
    }

    // Cập nhật track
    const updatedTrack = await prisma.track.update({
      where: { id },
      data: updateData,
      select: trackSelect,
    });

    // Xóa cache
    await clearCacheForEntity('track', {
      userId: track.artistId,
      adminId: user.role === Role.ADMIN ? user.id : undefined,
      entityId: id,
      clearSearch: true,
    });

    res.json({
      message: 'Track updated successfully',
      track: updatedTrack,
    });
  } catch (error) {
    console.error('Update track error:', error);
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

    // Kiểm tra xem user có tồn tại không
    if (!user) {
      res.status(401).json({ message: 'Unauthorized: User not found' });
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
      res.status(403).json({
        message: 'You can only delete your own tracks',
        code: 'NOT_TRACK_OWNER',
      });
      return;
    }

    // Hard delete track
    await prisma.track.delete({
      where: { id },
    });

    // Xóa cache của route GET all tracks, cache tìm kiếm và cache của track cụ thể
    await clearCacheForEntity('track', {
      userId: track.artistId,
      adminId: user.role === Role.ADMIN ? user.id : undefined,
      entityId: id,
      clearSearch: true,
    });

    res.json({ message: 'Track deleted successfully' });
  } catch (error) {
    console.error('Delete track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Ẩn track (ADMIN & ARTIST only)
export const toggleTrackVisibility = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Kiểm tra xem user có tồn tại không
    if (!user) {
      res.status(401).json({ message: 'Unauthorized: User not found' });
      return;
    }

    const track = await prisma.track.findUnique({
      where: { id },
      select: { artistId: true, isActive: true },
    });

    if (!track) {
      res.status(404).json({ message: 'Track not found' });
      return;
    }

    // Kiểm tra quyền sở hữu track
    if (!canManageTrack(user, track.artistId)) {
      res.status(403).json({
        message: 'You can only toggle visibility of your own tracks',
        code: 'NOT_TRACK_OWNER',
      });
      return;
    }

    const updatedTrack = await prisma.track.update({
      where: { id },
      data: { isActive: !track.isActive },
      select: trackSelect,
    });

    // Clear toàn bộ cache liên quan đến track và search
    await clearCacheForEntity('track', {
      entityId: id,
      clearSearch: true,
    });

    res.json({
      message: `Track ${
        updatedTrack.isActive ? 'activated' : 'hidden'
      } successfully`,
      track: updatedTrack,
    });
  } catch (error) {
    console.error('Toggle track visibility error:', error);
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

    // Điều kiện tìm kiếm
    const searchConditions: Prisma.TrackWhereInput[] = [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      {
        artist: { artistName: { contains: searchQuery, mode: 'insensitive' } },
      },
      {
        featuredArtists: {
          some: {
            artistProfile: {
              artistName: { contains: searchQuery, mode: 'insensitive' },
            },
          },
        },
      },
    ];

    // Điều kiện isActive
    const isActiveCondition: Prisma.TrackWhereInput = !user?.artistProfile?.id
      ? { isActive: true }
      : {
          OR: [
            { isActive: true },
            { AND: [{ isActive: false }, { artistId: user.artistProfile.id }] },
          ],
        };

    const whereClause: Prisma.TrackWhereInput = {
      AND: [{ isActive: true }, { artist: { isActive: true } }],
    };

    const tracks = await prisma.track.findMany({
      where: whereClause,
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
    let { page = 1, limit = 10 } = req.query;
    const user = req.user;

    // Validate pagination
    page = Math.max(1, parseInt(page as string));
    limit = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (page - 1) * limit;

    if (!Object.values(AlbumType).includes(type as AlbumType)) {
      res.status(400).json({ message: 'Invalid track type' });
      return;
    }

    // Xây dựng điều kiện where
    const whereClause: Prisma.TrackWhereInput = {
      type: type as AlbumType,
    };

    // Thêm điều kiện isActive và quyền sở hữu
    if (!user || !user.artistProfile?.id) {
      whereClause.isActive = true; // Public chỉ thấy track active
    } else {
      whereClause.OR = [
        { isActive: true }, // Track active của mọi người
        {
          AND: [
            { isActive: false }, // Track inactive
            { artistId: user.artistProfile.id }, // Của chính nghệ sĩ
          ],
        },
      ];
    }

    const tracks = await prisma.track.findMany({
      where: whereClause,
      select: trackSelect,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: Number(limit),
    });

    const totalTracks = await prisma.track.count({ where: whereClause });

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

    // Kiểm tra xác thực
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Kiểm tra quyền truy cập
    if (
      user.role !== Role.ADMIN &&
      (!user.artistProfile?.isVerified ||
        user.artistProfile?.role !== Role.ARTIST)
    ) {
      res.status(403).json({
        message:
          'Forbidden: Only admins or verified artists can access this resource',
      });
      return;
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Tạo điều kiện whereClause
    const whereClause: Prisma.TrackWhereInput = {};

    // Nếu là ARTIST, chỉ lấy track của chính họ
    if (user.role !== Role.ADMIN && user.artistProfile?.id) {
      whereClause.artistId = user.artistProfile.id;
    }

    const tracks = await prisma.track.findMany({
      skip: offset,
      take: Number(limit),
      where: whereClause,
      select: trackSelect,
      orderBy: { createdAt: 'desc' },
    });

    const totalTracks = await prisma.track.count({
      where: whereClause,
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
    const user = req.user;
    const offset = (Number(page) - 1) * Number(limit);

    // Kiểm tra xem genreId có tồn tại không
    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
    });

    if (!genre) {
      res.status(404).json({ message: 'Genre not found' });
      return;
    }

    // Xây dựng điều kiện where
    const whereClause: Prisma.TrackWhereInput = {
      genres: {
        some: {
          genreId: genreId, // Chỉ lấy các track có chứa genreId này
        },
      },
    };

    // Thêm điều kiện isActive và quyền sở hữu
    if (!user || !user.artistProfile?.id) {
      whereClause.isActive = true; // Public chỉ thấy track active
    } else {
      whereClause.OR = [
        { isActive: true }, // Track active của mọi người
        {
          AND: [
            { isActive: false }, // Track inactive
            { artistId: user.artistProfile.id }, // Của chính nghệ sĩ
          ],
        },
      ];
    }

    // Lấy danh sách tracks với phân trang
    const tracks = await prisma.track.findMany({
      where: whereClause,
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
      where: whereClause,
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
    const user = req.user;
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

    // Xây dựng điều kiện where
    const whereClause: Prisma.TrackWhereInput = {
      type: type as AlbumType,
      genres: {
        some: {
          genreId: genreId, // Chỉ lấy các track có chứa genreId này
        },
      },
    };

    // Thêm điều kiện isActive và quyền sở hữu
    if (!user || !user.artistProfile?.id) {
      whereClause.isActive = true; // Public chỉ thấy track active
    } else {
      whereClause.OR = [
        { isActive: true }, // Track active của mọi người
        {
          AND: [
            { isActive: false }, // Track inactive
            { artistId: user.artistProfile.id }, // Của chính nghệ sĩ
          ],
        },
      ];
    }

    // Lấy danh sách tracks với phân trang
    const tracks = await prisma.track.findMany({
      where: whereClause,
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
      where: whereClause,
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
    const user = req.user;
    const sessionId = req.header('Session-ID');

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (
      !sessionId ||
      !(await sessionService.validateSession(user.id, sessionId))
    ) {
      res.status(401).json({ message: 'Invalid or expired session' });
      return;
    }

    await sessionService.handleAudioPlay(user.id, sessionId);

    const track = await prisma.track.findFirst({
      where: {
        id: trackId,
        isActive: true,
        OR: [{ album: null }, { album: { isActive: true } }],
      },
      select: trackSelect,
    });

    if (!track) {
      res.status(404).json({ message: 'Track not found' });
      return;
    }

    // Logic tính monthly listeners
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const existingListen = await prisma.history.findFirst({
      where: {
        userId: user.id,
        track: { artistId: track.artistId },
        createdAt: { gte: lastMonth },
      },
    });

    if (!existingListen) {
      await prisma.artistProfile.update({
        where: { id: track.artistId },
        data: { monthlyListeners: { increment: 1 } },
      });
    }

    // Lưu lịch sử phát nhạc
    await prisma.history.upsert({
      where: {
        userId_trackId_type: {
          userId: user.id,
          trackId: track.id,
          type: 'PLAY',
        },
      },
      update: {
        playCount: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        type: 'PLAY',
        trackId: track.id,
        userId: user.id,
        duration: track.duration,
        completed: true,
        playCount: 1,
      },
    });

    res.json({
      message: 'Track playback started',
      track: track,
    });
  } catch (error) {
    console.error('Play track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
