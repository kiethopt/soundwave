import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllArtists,
  getAllGenres,
  createGenre,
  updateGenre,
  deleteGenre,
  approveArtistRequest,
  getStats,
  getArtistById,
  getAllArtistRequests,
  rejectArtistRequest,
  verifyArtist,
  updateMonthlyListeners,
  getArtistRequestDetails,
  deactivateUser,
  deactivateArtist,
  deleteArtist,
  updateArtist,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { queryRateLimiter } from '../middleware/rateLimit.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
import upload from 'src/middleware/upload.middleware';

const router = express.Router();

// Chỉ ADMIN và ARTIST có thể truy cập các route này
router.use(authenticate, authorize([Role.ADMIN, Role.ARTIST]));

// Thống kê
router.get(
  '/stats',
  authorize([Role.ADMIN]),
  cacheMiddleware,
  queryRateLimiter,
  getStats
);

// Quản lý người dùng
router.get(
  '/users',
  queryRateLimiter,
  authenticate,
  authorize([Role.ADMIN]),
  getAllUsers
);
router.get('/users/:id', authenticate, authorize([Role.ADMIN]), getUserById);
router.put('/users/:id', authenticate, authorize([Role.ADMIN]), updateUser);
router.put(
  '/artists/:id',
  authenticate,
  authorize([Role.ADMIN]),
  upload.single('avatar'),
  updateArtist
);
router.delete('/users/:id', authorize([Role.ADMIN]), deleteUser);
router.delete(
  '/artists/:id',
  authenticate,
  authorize([Role.ADMIN]),
  deleteArtist
);
router.patch('/users/:id/deactivate', authorize([Role.ADMIN]), deactivateUser);
router.patch(
  '/artists/:id/deactivate',
  authenticate,
  authorize([Role.ADMIN]),
  deactivateArtist
);

// Quản lý nghệ sĩ
router.get(
  '/artists',
  queryRateLimiter,
  authorize([Role.ADMIN]),
  getAllArtists
);
router.get('/artists/:id', authorize([Role.ADMIN, Role.ARTIST]), getArtistById);

router.get(
  '/artist-requests',
  queryRateLimiter,
  authorize([Role.ADMIN]),
  getAllArtistRequests
);
router.get(
  '/artist-requests/:id',
  queryRateLimiter,
  authorize([Role.ADMIN]),
  getArtistRequestDetails
);
router.post('/artists/verify', verifyArtist);
router.post(
  '/artists/:id/update-monthly-listeners',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  updateMonthlyListeners
);

// Quản lý thể loại nhạc
router.get('/genres', queryRateLimiter, cacheMiddleware, getAllGenres);
router.post('/genres', createGenre);
router.put('/genres/:id', updateGenre);
router.delete('/genres/:id', deleteGenre);

// Duyệt yêu cầu trở thành Artist
router.post(
  '/artist-requests/approve',
  authorize([Role.ADMIN]),
  approveArtistRequest
);
router.post(
  '/artist-requests/reject',
  authorize([Role.ADMIN]),
  rejectArtistRequest
);

export default router;
