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

    if (!user.isActive) {
      res.status(403).json({
        message: 'Your account has been deactivated',
        code: 'ACCOUNT_DEACTIVATED',
      });
      return;
    }

    // Check maintenance mode - REMOVED

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Optional authentication - attempts to authenticate but doesn't block if no token
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      // Check maintenance mode - REMOVED

      // Continue without authentication
      next();
      return;
    }

    // Token was provided, try to authenticate
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: userSelect,
      });

      if (user && user.isActive) {
        req.user = user;
      }
      // Even if authentication fails, we continue
      next();
    } catch (error) {
      // Token invalid, but still continue without authentication
      console.error('Invalid token provided:', error);
      next();
    }
  } catch (error) {
    // Any other error, still continue
    console.error('Error in optional authentication:', error);
    next();
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

      // ADMIN luôn có quyền truy cập
      if (user.role === Role.ADMIN) {
        return next();
      }

      // Kiểm tra quyền ARTIST
      if (roles.includes(Role.ARTIST)) {
        // Kiểm tra nếu artist profile không tồn tại hoặc chưa được verify
        if (!user.artistProfile?.isVerified) {
          res.status(403).json({
            message: 'Your artist profile is not verified yet',
            code: 'ARTIST_NOT_VERIFIED',
          });
          return;
        }

        // Kiểm tra nếu artist profile bị deactivate
        if (!user.artistProfile?.isActive) {
          res.status(403).json({
            message:
              'Your artist profile has been deactivated. Please contact admin',
            code: 'ARTIST_DEACTIVATED',
          });
          return;
        }

        // Kiểm tra nếu chưa switch sang profile ARTIST
        if (user.currentProfile !== 'ARTIST') {
          res.status(403).json({
            message: 'Please switch to Artist profile to access this page',
            code: 'SWITCH_TO_ARTIST_PROFILE',
          });
          return;
        }

        return next();
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
