"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const playlist_controller_1 = require("../controllers/playlist.controller");
const client_1 = require("@prisma/client");
const upload_middleware_1 = __importDefault(require("../middleware/upload.middleware"));
const router = express_1.default.Router();
router.get("/home", auth_middleware_1.optionalAuthenticate, playlist_controller_1.getHomePageData);
router.get("/system-all", auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), playlist_controller_1.getSystemPlaylists);
router.use(auth_middleware_1.authenticate);
router.get("/", playlist_controller_1.getPlaylists);
router.post("/", playlist_controller_1.createPlaylist);
router.get("/suggest", playlist_controller_1.getPlaylistSuggestions);
router.post("/vibe-rewind", playlist_controller_1.updateVibeRewindPlaylist);
router.get("/system/user", playlist_controller_1.getUserSystemPlaylists);
router.post("/ai-generate", playlist_controller_1.generateAIPlaylist);
router.post("/ai-generate/artist/:artistName", (req, res, next) => {
    req.body.basedOnArtist = req.params.artistName;
    (0, playlist_controller_1.generateAIPlaylist)(req, res, next);
});
router.get("/:id", auth_middleware_1.optionalAuthenticate, playlist_controller_1.getPlaylistById);
router.patch("/:id", upload_middleware_1.default.single("cover"), playlist_controller_1.updatePlaylist);
router.delete("/:id", playlist_controller_1.deletePlaylist);
router.delete("/:playlistId/tracks/:trackId", playlist_controller_1.removeTrackFromPlaylist);
router.post("/:id/tracks", playlist_controller_1.addTrackToPlaylist);
router.use("/admin", (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]));
router.post("/admin/system/base", upload_middleware_1.default.single("cover"), playlist_controller_1.createBaseSystemPlaylist);
router.get("/admin/system/base", playlist_controller_1.getAllBaseSystemPlaylists);
router.put("/admin/system/base/:id", upload_middleware_1.default.single("cover"), playlist_controller_1.updateBaseSystemPlaylist);
router.delete("/admin/system/base/:id", playlist_controller_1.deleteBaseSystemPlaylist);
router.post("/admin/system/update-all", playlist_controller_1.updateAllSystemPlaylists);
exports.default = router;
//# sourceMappingURL=playlist.routes.js.map