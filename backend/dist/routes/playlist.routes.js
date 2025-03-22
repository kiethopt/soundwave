"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const playlist_controller_1 = require("../controllers/playlist.controller");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
router.post('/personalized', playlist_controller_1.createPersonalizedPlaylist);
router.get('/system', playlist_controller_1.getSystemPlaylist);
router.post('/system/update-all', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['ADMIN']), playlist_controller_1.updateAllSystemPlaylists);
router.get('/system-all', playlist_controller_1.getSystemPlaylists);
router.post('/', playlist_controller_1.createPlaylist);
router.get('/', playlist_controller_1.getPlaylists);
router.get('/:id', playlist_controller_1.getPlaylistById);
router.patch('/:id', playlist_controller_1.updatePlaylist);
router.delete('/:playlistId/tracks/:trackId', playlist_controller_1.removeTrackFromPlaylist);
router.post('/:id/tracks', playlist_controller_1.addTrackToPlaylist);
exports.default = router;
//# sourceMappingURL=playlist.routes.js.map