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
  cacheMiddleware,
  (req: Request, res: Response) => {
    getAlbumById(req)
      .then((data) => {
        res.json(data);
      })
      .catch((error) => {
        console.error('Get album error:', error);
        if (error.message === 'Album not found') {
          res.status(404).json({ message: 'Album not found' });
        } else {
          res.status(500).json({ message: 'Internal server error' });
        }
      });
  }
);

// Route lấy danh sách tất cả album (có cache)
router.get(
  '/',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  (req: Request, res: Response) => {
    getAllAlbums(req)
      .then((data) => {
        res.json(data);
      })
      .catch((error) => {
        console.error('Get all albums error:', error);
        if (error instanceof Error) {
          switch (error.message) {
            case 'Unauthorized':
              res.status(401).json({ message: 'Unauthorized' });
              break;
            case 'Forbidden':
              res.status(403).json({ message: 'Forbidden' });
              break;
            default:
              res.status(500).json({ message: 'Internal server error' });
          }
        } else {
          res.status(500).json({ message: 'Internal server error' });
        }
      });
  }
);

export default router;
