import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../config/db';
import { userSelect } from '../utils/prisma-selects';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware xác thực
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ message: 'Access denied. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: userSelect,
    });

    if (!user) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware kiểm tra quyền
export const authorize = (roles: Role[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Kiểm tra nếu user không active
      if (!user.isActive) {
        res.status(403).json({
          message: 'Your account has been deactivated',
          code: 'ACCOUNT_DEACTIVATED',
        });
        return;
      }

      // ADMIN luôn có quyền truy cập
      if (user.role === Role.ADMIN) {
        return next();
      }

      // Kiểm tra quyền ARTIST
      if (roles.includes(Role.ARTIST)) {
        // Kiểm tra nếu user có artistProfile nhưng chưa switch sang profile ARTIST
        if (
          user.artistProfile?.isVerified &&
          user.currentProfile !== 'ARTIST'
        ) {
          res.status(403).json({
            message: 'Please switch to Artist profile to access this page',
            code: 'SWITCH_TO_ARTIST_PROFILE',
          });
          return;
        }

        // Kiểm tra quyền ARTIST thông qua currentProfile và artistProfile
        if (
          user.currentProfile === 'ARTIST' &&
          user.artistProfile?.isVerified
        ) {
          return next();
        }
      }

      // Kiểm tra quyền USER
      if (roles.includes(Role.USER) && user.role === Role.USER) {
        return next();
      }

      res.status(403).json({
        message: 'You do not have permission to perform this action',
      });
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};
