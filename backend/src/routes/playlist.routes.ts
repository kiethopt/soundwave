import express from "express";
import {
  authenticate,
  authorize,
  optionalAuthenticate,
} from "../middleware/auth.middleware";
import {
  createPlaylist,
  getPlaylists,
  getPlaylistById,
  updatePlaylist,
  removeTrackFromPlaylist,
  addTrackToPlaylist,
  // getSystemPlaylists, // Will be moved to admin routes
  // generateAIPlaylist,
  deletePlaylist,
  // System playlist controllers - to be moved
  // updateAllSystemPlaylists,
  // Base System Playlist Controllers (Admin) - to be moved
  // createBaseSystemPlaylist,
  // updateBaseSystemPlaylist,
  // deleteBaseSystemPlaylist,
  // getAllBaseSystemPlaylists,
  getHomePageData,
  getUserSystemPlaylists,
  getPlaylistSuggestions,
  // suggestMoreTracksForPlaylist,
  reorderPlaylistTracks,
  // getUserListeningStats, // Will be moved to admin routes
  // generateSystemPlaylistForUser, // Will be moved to admin routes
} from "../controllers/playlist.controller";
// Role will be used by admin routes, not needed here anymore if all admin routes are moved
// import { Role } from "@prisma/client";
import upload from "../middleware/upload.middleware";

const router = express.Router();

// == Public routes (no authentication required) ==
router.get("/home", optionalAuthenticate, getHomePageData);
// router.get(
//   "/system-all",
//   authenticate,
//   authorize([Role.ADMIN]),
//   getSystemPlaylists
// ); // Moved to admin.routes.ts as /playlists/system-all

// == Authenticated user routes ==
router.use(authenticate);

// Standard playlist management routes
router.get("/", getPlaylists);
router.post("/", createPlaylist);
router.get("/suggest", getPlaylistSuggestions);

// User-specific system playlist routes
router.get("/system/user", getUserSystemPlaylists);

// Route for user listening stats (Admin only) - MOVED to admin.routes.ts
// router.get(
//   "/admin/users/:userId/listening-stats",
//   authorize([Role.ADMIN]),
//   getUserListeningStats
// );

// Route for admin to generate a system playlist for a specific user - MOVED to admin.routes.ts
// router.post(
//   "/admin/users/:userId/system-playlists/generate",
//   authorize([Role.ADMIN]),
//   generateSystemPlaylistForUser
// );

// AI playlist routes
// router.post("/ai-generate", generateAIPlaylist);
// router.post("/ai-generate/artist/:artistName", (req, res, next) => {
//   req.body.basedOnArtist = req.params.artistName;
//   generateAIPlaylist(req, res, next);
// });

// Specific playlist ID routes - must be after all other specific routes
router.get("/:id", optionalAuthenticate, getPlaylistById);
router.patch("/:id", upload.single("cover"), updatePlaylist);
router.delete("/:id", deletePlaylist);
router.delete("/:playlistId/tracks/:trackId", removeTrackFromPlaylist);
router.post("/:id/tracks", addTrackToPlaylist);
// router.get("/:id/suggest-more", suggestMoreTracksForPlaylist);

// Route to update track order in a playlist
router.patch("/:playlistId/reorder", authenticate, reorderPlaylistTracks);

// == Admin-only routes - ALL MOVED to admin.routes.ts ==
// router.use("/admin", authorize([Role.ADMIN])); // This line itself might also be redundant if all /admin/... paths are gone

// router.post(
//   "/admin/system/base",
//   upload.single("cover"),
//   createBaseSystemPlaylist
// );
// router.get("/admin/system/base", getAllBaseSystemPlaylists);
// router.put(
//   "/admin/system/base/:id",
//   upload.single("cover"),
//   updateBaseSystemPlaylist
// );
// router.delete("/admin/system/base/:id", deleteBaseSystemPlaylist);
// router.post("/admin/system/update-all", updateAllSystemPlaylists);

export default router;
