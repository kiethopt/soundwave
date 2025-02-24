import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

export const checkAndUpdateTrackStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tracks = await prisma.track.findMany({
      where: {
        isActive: false,
        releaseDate: {
          lte: new Date(),
        },
      },
    });

    if (tracks.length > 0) {
      await prisma.track.updateMany({
        where: {
          id: {
            in: tracks.map((track) => track.id),
          },
        },
        data: {
          isActive: true,
        },
      });

      console.log(`Updated ${tracks.length} tracks to active status`);
    }

    next();
  } catch (error) {
    console.error('Track status update error:', error);
    next();
  }
};
