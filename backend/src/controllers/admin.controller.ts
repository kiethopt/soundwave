import { Request, Response } from 'express';
import {
  handleError,
  runValidations,
  validateField,
} from '../utils/handle-utils';
import * as adminService from '../services/admin.service';
import * as playlistService from '../services/playlist.service';
import prisma from '../config/db';

// Lấy danh sách tất cả người dùng - ADMIN only
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { users, pagination } = await adminService.getUsers(req);
    res.json({ users, pagination });
  } catch (error) {
    handleError(res, error, 'Get all users');
  }
};

// Lấy thông tin chi tiết của một người dùng - ADMIN only
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await adminService.getUserById(id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    handleError(res, error, 'Get user by id');
  }
};

// Lấy tất cả request yêu cầu trở thành Artist từ User - ADMIN only
export const getAllArtistRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { requests, pagination } = await adminService.getArtistRequests(req);
    res.json({ requests, pagination });
  } catch (error) {
    handleError(res, error, 'Get artist requests');
  }
};

// Xem chi tiết request yêu cầu trở thành Artist từ User - ADMIN only
export const getArtistRequestDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const request = await adminService.getArtistRequestDetail(id);

    res.json(request);
  } catch (error) {
    if (error instanceof Error && error.message === 'Request not found') {
      res.status(404).json({ message: 'Request not found' });
      return;
    }
    handleError(res, error, 'Get artist request details');
  }
};

// Cập nhật thông tin người dùng - ADMIN only
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedUser = await adminService.updateUserInfo(
      id,
      req.body,
      req.file
    );

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        res.status(404).json({ message: 'User not found' });
        return;
      } else if (
        error.message === 'Email already exists' ||
        error.message === 'Username already exists'
      ) {
        res.status(400).json({ message: error.message });
        return;
      } else if (error.message === 'Current password is incorrect') {
        res.status(400).json({ message: error.message });
        return;
      }
    }
    handleError(res, error, 'Update user');
  }
};

// Cập nhật thông tin nghệ sĩ - ADMIN only
export const updateArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedArtist = await adminService.updateArtistInfo(
      id,
      req.body,
      req.file
    );

    res.json({
      message: 'Artist updated successfully',
      artist: updatedArtist,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Artist not found') {
        res.status(404).json({ message: 'Artist not found' });
        return;
      } else if (error.message === 'Artist name already exists') {
        res.status(400).json({ message: 'Artist name already exists' });
        return;
      }
    }
    handleError(res, error, 'Update artist');
  }
};

// Xóa người dùng - ADMIN only
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    await adminService.deleteUserById(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Delete user');
  }
};

// Xóa nghệ sĩ - ADMIN only
export const deleteArtist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    await adminService.deleteArtistById(id);
    res.json({ message: 'Artist deleted permanently' });
  } catch (error) {
    handleError(res, error, 'Delete artist');
  }
};

// Lấy danh sách tất cả nghệ sĩ - ADMIN only
export const getAllArtists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { artists, pagination } = await adminService.getArtists(req);

    res.json({ artists, pagination });
  } catch (error) {
    handleError(res, error, 'Get all artists');
  }
};

// Lấy thông tin chi tiết của một nghệ sĩ - ADMIN only
export const getArtistById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const artist = await adminService.getArtistById(id);

    res.json(artist);
  } catch (error) {
    if (error instanceof Error && error.message === 'Artist not found') {
      res.status(404).json({ message: 'Artist not found' });
      return;
    }
    handleError(res, error, 'Get artist by id');
  }
};

// Tạo thể loại nhạc mới - ADMIN only
export const createGenre = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name } = req.body;

    // Validation
    const validationErrors = runValidations([
      validateField(name, 'Name', { required: true }),
      name && validateField(name.trim(), 'Name', { minLength: 1 }),
      name && validateField(name, 'Name', { maxLength: 50 }),
    ]);

    if (validationErrors.length > 0) {
      res
        .status(400)
        .json({ message: 'Validation failed', errors: validationErrors });
      return;
    }

    const genre = await adminService.createNewGenre(name);
    res.status(201).json({ message: 'Genre created successfully', genre });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Genre name already exists'
    ) {
      res.status(400).json({ message: 'Genre name already exists' });
      return;
    }
    handleError(res, error, 'Create genre');
  }
};

// Cập nhật thể loại nhạc - ADMIN only
export const updateGenre = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validation
    const validationErrors = runValidations([
      validateField(id, 'Genre ID', { required: true }),
      validateField(name, 'Name', { required: true }),
      name && validateField(name.trim(), 'Name', { minLength: 1 }),
      name && validateField(name, 'Name', { maxLength: 50 }),
    ]);

    if (validationErrors.length > 0) {
      res
        .status(400)
        .json({ message: 'Validation failed', errors: validationErrors });
      return;
    }

    const updatedGenre = await adminService.updateGenreInfo(id, name);

    res.json({
      message: 'Genre updated successfully',
      genre: updatedGenre,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Genre not found') {
        res.status(404).json({ message: 'Genre not found' });
        return;
      } else if (error.message === 'Genre name already exists') {
        res.status(400).json({ message: 'Genre name already exists' });
        return;
      }
    }
    handleError(res, error, 'Update genre');
  }
};

// Xóa thể loại nhạc - ADMIN only
export const deleteGenre = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    await adminService.deleteGenreById(id);
    res.json({ message: 'Genre deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Delete genre');
  }
};

// Duyệt yêu cầu trở thành Artist (Approve Artist Request) - ADMIN only
export const approveArtistRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { requestId } = req.body;
    const updatedProfile = await adminService.approveArtistRequest(requestId);
    // tao thong bao cho nguoi dung
    await prisma.notification.create({
      data: {
        type: 'ARTIST_REQUEST_APPROVE',
        message: 'Your request to become an Artist has been approved!',
        recipientType: 'USER',
        userId: updatedProfile.user.id,
        isRead: false,
      },
    });
    res.json({
      message: 'Artist role approved successfully',
      user: updatedProfile.user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('not found or already verified')
    ) {
      res
        .status(404)
        .json({ message: 'Artist request not found or already verified' });
      return;
    }
    handleError(res, error, 'Approve artist request');
  }
};

// Từ chối yêu cầu trở thành Artist (Reject Artist Request) - ADMIN only
export const rejectArtistRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { requestId, reason } = req.body;
    const result = await adminService.rejectArtistRequest(requestId);

    let notificationMessage =
      'Your request to become an Artist has been rejected.';
    if (reason && reason.trim() !== '') {
      notificationMessage += ` Reason: ${reason.trim()}`;
    }

    // Create notification for the user
    await prisma.notification.create({
      data: {
        type: 'ARTIST_REQUEST_REJECT',
        message: notificationMessage,
        recipientType: 'USER',
        userId: result.user.id,
        isRead: false,
      },
    });

    res.json({
      message: 'Artist role request rejected successfully',
      user: result.user,
      hasPendingRequest: result.hasPendingRequest,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('not found or already verified')
    ) {
      res
        .status(404)
        .json({ message: 'Artist request not found or already verified' });
      return;
    }
    handleError(res, error, 'Reject artist request');
  }
};

// Lấy thông số tổng quan để thống kê - ADMIN only
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const statsData = await adminService.getSystemStats();
    res.json(statsData);
  } catch (error) {
    handleError(res, error, 'Get stats');
  }
};

// Cập nhật trạng thái cache - ADMIN only
export const handleCacheStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { enabled } = req.method === 'POST' ? req.body : {};
    const result = await adminService.updateCacheStatus(enabled);
    res.json(result);
  } catch (error) {
    handleError(res, error, 'Manage cache status');
  }
};

// Lấy và cập nhật trạng thái model AI - ADMIN only
export const handleAIModelStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { model } = req.method === 'POST' ? req.body : {};
    const result = await adminService.updateAIModel(model);
    res.json(result);
  } catch (error) {
    handleError(res, error, 'Manage AI model');
  }
};

// Lấy ma trận đề xuất - ADMIN only
export const getRecommendationMatrix = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const matrix = await adminService.getRecommendationMatrix(limit);

    if (!matrix.success) {
      res.status(400).json({
        message: matrix.message || 'Failed to retrieve recommendation matrix',
      });
      return;
    }

    res.json(matrix);
  } catch (error) {
    handleError(res, error, 'Get recommendation matrix');
  }
};

// Update playlists - unified endpoint for all playlist types
export const updateSystemPlaylists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { type } = req.query;

    console.log(
      `[Admin Controller] Starting playlist update. Type: ${type || 'all'}`
    );

    if (!type || type === 'all') {
      // Update all system playlists
      await playlistService.systemPlaylistService.updateAllSystemPlaylists();

      res.json({
        success: true,
        message: 'All system playlists have been updated successfully',
      });
      return;
    }

    // Update specific playlist type
    switch (type) {
      case 'global':
      case 'trending':
      case 'top-hits':
        await prisma.playlist.updateGlobalPlaylist();
        res.json({
          success: true,
          message: 'Trending Now playlists have been updated successfully',
        });
        break;

      case 'discover-weekly':
        await prisma.playlist.updateDiscoverWeeklyPlaylists();
        res.json({
          success: true,
          message: 'Discover Weekly playlists have been updated successfully',
        });
        break;

      case 'new-releases':
        await prisma.playlist.updateNewReleasesPlaylists();
        res.json({
          success: true,
          message: 'New Releases playlists have been updated successfully',
        });
        break;

      default:
        res.status(400).json({
          success: false,
          message: `Invalid playlist type: ${type}. Valid types are: all, global, trending, top-hits, discover-weekly, new-releases`,
        });
    }
  } catch (error) {
    console.error('Error updating playlists:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update playlists',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Debug hàm update global playlist
export const debugActiveTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const activeTracks = await prisma.track.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        artistId: true,
        artist: {
          select: {
            artistName: true,
          },
        },
        playCount: true,
        _count: {
          select: {
            likedBy: true,
          },
        },
      },
      take: 20,
    });

    // Also get counts for histories and likes
    const historyCount = await prisma.history.count({
      where: {
        type: 'PLAY',
        trackId: { not: null },
        playCount: { gt: 0 },
      },
    });

    const likesCount = await prisma.userLikeTrack.count();

    res.json({
      message: 'Debug active tracks',
      activeTracks: activeTracks,
      trackCount: activeTracks.length,
      historyCount,
      likesCount,
      qualityThresholds: {
        requiredPlayCount: 5,
        requiredLikeCount: 2,
        minCompletionRate: 0.3,
      },
    });
  } catch (error) {
    console.error('Error getting debug tracks:', error);
    res.status(500).json({
      message: 'Failed to get debug tracks',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
