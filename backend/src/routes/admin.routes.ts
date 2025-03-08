import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllArtists,
  createGenre,
  updateGenre,
  deleteGenre,
  approveArtistRequest,
  getStats,
  getArtistById,
  getAllArtistRequests,
  rejectArtistRequest,
  getArtistRequestDetail,
  deleteArtist,
  updateArtist,
} from '../controllers/admin.controller';
import * as genreController from '../controllers/genre.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { cacheMiddleware } from '../middleware/cache.middleware';
import upload from '../middleware/upload.middleware';

const router = express.Router();

// Thống kê
router.get(
  '/stats',
  authenticate,
  authorize([Role.ADMIN]),
  cacheMiddleware,
  getStats
);

// Quản lý người dùng
router.get('/users', authenticate, authorize([Role.ADMIN]), getAllUsers);
router.get('/users/:id', authenticate, authorize([Role.ADMIN]), getUserById);
router.put(
  '/users/:id',
  authenticate,
  authorize([Role.ADMIN]),
  upload.single('avatar'),
  updateUser
);
router.put(
  '/artists/:id',
  authenticate,
  authorize([Role.ADMIN]),
  upload.single('avatar'),
  updateArtist
);
router.delete('/users/:id', authenticate, authorize([Role.ADMIN]), deleteUser);
router.delete(
  '/artists/:id',
  authenticate,
  authorize([Role.ADMIN]),
  deleteArtist
);

// Quản lý nghệ sĩ
router.get('/artists', authenticate, authorize([Role.ADMIN]), getAllArtists);
router.get(
  '/artists/:id',
  authenticate,
  authorize([Role.ADMIN]),
  getArtistById
);

router.get(
  '/artist-requests',
  authenticate,
  authorize([Role.ADMIN]),
  getAllArtistRequests
);
router.get(
  '/artist-requests/:id',
  authenticate,
  authorize([Role.ADMIN]),
  getArtistRequestDetail
);

// Quản lý thể loại nhạc
router.get(
  '/genres',
  authenticate,
  authorize([Role.ADMIN]),
  cacheMiddleware,
  genreController.getAllGenres
);
router.post('/genres', authenticate, authorize([Role.ADMIN]), createGenre);
router.put(
  '/genres/:id',
  authenticate,
  authorize([Role.ADMIN]),
  upload.none(),
  updateGenre
);
router.delete(
  '/genres/:id',
  authenticate,
  authorize([Role.ADMIN]),
  deleteGenre
);

// Duyệt yêu cầu trở thành Artist
router.post(
  '/artist-requests/approve',
  authenticate,
  authorize([Role.ADMIN]),
  approveArtistRequest
);
router.post(
  '/artist-requests/reject',
  authenticate,
  authorize([Role.ADMIN]),
  rejectArtistRequest
);

export default router;
