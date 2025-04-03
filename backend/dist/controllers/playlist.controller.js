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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomePageData = exports.getAllBaseSystemPlaylists = exports.deleteBaseSystemPlaylist = exports.updateBaseSystemPlaylist = exports.createBaseSystemPlaylist = exports.updateAllSystemPlaylists = exports.generateAIPlaylist = exports.updateVibeRewindPlaylist = exports.getSystemPlaylists = exports.deletePlaylist = exports.updatePlaylist = exports.removeTrackFromPlaylist = exports.addTrackToPlaylist = exports.getPlaylistById = exports.getPlaylists = exports.createPlaylist = exports.createFavoritePlaylist = void 0;
const playlistService = __importStar(require("../services/playlist.service"));
const albumService = __importStar(require("../services/album.service"));
const handle_utils_1 = require("../utils/handle-utils");
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../config/db"));
const createFavoritePlaylist = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.default.playlist.create({
            data: {
                name: 'Bài hát yêu thích',
                description: 'Danh sách những bài hát yêu thích của bạn',
                privacy: 'PRIVATE',
                type: 'FAVORITE',
                userId,
            },
        });
    }
    catch (error) {
        console.error('Error creating favorite playlist:', error);
        throw error;
    }
});
exports.createFavoritePlaylist = createFavoritePlaylist;
const createPlaylist = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { name, description, privacy = 'PRIVATE', type = 'NORMAL', } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        if (type === 'FAVORITE') {
            const existingFavorite = yield db_1.default.playlist.findFirst({
                where: {
                    userId,
                    type: 'FAVORITE',
                },
            });
            if (existingFavorite) {
                res.status(400).json({
                    success: false,
                    message: 'Bạn đã có playlist Yêu thích',
                });
                return;
            }
        }
        const playlist = yield db_1.default.playlist.create({
            data: {
                name,
                description,
                privacy,
                type,
                userId,
            },
        });
        res.status(201).json({
            success: true,
            message: 'Đã tạo playlist thành công',
            data: playlist,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.createPlaylist = createPlaylist;
const getPlaylists = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const filterType = req.header('X-Filter-Type');
        const isSystemFilter = filterType === 'system';
        if (!isSystemFilter) {
            let favoritePlaylist = yield db_1.default.playlist.findFirst({
                where: {
                    userId,
                    type: 'FAVORITE',
                },
            });
            if (!favoritePlaylist) {
                favoritePlaylist = yield db_1.default.playlist.create({
                    data: {
                        name: 'Bài hát yêu thích',
                        description: 'Danh sách những bài hát yêu thích của bạn',
                        privacy: 'PRIVATE',
                        type: 'FAVORITE',
                        userId,
                    },
                });
            }
            let vibeRewindPlaylist = yield db_1.default.playlist.findFirst({
                where: {
                    userId,
                    name: 'Vibe Rewind',
                },
            });
            if (!vibeRewindPlaylist) {
                vibeRewindPlaylist = yield db_1.default.playlist.create({
                    data: {
                        name: 'Vibe Rewind',
                        description: "Your personal time capsule - tracks you've been vibing to lately",
                        privacy: 'PRIVATE',
                        type: 'NORMAL',
                        userId,
                    },
                });
                try {
                    yield playlistService.updateVibeRewindPlaylist(userId);
                }
                catch (error) {
                    console.error('Error initializing Vibe Rewind playlist:', error);
                }
            }
        }
        if (isSystemFilter) {
            const systemPlaylists = yield db_1.default.playlist.findMany({
                where: {
                    OR: [
                        {
                            userId,
                            type: 'SYSTEM',
                        },
                        {
                            type: 'SYSTEM',
                            privacy: 'PUBLIC',
                            user: {
                                role: 'ADMIN',
                            },
                        },
                    ],
                },
                include: {
                    tracks: {
                        include: {
                            track: {
                                include: {
                                    artist: true,
                                    album: true,
                                },
                            },
                        },
                        orderBy: {
                            trackOrder: 'asc',
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            const formattedPlaylists = systemPlaylists.map((playlist) => {
                var _a;
                const formattedTracks = playlist.tracks.map((pt) => ({
                    id: pt.track.id,
                    title: pt.track.title,
                    audioUrl: pt.track.audioUrl,
                    duration: pt.track.duration,
                    coverUrl: pt.track.coverUrl,
                    artist: pt.track.artist,
                    album: pt.track.album,
                    createdAt: pt.track.createdAt.toISOString(),
                }));
                return Object.assign(Object.assign({}, playlist), { tracks: formattedTracks, canEdit: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'ADMIN' || playlist.userId === userId });
            });
            console.log(`Returning ${formattedPlaylists.length} system playlists for authenticated user.`);
            res.json({
                success: true,
                data: formattedPlaylists,
            });
        }
        else {
            const playlists = yield db_1.default.playlist.findMany({
                where: {
                    userId,
                },
                include: {
                    _count: {
                        select: {
                            tracks: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            const playlistsWithCount = playlists.map((playlist) => (Object.assign(Object.assign({}, playlist), { totalTracks: playlist._count.tracks, _count: undefined })));
            res.json({
                success: true,
                data: playlistsWithCount,
            });
        }
    }
    catch (error) {
        next(error);
    }
});
exports.getPlaylists = getPlaylists;
const getPlaylistById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        const isAuthenticated = !!userId;
        const playlistExists = yield db_1.default.playlist.findUnique({
            where: { id },
        });
        if (!playlistExists) {
            res.status(404).json({
                success: false,
                message: 'Playlist not found',
            });
            return;
        }
        const isSystemPlaylist = playlistExists.type === 'SYSTEM';
        const isFavoritePlaylist = playlistExists.type === 'FAVORITE';
        const isPublicPlaylist = playlistExists.privacy === 'PUBLIC';
        if (!isAuthenticated && !isPublicPlaylist && !isSystemPlaylist) {
            res.status(401).json({
                success: false,
                message: 'Please log in to view this playlist',
            });
            return;
        }
        if (playlistExists.type === 'NORMAL' &&
            playlistExists.name === 'Vibe Rewind') {
            yield playlistService.updateVibeRewindPlaylist(userId);
        }
        let playlist;
        if (isSystemPlaylist || isPublicPlaylist) {
            playlist = yield db_1.default.playlist.findUnique({
                where: { id },
                include: {
                    tracks: {
                        include: {
                            track: {
                                include: {
                                    artist: true,
                                    album: true,
                                },
                            },
                        },
                        orderBy: {
                            trackOrder: 'asc',
                        },
                    },
                },
            });
        }
        else if (isFavoritePlaylist) {
            if (!isAuthenticated || playlistExists.userId !== userId) {
                res.status(403).json({
                    success: false,
                    message: "You don't have permission to view this playlist",
                });
                return;
            }
            playlist = yield db_1.default.playlist.findUnique({
                where: { id },
                include: {
                    tracks: {
                        include: {
                            track: {
                                include: {
                                    artist: true,
                                    album: true,
                                },
                            },
                        },
                        orderBy: {
                            trackOrder: 'asc',
                        },
                    },
                },
            });
        }
        else {
            if (!isAuthenticated) {
                res.status(401).json({
                    success: false,
                    message: 'Please log in to view this playlist',
                });
                return;
            }
            if (playlistExists.userId !== userId) {
                res.status(403).json({
                    success: false,
                    message: "You don't have permission to view this playlist",
                });
                return;
            }
            playlist = yield db_1.default.playlist.findUnique({
                where: { id },
                include: {
                    tracks: {
                        include: {
                            track: {
                                include: {
                                    artist: true,
                                    album: true,
                                },
                            },
                        },
                        orderBy: {
                            trackOrder: 'asc',
                        },
                    },
                },
            });
        }
        if (!playlist) {
            res.status(403).json({
                success: false,
                message: "You don't have permission to view this playlist",
            });
            return;
        }
        const canEdit = isAuthenticated &&
            ((isSystemPlaylist && userRole === 'ADMIN') ||
                (!isSystemPlaylist && playlist.userId === userId));
        const formattedTracks = playlist.tracks.map((pt) => ({
            id: pt.track.id,
            title: pt.track.title,
            audioUrl: pt.track.audioUrl,
            duration: pt.track.duration,
            coverUrl: pt.track.coverUrl,
            artist: pt.track.artist,
            album: pt.track.album,
            createdAt: pt.track.createdAt.toISOString(),
        }));
        res.json({
            success: true,
            data: Object.assign(Object.assign({}, playlist), { tracks: formattedTracks, canEdit }),
        });
    }
    catch (error) {
        console.error('Error in getPlaylistById:', error);
        next(error);
    }
});
exports.getPlaylistById = getPlaylistById;
const addTrackToPlaylist = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        console.log('AddToPlaylist request:', {
            params: req.params,
            body: req.body,
            user: req.user,
        });
        const { id: playlistId } = req.params;
        const { trackId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        if (!trackId) {
            res.status(400).json({
                success: false,
                message: 'Track ID is required',
            });
            return;
        }
        const playlist = yield db_1.default.playlist.findUnique({
            where: {
                id: playlistId,
            },
            include: {
                tracks: true,
            },
        });
        if (!playlist) {
            res.status(404).json({
                success: false,
                message: 'Playlist not found',
            });
            return;
        }
        if (playlist.type === 'SYSTEM' && userRole !== 'ADMIN') {
            res.status(403).json({
                success: false,
                message: 'Only administrators can modify system playlists',
            });
            return;
        }
        if (playlist.type !== 'SYSTEM' && playlist.userId !== userId) {
            res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this playlist',
            });
            return;
        }
        const track = yield db_1.default.track.findUnique({
            where: {
                id: trackId,
            },
        });
        if (!track) {
            res.status(404).json({
                success: false,
                message: 'Track not found',
            });
            return;
        }
        const existingTrack = yield db_1.default.playlistTrack.findFirst({
            where: {
                playlistId,
                trackId,
            },
        });
        if (existingTrack) {
            res.status(400).json({
                success: false,
                message: 'Track already exists in playlist',
            });
            return;
        }
        const nextTrackOrder = playlist.tracks.length;
        yield db_1.default.playlistTrack.create({
            data: {
                playlistId,
                trackId,
                trackOrder: nextTrackOrder,
            },
        });
        yield db_1.default.playlist.update({
            where: {
                id: playlistId,
            },
            data: {
                totalTracks: {
                    increment: 1,
                },
                totalDuration: {
                    increment: track.duration,
                },
            },
        });
        res.status(200).json({
            success: true,
            message: 'Track added to playlist successfully',
        });
        return;
    }
    catch (error) {
        console.error('Error in addTrackToPlaylist:', error);
        next(error);
        return;
    }
});
exports.addTrackToPlaylist = addTrackToPlaylist;
const removeTrackFromPlaylist = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { playlistId, trackId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        console.log('Removing track from playlist:', {
            playlistId,
            trackId,
            userId,
        });
        const playlist = yield db_1.default.playlist.findUnique({
            where: {
                id: playlistId,
            },
        });
        if (!playlist) {
            res.status(404).json({
                success: false,
                message: 'Playlist not found',
            });
            return;
        }
        if (playlist.type === 'SYSTEM' && userRole !== 'ADMIN') {
            res.status(403).json({
                success: false,
                message: 'Only administrators can modify system playlists',
            });
            return;
        }
        if (playlist.type !== 'SYSTEM' && playlist.userId !== userId) {
            res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this playlist',
            });
            return;
        }
        yield db_1.default.playlistTrack.deleteMany({
            where: {
                playlistId,
                trackId,
            },
        });
        yield db_1.default.playlist.update({
            where: {
                id: playlistId,
            },
            data: {
                totalTracks: {
                    decrement: 1,
                },
            },
        });
        res.json({
            success: true,
            message: 'Đã xóa bài hát khỏi playlist',
        });
        return;
    }
    catch (error) {
        console.error('Error removing track:', error);
        next(error);
        return;
    }
});
exports.removeTrackFromPlaylist = removeTrackFromPlaylist;
const updatePlaylist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const { name, description, privacy } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const playlist = yield db_1.default.playlist.findUnique({
            where: { id },
        });
        if (!playlist) {
            res.status(404).json({
                success: false,
                message: 'Playlist not found',
            });
            return;
        }
        if (playlist.type === 'SYSTEM' && userRole !== 'ADMIN') {
            res.status(403).json({
                success: false,
                message: 'Only administrators can modify system playlists',
            });
            return;
        }
        if (playlist.type !== 'SYSTEM' && playlist.userId !== userId) {
            res.status(403).json({
                success: false,
                message: 'You do not have permission to modify this playlist',
            });
            return;
        }
        const updatedPlaylist = yield db_1.default.playlist.update({
            where: { id },
            data: {
                name,
                description,
                privacy,
            },
            include: {
                tracks: {
                    include: {
                        track: {
                            include: {
                                artist: true,
                            },
                        },
                    },
                    orderBy: {
                        trackOrder: 'asc',
                    },
                },
            },
        });
        res.json({
            success: true,
            data: updatedPlaylist,
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                res.status(400).json({
                    success: false,
                    message: 'Bạn đã có playlist với tên này',
                });
            }
        }
        res.status(500).json({
            success: false,
            message: 'Đã có lỗi xảy ra',
        });
    }
});
exports.updatePlaylist = updatePlaylist;
const deletePlaylist = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userRole = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const playlist = yield db_1.default.playlist.findUnique({
            where: { id },
        });
        if (!playlist) {
            res.status(404).json({
                success: false,
                message: 'Playlist not found',
            });
            return;
        }
        if (playlist.type === 'SYSTEM' && userRole !== 'ADMIN') {
            res.status(403).json({
                success: false,
                message: 'Only administrators can delete system playlists',
            });
            return;
        }
        if (playlist.type !== 'SYSTEM' && playlist.userId !== userId) {
            res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this playlist',
            });
            return;
        }
        yield db_1.default.playlist.delete({
            where: { id },
        });
        res.json({
            success: true,
            message: 'Đã xóa playlist thành công',
        });
    }
    catch (error) {
        next(error);
    }
});
exports.deletePlaylist = deletePlaylist;
const getSystemPlaylists = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield playlistService.getSystemPlaylists(req);
        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination,
        });
    }
    catch (error) {
        console.error('Error in getSystemPlaylists:', error);
        next(error);
    }
});
exports.getSystemPlaylists = getSystemPlaylists;
const updateVibeRewindPlaylist = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        yield playlistService.updateVibeRewindPlaylist(user.id);
        res.status(200).json({
            success: true,
            message: 'Vibe Rewind playlist updated successfully',
        });
    }
    catch (error) {
        console.error('Update Vibe Rewind playlist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update Vibe Rewind playlist',
        });
    }
});
exports.updateVibeRewindPlaylist = updateVibeRewindPlaylist;
const generateAIPlaylist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized, please login',
            });
            return;
        }
        const { name, description, trackCount, basedOnMood, basedOnGenre, basedOnArtist, } = req.body;
        const playlistData = yield playlistService.generateAIPlaylist(userId, {
            name,
            description,
            trackCount: trackCount ? parseInt(trackCount, 10) : undefined,
            basedOnMood,
            basedOnGenre,
            basedOnArtist,
        });
        res.status(200).json({
            success: true,
            message: `AI playlist generated successfully with ${playlistData.totalTracks} tracks from ${playlistData.artistCount} artists`,
            data: playlistData,
        });
    }
    catch (error) {
        console.error('Error generating AI playlist:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate AI playlist',
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.generateAIPlaylist = generateAIPlaylist;
const updateAllSystemPlaylists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.status(200).json({
            success: true,
            message: 'System playlists update job started',
        });
        setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                console.log('[ServiceTrigger] Starting system playlist update');
                const result = yield playlistService.updateAllSystemPlaylists();
                if (result.success) {
                    console.log('[ServiceTrigger] Successfully updated all system playlists');
                }
                else {
                    console.error(`[ServiceTrigger] Completed with ${result.errors.length} errors`);
                }
            }
            catch (error) {
                console.error('[ServiceTrigger] Critical error while updating system playlists:', error);
            }
        }), 10);
    }
    catch (error) {
        console.error('Update all system playlists error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start system playlists update job',
        });
    }
});
exports.updateAllSystemPlaylists = updateAllSystemPlaylists;
const createBaseSystemPlaylist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, privacy } = req.body;
        const coverFile = req.file;
        if (!name) {
            res
                .status(400)
                .json({ success: false, message: 'Playlist name is required.' });
            return;
        }
        const playlistData = {
            name,
            description,
            privacy: privacy || 'PUBLIC',
        };
        const playlist = yield playlistService.createBaseSystemPlaylist(playlistData, coverFile);
        res.status(201).json({ success: true, data: playlist });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
            res.status(400).json({ success: false, message: error.message });
        }
        else {
            (0, handle_utils_1.handleError)(res, error, 'Create Base System Playlist');
        }
    }
});
exports.createBaseSystemPlaylist = createBaseSystemPlaylist;
const updateBaseSystemPlaylist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description, privacy } = req.body;
        const coverFile = req.file;
        const updateData = {
            name,
            description,
            privacy,
        };
        const playlist = yield playlistService.updateBaseSystemPlaylist(id, updateData, coverFile);
        res.status(200).json({ success: true, data: playlist });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                res.status(404).json({ success: false, message: error.message });
            }
            else if (error.message.includes('already exists')) {
                res.status(400).json({ success: false, message: error.message });
            }
            else {
                (0, handle_utils_1.handleError)(res, error, 'Update Base System Playlist');
            }
        }
        else {
            (0, handle_utils_1.handleError)(res, error, 'Update Base System Playlist');
        }
    }
});
exports.updateBaseSystemPlaylist = updateBaseSystemPlaylist;
const deleteBaseSystemPlaylist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield playlistService.deleteBaseSystemPlaylist(id);
        res.status(200).json({
            success: true,
            message: 'Base system playlist deleted successfully.',
        });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(404).json({ success: false, message: error.message });
        }
        else {
            (0, handle_utils_1.handleError)(res, error, 'Delete Base System Playlist');
        }
    }
});
exports.deleteBaseSystemPlaylist = deleteBaseSystemPlaylist;
const getAllBaseSystemPlaylists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield playlistService.getAllBaseSystemPlaylists(req);
        res.status(200).json(Object.assign({ success: true }, result));
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get All Base System Playlists');
    }
});
exports.getAllBaseSystemPlaylists = getAllBaseSystemPlaylists;
const getHomePageData = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const isAuthenticated = !!userId;
        const [newestAlbums, hotAlbums] = yield Promise.all([
            albumService.getNewestAlbums(8),
            albumService.getHotAlbums(8),
        ]);
        const responseData = {
            newestAlbums,
            hotAlbums,
            systemPlaylists: [],
        };
        if (isAuthenticated && userId) {
            try {
                const systemPlaylists = yield db_1.default.playlist.findMany({
                    where: {
                        type: 'SYSTEM',
                        privacy: 'PUBLIC',
                    },
                    include: {
                        tracks: {
                            select: {
                                track: {
                                    include: {
                                        artist: true,
                                    },
                                },
                                trackOrder: true,
                            },
                            orderBy: {
                                trackOrder: 'asc',
                            },
                        },
                    },
                });
                responseData.systemPlaylists = systemPlaylists.map((playlist) => (Object.assign(Object.assign({}, playlist), { tracks: playlist.tracks.map((pt) => (Object.assign(Object.assign({}, pt.track), { trackOrder: pt.trackOrder }))) })));
                const userSystemPlaylists = yield db_1.default.playlist.findMany({
                    where: {
                        userId,
                        type: 'SYSTEM',
                    },
                    include: {
                        _count: {
                            select: {
                                tracks: true,
                            },
                        },
                    },
                });
                const userPlaylists = yield db_1.default.playlist.findMany({
                    where: {
                        userId,
                        type: {
                            not: 'SYSTEM',
                        },
                    },
                    include: {
                        _count: {
                            select: {
                                tracks: true,
                            },
                        },
                    },
                });
                responseData.personalizedSystemPlaylists = userSystemPlaylists.map((playlist) => (Object.assign(Object.assign({}, playlist), { totalTracks: playlist._count.tracks })));
                responseData.userPlaylists = userPlaylists.map((playlist) => (Object.assign(Object.assign({}, playlist), { totalTracks: playlist._count.tracks })));
            }
            catch (error) {
                console.error('Error fetching user playlist data:', error);
            }
        }
        res.json({
            success: true,
            data: responseData,
        });
    }
    catch (error) {
        console.error('Error in getHomePageData:', error);
        next(error);
    }
});
exports.getHomePageData = getHomePageData;
//# sourceMappingURL=playlist.controller.js.map