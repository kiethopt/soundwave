import express from 'express';
import {
  createTrack,
  getTracksByType,
  updateTrack,
  deleteTrack,
  getAllTracks,
  getTracksByGenre,
  getTracksByTypeAndGenre,
  searchTrack,
  playTrack,
  toggleTrackVisibility,
  getTrackById,
} from '../controllers/track.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import upload, { handleUploadError } from '../middleware/upload.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { sessionMiddleware } from '../middleware/session.middleware';

const router = express.Router();

// Lấy danh sách tất cả tracks (ADMIN & ARTIST only)
router.get(
  '/',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  getAllTracks
);

// Lấy track theo ID
router.get('/:id', authenticate, getTrackById);

// Route tạo track (ADMIN & ARTIST only)
router.post(
  '/',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  upload.fields([
    { name: 'audioFile', maxCount: 1 },
    { name: 'coverFile', maxCount: 1 },
  ]),
  handleUploadError,
  createTrack
);

// Route lấy danh sách tracks theo type (PUBLIC)
router.get('/type/:type', authenticate, getTracksByType);

// Route lấy danh sách tracks theo genre (PUBLIC)
router.get('/genre/:genreId', authenticate, getTracksByGenre);

// Route lấy danh sách tracks theo type và genre (PUBLIC)
router.get('/type/:type/genre/:genreId', authenticate, getTracksByTypeAndGenre);

// Route tìm kiếm track (PUBLIC - vẫn cần cache)
router.get('/search', authenticate, cacheMiddleware, searchTrack);

// Route nghe nhạc (KHÔNG áp dụng cache để đảm bảo cập nhật playCount)
router.post('/:trackId/play', authenticate, sessionMiddleware, playTrack);

// Route cập nhật track (ADMIN & ARTIST only)
router.put(
  '/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  upload.fields([
    { name: 'audioFile', maxCount: 1 },
    { name: 'coverFile', maxCount: 1 },
  ]),
  handleUploadError,
  updateTrack
);

// Route xóa track (ADMIN & ARTIST only)
router.delete(
  '/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  deleteTrack
);

// Route ẩn track (ADMIN & ARTIST only)
router.put(
  '/:id/toggle-visibility',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  toggleTrackVisibility
);

export default router;
