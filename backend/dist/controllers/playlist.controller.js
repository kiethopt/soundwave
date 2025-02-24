"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePlaylist = exports.updatePlaylist = exports.removeTrackFromPlaylist = exports.addTrackToPlaylist = exports.getPlaylistById = exports.getPlaylists = exports.createPlaylist = exports.createFavoritePlaylist = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const createFavoritePlaylist = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma.playlist.create({
            data: {
                name: "Bài hát yêu thích",
                description: "Danh sách những bài hát yêu thích của bạn",
                privacy: "PRIVATE",
                type: "FAVORITE",
                userId,
            },
        });
    }
    catch (error) {
        console.error("Error creating favorite playlist:", error);
        throw error;
    }
});
exports.createFavoritePlaylist = createFavoritePlaylist;
const createPlaylist = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { name, description, privacy = "PRIVATE", type = "NORMAL", } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        if (type === "FAVORITE") {
            const existingFavorite = yield prisma.playlist.findFirst({
                where: {
                    userId,
                    type: "FAVORITE",
                },
            });
            if (existingFavorite) {
                res.status(400).json({
                    success: false,
                    message: "Bạn đã có playlist Yêu thích",
                });
                return;
            }
        }
        const playlist = yield prisma.playlist.create({
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
            message: "Đã tạo playlist thành công",
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
                message: "Unauthorized",
            });
            return;
        }
        let favoritePlaylist = yield prisma.playlist.findFirst({
            where: {
                userId,
                type: "FAVORITE",
            },
        });
        if (!favoritePlaylist) {
            favoritePlaylist = yield prisma.playlist.create({
                data: {
                    name: "Bài hát yêu thích",
                    description: "Danh sách những bài hát yêu thích của bạn",
                    privacy: "PRIVATE",
                    type: "FAVORITE",
                    userId,
                },
            });
        }
        const playlists = yield prisma.playlist.findMany({
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
                createdAt: "desc",
            },
        });
        const playlistsWithCount = playlists.map((playlist) => (Object.assign(Object.assign({}, playlist), { totalTracks: playlist._count.tracks, _count: undefined })));
        res.json({
            success: true,
            data: playlistsWithCount,
        });
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
        console.log("Getting playlist with params:", {
            playlistId: id,
            userId,
            userFromReq: req.user,
        });
        const playlistExists = yield prisma.playlist.findUnique({
            where: { id },
        });
        console.log("Playlist exists check:", playlistExists);
        if (!playlistExists) {
            res.status(404).json({
                success: false,
                message: "Playlist not found",
            });
            return;
        }
        const playlist = yield prisma.playlist.findFirst({
            where: {
                id,
                userId,
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
                },
            },
        });
        console.log("Full playlist data:", {
            found: !!playlist,
            trackCount: (_b = playlist === null || playlist === void 0 ? void 0 : playlist.tracks) === null || _b === void 0 ? void 0 : _b.length,
            playlistData: playlist,
        });
        if (!playlist) {
            res.status(403).json({
                success: false,
                message: "You don't have permission to view this playlist",
            });
            return;
        }
        const formattedTracks = playlist.tracks.map((pt) => ({
            id: pt.track.id,
            title: pt.track.title,
            duration: pt.track.duration,
            coverUrl: pt.track.coverUrl,
            artist: pt.track.artist,
            album: pt.track.album,
            createdAt: pt.track.createdAt.toISOString(),
        }));
        res.json({
            success: true,
            data: Object.assign(Object.assign({}, playlist), { tracks: formattedTracks }),
        });
    }
    catch (error) {
        console.error("Error in getPlaylistById:", error);
        next(error);
    }
});
exports.getPlaylistById = getPlaylistById;
const addTrackToPlaylist = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log("AddToPlaylist request:", {
            params: req.params,
            body: req.body,
            user: req.user,
        });
        const { id: playlistId } = req.params;
        const { trackId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!trackId) {
            res.status(400).json({
                success: false,
                message: "Track ID is required",
            });
            return;
        }
        const playlist = yield prisma.playlist.findFirst({
            where: {
                id: playlistId,
                userId,
            },
            include: {
                tracks: true,
            },
        });
        if (!playlist) {
            res.status(404).json({
                success: false,
                message: "Playlist not found",
            });
            return;
        }
        const track = yield prisma.track.findUnique({
            where: {
                id: trackId,
            },
        });
        if (!track) {
            res.status(404).json({
                success: false,
                message: "Track not found",
            });
            return;
        }
        const existingTrack = yield prisma.playlistTrack.findFirst({
            where: {
                playlistId,
                trackId,
            },
        });
        if (existingTrack) {
            res.status(400).json({
                success: false,
                message: "Track already exists in playlist",
            });
            return;
        }
        const nextTrackOrder = playlist.tracks.length;
        yield prisma.playlistTrack.create({
            data: {
                playlistId,
                trackId,
                trackOrder: nextTrackOrder,
            },
        });
        yield prisma.playlist.update({
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
            message: "Track added to playlist successfully",
        });
        return;
    }
    catch (error) {
        console.error("Error in addTrackToPlaylist:", error);
        next(error);
        return;
    }
});
exports.addTrackToPlaylist = addTrackToPlaylist;
const removeTrackFromPlaylist = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { playlistId, trackId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        console.log("Removing track from playlist:", {
            playlistId,
            trackId,
            userId,
        });
        const playlist = yield prisma.playlist.findFirst({
            where: {
                id: playlistId,
                userId,
            },
        });
        if (!playlist) {
            res.status(404).json({
                success: false,
                message: "Playlist không tồn tại hoặc bạn không có quyền truy cập",
            });
            return;
        }
        yield prisma.playlistTrack.deleteMany({
            where: {
                playlistId,
                trackId,
            },
        });
        yield prisma.playlist.update({
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
            message: "Đã xóa bài hát khỏi playlist",
        });
        return;
    }
    catch (error) {
        console.error("Error removing track:", error);
        next(error);
        return;
    }
});
exports.removeTrackFromPlaylist = removeTrackFromPlaylist;
const updatePlaylist = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { name, description, privacy } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        const playlist = yield prisma.playlist.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!playlist) {
            res.status(404).json({
                success: false,
                message: "Không tìm thấy playlist",
            });
            return;
        }
        const updatedPlaylist = yield prisma.playlist.update({
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
                        trackOrder: "asc",
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
            if (error.code === "P2002") {
                res.status(400).json({
                    success: false,
                    message: "Bạn đã có playlist với tên này",
                });
            }
        }
        res.status(500).json({
            success: false,
            message: "Đã có lỗi xảy ra",
        });
    }
});
exports.updatePlaylist = updatePlaylist;
const deletePlaylist = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        const playlist = yield prisma.playlist.findFirst({
            where: {
                id,
                userId,
            },
        });
        if (!playlist) {
            res.status(404).json({
                success: false,
                message: "Không tìm thấy playlist",
            });
            return;
        }
        yield prisma.playlist.delete({
            where: { id },
        });
        res.json({
            success: true,
            message: "Đã xóa playlist thành công",
        });
    }
    catch (error) {
        next(error);
    }
});
exports.deletePlaylist = deletePlaylist;
//# sourceMappingURL=playlist.controller.js.map