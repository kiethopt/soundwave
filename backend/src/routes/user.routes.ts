import express from 'express';
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  searchAll,
  getAllGenres,
  requestToBecomeArtist,
  editProfile,
  checkArtistRequest,
  getRecommendedArtists,
  getNewestAlbums,
  getNewestTracks,
  getTopTracks,
  getTopArtists,
  getTopAlbums,
  getUserProfile,
  getUserTopAlbums,
  getUserTopTracks,
  getUserTopArtists,
  getGenreTopAlbums,
  getGenreTopTracks,
  getGenreTopArtists,
  getGenreNewestTracks,
} from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import upload, { handleUploadError } from '../middleware/upload.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';
const router = express.Router();

router.post('/follow/:id', authenticate, cacheMiddleware, followUser);
router.delete('/unfollow/:id', authenticate, cacheMiddleware, unfollowUser);
router.get('/followers', authenticate, cacheMiddleware, getFollowers);
router.get('/following', authenticate, cacheMiddleware, getFollowing);
router.get('/search-all', authenticate, searchAll);
router.get('/genres', authenticate, getAllGenres);
router.get('/profile/:id', getUserProfile);

// Route yêu cầu trở thành Artist
router.post(
  '/request-artist',
  authenticate,
  authorize([Role.USER]),
  upload.single('avatar'),
  handleUploadError,
  requestToBecomeArtist
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

// Route lấy danh sách Artist được đề xuất
router.get('/recommendedArtists', authenticate, getRecommendedArtists);

// Route lấy danh sách Album mới nhất
router.get('/newestAlbums', authenticate, getNewestAlbums);

// Route lấy danh sách Track mới nhất
router.get('/newestTracks', authenticate, getNewestTracks);

// Route lấy danh sách Track phổ biến nhất
router.get('/topTracks', authenticate, getTopTracks);

// Route lấy danh sách Artist phổ biến nhất
router.get('/topArtists', authenticate, getTopArtists);

// Route lấy danh sách Album phổ biến nhất
router.get('/topAlbums', authenticate, getTopAlbums);

router.get('/topAlbums/:id', authenticate, getUserTopAlbums);
router.get('/topTracks/:id', authenticate, getUserTopTracks);
router.get('/topArtists/:id', authenticate, getUserTopArtists);
router.get('/genre/topAlbums/:id', authenticate, getGenreTopAlbums);
router.get('/genre/topTracks/:id', authenticate, getGenreTopTracks);
router.get('/genre/topArtists/:id', authenticate, getGenreTopArtists);
router.get('/genre/newestTracks/:id', authenticate, getGenreNewestTracks);

export default router;
