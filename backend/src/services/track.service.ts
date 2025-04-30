import prisma from '../config/db';
import { Prisma, Role, AlbumType, NotificationType, RecipientType } from '@prisma/client';
import { Request } from 'express';
import { uploadFile } from './upload.service';
import { paginate } from '../utils/handle-utils';
import * as emailService from './email.service';
import { client, setCache } from '../middleware/cache.middleware';
import { trackSelect } from '../utils/prisma-selects';
import { getIO } from '../config/socket';

// Hàm kiểm tra quyền
export const canManageTrack = (user: any, trackArtistId: string): boolean => {
  if (!user) return false;
  if (user.role === Role.ADMIN) return true;
  return (
    user.artistProfile?.isVerified &&
    user.artistProfile?.isActive &&
    user.artistProfile?.role === Role.ARTIST &&
    user.artistProfile?.id === trackArtistId
  );
};

// Xóa track
export const deleteTrackById = async (id: string) => {
  const track = await prisma.track.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!track) {
    throw new Error('Track not found');
  }

  // Emit WebSocket event before deletion
  const io = getIO();
  io.emit('track:deleted', { trackId: id });

  return prisma.track.delete({
    where: { id },
  });
};

// Like a track
export const likeTrack = async (userId: string, trackId: string) => {
  const track = await prisma.track.findFirst({
    where: {
      id: trackId,
      isActive: true,
    },
  });

  if (!track) {
    throw new Error('Track not found or not active');
  }

  const existingLike = await prisma.userLikeTrack.findUnique({
    where: {
      userId_trackId: {
        userId,
        trackId,
      },
    },
  });

  if (existingLike) {
    throw new Error('Track already liked');
  }

  await prisma.userLikeTrack.create({
    data: {
      userId,
      trackId,
    },
  });

  // Check if the Favorites playlist exists for this user
  let favoritePlaylist = await prisma.playlist.findFirst({
    where: {
      userId,
      type: 'FAVORITE',
    },
  });

  // If Favorites playlist doesn't exist, create it
  if (!favoritePlaylist) {
    favoritePlaylist = await prisma.playlist.create({
      data: {
        name: "Favorites",
        description: "List of your favorite songs",
        privacy: "PRIVATE",
        type: "FAVORITE",
        userId,
        totalTracks: 0,
        totalDuration: 0,
      },
    });
  }

  // Add track to the Favorites playlist
  const tracksCount = await prisma.playlistTrack.count({
    where: {
      playlistId: favoritePlaylist.id,
    },
  });

  await prisma.playlistTrack.create({
    data: {
      playlistId: favoritePlaylist.id,
      trackId,
      trackOrder: tracksCount + 1,
    },
  });

  // Update favorite playlist's totalTracks and totalDuration
  await prisma.playlist.update({
    where: {
      id: favoritePlaylist.id,
    },
    data: {
      totalTracks: {
        increment: 1,
      },
      totalDuration: {
        increment: track.duration || 0,
      },
    },
  });

  // Emit WebSocket event to notify clients that the Favorites playlist was updated
  const io = getIO();
  io.emit('playlist-updated');
  // Also emit a personalized event for this user
  io.to(`user-${userId}`).emit('favorites-updated', { action: 'add', trackId });

  return { message: 'Track liked successfully' };
};

// Unlike a track
export const unlikeTrack = async (userId: string, trackId: string) => {
  const existingLike = await prisma.userLikeTrack.findUnique({
    where: {
      userId_trackId: {
        userId,
        trackId,
      },
    },
  });

  if (!existingLike) {
    throw new Error('Track not liked');
  }

  // First, find the Favorites playlist
  const favoritePlaylist = await prisma.playlist.findFirst({
    where: {
      userId,
      type: 'FAVORITE',
    },
    include: {
      _count: {
        select: {
          tracks: true
        }
      }
    }
  });

  if (!favoritePlaylist) {
    // Just delete the like if there's no Favorites playlist
    await prisma.userLikeTrack.delete({
      where: {
        userId_trackId: {
          userId,
          trackId,
        },
      },
    });
    
    return { message: 'Track unliked successfully' };
  }

  // Get track duration before deleting
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { duration: true }
  });

  // Delete the like
  await prisma.userLikeTrack.delete({
    where: {
      userId_trackId: {
        userId,
        trackId,
      },
    },
  });

  // Remove track from the Favorites playlist
  await prisma.playlistTrack.deleteMany({
    where: {
      playlist: {
        userId,
        type: 'FAVORITE',
      },
      trackId,
    },
  });

  // Update favorite playlist's totalTracks and totalDuration
  await prisma.playlist.update({
    where: {
      id: favoritePlaylist.id,
    },
    data: {
      totalTracks: {
        decrement: 1,
      },
      totalDuration: {
        decrement: track?.duration || 0,
      },
    },
  });

  // Get the IO instance for WebSocket communication
  const io = getIO();

  // Check if this was the last track in the playlist
  // If favoritePlaylist._count.tracks is 1, that means after deletion it will be empty
  if (favoritePlaylist._count.tracks === 1) {
    // Delete the entire Favorites playlist since it's now empty
    await prisma.playlist.delete({
      where: {
        id: favoritePlaylist.id
      }
    });
    
    // Emit WebSocket event to notify clients that the Favorites playlist was deleted
    io.emit('playlist-updated');
    io.to(`user-${userId}`).emit('favorites-updated', { action: 'deleted', playlistId: favoritePlaylist.id });
    
    return { message: 'Track unliked and empty Favorites playlist removed' };
  }

  // Emit WebSocket event to notify clients that the Favorites playlist was updated
  io.emit('playlist-updated');
  io.to(`user-${userId}`).emit('favorites-updated', { action: 'remove', trackId });

  return { message: 'Track unliked successfully' };
};

// Lấy tất cả tracks
export const getTracks = async (req: Request) => {
  const { search, sortBy, sortOrder } = req.query;
  const user = req.user;

  const whereClause: Prisma.TrackWhereInput = {};

  if (user && user.role !== Role.ADMIN && user.artistProfile?.id) {
    whereClause.artistId = user.artistProfile.id;
  }

  if (search && typeof search === 'string') {
    whereClause.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { artist: { artistName: { contains: search, mode: 'insensitive' } } },
      { album: { title: { contains: search, mode: 'insensitive' } } },
      {
        genres: {
          every: {
            genre: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
      },
      {
        featuredArtists: {
          some: {
            artistProfile: {
              artistName: { contains: search, mode: 'insensitive' },
            },
          },
        },
      },
    ];
  }

  const orderByClause: Prisma.TrackOrderByWithRelationInput = {};
  if (
    sortBy &&
    typeof sortBy === 'string' &&
    (sortOrder === 'asc' || sortOrder === 'desc')
  ) {
    if (
      sortBy === 'title' ||
      sortBy === 'duration' ||
      sortBy === 'releaseDate' ||
      sortBy === 'createdAt' ||
      sortBy === 'isActive'
    ) {
      orderByClause[sortBy] = sortOrder;
    } else if (sortBy === 'album') {
      orderByClause.album = { title: sortOrder };
    } else if (sortBy === 'artist') {
      orderByClause.artist = { artistName: sortOrder };
    } else {
      orderByClause.releaseDate = 'desc';
    }
  } else {
    orderByClause.releaseDate = 'desc';
  }

  const result = await paginate<any>(prisma.track, req, {
    where: whereClause,
    include: {
      artist: {
        select: { id: true, artistName: true, avatar: true },
      },
      album: { select: { id: true, title: true, coverUrl: true } },
      genres: { include: { genre: true } },
      featuredArtists: {
        include: { artistProfile: { select: { id: true, artistName: true } } },
      },
    },
    orderBy: orderByClause,
  });

  const formattedTracks = result.data.map((track: any) => ({
    ...track,
    genres: track.genres,
    featuredArtists: track.featuredArtists,
  }));

  return {
    data: formattedTracks,
    pagination: result.pagination,
  };
};

// Tạo track mới
export const createTrack = async (req: Request) => {
  const user = req.user;
  if (!user) throw new Error('Unauthorized');

  const {
    title,
    releaseDate,
    trackNumber,
    albumId,
    featuredArtists,
    artistId,
    genreIds,
    labelId,
  } = req.body;

  const finalArtistId =
    user.role === 'ADMIN' && artistId ? artistId : user.artistProfile?.id;

  if (!finalArtistId) {
    throw new Error(
      user.role === 'ADMIN'
        ? 'Artist ID is required'
        : 'Only verified artists can create tracks'
    );
  }

  const artistProfile = await prisma.artistProfile.findUnique({
    where: { id: finalArtistId },
    select: { artistName: true },
  });
  const artistName = artistProfile?.artistName || 'Nghệ sĩ';

  if (!req.files) throw new Error('No files uploaded');

  const files = req.files as {
    audioFile?: Express.Multer.File[];
    coverFile?: Express.Multer.File[];
  };
  const audioFile = files.audioFile?.[0];
  const coverFile = files.coverFile?.[0];

  if (!audioFile) throw new Error('Audio file is required');

  const audioUpload = await uploadFile(audioFile.buffer, 'tracks', 'auto');
  const coverUrl = coverFile
    ? (await uploadFile(coverFile.buffer, 'covers', 'image')).secure_url
    : null;

  const mm = await import('music-metadata');
  const metadata = await mm.parseBuffer(audioFile.buffer);
  const duration = Math.floor(metadata.format.duration || 0);

  let isActive = false;
  let trackReleaseDate = releaseDate ? new Date(releaseDate) : new Date();

  if (albumId) {
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: { isActive: true, releaseDate: true, coverUrl: true },
    });
    if (album) {
      isActive = album.isActive;
      trackReleaseDate = album.releaseDate;
    }
  } else {
    const now = new Date();
    isActive = trackReleaseDate <= now;
  }

  const artistsArray = !featuredArtists
    ? []
    : Array.isArray(featuredArtists)
      ? featuredArtists.map((id: string) => id.trim()).filter(Boolean)
      : typeof featuredArtists === 'string'
        ? featuredArtists.split(',').map((id: string) => id.trim()).filter(Boolean)
        : [];

  let genresArray: string[] = [];
  if (genreIds) {
    if (Array.isArray(genreIds)) {
      genresArray = genreIds.map((id: string) => id.trim()).filter(Boolean);
    } else if (typeof genreIds === 'string') {
      genresArray = genreIds.split(',').map((id: string) => id.trim()).filter(Boolean);
    }
  }

  let finalLabelId: string | null = null;
  if (labelId) {
    const labelExists = await prisma.label.findUnique({
      where: { id: labelId },
    });
    if (!labelExists) throw new Error('Invalid label ID');
    finalLabelId = labelId;
  }

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
      labelId: finalLabelId,
      featuredArtists:
        artistsArray.length > 0
          ? {
            create: artistsArray.map((featArtistId: string) => ({
              artistId: featArtistId,
            })),
          }
          : undefined,
      genres:
        genresArray.length > 0
          ? {
            create: genresArray.map((genreId: string) => ({
              genre: {
                connect: { id: genreId },
              },
            })),
          }
          : undefined,
    },
    select: trackSelect,
  });

  const followers = await prisma.userFollow.findMany({
    where: {
      followingArtistId: finalArtistId,
      followingType: 'ARTIST',
    },
    select: { followerId: true },
  });

  const followerIds = followers.map((f) => f.followerId);
  if (followerIds.length > 0) {
    const followerUsers = await prisma.user.findMany({
      where: { id: { in: followerIds } },
      select: { id: true, email: true },
    });

    const notificationsData = followers.map((follower) => ({
      type: NotificationType.NEW_TRACK,
      message: `${artistName} just released a new tracks: ${title}`,
      recipientType: RecipientType.USER,
      userId: follower.followerId,
      artistId: finalArtistId,
      senderId: finalArtistId,
      trackId: track.id,
    }));

    await prisma.notification.createMany({ data: notificationsData });

    const releaseLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/track/${track.id}`;
    const io = getIO();

    for (const user of followerUsers) {
      const room = `user-${user.id}`;
      io.to(room).emit('notification', {
        type: NotificationType.NEW_TRACK,
        message: `${artistName} just released a new track: ${track.title}`,
        trackId: track.id,
      });

      if (user.email) {
        const emailOptions = emailService.createNewReleaseEmail(
          user.email,
          artistName,
          'track',
          track.title,
          releaseLink,
          track.coverUrl
        );
        await emailService.sendEmail(emailOptions);
      }
    }
  }

  return { message: 'Track created successfully', track };
};

// Cập nhật track
export const updateTrack = async (req: Request, id: string) => {
  const {
    title,
    releaseDate,
    type,
    trackNumber,
    albumId,
    labelId,
  } = req.body;

  const currentTrack = await prisma.track.findUnique({
    where: { id },
    select: {
      releaseDate: true,
      isActive: true,
      artistId: true,
      coverUrl: true,
      labelId: true,
    },
  });

  if (!currentTrack) throw new Error('Track not found');

  if (!canManageTrack(req.user, currentTrack.artistId)) {
    throw new Error('You can only update your own tracks');
  }

  const updateData: Prisma.TrackUpdateInput = {}; // Use Prisma type

  // Handle basic field updates
  if (title !== undefined) updateData.title = title;
  if (type !== undefined) updateData.type = type;
  if (trackNumber !== undefined) updateData.trackNumber = Number(trackNumber);

  // Handle Album update using connect/disconnect
  if (albumId !== undefined) {
    if (albumId === null || albumId === '') {
      updateData.album = { disconnect: true };
    } else if (typeof albumId === 'string') {
      // Optional: Validate album exists before connecting
      const albumExists = await prisma.album.findUnique({ where: { id: albumId }, select: { id: true } });
      if (!albumExists) throw new Error(`Invalid Album ID: ${albumId} does not exist`);
      updateData.album = { connect: { id: albumId } };
    } else {
      throw new Error(`Invalid albumId type: expected string or null, got ${typeof albumId}`);
    }
  }

  // Handle labelId update using connect/disconnect
  if (labelId !== undefined) {
    if (labelId === null || labelId === '') {
      updateData.label = { disconnect: true };
    } else if (typeof labelId === 'string') {
      const labelExists = await prisma.label.findUnique({ where: { id: labelId } });
      if (!labelExists) throw new Error(`Invalid label ID: ${labelId} does not exist`);
      updateData.label = { connect: { id: labelId } };
    } else {
      throw new Error(`Invalid labelId type: expected string or null, got ${typeof labelId}`);
    }
  }

  // Handle cover file upload
  if (req.files && (req.files as any).coverFile) {
      const coverFile = (req.files as any).coverFile[0];
      const coverUpload = await uploadFile(coverFile.buffer, 'covers', 'image');
      updateData.coverUrl = coverUpload.secure_url;
  } else if (req.body.removeCover === 'true') { // Optional: Allow removing cover
      updateData.coverUrl = null;
  }

  // Handle release date and isActive
  if (releaseDate !== undefined) {
      const newReleaseDate = new Date(releaseDate);
      if (isNaN(newReleaseDate.getTime())) {
          throw new Error('Invalid release date format');
      }
      const now = new Date();
      updateData.isActive = newReleaseDate <= now;
      updateData.releaseDate = newReleaseDate;
  }
  // Note: Add logic here if you want to update isActive independently via a separate field in req.body
  if (req.body.isActive !== undefined) {
      updateData.isActive = req.body.isActive === 'true' || req.body.isActive === true;
  }

  // Handle Genres
  if (req.body.genres !== undefined) {
    await prisma.trackGenre.deleteMany({ where: { trackId: id } });

    // Then, add the new associations if any genres are provided
    const genresInput = req.body.genres;
    const genresArray = !genresInput
      ? []
      : Array.isArray(genresInput)
      ? genresInput.map(String).filter(Boolean)
      : typeof genresInput === 'string'
      ? genresInput.split(',').map((g: string) => g.trim()).filter(Boolean)
      : [];

    if (genresArray.length > 0) {
      const existingGenres = await prisma.genre.findMany({
        where: { id: { in: genresArray } },
        select: { id: true },
      });
      const validGenreIds = existingGenres.map((genre) => genre.id);
      const invalidGenreIds = genresArray.filter((id) => !validGenreIds.includes(id));
      if (invalidGenreIds.length > 0) {
        throw new Error(`Invalid genre IDs: ${invalidGenreIds.join(', ')}`);
      }
      
      // Prepare data for creating new associations
      updateData.genres = {
        create: validGenreIds.map((genreId: string) => ({
          genre: { connect: { id: genreId } },
        })),
      };
    } else {
    }
  }

  const updatedTrack = await prisma.$transaction(async (tx) => {
    await tx.track.update({
      where: { id },
      data: updateData, 
    });

    // --- Update Featured Artists ---
    if (req.body.featuredArtists !== undefined) {
        await tx.trackArtist.deleteMany({ where: { trackId: id } });

        const artistsInput = req.body.featuredArtists;
        const artistsArray = !artistsInput
            ? []
            : Array.isArray(artistsInput)
            ? artistsInput.map(String) 
            : typeof artistsInput === 'string'
            ? artistsInput.split(',').map((faId: string) => faId.trim()).filter(Boolean)
            : [];

        if (artistsArray.length > 0) {
            const existingArtists = await tx.artistProfile.findMany({
                where: { id: { in: artistsArray } },
                select: { id: true },
            });
            const validArtistIds = existingArtists.map(a => a.id);
            const invalidArtistIds = artistsArray.filter(aId => !validArtistIds.includes(aId));
            if (invalidArtistIds.length > 0) {
                throw new Error(`Invalid featured artist IDs: ${invalidArtistIds.join(', ')}`);
            }

            await tx.trackArtist.createMany({
                data: validArtistIds.map((artistId: string) => ({
                    trackId: id,
                    artistId: artistId,
                })),
                skipDuplicates: true,
            });
        }
    }

    // Re-fetch the track within the transaction to get updated relations
    const finalUpdatedTrack = await tx.track.findUnique({
        where: { id },
        select: trackSelect,
    });
    if (!finalUpdatedTrack) {
      throw new Error("Failed to re-fetch track after updating relations.");
    }
    return finalUpdatedTrack;
  });

  const io = getIO();
  io.emit('track:updated', { track: updatedTrack }); // Use the result of the transaction

  return { message: 'Track updated successfully', track: updatedTrack };
};

// Xóa track
export const deleteTrack = async (req: Request, id: string) => {
  const user = req.user;
  if (!user) throw new Error('Unauthorized: User not found');

  const track = await prisma.track.findUnique({
    where: { id },
    select: { artistId: true },
  });

  if (!track) throw new Error('Track not found');

  if (!canManageTrack(user, track.artistId)) {
    throw new Error('You can only delete your own tracks');
  }

  await deleteTrackById(id);
  return { message: 'Track deleted successfully' };
};

// Toggle visibility
export const toggleTrackVisibility = async (req: Request, id: string) => {
  const user = req.user;
  if (!user) throw new Error('Unauthorized: User not found');

  const track = await prisma.track.findUnique({
    where: { id },
    select: { artistId: true, isActive: true },
  });

  if (!track) throw new Error('Track not found');

  if (!canManageTrack(user, track.artistId)) {
    throw new Error('You can only toggle visibility of your own tracks');
  }
  const newIsActive = !track.isActive;

  const updatedTrack = await prisma.track.update({
    where: { id },
    data: { isActive: newIsActive },
    select: trackSelect,
  });
    // Emit WebSocket event
  const io = getIO();
  io.emit('track:visibilityChanged', { trackId: updatedTrack.id, isActive: newIsActive });

  return {
    message: `Track ${updatedTrack.isActive ? 'activated' : 'hidden'} successfully`,
    track: updatedTrack,
  };
};

// Tìm kiếm track
export const searchTrack = async (req: Request) => {
  const { q, page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const user = req.user;

  if (!q) throw new Error('Query is required');

  const searchQuery = String(q).trim();

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

  const searchConditions = [
    { title: { contains: searchQuery, mode: Prisma.QueryMode.insensitive } },
    {
      artist: {
        artistName: { contains: searchQuery, mode: Prisma.QueryMode.insensitive },
      },
    },
    {
      featuredArtists: {
        some: {
          artistProfile: {
            artistName: { contains: searchQuery, mode: Prisma.QueryMode.insensitive },
          },
        },
      },
    },
  ];

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

  return {
    tracks,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// Lấy tracks theo loại
export const getTracksByType = async (req: Request, type: string) => {
  const cacheKey = req.originalUrl;
  if (process.env.USE_REDIS_CACHE === 'true') {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log(`[Redis] Cache hit for key: ${cacheKey}`);
      return JSON.parse(cachedData);
    }
    console.log(`[Redis] Cache miss for key: ${cacheKey}`);
  }

  let { page = 1, limit = 10 } = req.query;
  page = Math.max(1, parseInt(page as string));
  limit = Math.min(100, Math.max(1, parseInt(limit as string)));
  const offset = (page - 1) * limit;

  if (!Object.values(AlbumType).includes(type as AlbumType)) {
    throw new Error('Invalid track type');
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

  await setCache(cacheKey, result);
  return result;
};

// Lấy tất cả tracks (ADMIN & ARTIST)
export const getAllTracksAdminArtist = async (req: Request) => {
  const user = req.user;
  if (!user) throw new Error('Unauthorized');

  if (
    user.role !== Role.ADMIN &&
    (!user.artistProfile?.isVerified || user.artistProfile?.role !== 'ARTIST')
  ) {
    throw new Error('Forbidden: Only admins or verified artists can access this resource');
  }

  const { search, status, genres } = req.query;
  const whereClause: Prisma.TrackWhereInput = {};

  if (user.role !== Role.ADMIN && user.artistProfile?.id) {
    whereClause.artistId = user.artistProfile.id;
  }

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

  if (status) {
    whereClause.isActive = status === 'true';
  }

  if (genres) {
    const genreIds: string[] = Array.isArray(genres)
      ? genres.map((g) => String(g))
      : [String(genres)];
    whereClause.genres = {
      some: {
        genreId: { in: genreIds },
      },
    };
  }

  const conditions: Prisma.TrackWhereInput[] = [];
  if (search) {
    conditions.push({
      OR: [
        { title: { contains: String(search), mode: 'insensitive' } },
        {
          artist: {
            artistName: { contains: String(search), mode: 'insensitive' },
          },
        },
      ],
    });
  }

  if (status) {
    conditions.push({ isActive: status === 'true' });
  }

  if (genres) {
    const genreIds = Array.isArray(genres) ? genres.map((g) => String(g)) : [String(genres)];
    conditions.push({
      genres: {
        some: {
          genreId: { in: genreIds },
        },
      },
    });
  }

  if (conditions.length > 0) whereClause.AND = conditions;

  // Determine sorting
  let orderBy: Prisma.TrackOrderByWithRelationInput | Prisma.TrackOrderByWithRelationInput[] = { releaseDate: 'desc' }; // Default sort
  const { sortBy, sortOrder } = req.query;
  const validSortFields = ['title', 'duration', 'playCount', 'isActive', 'releaseDate', 'trackNumber'];
  if (sortBy && validSortFields.includes(String(sortBy))) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      orderBy = [{ [String(sortBy)]: order }, { id: 'asc' }]; // Add secondary sort for stability
  }

  // Directly use paginate with the constructed whereClause and select
  const result = await paginate<any>(prisma.track, req, {
      where: whereClause,
      select: trackSelect, // Use the standard trackSelect
      orderBy: orderBy,
  });

  // Return the paginated result directly
  return { tracks: result.data, pagination: result.pagination };
};

// Lấy track theo ID
export const getTrackById = async (req: Request, id: string) => {
  const user = req.user;

  const track = await prisma.track.findUnique({
    where: { id },
    select: trackSelect,
  });

  if (!track) throw new Error('Track not found');

  if (user?.role === Role.ADMIN) return track;

  if (!track.isActive) {
    if (user?.artistProfile?.id === track.artistId) {
      if (!user.artistProfile.isVerified || !user.artistProfile.isActive) {
        throw new Error('Your artist profile is not verified or inactive');
      }
      return track;
    }
    throw new Error('You do not have permission to view this track');
  }

  return track;
};

// Lấy tracks theo thể loại
export const getTracksByGenre = async (req: Request, genreId: string) => {
  const cacheKey = req.originalUrl;
  if (process.env.USE_REDIS_CACHE === 'true') {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log(`[Redis] Cache hit for key: ${cacheKey}`);
      return JSON.parse(cachedData);
    }
    console.log(`[Redis] Cache miss for key: ${cacheKey}`);
  }

  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const genre = await prisma.genre.findUnique({
    where: { id: genreId },
  });

  if (!genre) throw new Error('Genre not found');

  const whereClause: any = {
    genres: {
      every: {
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
        where: { genreId: genreId },
        select: {
          genre: { select: { id: true, name: true } },
        },
      },
    },
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

  await setCache(cacheKey, result);
  return result;
};

// Lấy tracks theo type và genre
export const getTracksByTypeAndGenre = async (req: Request, type: string, genreId: string) => {
  const cacheKey = req.originalUrl;
  if (process.env.USE_REDIS_CACHE === 'true') {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log(`[Redis] Cache hit for key: ${cacheKey}`);
      return JSON.parse(cachedData);
    }
    console.log(`[Redis] Cache miss for key: ${cacheKey}`);
  }

  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  if (!Object.values(AlbumType).includes(type as AlbumType)) {
    throw new Error('Invalid track type');
  }

  const genre = await prisma.genre.findUnique({
    where: { id: genreId },
  });

  if (!genre) throw new Error('Genre not found');

  const whereClause: any = {
    type: type as AlbumType,
    genres: {
      every: {
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
        where: { genreId: genreId },
        select: {
          genre: { select: { id: true, name: true } },
        },
      },
    },
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

  await setCache(cacheKey, result);
  return result;
};

// Phát track
export const playTrack = async (req: Request, trackId: string) => {
  const user = req.user;
  if (!user) throw new Error('Unauthorized');

  const track = await prisma.track.findFirst({
    where: {
      id: trackId,
      isActive: true,
      OR: [{ album: null }, { album: { isActive: true } }],
    },
    select: trackSelect,
  });

  if (!track) throw new Error('Track not found');

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

  await prisma.track.update({
    where: { id: track.id },
    data: { playCount: { increment: 1 } },
  });

  return { message: 'Track playback started', track };
};

// Check if track is liked
export const checkTrackLiked = async (userId: string, trackId: string) => {
  const like = await prisma.userLikeTrack.findUnique({
    where: {
      userId_trackId: {
        userId,
        trackId,
      },
    },
  });

  return { isLiked: !!like };
};