import rateLimit from 'express-rate-limit';

// Cấu hình rate limiting chung
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 150, // Giới hạn mỗi IP được gửi tối đa 150 request trong 15 phút
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Trả về thông tin rate limit trong headers
  legacyHeaders: false, // Không sử dụng headers cũ
});

// Rate limiting cho các route query nhiều (ví dụ: getAllUsers, getAllAlbums, v.v.)
export const queryRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 30,
  message: 'Too many query requests, please wait a moment before trying again',
  standardHeaders: true,
  legacyHeaders: false,
});
