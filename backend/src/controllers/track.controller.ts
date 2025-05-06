import { Request, Response } from 'express';
import * as trackService from '../services/track.service';
import * as albumService from '../services/album.service';
import { handleError } from '../utils/handle-utils';
import { TrackService } from '../services/track.service';

export const createTrack = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.artistProfile) {
      res.status(403).json({ message: 'Forbidden: Only verified artists can upload tracks.' });
      return;
    }

    const files = req.files as { 
      audioFile?: Express.Multer.File[]; 
      coverFile?: Express.Multer.File[];
    };

    if (!files || !files.audioFile || files.audioFile.length === 0) {
      res.status(400).json({ message: 'Audio file is required.' });
      return;
    }

    const audioFile = files.audioFile[0];
    const coverFile = files.coverFile?.[0];

    const {
      title,
      releaseDate,
      genreIds,
      featuredArtistIds,
      featuredArtistNames,
      labelId
    } = req.body;

    if (!title || !releaseDate) {
      res.status(400).json({ message: 'Title and release date are required.' });
      return;
    }
    
    if (!Array.isArray(genreIds || [])) {
       res.status(400).json({ message: 'Genres must be an array.' });
       return;
    }
     if (!Array.isArray(featuredArtistIds || [])) {
       res.status(400).json({ message: 'Featured artist IDs must be an array.' });
       return;
    }
     if (!Array.isArray(featuredArtistNames || [])) {
       res.status(400).json({ message: 'Featured artist names must be an array.' });
       return;
    }

    const createData = {
      title,
      releaseDate,
      type: 'SINGLE' as const,
      genreIds: genreIds || [],
      featuredArtistIds: featuredArtistIds || [],
      featuredArtistNames: featuredArtistNames || [],
      labelId: labelId || undefined
    };

    const newTrack = await TrackService.createTrack(
      user.artistProfile.id,
      createData,
      audioFile,
      coverFile,
      user
    );

    res.status(201).json({ message: 'Track created successfully', track: newTrack });

  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ message: `A track with this title likely already exists for this artist.`, code: error.code });
    } else {
      handleError(res, error, 'Create track');
    }
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

export const checkTrackCopyright = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user || !user.artistProfile) {
      res.status(403).json({ message: 'Forbidden: Only verified artists can check copyright.' });
      return;
    }

    const files = req.files as { audioFile?: Express.Multer.File[] };
    if (!files || !files.audioFile || files.audioFile.length === 0) {
      res.status(400).json({ message: 'Audio file is required.' });
      return;
    }
    const audioFile = files.audioFile[0];

    const { title, releaseDate } = req.body;
    if (!title || !releaseDate) {
      res.status(400).json({ message: 'Title and release date are required for context during copyright check.' });
      return;
    }

    // Extract featured artist information
    const featuredArtistIds = (req.body.featuredArtistIds || []) as string[];
    const featuredArtistNames = (req.body.featuredArtistNames || []) as string[];

    const checkData = {
      title,
      releaseDate,
      declaredFeaturedArtistIds: Array.isArray(featuredArtistIds) ? featuredArtistIds : [],
      declaredFeaturedArtistNames: Array.isArray(featuredArtistNames) ? featuredArtistNames : [],
    };

    const result = await TrackService.checkTrackCopyrightOnly(
      user.artistProfile.id,
      checkData,
      audioFile,
      user
    );

    res.status(200).json(result);

  } catch (error: any) {
    if (error.isCopyrightConflict && error.copyrightDetails) {
      res.status(409).json({
        message: error.message,
        isCopyrightConflict: true,
        copyrightDetails: error.copyrightDetails,
        isSafeToUpload: false,
      });
    } else {
      handleError(res, error, 'Check track copyright');
    }
  }
};