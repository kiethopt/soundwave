import express from 'express';
import {
  authenticate,
  authorize,
  optionalAuthenticate,
} from '../middleware/auth.middleware';
import {
  createPlaylist,
  getPlaylists,
  getPlaylistById,
  updatePlaylist,
  removeTrackFromPlaylist,
  addTrackToPlaylist,
  createPersonalizedPlaylist,
  getSystemPlaylist,
  updateAllSystemPlaylists,
  getSystemPlaylists,
  updateVibeRewindPlaylist,
} from '../controllers/playlist.controller';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = express.Router();

// Public routes (no authentication required)
router.get('/system-all', cacheMiddleware, getSystemPlaylists);

// Route that works with or without authentication
router.get('/:id', optionalAuthenticate, getPlaylistById);

// Đảm bảo tất cả routes đều có authenticate middleware (except public ones above)
router.use(authenticate);

// Route AI-generated playlist
router.post('/personalized', createPersonalizedPlaylist);

// Route for Vibe Rewind playlist
router.post('/vibe-rewind', updateVibeRewindPlaylist);

// Route to get the system playlist
router.get('/system', getSystemPlaylist);
router.post(
  '/system/update-all',
  authenticate,
  authorize(['ADMIN']),
  updateAllSystemPlaylists
);

// Các routes khác
router.post('/', createPlaylist);
router.get('/', getPlaylists);
router.patch('/:id', updatePlaylist);
router.delete('/:playlistId/tracks/:trackId', removeTrackFromPlaylist);

// Sửa lại route thêm track vào playlist
router.post('/:id/tracks', addTrackToPlaylist);

export default router;
