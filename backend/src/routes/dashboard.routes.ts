import express from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// Lấy thống kê dashboard
router.get('/stats', isAuthenticated, getDashboardStats);

export default router;
