// notification.routes.ts
import { Router } from 'express';
import {
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteAllNotifications,
  deleteReadNotifications, // Thêm import controller mới
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Lấy tất cả notifications (có thể lọc ?isRead=true/false)
router.get('/', authenticate, getNotifications);

// Lấy số lượng notifications chưa đọc
router.get('/unread-count', authenticate, getUnreadNotificationsCount);

// Đánh dấu 1 notification đã đọc
router.patch('/:notificationId/read', authenticate, markNotificationAsRead);

// Đánh dấu tất cả notifications đã đọc
router.patch('/read-all', authenticate, markAllNotificationsAsRead);

// Xóa tất cả notifications
router.delete('/delete-all', authenticate, deleteAllNotifications);

// Xóa các notifications đã đọc
router.delete('/delete-read', authenticate, deleteReadNotifications); // Thêm dòng này

export default router;