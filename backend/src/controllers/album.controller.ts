import { Request, Response } from 'express';
import {
  clearCacheForEntity,
  client,
  setCache,
} from '../middleware/cache.middleware';
import prisma from '../config/db';
import {
  uploadFile,
  CloudinaryUploadResult,
} from '../services/cloudinary.service';
import { Role, AlbumType, Prisma } from '@prisma/client';
import { sessionService } from 'src/services/session.service';
import { albumSelect } from 'src/utils/prisma-selects';

// Function để kiểm tra quyền
const canManageAlbum = (user: any, albumArtistId: string) => {
  return (
    user.role === Role.ADMIN ||
    (user.role === Role.ARTIST && user.artistProfile?.id === albumArtistId)
  );
};

// Validation functions
const validateAlbumData = (data: any): string | null => {
  const { title, releaseDate, type } = data;

  if (!title?.trim()) return 'Title is required';
  if (!releaseDate || isNaN(Date.parse(releaseDate)))
    return 'Valid release date is required';
  if (type && !Object.values(AlbumType).includes(type))
    return 'Invalid album type';

  return null;
};

// Validation functions cho
const validateFile = (file: Express.Multer.File): string | null => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  const maxFileNameLength = 100; // Giới hạn độ dài tên file

  // Kiểm tra kích thước file
  if (file.size > maxSize) {
    return 'File size too large. Maximum allowed size is 5MB.';
  }

  // Kiểm tra loại file
  if (!allowedTypes.includes(file.mimetype)) {
    return `Invalid file type. Only ${allowedTypes.join(', ')} are allowed.`;
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

// Tạo album mới (ADMIN & ARTIST only)
export const createAlbum = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    // Kiểm tra xem user có tồn tại và có quyền tạo album không
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
            id: true,
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
      releaseDate,
      type = AlbumType.ALBUM,
      genres = [],
      artistId, // Lấy artistId từ request body (chỉ dành cho ADMIN)
    } = req.body;
    const coverFile = req.file;

    // Validation
    const validationError = validateAlbumData({ title, releaseDate, type });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    // Kiểm tra file upload (nếu có)
    if (coverFile) {
      const fileValidationError = validateFile(coverFile);
      if (fileValidationError) {
        res.status(400).json({ message: fileValidationError });
        return;
      }
    }

    // Nếu là ADMIN, kiểm tra artistId có hợp lệ không
    let finalArtistId = fullUserInfo.artistProfile?.id;
    let targetUserId = user.id; // ID của user cần xóa cache

    if (user.role === Role.ADMIN && artistId) {
      // Kiểm tra xem artistId có tồn tại và có vai trò là ARTIST không
      const artist = await prisma.user.findUnique({
        where: { id: artistId },
        select: {
          id: true,
          role: true,
          artistProfile: {
            select: {
              id: true,
              isVerified: true,
            },
          },
        },
      });

      if (
        !artist ||
        artist.role !== Role.ARTIST ||
        !artist.artistProfile?.isVerified
      ) {
        res.status(400).json({ message: 'Invalid artist ID' });
        return;
      }

      finalArtistId = artist.artistProfile.id;
      targetUserId = artistId; // Cập nhật targetUserId để xóa cache của artist được chỉ định
    }

    if (!finalArtistId) {
      res.status(400).json({ message: 'Artist profile not found' });
      return;
    }

    // Chuyển đổi genres từ chuỗi sang mảng nếu cần
    const genreIds = Array.isArray(genres)
      ? genres
      : genres.split(',').map((g: string) => g.trim());

    // Kiểm tra xem tất cả các genreId có tồn tại không
    const existingGenres = await prisma.genre.findMany({
      where: { id: { in: genreIds } },
    });

    if (existingGenres.length !== genreIds.length) {
      res.status(400).json({ message: 'One or more genres do not exist' });
      return;
    }

    // Upload cover if provided
    let coverUrl: string | null = null;
    if (coverFile) {
      const coverUpload: CloudinaryUploadResult = await uploadFile(
        coverFile.buffer,
        'covers',
        'image'
      );
      coverUrl = coverUpload.secure_url;
    }

    // Create album
    const album = await prisma.album.create({
      data: {
        title,
        coverUrl,
        releaseDate: new Date(releaseDate),
        type,
        duration: 0, // Khởi tạo duration là 0
        totalTracks: 0, // Khởi tạo totalTracks là 0
        artistId: finalArtistId,
        genres: {
          create: genreIds.map((genreId: string) => ({
            genre: { connect: { id: genreId } },
          })),
        },
      },
      select: albumSelect,
    });

    // Xóa cache liên quan
    await clearCacheForEntity('album', {
      userId: targetUserId,
      adminId: user.role === Role.ADMIN ? user.id : undefined,
      clearSearch: true,
    });

    res.status(201).json({
      message: 'Album created successfully',
      album,
    });
  } catch (error) {
    console.error('Create album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Thêm track vào album (ADMIN & ARTIST only)
export const addTracksToAlbum = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { albumId } = req.params;

    if (!user || (user.role !== Role.ADMIN && user.role !== Role.ARTIST)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: { artistId: true, type: true, coverUrl: true },
    });

    if (!album) {
      res.status(404).json({ message: 'Album not found' });
      return;
    }

    if (!canManageAlbum(user, album.artistId)) {
      res
        .status(403)
        .json({ message: 'You can only add tracks to your own albums' });
      return;
    }

    if (!req.files || !Array.isArray(req.files)) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const { title, releaseDate, trackNumber, featuredArtists } = req.body;

    const tracksData = [
      {
        title,
        releaseDate,
        trackNumber: parseInt(trackNumber, 10),
        featuredArtists: featuredArtists ? featuredArtists.split(',') : [],
      },
    ];

    const mm = await import('music-metadata');

    const createdTracks = await Promise.all(
      files.map(async (file, index) => {
        const trackDetails = tracksData[index];

        try {
          const metadata = await mm.parseBuffer(file.buffer);
          const duration = Math.floor(metadata.format.duration || 0);

          const uploadResult = await uploadFile(file.buffer, 'tracks', 'auto');

          return prisma.track.create({
            data: {
              title: trackDetails.title,
              duration,
              releaseDate: new Date(trackDetails.releaseDate || Date.now()),
              trackNumber: trackDetails.trackNumber,
              coverUrl: album.coverUrl,
              audioUrl: uploadResult.secure_url,
              artistId: album.artistId,
              albumId: albumId,
              type: album.type,
              featuredArtists:
                trackDetails.featuredArtists?.length > 0
                  ? {
                      create: trackDetails.featuredArtists.map(
                        (artistProfileId: string) => ({
                          artistProfileId,
                        })
                      ),
                    }
                  : undefined,
            },
          });
        } catch (err) {
          console.error('Error processing track:', err);
          throw err;
        }
      })
    );

    // Tính toán lại tổng duration của album
    const tracks = await prisma.track.findMany({
      where: { albumId },
      select: { duration: true },
    });

    const totalDuration = tracks.reduce(
      (sum, track) => sum + (track.duration || 0),
      0
    );

    // Cập nhật duration của album
    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        duration: totalDuration,
      },
      select: albumSelect,
    });

    await clearCacheForEntity('album', {
      userId: album.artistId,
      adminId: user.role === Role.ADMIN ? user.id : undefined,
      entityId: albumId,
      clearSearch: true,
    });

    res.status(201).json({
      message: 'Tracks added to album successfully',
      album: updatedAlbum,
      tracks: createdTracks,
    });
  } catch (error) {
    console.error('Add tracks to album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cập nhật album (ADMIN & ARTIST only)
export const updateAlbum = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, releaseDate, type, genres } = req.body;
    const coverFile = req.file;
    const user = req.user;

    if (!user || (user.role !== Role.ADMIN && user.role !== Role.ARTIST)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Kiểm tra quyền
    const album = await prisma.album.findUnique({
      where: { id },
      select: { artistId: true, coverUrl: true },
    });

    if (!album) {
      res.status(404).json({ message: 'Album not found' });
      return;
    }

    if (!canManageAlbum(user, album.artistId)) {
      res.status(403).json({ message: 'You can only update your own albums' });
      return;
    }

    // Validation
    const validationError = validateAlbumData({ title, releaseDate, type });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    // Chuyển đổi genres từ chuỗi sang mảng nếu cần
    const genreIds = genres
      ? Array.isArray(genres)
        ? genres
        : genres.split(',').map((g: string) => g.trim())
      : [];

    // Kiểm tra xem tất cả các genreId có tồn tại không
    if (genreIds.length > 0) {
      const existingGenres = await prisma.genre.findMany({
        where: { id: { in: genreIds } },
      });

      if (existingGenres.length !== genreIds.length) {
        res.status(400).json({ message: 'One or more genres do not exist' });
        return;
      }
    }

    // Upload cover if provided
    let coverUrl: string | undefined;
    if (coverFile) {
      const coverUpload: CloudinaryUploadResult = await uploadFile(
        coverFile.buffer,
        'covers',
        'image'
      );
      coverUrl = coverUpload.secure_url;
    }

    // Xóa các genres cũ và thêm genres mới
    await prisma.albumGenre.deleteMany({
      where: { albumId: id },
    });

    const updatedAlbum = await prisma.album.update({
      where: { id },
      data: {
        title,
        releaseDate: new Date(releaseDate),
        type,
        ...(coverUrl && { coverUrl }),
        genres: {
          create: genreIds.map((genreId: string) => ({
            genre: { connect: { id: genreId } },
          })),
        },
        // Cập nhật type cho tất cả tracks
        tracks: {
          updateMany: {
            where: { albumId: id },
            data: { type },
          },
        },
      },
      select: albumSelect,
    });

    // Xóa cache liên quan
    await clearCacheForEntity('album', {
      userId: album.artistId,
      adminId: user.role === Role.ADMIN ? user.id : undefined,
      entityId: id,
      clearSearch: true,
    });

    res.json({
      message: 'Album updated successfully',
      album: updatedAlbum,
    });
  } catch (error) {
    console.error('Update album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa album (ADMIN & ARTIST only)
export const deleteAlbum = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user || (user.role !== Role.ADMIN && user.role !== Role.ARTIST)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    // Kiểm tra quyền
    const album = await prisma.album.findUnique({
      where: { id },
      select: { artistId: true },
    });

    if (!album) {
      res.status(404).json({ message: 'Album not found' });
      return;
    }

    if (!canManageAlbum(user, album.artistId)) {
      res.status(403).json({ message: 'You can only delete your own albums' });
      return;
    }

    // Hard delete album
    await prisma.album.delete({
      where: { id },
    });

    // Xóa cache liên quan
    await clearCacheForEntity('album', {
      userId: album.artistId,
      adminId: user.role === Role.ADMIN ? user.id : undefined,
      entityId: id,
      clearSearch: true,
    });

    res.json({ message: 'Album deleted successfully' });
  } catch (error) {
    console.error('Delete album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Ẩn album (ADMIN & ARTIST only)
export const toggleAlbumVisibility = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user || (user.role !== Role.ADMIN && user.role !== Role.ARTIST)) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const album = await prisma.album.findUnique({
      where: { id },
      select: { artistId: true, isActive: true },
    });

    if (!album) {
      res.status(404).json({ message: 'Album not found' });
      return;
    }

    if (!canManageAlbum(user, album.artistId)) {
      res.status(403).json({ message: 'You can only toggle your own albums' });
      return;
    }

    const updatedAlbum = await prisma.album.update({
      where: { id },
      data: { isActive: !album.isActive },
      select: albumSelect,
    });

    // Clear toàn bộ cache liên quan
    await clearCacheForEntity('album', {
      entityId: id,
      clearSearch: true,
    });

    res.json({
      message: `Album ${
        updatedAlbum.isActive ? 'activated' : 'hidden'
      } successfully`,
      album: updatedAlbum,
    });
  } catch (error) {
    console.error('Toggle album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Tìm kiếm album
export const searchAlbum = async (req: Request) => {
  const { q } = req.query;

  if (!q) {
    throw new Error('Query is required');
  }

  const albums = await prisma.album.findMany({
    where: {
      isActive: true,
      OR: [
        { title: { contains: String(q), mode: 'insensitive' } },
        {
          artist: {
            artistName: {
              contains: String(q),
              mode: 'insensitive',
            },
          },
        },
      ],
    },
    select: {
      ...albumSelect,
      totalTracks: true,
    },
  });

  return albums;
};

// Lấy danh sách tất cả album (ADMIN & ARTIST only)
export const getAllAlbums = async (req: Request) => {
  const user = req.user;

  if (!user) {
    throw new Error('Unauthorized');
  }

  if (user.role !== Role.ADMIN && user.role !== Role.ARTIST) {
    throw new Error('Forbidden');
  }

  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  // Tạo cache key dựa trên user.id và query params
  const cacheKey = `/api/albums?userId=${user.id}&page=${page}&limit=${limit}`;

  // Tạo điều kiện whereClause
  const whereClause: Prisma.AlbumWhereInput = {};

  // Nếu là ARTIST, chỉ lấy album của chính họ
  if (user.role === Role.ARTIST && user.artistProfile?.id) {
    whereClause.OR = [
      { artistId: user.artistProfile.id },
      {
        tracks: {
          some: {
            featuredArtists: {
              some: {
                artistProfileId: user.artistProfile.id,
              },
            },
          },
        },
      },
    ];
  }

  const [albums, totalAlbums] = await Promise.all([
    prisma.album.findMany({
      skip: offset,
      take: Number(limit),
      where: whereClause,
      select: albumSelect,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.album.count({
      where: whereClause,
    }),
  ]);

  // Xóa cache cũ và set cache mới với dữ liệu gốc
  await client.del(cacheKey);
  await setCache(cacheKey, {
    albums,
    pagination: {
      total: totalAlbums,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalAlbums / Number(limit)),
    },
  });

  return {
    albums,
    pagination: {
      total: totalAlbums,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalAlbums / Number(limit)),
    },
  };
};

// Get album theo ID
export const getAlbumById = async (req: Request) => {
  const { id } = req.params;
  const user = req.user;

  // Lấy thông tin cơ bản của album để kiểm tra quyền
  const album = await prisma.album.findUnique({
    where: { id },
    select: {
      ...albumSelect,
      artistId: true,
    },
  });

  if (!album) {
    throw new Error('Album not found');
  }

  // Kiểm tra quyền xem album ẩn
  if (!album.isActive) {
    if (!user) {
      throw new Error('Album not found');
    }

    const canView =
      user.role === Role.ADMIN ||
      (user.role === Role.ARTIST && user.artistProfile?.id === album.artistId);

    if (!canView) {
      throw new Error('Album not found');
    }
  }

  // Xác định xem user có quyền xem track ẩn không
  const canViewInactiveTracks =
    user?.role === Role.ADMIN ||
    (user?.role === Role.ARTIST && user.artistProfile?.id === album.artistId);

  // Lấy toàn bộ thông tin album với các track phù hợp
  const fullAlbum = await prisma.album.findUnique({
    where: { id },
    select: {
      ...albumSelect,
      tracks: {
        where: canViewInactiveTracks ? undefined : { isActive: true },
        orderBy: { trackNumber: 'asc' },
        select: albumSelect.tracks.select,
      },
    },
  });

  if (!fullAlbum) {
    throw new Error('Album not found');
  }

  return fullAlbum;
};

// Nghe album
export const playAlbum = async (req: Request, res: Response): Promise<void> => {
  try {
    const { albumId } = req.params;
    const user = req.user;
    const sessionId = req.header('Session-ID');

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Kiểm tra session
    if (
      !sessionId ||
      !(await sessionService.validateSession(user.id, sessionId))
    ) {
      res.status(401).json({ message: 'Session expired or invalid' });
      return;
    }

    // Gửi thông báo dừng phát nhạc đến các session khác
    await sessionService.handleAudioPlay(user.id, sessionId);

    // Kiểm tra album và tracks
    const album = await prisma.album.findUnique({
      where: {
        id: albumId,
        isActive: true,
      },
      select: {
        id: true,
        tracks: {
          where: { isActive: true },
          orderBy: { trackNumber: 'asc' },
          select: {
            id: true,
            title: true,
            duration: true,
            audioUrl: true,
            artist: {
              select: {
                id: true,
                artistName: true,
              },
            },
          },
        },
      },
    });

    if (!album || !album.tracks.length) {
      res.status(404).json({ message: 'Album or tracks not found' });
      return;
    }

    // Lấy bài hát đầu tiên trong album
    const firstTrack = album.tracks[0];

    // Kiểm tra xem URL âm thanh có hợp lệ không
    if (!firstTrack.audioUrl || !firstTrack.audioUrl.startsWith('http')) {
      res.status(400).json({ message: 'Invalid audio URL' });
      return;
    }

    // Cache response
    const cacheKey = `/api/albums/${albumId}/play`;
    const responseData = {
      message: 'Album played successfully',
      track: firstTrack,
      album,
    };
    await setCache(cacheKey, responseData);

    // Trả về JSON response
    res.json(responseData);
  } catch (error) {
    console.error('Play album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
