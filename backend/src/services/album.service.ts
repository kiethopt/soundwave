import { Request } from 'express';
import prisma from '../config/db';
import { uploadFile } from './upload.service';
import { Role, AlbumType, Prisma, HistoryType, NotificationType, RecipientType } from '@prisma/client';
import { albumSelect, trackSelect } from '../utils/prisma-selects';
import * as emailService from './email.service';
import { paginate } from 'src/utils/handle-utils';
import { getIO } from '../config/socket';

const canManageAlbum = (user: any, albumArtistId: string): boolean => {
  if (!user) return false;
  if (user.role === Role.ADMIN) return true;
  return (
    user.artistProfile?.isVerified &&
    user.artistProfile?.role === Role.ARTIST &&
    user.artistProfile?.id === albumArtistId
  );
};

const validateAlbumData = (data: any): string | null => {
  const { title, releaseDate, type } = data;
  if (!title?.trim()) return 'Title is required';
  if (!releaseDate || isNaN(Date.parse(releaseDate)))
    return 'Valid release date is required';
  if (type && !Object.values(AlbumType).includes(type))
    return 'Invalid album type';
  return null;
};

export const deleteAlbumById = async (id: string) => {
  const album = await prisma.album.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!album) {
    throw new Error('Album not found');
  }

  // Emit WebSocket event before deletion
  const io = getIO();
  io.emit('album:deleted', { albumId: id });

  return prisma.album.delete({
    where: { id },
  });
};

export const getNewestAlbums = async (limit = 20) => {
  return prisma.album.findMany({
    where: { isActive: true },
    orderBy: { releaseDate: 'desc' },
    take: limit,
    select: albumSelect,
  });
};

export const getHotAlbums = async (limit = 20) => {
  return prisma.album.findMany({
    where: {
      isActive: true,
      tracks: { some: { isActive: true } },
    },
    orderBy: [
      { tracks: { _count: 'desc' } },
      { releaseDate: 'desc' },
    ],
    take: limit,
    select: albumSelect,
  });
};

export const getAlbums = async (req: Request) => {
  const { search, sortBy, sortOrder } = req.query;
  const user = req.user;

  const whereClause: Prisma.AlbumWhereInput = {};

  if (user && user.role !== Role.ADMIN && user.artistProfile?.id) {
    whereClause.artistId = user.artistProfile.id;
  }

  if (search && typeof search === 'string') {
    whereClause.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { artist: { artistName: { contains: search, mode: 'insensitive' } } },
      { genres: { every: { genre: { name: { contains: search, mode: 'insensitive' } } } } },
    ];
  }

  const orderByClause: Prisma.AlbumOrderByWithRelationInput = {};
  if (sortBy && typeof sortBy === 'string' && (sortOrder === 'asc' || sortOrder === 'desc')) {
    if (sortBy === 'title' || sortBy === 'type' || sortBy === 'releaseDate') {
      orderByClause[sortBy] = sortOrder;
    } else if (sortBy === 'totalTracks') {
      orderByClause.tracks = { _count: sortOrder };
    } else {
      orderByClause.releaseDate = 'desc';
    }
  } else {
    orderByClause.releaseDate = 'desc';
  }

  const result = await paginate<any>(prisma.album, req, {
    where: whereClause,
    include: {
      artist: { select: { id: true, artistName: true, avatar: true } },
      genres: { include: { genre: true } },
      tracks: { 
        select: trackSelect,
        orderBy: { trackNumber: 'asc' },
      },
      label: { select: { id: true, name: true, logoUrl: true } },
    },
    orderBy: orderByClause,
  });

  const formattedAlbums = result.data.map((album: any) => ({
    ...album,
    totalTracks: album.tracks?.length ?? 0,
    genres: album.genres,
    tracks: album.tracks,
  }));

  return {
    data: formattedAlbums,
    pagination: result.pagination,
  };
};

export const createAlbum = async (req: Request) => {
  const user = req.user;
  if (!user) throw new Error('Forbidden');

  const { title, releaseDate, type = AlbumType.ALBUM, genres = [], artistId } = req.body;
  const coverFile = req.file;

  const genreArray = Array.isArray(genres) ? genres : genres ? [genres] : [];
  const validationError = validateAlbumData({ title, releaseDate, type });
  if (validationError) throw new Error(validationError);

  let targetArtistProfileId: string;
  let fetchedArtistProfile: { 
    artistName: string | null; 
    labelId: string | null;
    id: string;
  } | null = null;

  if (user.role === Role.ADMIN && artistId) {
    const targetArtist = await prisma.artistProfile.findFirst({
      where: { id: artistId, isVerified: true, role: Role.ARTIST },
      select: { id: true, artistName: true, labelId: true },
    });
    if (!targetArtist) throw new Error('Artist profile not found or not verified');
    targetArtistProfileId = targetArtist.id;
    fetchedArtistProfile = targetArtist;
  } else if (user.artistProfile?.isVerified && user.artistProfile.role === Role.ARTIST) {
    targetArtistProfileId = user.artistProfile.id;
    fetchedArtistProfile = await prisma.artistProfile.findUnique({
      where: { id: targetArtistProfileId },
      select: { id: true, artistName: true, labelId: true },
    });
  } else {
    throw new Error('Not authorized to create albums');
  }

  if (!fetchedArtistProfile) {
    throw new Error('Could not retrieve artist profile information.');
  }

  const artistName = fetchedArtistProfile.artistName || 'Nghệ sĩ';
  const artistLabelId = fetchedArtistProfile.labelId;
  
  let coverUrl: string | null = null;
  if (coverFile) {
    const coverUpload = await uploadFile(coverFile.buffer, 'covers', 'image');
    coverUrl = coverUpload.secure_url;
  }

  const releaseDateObj = new Date(releaseDate);
  const isActive = releaseDateObj <= new Date();

  const albumData: Prisma.AlbumCreateInput = {
      title,
      coverUrl,
      releaseDate: releaseDateObj,
      type,
      duration: 0,
      totalTracks: 0,
      artist: { connect: { id: targetArtistProfileId } },
      isActive,
      genres: { create: genreArray.map((genreId: string) => ({ genre: { connect: { id: genreId } } })) },
  };

  if (artistLabelId) {
      albumData.label = { connect: { id: artistLabelId } };
  }

  const album = await prisma.album.create({
    data: albumData,
    select: albumSelect,
  });

  const followers = await prisma.userFollow.findMany({
    where: { followingArtistId: targetArtistProfileId, followingType: 'ARTIST' },
    select: { followerId: true },
  });

  const followerIds = followers.map((f) => f.followerId);
  const followerUsers = await prisma.user.findMany({
    where: { id: { in: followerIds } },
    select: { id: true, email: true },
  });

  const notificationsData = followers.map((follower) => ({
    type: NotificationType.NEW_ALBUM,
    message: `${artistName} just released a new album: ${title}`,
    recipientType: RecipientType.USER,
    userId: follower.followerId,
    artistId: targetArtistProfileId,
    senderId: targetArtistProfileId,
    albumId: album.id,
  }));

  if (notificationsData.length > 0) {
    await prisma.notification.createMany({ data: notificationsData });
  }

  const releaseLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/album/${album.id}`;
  const io = getIO();
  for (const user of followerUsers) {
    const room = `user-${user.id}`;
    io.to(room).emit('notification', {
      type: NotificationType.NEW_ALBUM,
      message: `${artistName} just released a new album: ${album.title}`,
      albumId: album.id,
    });

    if (user.email) {
      const emailOptions = emailService.createNewReleaseEmail(
        user.email,
        artistName,
        'album',
        album.title,
        releaseLink,
        album.coverUrl
      );
      await emailService.sendEmail(emailOptions);
    }
  }

  // Emit WebSocket event after creation
  io.emit('album:created', { album });

  return { message: 'Album created successfully', album };
};

export const addTracksToAlbum = async (req: Request) => {
  const user = req.user;
  const { albumId } = req.params;

  if (!user) throw new Error('Forbidden');

  // Fetch the album WITH its labelId
  const albumWithLabel = await prisma.album.findUnique({
    where: { id: albumId },
    select: { 
      artistId: true, 
      type: true, 
      coverUrl: true, 
      isActive: true, 
      labelId: true, // Select the labelId directly
      tracks: { select: { trackNumber: true } }
    }
  });

  if (!albumWithLabel) throw new Error('Album not found');
  if (!canManageAlbum(user, albumWithLabel.artistId)) throw new Error('You can only add tracks to your own albums');
  
  const albumLabelId = albumWithLabel.labelId; // Use the fetched labelId

  const files = req.files as Express.Multer.File[];
  if (!files || !files.length) throw new Error('No files uploaded');

  const existingTracks = await prisma.track.findMany({
    where: { albumId },
    select: { trackNumber: true },
  });

  const maxTrackNumber = existingTracks.length > 0 ? Math.max(...existingTracks.map((t) => t.trackNumber || 0)) : 0;

  const titles = Array.isArray(req.body.title) ? req.body.title : [req.body.title];
  const releaseDates = Array.isArray(req.body.releaseDate) ? req.body.releaseDate : [req.body.releaseDate];
  const featuredArtists = Array.isArray(req.body.featuredArtists)
    ? req.body.featuredArtists.map((artists: string) => artists?.split(',').map((id: string) => id.trim()).filter(Boolean) ?? [])
    : req.body.featuredArtists ? [req.body.featuredArtists.split(',').map((id: string) => id.trim()).filter(Boolean)] : [];
  const genres = Array.isArray(req.body.genres)
    ? req.body.genres.map((genreIds: string) => genreIds?.split(',').map((id: string) => id.trim()).filter(Boolean) ?? [])
    : req.body.genres ? [req.body.genres.split(',').map((id: string) => id.trim()).filter(Boolean)] : [];

  const mm = await import('music-metadata');
  const createdTracks = await Promise.all(
    files.map(async (file, index) => {
      const metadata = await mm.parseBuffer(file.buffer);
      const duration = Math.floor(metadata.format.duration || 0);
      const uploadResult = await uploadFile(file.buffer, 'tracks', 'auto');

      const existingTrack = await prisma.track.findFirst({
        where: { title: titles[index], artistId: albumWithLabel.artistId },
      });
      if (existingTrack) throw new Error(`Track with title "${titles[index]}" already exists for this artist.`);

      const newTrackNumber = maxTrackNumber + index + 1;
      
      const trackData: Prisma.TrackCreateInput = {
          title: titles[index],
          duration,
          releaseDate: new Date(releaseDates[index] || Date.now()),
          trackNumber: newTrackNumber,
          coverUrl: albumWithLabel.coverUrl,
          audioUrl: uploadResult.secure_url,
          artist: { connect: { id: albumWithLabel.artistId } },
          album: { connect: { id: albumId } },
          type: albumWithLabel.type,
          isActive: albumWithLabel.isActive,
          featuredArtists: 
            featuredArtists[index]?.length > 0
              ? { create: featuredArtists[index].map((artistProfileId: string) => ({ artistProfile: { connect: { id: artistProfileId } } })) }
              : undefined,
          genres:
            genres[index]?.length > 0
              ? { create: genres[index].map((genreId: string) => ({ genre: { connect: { id: genreId } } })) }
              : undefined,
      };

      // Automatically connect the track to the album's label if it exists
      if (albumLabelId) {
        trackData.label = { connect: { id: albumLabelId } }; // Use connect with ID
      }

      const track = await prisma.track.create({
        data: trackData,
        select: trackSelect,
      });
      return track;
    })
  );

  const tracks = await prisma.track.findMany({ where: { albumId }, select: { duration: true } });
  const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);

  const updatedAlbum = await prisma.album.update({
    where: { id: albumId },
    data: { duration: totalDuration, totalTracks: tracks.length },
    select: albumSelect,
  });

  // Emit event after updating album stats
  const io = getIO();
  io.emit('album:updated', { album: updatedAlbum });

  return { message: 'Tracks added to album successfully', album: updatedAlbum, tracks: createdTracks };
};

export const updateAlbum = async (req: Request) => {
  const { id } = req.params;
  const { title, releaseDate, type, labelId } = req.body;
  const coverFile = req.file;
  const user = req.user;

  if (!user) throw new Error('Forbidden');

  const album = await prisma.album.findUnique({
    where: { id },
    select: { artistId: true, coverUrl: true, labelId: true },
  });

  if (!album) throw new Error('Album not found');
  if (!canManageAlbum(user, album.artistId)) throw new Error('You can only update your own albums');

  let coverUrl: string | undefined;
  if (coverFile) {
    const coverUpload = await uploadFile(coverFile.buffer, 'covers', 'image');
    coverUrl = coverUpload.secure_url;
  }

  const updateData: any = {};
  if (title) updateData.title = title;

  if (releaseDate) {
    const newReleaseDate = new Date(releaseDate);
    updateData.releaseDate = newReleaseDate;
    updateData.isActive = newReleaseDate <= new Date();
  }
  if (type) updateData.type = type;
  if (coverUrl) updateData.coverUrl = coverUrl;

  // Xử lý labelId
  if (labelId !== undefined) {
    if (typeof labelId !== 'string' && labelId !== null) {
      throw new Error(`Invalid labelId type: expected string or null, got ${typeof labelId}`);
    }

    // Nếu labelId là null hoặc chuỗi rỗng, xóa label bằng cách đặt labelId thành null
    if (labelId === null || labelId === '') {
      updateData.labelId = null;
    } else {
      // Kiểm tra xem label có tồn tại không
      const labelExists = await prisma.label.findUnique({ where: { id: labelId } });
      if (!labelExists) throw new Error(`Invalid label ID: ${labelId} does not exist`);
      updateData.labelId = labelId;
    }
  }

  // Xử lý genres only if explicitly provided in the request body
  if (req.body.genres !== undefined) {
    await prisma.albumGenre.deleteMany({ where: { albumId: id } });

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

      updateData.genres = {
        create: validGenreIds.map((genreId: string) => ({
          genre: { connect: { id: genreId } },
        })),
      };
    } else {
      delete updateData.genres;
    }
  }

  // Handle isActive independently if provided
  if (req.body.isActive !== undefined) {
    updateData.isActive = req.body.isActive === 'true' || req.body.isActive === true;
  }

  const updatedAlbum = await prisma.album.update({
    where: { id },
    data: updateData,
    select: albumSelect,
  });

  // Emit WebSocket event after successful update
  const io = getIO();
  io.emit('album:updated', { album: updatedAlbum });

  return { message: 'Album updated successfully', album: updatedAlbum };
};

export const deleteAlbum = async (req: Request) => {
  const { id } = req.params;
  const user = req.user;

  if (!user) throw new Error('Forbidden');

  const album = await prisma.album.findUnique({
    where: { id },
    select: { artistId: true },
  });

  if (!album) throw new Error('Album not found');
  if (!canManageAlbum(user, album.artistId)) throw new Error('You can only delete your own albums');

  await deleteAlbumById(id);
  return { message: 'Album deleted successfully' };
};

export const toggleAlbumVisibility = async (req: Request) => {
  const { id } = req.params;
  const user = req.user;

  if (!user) throw new Error('Forbidden');

  const album = await prisma.album.findUnique({
    where: { id },
    select: { artistId: true, isActive: true },
  });

  if (!album) throw new Error('Album not found');

  const newIsActive = !album.isActive;

  if (!canManageAlbum(user, album.artistId)) throw new Error('You can only toggle your own albums');

  const updatedAlbum = await prisma.album.update({
    where: { id },
    data: { isActive: newIsActive },
    select: albumSelect,
  });

  // Emit WebSocket event
  const io = getIO();
  io.emit('album:visibilityChanged', { albumId: updatedAlbum.id, isActive: newIsActive });

  return {
    message: `Album ${newIsActive ? 'activated' : 'hidden'} successfully`,
    album: updatedAlbum,
  };
};

export const searchAlbum = async (req: Request) => {
  const { q, page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const user = req.user;

  if (!q) throw new Error('Query is required');
  const searchQuery = String(q).trim();

  if (user) {
    const existingHistory = await prisma.history.findFirst({
      where: { userId: user.id, type: HistoryType.SEARCH, query: { equals: searchQuery, mode: 'insensitive' } },
    });

    if (existingHistory) {
      await prisma.history.update({ where: { id: existingHistory.id }, data: { updatedAt: new Date() } });
    } else {
      await prisma.history.create({ data: { type: HistoryType.SEARCH, query: searchQuery, userId: user.id } });
    }
  }

  const whereClause: Prisma.AlbumWhereInput = {
    OR: [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { artist: { artistName: { contains: searchQuery, mode: 'insensitive' } } },
    ],
  };

  if (user?.currentProfile === 'ARTIST' && user?.artistProfile?.id) {
    whereClause.artistId = user.artistProfile.id;
  }

  if (!user || user.role !== Role.ADMIN) {
    if (user?.artistProfile?.isVerified && user?.currentProfile === 'ARTIST') {
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

  return {
    albums,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  };
};

export const getAdminAllAlbums = async (req: Request) => {
  const user = req.user;
  if (!user) throw new Error('Unauthorized');
  if (user.role !== Role.ADMIN && (!user.artistProfile?.isVerified || user.artistProfile?.role !== 'ARTIST')) {
    throw new Error('Forbidden: Only admins or verified artists can access this resource');
  }

  const { search, status, genres } = req.query;
  const whereClause: Prisma.AlbumWhereInput = {};

  if (user.role !== Role.ADMIN && user.artistProfile?.id) {
    whereClause.artistId = user.artistProfile.id;
  }

  const conditions: any[] = [];
  if (search) {
    conditions.push({
      OR: [
        { title: { contains: String(search), mode: 'insensitive' } },
        { artist: { artistName: { contains: String(search), mode: 'insensitive' } } },
      ],
    });
  }

  if (status) whereClause.isActive = status === 'true';
  if (genres) {
    const genreIds = Array.isArray(genres) ? genres : [genres];
    if (genreIds.length > 0) {
      conditions.push({ genres: { some: { genreId: { in: genreIds } } } });
    }
  }

  if (conditions.length > 0) whereClause.AND = conditions;

  // Determine sorting
  let orderBy: Prisma.AlbumOrderByWithRelationInput | Prisma.AlbumOrderByWithRelationInput[] = { releaseDate: 'desc' }; // Default sort
  const { sortBy, sortOrder } = req.query;
  const validSortFields = ['title', 'type', 'totalTracks', 'isActive', 'releaseDate'];
  if (sortBy && validSortFields.includes(String(sortBy))) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      if (sortBy === 'totalTracks') {
          orderBy = [{ tracks: { _count: order } }, { id: 'asc' }];
      } else {
          orderBy = [{ [String(sortBy)]: order }, { id: 'asc' }]; 
      }
  } else {
      orderBy = [{ releaseDate: 'desc' }, { id: 'asc' }];
  }

  const result = await paginate<any>(prisma.album, req, {
      where: whereClause,
      include: {
          artist: { select: { id: true, artistName: true, avatar: true, isVerified: true } },
          genres: { include: { genre: true } },
          tracks: { 
              where: { isActive: true },
              select: trackSelect,
              orderBy: { trackNumber: 'asc' },
          },
          label: { select: { id: true, name: true, logoUrl: true } },
      },
      orderBy: orderBy,
  });

  const formattedAlbums = result.data.map((album: any) => ({
      ...album,
      totalTracks: album.tracks?.length ?? 0, 
  }));

  return { albums: formattedAlbums, pagination: result.pagination };
};

export const getAlbumById = async (req: Request) => {
  const { id } = req.params;
  const user = req.user;
  const isAuthenticated = !!user;

  const album = await prisma.album.findUnique({
    where: { id, isActive: true },
    select: albumSelect,
  });

  if (!album) throw new Error('Album not found');
  return { ...album, requiresAuth: !isAuthenticated };
};

export const playAlbum = async (req: Request) => {
  const { albumId } = req.params;
  const user = req.user;

  if (!user) throw new Error('Unauthorized');

  const album = await prisma.album.findFirst({
    where: { id: albumId, isActive: true },
    include: { tracks: { where: { isActive: true }, orderBy: { trackNumber: 'asc' }, take: 1, select: trackSelect } },
  });

  if (!album || album.tracks.length === 0) throw new Error('Album or tracks not found');

  const firstTrack = album.tracks[0];
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const existingListen = await prisma.history.findFirst({
    where: { userId: user.id, track: { artistId: firstTrack.artistId }, createdAt: { gte: lastMonth } },
  });

  if (!existingListen) {
    await prisma.artistProfile.update({
      where: { id: firstTrack.artistId },
      data: { monthlyListeners: { increment: 1 } },
    });
  }

  await prisma.history.upsert({
    where: { userId_trackId_type: { userId: user.id, trackId: firstTrack.id, type: 'PLAY' } },
    update: { playCount: { increment: 1 }, updatedAt: new Date() },
    create: {
      type: 'PLAY',
      trackId: firstTrack.id,
      userId: user.id,
      duration: firstTrack.duration,
      completed: true,
      playCount: 1,
    },
  });

  return { message: 'Album playback started', track: firstTrack };
};