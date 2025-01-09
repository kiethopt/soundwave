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
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { queryRateLimiter } from '../middleware/rateLimit.middleware';

const router = express.Router();

// Chỉ ADMIN và ARTIST có thể truy cập các route này
router.use(authenticate, authorize([Role.ADMIN, Role.ARTIST]));

// Quản lý người dùng
router.get('/users', queryRateLimiter, getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Quản lý nghệ sĩ
router.get('/artists', queryRateLimiter, getAllArtists);

// Quản lý thể loại nhạc
router.get('/genres', queryRateLimiter, getAllGenres);
router.post('/genres', createGenre);
router.put('/genres/:id', updateGenre);
router.delete('/genres/:id', deleteGenre);

// Duyệt yêu cầu trở thành Artist
router.post('/artist-requests/approve', approveArtistRequest);

export default router;
