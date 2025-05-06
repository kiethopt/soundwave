import express from 'express';
import {
  createAlbum,
  updateAlbum,
  deleteAlbum,
  getAlbumById,
  searchAlbum,
  addTracksToAlbum,
  getAllAlbums,
<<<<<<< HEAD
  // playAlbum,
=======
>>>>>>> dabf14e3545e792907af12c5943f7cf419bef408
  toggleAlbumVisibility,
  getNewestAlbums,
  getHotAlbums,
} from '../controllers/album.controller';
import { authenticate, authorize, optionalAuthenticate } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import upload, { handleUploadError } from '../middleware/upload.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = express.Router();

// Chỉ ADMIN và ARTIST có thể tạo, cập nhật, xóa album
router.post(
  '/',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]), // Cho phép ADMIN và ARTIST (qua artistProfile)
  upload.single('coverFile'),
  handleUploadError,
  createAlbum
);

router.put(
  '/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  upload.single('coverFile'),
  handleUploadError,
  updateAlbum
);

router.delete(
  '/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  deleteAlbum
);

router.put(
  '/:id/toggle-visibility',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  toggleAlbumVisibility
);

router.post(
  '/:albumId/tracks',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  upload.array('tracks'),
  handleUploadError,
  addTracksToAlbum
);

// Route tìm kiếm album (có cache)
router.get('/search', authenticate, cacheMiddleware, searchAlbum);

<<<<<<< HEAD
// Route phát album - Removed route definition
// router.post('/:albumId/play', authenticate, cacheMiddleware, playAlbum);

=======
>>>>>>> dabf14e3545e792907af12c5943f7cf419bef408
// Public routes
router.get('/newest', cacheMiddleware, getNewestAlbums);
router.get('/hot', cacheMiddleware, getHotAlbums);
router.get('/:id', optionalAuthenticate, cacheMiddleware, getAlbumById);

// Route lấy danh sách tất cả album (có cache)
router.get(
  '/',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  getAllAlbums
);

export default router;
