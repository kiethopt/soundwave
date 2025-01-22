import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/session.service';
import prisma from '../config/db';

// Thêm interface cho Error mở rộng
interface ErrorWithCode extends Error {
  code?: string;
  status?: number;
}

// Danh sách các route yêu cầu session validation
const SESSION_REQUIRED_PATHS = [
  '/api/tracks/:trackId/play',
  '/api/albums/:albumId/play',
  '/api/admin/users/:id/deactivate',
];

export const sessionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Kiểm tra xem route hiện tại có yêu cầu session không
  const requiresSession = SESSION_REQUIRED_PATHS.some((path) => {
    const regex = new RegExp(`^${path.replace(/:\w+/g, '\\w+')}$`);
    return regex.test(req.path);
  });

  // Nếu route không yêu cầu session, bỏ qua middleware
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
    const isValidSession = await sessionService.validateSession(
      userId,
      sessionId
    );

    if (!isValidSession) {
      const error = new Error('Session expired or invalid') as ErrorWithCode;
      error.code = 'INVALID_SESSION';
      error.status = 401;
      return next(error);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });

    if (!user?.isActive) {
      await sessionService.handleUserDeactivation(userId);
      const error = new Error(
        'Your account has been deactivated'
      ) as ErrorWithCode;
      error.code = 'ACCOUNT_DEACTIVATED';
      error.status = 403;
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
};
