"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const artist_controller_1 = require("../controllers/artist.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const upload_middleware_1 = __importDefault(require("../middleware/upload.middleware"));
const cache_middleware_1 = require("src/middleware/cache.middleware");
const router = express_1.default.Router();
router.get('/profiles', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN, client_1.Role.ARTIST]), artist_controller_1.getAllArtistsProfile);
router.get('/profile/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN, client_1.Role.ARTIST]), artist_controller_1.getArtistProfile);
router.put('/profile/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN, client_1.Role.ARTIST]), upload_middleware_1.default.single('avatar'), artist_controller_1.updateArtistProfile);
router.get('/stats/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN, client_1.Role.ARTIST]), artist_controller_1.getArtistStats);
router.get('/tracks/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN, client_1.Role.ARTIST]), artist_controller_1.getArtistTracks);
router.get('/:id/albums', auth_middleware_1.authenticate, cache_middleware_1.cacheMiddleware, artist_controller_1.getArtistAlbums);
router.get('/stats', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ARTIST, client_1.Role.ADMIN]), artist_controller_1.getArtistStats);
exports.default = router;
//# sourceMappingURL=artist.routes.js.map