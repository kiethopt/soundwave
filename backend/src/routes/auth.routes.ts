import express from 'express';
import {
  register,
  login,
  requestArtistRole,
  registerAdmin,
  validateToken,
  requestPasswordReset,
  resetPassword,
  searchAll,
  getAllGenres,
} from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import upload, { handleUploadError } from '../middleware/upload.middleware';

const router = express.Router();

// PUBLIC routes
router.post('/register', register);
router.post('/login', login);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/genres', getAllGenres);

// USER routes
router.post(
  '/request-artist',
  authenticate,
  authorize([Role.USER]),
  upload.single('avatar'),
  handleUploadError,
  requestArtistRole
);

// Route đăng ký admin (chỉ dành cho development)
router.post('/register-admin', registerAdmin);

// Route kiểm tra token
router.get('/validate-token', authenticate, validateToken);

// Route tìm kiếm tổng hợp
router.get('/search-all', authenticate, searchAll);

export default router;
