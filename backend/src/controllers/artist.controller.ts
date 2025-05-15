import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ArtistService } from 'src/services/artist.service';

// Validation function for updating artist profile
const validateUpdateArtistProfile = (data: any): string | null => {
  const { bio, socialMediaLinks, genreIds } = data;

  // Validate bio
  if (bio && bio.length > 500) {
    return 'Bio must be less than 500 characters';
  }

  // Validate socialMediaLinks
  if (socialMediaLinks) {
    if (typeof socialMediaLinks !== 'object') {
      return 'Social media links must be an object';
    }

    const validKeys = ['facebook', 'instagram', 'twitter', 'youtube'];
    for (const key of Object.keys(socialMediaLinks)) {
      if (!validKeys.includes(key)) {
        return `Invalid social media key: ${key}`;
      }
      if (typeof socialMediaLinks[key] !== 'string') {
        return `Social media link for ${key} must be a string`;
      }
    }
  }

  // Validate genreIds
  if (genreIds) {
    if (!Array.isArray(genreIds)) {
      return 'Genre IDs must be an array';
    }
    if (genreIds.some((id) => typeof id !== 'string')) {
      return 'All genre IDs must be strings';
    }
  }

  return null;
};

export const getAllArtistsProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (
      user.role !== Role.ADMIN &&
      (!user.artistProfile?.isVerified || user.currentProfile !== 'ARTIST')
    ) {
      res.status(403).json({
        message: 'You do not have permission to perform this action',
        code: 'SWITCH_TO_ARTIST_PROFILE',
      });
      return;
    }

    const result = await ArtistService.getAllArtistsProfile(
      user,
      Number(page),
      Number(limit)
    );
    res.json(result);
  } catch (error) {
    console.error('Get all artists profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getArtistProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const artist = await ArtistService.getArtistProfile(id);

    if (!artist) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    res.json(artist);
  } catch (error) {
    console.error('Error fetching artist profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getArtistAlbums = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const result = await ArtistService.getArtistAlbums(
      user,
      id,
      Number(page),
      Number(limit)
    );

    if (!result) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching artist albums:', error);
    const statusCode = error.status || error.statusCode || 500;
    if (error.message === 'Artist is not verified') {
      res.status(403).json({ message: 'Artist is not verified' });
    } else if (error.message === 'Artist not found') {
      res.status(404).json({ message: 'Artist not found' });
    } else {
      res.status(statusCode).json({ message: error.message || 'Internal server error' });
    }
  }
};

export const getArtistTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const result = await ArtistService.getArtistTracks(
      user,
      id,
      Number(page),
      Number(limit)
    );

    if (!result) {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching artist tracks:', error);
    const statusCode = error.status || error.statusCode || 500;
    if (error.message === 'Artist is not verified') {
      res.status(403).json({ message: 'Artist is not verified' });
    } else if (error.message === 'Artist not found') {
      res.status(404).json({ message: 'Artist not found' });
    } else {
      res.status(statusCode).json({ message: error.message || 'Internal server error' });
    }
  }
};

export const updateArtistProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { bio, socialMediaLinks, genreIds, isVerified, artistName } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Parse socialMediaLinks if it's a string
    let parsedSocialMediaLinks = socialMediaLinks;
    if (typeof socialMediaLinks === 'string') {
      try {
        parsedSocialMediaLinks = JSON.parse(socialMediaLinks);
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid socialMediaLinks format',
        });
        return;
      }
    }

    // Parse genreIds if it's a string
    let parsedGenreIds = genreIds;
    if (typeof genreIds === 'string') {
      try {
        parsedGenreIds = genreIds.split(',');
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid genreIds format',
        });
        return;
      }
    }

    // Validate data
    const error = validateUpdateArtistProfile({
      bio,
      socialMediaLinks: parsedSocialMediaLinks,
      genreIds: parsedGenreIds,
    });
    if (error) {
      res.status(400).json({
        success: false,
        message: error,
      });
      return;
    }

    const updatedArtistProfile = await ArtistService.updateArtistProfile(
      user,
      id,
      {
        bio,
        socialMediaLinks: parsedSocialMediaLinks,
        genreIds: parsedGenreIds,
        isVerified,
        artistName,
      },
      files
    );

    res.status(200).json({
      success: true,
      message: 'Artist profile updated successfully',
      data: updatedArtistProfile,
    });
  } catch (error: any) {
    console.error('Update artist profile error:', error);
    res.status(403).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

export const getArtistStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const stats = await ArtistService.getArtistStats(user);
    res.json(stats);
  } catch (error: any) {
    console.error('Get artist stats error:', error);
    res.status(error.message === 'Forbidden' ? 403 : 500).json({
      message: error.message || 'Internal server error',
    });
  }
};

export const getRelatedArtists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const relatedArtists = await ArtistService.getRelatedArtists(id);
    res.json(relatedArtists);
  } catch (error: any) {
    console.error('Get related artists error:', error);
    res.status(error.message === 'Artist not found' ? 404 : 500).json({
      message: error.message || 'Internal server error',
    });
  }
};