import { Router } from 'express';
import {
  createTrack,
  deleteTrack,
  getAllTracks,
  getTrackById,
  getTracksByArtist,
  updateTrack,
} from '../controllers/track.controller';
import { isAdmin, isAuthenticated } from '../middleware/auth';
import multer from 'multer';

const router = Router();

// Cấu hình multer để xử lý file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Public routes
router.get('/tracks', getAllTracks);
router.get('/tracks/:id', getTrackById);
router.get('/tracks/artist/:artist', getTracksByArtist);

// Admin only routes
router.post(
  '/tracks',
  isAuthenticated,
  isAdmin,
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  createTrack
);
router.put('/tracks/:id', isAuthenticated, isAdmin, updateTrack);
router.delete('/tracks/:id', isAuthenticated, isAdmin, deleteTrack);

export default router;
