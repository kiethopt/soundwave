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
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const upload_middleware_1 = __importStar(require("../middleware/upload.middleware"));
const cache_middleware_1 = require("../middleware/cache.middleware");
const router = express_1.default.Router();
router.post('/follow/:id', auth_middleware_1.authenticate, cache_middleware_1.cacheMiddleware, user_controller_1.followUser);
router.delete('/unfollow/:id', auth_middleware_1.authenticate, cache_middleware_1.cacheMiddleware, user_controller_1.unfollowUser);
router.get('/followers', auth_middleware_1.authenticate, cache_middleware_1.cacheMiddleware, user_controller_1.getFollowers);
router.get('/following', auth_middleware_1.authenticate, cache_middleware_1.cacheMiddleware, user_controller_1.getFollowing);
router.get('/search-all', auth_middleware_1.authenticate, user_controller_1.searchAll);
router.get('/genres', user_controller_1.getAllGenres);
router.get('/profile/:id', user_controller_1.getUserProfile);
router.post('/request-artist', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.USER]), upload_middleware_1.default.single('avatar'), upload_middleware_1.handleUploadError, user_controller_1.requestArtistRole);
router.put('/edit-profile', auth_middleware_1.authenticate, upload_middleware_1.default.single('avatar'), upload_middleware_1.handleUploadError, user_controller_1.editProfile);
router.get('/check-artist-request', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.USER]), user_controller_1.checkArtistRequest);
router.get('/recommendedArtists', auth_middleware_1.authenticate, user_controller_1.getRecommendedArtists);
router.get('/newestAlbums', auth_middleware_1.authenticate, user_controller_1.getNewestAlbums);
router.get('/newestTracks', auth_middleware_1.authenticate, user_controller_1.getNewestTracks);
router.get('/topTracks', auth_middleware_1.authenticate, user_controller_1.getTopTracks);
router.get('/topArtists', auth_middleware_1.authenticate, user_controller_1.getTopArtists);
router.get('/topAlbums', auth_middleware_1.authenticate, user_controller_1.getTopAlbums);
exports.default = router;
//# sourceMappingURL=user.routes.js.map