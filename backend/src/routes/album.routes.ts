import express, { Request, Response, NextFunction } from 'express';
import {
  createAlbum,
  updateAlbum,
  deleteAlbum,
  getAlbumById,
  searchAlbum,
  addTracksToAlbum,
  getAllAlbums,
} from '../controllers/album.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import upload, { handleUploadError } from '../middleware/upload.middleware';

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

router.get('/search', authenticate, searchAlbum);

// PUBLIC routes
router.get('/:id', getAlbumById);
router.get(
  '/',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  getAllAlbums
);

export default router;
