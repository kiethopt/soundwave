import { Request, Response } from 'express';
import prisma from '../config/db';
import {
  uploadFile,
  CloudinaryUploadResult,
} from '../services/cloudinary.service';
import { Role, AlbumType, Prisma, HistoryType } from '@prisma/client';
import { sessionService } from '../services/session.service';
import { albumSelect, trackSelect } from '../utils/prisma-selects';

// Function để kiểm tra quyền
const canManageAlbum = (user: any, albumArtistId: string): boolean => {
  if (!user) return false;

  // ADMIN luôn có quyền
  if (user.role === Role.ADMIN) return true;

  // Kiểm tra user có artistProfile đã verify và có role ARTIST không
  return (
    user.artistProfile?.isVerified &&
    user.artistProfile?.role === Role.ARTIST &&
    user.artistProfile?.id === albumArtistId
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
  const maxFileNameLength = 100;

  if (file.size > maxSize) {
    return 'File size too large. Maximum allowed size is 5MB.';
  }

  if (!allowedTypes.includes(file.mimetype)) {
    return `Invalid file type. Only ${allowedTypes.join(', ')} are allowed.`;
  }

  if (file.originalname.length > maxFileNameLength) {
    return `File name too long. Maximum allowed length is ${maxFileNameLength} characters.`;
  }

  const invalidChars = /[<>:"/\\|?*]/g;
  if (invalidChars.test(file.originalname)) {
    return 'File name contains invalid characters.';
  }

  return null;
};

// Tạo album mới (ADMIN & ARTIST only)
export const createAlbum = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const {
      title,
      releaseDate,
      type = AlbumType.ALBUM,
      genres = [],
      artistId, // ID của artist profile mà admin muốn tạo album cho
    } = req.body;
    const coverFile = req.file;

    // Validate input data
    const validationError = validateAlbumData({ title, releaseDate, type });
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    if (coverFile) {
      const fileValidationError = validateFile(coverFile);
      if (fileValidationError) {
        res.status(400).json({ message: fileValidationError });
        return;
      }
    }

    // Xác định artist profile ID
    let targetArtistProfileId: string;
    let targetArtist: any;

    if (user.role === Role.ADMIN && artistId) {
      // Nếu là admin và có artistId, tìm artist profile tương ứng
      targetArtist = await prisma.artistProfile.findFirst({
        where: {
          id: artistId,
          isVerified: true,
          role: Role.ARTIST,
        },
        include: {
          user: true,
        },
      });

      if (!targetArtist) {
        res
          .status(404)
          .json({ message: 'Artist profile not found or not verified' });
        return;
      }

      targetArtistProfileId = targetArtist.id;
    } else if (
      user.artistProfile?.isVerified &&
      user.artistProfile.role === Role.ARTIST
    ) {
      // Nếu là artist đã verify
      targetArtistProfileId = user.artistProfile.id;
      targetArtist = {
        user: user,
      };
    } else {
      res.status(403).json({ message: 'Not authorized to create albums' });
      return;
    }

    // Validate genres
    const genreIds = Array.isArray(genres)
      ? genres
      : genres.split(',').map((g: string) => g.trim());

    const existingGenres = await prisma.genre.findMany({
      where: { id: { in: genreIds } },
    });

    if (existingGenres.length !== genreIds.length) {
      res.status(400).json({ message: 'One or more genres do not exist' });
      return;
    }

    // Upload cover image if provided
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
        duration: 0,
        totalTracks: 0,
        artistId: targetArtistProfileId,
        genres: {
          create: genreIds.map((genreId: string) => ({
            genre: { connect: { id: genreId } },
          })),
        },
      },
      select: albumSelect,
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

    if (!user) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: {
        artistId: true,
        type: true,
        coverUrl: true,
        isActive: true,
        tracks: {
          select: { trackNumber: true },
        },
      },
    });

    if (!album) {
      res.status(404).json({ message: 'Album not found' });
      return;
    }

    // Kiểm tra quyền thông qua artistProfile
    if (
      user.role !== Role.ADMIN &&
      (!user.artistProfile?.isVerified ||
        user.artistProfile.role !== Role.ARTIST ||
        user.artistProfile.id !== album.artistId)
    ) {
      res.status(403).json({
        message: 'You can only add tracks to your own albums',
      });
      return;
    }

    if (!req.files || !Array.isArray(req.files)) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || !files.length) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    // Lấy track number lớn nhất hiện tại
    const existingTracks = await prisma.track.findMany({
      where: { albumId },
      select: { trackNumber: true },
    });

    // Đảm bảo trackNumber không null khi tính toán max
    const maxTrackNumber =
      existingTracks.length > 0
        ? Math.max(...existingTracks.map((t) => t.trackNumber || 0))
        : 0;

    const titles = Array.isArray(req.body.title)
      ? req.body.title
      : [req.body.title];
    const releaseDates = Array.isArray(req.body.releaseDate)
      ? req.body.releaseDate
      : [req.body.releaseDate];
    const featuredArtists = Array.isArray(req.body.featuredArtists)
      ? req.body.featuredArtists.map((artists: string) => artists.split(','))
      : req.body.featuredArtists
      ? [req.body.featuredArtists.split(',')]
      : [];

    const mm = await import('music-metadata');

    const createdTracks = await Promise.all(
      files.map(async (file, index) => {
        try {
          const metadata = await mm.parseBuffer(file.buffer);
          const duration = Math.floor(metadata.format.duration || 0);

          const uploadResult = await uploadFile(file.buffer, 'tracks', 'auto');

          // Kiểm tra xem track đã tồn tại chưa
          const existingTrack = await prisma.track.findFirst({
            where: {
              title: titles[index],
              artistId: album.artistId,
            },
          });

          if (existingTrack) {
            throw new Error(
              `Track with title "${titles[index]}" already exists for this artist.`
            );
          }

          // Tự động tạo track number mới, đảm bảo không null
          const newTrackNumber = maxTrackNumber + index + 1;

          const track = await prisma.track.create({
            data: {
              title: titles[index],
              duration,
              releaseDate: new Date(releaseDates[index] || Date.now()),
              trackNumber: newTrackNumber,
              coverUrl: album.coverUrl,
              audioUrl: uploadResult.secure_url,
              artistId: album.artistId,
              albumId,
              type: album.type,
              isActive: album.isActive, // Trigger cập nhật isActive của track dựa trên album
              ...(featuredArtists[index]?.length && {
                featuredArtists: {
                  create: featuredArtists[index].map(
                    (artistProfileId: string) => ({
                      artistProfile: {
                        connect: { id: artistProfileId.trim() },
                      },
                    })
                  ),
                },
              }),
            },
            select: trackSelect,
          });

          return track;
        } catch (err) {
          console.error('Error processing track:', err);
          throw err;
        }
      })
    );

    // Cập nhật tổng thời lượng và số lượng track của album
    const tracks = await prisma.track.findMany({
      where: { albumId },
      select: { duration: true },
    });

    const totalDuration = tracks.reduce(
      (sum, track) => sum + (track.duration || 0),
      0
    );

    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        duration: totalDuration,
        totalTracks: tracks.length,
      },
      select: albumSelect,
    });

    res.status(201).json({
      message: 'Tracks added to album successfully',
      album: updatedAlbum,
      tracks: createdTracks,
    });
  } catch (error) {
    console.error('Add tracks to album error:', error);
    if (error instanceof Error) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
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

    if (!user) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

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

    // Chỉ validate các trường được gửi lên
    if (title || releaseDate || type) {
      const validationError = validateAlbumData({
        title: title || '',
        releaseDate: releaseDate || new Date(),
        type: type || undefined,
      });
      if (validationError) {
        res.status(400).json({ message: validationError });
        return;
      }
    }

    if (coverFile) {
      const fileValidationError = validateFile(coverFile);
      if (fileValidationError) {
        res.status(400).json({ message: fileValidationError });
        return;
      }
    }

    let coverUrl: string | undefined;
    if (coverFile) {
      const coverUpload: CloudinaryUploadResult = await uploadFile(
        coverFile.buffer,
        'covers',
        'image'
      );
      coverUrl = coverUpload.secure_url;
    }

    // Xây dựng object data chỉ với các trường được cập nhật
    const updateData: any = {};

    if (title) updateData.title = title;
    if (releaseDate) updateData.releaseDate = new Date(releaseDate);
    if (type) {
      updateData.type = type;
      updateData.tracks = {
        updateMany: {
          where: { albumId: id },
          data: { type },
        },
      };
    }
    if (coverUrl) updateData.coverUrl = coverUrl;

    // Chỉ cập nhật genres nếu được gửi lên
    if (genres) {
      const genreIds = Array.isArray(genres)
        ? genres
        : genres.split(',').map((g: string) => g.trim());

      if (genreIds.length > 0) {
        const existingGenres = await prisma.genre.findMany({
          where: { id: { in: genreIds } },
        });

        if (existingGenres.length !== genreIds.length) {
          res.status(400).json({ message: 'One or more genres do not exist' });
          return;
        }

        // Xóa genres cũ và thêm genres mới
        await prisma.albumGenre.deleteMany({
          where: { albumId: id },
        });

        updateData.genres = {
          create: genreIds.map((genreId: string) => ({
            genre: { connect: { id: genreId } },
          })),
        };
      }
    }

    const updatedAlbum = await prisma.album.update({
      where: { id },
      data: updateData,
      select: albumSelect,
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

    if (!user) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

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

    await prisma.album.delete({
      where: { id },
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

    if (!user) {
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
export const searchAlbum = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
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

    // Xây dựng điều kiện where
    const whereClause: Prisma.AlbumWhereInput = {
      OR: [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        {
          artist: {
            artistName: { contains: searchQuery, mode: 'insensitive' },
          },
        },
      ],
    };

    // Thêm điều kiện lọc theo artist nếu người dùng là artist
    if (user?.currentProfile === 'ARTIST' && user?.artistProfile?.id) {
      whereClause.artistId = user.artistProfile.id;
    }

    // Thêm điều kiện isActive và quyền sở hữu
    if (!user || user.role !== Role.ADMIN) {
      if (
        user?.artistProfile?.isVerified &&
        user?.currentProfile === 'ARTIST'
      ) {
        whereClause.OR = [
          { isActive: true },
          { AND: [{ isActive: false }, { artistId: user.artistProfile.id }] },
        ];
      } else {
        whereClause.isActive = true;
      }
    }

    const [albums, total] = await Promise.all([
      prisma.album.findMany({
        where: whereClause,
        skip: offset,
        take: Number(limit),
        select: albumSelect,
      }),
      prisma.album.count({ where: whereClause }),
    ]);

    res.json({
      albums,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Search album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách tất cả album (ADMIN & ARTIST only)
export const getAllAlbums = async (req: Request) => {
  const user = req.user;
  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Kiểm tra quyền xem danh sách album
  if (
    user.role !== Role.ADMIN &&
    (!user.artistProfile?.isVerified || user.artistProfile.role !== Role.ARTIST)
  ) {
    throw new Error('Only verified artists and admins can view all albums');
  }

  const whereClause: Prisma.AlbumWhereInput = {};
  if (user.role !== Role.ADMIN && user.artistProfile?.id) {
    whereClause.OR = [
      { artistId: user.artistProfile.id },
      {
        tracks: {
          some: {
            featuredArtists: {
              some: { artistProfileId: user.artistProfile.id },
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
    prisma.album.count({ where: whereClause }),
  ]);

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

  const album = await prisma.album.findUnique({
    where: { id },
    select: albumSelect,
  });

  if (!album) {
    throw new Error('Album not found');
  }

  if (!album.isActive) {
    const canManage = canManageAlbum(user, album.artist.id);
    if (!canManage) {
      throw new Error('Album not found');
    }
  }

  return album;
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

    if (
      !sessionId ||
      !(await sessionService.validateSession(user.id, sessionId))
    ) {
      res.status(401).json({ message: 'Invalid or expired session' });
      return;
    }

    await sessionService.handleAudioPlay(user.id, sessionId);

    // Lấy album và track đầu tiên
    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        isActive: true,
      },
      include: {
        tracks: {
          where: { isActive: true },
          orderBy: { trackNumber: 'asc' },
          take: 1,
          select: trackSelect,
        },
      },
    });

    if (!album || album.tracks.length === 0) {
      res.status(404).json({ message: 'Album or tracks not found' });
      return;
    }

    const firstTrack = album.tracks[0];

    // Logic tính monthly listeners
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const existingListen = await prisma.history.findFirst({
      where: {
        userId: user.id,
        track: { artistId: firstTrack.artistId },
        createdAt: { gte: lastMonth },
      },
    });

    if (!existingListen) {
      await prisma.artistProfile.update({
        where: { id: firstTrack.artistId },
        data: { monthlyListeners: { increment: 1 } },
      });
    }

    // Sử dụng upsert thay vì createMany
    await prisma.history.upsert({
      where: {
        userId_trackId_type: {
          userId: user.id,
          trackId: firstTrack.id,
          type: 'PLAY',
        },
      },
      update: {
        playCount: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        type: 'PLAY',
        trackId: firstTrack.id,
        userId: user.id,
        duration: firstTrack.duration,
        completed: true,
        playCount: 1,
      },
    });

    res.json({
      message: 'Album playback started',
      track: firstTrack,
    });
  } catch (error) {
    console.error('Play album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
