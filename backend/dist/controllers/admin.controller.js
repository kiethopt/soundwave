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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugActiveTracks = exports.updateSystemPlaylists = exports.getRecommendationMatrix = exports.handleAIModelStatus = exports.handleCacheStatus = exports.getStats = exports.rejectArtistRequest = exports.approveArtistRequest = exports.deleteGenre = exports.updateGenre = exports.createGenre = exports.getArtistById = exports.getAllArtists = exports.deleteArtist = exports.deleteUser = exports.updateArtist = exports.updateUser = exports.getArtistRequestDetail = exports.getAllArtistRequests = exports.getUserById = exports.getAllUsers = void 0;
const handle_utils_1 = require("../utils/handle-utils");
const adminService = __importStar(require("../services/admin.service"));
const playlistService = __importStar(require("../services/playlist.service"));
const db_1 = __importDefault(require("../config/db"));
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { users, pagination } = yield adminService.getUsers(req);
        res.json({ users, pagination });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get all users');
    }
});
exports.getAllUsers = getAllUsers;
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield adminService.getUserById(id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'User not found') {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get user by id');
    }
});
exports.getUserById = getUserById;
const getAllArtistRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requests, pagination } = yield adminService.getArtistRequests(req);
        res.json({ requests, pagination });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get artist requests');
    }
});
exports.getAllArtistRequests = getAllArtistRequests;
const getArtistRequestDetail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const request = yield adminService.getArtistRequestDetail(id);
        res.json(request);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Request not found') {
            res.status(404).json({ message: 'Request not found' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get artist request details');
    }
});
exports.getArtistRequestDetail = getArtistRequestDetail;
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const avatarFile = req.file;
        const _a = req.body, { isActive, reason } = _a, userData = __rest(_a, ["isActive", "reason"]);
        const isStatusUpdate = 'isActive' in req.body || isActive !== undefined;
        if (isStatusUpdate) {
            const isActiveBool = isActive === 'true' || isActive === true ? true : false;
            const currentUser = yield db_1.default.user.findUnique({
                where: { id },
                select: { isActive: true },
            });
            if (currentUser && currentUser.isActive && !isActiveBool) {
                const updatedUser = yield adminService.updateUserInfo(id, {
                    isActive: false,
                });
                if (reason) {
                    yield db_1.default.notification.create({
                        data: {
                            type: 'ACCOUNT_DEACTIVATED',
                            message: `Your account has been deactivated. Reason: ${reason}`,
                            recipientType: 'USER',
                            userId: id,
                            isRead: false,
                        },
                    });
                }
                res.json({
                    message: 'User deactivated successfully',
                    user: updatedUser,
                });
                return;
            }
            else if (currentUser && !currentUser.isActive && isActiveBool) {
                const updatedUser = yield adminService.updateUserInfo(id, {
                    isActive: true,
                });
                yield db_1.default.notification.create({
                    data: {
                        type: 'ACCOUNT_ACTIVATED',
                        message: 'Your account has been reactivated.',
                        recipientType: 'USER',
                        userId: id,
                        isRead: false,
                    },
                });
                res.json({
                    message: 'User activated successfully',
                    user: updatedUser,
                });
                return;
            }
        }
        const updatedUser = yield adminService.updateUserInfo(id, userData, avatarFile);
        res.json({
            message: 'User updated successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'User not found') {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            else if (error.message === 'Email already exists' ||
                error.message === 'Username already exists') {
                res.status(400).json({ message: error.message });
                return;
            }
            else if (error.message === 'Current password is incorrect') {
                res.status(400).json({ message: error.message });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Update user');
    }
});
exports.updateUser = updateUser;
const updateArtist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const avatarFile = req.file;
        const _a = req.body, { isActive, reason } = _a, artistData = __rest(_a, ["isActive", "reason"]);
        const isStatusUpdate = 'isActive' in req.body || isActive !== undefined;
        if (isStatusUpdate) {
            const isActiveBool = isActive === 'true' || isActive === true ? true : false;
            const currentArtist = yield db_1.default.artistProfile.findUnique({
                where: { id },
                select: {
                    isActive: true,
                    userId: true,
                },
            });
            if (currentArtist && currentArtist.isActive && !isActiveBool) {
                const updatedArtist = yield adminService.updateArtistInfo(id, {
                    isActive: false,
                });
                if (reason && currentArtist.userId) {
                    yield db_1.default.notification.create({
                        data: {
                            type: 'ACCOUNT_DEACTIVATED',
                            message: `Your artist account has been deactivated. Reason: ${reason}`,
                            recipientType: 'USER',
                            userId: currentArtist.userId,
                            isRead: false,
                        },
                    });
                }
                res.json({
                    message: 'Artist deactivated successfully',
                    artist: updatedArtist,
                });
                return;
            }
            else if (currentArtist && !currentArtist.isActive && isActiveBool) {
                const updatedArtist = yield adminService.updateArtistInfo(id, {
                    isActive: true,
                });
                if (currentArtist.userId) {
                    yield db_1.default.notification.create({
                        data: {
                            type: 'ACCOUNT_ACTIVATED',
                            message: 'Your artist account has been reactivated.',
                            recipientType: 'USER',
                            userId: currentArtist.userId,
                            isRead: false,
                        },
                    });
                }
                res.json({
                    message: 'Artist activated successfully',
                    artist: updatedArtist,
                });
                return;
            }
        }
        const updatedArtist = yield adminService.updateArtistInfo(id, artistData, avatarFile);
        res.json({
            message: 'Artist updated successfully',
            artist: updatedArtist,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Artist not found') {
                res.status(404).json({ message: 'Artist not found' });
                return;
            }
            else if (error.message === 'Artist name already exists') {
                res.status(400).json({ message: 'Artist name already exists' });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Update artist');
    }
});
exports.updateArtist = updateArtist;
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield adminService.deleteUserById(id);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Delete user');
    }
});
exports.deleteUser = deleteUser;
const deleteArtist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield adminService.deleteArtistById(id);
        res.json({ message: 'Artist deleted permanently' });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Delete artist');
    }
});
exports.deleteArtist = deleteArtist;
const getAllArtists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { artists, pagination } = yield adminService.getArtists(req);
        res.json({ artists, pagination });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get all artists');
    }
});
exports.getAllArtists = getAllArtists;
const getArtistById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const artist = yield adminService.getArtistById(id);
        res.json(artist);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Artist not found') {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get artist by id');
    }
});
exports.getArtistById = getArtistById;
const createGenre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        const validationErrors = (0, handle_utils_1.runValidations)([
            (0, handle_utils_1.validateField)(name, 'Name', { required: true }),
            name && (0, handle_utils_1.validateField)(name.trim(), 'Name', { minLength: 1 }),
            name && (0, handle_utils_1.validateField)(name, 'Name', { maxLength: 50 }),
        ]);
        if (validationErrors.length > 0) {
            res
                .status(400)
                .json({ message: 'Validation failed', errors: validationErrors });
            return;
        }
        const genre = yield adminService.createNewGenre(name);
        res.status(201).json({ message: 'Genre created successfully', genre });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message === 'Genre name already exists') {
            res.status(400).json({ message: 'Genre name already exists' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Create genre');
    }
});
exports.createGenre = createGenre;
const updateGenre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const validationErrors = (0, handle_utils_1.runValidations)([
            (0, handle_utils_1.validateField)(id, 'Genre ID', { required: true }),
            (0, handle_utils_1.validateField)(name, 'Name', { required: true }),
            name && (0, handle_utils_1.validateField)(name.trim(), 'Name', { minLength: 1 }),
            name && (0, handle_utils_1.validateField)(name, 'Name', { maxLength: 50 }),
        ]);
        if (validationErrors.length > 0) {
            res
                .status(400)
                .json({ message: 'Validation failed', errors: validationErrors });
            return;
        }
        const updatedGenre = yield adminService.updateGenreInfo(id, name);
        res.json({
            message: 'Genre updated successfully',
            genre: updatedGenre,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Genre not found') {
                res.status(404).json({ message: 'Genre not found' });
                return;
            }
            else if (error.message === 'Genre name already exists') {
                res.status(400).json({ message: 'Genre name already exists' });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Update genre');
    }
});
exports.updateGenre = updateGenre;
const deleteGenre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield adminService.deleteGenreById(id);
        res.json({ message: 'Genre deleted successfully' });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Delete genre');
    }
});
exports.deleteGenre = deleteGenre;
const approveArtistRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.body;
        const updatedProfile = yield adminService.approveArtistRequest(requestId);
        yield db_1.default.notification.create({
            data: {
                type: 'ARTIST_REQUEST_APPROVE',
                message: 'Your request to become an Artist has been approved!',
                recipientType: 'USER',
                userId: updatedProfile.user.id,
                isRead: false,
            },
        });
        res.json({
            message: 'Artist role approved successfully',
            user: updatedProfile.user,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message.includes('not found or already verified')) {
            res
                .status(404)
                .json({ message: 'Artist request not found or already verified' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Approve artist request');
    }
});
exports.approveArtistRequest = approveArtistRequest;
const rejectArtistRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId, reason } = req.body;
        const result = yield adminService.rejectArtistRequest(requestId);
        let notificationMessage = 'Your request to become an Artist has been rejected.';
        if (reason && reason.trim() !== '') {
            notificationMessage += ` Reason: ${reason.trim()}`;
        }
        yield db_1.default.notification.create({
            data: {
                type: 'ARTIST_REQUEST_REJECT',
                message: notificationMessage,
                recipientType: 'USER',
                userId: result.user.id,
                isRead: false,
            },
        });
        res.json({
            message: 'Artist role request rejected successfully',
            user: result.user,
            hasPendingRequest: result.hasPendingRequest,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message.includes('not found or already verified')) {
            res
                .status(404)
                .json({ message: 'Artist request not found or already verified' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Reject artist request');
    }
});
exports.rejectArtistRequest = rejectArtistRequest;
const getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const statsData = yield adminService.getSystemStats();
        res.json(statsData);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get stats');
    }
});
exports.getStats = getStats;
const handleCacheStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { enabled } = req.method === 'POST' ? req.body : {};
        const result = yield adminService.updateCacheStatus(enabled);
        res.json(result);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Manage cache status');
    }
});
exports.handleCacheStatus = handleCacheStatus;
const handleAIModelStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { model } = req.method === 'POST' ? req.body : {};
        const result = yield adminService.updateAIModel(model);
        res.json(result);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Manage AI model');
    }
});
exports.handleAIModelStatus = handleAIModelStatus;
const getRecommendationMatrix = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 100;
        const matrix = yield adminService.getRecommendationMatrix(limit);
        if (!matrix.success) {
            res.status(400).json({
                message: matrix.message || 'Failed to retrieve recommendation matrix',
            });
            return;
        }
        res.json(matrix);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get recommendation matrix');
    }
});
exports.getRecommendationMatrix = getRecommendationMatrix;
const updateSystemPlaylists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type } = req.query;
        console.log(`[Admin Controller] Starting playlist update. Type: ${type || 'all'}`);
        if (!type || type === 'all') {
            yield playlistService.systemPlaylistService.updateAllSystemPlaylists();
            res.json({
                success: true,
                message: 'All system playlists have been updated successfully',
            });
            return;
        }
        switch (type) {
            case 'global':
            case 'trending':
            case 'top-hits':
                yield db_1.default.playlist.updateGlobalPlaylist();
                res.json({
                    success: true,
                    message: 'Trending Now playlists have been updated successfully',
                });
                break;
            case 'discover-weekly':
                yield db_1.default.playlist.updateDiscoverWeeklyPlaylists();
                res.json({
                    success: true,
                    message: 'Discover Weekly playlists have been updated successfully',
                });
                break;
            case 'new-releases':
                yield db_1.default.playlist.updateNewReleasesPlaylists();
                res.json({
                    success: true,
                    message: 'New Releases playlists have been updated successfully',
                });
                break;
            default:
                res.status(400).json({
                    success: false,
                    message: `Invalid playlist type: ${type}. Valid types are: all, global, trending, top-hits, discover-weekly, new-releases`,
                });
        }
    }
    catch (error) {
        console.error('Error updating playlists:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update playlists',
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.updateSystemPlaylists = updateSystemPlaylists;
const debugActiveTracks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const activeTracks = yield db_1.default.track.findMany({
            where: { isActive: true },
            select: {
                id: true,
                title: true,
                artistId: true,
                artist: {
                    select: {
                        artistName: true,
                    },
                },
                playCount: true,
                _count: {
                    select: {
                        likedBy: true,
                    },
                },
            },
            take: 20,
        });
        const historyCount = yield db_1.default.history.count({
            where: {
                type: 'PLAY',
                trackId: { not: null },
                playCount: { gt: 0 },
            },
        });
        const likesCount = yield db_1.default.userLikeTrack.count();
        res.json({
            message: 'Debug active tracks',
            activeTracks: activeTracks,
            trackCount: activeTracks.length,
            historyCount,
            likesCount,
            qualityThresholds: {
                requiredPlayCount: 5,
                requiredLikeCount: 2,
                minCompletionRate: 0.3,
            },
        });
    }
    catch (error) {
        console.error('Error getting debug tracks:', error);
        res.status(500).json({
            message: 'Failed to get debug tracks',
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.debugActiveTracks = debugActiveTracks;
//# sourceMappingURL=admin.controller.js.map