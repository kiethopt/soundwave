import express from 'express';
import {
  register,
  login,
  registerAdmin,
  validateToken,
  requestPasswordReset,
  resetPassword,
  switchProfile,
  logout,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { sessionMiddleware } from 'src/middleware/session.middleware';

const router = express.Router();

// PUBLIC routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Route đăng ký admin (chỉ dành cho development)
router.post('/register-admin', registerAdmin);

router.get('/validate-token', authenticate, sessionMiddleware, validateToken);

router.post('/switch-profile', authenticate, sessionMiddleware, switchProfile);

export default router;
