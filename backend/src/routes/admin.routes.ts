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
  handleCacheStatus,
  handleAIModelStatus,
  getSystemStatus,
  getAllArtistClaimRequests,
  getArtistClaimRequestDetail,
  approveArtistClaimRequest,
  rejectArtistClaimRequest,
  bulkUploadTracks,
  generateUserAiPlaylistHandler,
  updateAiPlaylistVisibilityHandler,
  getUserAiPlaylistsHandler,
  getUserListeningHistoryHandler,
  reanalyzeTrackHandler,
} from "../controllers/admin.controller";
import * as genreController from "../controllers/genre.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { Role } from "@prisma/client";
import { cacheMiddleware } from "../middleware/cache.middleware";
import upload, { handleUploadError } from "../middleware/upload.middleware";

const router = express.Router();

// Thống kê Dashboard
router.get(
  "/dashboard-stats",
  authenticate,
  authorize([Role.ADMIN]),
  cacheMiddleware,
  getDashboardStats
);

// Cập nhật trạng thái cache
router
  .route("/system/cache")
  .get(authenticate, authorize([Role.ADMIN]), handleCacheStatus)
  .post(authenticate, authorize([Role.ADMIN]), handleCacheStatus);

// Cập nhật trạng thái bảo trì - REMOVED

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
router.post(
  "/artist-requests/approve",
  authenticate,
  authorize([Role.ADMIN]),
  approveArtistRequest
);
router.post(
  "/artist-requests/reject",
  authenticate,
  authorize([Role.ADMIN]),
  rejectArtistRequest
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
router.post(
  "/users/:userId/ai-playlists",
  authenticate,
  authorize([Role.ADMIN]),
  generateUserAiPlaylistHandler
);

router.put(
  "/ai-playlists/:playlistId/visibility",
  authenticate,
  authorize([Role.ADMIN]),
  updateAiPlaylistVisibilityHandler
);

router.get(
  "/users/:userId/ai-playlists",
  authenticate,
  authorize([Role.ADMIN]),
  getUserAiPlaylistsHandler
);

router.get(
  "/users/:userId/history",
  authenticate,
  authorize([Role.ADMIN]),
  getUserListeningHistoryHandler
);
// --- End User AI Playlist Management by Admin ---

// --- Track Re-analysis by Admin ---
router.post(
  "/tracks/:trackId/reanalyze",
  authenticate,
  authorize([Role.ADMIN]),
  reanalyzeTrackHandler
);
// --- End Track Re-analysis by Admin ---

export default router;
