import express from 'express';
import {
  savePlayHistory,
  saveSearchHistory,
  getPlayHistory,
  getSearchHistory,
  getAllHistory, // Import hàm mới
} from '../controllers/history.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Lưu lịch sử nghe nhạc
router.post('/play', authenticate, savePlayHistory);

// Lưu lịch sử tìm kiếm
router.post('/search', authenticate, saveSearchHistory);

// Lấy lịch sử nghe nhạc của người dùng
router.get('/play', authenticate, getPlayHistory);

// Lấy lịch sử tìm kiếm của người dùng
router.get('/search', authenticate, getSearchHistory);

// Lấy tất cả lịch sử (nghe nhạc và tìm kiếm) của người dùng
router.get('/', authenticate, getAllHistory);

export default router;
