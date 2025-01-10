import express, { Request, Response, NextFunction } from 'express';
import {
  createAlbum,
  updateAlbum,
  deleteAlbum,
  getAlbumById,
  searchAlbum,
  addTracksToAlbum,
  getAllAlbums,
  playAlbum,
} from '../controllers/album.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import upload, { handleUploadError } from '../middleware/upload.middleware';
import { cacheMiddleware, setCache } from '../middleware/cache.middleware';

const router = express.Router();

// Chỉ ADMIN và ARTIST có thể tạo, cập nhật, xóa album
router.post(
  '/',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    console.log('User:', req.user);
    const user = req.user;
    if (
      user &&
      (user.role === Role.ADMIN ||
        user.role === Role.ARTIST ||
        (user.role === Role.USER && user.verificationRequestedAt))
    ) {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden' });
    }
  },
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

router.post(
  '/:albumId/tracks',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  addTracksToAlbum
);

// Route tìm kiếm album (có cache)
router.get('/search', cacheMiddleware, async (req: Request, res: Response) => {
  try {
    const data = await searchAlbum(req);
    await setCache(req.originalUrl, data);
    res.json(data);
  } catch (error) {
    console.error('Search album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route phát album
router.post('/:albumId/play', authenticate, playAlbum);

// PUBLIC routes
// Route lấy thông tin album theo ID (có cache)
router.get('/:id', cacheMiddleware, async (req: Request, res: Response) => {
  try {
    const data = await getAlbumById(req);
    await setCache(req.originalUrl, data);
    res.json(data);
  } catch (error) {
    console.error('Get album error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Route lấy danh sách tất cả album (có cache)
router.get(
  '/',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  cacheMiddleware,
  async (req: Request, res: Response) => {
    try {
      const data = await getAllAlbums(req);
      await setCache(req.originalUrl, data);
      res.json(data);
    } catch (error) {
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
    }
  }
);

export default router;
