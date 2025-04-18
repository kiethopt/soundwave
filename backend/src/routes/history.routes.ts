import express from 'express';
import {
  savePlayHistory,
  saveSearchHistory,
  getPlayHistory,
  getSearchHistory,
  getAllHistory,
  getSearchSuggestions,
  deleteSearchHistory,
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

// Lấy gợi ý tìm kiếm dựa trên lịch sử
router.get('/suggestions', authenticate, getSearchSuggestions);

// Xóa lịch sử tìm kiếm của người dùng
router.delete('/search', authenticate, deleteSearchHistory);

export default router;
