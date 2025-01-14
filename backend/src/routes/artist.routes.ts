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

const router = express.Router();

// Admin & Artist routes
router.get(
  '/profiles',
  authenticate,
  authorize([Role.ADMIN]),
  getAllArtistsProfile
);

router.put(
  '/profile/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  upload.single('avatar'),
  updateArtistProfile
);

router.put(
  '/profile/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
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

router.get(
  '/albums/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  getArtistAlbums
);

export default router;
