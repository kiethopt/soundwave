import { Router } from 'express';
import {
  createArtist,
  deleteArtist,
  getAllArtists,
  getArtistById,
  getArtistTracks,
  searchArtist,
  updateArtist,
  updateMonthlyListeners,
  verifyArtist,
  followArtist,
} from '../controllers/artist.controller';
import { isAdmin, isAuthenticated } from '../middleware/auth';
import multer from 'multer';

const router = Router();

// Cấu hình multer cho upload avatar
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
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
router.get('/artists', getAllArtists);
router.get('/artists/search', searchArtist);
router.get('/artists/:id', getArtistById);
router.get('/artists/:id/tracks', getArtistTracks);

// Admin only routes
router.post(
  '/artists',
  isAuthenticated,
  isAdmin,
  upload.single('avatar'),
  createArtist
);
router.put(
  '/artists/:id',
  isAuthenticated,
  isAdmin,
  upload.single('avatar'),
  updateArtist
);
router.delete('/artists/:id', isAuthenticated, isAdmin, deleteArtist);
router.patch('/artists/:id/verify', isAuthenticated, isAdmin, verifyArtist);
router.post(
  '/artists/update-monthly-listeners',
  isAuthenticated,
  isAdmin,
  updateMonthlyListeners
);
router.post('/artists/:id/follow', isAuthenticated, followArtist);
export default router;
