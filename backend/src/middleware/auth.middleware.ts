import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware xác thực
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log('Checking authentication...'); // Log để debug
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    console.log('No token provided'); // Log để debug
    res.status(401).json({ message: 'Access denied. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      role: Role;
      isVerified: boolean;
      verificationRequestedAt?: string;
    };
    req.user = decoded;
    console.log('User authenticated:', decoded); // Log để debug
    next();
  } catch (error) {
    // Xử lý lỗi token hết hạn
    if (error instanceof TokenExpiredError) {
      console.log('Token expired at:', error.expiredAt); // Log thời gian hết hạn
      res.status(401).json({ message: 'Token expired. Please log in again.' });
      return;
    }

    // Xử lý lỗi token không hợp lệ
    if (error instanceof JsonWebTokenError) {
      console.log('Invalid token:', error.message); // Log thông báo lỗi
      res.status(401).json({ message: 'Invalid token. Please log in again.' });
      return;
    }

    // Xử lý các lỗi khác
    console.error('Unexpected authentication error:', error); // Log lỗi không mong đợi
    res
      .status(500)
      .json({ message: 'Internal server error during authentication.' });
  }
};

// Middleware kiểm tra quyền
export const authorize = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      res
        .status(403)
        .json({ message: 'You do not have permission to perform this action' });
      return;
    }
    next();
  };
};
