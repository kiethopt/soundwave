import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  JsonWebTokenError,
  TokenExpiredError,
  NotBeforeError,
} from 'jsonwebtoken';

interface CustomError extends Error {
  code?: string;
  meta?: {
    target?: string[];
  };
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    type: err.constructor.name,
  });

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const isAlbumRoute = req.originalUrl.includes('/albums');
      res.status(400).json({
        message: isAlbumRoute
          ? 'File quá lớn. Kích thước tối đa cho ảnh cover là 5MB'
          : 'File quá lớn. Kích thước tối đa cho file audio là 10MB',
      });
      return;
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        message: 'Số lượng file vượt quá giới hạn cho phép',
      });
      return;
    }
  }

  // Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        message: 'Dữ liệu đã tồn tại trong hệ thống',
        field: err.meta?.target,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        message: 'Không tìm thấy dữ liệu',
      });
      return;
    }
  }

  // JWT errors
  if (err instanceof JsonWebTokenError) {
    res.status(401).json({
      message: 'Token không hợp lệ',
    });
    return;
  }
  if (err instanceof TokenExpiredError) {
    res.status(401).json({
      message: 'Token đã hết hạn',
    });
    return;
  }
  if (err instanceof NotBeforeError) {
    res.status(401).json({
      message: 'Token chưa có hiệu lực',
    });
    return;
  }

  // File type errors
  if (
    err.message === 'Chỉ chấp nhận file audio' ||
    err.message === 'Chỉ chấp nhận file ảnh'
  ) {
    res.status(400).json({
      message: err.message,
    });
    return;
  }

  // Default error
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};
