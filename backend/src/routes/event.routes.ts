import { Router } from 'express';
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getAllEvents,
  getEventById,
  joinEvent,
  cancelJoinEvent
} from '../controllers/event.controller';

const router = Router();

// Tạo event
router.post('/events', createEvent);

// Cập nhật event
router.put('/events/:id', updateEvent);

// Xóa event
router.delete('/events/:id', deleteEvent);

// Lấy danh sách event
router.get('/events', getAllEvents);

// Lấy chi tiết 1 event
router.get('/events/:id', getEventById);

router.post('/events/:id/join', joinEvent);
router.post('/events/:id/cancel-join', cancelJoinEvent);

export default router;
