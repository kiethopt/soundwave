import { Request, Response, NextFunction } from 'express';
import jwt, {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
} from 'jsonwebtoken';
import prisma from '../config/db';

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
          isActive: true, // Chỉ cho phép user đang active
        },
      });

      if (!user) {
        res
          .status(401)
          .json({ message: 'User không tồn tại hoặc đã bị vô hiệu hóa' });
        return;
      }

      req.user = user;
      next();
    } catch (jwtError) {
      if (jwtError instanceof TokenExpiredError) {
        res.status(401).json({ message: 'Token đã hết hạn' });
        return;
      }
      if (jwtError instanceof JsonWebTokenError) {
        res.status(401).json({ message: 'Token không hợp lệ' });
        return;
      }
      if (jwtError instanceof NotBeforeError) {
        res.status(401).json({ message: 'Token chưa có hiệu lực' });
        return;
      }
      throw jwtError; // Ném các lỗi khác để error handler xử lý
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
