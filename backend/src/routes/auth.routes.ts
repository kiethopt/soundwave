import { Router } from 'express';
import {
  register,
  login,
  getAllUsers,
  getUserById,
  getUserByUsername,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser,
  purgeAllData,
} from '../controllers/auth.controller';
import { checkUserActive, isAdmin, isAuthenticated } from '../middleware/auth';
import { clients } from '..';

const router = Router();

// Auth routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (cần authentication and admin role)
router.get('/users', isAuthenticated, checkUserActive, isAdmin, getAllUsers);
router.get(
  '/users/id/:id',
  isAuthenticated,
  checkUserActive,
  isAdmin,
  getUserById
);
router.get(
  '/users/username/:username',
  isAuthenticated,
  checkUserActive,
  isAdmin,
  getUserByUsername
);
router.put('/users/:username', isAuthenticated, isAdmin, updateUser);
router.patch(
  '/users/:username/deactivate',
  isAuthenticated,
  isAdmin,
  deactivateUser
);
router.patch(
  '/users/:username/activate',
  isAuthenticated,
  isAdmin,
  activateUser
);
router.delete('/users/:username', isAuthenticated, isAdmin, deleteUser);
router.delete('/purge-data', isAuthenticated, isAdmin, purgeAllData);

// SSE endpoint
router.get('/sse', (req, res) => {
  // Thêm CORS headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader(
    'Access-Control-Allow-Origin',
    process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Flush headers ngay lập tức
  res.flushHeaders();

  // Gửi một event ban đầu để kiểm tra kết nối
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Gửi heartbeat mỗi 30 giây để giữ kết nối
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
  }, 30000);

  // Gửi thông báo khi có sự kiện
  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  clients.push(sendEvent);

  // Xóa client và clear interval khi kết nối đóng
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.splice(clients.indexOf(sendEvent), 1);
  });
});

export default router;
