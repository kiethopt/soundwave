import { Request, Response, NextFunction } from 'express';
import { client as redis } from './cache.middleware';
import prisma from '../config/db';

interface ErrorWithCode extends Error {
  code?: string;
  status?: number;
}

const SESSION_REQUIRED_PATHS = [
  '/api/tracks/:trackId/play',
  '/api/albums/:albumId/play',
  '/api/admin/users/:id/deactivate',
  '/api/user/profile',
  '/api/user/playlists',
  '/api/user/favorites',
  '/api/user/history',
];

export const sessionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const requiresSession = SESSION_REQUIRED_PATHS.some((path) => {
    const regex = new RegExp(`^${path.replace(/:\w+/g, '\\w+')}$`);
    return regex.test(req.path);
  });

  if (!requiresSession) {
    return next();
  }

  const sessionId = req.header('Session-ID');
  const userId = req.user?.id;

  if (!sessionId || !userId) {
    const error = new Error(
      'Unauthorized: Missing session ID or user ID'
    ) as ErrorWithCode;
    error.code = 'MISSING_CREDENTIALS';
    error.status = 401;
    return next(error);
  }

  try {
    // Kiểm tra session trong Redis
    const sessionData = await redis.hGet(`user_sessions:${userId}`, sessionId);

    if (!sessionData) {
      const error = new Error('Session expired or invalid') as ErrorWithCode;
      error.code = 'INVALID_SESSION';
      error.status = 401;
      return next(error);
    }

    // Kiểm tra trạng thái active của user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    if (!user?.isActive) {
      // Xóa session nếu tài khoản bị khóa
      await redis.del(`user_sessions:${userId}`);

      const error = new Error(
        'Your account has been deactivated. Please contact admin'
      ) as ErrorWithCode;
      error.code = 'ACCOUNT_DEACTIVATED';
      error.status = 403;
      return next(error);
    }

    // Refresh session TTL
    await redis.expire(`user_sessions:${userId}`, 24 * 60 * 60); // 24 hours
    next();
  } catch (error) {
    next(error);
  }
};
