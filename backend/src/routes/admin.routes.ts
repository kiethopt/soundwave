import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllArtists,
  createGenre,
  updateGenre,
  deleteGenre,
  approveArtistRequest,
  getDashboardStats,
  getArtistById,
  getAllArtistRequests,
  rejectArtistRequest,
  getArtistRequestDetail,
  deleteArtist,
  deleteArtistRequest,
  updateArtist,
  handleAIModelStatus,
  getSystemStatus,
  getAllArtistClaimRequests,
  getArtistClaimRequestDetail,
  approveArtistClaimRequest,
  rejectArtistClaimRequest,
  bulkUploadTracks,
  generateAndAssignAiPlaylistToUserHandler,
  updateAiPlaylistVisibilityHandler,
  getUserAiPlaylistsHandler,
  getUserListeningHistoryHandler,
  reanalyzeTrackHandler,
  getAllLabelRegistrations,
  getLabelRegistrationById,
  approveLabelRegistration,
  rejectLabelRegistration,
  getArtistRoleRequestsHandler,
  exportTrackAndArtistData,
  fixAlbumTrackTypes,
  removeTrackFromSystemPlaylistHandler,
  deleteSystemPlaylistHandler,
  updatePlaylistVisibilityHandler,
} from "../controllers/admin.controller";
import * as genreController from "../controllers/genre.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { Role } from "@prisma/client";
import { cacheMiddleware } from "../middleware/cache.middleware";
import upload, { handleUploadError } from "../middleware/upload.middleware";
import {
  getUserListeningStats,
  generateSystemPlaylistForUser,
  createBaseSystemPlaylist,
  getAllBaseSystemPlaylists,
  updateBaseSystemPlaylist,
  deleteBaseSystemPlaylist,
  updateAllSystemPlaylists,
  getSystemPlaylists,
  getUserSystemPlaylists,
  getPlaylistDetails,
} from "../controllers/playlist.controller";

const router = express.Router();

// Thống kê Dashboard
router.get(
  "/dashboard-stats",
  authenticate,
  authorize([Role.ADMIN]),
  cacheMiddleware,
  getDashboardStats
);

// Quản lý người dùng
router.get("/users", authenticate, authorize([Role.ADMIN]), getAllUsers);
router.get(
  "/users/:id",
  authenticate,
  authorize([Role.ADMIN]),
  cacheMiddleware,
  getUserById
);
router.put(
  "/users/:id",
  authenticate,
  authorize([Role.ADMIN]),
  upload.single("avatar"),
  updateUser
);
router.put(
  "/artists/:id",
  authenticate,
  authorize([Role.ADMIN]),
  upload.single("avatar"),
  updateArtist
);
router.delete("/users/:id", authenticate, authorize([Role.ADMIN]), deleteUser);
router.delete(
  "/artists/:id",
  authenticate,
  authorize([Role.ADMIN]),
  deleteArtist
);

// Quản lý nghệ sĩ
router.get("/artists", authenticate, authorize([Role.ADMIN]), getAllArtists);
router.get(
  "/artists/:id",
  authenticate,
  authorize([Role.ADMIN]),
  cacheMiddleware,
  getArtistById
);

router.get(
  "/artist-requests",
  authenticate,
  authorize([Role.ADMIN]),
  getAllArtistRequests
);
router.get(
  "/artist-requests/:id",
  authenticate,
  authorize([Role.ADMIN]),
  cacheMiddleware,
  getArtistRequestDetail
);

// Thêm route DELETE cho artist requests
router.delete(
  "/artist-requests/:id",
  authenticate,
  authorize([Role.ADMIN]),
  deleteArtistRequest // Tham chiếu đến controller function mới
);

// Quản lý thể loại nhạc
router.get(
  "/genres",
  authenticate,
  authorize([Role.ADMIN]),
  cacheMiddleware,
  genreController.getAllGenres
);
router.post("/genres", authenticate, authorize([Role.ADMIN]), createGenre);
router.put(
  "/genres/:id",
  authenticate,
  authorize([Role.ADMIN]),
  upload.none(),
  updateGenre
);
router.delete(
  "/genres/:id",
  authenticate,
  authorize([Role.ADMIN]),
  deleteGenre
);

// Duyệt yêu cầu trở thành Artist
// router.post(
//   "/artist-requests/approve",
//   authenticate,
//   authorize([Role.ADMIN]),
//   approveArtistRequest
// );

// Restore original APPROVE route
router.post(
  "/artist-requests/approve",
  authenticate,
  authorize([Role.ADMIN]),
  approveArtistRequest // The actual controller
);

// Restore original REJECT route
router.post(
  "/artist-requests/reject",
  authenticate,
  authorize([Role.ADMIN]),
  rejectArtistRequest // The actual controller
);

// Cập nhật trạng thái model AI
router
  .route("/system/ai-model")
  .get(authenticate, authorize([Role.ADMIN]), handleAIModelStatus)
  .post(authenticate, authorize([Role.ADMIN]), handleAIModelStatus);

// Lấy trạng thái hệ thống
router.get(
  "/system-status",
  authenticate,
  authorize([Role.ADMIN]),
  getSystemStatus
);

// --- Route for Bulk Track Upload ---
router.post(
  "/bulk-upload-tracks",
  authenticate,
  authorize([Role.ADMIN]),
  upload.array("audioFiles", 50),
  handleUploadError,
  bulkUploadTracks
);

// --- Artist Claim Request Routes ---
router.get(
  "/artist-claims",
  authenticate,
  authorize([Role.ADMIN]),
  getAllArtistClaimRequests
);
router.get(
  "/artist-claims/:id",
  authenticate,
  authorize([Role.ADMIN]),
  cacheMiddleware,
  getArtistClaimRequestDetail
);
router.post(
  "/artist-claims/:id/approve",
  authenticate,
  authorize([Role.ADMIN]),
  approveArtistClaimRequest
);
router.post(
  "/artist-claims/:id/reject",
  authenticate,
  authorize([Role.ADMIN]),
  rejectArtistClaimRequest
);
// Note: We might not need a specific DELETE for claims, rejecting usually suffices.
// --- End Artist Claim Request Routes ---

// --- User AI Playlist Management by Admin ---
// This route seems to be for the old AI playlist generation,
// we will use the new one: generateSystemPlaylistForUser
// router.post(
//   "/users/:userId/ai-playlists",
//   authenticate,
//   authorize([Role.ADMIN]),
//   generateAndAssignAiPlaylistToUserHandler
// );

// New route for Admin to generate a system playlist for a specific user
router.post(
  "/users/:userId/system-playlists/generate", // Path matches frontend call /api/admin/users/:userId/system-playlists/generate
  authenticate,
  authorize([Role.ADMIN]),
  generateSystemPlaylistForUser // Controller from playlist.controller
);

router.put(
  "/system-playlists/:playlistId/visibility",
  authenticate,
  authorize([Role.ADMIN]),
  updateAiPlaylistVisibilityHandler
);

router.delete(
  "/system-playlists/:playlistId",
  authenticate,
  authorize([Role.ADMIN]),
  deleteSystemPlaylistHandler
);

// Route mới để xóa một track cụ thể khỏi system playlist
router.delete(
  "/system-playlists/:playlistId/tracks/:trackId",
  authenticate,
  authorize([Role.ADMIN]),
  removeTrackFromSystemPlaylistHandler
);

// Route mới để cập nhật visibility của một playlist (SYSTEM type)
router.put(
  "/playlists/:playlistId/visibility",
  authenticate,
  authorize([Role.ADMIN]),
  updatePlaylistVisibilityHandler
);

// Thay thế route cũ "/users/:userId/ai-playlists" bằng route mới cho system playlists
router.get(
  "/users/:userId/system-playlists", // Path đã đúng
  authenticate,
  authorize([Role.ADMIN]),
  getUserSystemPlaylists // Sử dụng controller đúng từ playlist.controller
);

// Route for user listening stats (Admin only) - Path matches frontend call
router.get(
  "/users/:userId/listening-stats", // Path matches /api/admin/users/:userId/listening-stats
  authenticate,
  authorize([Role.ADMIN]),
  getUserListeningStats // Controller from playlist.controller
);

// Route for detailed user listening history (Admin only)
router.get(
  "/users/:userId/history", // Path matches the failing frontend call /api/admin/users/:userId/history
  authenticate,
  authorize([Role.ADMIN]),
  getUserListeningHistoryHandler // Controller from admin.controller for raw history
);

// --- Base System Playlist Management (Admin Only) ---
// Path adjusted: /api/admin/playlists/system/base
router.post(
  "/playlists/system/base",
  authenticate,
  authorize([Role.ADMIN]),
  upload.single("cover"), // Assuming cover upload is still needed
  createBaseSystemPlaylist
);

router.get(
  "/playlists/system/base",
  authenticate,
  authorize([Role.ADMIN]),
  getAllBaseSystemPlaylists
);

router.put(
  "/playlists/system/base/:id",
  authenticate,
  authorize([Role.ADMIN]),
  upload.single("cover"), // Assuming cover upload
  updateBaseSystemPlaylist
);

router.delete(
  "/playlists/system/base/:id",
  authenticate,
  authorize([Role.ADMIN]),
  deleteBaseSystemPlaylist
);

// --- Global System Playlist Operations (Admin Only) ---
// Path adjusted: /api/admin/playlists/system/update-all
router.post(
  "/playlists/system/update-all",
  authenticate,
  authorize([Role.ADMIN]),
  updateAllSystemPlaylists
);

// Path adjusted: /api/admin/playlists/system-all
router.get(
  "/playlists/system-all",
  authenticate,
  authorize([Role.ADMIN]),
  getSystemPlaylists // Controller from playlist.controller
);

// --- Track Re-analysis by Admin ---
router.post(
  "/tracks/:trackId/reanalyze",
  authenticate,
  authorize([Role.ADMIN]),
  reanalyzeTrackHandler
);
// --- End Track Re-analysis by Admin ---

// --- Label Registration Management Routes (Admin) ---
router.get(
  "/label-registrations",
  authenticate,
  authorize([Role.ADMIN]),
  getAllLabelRegistrations
);

router.get(
  "/label-registrations/:registrationId",
  authenticate,
  authorize([Role.ADMIN]),
  getLabelRegistrationById
);

router.put(
  "/label-registrations/:registrationId/approve",
  authenticate,
  authorize([Role.ADMIN]),
  approveLabelRegistration
);

router.put(
  "/label-registrations/:registrationId/reject",
  authenticate,
  authorize([Role.ADMIN]),
  rejectLabelRegistration
);
// --- End Label Registration Management Routes ---

// New route for ArtistRequest model based requests
router.get(
  "/artist-role-requests",
  authenticate,
  authorize([Role.ADMIN]),
  getArtistRoleRequestsHandler
);

// New route for exporting track and artist data to Excel
router.get(
  "/export/track-artist-data",
  authenticate,
  authorize([Role.ADMIN]),
  exportTrackAndArtistData
);

// Add this new route for fixing album track types
router.post(
  "/fix-album-track-types",
  authenticate,
  authorize([Role.ADMIN]),
  fixAlbumTrackTypes
);

// ROUTE FOR ADMIN TO GET FULL DETAILS OF A SPECIFIC PLAYLIST (including all tracks)
router.get(
  "/playlists/:playlistId/details",
  authenticate,
  authorize([Role.ADMIN]),
  getPlaylistDetails
);

export default router;
