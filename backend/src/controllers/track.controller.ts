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
    const { title, artist, featuredArtists, duration, releaseDate, albumId } =
      req.body;
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

    // Lấy coverUrl từ album nếu có
    let albumData = null;
    if (albumId) {
      albumData = await prisma.album.findUnique({
        where: { id: albumId },
        select: { coverUrl: true },
      });
    }

    // Upload audio file
    const audioUpload = await uploadTrack(
      audioFile.buffer,
      audioFile.originalname,
      true,
      !!albumId
    );

    // Upload cover if provided or use album cover
    let coverUrl: string | undefined;
    if (coverFile) {
      const coverUpload = await uploadTrack(
        coverFile.buffer,
        coverFile.originalname,
        false,
        false,
        true
      );
      coverUrl = coverUpload.url;
    } else if (albumData?.coverUrl) {
      coverUrl = albumData.coverUrl;
    }

    const metadata: TrackMetadata = {
      title,
      artist,
      featuredArtists: featuredArtists || null,
      duration: parseInt(duration),
      releaseDate: new Date(releaseDate).toISOString().split('T')[0],
      albumId: albumId || null,
      type: 'track',
    };

    const metadataUpload = await saveMetadata(metadata);

    const track = await prisma.track.create({
      data: {
        title,
        artist,
        featuredArtists: featuredArtists || null,
        duration: parseInt(duration),
        releaseDate: new Date(releaseDate),
        coverUrl,
        audioUrl: audioUpload.url,
        audioMessageId: audioUpload.messageId,
        albumId: albumId || undefined,
        uploadedBy: {
          connect: { id: user.id },
        },
        discordMessageId: metadataUpload.messageId,
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
// export const getAllTracks = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     const tracks = await prisma.track.findMany({
//       where: {
//         isActive: true,
//         albumId: null, // Chỉ lấy tracks không thuộc album nào
//       },
//       select: trackSelect,
//       orderBy: { createdAt: 'desc' },
//     });

//     res.json(tracks);
//   } catch (error) {
//     console.error('Get tracks error:', error);
//     res.status(500).json({
//       message: 'Internal server error',
//       error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
//     });
//   }
// };

export const getAllTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tracks = await prisma.track.findMany({
      where: {
        isActive: true,
        albumId: null, // Lấy tracks không thuộc album nào
      },
      select: trackSelect,
      orderBy: { createdAt: 'desc' },
    });

    // Map lại kết quả để sử dụng coverUrl của album nếu track không có
    const mappedTracks = tracks.map((track) => ({
      ...track,
      coverUrl: track.coverUrl || track.album?.coverUrl || null,
    }));

    res.json(mappedTracks);
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

export const searchTrack = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { q } = req.query;
    const tracks = await prisma.track.findMany({
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
      select: {
        ...trackSelect,
        album: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
          },
        },
      },
    });

    // Map lại kết quả để sử dụng coverUrl của album nếu track không có
    const mappedTracks = tracks.map((track) => ({
      ...track,
      coverUrl: track.coverUrl || track.album?.coverUrl || null,
    }));

    res.json(mappedTracks);
  } catch (error) {
    console.error('Search track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
