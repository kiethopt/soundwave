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
  likeTrack,
  unlikeTrack,
  checkTrackLiked,
  checkTrackCopyright
} from '../controllers/track.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import upload, { handleUploadError } from '../middleware/upload.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

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

// NEW Route to check copyright (ADMIN & ARTIST only)
router.post(
  '/check-copyright',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  upload.fields([
    { name: 'audioFile', maxCount: 1 },
    // No cover file needed for check
  ]),
  handleUploadError,
  checkTrackCopyright
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
router.post('/:trackId/play', authenticate, playTrack);

// Route like/unlike track
router.post('/:trackId/like', authenticate, likeTrack);
router.delete('/:trackId/like', authenticate, unlikeTrack);
router.get('/:trackId/liked', authenticate, checkTrackLiked);

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
