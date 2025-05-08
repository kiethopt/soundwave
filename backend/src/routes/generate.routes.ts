import express from 'express';
import * as generateController from '../controllers/generate.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * @route   POST /api/generate/playlist
 * @desc    Generate a new playlist using AI based on user prompt
 * @access  Private
 */
router.post('/playlist', authenticate, generateController.generatePlaylist);

/**
 * @route   POST /api/generate/playlist/:playlistId/suggest-more
 * @desc    Suggest more tracks for an existing playlist using AI based on user prompt
 * @access  Private
 */
router.post('/playlist/:playlistId/suggest-more', authenticate, generateController.suggestMoreTracks);

export default router; 