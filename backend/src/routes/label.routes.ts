import express from 'express';
import {
  getAllLabels,
  getLabelById,
  createLabel,
  updateLabel,
  deleteLabel,
} from '../controllers/label.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import upload, { handleUploadError } from '../middleware/upload.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = express.Router();

// Lấy tất cả label (public, có cache)
router.get('/', cacheMiddleware, getAllLabels);

// Lấy chi tiết label theo ID (public, có cache)
router.get('/:id', cacheMiddleware, getLabelById);

// Các routes quản lý label (chỉ ADMIN)
router.post(
  '/',
  authenticate,
  authorize([Role.ADMIN]),
  upload.single('logoFile'),
  handleUploadError,
  createLabel
);

router.put(
  '/:id',
  authenticate,
  authorize([Role.ADMIN]),
  upload.single('logoFile'),
  handleUploadError,
  updateLabel
);

router.delete('/:id', authenticate, authorize([Role.ADMIN]), deleteLabel);

export default router;
