import { Request, Response, NextFunction } from 'express';
import jwt, {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
} from 'jsonwebtoken';
import prisma from '../config/db';
import { clients } from '..';

interface JwtPayload {
  userId: string;
}

export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Không tìm thấy token xác thực' });
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: {
          id: decoded.userId,
        },
      });

      if (!user) {
        res.status(401).json({ message: 'User không tồn tại' });
        return;
      }

      if (!user.isActive) {
        // Gửi event force logout
        const logoutEvent = {
          type: 'FORCE_LOGOUT',
          userId: decoded.userId,
          message: 'Tài khoản đã bị vô hiệu hóa',
          timestamp: new Date().toISOString(),
        };

        clients.forEach((client) => {
          client(logoutEvent);
        });

        res.status(401).json({
          message: 'Tài khoản đã bị vô hiệu hóa',
          forceLogout: true,
        });
        return;
      }

      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError instanceof TokenExpiredError) {
        res.status(401).json({ message: 'Token đã hết hạn' });
        return;
      }
      throw jwtError;
    }
  } catch (error) {
    next(error);
  }
};

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Không có quyền truy cập' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const checkUserActive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { isActive: true },
    });

    if (!user?.isActive) {
      res.status(401).json({
        message: 'Tài khoản đã bị vô hiệu hóa',
        forceLogout: true,
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
