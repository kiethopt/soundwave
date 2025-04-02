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
  getSystemPlaylists,
  updateVibeRewindPlaylist,
  generateAIPlaylist,
  // System playlist controllers
  createSystemPlaylists,
  getSystemPlaylist,
  updateSystemPlaylistForUser,
  updateAllSystemPlaylists,
  getHomePageData,
} from '../controllers/playlist.controller';
import { cacheMiddleware } from '../middleware/cache.middleware';
import { Role } from '@prisma/client';

const router = express.Router();

// == Public routes (no authentication required) ==
router.get(
  '/system-all',
  authenticate,
  authorize([Role.ADMIN]),
  getSystemPlaylists
);
router.get('/home', optionalAuthenticate, getHomePageData);
router.get('/:id', optionalAuthenticate, getPlaylistById);

// == Authenticated user routes ==
router.use(authenticate);

// Standard playlist management routes
router.get('/', getPlaylists);
router.post('/', createPlaylist);
router.patch('/:id', updatePlaylist);
router.delete('/:playlistId/tracks/:trackId', removeTrackFromPlaylist);
router.post('/:id/tracks', addTrackToPlaylist);

// AI playlist routes
router.post('/ai-generate', generateAIPlaylist);
router.post('/ai-generate/artist/:artistName', (req, res, next) => {
  req.body.basedOnArtist = req.params.artistName;
  generateAIPlaylist(req, res, next);
});

// User-specific system playlist routes
router.post('/vibe-rewind', updateVibeRewindPlaylist);
router.get('/system/:playlistName', getSystemPlaylist);
router.post('/system/:playlistName/user/:userId', updateSystemPlaylistForUser);

// == Admin-only routes ==
router.use('/admin', authorize([Role.ADMIN]));
router.post('/admin/system/create', createSystemPlaylists);
router.post('/admin/system/update-all', updateAllSystemPlaylists);

export default router;
