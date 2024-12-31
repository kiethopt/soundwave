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
} from '../controllers/auth.controller';

const router = Router();

// Auth routes
router.post('/register', register);
router.post('/login', login);

// User routes
router.get('/users', getAllUsers);
router.get('/users/id/:id', getUserById);
router.get('/users/username/:username', getUserByUsername);
router.put('/users/:username', updateUser);
router.patch('/users/:username/deactivate', deactivateUser);
router.patch('/users/:username/activate', activateUser);

export default router;
