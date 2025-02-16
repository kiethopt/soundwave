import express, { Request, Response } from 'express';
import {
  createAlbum,
  updateAlbum,
  deleteAlbum,
  getAlbumById,
  searchAlbum,
  addTracksToAlbum,
  getAllAlbums,
  playAlbum,
  toggleAlbumVisibility,
} from '../controllers/album.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import upload, { handleUploadError } from '../middleware/upload.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { sessionMiddleware } from '../middleware/session.middleware';

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

// Route phát album
router.post(
  '/:albumId/play',
  authenticate,
  sessionMiddleware,
  cacheMiddleware,
  playAlbum
);

// PUBLIC routes
// Route lấy thông tin album theo ID (có cache)
router.get(
  '/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]), // Chỉ cho phép ADMIN và ARTIST
  cacheMiddleware,
  getAlbumById
);

// Route lấy danh sách tất cả album (có cache)
router.get(
  '/',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  getAllAlbums
);

export default router;
