import { Request, Response } from 'express';
import prisma from '../config/db';
import {
  uploadTrack,
  saveMetadata,
  AlbumMetadata,
  updateAlbumMetadata,
  TrackMetadata,
} from '../services/discord.service';
import { getErrorMessage } from '../middleware/error';

const albumSelect = {
  id: true,
  title: true,
  artist: true,
  releaseDate: true,
  trackCount: true,
  coverUrl: true,
  uploadedBy: {
    select: {
      id: true,
      username: true,
      name: true,
    },
  },
  tracks: {
    where: { isActive: true },
    orderBy: { trackNumber: 'asc' },
    select: {
      id: true,
      title: true,
      artist: true,
      featuredArtists: true,
      duration: true,
      trackNumber: true,
      audioUrl: true,
      audioMessageId: true,
      discordMessageId: true,
    },
  },
  discordMessageId: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Validation functions
const validateAlbumData = (
  title: string,
  artist: string,
  releaseDate: string
): string | null => {
  if (!title || title.trim().length === 0) {
    return 'Title không được để trống';
  }
  if (!artist || artist.trim().length === 0) {
    return 'Artist không được để trống';
  }
  if (!releaseDate || isNaN(Date.parse(releaseDate))) {
    return 'Release date không hợp lệ';
  }
  return null;
};

// Lấy tất cả albums
export const getAllAlbums = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const albums = await prisma.album.findMany({
      where: {
        isActive: true,
      },
      select: albumSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(albums);
  } catch (error) {
    console.error('Get all albums error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy album theo ID
export const getAlbumById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const album = await prisma.album.findUnique({
      where: {
        id,
        isActive: true,
      },
      select: albumSelect,
    });

    if (!album) {
      res.status(404).json({ message: 'Album không tồn tại' });
      return;
    }

    res.json(album);
  } catch (error) {
    console.error('Get album by id error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy albums theo artist
export const getAlbumsByArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { artist } = req.params;

    const albums = await prisma.album.findMany({
      where: {
        artist: {
          contains: artist,
          mode: 'insensitive',
        },
        isActive: true,
      },
      select: albumSelect,
      orderBy: {
        releaseDate: 'desc',
      },
    });

    res.json(albums);
  } catch (error) {
    console.error('Get albums by artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy tracks của album
export const getAlbumTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const album = await prisma.album.findUnique({
      where: {
        id,
        isActive: true,
      },
      select: {
        tracks: {
          where: { isActive: true },
          orderBy: { trackNumber: 'asc' },
          select: {
            id: true,
            title: true,
            artist: true,
            featuredArtists: true,
            duration: true,
            trackNumber: true,
            audioUrl: true,
            discordMessageId: true,
          },
        },
      },
    });

    if (!album) {
      res.status(404).json({ message: 'Album không tồn tại' });
      return;
    }

    res.json(album.tracks);
  } catch (error) {
    console.error('Get album tracks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Tạo album mới
export const createAlbum = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { title, artist, releaseDate } = req.body;
    const coverFile = req.file;
    const user = req.user;

    if (!user?.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const validationError = validateAlbumData(title, artist, releaseDate);
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    if (!coverFile) {
      res.status(400).json({ message: 'Cover image là bắt buộc' });
      return;
    }

    const { messageId: coverMessageId, url: coverUrl } = await uploadTrack(
      coverFile.buffer,
      coverFile.originalname,
      false, // isAudio = false vì là ảnh
      true, // isAlbumTrack = true vì là cover của album
      true // isMetadata = true để lưu vào kênh audio-metadata
    );

    const metadata: AlbumMetadata = {
      title,
      artist,
      releaseDate,
      trackCount: 0,
      type: 'album' as const,
    };

    const { messageId: metadataMessageId } = await saveMetadata(metadata);

    const album = await prisma.album.create({
      data: {
        title,
        artist,
        releaseDate: new Date(releaseDate),
        trackCount: 0,
        coverUrl,
        discordMessageId: metadataMessageId,
        uploadedBy: {
          connect: { id: user.id },
        },
      },
      select: albumSelect,
    });

    res.status(201).json({
      message: 'Album đã được tạo thành công',
      album,
    });
  } catch (error) {
    console.error('Create album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const uploadAlbumTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    const user = req.user;

    if (!user?.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        tracks: {
          where: { isActive: true },
          orderBy: { trackNumber: 'asc' },
        },
      },
    });

    if (!album) {
      res.status(404).json({ message: 'Album không tồn tại' });
      return;
    }

    const uploadedTracks = await Promise.all(
      files.map(async (file, index) => {
        const { messageId: audioMessageId, url: audioUrl } = await uploadTrack(
          file.buffer,
          file.originalname,
          true, // isAudio
          true, // isAlbumTrack - thêm parameter này
          false // isMetadata
        );

        const title =
          req.body[`title_${index}`] ||
          file.originalname.replace(/\.[^/.]+$/, '');
        const artist = req.body[`artist_${index}`] || album.artist;
        const featuredArtists = req.body[`featuredArtists_${index}`] || null;
        const duration = parseInt(req.body[`duration_${index}`]) || 0;
        const trackNumber =
          parseInt(req.body[`trackNumber_${index}`]) ||
          album.tracks.length + index + 1;

        const metadata: TrackMetadata = {
          title,
          artist,
          featuredArtists,
          duration,
          releaseDate: album.releaseDate.toISOString().split('T')[0],
          albumId: album.id,
          type: 'track',
        };

        const { messageId: metadataMessageId } = await saveMetadata(metadata);

        return prisma.track.create({
          data: {
            title,
            artist,
            featuredArtists,
            duration,
            releaseDate: album.releaseDate,
            trackNumber,
            audioUrl,
            audioMessageId,
            album: { connect: { id: album.id } },
            uploadedBy: { connect: { id: user.id } },
            discordMessageId: metadataMessageId,
          },
          select: {
            id: true,
            title: true,
            artist: true,
            featuredArtists: true,
            duration: true,
            trackNumber: true,
            audioUrl: true,
            audioMessageId: true,
            discordMessageId: true,
          },
        });
      })
    );

    const updatedAlbum = await prisma.album.update({
      where: { id },
      data: {
        trackCount: {
          increment: files.length,
        },
      },
      select: albumSelect,
    });

    await updateAlbumMetadata(updatedAlbum.discordMessageId, {
      title: updatedAlbum.title,
      artist: updatedAlbum.artist,
      releaseDate: updatedAlbum.releaseDate.toISOString().split('T')[0],
      trackCount: updatedAlbum.trackCount,
      type: 'album',
    });

    res.status(201).json({
      message: 'Tracks uploaded successfully',
      tracks: uploadedTracks,
    });
  } catch (error) {
    console.error('Upload album tracks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cập nhật album
export const updateAlbum = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, artist, releaseDate } = req.body;

    const validationError = validateAlbumData(title, artist, releaseDate);
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    const album = await prisma.album.update({
      where: { id },
      data: {
        title,
        artist,
        releaseDate: new Date(releaseDate),
        updatedAt: new Date(),
      },
      select: albumSelect,
    });

    await updateAlbumMetadata(album.discordMessageId, {
      title: album.title,
      artist: album.artist,
      releaseDate: album.releaseDate.toISOString().split('T')[0],
      trackCount: album.trackCount,
      type: 'album',
    });

    res.json({
      message: 'Album đã được cập nhật thành công',
      album,
    });
  } catch (error) {
    console.error('Update album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Thay đổi thứ tự các tracks trong album
export const reorderAlbumTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { tracks } = req.body as {
      tracks: { id: string; trackNumber: number }[];
    };

    // Update all tracks in a transaction
    await prisma.$transaction(
      tracks.map((track) =>
        prisma.track.update({
          where: { id: track.id },
          data: { trackNumber: track.trackNumber },
        })
      )
    );

    const updatedAlbum = await prisma.album.findUnique({
      where: { id },
      select: albumSelect,
    });

    res.json(updatedAlbum);
  } catch (error) {
    console.error('Reorder tracks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa album (soft delete)
export const deleteAlbum = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.album.update({
      where: { id },
      data: { isActive: false },
    });

    // Soft delete all tracks of the album
    await prisma.track.updateMany({
      where: { albumId: id },
      data: { isActive: false },
    });

    res.json({ message: 'Album đã được xóa thành công' });
  } catch (error) {
    console.error('Delete album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const searchAlbum = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q) {
      res.status(400).json({ message: 'Query is required' });
      return;
    }

    const albums = await prisma.album.findMany({
      where: {
        isActive: true,
        OR: [
          {
            title: {
              contains: String(q),
              mode: 'insensitive',
            },
          },
          {
            artist: {
              contains: String(q),
              mode: 'insensitive',
            },
          },
        ],
      },
      select: albumSelect,
    });

    res.json(albums);
  } catch (error) {
    console.error('Search album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
