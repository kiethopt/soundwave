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
  createArtist,
  getArtistRequests,
  rejectArtistRequest,
  verifyArtist,
  updateMonthlyListeners,
  getArtistRequestDetails,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { queryRateLimiter } from '../middleware/rateLimit.middleware';
import upload from '../middleware/upload.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

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
router.get('/users', queryRateLimiter, authorize([Role.ADMIN]), getAllUsers);
router.get('/users/:id', authorize([Role.ADMIN]), getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Quản lý nghệ sĩ
router.get('/artists', queryRateLimiter, getAllArtists);
router.get('/artists/:id', getArtistById);
router.post('/artists', upload.single('avatar'), createArtist);
router.get(
  '/artist-requests',
  queryRateLimiter,
  authorize([Role.ADMIN]),
  getArtistRequests
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
router.get('/genres', queryRateLimiter, getAllGenres);
router.post('/genres', createGenre);
router.put('/genres/:id', updateGenre);
router.delete('/genres/:id', deleteGenre);

// Duyệt yêu cầu trở thành Artist
router.post('/artist-requests/approve', approveArtistRequest);
router.post('/artist-requests/reject', rejectArtistRequest);

export default router;
