// notification.routes.ts
import { Router } from 'express';
import {
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware'; 
// hoặc import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Lấy tất cả notifications (có thể lọc ?isRead=true/false)
router.get('/', authenticate, getNotifications);

// Lấy số lượng notifications chưa đọc
router.get('/unread-count', authenticate, getUnreadNotificationsCount);

// Đánh dấu 1 notification đã đọc
router.patch('/:notificationId/read', authenticate, markNotificationAsRead);

// Đánh dấu tất cả notifications đã đọc
router.patch('/read-all', authenticate, markAllNotificationsAsRead);

export default router;
