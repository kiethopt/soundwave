import express from 'express';
import {
  createTrack,
  getTracksByType,
  updateTrack,
  deleteTrack,
  getAllTracks,
  getTracksByGenre,
  getTracksByTypeAndGenre,
} from '../controllers/track.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import upload, { handleUploadError } from '../middleware/upload.middleware';

const router = express.Router();

// Lấy danh sách tất cả tracks (ADMIN & ARTIST only)
router.get(
  '/',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  getAllTracks
);

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
router.get('/type/:type', getTracksByType);
// Route lấy danh sách tracks theo genre (PUBLIC)
router.get('/genre/:genreId', getTracksByGenre);
// Route lấy danh sách tracks theo type và genre (PUBLIC)
router.get('/type/:type/genre/:genreId', getTracksByTypeAndGenre);

// Route cập nhật track (ADMIN & ARTIST only)
router.put(
  '/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  updateTrack
);

// Route xóa track (ADMIN & ARTIST only)
router.delete(
  '/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  deleteTrack
);

export default router;
