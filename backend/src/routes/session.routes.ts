import express, { Request, Response } from 'express';
import { sessionService } from '../services/session.service';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

router.post(
  '/handle-audio-play',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { userId, sessionId } = req.body;
      await sessionService.handleAudioPlay(userId, sessionId);
      res.status(200).json({ message: 'Audio play handled successfully' });
    } catch (error) {
      console.error('Error handling audio play:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

export default router;
