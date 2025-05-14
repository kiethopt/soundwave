import { Request, Response } from "express";
import {
  handleError,
  runValidations,
  validateField,
  toBooleanValue,
} from "../utils/handle-utils";
import prisma from "../config/db";
import * as adminService from "../services/admin.service";
import * as emailService from "../services/email.service";
import {
  User as PrismaUser,
  Role,
  ClaimStatus,
  PlaylistPrivacy,
} from "@prisma/client";
import { getIO, getUserSockets } from "../config/socket";
import * as trackService from "../services/track.service";
import ExcelJS from "exceljs";

// Define User type including adminLevel for controller scope
type UserWithAdminLevel = PrismaUser;

// Lấy danh sách tất cả người dùng - ADMIN only
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { users, pagination } = await adminService.getUsers(
      req,
      req.user as UserWithAdminLevel
    );
    res.json({ users, pagination });
  } catch (error) {
    handleError(res, error, "Get all users");
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
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      res.status(404).json({ message: "User not found" });
      return;
    }
    handleError(res, error, "Get user by id");
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
    handleError(res, error, "Get artist requests");
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
    if (error instanceof Error && error.message === "Request not found") {
      res.status(404).json({ message: "Request not found" });
      return;
    }
    handleError(res, error, "Get artist request details");
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
      res
        .status(401)
        .json({ message: "Unauthorized: Requesting user data missing." });
      return;
    }

    const updatedUser = await adminService.updateUserInfo(
      id,
      userData,
      requestingUser
    );

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith("Permission denied:")) {
        res.status(403).json({ message: error.message });
        return;
      }
      if (error.message === "User not found") {
        res.status(404).json({ message: "User not found" });
        return;
      } else if (
        error.message === "Email already exists" ||
        error.message === "Username already exists"
      ) {
        res.status(400).json({ message: error.message });
        return;
      } else if (error.message === "Current password is incorrect") {
        res.status(400).json({ message: error.message });
        return;
      } else if (error.message.includes("password change")) {
        res.status(400).json({ message: error.message });
        return;
      } else if (
        error.message === "Password must be at least 6 characters long."
      ) {
        res.status(400).json({ message: error.message });
        return;
      } else if (error.message === "No valid data provided for update.") {
        res.status(400).json({ message: error.message });
        return;
      }
    }
    handleError(res, error, "Update user");
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
      res.status(400).json({ message: "Artist ID is required" });
      return;
    }

    const updatedArtist = await adminService.updateArtistInfo(id, artistData);

    res.json({
      message: "Artist updated successfully",
      artist: updatedArtist,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Artist not found") {
        res.status(404).json({ message: "Artist not found" });
        return;
      } else if (error.message === "Artist name already exists") {
        res.status(400).json({ message: "Artist name already exists" });
        return;
      } else if (error.message.includes("Validation failed")) {
        res.status(400).json({ message: error.message });
        return;
      }
    }
    handleError(res, error, "Update artist");
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
      res.status(403).json({ message: "Forbidden: Admin access required." });
      return;
    }

    await adminService.deleteUserById(id, requestingUser, reason);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Permission denied: Admins cannot be deleted."
    ) {
      res.status(403).json({ message: error.message });
      return;
    }
    handleError(res, error, "Delete user");
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
    res.json({ message: "Artist deleted permanently" });
  } catch (error) {
    handleError(res, error, "Delete artist");
  }
};

// Lấy danh sách tất cả nghệ sĩ - ADMIN only
export const getAllArtists = async (req: Request, res: Response) => {
  try {
    const result = await adminService.getArtists(req);
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Get all artists");
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
    if (error instanceof Error && error.message === "Artist not found") {
      res.status(404).json({ message: "Artist not found" });
      return;
    }
    handleError(res, error, "Get artist by id");
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
      validateField(name, "Name", { required: true }),
      name && validateField(name.trim(), "Name", { minLength: 1 }),
      name && validateField(name, "Name", { maxLength: 50 }),
    ]);

    if (validationErrors.length > 0) {
      res
        .status(400)
        .json({ message: "Validation failed", errors: validationErrors });
      return;
    }

    const genre = await adminService.createNewGenre(name);
    res.status(201).json({ message: "Genre created successfully", genre });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Genre name already exists"
    ) {
      res.status(400).json({ message: "Genre name already exists" });
      return;
    }
    handleError(res, error, "Create genre");
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
      validateField(id, "Genre ID", { required: true }),
      validateField(name, "Name", { required: true }),
      name && validateField(name.trim(), "Name", { minLength: 1 }),
      name && validateField(name, "Name", { maxLength: 50 }),
    ]);

    if (validationErrors.length > 0) {
      res
        .status(400)
        .json({ message: "Validation failed", errors: validationErrors });
      return;
    }

    const updatedGenre = await adminService.updateGenreInfo(id, name);

    res.json({
      message: "Genre updated successfully",
      genre: updatedGenre,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Genre not found") {
        res.status(404).json({ message: "Genre not found" });
        return;
      } else if (error.message === "Genre name already exists") {
        res.status(400).json({ message: "Genre name already exists" });
        return;
      }
    }
    handleError(res, error, "Update genre");
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
    res.json({ message: "Genre deleted successfully" });
  } catch (error) {
    handleError(res, error, "Delete genre");
  }
};

// Duyệt yêu cầu trở thành Artist (Approve Artist Request) - ADMIN only
export const approveArtistRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { requestId } = req.body;
    const adminUserId = req.user?.id;

    if (!adminUserId) {
      res
        .status(401)
        .json({ message: "Admin not authenticated or user ID not found." });
      return;
    }

    if (!requestId) {
      res.status(400).json({ message: "Request ID is required." });
      return;
    }

    const result = await adminService.approveArtistRequest(
      adminUserId,
      requestId
    );

    res.json({
      message: result.message,
      data: result.data,
    });
  } catch (error: any) {
    if (
      error instanceof Error &&
      (error.message.includes("not found") ||
        error.message.includes("cannot be approved") ||
        error.message.includes("User ID missing"))
    ) {
      res.status(404).json({
        message: error.message,
      });
      return;
    }
    handleError(res, error, "Approve artist request");
  }
};

// Từ chối yêu cầu trở thành Artist
export const rejectArtistRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log("!!!!!!!! ORIGINAL rejectArtistRequest CONTROLLER HIT !!!!!!!!");
  try {
    const { requestId, reason } = req.body;

    if (!requestId) {
      res.status(400).json({ message: "Request ID is required." });
      return;
    }
    // reason is optional; the service handles it if undefined.

    // Call the refactored service function, passing requestId and reason
    const result = await adminService.rejectArtistRequest(requestId, reason);

    // Notification and email logic is now handled within the service.
    // Old logic that was here has been removed.

    res.json({
      message: result.message, // Use message from service
      request: result.request, // Pass along the updated request details from service
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("not found") ||
        error.message.includes("cannot be rejected"))
    ) {
      // More specific error message from the service
      res.status(404).json({
        message: error.message,
      });
      return;
    }
    // Generic error handler for other unexpected errors
    handleError(res, error, "Reject artist request");
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
    res.json({ message: "Artist request deleted successfully" });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("not found or already verified/rejected")
    ) {
      res.status(404).json({
        message: "Artist request not found or already verified/rejected",
      });
      return;
    }
    handleError(res, error, "Delete artist request");
  }
};

// Lấy thông số tổng quan để thống kê - ADMIN only
export const getDashboardStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const statsData = await adminService.getDashboardStats();
    res.json(statsData);
  } catch (error) {
    handleError(res, error, "Get dashboard stats");
  }
};

// Lấy và cập nhật trạng thái model AI - ADMIN only
export const handleAIModelStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (req.method === "GET") {
      // GET request: Retrieve current status
      // Correctly call getAIModelStatus, not getCacheStatus
      const aiStatus = await adminService.getAIModelStatus();
      res.json({ success: true, data: aiStatus }); // Return the correct AI status data
    } else if (req.method === "POST") {
      // POST request: Update model
      const { model } = req.body;
      const result = await adminService.updateAIModel(model);
      res.status(200).json({
        success: true,
        message: "AI model settings updated successfully",
        data: result,
      });
    }
  } catch (error) {
    console.error("Error updating AI model settings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update AI model settings",
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
    handleError(res, error, "Get system status");
  }
};

// --- Artist Claim Request Controllers ---

export const getAllArtistClaimRequests = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Assuming authentication middleware adds req.user
    if (!req.user || req.user.role !== Role.ADMIN) {
      res.status(403).json({ message: "Forbidden: Admin access required." });
      return;
    }
    const { claimRequests, pagination } =
      await adminService.getArtistClaimRequests(req);
    res.json({ claimRequests, pagination });
  } catch (error) {
    handleError(res, error, "Get artist claim requests");
  }
};

export const getArtistClaimRequestDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Assuming authentication middleware adds req.user
    if (!req.user || req.user.role !== Role.ADMIN) {
      res.status(403).json({ message: "Forbidden: Admin access required." });
      return;
    }
    const { id } = req.params; // Assuming id is the claim request ID
    if (!id) {
      res.status(400).json({ message: "Claim Request ID is required." });
      return;
    }
    const claimRequest = await adminService.getArtistClaimRequestDetail(id);
    res.json(claimRequest);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({ message: error.message });
      return;
    }
    if (
      error instanceof Error &&
      error.message.includes("no longer available")
    ) {
      res.status(409).json({ message: error.message }); // 409 Conflict
      return;
    }
    handleError(res, error, "Get artist claim request detail");
  }
};

export const approveArtistClaimRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const adminUser = req.user as UserWithAdminLevel; // Ensure req.user is properly typed
    if (!adminUser || adminUser.role !== Role.ADMIN) {
      res.status(403).json({ message: "Forbidden: Admin access required." });
      return;
    }
    const { id } = req.params; // Assuming id is the claim request ID
    if (!id) {
      res.status(400).json({ message: "Claim Request ID is required." });
      return;
    }

    const result = await adminService.approveArtistClaim(id, adminUser.id);
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (
        error.message.includes("Cannot approve claim request") ||
        error.message.includes("no longer available")
      ) {
        res.status(409).json({ message: error.message }); // 409 Conflict
        return;
      }
    }
    handleError(res, error, "Approve artist claim request");
  }
};

export const rejectArtistClaimRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const adminUser = req.user as UserWithAdminLevel;
    if (!adminUser || adminUser.role !== Role.ADMIN) {
      res.status(403).json({ message: "Forbidden: Admin access required." });
      return;
    }
    const { id } = req.params; // Assuming id is the claim request ID
    const { reason } = req.body;

    if (!id) {
      res.status(400).json({ message: "Claim Request ID is required." });
      return;
    }
    if (!reason || typeof reason !== "string" || reason.trim() === "") {
      res.status(400).json({ message: "Rejection reason is required." });
      return;
    }

    const result = await adminService.rejectArtistClaim(
      id,
      adminUser.id,
      reason
    );
    res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        res.status(404).json({ message: error.message });
        return;
      }
      if (
        error.message.includes("Cannot reject claim request") ||
        error.message.includes("Rejection reason is required")
      ) {
        res.status(400).json({ message: error.message });
        return;
      }
    }
    handleError(res, error, "Reject artist claim request");
  }
};

// --- End Artist Claim Request Controllers ---

// --- Bulk Track Upload Controller ---
export const bulkUploadTracks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      res.status(400).json({ message: "No files uploaded." });
      return;
    }
    const files = req.files as Express.Multer.File[];
    const results = await adminService.processBulkUpload(files);
    res.status(200).json({
      message: "Bulk upload process initiated.",
      createdTracks: results,
    });
  } catch (error) {
    handleError(res, error, "Bulk upload tracks");
  }
};

// --- User AI Playlist Management Handlers ---
export const generateAndAssignAiPlaylistToUserHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId: targetUserId } = req.params;
  const adminUserId = req.user!.id; // Assuming admin user is authenticated
  const { customPromptKeywords, requestedTrackCount } = req.body; // Extract new params

  // Basic validation for new params (optional, but good practice)
  if (
    requestedTrackCount !== undefined &&
    (typeof requestedTrackCount !== "number" ||
      requestedTrackCount < 5 ||
      requestedTrackCount > 100)
  ) {
    res.status(400).json({
      message: "requestedTrackCount must be a number between 5 and 100.",
    });
    return;
  }
  if (
    customPromptKeywords !== undefined &&
    typeof customPromptKeywords !== "string"
  ) {
    res.status(400).json({ message: "customPromptKeywords must be a string." });
    return;
  }

  try {
    const playlist = await adminService.generateAndAssignAiPlaylistToUser(
      adminUserId,
      targetUserId,
      { customPromptKeywords, requestedTrackCount } // Pass as an object
    );
    res.status(201).json({
      message: "AI-generated playlist created and assigned successfully.",
      playlist,
    });
  } catch (error) {
    handleError(res, error, "Generate AI Playlist for User");
  }
};

export const updateAiPlaylistVisibilityHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const { playlistId } = req.params;
    const { newVisibility } = req.body; // Expected: "PUBLIC" or "PRIVATE"

    if (!adminId) {
      res.status(401).json({ message: "Unauthorized: Admin ID missing." });
      return;
    }
    if (!playlistId) {
      res.status(400).json({ message: "Playlist ID is required." });
      return;
    }
    if (
      !newVisibility ||
      (newVisibility !== "PUBLIC" && newVisibility !== "PRIVATE")
    ) {
      res.status(400).json({
        message: "Invalid newVisibility value. Must be 'PUBLIC' or 'PRIVATE'.",
      });
      return;
    }

    const playlist = await adminService.setAiPlaylistVisibilityForUser(
      adminId,
      playlistId,
      newVisibility as PlaylistPrivacy
    );
    res.status(200).json({
      message: `AI Playlist visibility updated to ${newVisibility}.`,
      playlist,
    });
  } catch (error) {
    handleError(res, error, "Update AI Playlist Visibility");
  }
};

export const getUserAiPlaylistsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const { userId: targetUserId } = req.params;

    if (!adminId) {
      res.status(401).json({ message: "Unauthorized: Admin ID missing." });
      return;
    }
    if (!targetUserId) {
      res.status(400).json({ message: "Target User ID is required." });
      return;
    }

    const result = await adminService.getUserAiPlaylists(
      adminId,
      targetUserId,
      req
    );
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Get User AI Playlists");
  }
};

export const getUserListeningHistoryHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const { userId: targetUserId } = req.params;

    if (!adminId) {
      res.status(401).json({ message: "Unauthorized: Admin ID missing." });
      return;
    }
    if (!targetUserId) {
      res.status(400).json({ message: "Target User ID is required." });
      return;
    }

    const result = await adminService.getUserListeningHistoryDetails(
      adminId,
      targetUserId,
      req
    );
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, "Get User Listening History");
  }
};

// --- START: New Controller Handler for Re-analyzing Track ---
export const reanalyzeTrackHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { trackId } = req.params;
    console.log(
      `[Admin Controller] Received request to re-analyze track: ${trackId}`
    );

    // Optional: Add more validation for trackId if needed
    if (!trackId) {
      res.status(400).json({ message: "Track ID is required" });
      return;
    }

    // Call the service function
    const updatedTrack = await trackService.reanalyzeTrackAudioFeatures(
      trackId
    );

    res.json({
      message: "Track audio features re-analyzed and updated successfully",
      track: updatedTrack,
    });
  } catch (error: any) {
    console.error(
      `[Admin Controller] Error re-analyzing track ${req.params.trackId}:`,
      error
    );
    // Use your existing error handler or send a generic error
    handleError(res, error, "Re-analyze track");
    // Or: res.status(error.statusCode || 500).json({ message: error.message || "Internal server error" });
  }
};
// --- END: New Controller Handler for Re-analyzing Track ---

// --- Label Registration Request Management Controllers (Moved from Label Controller) ---

export const getAllLabelRegistrations = async (
  req: Request,
  res: Response
): Promise<void> => {
  // console.log('[ADMIN CONTROLLER << LABEL REG] getAllLabelRegistrations controller function START'); // Updated log
  try {
    const result = await adminService.getAllLabelRegistrations(req);
    // console.log('[ADMIN CONTROLLER << LABEL REG] getAllLabelRegistrations service call returned:', result ? 'data received' : 'no data');
    res.json({
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    handleError(res, error, "Admin: Get all label registrations");
  }
};

export const getLabelRegistrationById = async (
  req: Request,
  res: Response
): Promise<void> => {
  // console.log('[ADMIN CONTROLLER << LABEL REG] getLabelRegistrationById START, ID:', req.params.registrationId);
  try {
    const { registrationId } = req.params;
    const request = await adminService.getLabelRegistrationById(registrationId);
    res.json({ data: request });
  } catch (error) {
    handleError(res, error, "Admin: Get label registration by ID");
  }
};

export const approveLabelRegistration = async (
  req: Request,
  res: Response
): Promise<void> => {
  // console.log('[ADMIN CONTROLLER << LABEL REG] approveLabelRegistration START, ID:', req.params.registrationId);
  try {
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      res
        .status(401)
        .json({ message: "Admin not authenticated or user ID not found." });
      return;
    }
    const { registrationId } = req.params;
    const result = await adminService.approveLabelRegistration(
      adminUserId,
      registrationId
    );
    res.json({
      message: "Label registration approved successfully.",
      data: result,
    });
  } catch (error) {
    handleError(res, error, "Admin: Approve label registration");
  }
};

export const rejectLabelRegistration = async (
  req: Request,
  res: Response
): Promise<void> => {
  // console.log('[ADMIN CONTROLLER << LABEL REG] rejectLabelRegistration START, ID:', req.params.registrationId);
  try {
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      res
        .status(401)
        .json({ message: "Admin not authenticated or user ID not found." });
      return;
    }
    const { registrationId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({ message: "Rejection reason is required." });
      return;
    }

    const result = await adminService.rejectLabelRegistration(
      adminUserId,
      registrationId,
      reason
    );
    res.json({
      message: "Label registration rejected successfully.",
      data: result,
    });
  } catch (error) {
    handleError(res, error, "Admin: Reject label registration");
  }
};
// --- End Label Registration Request Management Controllers ---

// START NEW CONTROLLER FOR ArtistRequest TABLE
export const getArtistRoleRequestsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Assuming authentication/authorization (admin check) is done by middleware
    const { requests, pagination } =
      await adminService.getPendingArtistRoleRequests(req);
    res.json({ requests, pagination }); // Keep the structure consistent with other list endpoints
  } catch (error) {
    handleError(res, error, "Get artist role requests");
  }
};
// END NEW CONTROLLER

// --- Data Export Controllers ---
export const exportTrackAndArtistData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await adminService.extractTrackAndArtistData();

    // Create a new Excel workbook and worksheets
    const workbook = new ExcelJS.Workbook();

    // Add a worksheet for artists
    const artistsSheet = workbook.addWorksheet("Artists");
    artistsSheet.columns = [
      { header: "ID", key: "id", width: 30 },
      { header: "Name", key: "artistName", width: 30 },
      { header: "User ID", key: "userId", width: 30 },
      { header: "User Email", key: "userEmail", width: 30 },
      { header: "User Username", key: "userUsername", width: 25 },
      { header: "User Name", key: "userName", width: 25 },
      { header: "Bio", key: "bio", width: 60 },
      { header: "Avatar", key: "avatar", width: 40 },
      { header: "Social Media Links", key: "socialMediaLinks", width: 40 },
      { header: "Monthly Listeners", key: "monthlyListeners", width: 15 },
      { header: "Verified", key: "verified", width: 10 },
      { header: "Label", key: "label", width: 25 },
      { header: "Genres", key: "genres", width: 30 },
      { header: "Track Count", key: "trackCount", width: 15 },
      { header: "Created At", key: "createdAt", width: 15 },
    ];

    // Add the data to the artists worksheet
    artistsSheet.addRows(data.artists);

    // Add a worksheet for albums
    const albumsSheet = workbook.addWorksheet("Albums");
    albumsSheet.columns = [
      { header: "ID", key: "id", width: 30 },
      { header: "Title", key: "title", width: 40 },
      { header: "Artist", key: "artistName", width: 30 },
      { header: "Artist ID", key: "artistId", width: 30 },
      { header: "Album Type", key: "albumType", width: 15 },
      { header: "Release Date", key: "releaseDate", width: 15 },
      { header: "Total Tracks", key: "totalTracks", width: 15 },
      { header: "Duration (sec)", key: "duration", width: 15 },
      { header: "Label", key: "labelName", width: 25 },
      { header: "Cover URL", key: "coverUrl", width: 40 },
      { header: "Genres", key: "genres", width: 30 },
      { header: "Created At", key: "createdAt", width: 15 },
    ];

    // Add the data to the albums worksheet
    albumsSheet.addRows(data.albums);

    // Add a worksheet for tracks
    const tracksSheet = workbook.addWorksheet("Tracks");
    tracksSheet.columns = [
      { header: "ID", key: "id", width: 30 },
      { header: "Title", key: "title", width: 40 },
      { header: "Artist", key: "artist", width: 30 },
      { header: "Album", key: "album", width: 30 },
      { header: "Album ID", key: "albumId", width: 30 },
      { header: "Album Type", key: "albumType", width: 15 },
      { header: "Album Release Date", key: "albumReleaseDate", width: 15 },
      { header: "Album Total Tracks", key: "albumTotalTracks", width: 15 },
      { header: "Audio URL", key: "audioUrl", width: 40 },
      { header: "Label Name", key: "labelName", width: 30 },
      {
        header: "Featured Artist Names",
        key: "featuredArtistNames",
        width: 40,
      },
      { header: "Duration (sec)", key: "duration", width: 15 },
      { header: "Release Date", key: "releaseDate", width: 15 },
      { header: "Play Count", key: "playCount", width: 15 },
      { header: "Tempo", key: "tempo", width: 10 },
      { header: "Mood", key: "mood", width: 20 },
      { header: "Key", key: "key", width: 10 },
      { header: "Scale", key: "scale", width: 10 },
      { header: "Danceability", key: "danceability", width: 15 },
      { header: "Energy", key: "energy", width: 15 },
      { header: "Genres", key: "genres", width: 30 },
      { header: "Cover URL", key: "coverUrl", width: 40 },
    ];

    // Add the data to the tracks worksheet
    tracksSheet.addRows(data.tracks);

    // Set the content type for Excel download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=soundwave_data_export_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );

    // Write the workbook to the response
    await workbook.xlsx.write(res);

    // End the response
    res.end();
  } catch (error) {
    handleError(res, error, "Export track and artist data");
  }
};
// --- End Data Export Controllers ---

// Add this new endpoint for fixing album track types
export const fixAlbumTrackTypes = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || (req.user as UserWithAdminLevel).role !== Role.ADMIN) {
      res.status(403).json({ message: "Forbidden: Admin access required." });
      return;
    }
    const result = await adminService.fixAlbumTrackTypeConsistency();
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    handleError(res, error, "Fix album track types");
  }
};

export const removeTrackFromSystemPlaylistHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const adminUser = req.user as UserWithAdminLevel;
    if (!adminUser || adminUser.role !== Role.ADMIN) {
      res.status(403).json({ message: "Forbidden: Admin access required." });
      return;
    }

    const { playlistId, trackId } = req.params;

    if (!playlistId || !trackId) {
      res
        .status(400)
        .json({ message: "Playlist ID and Track ID are required." });
      return;
    }

    const updatedPlaylist = await adminService.removeTrackFromSystemPlaylist(
      adminUser.id,
      playlistId,
      trackId
    );

    res.status(200).json({
      message: "Track removed from system playlist successfully.",
      playlist: updatedPlaylist,
    });
  } catch (error) {
    handleError(res, error, "Remove track from system playlist");
  }
};

export const deleteSystemPlaylistHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const adminUser = req.user as UserWithAdminLevel;
    if (!adminUser || adminUser.role !== Role.ADMIN) {
      res.status(403).json({ message: "Forbidden: Admin access required." });
      return;
    }

    const { playlistId } = req.params;
    if (!playlistId) {
      res.status(400).json({ message: "Playlist ID is required." });
      return;
    }

    // Gọi service để xóa system playlist
    // Giả định adminService.deleteSystemPlaylist sẽ throw lỗi nếu có vấn đề
    await adminService.deleteSystemPlaylist(playlistId, adminUser.id);

    res.status(200).json({ message: "System playlist deleted successfully." });
  } catch (error) {
    // Kiểm tra các loại lỗi cụ thể từ service nếu cần
    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({ message: error.message });
    } else if (
      error instanceof Error &&
      error.message.includes("not allowed")
    ) {
      res.status(403).json({ message: error.message });
    } else {
      handleError(res, error, "Delete system playlist");
    }
  }
};

export const updatePlaylistVisibilityHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { playlistId } = req.params;
    const { privacy } = req.body;
    const adminUserId = (req.user as PrismaUser)?.id;

    if (!adminUserId) {
      res.status(401).json({ message: "Unauthorized: Admin user ID missing." });
      return;
    }

    if (
      !privacy ||
      (privacy !== PlaylistPrivacy.PUBLIC &&
        privacy !== PlaylistPrivacy.PRIVATE)
    ) {
      res
        .status(400)
        .json({ message: "Invalid privacy value. Must be PUBLIC or PRIVATE." });
      return;
    }

    const updatedPlaylist = await adminService.updatePlaylistVisibility(
      adminUserId,
      playlistId,
      privacy as PlaylistPrivacy
    );

    res.json({
      message: "Playlist visibility updated successfully.",
      playlist: updatedPlaylist,
    });
  } catch (error) {
    handleError(res, error, "Update playlist visibility by admin");
  }
};
