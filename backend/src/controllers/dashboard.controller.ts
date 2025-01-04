import { Request, Response } from 'express';
import prisma from '../config/db';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [tracks, albums, users, artists] = await Promise.all([
      prisma.track.count(),
      prisma.album.count(),
      prisma.user.count(),
      prisma.artist.count(),
    ]);

    res.json({ tracks, albums, users, artists });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
