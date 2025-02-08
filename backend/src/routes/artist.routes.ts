import express from 'express';
import {
  getAllArtistsProfile,
  getArtistProfile,
  getArtistStats,
  getArtistTracks,
  getArtistAlbums,
  updateArtistProfile,
} from '../controllers/artist.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import upload from '../middleware/upload.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = express.Router();

// Admin & Artist routes
router.get(
  '/profiles',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  getAllArtistsProfile
);

router.get(
  '/profile/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  getArtistProfile
);

router.put(
  '/profile/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  upload.single('avatar'),
  updateArtistProfile
);

router.get(
  '/stats/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  getArtistStats
);

router.get(
  '/tracks/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  getArtistTracks
);

// router.get(
//   '/albums/:id',
//   authenticate,
//   // authorize([Role.ADMIN, Role.ARTIST]),
//   cacheMiddleware,
//   getArtistAlbums
// );

router.get('/:id/albums', authenticate, cacheMiddleware, getArtistAlbums);

// Chỉ cho phép ARTIST (và ADMIN nếu muốn) truy cập API này
router.get(
  '/stats',
  authenticate,
  authorize([Role.ARTIST, Role.ADMIN]),
  getArtistStats
);

export default router;
