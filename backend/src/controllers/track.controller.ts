import { Request, Response } from 'express';
import prisma from '../config/db';
import { uploadFile } from '../services/cloudinary.service';
import { AlbumType, Role, Prisma } from '@prisma/client';
import { client, setCache } from '../middleware/cache.middleware';
import { sessionService } from '../services/session.service';
import { trackSelect } from '../utils/prisma-selects';
import { NotificationType, RecipientType } from '@prisma/client';
import pusher from '../config/pusher';

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

// Tạo track mới (ADMIN & ARTIST only)
export const createTrack = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
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
      artistId,
      genreIds,
    } = req.body;

    const finalArtistId =
      user.role === 'ADMIN' ? artistId : user.artistProfile?.id;
    if (!finalArtistId) {
      res.status(400).json({
        message:
          user.role === 'ADMIN'
            ? 'Artist ID is required'
            : 'Only verified artists can create tracks',
      });
      return;
    }

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

    const audioUpload = await uploadFile(audioFile.buffer, 'tracks', 'auto');
    const coverUrl = coverFile
      ? (await uploadFile(coverFile.buffer, 'covers', 'image')).secure_url
      : null;

    const mm = await import('music-metadata');
    const metadata = await mm.parseBuffer(audioFile.buffer);
    const duration = Math.floor(metadata.format.duration || 0);

    let isActive = false;
    let trackReleaseDate = new Date(releaseDate);

    if (albumId) {
      const album = await prisma.album.findUnique({
        where: { id: albumId },
        select: { isActive: true, releaseDate: true },
      });
      if (album) {
        isActive = album.isActive;
        trackReleaseDate = album.releaseDate;
      }
    } else {
      const now = new Date();
      isActive = trackReleaseDate <= now;
      console.log('Release date:', trackReleaseDate);
      console.log('Current time:', now);
      console.log('Is active:', isActive);
    }

    const featuredArtistsArray = Array.isArray(featuredArtists)
      ? featuredArtists
      : featuredArtists
      ? [featuredArtists]
      : [];

    // Xử lý genres
    const genreIdsArray = Array.isArray(genreIds)
      ? genreIds
      : genreIds
      ? [genreIds]
      : [];

    const track = await prisma.track.create({
      data: {
        title,
        duration,
        releaseDate: trackReleaseDate,
        trackNumber: trackNumber ? Number(trackNumber) : null,
        coverUrl,
        audioUrl: audioUpload.secure_url,
        artistId: finalArtistId,
        albumId: albumId || null,
        type: albumId ? undefined : 'SINGLE',
        isActive,
        featuredArtists:
          featuredArtistsArray.length > 0
            ? {
                create: featuredArtistsArray.map((artistId: string) => ({
                  artistId: artistId.trim(),
                })),
              }
            : undefined,
        genres:
          genreIdsArray.length > 0
            ? {
                create: genreIdsArray.map((genreId: string) => ({
                  genre: {
                    connect: { id: genreId.trim() },
                  },
                })),
              }
            : undefined,
      },
      select: trackSelect,
    });

    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id: finalArtistId },
      select: { artistName: true },
    });

    const followers = await prisma.userFollow.findMany({
      where: {
        followingArtistId: finalArtistId,
        followingType: 'ARTIST',
      },
      select: { followerId: true },
    });

    const notificationsData = followers.map((follower) => ({
      type: NotificationType.NEW_TRACK,
      message: `${
        artistProfile?.artistName || 'Unknown'
      } vừa ra track mới: ${title}`,
      recipientType: RecipientType.USER,
      userId: follower.followerId,
      artistId: finalArtistId,
      senderId: finalArtistId,
    }));

    await prisma.$transaction(async (tx) => {
      if (notificationsData.length > 0) {
        await tx.notification.createMany({ data: notificationsData });
      }
    });

    for (const follower of followers) {
      await pusher.trigger(`user-${follower.followerId}`, 'notification', {
        type: NotificationType.NEW_TRACK,
        message: `${artistProfile?.artistName} vừa ra track mới: ${title}`,
      });
    }

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
    const { id } = req.params;
    const {
      title,
      releaseDate,
      type,
      trackNumber,
      albumId,
      featuredArtists,
      genreIds,
      updateFeaturedArtists,
      updateGenres,
    } = req.body;

    // Kiểm tra track hiện tại
    const currentTrack = await prisma.track.findUnique({
      where: { id },
      select: {
        releaseDate: true,
        isActive: true,
        artistId: true,
        featuredArtists: true,
        genres: true,
        coverUrl: true,
      },
    });

    if (!currentTrack) {
      res.status(404).json({ message: 'Track not found' });
      return;
    }

    // Kiểm tra quyền chỉnh sửa
    if (!canManageTrack(req.user, currentTrack.artistId)) {
      res.status(403).json({
        message: 'You can only update your own tracks',
        code: 'NOT_TRACK_OWNER',
      });
      return;
    }

    const updateData: any = {};

    // Cập nhật các trường cơ bản
    if (title) updateData.title = title;
    if (type) updateData.type = type;
    if (trackNumber) updateData.trackNumber = Number(trackNumber);
    if (albumId !== undefined) updateData.albumId = albumId || null;

    // Xử lý upload ảnh cover mới nếu có
    if (req.files && (req.files as any).coverFile) {
      const coverFile = (req.files as any).coverFile[0];
      const coverUpload = await uploadFile(coverFile.buffer, 'covers', 'image');
      updateData.coverUrl = coverUpload.secure_url;
    }

    // Xử lý release date và trạng thái active
    if (releaseDate) {
      const newReleaseDate = new Date(releaseDate);
      const now = new Date();

      // Chỉ set isActive = false nếu releaseDate mới lớn hơn thời điểm hiện tại
      if (newReleaseDate > now) {
        updateData.isActive = false;
      } else {
        updateData.isActive = true;
      }

      updateData.releaseDate = newReleaseDate;
    }

    // Tạo transaction để xử lý cập nhật và quan hệ
    const updatedTrack = await prisma.$transaction(async (tx) => {
      // 1. Cập nhật thông tin cơ bản của track
      const updated = await tx.track.update({
        where: { id },
        data: updateData,
        select: trackSelect,
      });

      // 2. Xử lý featured artists nếu có dấu hiệu cập nhật
      if (updateFeaturedArtists === 'true') {
        // Xóa tất cả featured artists hiện có
        await tx.trackArtist.deleteMany({
          where: { trackId: id },
        });

        // Chuẩn hóa featuredArtists thành mảng
        const artistsArray = !featuredArtists
          ? []
          : Array.isArray(featuredArtists)
          ? featuredArtists
          : [featuredArtists];

        // Thêm mới nếu có
        if (artistsArray.length > 0) {
          await tx.trackArtist.createMany({
            data: artistsArray.map((artistId: string) => ({
              trackId: id,
              artistId: artistId.trim(),
            })),
            skipDuplicates: true,
          });
        }
      }

      // 3. Xử lý genres nếu có dấu hiệu cập nhật
      if (updateGenres === 'true') {
        // Xóa tất cả genres hiện có
        await tx.trackGenre.deleteMany({
          where: { trackId: id },
        });

        // Chuẩn hóa genreIds thành mảng
        const genresArray = !genreIds
          ? []
          : Array.isArray(genreIds)
          ? genreIds
          : [genreIds];

        // Thêm mới nếu có
        if (genresArray.length > 0) {
          await tx.trackGenre.createMany({
            data: genresArray.map((genreId: string) => ({
              trackId: id,
              genreId: genreId.trim(),
            })),
            skipDuplicates: true,
          });
        }
      }

      return updated;
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

    if (!user) {
      res.status(401).json({ message: 'Unauthorized: User not found' });
      return;
    }

    const track = await prisma.track.findUnique({
      where: { id },
      select: { artistId: true },
    });

    if (!track) {
      res.status(404).json({ message: 'Track not found' });
      return;
    }

    if (!canManageTrack(user, track.artistId)) {
      res.status(403).json({
        message: 'You can only delete your own tracks',
        code: 'NOT_TRACK_OWNER',
      });
      return;
    }

    await prisma.track.delete({
      where: { id },
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
    const { q, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const user = req.user;

    if (!q) {
      res.status(400).json({ message: 'Query is required' });
      return;
    }

    const searchQuery = String(q).trim();

    // Save search history if the user is logged in
    if (user) {
      const existingHistory = await prisma.history.findFirst({
        where: {
          userId: user.id,
          type: 'SEARCH',
          query: { equals: searchQuery, mode: Prisma.QueryMode.insensitive },
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
            type: 'SEARCH',
            query: searchQuery,
            userId: user.id,
          },
        });
      }
    }

    // Build search conditions on title and artist name (also including featured artists)
    const searchConditions = [
      { title: { contains: searchQuery, mode: Prisma.QueryMode.insensitive } },
      {
        artist: {
          artistName: {
            contains: searchQuery,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      },
      {
        featuredArtists: {
          some: {
            artistProfile: {
              artistName: {
                contains: searchQuery,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        },
      },
    ];

    // For artist management (logged-in artist) restrict search to only the artist's own tracks.
    // Otherwise (i.e. for public searches) only show active tracks from active artists.
    let whereClause: any;
    if (user && user.currentProfile === 'ARTIST' && user.artistProfile?.id) {
      whereClause = {
        artistId: user.artistProfile.id,
        OR: searchConditions,
      };
    } else {
      whereClause = {
        AND: [
          { isActive: true },
          { artist: { isActive: true } },
          { OR: searchConditions },
        ],
      };
    }

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where: whereClause,
        skip: offset,
        take: Number(limit),
        select: trackSelect,
        orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.track.count({ where: whereClause }),
    ]);

    res.json({
      tracks,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
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
    // --- Cache check ---
    const cacheKey = req.originalUrl;
    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log(`[Redis] Cache hit for key: ${cacheKey}`);
        res.json(JSON.parse(cachedData));
        return;
      }
      console.log(`[Redis] Cache miss for key: ${cacheKey}`);
    }
    // --------------------

    const { type } = req.params;
    let { page = 1, limit = 10 } = req.query;
    page = Math.max(1, parseInt(page as string));
    limit = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (page - 1) * limit;

    if (!Object.values(AlbumType).includes(type as AlbumType)) {
      res.status(400).json({ message: 'Invalid track type' });
      return;
    }

    const whereClause: any = { type: type as AlbumType };

    if (!req.user || !req.user.artistProfile?.id) {
      whereClause.isActive = true;
    } else {
      whereClause.OR = [
        { isActive: true },
        { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
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

    const result = {
      tracks,
      pagination: {
        total: totalTracks,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalTracks / Number(limit)),
      },
    };

    // --- Set result into cache ---
    await setCache(cacheKey, result);
    // -----------------------------
    res.json(result);
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
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { page = 1, limit = 10, q: search, status, genres } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Xây dựng điều kiện where
    const whereClause: Prisma.TrackWhereInput = {};

    // Thêm điều kiện search nếu có
    if (search) {
      whereClause.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        {
          artist: {
            artistName: { contains: String(search), mode: 'insensitive' },
          },
        },
      ];
    }

    // Thêm điều kiện status nếu có
    if (status) {
      whereClause.isActive = status === 'true';
    }

    // Thêm điều kiện genre nếu có
    if (genres) {
      // Chuyển đổi sang mảng string
      const genreIds: string[] = Array.isArray(genres)
        ? genres.map((g) => String(g))
        : [String(genres)];

      whereClause.genres = {
        some: {
          genreId: {
            in: genreIds,
          },
        },
      };
    }

    // Thêm điều kiện artist nếu user là artist
    if (user.role !== Role.ADMIN && user.artistProfile?.id) {
      whereClause.artistId = user.artistProfile.id;
    }

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where: whereClause,
        skip: offset,
        take: Number(limit),
        select: trackSelect,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.track.count({ where: whereClause }),
    ]);

    res.json({
      tracks,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get tracks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy track theo ID
export const getTrackById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    const track = await prisma.track.findUnique({
      where: { id },
      select: trackSelect,
    });

    if (!track) {
      res.status(404).json({ message: 'Track not found' });
      return;
    }

    // Kiểm tra quyền truy cập
    if (user?.role === Role.ADMIN) {
      // ADMIN có thể xem tất cả tracks
      res.json(track);
      return;
    }

    // Kiểm tra nếu track không active
    if (!track.isActive) {
      // Kiểm tra nếu user có artistProfile và là chủ sở hữu track
      if (user?.artistProfile?.id === track.artistId) {
        // Kiểm tra artist profile có hợp lệ không
        if (!user.artistProfile.isVerified || !user.artistProfile.isActive) {
          res.status(403).json({
            message: 'Your artist profile is not verified or inactive',
            code: 'INVALID_ARTIST_PROFILE',
          });
          return;
        }

        // Cho phép user xem track dù đang ở profile User hay Artist
        res.json(track);
        return;
      }

      // Các trường hợp khác không được xem track không active
      res.status(403).json({
        message: 'You do not have permission to view this track',
        code: 'TRACK_NOT_ACCESSIBLE',
      });
      return;
    }

    // Track active - cho phép tất cả user xem
    res.json(track);
  } catch (error) {
    console.error('Get track by id error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy danh sách tất cả các tracks theo thể loại
export const getTracksByGenre = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // --- Cache check ---
    const cacheKey = req.originalUrl;
    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log(`[Redis] Cache hit for key: ${cacheKey}`);
        res.json(JSON.parse(cachedData));
        return;
      }
      console.log(`[Redis] Cache miss for key: ${cacheKey}`);
    }
    // --------------------

    const { genreId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
    });

    if (!genre) {
      res.status(404).json({ message: 'Genre not found' });
      return;
    }

    const whereClause: any = {
      genres: {
        some: {
          genreId: genreId,
        },
      },
    };

    if (!req.user || !req.user.artistProfile?.id) {
      whereClause.isActive = true;
    } else {
      whereClause.OR = [
        { isActive: true },
        { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
      ];
    }

    const tracks = await prisma.track.findMany({
      where: whereClause,
      select: {
        ...trackSelect,
        genres: {
          where: {
            genreId: genreId,
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

    const totalTracks = await prisma.track.count({
      where: whereClause,
    });

    const result = {
      tracks,
      pagination: {
        total: totalTracks,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalTracks / Number(limit)),
      },
    };

    // --- Set result into cache ---
    await setCache(cacheKey, result);
    // -----------------------------
    res.json(result);
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
    // --- Cache check ---
    const cacheKey = req.originalUrl;
    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log(`[Redis] Cache hit for key: ${cacheKey}`);
        res.json(JSON.parse(cachedData));
        return;
      }
      console.log(`[Redis] Cache miss for key: ${cacheKey}`);
    }
    // --------------------

    const { type, genreId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    if (!Object.values(AlbumType).includes(type as AlbumType)) {
      res.status(400).json({ message: 'Invalid track type' });
      return;
    }

    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
    });

    if (!genre) {
      res.status(404).json({ message: 'Genre not found' });
      return;
    }

    const whereClause: any = {
      type: type as AlbumType,
      genres: {
        some: {
          genreId: genreId,
        },
      },
    };

    if (!req.user || !req.user.artistProfile?.id) {
      whereClause.isActive = true;
    } else {
      whereClause.OR = [
        { isActive: true },
        { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
      ];
    }

    const tracks = await prisma.track.findMany({
      where: whereClause,
      select: {
        ...trackSelect,
        genres: {
          where: {
            genreId: genreId,
          },
          select: {
            genre: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: Number(limit),
    });

    const totalTracks = await prisma.track.count({
      where: whereClause,
    });

    const result = {
      tracks,
      pagination: {
        total: totalTracks,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalTracks / Number(limit)),
      },
    };

    // --- Set result into cache ---
    await setCache(cacheKey, result);
    // -----------------------------
    res.json(result);
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

    // *** FIX: Tăng playCount của track trong bảng track ***
    await prisma.track.update({
      where: { id: track.id },
      data: { playCount: { increment: 1 } },
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
