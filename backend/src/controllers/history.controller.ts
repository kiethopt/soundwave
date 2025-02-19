import { Request, Response } from 'express';
import prisma from '../config/db';
import { HistoryType } from '@prisma/client';
import { historySelect } from '../utils/prisma-selects';

// Lưu lịch sử nghe nhạc
export const savePlayHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trackId, duration, completed } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!trackId) {
      res.status(400).json({ message: 'Track ID is required' });
      return;
    }

    // Check if the track exists and get artistId
    const track = await prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true, artistId: true },
    });

    if (!track) {
      res.status(404).json({ message: 'Track not found' });
      return;
    }

    const artistId = track.artistId;
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Check if the user has listened to any track from this artist in the past month
    const existingListen = await prisma.history.findFirst({
      where: {
        userId: user.id,
        track: { artistId: artistId },
        createdAt: { gte: lastMonth },
      },
    });

    // Increase artist's monthly listeners only if this is a new listen
    if (!existingListen) {
      await prisma.artistProfile.update({
        where: { id: artistId },
        data: { monthlyListeners: { increment: 1 } },
      });
    }

    // Save play history using upsert
    const history = await prisma.history.upsert({
      where: {
        userId_trackId_type: {
          userId: user.id,
          trackId: trackId,
          type: 'PLAY',
        },
      },
      update: {
        updatedAt: new Date(),
        completed, // Update completion status
        ...(completed && { playCount: { increment: 1 } }), // Increment only if completed
      },
      create: {
        type: HistoryType.PLAY,
        duration,
        completed,
        trackId,
        userId: user.id,
        playCount: completed ? 1 : 0, // Only set playCount if completed
      },
      select: historySelect,
    });

    // Increment playCount for track only if completed
    if (completed) {
      await prisma.track.update({
        where: { id: trackId },
        data: {
          playCount: { increment: 1 },
        },
      });
    }

    res.status(201).json({
      message: 'Play history saved successfully',
      history,
    });
  } catch (error) {
    console.error('Save play history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



// Lưu lịch sử tìm kiếm
export const saveSearchHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { query } = req.body;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!query?.trim()) {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }

    // Lưu lịch sử tìm kiếm
    const history = await prisma.history.create({
      data: {
        type: HistoryType.SEARCH,
        query,
        userId: user.id,
        duration: null,
        completed: null,
        playCount: null,
      },
      select: historySelect,
    });

    res.status(201).json({
      message: 'Search history saved successfully',
      history,
    });
  } catch (error) {
    console.error('Save search history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy lịch sử nghe nhạc của người dùng
export const getPlayHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const histories = await prisma.history.findMany({
      where: {
        userId: user.id,
        type: HistoryType.PLAY,
      },
      select: historySelect,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: Number(limit),
    });

    const totalHistories = await prisma.history.count({
      where: {
        userId: user.id,
        type: HistoryType.PLAY,
      },
    });

    res.json({
      histories,
      pagination: {
        total: totalHistories,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalHistories / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get play history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy lịch sử tìm kiếm của người dùng
export const getSearchHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const histories = await prisma.history.findMany({
      where: {
        userId: user.id,
        type: HistoryType.SEARCH,
      },
      select: historySelect,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: Number(limit),
    });

    const totalHistories = await prisma.history.count({
      where: {
        userId: user.id,
        type: HistoryType.SEARCH,
      },
    });

    res.json({
      histories,
      pagination: {
        total: totalHistories,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalHistories / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get search history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy tất cả lịch sử (nghe nhạc và tìm kiếm) của người dùng
export const getAllHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Lấy tất cả lịch sử của người dùng
    const histories = await prisma.history.findMany({
      where: {
        userId: user.id,
      },
      select: historySelect,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: Number(limit),
    });

    const totalHistories = await prisma.history.count({
      where: {
        userId: user.id,
      },
    });

    res.json({
      histories,
      pagination: {
        total: totalHistories,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalHistories / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
