import { Request, Response } from 'express';
import * as albumService from '../services/album.service';

export const createAlbum = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await albumService.createAlbum(req);
    res.status(201).json(result);
  } catch (error: unknown) {
    console.error('Create album error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

export const addTracksToAlbum = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await albumService.addTracksToAlbum(req);
    res.status(201).json(result);
  } catch (error: unknown) {
    console.error('Add tracks to album error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(400).json({ message });
  }
};

export const updateAlbum = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await albumService.updateAlbum(req);
    res.json(result);
  } catch (error: unknown) {
    console.error('Update album error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

export const deleteAlbum = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await albumService.deleteAlbum(req);
    res.json(result);
  } catch (error: unknown) {
    console.error('Delete album error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

export const toggleAlbumVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await albumService.toggleAlbumVisibility(req);
    res.json(result);
  } catch (error: unknown) {
    console.error('Toggle album error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

export const searchAlbum = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await albumService.searchAlbum(req);
    res.json(result);
  } catch (error: unknown) {
    console.error('Search album error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

export const getAllAlbums = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await albumService.getAdminAllAlbums(req);
    res.json(result);
  } catch (error: unknown) {
    console.error('Get albums error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

export const getAlbumById = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await albumService.getAlbumById(req);
    res.json(result);
  } catch (error: unknown) {
    console.error('Get album error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

export const playAlbum = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await albumService.playAlbum(req);
    res.json(result);
  } catch (error: unknown) {
    console.error('Play album error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

export const getNewestAlbums = async (req: Request, res: Response): Promise<void> => {
  try {
    const albums = await albumService.getNewestAlbums(Number(req.query.limit) || 25);
    res.json({ albums });
  } catch (error: unknown) {
    console.error('Get newest albums error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};

export const getHotAlbums = async (req: Request, res: Response): Promise<void> => {
  try {
    const albums = await albumService.getHotAlbums(Number(req.query.limit) || 25);
    res.json({ albums });
  } catch (error: unknown) {
    console.error('Get hot albums error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ message });
  }
};