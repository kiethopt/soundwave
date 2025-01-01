import { Router } from 'express';
import {
  createAlbum,
  deleteAlbum,
  getAlbumById,
  getAlbumsByArtist,
  getAlbumTracks,
  getAllAlbums,
  reorderAlbumTracks,
  updateAlbum,
  uploadAlbumTracks,
} from '../controllers/album.controller';
import { isAdmin, isAuthenticated } from '../middleware/auth';
import multer from 'multer';

const router = Router();

// Cấu hình multer cho upload tracks
const trackStorage = multer.memoryStorage();
const uploadTracks = multer({
  storage: trackStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB cho mỗi file audio
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file audio'));
    }
  },
});

// Cấu hình multer cho upload cover
const coverStorage = multer.memoryStorage();
const uploadCover = multer({
  storage: coverStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB cho ảnh cover
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh'));
    }
  },
});

// Public routes
router.get('/albums', getAllAlbums);
router.get('/albums/:id', getAlbumById);
router.get('/albums/artist/:artist', getAlbumsByArtist);
router.get('/albums/:id/tracks', getAlbumTracks);

// Admin only routes
router.post(
  '/albums',
  isAuthenticated,
  isAdmin,
  uploadCover.single('cover'),
  createAlbum
);
router.post(
  '/albums/:id/tracks',
  isAuthenticated,
  isAdmin,
  uploadTracks.array('tracks', 1000),
  uploadAlbumTracks
);
router.put('/albums/:id', isAuthenticated, isAdmin, updateAlbum);
router.put(
  '/albums/:id/tracks/reorder',
  isAuthenticated,
  isAdmin,
  reorderAlbumTracks
);
router.delete('/albums/:id', isAuthenticated, isAdmin, deleteAlbum);

export default router;
