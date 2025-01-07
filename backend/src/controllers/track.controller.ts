import { Request, Response } from 'express';
import prisma from '../config/db';
import { uploadFile } from '../services/cloudinary.service';
import { saveTrackMetadata } from '../services/discord.service';

const trackSelect = {
  id: true,
  title: true,
  artist: {
    select: {
      id: true,
      name: true,
    },
  },
  featuredArtists: {
    select: {
      artist: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
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
    const { title, artistId, duration, releaseDate, albumId } = req.body;
    const featuredArtists = req.body.featuredArtists || [];
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

    const audioUpload: any = await uploadFile(
      audioFile.buffer,
      'tracks',
      'video'
    );
    const audioUrl = audioUpload.secure_url;

    let coverUrl: string | undefined;
    if (coverFile) {
      const coverUpload: any = await uploadFile(
        coverFile.buffer,
        'covers',
        'image'
      );
      coverUrl = coverUpload.secure_url;
    }

    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
      select: { name: true },
    });

    if (!artist) {
      res.status(400).json({ message: 'Artist not found' });
      return;
    }

    const featuredArtistsInfo =
      featuredArtists.length > 0
        ? await prisma.artist.findMany({
            where: { id: { in: featuredArtists } },
            select: { name: true },
          })
        : [];

    let albumData = null;
    if (albumId) {
      albumData = await prisma.album.findUnique({
        where: { id: albumId },
        select: { coverUrl: true },
      });
    }

    const track = await prisma.track.create({
      data: {
        title,
        artist: {
          connect: { id: artistId },
        },
        featuredArtists:
          featuredArtists.length > 0
            ? {
                connect: featuredArtists.map((id: string) => ({ id })),
              }
            : undefined,
        duration: parseInt(duration),
        releaseDate: new Date(releaseDate),
        coverUrl: coverUrl || albumData?.coverUrl,
        audioUrl,
        audioMessageId: null,
        discordMessageId: null,
        album: albumId
          ? {
              connect: { id: albumId },
            }
          : undefined,
        uploadedBy: {
          connect: { id: user.id },
        },
      },
      select: trackSelect,
    });

    const metadataUpload = await saveTrackMetadata({
      title: track.title,
      artist: artist.name,
      featuredArtists: featuredArtistsInfo.map((a) => a.name).join(', '),
      duration: track.duration,
      releaseDate: track.releaseDate.toISOString().split('T')[0],
      albumId: track.album?.id || null,
      type: 'track',
    });

    await prisma.track.update({
      where: { id: track.id },
      data: {
        discordMessageId: metadataUpload.messageId,
      },
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
          name: {
            equals: artist,
            mode: 'insensitive',
          },
        },
        isActive: true,
      },
      include: {
        album: true,
      },
    });

    res.json(tracks);
  } catch (error) {
    console.error('Get tracks by artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy tracks theo artistId
export const getTracksByArtistId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { artistId } = req.params;

    const tracks = await prisma.track.findMany({
      where: {
        artistId,
        isActive: true,
      },
      select: trackSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(tracks);
  } catch (error) {
    console.error('Get tracks by artist id error:', error);
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
              mode: 'insensitive',
              contains: String(q),
            },
          },
          {
            artist: {
              name: {
                mode: 'insensitive',
                contains: String(q),
              },
            },
          },
        ],
      },
      // Sử dụng select đúng với các trường trong model Track
      select: {
        id: true,
        title: true,
        duration: true,
        releaseDate: true,
        trackNumber: true,
        coverUrl: true,
        audioUrl: true,
        audioMessageId: true,
        artist: {
          select: {
            id: true,
            name: true,
            avatar: true,
            isVerified: true,
          },
        },
        featuredArtists: {
          select: {
            artist: {
              select: {
                id: true,
                name: true,
                avatar: true,
                isVerified: true,
              },
            },
          },
        },
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
      },
    });

    // Map lại kết quả để sử dụng coverUrl của album nếu track không có
    const mappedTracks = tracks.map((track) => ({
      ...track,
      coverUrl: track.coverUrl || track.album?.coverUrl || null,
      featuredArtists: track.featuredArtists.map((fa) => fa.artist), // Lấy thông tin artist từ featuredArtists
    }));

    res.json(mappedTracks);
  } catch (error) {
    console.error('Search track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
