import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
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
} from '../controllers/playlist.controller';

const router = express.Router();

// Đảm bảo tất cả routes đều có authenticate middleware
router.use(authenticate);

// Route AI-generated playlist
router.post('/personalized', createPersonalizedPlaylist);

// Route to get the system playlist
router.get('/system', getSystemPlaylist);
router.post(
  '/system/update-all',
  authenticate,
  authorize(['ADMIN']),
  updateAllSystemPlaylists
);

// Add this route to get all system playlists
router.get('/system-all', getSystemPlaylists);

// Các routes khác
router.post('/', createPlaylist);
router.get('/', getPlaylists);
router.get('/:id', getPlaylistById);
router.patch('/:id', updatePlaylist);
router.delete('/:playlistId/tracks/:trackId', removeTrackFromPlaylist);

// Sửa lại route thêm track vào playlist
router.post('/:id/tracks', addTrackToPlaylist);

export default router;
