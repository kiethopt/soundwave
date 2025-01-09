import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// Cấu hình multer để lưu file tạm thời trong memory
const storage = multer.memoryStorage();

// Tạo middleware upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
  },
  fileFilter: (req, file, cb) => {
    // Chấp nhận file ảnh và audio
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
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    // Lỗi từ multer (ví dụ: file quá lớn)
    if (err.code === 'LIMIT_FILE_SIZE') {
      res
        .status(400)
        .json({ message: 'File too large. Maximum allowed size is 5MB.' });
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
