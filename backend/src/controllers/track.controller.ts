import { Request, Response } from 'express';
import * as trackService from '../services/track.service';

export const createTrack = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await trackService.createTrack(req);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateTrack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await trackService.updateTrack(req, id);
    res.json(result);
  } catch (error) {
    console.error('Update track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteTrack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await trackService.deleteTrack(req, id);
    res.json(result);
  } catch (error) {
    console.error('Delete track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const toggleTrackVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await trackService.toggleTrackVisibility(req, id);
    res.json(result);
  } catch (error) {
    console.error('Toggle track visibility error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const searchTrack = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await trackService.searchTrack(req);
    res.json(result);
  } catch (error) {
    console.error('Search track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTracksByType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.params;
    const result = await trackService.getTracksByType(req, type);
    res.json(result);
  } catch (error) {
    console.error('Get tracks by type error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllTracks = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await trackService.getAllTracksAdminArtist(req);
    res.json(result);
  } catch (error) {
    console.error('Get tracks error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTrackById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const track = await trackService.getTrackById(req, id);
    res.json(track);
  } catch (error) {
    console.error('Get track by id error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTracksByGenre = async (req: Request, res: Response): Promise<void> => {
  try {
    const { genreId } = req.params;
    const result = await trackService.getTracksByGenre(req, genreId);
    res.json(result);
  } catch (error) {
    console.error('Get tracks by genre error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTracksByTypeAndGenre = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, genreId } = req.params;
    const result = await trackService.getTracksByTypeAndGenre(req, type, genreId);
    res.json(result);
  } catch (error) {
    console.error('Get tracks by type and genre error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const playTrack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trackId } = req.params;
    const result = await trackService.playTrack(req, trackId);
    res.json(result);
  } catch (error) {
    console.error('Play track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const likeTrack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trackId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const result = await trackService.likeTrack(userId, trackId);
    res.json({ message: 'Track liked successfully', data: result });
  } catch (error) {
    console.error('Like track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const unlikeTrack = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trackId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    await trackService.unlikeTrack(userId, trackId);
    res.json({ message: 'Track unliked successfully' });
  } catch (error) {
    console.error('Unlike track error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const checkTrackLiked = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trackId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const result = await trackService.checkTrackLiked(userId, trackId);
    res.json(result);
  } catch (error) {
    console.error('Check track liked error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};