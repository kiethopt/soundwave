"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const artist_controller_1 = require("../controllers/artist.controller");
const genreController = __importStar(require("../controllers/genre.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const upload_middleware_1 = __importDefault(require("../middleware/upload.middleware"));
const cache_middleware_1 = require("../middleware/cache.middleware");
const router = express_1.default.Router();
router.get('/profiles', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN, client_1.Role.ARTIST]), artist_controller_1.getAllArtistsProfile);
router.get('/profile/:id', auth_middleware_1.authenticate, cache_middleware_1.cacheMiddleware, artist_controller_1.getArtistProfile);
router.put('/profile/:id', auth_middleware_1.authenticate, upload_middleware_1.default.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'artistBanner', maxCount: 1 },
]), artist_controller_1.updateArtistProfile);
router.get('/stats/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN, client_1.Role.ARTIST]), artist_controller_1.getArtistStats);
router.get('/genres', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ARTIST]), cache_middleware_1.cacheMiddleware, genreController.getAllGenres);
router.get('/tracks/:id', auth_middleware_1.authenticate, artist_controller_1.getArtistTracks);
router.get('/albums/:id', auth_middleware_1.authenticate, artist_controller_1.getArtistAlbums);
router.get('/related/:id', auth_middleware_1.authenticate, artist_controller_1.getRelatedArtists);
router.get('/:id/albums', auth_middleware_1.authenticate, cache_middleware_1.cacheMiddleware, artist_controller_1.getArtistAlbums);
router.get('/stats', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ARTIST, client_1.Role.ADMIN]), artist_controller_1.getArtistStats);
exports.default = router;
//# sourceMappingURL=artist.routes.js.map