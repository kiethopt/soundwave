"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const playlist_controller_1 = require("../controllers/playlist.controller");
const upload_middleware_1 = __importDefault(require("../middleware/upload.middleware"));
const router = express_1.default.Router();
router.get("/home", auth_middleware_1.optionalAuthenticate, playlist_controller_1.getHomePageData);
router.use(auth_middleware_1.authenticate);
router.get("/", playlist_controller_1.getPlaylists);
router.post("/", playlist_controller_1.createPlaylist);
router.get("/suggest", playlist_controller_1.getPlaylistSuggestions);
router.get("/system/user", playlist_controller_1.getUserSystemPlaylists);
router.get("/:id", auth_middleware_1.optionalAuthenticate, playlist_controller_1.getPlaylistById);
router.patch("/:id", upload_middleware_1.default.single("cover"), playlist_controller_1.updatePlaylist);
router.delete("/:id", playlist_controller_1.deletePlaylist);
router.delete("/:playlistId/tracks/:trackId", playlist_controller_1.removeTrackFromPlaylist);
router.post("/:id/tracks", playlist_controller_1.addTrackToPlaylist);
router.patch("/:playlistId/reorder", auth_middleware_1.authenticate, playlist_controller_1.reorderPlaylistTracks);
exports.default = router;
//# sourceMappingURL=playlist.routes.js.map