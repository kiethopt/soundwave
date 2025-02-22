import express from 'express';
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  searchAll,
  getAllGenres,
  requestArtistRole,
  editProfile,
  checkArtistRequest,
  getRecommendedArtists,
  getUserProfile,
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import upload, { handleUploadError } from '../middleware/upload.middleware';


const router = express.Router();

router.post('/follow/:id', authenticate, followUser);
router.delete('/unfollow/:id', authenticate, unfollowUser);
router.get('/followers', authenticate, getFollowers);
router.get('/following', authenticate, getFollowing);
router.get('/search-all', authenticate, searchAll);
router.get('/genres', getAllGenres);
router.get('/profile/:id', getUserProfile);

// Route yêu cầu trở thành Artist
router.post(
  '/request-artist',
  authenticate,
  authorize([Role.USER]),
  upload.single('avatar'),
  handleUploadError,
  requestArtistRole
);

// Route chỉnh sửa thông tin người dùng
router.put(
  '/edit-profile',
  authenticate,
  upload.single('avatar'),
  handleUploadError,
  editProfile
);

// Route kiểm tra yêu cầu trở thành Artist
router.get(
  '/check-artist-request',
  authenticate,
  authorize([Role.USER]),
  checkArtistRequest
);

// 
router.get(
  '/recommended',
  authenticate,
  getRecommendedArtists
);

export default router;
