import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware xác thực
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
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

    // Lấy thông tin user từ database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        role: true,
        isActive: true,
        artistProfile: {
          select: {
            id: true,
            isVerified: true,
            verificationRequestedAt: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Kiểm tra trạng thái active trừ khi là ADMIN
    if (!user.isActive && user.role !== Role.ADMIN) {
      res.status(403).json({
        message:
          'Your account has been deactivated. Please contact administrator.',
        code: 'ACCOUNT_DEACTIVATED',
      });
      return;
    }

    // Gán thông tin user vào request
    req.user = {
      id: user.id,
      role: user.role,
      isActive: user.isActive,
      artistProfile: user.artistProfile
        ? {
            id: user.artistProfile.id,
            isVerified: user.artistProfile.isVerified,
            verificationRequestedAt:
              user.artistProfile.verificationRequestedAt?.toISOString() || null,
          }
        : undefined,
    };

    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      res.status(401).json({ message: 'Token expired. Please log in again.' });
      return;
    }

    if (error instanceof JsonWebTokenError) {
      res.status(401).json({ message: 'Invalid token. Please log in again.' });
      return;
    }

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
      res.status(403).json({
        message: 'You do not have permission to perform this action',
      });
      return;
    }

    if (!user.isActive && user.role !== Role.ADMIN) {
      res.status(403).json({
        message:
          'Your account has been deactivated. Please contact administrator.',
        code: 'ACCOUNT_DEACTIVATED',
      });
      return;
    }

    next();
  };
};
