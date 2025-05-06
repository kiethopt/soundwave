import { Request, Response } from 'express';
import {
  handleError,
  runValidations,
  validateField,
  toBooleanValue,
} from '../utils/handle-utils';
import prisma from '../config/db';
import * as adminService from '../services/admin.service';
import * as emailService from '../services/email.service';
import { User as PrismaUser, Role, ClaimStatus } from '@prisma/client';
import { getIO, getUserSockets } from '../config/socket';

// Define User type including adminLevel for controller scope
type UserWithAdminLevel = PrismaUser;

// Lấy danh sách tất cả người dùng - ADMIN only
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const { users, pagination } = await adminService.getUsers(req, req.user as UserWithAdminLevel);
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
    const userData = { ...req.body };
    const requestingUser = req.user as UserWithAdminLevel;

    if (!requestingUser) {
      res.status(401).json({ message: "Unauthorized: Requesting user data missing." });
      return;
    }

    const updatedUser = await adminService.updateUserInfo(
      id,
      userData,
      requestingUser,
    );

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('Permission denied:')) {
        res.status(403).json({ message: error.message });
        return;
      }
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
      } else if (error.message.includes('password change')) {
        res.status(400).json({ message: error.message });
        return;
      } else if (error.message === 'Password must be at least 6 characters long.') {
         res.status(400).json({ message: error.message });
         return;
      } else if (error.message === "No valid data provided for update.") {
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
    const artistData = { ...req.body };

    if (!id) {
      res.status(400).json({ message: 'Artist ID is required' });
      return;
    }

    const updatedArtist = await adminService.updateArtistInfo(id, artistData);

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
      } else if (error.message.includes('Validation failed')) {
        res.status(400).json({ message: error.message });
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
    const requestingUser = req.user as UserWithAdminLevel | undefined;
    const { reason } = req.body;

    if (!requestingUser || requestingUser.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Forbidden: Admin access required.' });
      return;
    }

    await adminService.deleteUserById(id, requestingUser, reason);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Permission denied: Admins cannot be deleted.') {
        res.status(403).json({ message: error.message });
        return;
    }
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
    const { reason } = req.body;
    await adminService.deleteArtistById(id, reason);
    res.json({ message: 'Artist deleted permanently' });
  } catch (error) {
    handleError(res, error, 'Delete artist');
  }
};

// Lấy danh sách tất cả nghệ sĩ - ADMIN only
export const getAllArtists = async (req: Request, res: Response) => {
  try {
    const result = await adminService.getArtists(req);
    res.status(200).json(result);
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

    // --- Gửi thông báo & email (logic cũ) ---
    // Create notification
    if (updatedProfile?.user?.id) {
        await prisma.notification.create({
          data: {
            type: 'ARTIST_REQUEST_APPROVE',
            message: 'Your request to become an Artist has been approved!',
            recipientType: 'USER',
            userId: updatedProfile.user.id,
            isRead: false,
          },
        });
    } else {
        console.warn(`[Approve Request] Cannot create notification: User data missing in updatedProfile.`);
    }

    // Send email
    if (updatedProfile?.user?.email) {
      try {
        const emailOptions = emailService.createArtistRequestApprovedEmail(
          updatedProfile.user.email,
          updatedProfile.user.name || updatedProfile.user.username || 'User'
        );
        await emailService.sendEmail(emailOptions);
        console.log(`Artist approval email sent to ${updatedProfile.user.email}`);
      } catch (emailError) {
        console.error('Failed to send artist approval email:', emailError);
      }
    } else {
      console.warn(
        `Could not send approval email: No email found for user ${updatedProfile?.user?.id ?? 'unknown'}`
      );
    }

    res.json({
      message: 'Artist role approved successfully',
      user: updatedProfile.user,
      hasPendingRequest: false
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('not found, already verified, or rejected')
    ) {
      res
        .status(404)
        .json({ message: 'Artist request not found, already verified, or rejected' });
      return;
    }
    handleError(res, error, 'Approve artist request');
  }
};

// Từ chối yêu cầu trở thành Artist
export const rejectArtistRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { requestId, reason } = req.body;
    const result = await adminService.rejectArtistRequest(requestId);

    // --- Gửi thông báo & email (logic cũ) ---
    let notificationMessage = 'Your request to become an Artist has been rejected.';
    if (reason && reason.trim() !== '') {
      notificationMessage += ` Reason: ${reason.trim()}`;
    }

    // Create notification
    if (result?.user?.id) {
        await prisma.notification.create({
          data: {
            type: 'ARTIST_REQUEST_REJECT',
            message: notificationMessage,
            recipientType: 'USER',
            userId: result.user.id,
            isRead: false,
          },
        });
    } else {
         console.warn(`[Reject Request] Cannot create notification: User data missing in result.`);
    }

    // Send email
    if (result?.user?.email) {
      try {
        const emailOptions = emailService.createArtistRequestRejectedEmail(
          result.user.email,
          result.user.name || result.user.username || 'User',
          reason
        );
        await emailService.sendEmail(emailOptions);
        console.log(`Artist rejection email sent to ${result.user.email}`);
      } catch (emailError) {
        console.error('Failed to send artist rejection email:', emailError);
      }
    } else {
      console.warn(
        `Could not send rejection email: No email found for user ${result?.user?.id ?? 'unknown'}`
      );
    }

    res.json({
      message: 'Artist role request rejected successfully',
      user: result.user,
      hasPendingRequest: result.hasPendingRequest
    });

  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('not found, already verified, or rejected')
    ) {
      res
        .status(404)
        .json({ message: 'Artist request not found, already verified, or rejected' });
      return;
    }
    handleError(res, error, 'Reject artist request');
  }
};

// Delete an artist request directly - ADMIN only
export const deleteArtistRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    await adminService.deleteArtistRequest(id);
    res.json({ message: 'Artist request deleted successfully' });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('not found or already verified/rejected')
    ) {
      res
        .status(404)
        .json({ message: 'Artist request not found or already verified/rejected' });
      return;
    }
    handleError(res, error, 'Delete artist request');
  }
};

// Lấy thông số tổng quan để thống kê - ADMIN only
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const statsData = await adminService.getDashboardStats();
    res.json(statsData);
  } catch (error) {
    handleError(res, error, 'Get dashboard stats');
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
    if (req.method === 'GET') {
      // GET request: Retrieve current status
      // Correctly call getAIModelStatus, not getCacheStatus
      const aiStatus = await adminService.getAIModelStatus(); 
      res.json({ success: true, data: aiStatus }); // Return the correct AI status data
    } else if (req.method === 'POST') {
      // POST request: Update model
      const { model } = req.body;
      const result = await adminService.updateAIModel(model);
      res.status(200).json({
        success: true,
        message: 'AI model settings updated successfully',
        data: result,
      });
    }
  } catch (error) {
    console.error('Error updating AI model settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update AI model settings',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Lấy trạng thái hệ thống - ADMIN only
export const getSystemStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const statuses = await adminService.getSystemStatus();
    res.json({ success: true, data: statuses });
  } catch (error) {
    handleError(res, error, 'Get system status');
  }
};

// --- Artist Claim Request Controllers ---

export const getAllArtistClaimRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    // Assuming authentication middleware adds req.user
    if (!req.user || req.user.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Forbidden: Admin access required.' });
      return;
    }
    const { claimRequests, pagination } = await adminService.getArtistClaimRequests(req);
    res.json({ claimRequests, pagination });
  } catch (error) {
    handleError(res, error, 'Get artist claim requests');
  }
};

export const getArtistClaimRequestDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    // Assuming authentication middleware adds req.user
     if (!req.user || req.user.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Forbidden: Admin access required.' });
      return;
    }
    const { id } = req.params; // Assuming id is the claim request ID
    if (!id) {
      res.status(400).json({ message: 'Claim Request ID is required.' });
      return;
    }
    const claimRequest = await adminService.getArtistClaimRequestDetail(id);
    res.json(claimRequest);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ message: error.message });
      return;
    }
     if (error instanceof Error && error.message.includes('no longer available')) {
      res.status(409).json({ message: error.message }); // 409 Conflict
      return;
    }
    handleError(res, error, 'Get artist claim request detail');
  }
};

export const approveArtistClaimRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUser = req.user as UserWithAdminLevel; // Ensure req.user is properly typed
    if (!adminUser || adminUser.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Forbidden: Admin access required.' });
      return;
    }
    const { id } = req.params; // Assuming id is the claim request ID
    if (!id) {
      res.status(400).json({ message: 'Claim Request ID is required.' });
      return;
    }

    const result = await adminService.approveArtistClaim(id, adminUser.id);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
        if (error.message.includes('not found')) {
            res.status(404).json({ message: error.message });
            return;
        }
        if (error.message.includes('Cannot approve claim request') || error.message.includes('no longer available')) {
            res.status(409).json({ message: error.message }); // 409 Conflict
            return;
        }
    }
    handleError(res, error, 'Approve artist claim request');
  }
};

export const rejectArtistClaimRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminUser = req.user as UserWithAdminLevel;
    if (!adminUser || adminUser.role !== Role.ADMIN) {
      res.status(403).json({ message: 'Forbidden: Admin access required.' });
      return;
    }
    const { id } = req.params; // Assuming id is the claim request ID
    const { reason } = req.body;

    if (!id) {
      res.status(400).json({ message: 'Claim Request ID is required.' });
      return;
    }
    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      res.status(400).json({ message: 'Rejection reason is required.' });
      return;
    }

    const result = await adminService.rejectArtistClaim(id, adminUser.id, reason);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
        if (error.message.includes('not found')) {
            res.status(404).json({ message: error.message });
            return;
        }
        if (error.message.includes('Cannot reject claim request') || error.message.includes('Rejection reason is required')) {
            res.status(400).json({ message: error.message });
            return;
        }
     }
    handleError(res, error, 'Reject artist claim request');
  }
};

// --- End Artist Claim Request Controllers ---

// --- Bulk Track Upload Controller ---
export const bulkUploadTracks = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ message: 'No files uploaded' });
      return;
    }

    // Process the files
    const createdTracks = await adminService.processBulkUpload(files);

    // Get statistics
    const successfulUploads = createdTracks.filter(track => track.success).length;
    
    // Return response with track information and stats
    res.status(201).json({
      message: `Successfully processed ${successfulUploads} out of ${files.length} files`,
      createdTracks,
      stats: {
        total: files.length,
        successful: successfulUploads,
        failed: files.length - successfulUploads
      }
    });
  } catch (error) {
    handleError(res, error, 'Bulk upload tracks');
  }
};
