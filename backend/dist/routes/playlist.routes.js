"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const playlist_controller_1 = require("../controllers/playlist.controller");
const cache_middleware_1 = require("../middleware/cache.middleware");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.get('/system-all', cache_middleware_1.cacheMiddleware, playlist_controller_1.getSystemPlaylists);
router.get('/home', auth_middleware_1.optionalAuthenticate, playlist_controller_1.getHomePageData);
router.get('/:id', auth_middleware_1.optionalAuthenticate, playlist_controller_1.getPlaylistById);
router.use(auth_middleware_1.authenticate);
router.get('/', playlist_controller_1.getPlaylists);
router.post('/', playlist_controller_1.createPlaylist);
router.patch('/:id', playlist_controller_1.updatePlaylist);
router.delete('/:playlistId/tracks/:trackId', playlist_controller_1.removeTrackFromPlaylist);
router.post('/:id/tracks', playlist_controller_1.addTrackToPlaylist);
router.post('/ai-generate', playlist_controller_1.generateAIPlaylist);
router.post('/ai-generate/artist/:artistName', (req, res, next) => {
    req.body.basedOnArtist = req.params.artistName;
    (0, playlist_controller_1.generateAIPlaylist)(req, res, next);
});
router.post('/vibe-rewind', playlist_controller_1.updateVibeRewindPlaylist);
router.get('/system/:playlistName', playlist_controller_1.getSystemPlaylist);
router.post('/system/:playlistName/user/:userId', playlist_controller_1.updateSystemPlaylistForUser);
router.use('/admin', (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]));
router.post('/admin/system/create', playlist_controller_1.createSystemPlaylists);
router.post('/admin/system/update-all', playlist_controller_1.updateAllSystemPlaylists);
exports.default = router;
//# sourceMappingURL=playlist.routes.js.map