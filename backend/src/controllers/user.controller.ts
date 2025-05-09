import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { handleError } from '../utils/handle-utils';
import { getIO, getUserSockets } from '../config/socket';
import { uploadToCloudinary } from '../utils/cloudinary';

// Yêu cầu trở thành Artist (Request Artist Role)
export const requestToBecomeArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // req.user được lấy từ middleware authenticate
    const currentUser = req.user;
    if (!currentUser) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    // Gọi service để tạo yêu cầu, service sẽ trả về profile nếu thành công
    const createdProfile = await userService.requestArtistRole(currentUser, req.body, req.file);

    // --- Phát sự kiện Socket.IO cho user (with added error handling) --- 
    try {
        const io = getIO();
        const userSockets = getUserSockets();
        if (currentUser && currentUser.id) {
            const targetSocketId = userSockets.get(currentUser.id);

            if (targetSocketId) {
                console.log(`🚀 Emitting artist_request_submitted to user ${currentUser.id} via socket ${targetSocketId}`);
                io.to(targetSocketId).emit('artist_request_submitted', {
                    hasPendingRequest: true,
                    artistProfileId: createdProfile.id 
                });
            } else {
                console.log(`Socket not found for user ${currentUser.id}. Cannot emit request submission update.`);
            }
        } else {
            console.warn('[Socket Emit] currentUser or currentUser.id is undefined. Cannot emit socket event.');
        }
    } catch (socketError) {
        console.error('[Controller] Failed to emit socket event for artist request submission:', socketError);
    }
    
    // Send success response regardless of socket emission outcome
    res.json({ message: 'Artist role request submitted successfully' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Forbidden') {
        res.status(403).json({ message: 'Forbidden' });
        return;
      } else if (error.message.includes('already requested')) {
        res.status(400).json({ message: error.message });
        return;
      } else if (error.message.includes('Invalid JSON format')) {
        res.status(400).json({ message: error.message });
        return;
      }
    }
    handleError(res, error, 'Request artist role');
  }
};

// Tìm kiếm tổng hợp (Search All)
export const searchAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;

    if (!q) {
      res.status(400).json({ message: 'Query is required' });
      return;
    }

    const searchQuery = String(q).trim();
    const results = await userService.search(req.user, searchQuery);

    res.json(results);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    handleError(res, error, 'Search');
  }
};

// Lấy danh sách tất cả thể loại hiện có
export const getAllGenres = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const genres = await userService.getAllGenres();
    res.json(genres);
  } catch (error) {
    handleError(res, error, 'Get all genres');
  }
};

// Theo dõi người dùng
export const followUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id: followingId } = req.params;
    const result = await userService.followTarget(req.user, followingId);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Target not found') {
        res.status(404).json({ message: 'Target not found' });
        return;
      } else if (error.message === 'Cannot follow yourself') {
        res.status(400).json({ message: 'Cannot follow yourself' });
        return;
      } else if (error.message === 'Already following') {
        res.status(400).json({ message: 'Already following' });
        return;
      } else if (error.message === 'Unauthorized') {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
    }
    handleError(res, error, 'Follow user');
  }
};

// Hủy theo dõi người dùng
export const unfollowUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id: followingId } = req.params;
    const result = await userService.unfollowTarget(req.user, followingId);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Target not found') {
        res.status(404).json({ message: 'Target not found' });
        return;
      } else if (error.message === 'Not following this target') {
        res.status(400).json({ message: 'Not following this target' });
        return;
      } else if (error.message === 'Unauthorized') {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
    }
    handleError(res, error, 'Unfollow user');
  }
};

// Lấy danh sách người theo dõi hiện tại
export const getFollowers = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const followers = await userService.getUserFollowers(id);
    res.json(followers);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({ message: 'User not found' });
        return;
      } else if (error.message === 'Unauthorized') {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      } else if (error.message === 'User ID is required') {
        res.status(400).json({ message: 'User ID is required' });
        return;
      }
    }
    handleError(res, error, 'Get followers');
  }
};

// Lấy danh sách người đang theo dõi hiện tại
export const getFollowing = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const following = await userService.getUserFollowing(id);
    res.json(following);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({ message: 'User not found' });
        return;
      } else if (error.message === 'Unauthorized') {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      } else if (error.message === 'User ID is required') {
        res.status(400).json({ message: 'User ID is required' });
        return;
      }
    }
    handleError(res, error, 'Get following');
  }
};

// Cập nhật thông tin người dùng
export const editProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const updatedUser = await userService.editProfile(
      req.user,
      req.body,
      req.file
    );
    res.json(updatedUser);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        res.status(401).json({ message: 'Unauthorized' });
      } else if (error.message === 'Email already in use') {
        res.status(400).json({ message: 'Email already in use' });
      } else if (error.message === 'Username already in use') {
        res.status(400).json({ message: 'Username already in use' });
      } else if (error.message === 'No data provided for update') {
        res.status(400).json({ message: 'No data provided for update' });
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// Thêm hàm kiểm tra yêu cầu trở thành Artist
export const checkArtistRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const request = await userService.getArtistRequest(req.user.id);
    res.json(request);
  } catch (error) {
    handleError(res, error, 'Check artist request');
  }
};

export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.getUserProfile(id);
    res.json(user);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({ message: 'User not found' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const getRecommendedArtists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const recommendedArtists = await userService.getRecommendedArtists(
      req.user
    );
    res.json(recommendedArtists);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ message: 'Unauthorized' });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

export const getTopAlbums = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const topAlbums = await userService.getTopAlbums();
    res.json(topAlbums);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTopArtists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const topArtists = await userService.getTopArtists();
    res.json(topArtists);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTopTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const topTracks = await userService.getTopTracks();
    res.json(topTracks);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getNewestTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tracks = await userService.getNewestTracks();
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getNewestAlbums = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const albums = await userService.getNewestAlbums();
    res.json(albums);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// get user most listened tracks this month
export const getUserTopTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tracks = await userService.getUserTopTracks(req.user);
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// get user most listened artists this month
export const getUserTopArtists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const artists = await userService.getUserTopArtists(req.user);
    res.json(artists);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

// get user most listened artist's album this month
export const getUserTopAlbums = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const albums = await userService.getUserTopAlbums(req.user);
    res.json(albums);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getGenreTopAlbums = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const albums = await userService.getGenreTopAlbums(id);
    res.json(albums);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getGenreTopTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const tracks = await userService.getGenreTopTracks(id);
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getGenreTopArtists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const artists = await userService.getGenreTopArtists(id);
    res.json(artists);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const getGenreNewestTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const tracks = await userService.getGenreNewestTracks(id);
    res.json(tracks);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const setFollowVisibility = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const isPublic = req.body.isVisible;
    const result = await userService.setFollowVisibility(req.user, isPublic);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    handleError(res, error, 'Set follow visibility');
  }
}

export const getPlayHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const playHistory = await userService.getPlayHistory(req.user);
    res.json(playHistory);
  } catch (error) {
    handleError(res, error, 'Get play history');
  }
}

// --- Artist Claim Controllers ---

export const submitArtistClaim = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; [key: string]: any } | undefined;
    if (!currentUser || !currentUser.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const userId = currentUser.id;
    const { artistProfileId } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!artistProfileId || !files || files.length === 0) {
      res.status(400).json({ message: 'Artist profile ID and proof are required.' });
      return;
    }

    // Upload all files to Cloudinary and collect URLs
    const proof: string[] = [];
    for (const file of files) {
      const resourceType = file.mimetype.startsWith('image/') ? 'image' : 'raw';
      const result: any = await uploadToCloudinary(file.buffer, {
        folder: 'artist-claims',
        resource_type: resourceType,
      });
      proof.push(result.secure_url);
    }

    const claim = await userService.submitArtistClaim(
      userId,
      artistProfileId,
      proof
    );

    res.status(201).json({ message: 'Claim submitted successfully.', claim });
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific errors from the service
      if (error.message.includes('Unauthorized')) {
        res.status(401).json({ message: error.message });
      } else if (error.message.includes('not found') || error.message.includes('already associated') || error.message.includes('already verified')) {
        res.status(404).json({ message: error.message });
      } else if (error.message.includes('already have a pending claim') || error.message.includes('already been approved') || error.message.includes('was rejected')) {
        res.status(409).json({ message: error.message });
      } else {
        handleError(res, error, 'Submit artist claim');
      }
    } else {
      handleError(res, error, 'Submit artist claim');
    }
  }
};

export const getUserClaims = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const currentUser = req.user as { id: string; [key: string]: any } | undefined;
    if (!currentUser || !currentUser.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const userId = currentUser.id;

    const claims = await userService.getUserClaims(userId);
    res.json(claims);
  } catch (error) {
     if (error instanceof Error && error.message.includes('Unauthorized')) {
       res.status(401).json({ message: error.message });
     } else {
       handleError(res, error, 'Get user claims');
     }
  }
};

export const getAllArtistsProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const artists = await userService.getAllArtistsProfile();
    res.json(artists);
  } catch (error) {
    handleError(res, error, 'Get claimable artists');
  }
};

export const getDiscoverGenres = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const genres = await userService.getDiscoverGenres();
    res.json(genres);
  } catch (error) {
    handleError(res, error, 'Get discover genres');
  }
};