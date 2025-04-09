import express, { Request, Response } from 'express';
import {
  register,
  login,
  registerAdmin,
  validateToken,
  requestPasswordReset,
  resetPassword,
  switchProfile,
  logout,
  getMaintenanceStatus,
  googleLogin,
  convertGoogleAvatar,
  getMe,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware'

const router = express.Router();

// PUBLIC routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/maintenance-status', getMaintenanceStatus);
router.get('/me', authenticate, getMe);

// Route đăng ký admin (chỉ dành cho development)
router.post('/register-admin', registerAdmin);

router.get('/validate-token', authenticate, validateToken);

router.post('/switch-profile', authenticate, switchProfile);

// Google OAuth routes
router.post('/google-login', googleLogin);

// Chuyển đổi avatar Google sang Cloudinary
router.post('/convert-google-avatar', convertGoogleAvatar);

export default router;
