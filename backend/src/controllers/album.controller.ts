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

const albumSelect = {
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
      artistName: true,
      avatar: true,
      isVerified: true,
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
          artistName: true,
          isVerified: true,
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
} as const;

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

// Validation functions cho tracks
const validateTrackData = (
  track: any,
  artistId?: string,
  isAlbumTrack: boolean = false // Thêm tham số isAlbumTrack, nếu add tracks vào album thì không cần coverUrl
): string | null => {
  const {
    title,
    duration,
    releaseDate,
    trackNumber,
    coverUrl,
    audioUrl,
    featuredArtists,
  } = track;

  // Validate các trường bắt buộc
  if (!title?.trim()) return 'Title is required';
  if (duration === undefined || duration < 0)
    return 'Duration must be a non-negative number';
  if (!releaseDate || isNaN(Date.parse(releaseDate)))
    return 'Valid release date is required';
  if (trackNumber === undefined || trackNumber <= 0)
    return 'Track number must be a positive integer';
  if (!isAlbumTrack && !coverUrl?.trim()) return 'Cover URL is required'; // Chỉ yêu cầu coverUrl nếu không phải track trong album
  if (!audioUrl?.trim()) return 'Audio URL is required';

  // Validate featuredArtists (nếu có)
  if (featuredArtists) {
    // Kiểm tra featuredArtists phải là một mảng
    if (!Array.isArray(featuredArtists)) {
      return 'Featured artists must be an array';
    }

    // Kiểm tra từng phần tử trong mảng featuredArtists
    for (const artistProfileId of featuredArtists) {
      if (typeof artistProfileId !== 'string' || !artistProfileId.trim()) {
        return 'Each featured artist ID must be a non-empty string';
      }

      // Kiểm tra xem featuredArtists có chứa ID của chính artist chủ sở hữu không
      if (artistId && artistProfileId === artistId) {
        return 'Featured artists cannot include the track owner';
      }
    }
  }

  return null; // Track hợp lệ
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
        trackCount: 0,
        duration: 0,
        artistId: finalArtistId,
        genres: {
          create: genreIds.map((genreId: string) => ({
            genre: { connect: { id: genreId } },
          })),
        },
      },
      select: albumSelect,
    });

    // Xóa tất cả cache liên quan
    // 1. Xóa cache của route GET albums cho user cụ thể
    // 2. Xóa cache của route GET albums cho admin (nếu người tạo là admin)
    // 3. Xóa cache tìm kiếm
    await clearCacheForEntity('album', {
      userId: targetUserId,
      adminId: user.role === Role.ADMIN ? user.id : undefined,
      clearSearch: true,
    });

    // Tạo thông báo cho người dùng theo dõi artist (nếu có) -- Kim

    res.status(201).json({
      message: 'Album created successfully',
      album,
    });
  } catch (error) {
    console.error('Create album error:', error);

    // Kiểm tra kiểu của error trước khi truy cập thuộc tính code
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      res.status(400).json({
        message: 'An album with the same title already exists for this artist.',
      });
      return;
    }

    // Xử lý các lỗi khác
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

    // Kiểm tra xem có file được gửi lên không
    if (!req.files || !Array.isArray(req.files)) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    const files = req.files as Express.Multer.File[];

    // Lấy các trường dữ liệu từ req.body
    const { title, releaseDate, trackNumber, featuredArtists } = req.body;

    // Xây dựng tracksData từ các trường dữ liệu
    const tracksData = [
      {
        title,
        releaseDate,
        trackNumber: parseInt(trackNumber, 10),
        featuredArtists: featuredArtists ? featuredArtists.split(',') : [],
      },
    ];

    const mm = await import('music-metadata');

    // Upload từng file lên Cloudinary và tạo track
    const createdTracks = await Promise.all(
      files.map(async (file, index) => {
        const trackDetails = tracksData[index];

        try {
          // Parse metadata directly from buffer
          const metadata = await mm.parseBuffer(file.buffer);
          const duration = Math.floor(metadata.format.duration || 0);

          // Upload file to Cloudinary
          const uploadResult = await uploadFile(file.buffer, 'tracks', 'auto');

          // Create track in database
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

    // Cập nhật số lượng track và duration của album
    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        trackCount: { increment: files.length },
        duration: {
          increment: createdTracks.reduce(
            (sum: number, track: any) => sum + (track.duration || 0),
            0
          ),
        },
      },
      select: albumSelect,
    });

    // Xóa cache liên quan đến album, artist, và admin
    await clearCacheForEntity('album', {
      userId: album.artistId, // Xóa cache của artist
      adminId: user.role === Role.ADMIN ? user.id : undefined, // Xóa cache của admin nếu người thêm là admin
      entityId: albumId, // Xóa cache của album cụ thể
      clearSearch: true, // Xóa cache tìm kiếm
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
    // 1. Xóa cache của route GET albums cho user cụ thể
    // 2. Xóa cache của album cụ thể
    // 3. Xóa cache tìm kiếm
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

    // Xóa cache của route GET all albums, cache tìm kiếm và cache của album cụ thể
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

    // Clear toàn bộ cache liên quan đến album và search
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
    select: albumSelect,
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

  // Tạo điều kiện whereClause với isActive: true
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

  // Xóa cache cũ và set cache mới
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

  const album = await prisma.album.findUnique({
    where: { id },
    select: albumSelect,
  });

  if (!album) throw new Error('Album not found');

  // Cho phép ADMIN/ARTIST xem album ẩn
  if (
    !album.isActive &&
    (!user ||
      (user.role !== Role.ADMIN && user.artistProfile?.id !== album.artist.id))
  ) {
    throw new Error('Album not found');
  }

  return album;
};

// Nghe album
export const playAlbum = async (req: Request, res: Response): Promise<void> => {
  try {
    const { albumId } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

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
