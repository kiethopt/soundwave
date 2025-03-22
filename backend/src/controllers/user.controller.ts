import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { handleError } from '../utils/handle-utils';

// Yêu cầu trở thành Artist (Request Artist Role)
export const requestToBecomeArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await userService.requestArtistRole(req.user, req.body, req.file);
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
  try {
    const followers = await userService.getUserFollowers(req);
    res.json(followers);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    handleError(res, error, 'Get followers');
  }
};

// Lấy danh sách người đang theo dõi hiện tại
export const getFollowing = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const following = await userService.getUserFollowing(req);
    res.json(following);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
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