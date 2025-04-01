import { Request, Response } from 'express';
import {
  handleError,
  runValidations,
  validateField,
} from '../utils/handle-utils';
import * as adminService from '../services/admin.service';
import * as playlistService from '../services/playlist.service';
import prisma from '../config/db';
import * as emailService from '../services/email.service';

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
    const avatarFile = req.file;
    const { isActive, reason, ...userData } = req.body;

    // Check if we're updating isActive status (activating/deactivating)
    const isStatusUpdate = 'isActive' in req.body || isActive !== undefined;

    // Handle user activation/deactivation with reason
    if (isStatusUpdate) {
      // Properly convert isActive to boolean
      const isActiveBool =
        isActive === 'true' || isActive === true ? true : false;

      const currentUser = await prisma.user.findUnique({
        where: { id },
        select: { isActive: true, email: true, name: true, username: true }, // Lấy thêm email, name, username
      });

      if (currentUser && currentUser.isActive && !isActiveBool) {
        // User is being deactivated
        const updatedUser = await adminService.updateUserInfo(id, {
          isActive: false,
        });

        // Send notification if reason is provided
        if (reason) {
          await prisma.notification.create({
            data: {
              type: 'ACCOUNT_DEACTIVATED',
              message: `Your account has been deactivated. Reason: ${reason}`,
              recipientType: 'USER',
              userId: id,
              isRead: false,
            },
          });
        }
        // **Gửi email thông báo Deactivation**
        if (currentUser.email) {
          const userName = currentUser.name || currentUser.username || 'User';
          try {
            const emailOptions = emailService.createAccountDeactivatedEmail(
              currentUser.email,
              userName,
              'user', // Loại tài khoản
              reason
            );
            await emailService.sendEmail(emailOptions);
          } catch (emailError) {
            console.error(`Failed to send user deactivation email to ${currentUser.email}:`, emailError);
          }
        }

        res.json({ message: 'User deactivated successfully', user: updatedUser });
        return; // Kết thúc hàm sau khi xử lý xong
      } else if (currentUser && !currentUser.isActive && isActiveBool) {
        // User is being activated
        const updatedUser = await adminService.updateUserInfo(id, {
          isActive: true,
        });

        // Send notification for reactivation
        await prisma.notification.create({
          data: {
            type: 'ACCOUNT_ACTIVATED',
            message: 'Your account has been reactivated.',
            recipientType: 'USER',
            userId: id,
            isRead: false,
          },
        });
        // **Gửi email thông báo Activation**
        if (currentUser.email) {
          const userName = currentUser.name || currentUser.username || 'User';
          try {
            const emailOptions = emailService.createAccountActivatedEmail(
              currentUser.email,
              userName,
              'user' // Loại tài khoản
            );
            await emailService.sendEmail(emailOptions);
          } catch (emailError) {
            console.error(`Failed to send user activation email to ${currentUser.email}:`, emailError);
          }
        }

        res.json({ message: 'User activated successfully', user: updatedUser });
        return; // Kết thúc hàm sau khi xử lý xong
      }
    }

    // Regular user update (not status change)
    const updatedUser = await adminService.updateUserInfo(
      id,
      userData,
      avatarFile
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
    const avatarFile = req.file;
    const { isActive, reason, ...artistData } = req.body;

    // Check if we're updating isActive status (activating/deactivating)
    const isStatusUpdate = 'isActive' in req.body || isActive !== undefined;

    // Handle artist activation/deactivation with reason
    if (isStatusUpdate) {
      // Properly convert isActive to boolean
      const isActiveBool =
        isActive === 'true' || isActive === true ? true : false;

      const currentArtist = await prisma.artistProfile.findUnique({
        where: { id },
        select: { isActive: true, userId: true, artistName: true }, // Lấy thêm artistName
      });
      // **Lấy thông tin user (chủ sở hữu artist profile) để gửi email**
      let ownerUser: { email: string | null, name: string | null, username: string | null } | null = null;
      if (currentArtist?.userId) {
        ownerUser = await prisma.user.findUnique({
          where: { id: currentArtist.userId },
          select: { email: true, name: true, username: true }
        });
      }
      const ownerUserName = ownerUser?.name || ownerUser?.username || 'Artist';
      if (currentArtist && currentArtist.isActive && !isActiveBool) {
        // Artist is being deactivated
        const updatedArtist = await adminService.updateArtistInfo(id, {
          isActive: false,
        });

        // Send notification if reason is provided
        if (reason && currentArtist.userId) {
          await prisma.notification.create({
            data: {
              type: 'ACCOUNT_DEACTIVATED',
              message: `Your artist account has been deactivated. Reason: ${reason}`,
              recipientType: 'USER',
              userId: currentArtist.userId,
              isRead: false,
            },
          });
        }
        // **Gửi email thông báo Deactivation Artist**
        if (ownerUser?.email) {
          try {
            const emailOptions = emailService.createAccountDeactivatedEmail(
              ownerUser.email,
              ownerUserName,
              'artist', // Loại tài khoản
              reason
            );
            await emailService.sendEmail(emailOptions);
          } catch (emailError) {
            console.error(`Failed to send artist deactivation email to ${ownerUser.email}:`, emailError);
          }
        }
        res.json({
          message: 'Artist deactivated successfully',
          artist: updatedArtist,
        });
        return;
      } else if (currentArtist && !currentArtist.isActive && isActiveBool) {
        // Artist is being activated
        const updatedArtist = await adminService.updateArtistInfo(id, {
          isActive: true,
        });

        // Send notification for reactivation
        if (currentArtist.userId) {
          await prisma.notification.create({
            data: {
              type: 'ACCOUNT_ACTIVATED',
              message: 'Your artist account has been reactivated.',
              recipientType: 'USER',
              userId: currentArtist.userId,
              isRead: false,
            },
          });
        }
        // **Gửi email thông báo Activation Artist**
        if (ownerUser?.email) {
          try {
            const emailOptions = emailService.createAccountActivatedEmail(
              ownerUser.email,
              ownerUserName,
              'artist' // Loại tài khoản
            );
            await emailService.sendEmail(emailOptions);
          } catch (emailError) {
            console.error(`Failed to send artist activation email to ${ownerUser.email}:`, emailError);
          }
        }

        res.json({
          message: 'Artist activated successfully',
          artist: updatedArtist,
        });
        return;
      }
    }

    // Regular artist update (not status change)
    const updatedArtist = await adminService.updateArtistInfo(
      id,
      artistData,
      avatarFile
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
    // Service trả về user trong updatedProfile.user
    const updatedProfile = await adminService.approveArtistRequest(requestId);

    // Tạo thông báo in-app (như cũ)
    await prisma.notification.create({
      data: {
        type: 'ARTIST_REQUEST_APPROVE',
        message: 'Your request to become an Artist has been approved!',
        recipientType: 'USER',
        userId: updatedProfile.user.id, // Lấy ID từ user trong updatedProfile
        isRead: false,
      },
    });

    // Gửi email thông báo duyệt
    if (updatedProfile.user.email) { // Kiểm tra email tồn tại
      try {
        // **Sửa lỗi ở đây: Truyền đủ 2 tham số**
        const emailOptions = emailService.createArtistRequestApprovedEmail(
          updatedProfile.user.email, // Tham số 1: to
          updatedProfile.user.name || updatedProfile.user.username || 'User' // Tham số 2: userName
        );
        await emailService.sendEmail(emailOptions); // Gửi email
        console.log(`Artist approval email sent to ${updatedProfile.user.email}`);
      } catch (emailError) {
        console.error('Failed to send artist approval email:', emailError);
        // Không nên throw lỗi ở đây để tránh ảnh hưởng response chính
      }
    } else {
      console.warn(`Could not send approval email: No email found for user ${updatedProfile.user.id}`);
    }

    // Trả về response thành công
    res.json({
      message: 'Artist role approved successfully',
      // Trả về user data đã được select cẩn thận từ service hoặc query lại nếu cần
      user: {
        id: updatedProfile.user.id,
        email: updatedProfile.user.email,
        name: updatedProfile.user.name,
        username: updatedProfile.user.username,
        avatar: updatedProfile.user.avatar,
        role: updatedProfile.user.role, // Role đã được cập nhật
        // ... các trường khác trong userSelect nếu cần
      },
    });
  } catch (error) {
    // Xử lý lỗi như cũ
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

// Từ chối yêu cầu
export const rejectArtistRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { requestId, reason } = req.body;
    // Service đã trả về user với đủ thông tin (bao gồm email, username, name)
    const result = await adminService.rejectArtistRequest(requestId);

    let notificationMessage = 'Your request to become an Artist has been rejected.';
    if (reason && reason.trim() !== '') {
      notificationMessage += ` Reason: ${reason.trim()}`;
    }

    // Tạo thông báo in-app (như cũ)
    await prisma.notification.create({
      data: {
        type: 'ARTIST_REQUEST_REJECT',
        message: notificationMessage,
        recipientType: 'USER',
        userId: result.user.id,
        isRead: false,
      },
    });

    // Gửi email thông báo từ chối
    if (result.user.email) { // Kiểm tra email có tồn tại không
      try {
        // **Sửa lại lời gọi hàm ở đây:**
        const emailOptions = emailService.createArtistRequestRejectedEmail(
          result.user.email, // Tham số 1: to (email người nhận)
          result.user.name || result.user.username || 'User', // Tham số 2: userName
          reason // Tham số 3: reason (tùy chọn)
        );

        // Gọi sendEmail trực tiếp với emailOptions đã hoàn chỉnh
        await emailService.sendEmail(emailOptions);
        console.log(`Artist rejection email sent to ${result.user.email}`);

      } catch (emailError) {
        console.error('Failed to send artist rejection email:', emailError);
        // Cân nhắc log lỗi chi tiết hơn nếu cần
      }
    } else {
      console.warn(`Could not send rejection email: No email found for user ${result.user.id}`);
    }

    res.json({
      message: 'Artist role request rejected successfully',
      user: result.user, // user đã có đủ thông tin từ service
      hasPendingRequest: result.hasPendingRequest,
    });
    // Thêm return để đảm bảo hàm kết thúc sau khi gửi response
    return;
  } catch (error) {
    // Xử lý lỗi như cũ
    if (
      error instanceof Error &&
      error.message.includes('not found or already verified')
    ) {
      res
        .status(404)
        .json({ message: 'Artist request not found or already verified' });
      return; // Thêm return
    }
    handleError(res, error, 'Reject artist request');
    // Thêm return sau khi xử lý lỗi
    return;
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

// Lấy hoặc cập nhật trạng thái bảo trì - ADMIN only
export const handleMaintenanceMode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { enabled } = req.method === 'POST' ? req.body : {};
    const result = await adminService.updateMaintenanceMode(enabled);
    res.json(result);
  } catch (error) {
    handleError(res, error, 'Manage maintenance mode');
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
