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
import { isAdmin, isAuthenticated } from '../middleware/auth';

const router = Router();

// Auth routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (cần authentication and admin role)
router.get('/users', isAuthenticated, isAdmin, getAllUsers);
router.get('/users/id/:id', isAuthenticated, isAdmin, getUserById);
router.get(
  '/users/username/:username',
  isAuthenticated,
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

export default router;
