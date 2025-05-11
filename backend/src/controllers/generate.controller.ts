import { Request, Response } from 'express';
import * as generateService from '../services/generate.service';
import { handleError } from '../utils/handle-utils';
import prisma from '../config/db';

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
      // Handle specific AI feature availability errors
      if (error.message.includes('AI features are currently unavailable')) {
        res.status(503).json({ message: 'AI features are currently unavailable. Please try again later.' });
        return;
      }
      
      // Handle safety/moderation failures
      if (error.message.includes('safety reasons')) {
        res.status(400).json({ message: error.message });
        return;
      }

      // Handle invalid prompt errors with custom message
      if (error.message.startsWith('INVALID_PROMPT:')) {
        const cleanErrorMessage = error.message.replace('INVALID_PROMPT:', '').trim();
        res.status(400).json({ message: cleanErrorMessage });
        return;
      }
    }
    handleError(res, error, 'Generate playlist');
  }
};

export const suggestMoreTracks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { playlistId } = req.params;
    const { prompt } = req.body;

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ message: 'Valid prompt is required for suggestions' });
      return;
    }

    if (isNaN(parseInt(playlistId)) && typeof playlistId !== 'string') { // Prisma IDs are strings (cuid)
        res.status(400).json({ message: 'Valid playlistId is required' });
        return;
    }

    console.log(`[Generate Controller] Received track suggestion request for playlist ${playlistId} from user ${req.user.id} with prompt: "${prompt}"`);

    const suggestedTrackIds = await generateService.suggestTracksForExistingPlaylist(
      playlistId,
      req.user.id,
      prompt
    );

    if (!suggestedTrackIds || suggestedTrackIds.length === 0) {
      res.status(200).json({ 
        message: 'AI could not find any new suitable tracks based on your prompt or the playlist is already optimal with current tracks.', 
        playlistId,
        addedTracks: [] 
      });
      return;
    }

    // Add suggested tracks to the playlist
    // Get current max trackOrder in the playlist
    const existingPlaylistTracks = await prisma.playlistTrack.findMany({
        where: { playlistId },
        orderBy: { trackOrder: 'desc' },
        take: 1,
    });
    let currentMaxOrder = 0;
    if (existingPlaylistTracks.length > 0) {
        currentMaxOrder = existingPlaylistTracks[0].trackOrder;
    }

    const tracksToCreate = suggestedTrackIds.map((trackId, index) => ({
      playlistId: playlistId,
      trackId: trackId,
      trackOrder: currentMaxOrder + 1 + index,
    }));

    await prisma.playlistTrack.createMany({
      data: tracksToCreate,
      skipDuplicates: true, // Just in case, though service function should prevent duplicates
    });

    // Update playlist metadata (totalTracks, totalDuration)
    const tracksInPlaylist = await prisma.playlistTrack.findMany({
        where: { playlistId: playlistId },
        include: { track: { select: { duration: true }}}
    });

    const totalTracks = tracksInPlaylist.length;
    const totalDuration = tracksInPlaylist.reduce((sum, pt) => sum + (pt.track?.duration || 0), 0);

    await prisma.playlist.update({
        where: { id: playlistId },
        data: {
            totalTracks: totalTracks,
            totalDuration: totalDuration,
            updatedAt: new Date(), // Explicitly update timestamp
        }
    });

    res.status(200).json({ 
      success: true,
      message: `Successfully added ${suggestedTrackIds.length} tracks to the playlist.`,
      playlistId,
      addedTracks: suggestedTrackIds
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('AI features are currently unavailable')) {
        res.status(503).json({ message: 'AI features are currently unavailable for suggestions. Please try again later.' });
        return;
      }
      // Check for the specific INVALID_PROMPT error from the service
      if (error.message.startsWith('INVALID_PROMPT:')) {
        const cleanErrorMessage = error.message.replace('INVALID_PROMPT:', '').trim();
        res.status(400).json({ message: cleanErrorMessage });
        return;
      }
      if (error.message.includes('safety reasons') || error.message.includes('Playlist not found')) {
        res.status(400).json({ message: error.message });
        return;
      }
    }
    handleError(res, error, 'Suggest more tracks for playlist');
  }
}; 