import { Request, Response } from 'express';
import prisma from '../config/db';
import {
  uploadTrack,
  saveMetadata,
  TrackMetadata,
} from '../services/discord.service';

const trackSelect = {
  id: true,
  title: true,
  artist: true,
  featuredArtists: true,
  duration: true,
  releaseDate: true,
  trackNumber: true,
  coverUrl: true,
  audioUrl: true,
  audioMessageId: true,
  album: {
    select: {
      id: true,
      title: true,
      coverUrl: true,
    },
  },
  uploadedBy: {
    select: {
      id: true,
      username: true,
      name: true,
    },
  },
  discordMessageId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const createTrack = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { title, artist, featuredArtists, duration, releaseDate } = req.body;
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;
    const audioFile = files?.['audio']?.[0];
    const coverFile = files?.['cover']?.[0];
    const user = req.user;

    if (!user?.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!audioFile) {
      res.status(400).json({ message: 'Audio file is required' });
      return;
    }

    // Upload audio file
    const { messageId: audioMessageId, url: audioUrl } = await uploadTrack(
      audioFile.buffer,
      audioFile.originalname,
      true,
      false // isAlbumTrack = false cho single tracks
    );

    // Upload cover if provided
    let coverUrl;
    if (coverFile) {
      const { url } = await uploadTrack(
        coverFile.buffer,
        coverFile.originalname,
        false, // isAudio = false
        false, // isAlbumTrack = false
        true // isMetadata = true (để lưu vào kênh audio-metadata)
      );
      coverUrl = url;
    }

    const metadata: TrackMetadata = {
      title,
      artist,
      featuredArtists: featuredArtists || null,
      duration: parseInt(duration),
      releaseDate: new Date(releaseDate).toISOString().split('T')[0],
      type: 'track',
    };

    const { messageId: metadataMessageId } = await saveMetadata(metadata);

    const track = await prisma.track.create({
      data: {
        title,
        artist,
        featuredArtists: featuredArtists || null,
        duration: parseInt(duration),
        releaseDate: new Date(releaseDate),
        coverUrl,
        audioUrl,
        audioMessageId,
        uploadedBy: {
          connect: { id: user.id },
        },
        discordMessageId: metadataMessageId,
      },
      select: trackSelect,
    });

    res.status(201).json({
      message: 'Track created successfully',
      track,
    });
  } catch (error) {
    console.error('Create track error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error:
        process.env.NODE_ENV === 'development'
          ? error instanceof Error
            ? error.message
            : String(error)
          : undefined,
    });
  }
};

// Lấy tất cả tracks
export const getAllTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tracks = await prisma.track.findMany({
      where: {
        isActive: true,
        albumId: null, // Chỉ lấy tracks không thuộc album nào
      },
      select: trackSelect,
      orderBy: { createdAt: 'desc' },
    });

    res.json(tracks);
  } catch (error) {
    console.error('Get tracks error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    });
  }
};

// Lấy track theo ID
export const getTrackById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const track = await prisma.track.findUnique({
      where: { id, isActive: true },
      select: trackSelect,
    });

    if (!track) {
      res.status(404).json({ message: 'Track không tồn tại' });
      return;
    }

    res.json(track);
  } catch (error) {
    console.error('Get track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy tracks theo artist
export const getTracksByArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { artist } = req.params;

    const tracks = await prisma.track.findMany({
      where: {
        artist: {
          contains: artist,
          mode: 'insensitive',
        },
        isActive: true,
      },
      select: trackSelect,
    });

    res.json(tracks);
  } catch (error) {
    console.error('Get tracks by artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cập nhật track
export const updateTrack = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, artist, duration, albumId } = req.body;

    const track = await prisma.track.update({
      where: { id },
      data: {
        title,
        artist,
        duration,
        albumId,
        updatedAt: new Date(),
      },
      select: trackSelect,
    });

    res.json({
      message: 'Track đã được cập nhật thành công',
      track,
    });
  } catch (error) {
    console.error('Update track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa track (soft delete)
export const deleteTrack = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.track.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Track đã được xóa thành công' });
  } catch (error) {
    console.error('Delete track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
