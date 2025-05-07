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

export default router; 