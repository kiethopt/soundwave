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
const admin_controller_1 = require("../controllers/admin.controller");
const genreController = __importStar(require("../controllers/genre.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../middleware/cache.middleware");
const upload_middleware_1 = __importStar(require("../middleware/upload.middleware"));
const router = express_1.default.Router();
router.get('/dashboard-stats', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), cache_middleware_1.cacheMiddleware, admin_controller_1.getDashboardStats);
router
    .route('/system/cache')
    .get(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.handleCacheStatus)
    .post(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.handleCacheStatus);
router.get('/users', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.getAllUsers);
router.get('/users/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), cache_middleware_1.cacheMiddleware, admin_controller_1.getUserById);
router.put('/users/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), upload_middleware_1.default.single('avatar'), admin_controller_1.updateUser);
router.put('/artists/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), upload_middleware_1.default.single('avatar'), admin_controller_1.updateArtist);
router.delete('/users/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.deleteUser);
router.delete('/artists/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.deleteArtist);
router.get('/artists', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.getAllArtists);
router.get('/artists/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), cache_middleware_1.cacheMiddleware, admin_controller_1.getArtistById);
router.get('/artist-requests', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.getAllArtistRequests);
router.get('/artist-requests/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), cache_middleware_1.cacheMiddleware, admin_controller_1.getArtistRequestDetail);
router.delete('/artist-requests/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.deleteArtistRequest);
router.get('/genres', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), cache_middleware_1.cacheMiddleware, genreController.getAllGenres);
router.post('/genres', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.createGenre);
router.put('/genres/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), upload_middleware_1.default.none(), admin_controller_1.updateGenre);
router.delete('/genres/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.deleteGenre);
router.post('/artist-requests/approve', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.approveArtistRequest);
router.post('/artist-requests/reject', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.rejectArtistRequest);
router
    .route('/system/ai-model')
    .get(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.handleAIModelStatus)
    .post(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.handleAIModelStatus);
router.get('/system-status', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.getSystemStatus);
<<<<<<< HEAD
=======
router.post('/bulk-upload-tracks', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), upload_middleware_1.default.array('audioFiles', 50), upload_middleware_1.handleUploadError, admin_controller_1.bulkUploadTracks);
>>>>>>> dabf14e3545e792907af12c5943f7cf419bef408
router.get('/artist-claims', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.getAllArtistClaimRequests);
router.get('/artist-claims/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), cache_middleware_1.cacheMiddleware, admin_controller_1.getArtistClaimRequestDetail);
router.post('/artist-claims/:id/approve', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.approveArtistClaimRequest);
router.post('/artist-claims/:id/reject', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)([client_1.Role.ADMIN]), admin_controller_1.rejectArtistClaimRequest);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map