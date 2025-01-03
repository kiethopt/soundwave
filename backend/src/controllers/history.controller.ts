import { Request, Response } from 'express';
import prisma from '../config/db';

export const saveHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { type, trackId, duration, completed, query } = req.body;
    const userId = req.user!.id;

    // Validate history type
    if (!['PLAY', 'SEARCH'].includes(type)) {
      res.status(400).json({ message: 'Invalid history type' });
      return;
    }

    if (type === 'PLAY') {
      // Validate required fields for PLAY
      if (!trackId) {
        res
          .status(400)
          .json({ message: 'trackId is required for PLAY history' });
        return;
      }

      // Upsert PLAY history
      const history = await prisma.history.upsert({
        where: {
          userId_trackId: {
            userId,
            trackId,
          },
        },
        update: {
          duration,
          completed,
          playCount: { increment: 1 },
          updatedAt: new Date(),
        },
        create: {
          type: 'PLAY',
          userId,
          trackId,
          duration,
          completed,
          playCount: 1,
        },
      });

      // Tăng playCount của track
      await prisma.track.update({
        where: { id: trackId },
        data: {
          playCount: { increment: 1 },
        },
      });

      res.status(200).json(history);
    } else if (type === 'SEARCH') {
      // Validate required fields for SEARCH
      if (!query) {
        res
          .status(400)
          .json({ message: 'query is required for SEARCH history' });
        return;
      }

      // Create SEARCH history
      const history = await prisma.history.create({
        data: {
          type: 'SEARCH',
          userId,
          query,
          playCount: 0, // Set playCount = 0 cho SEARCH history
        },
      });

      res.status(200).json(history);
    }
  } catch (error) {
    console.error('Save history error:', error);
    res.status(500).json({ message: 'Failed to save history' });
  }
};

export const getHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const userId = req.user!.id;

    const skip = (Number(page) - 1) * Number(limit);

    const [history, total] = await Promise.all([
      prisma.history.findMany({
        where: {
          userId,
          type: type as 'PLAY' | 'SEARCH',
        },
        include: {
          track: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      prisma.history.count({
        where: {
          userId,
          type: type as 'PLAY' | 'SEARCH',
        },
      }),
    ]);

    res.status(200).json({
      history,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get history' });
  }
};

export const deleteHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.history.delete({
      where: {
        id,
        userId, // Đảm bảo user chỉ xóa được history của mình
      },
    });

    res.status(200).json({ message: 'History deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete history' });
  }
};

export const clearHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { type } = req.query;

    await prisma.history.deleteMany({
      where: {
        userId,
        type: type as 'PLAY' | 'SEARCH',
      },
    });

    res.status(200).json({ message: 'History cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear history' });
  }
};
