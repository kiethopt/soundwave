import express from 'express';
import {
  register,
  login,
  requestArtistRole,
  registerAdmin,
  validateToken,
  requestPasswordReset,
  resetPassword,
} from '../controllers/auth.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();

// PUBLIC routes
router.post('/register', register);
router.post('/login', login);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

// USER routes
router.post(
  '/request-artist',
  authenticate,
  authorize([Role.USER]),
  requestArtistRole
);

// Route đăng ký admin (chỉ dành cho development)
router.post('/register-admin', registerAdmin);

// Route kiểm tra token
router.get('/validate-token', authenticate, validateToken);

export default router;
