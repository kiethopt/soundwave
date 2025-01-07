import { Request, Response } from 'express';
import prisma from '../config/db';
import { saveArtistMetadata } from '../services/discord.service';
import { uploadFile } from '../services/cloudinary.service';

const artistSelect = {
  id: true,
  name: true,
  bio: true,
  avatar: true,
  isVerified: true,
  monthlyListeners: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  discordMessageId: true,
  _count: {
    select: {
      tracks: true,
      albums: true,
    },
  },
} as const;

// Select cho tracks của artist
const artistTrackSelect = {
  id: true,
  title: true,
  duration: true,
  releaseDate: true,
  trackNumber: true,
  coverUrl: true,
  audioUrl: true,
  playCount: true,
  album: {
    select: {
      id: true,
      title: true,
      coverUrl: true,
    },
  },
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
      id: true,
      name: true,
      avatar: true,
      isVerified: true,
    },
  },
  followers: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
} as const;

// Lấy tất cả artists
export const getAllArtists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const artists = await prisma.artist.findMany({
      where: {
        isActive: true,
      },
      select: artistSelect,
      orderBy: {
        monthlyListeners: 'desc',
      },
    });

    res.json(artists);
  } catch (error) {
    console.error('Get all artists error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Tìm kiếm artist
export const searchArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q) {
      res.status(400).json({ message: 'Query is required' });
      return;
    }

    const artists = await prisma.artist.findMany({
      where: {
        isActive: true,
        name: {
          contains: String(q),
          mode: 'insensitive',
        },
      },
      select: artistSelect,
    });

    res.json(artists);
  } catch (error) {
    console.error('Search artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get artist theo ID
export const getArtistById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const artist = await prisma.artist.findUnique({
      where: {
        id,
        isActive: true,
      },
      select: artistSelect,
    });

    if (!artist) {
      res.status(404).json({ message: 'Artist không tồn tại' });
      return;
    }

    res.json(artist);
  } catch (error) {
    console.error('Get artist by id error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get tracks của artist
export const getArtistTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const tracks = await prisma.track.findMany({
      where: {
        OR: [
          { artistId: id }, // Main artist
          { featuredArtists: { some: { id } } }, // Featured artist
        ],
        isActive: true,
      },
      select: artistTrackSelect,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Map lại kết quả để sử dụng coverUrl của album nếu track không có
    const mappedTracks = tracks.map((track) => ({
      ...track,
      coverUrl: track.coverUrl || track.album?.coverUrl || null,
    }));

    res.json(mappedTracks);
  } catch (error) {
    console.error('Get artist tracks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Tạo artist mới
export const createArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, bio } = req.body;
    const avatarFile = req.file;

    let avatarUrl: string | undefined;

    if (avatarFile) {
      // Upload avatar lên Cloudinary
      const avatarUpload: any = await uploadFile(
        avatarFile.buffer,
        'artists',
        'image'
      );
      avatarUrl = avatarUpload.secure_url;
    }

    const artist = await prisma.artist.create({
      data: {
        name,
        bio,
        avatar: avatarUrl,
      },
      select: artistSelect,
    });

    // Lấy số lượng followers
    const followers = await prisma.userFollowArtist.count({
      where: { artistId: artist.id },
    });

    // Gửi thông báo metadata vào kênh Discord
    const metadataUpload = await saveArtistMetadata({
      name: artist.name,
      bio: artist.bio || undefined,
      isVerified: artist.isVerified,
      monthlyListeners: artist.monthlyListeners,
      followers, // Thêm số lượng followers
      type: 'artist',
    });

    // Cập nhật discordMessageId vào database
    await prisma.artist.update({
      where: { id: artist.id },
      data: {
        discordMessageId: metadataUpload.messageId,
      },
    });

    res.status(201).json({
      message: 'Artist đã được tạo thành công',
      artist,
    });
  } catch (error) {
    console.error('Create artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cập nhật artist
export const updateArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, bio } = req.body;
    const avatarFile = req.file;

    let avatarUrl: string | undefined;

    if (avatarFile) {
      // Upload avatar lên Cloudinary
      const avatarUpload: any = await uploadFile(
        avatarFile.buffer,
        'artists',
        'image'
      );
      avatarUrl = avatarUpload.secure_url;
    }

    const artist = await prisma.artist.update({
      where: { id },
      data: {
        name,
        bio,
        avatar: avatarFile ? avatarUrl : undefined,
        updatedAt: new Date(),
      },
      select: artistSelect,
    });

    // Lấy số lượng followers
    const followers = await prisma.userFollowArtist.count({
      where: { artistId: artist.id },
    });

    // Gửi thông báo metadata vào kênh Discord
    if (artist.discordMessageId) {
      await saveArtistMetadata(
        {
          name: artist.name,
          bio: artist.bio || undefined,
          isVerified: artist.isVerified,
          monthlyListeners: artist.monthlyListeners,
          followers,
          type: 'artist',
        },
        artist.discordMessageId // Cập nhật message hiện có
      );
    }

    res.json({
      message: 'Artist đã được cập nhật thành công',
      artist,
    });
  } catch (error) {
    console.error('Update artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xóa artist (soft delete)
export const deleteArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.artist.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Artist đã được xóa thành công' });
  } catch (error) {
    console.error('Delete artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Xác minh artist
export const verifyArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const artist = await prisma.artist.update({
      where: { id },
      data: {
        isVerified: true,
        updatedAt: new Date(),
      },
      select: artistSelect,
    });

    // Lấy số lượng followers
    const followers = await prisma.userFollowArtist.count({
      where: { artistId: artist.id },
    });

    // Cập nhật metadata trên Discord
    if (artist.discordMessageId) {
      await saveArtistMetadata(
        {
          name: artist.name,
          bio: artist.bio || undefined,
          isVerified: artist.isVerified,
          monthlyListeners: artist.monthlyListeners,
          followers,
          type: 'artist',
        },
        artist.discordMessageId // Cập nhật message hiện có
      );
    }

    res.json({
      message: 'Artist đã được xác minh thành công',
      artist,
    });
  } catch (error) {
    console.error('Verify artist error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cập nhật monthly listeners
export const updateMonthlyListeners = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const artists = await prisma.artist.findMany({
      where: { isActive: true },
      select: { id: true, discordMessageId: true },
    });

    await Promise.all(
      artists.map(async (artist) => {
        const monthlyListeners = await prisma.history.groupBy({
          by: ['userId'],
          where: {
            OR: [
              { track: { artistId: artist.id } },
              { track: { featuredArtists: { some: { id: artist.id } } } },
            ],
            type: 'PLAY',
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          _count: true,
        });

        // Lấy số lượng followers
        const followers = await prisma.userFollowArtist.count({
          where: { artistId: artist.id },
        });

        const updatedArtist = await prisma.artist.update({
          where: { id: artist.id },
          data: {
            monthlyListeners: monthlyListeners.length,
            updatedAt: new Date(),
          },
          select: artistSelect,
        });

        if (artist.discordMessageId) {
          await saveArtistMetadata(
            {
              name: updatedArtist.name,
              bio: updatedArtist.bio || undefined,
              isVerified: updatedArtist.isVerified,
              monthlyListeners: updatedArtist.monthlyListeners,
              followers, // Thêm số lượng followers
              type: 'artist',
            },
            artist.discordMessageId
          );
        }
      })
    );

    // Do not send a response here
  } catch (error) {
    console.error('Update monthly listeners error:', error);
    // Do not send a response here
  }
};
