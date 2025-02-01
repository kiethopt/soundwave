import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';

// Cấu hình multer để lưu file tạm thời trong memory
const storage = multer.memoryStorage();

// Tạo middleware upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('audio/')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only image and audio files are allowed'));
    }
  },
});

export const handleUploadError = (
  err: Error & { code?: string },
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    // Lỗi từ multer (ví dụ: file quá lớn)
    if (err.code === 'LIMIT_FILE_SIZE') {
      res
        .status(400)
        .json({ message: 'File too large. Maximum allowed size is 10MB.' });
    } else {
      res.status(400).json({ message: err.message });
    }
  } else if (err) {
    // Lỗi khác (ví dụ: từ fileFilter)
    res.status(400).json({ message: err.message });
  } else {
    next();
  }
};

export default upload;
