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
  getSystemPlaylists,
  updateVibeRewindPlaylist,
  generateAIPlaylist,
  deletePlaylist,
  // System playlist controllers
  updateAllSystemPlaylists,
  // Base System Playlist Controllers (Admin)
  createBaseSystemPlaylist,
  updateBaseSystemPlaylist,
  deleteBaseSystemPlaylist,
  getAllBaseSystemPlaylists,
  getHomePageData,
} from "../controllers/playlist.controller";
import { Role } from "@prisma/client";
import upload from "../middleware/upload.middleware";

const router = express.Router();

// == Public routes (no authentication required) ==
router.get("/home", optionalAuthenticate, getHomePageData);
router.get(
  "/system-all",
  authenticate,
  authorize([Role.ADMIN]),
  getSystemPlaylists
);
router.get("/:id", optionalAuthenticate, getPlaylistById);

// == Authenticated user routes ==
router.use(authenticate);

// Standard playlist management routes
router.get("/", getPlaylists);
router.post("/", createPlaylist);
router.patch("/:id", upload.single("cover"), updatePlaylist);
router.delete("/:id", deletePlaylist);
router.delete("/:playlistId/tracks/:trackId", removeTrackFromPlaylist);
router.post("/:id/tracks", addTrackToPlaylist);

// AI playlist routes
router.post("/ai-generate", generateAIPlaylist);
router.post("/ai-generate/artist/:artistName", (req, res, next) => {
  req.body.basedOnArtist = req.params.artistName;
  generateAIPlaylist(req, res, next);
});

// User-specific system playlist routes
router.post("/vibe-rewind", updateVibeRewindPlaylist);

// == Admin-only routes ==
router.use("/admin", authorize([Role.ADMIN]));

// Routes for managing BASE system playlists
router.post(
  "/admin/system/base",
  upload.single("cover"),
  createBaseSystemPlaylist
);
router.get("/admin/system/base", getAllBaseSystemPlaylists);
router.put(
  "/admin/system/base/:id",
  upload.single("cover"),
  updateBaseSystemPlaylist
);
router.delete("/admin/system/base/:id", deleteBaseSystemPlaylist);

// Route to trigger update for all users (based on base playlists)
router.post("/admin/system/update-all", updateAllSystemPlaylists);

export default router;
