import express from 'express';
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/follow/:id', authenticate, followUser);

router.delete('/unfollow/:id', authenticate, unfollowUser);

router.get('/followers', authenticate, getFollowers);

router.get('/following', authenticate, getFollowing);

export default router;
