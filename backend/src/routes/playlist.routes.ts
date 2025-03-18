import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createPlaylist,
  getPlaylists,
  getPlaylistById,
  updatePlaylist,
  removeTrackFromPlaylist,
  addTrackToPlaylist,
  createPersonalizedPlaylist,
} from '../controllers/playlist.controller';

const router = express.Router();

// Đảm bảo tất cả routes đều có authenticate middleware
router.use(authenticate);

// Route AI-generated playlist
router.post('/personalized', createPersonalizedPlaylist);

// Các routes khác
router.post('/', createPlaylist);
router.get('/', getPlaylists);
router.get('/:id', getPlaylistById);
router.patch('/:id', updatePlaylist);
router.delete('/:playlistId/tracks/:trackId', removeTrackFromPlaylist);

// Sửa lại route thêm track vào playlist
router.post('/:id/tracks', addTrackToPlaylist);

export default router;
