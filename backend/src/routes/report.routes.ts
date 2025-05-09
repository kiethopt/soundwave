import express from 'express';
import {
  createReport,
  getReports,
  getUserReports,
  getReportById,
  resolveReport,
  deleteReport
} from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = express.Router();

// Create a new report - any authenticated user
router.post('/', authenticate, createReport);

// Get user's own reports
router.get('/my-reports', authenticate, getUserReports);

// Get a single report by ID - accessible by the reporter or admin
router.get('/:id', authenticate, getReportById);

// Admin routes - require authentication and admin role
router.get('/', authenticate, authorize([Role.ADMIN]), getReports);
router.patch('/:id/resolve', authenticate, authorize([Role.ADMIN]), resolveReport);
router.delete('/:id', authenticate, authorize([Role.ADMIN]), deleteReport);

export default router; 