import { Request, Response } from 'express';
import * as generateService from '../services/generate.service';
import { handleError } from '../utils/handle-utils';

export const generatePlaylist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;
    
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ message: 'Valid prompt is required' });
      return;
    }

    console.log(`[Generate Controller] Received playlist generation request from user ${req.user.id} with prompt: "${prompt}"`);
    
    const playlist = await generateService.generatePlaylistFromPrompt(req.user.id, prompt);
    
    if (!playlist) {
      res.status(404).json({ message: 'Failed to generate playlist' });
      return;
    }

    res.status(201).json({ 
      message: 'Playlist generated successfully', 
      playlist 
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('AI features are currently unavailable')) {
        res.status(503).json({ message: 'AI features are currently unavailable. Please try again later.' });
        return;
      }
      
      if (error.message.includes('safety reasons')) {
        res.status(400).json({ message: error.message });
        return;
      }
    }
    handleError(res, error, 'Generate playlist');
  }
}; 