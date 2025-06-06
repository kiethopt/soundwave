import express from 'express';
import {
  getAllArtistsProfile,
  getArtistProfile,
  getArtistStats,
  getArtistTracks,
  getArtistAlbums,
  updateArtistProfile,
  getRelatedArtists,
} from '../controllers/artist.controller';
import * as genreController from '../controllers/genre.controller';
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

router.get('/profile/:id', authenticate, cacheMiddleware, getArtistProfile);

router.put(
  '/profile/:id',
  authenticate,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'artistBanner', maxCount: 1 },
  ]),
  updateArtistProfile
);

router.get(
  '/stats/:id',
  authenticate,
  authorize([Role.ADMIN, Role.ARTIST]),
  getArtistStats
);

router.get(
  '/genres',
  authenticate,
  authorize([Role.ARTIST]),
  cacheMiddleware,
  genreController.getAllGenres
);

router.get('/tracks/:id', authenticate, getArtistTracks);

router.get('/albums/:id', authenticate, getArtistAlbums);

router.get('/related/:id', authenticate, getRelatedArtists);

router.get('/:id/albums', authenticate, cacheMiddleware, getArtistAlbums);

// Chỉ cho phép ARTIST (và ADMIN nếu muốn) truy cập API này
router.get(
  '/stats',
  authenticate,
  authorize([Role.ARTIST, Role.ADMIN]),
  getArtistStats
);

export default router;
