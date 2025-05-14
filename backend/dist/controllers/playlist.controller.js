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
exports.adminDeleteSystemPlaylist = exports.getPlaylistDetails = exports.deleteUserPlaylist = exports.generateSystemPlaylistForUser = exports.getUserListeningStats = exports.reorderPlaylistTracks = exports.getPlaylistSuggestions = exports.getHomePageData = exports.getAllBaseSystemPlaylists = exports.deleteBaseSystemPlaylist = exports.updateBaseSystemPlaylist = exports.createBaseSystemPlaylist = exports.updateAllSystemPlaylists = exports.getUserSystemPlaylists = exports.getSystemPlaylists = exports.deletePlaylist = exports.updatePlaylist = exports.removeTrackFromPlaylist = exports.addTrackToPlaylist = exports.getPlaylistById = exports.getPlaylists = exports.createPlaylist = void 0;
const playlistService = __importStar(require("../services/playlist.service"));
const albumService = __importStar(require("../services/album.service"));
const userService = __importStar(require("../services/user.service"));
const handle_utils_1 = require("../utils/handle-utils");
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../config/db"));
const upload_service_1 = require("../services/upload.service");
const prisma_selects_1 = require("../utils/prisma-selects");
const createPlaylist = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { name, description, privacy = "PRIVATE", type = "NORMAL", } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        if (type === "FAVORITE") {
            const existingFavorite = await db_1.default.playlist.findFirst({
                where: {
                    userId,
                    type: "FAVORITE",
                },
            });
            if (existingFavorite) {
                res.status(400).json({
                    success: false,
                    message: "You already have a Favorites playlist",
                });
                return;
            }
        }
        const playlist = await db_1.default.playlist.create({
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
            message: "Playlist created successfully",
            data: playlist,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createPlaylist = createPlaylist;
const getPlaylists = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        const filterType = req.header("X-Filter-Type");
        const isSystemFilter = filterType === "system";
        if (isSystemFilter) {
            const systemPlaylists = await db_1.default.playlist.findMany({
                where: {
                    OR: [
                        {
                            userId,
                            type: "SYSTEM",
                        },
                        {
                            type: "SYSTEM",
                            privacy: "PUBLIC",
                            user: {
                                role: "ADMIN",
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
                            trackOrder: "asc",
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
            const formattedPlaylists = systemPlaylists.map((playlist) => {
                const formattedTracks = playlist.tracks.map((pt) => ({
                    id: pt.track.id,
                    title: pt.track.title,
                    audioUrl: pt.track.audioUrl,
                    duration: pt.track.duration,
                    coverUrl: pt.track.coverUrl,
                    artist: pt.track.artist,
                    album: pt.track.album,
                    createdAt: pt.track.createdAt.toISOString(),
                    genres: pt.track.genres,
                }));
                return {
                    ...playlist,
                    tracks: formattedTracks,
                    canEdit: req.user?.role === "ADMIN" || playlist.userId === userId,
                };
            });
            console.log(`Returning ${formattedPlaylists.length} system playlists for authenticated user.`);
            res.json({
                success: true,
                data: formattedPlaylists,
            });
        }
        else {
            const playlists = await db_1.default.playlist.findMany({
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
            const playlistsWithCount = playlists.map((playlist) => ({
                ...playlist,
                totalTracks: playlist._count.tracks,
                _count: undefined,
            }));
            res.json({
                success: true,
                data: playlistsWithCount,
            });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.getPlaylists = getPlaylists;
const getPlaylistById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const isAuthenticated = !!userId;
        const playlistExists = await db_1.default.playlist.findUnique({
            where: { id },
            select: {
                id: true,
                type: true,
                privacy: true,
                userId: true,
            },
        });
        if (!playlistExists) {
            res.status(404).json({
                success: false,
                message: "Playlist not found",
            });
            return;
        }
        const isSystemPlaylist = playlistExists.type === "SYSTEM";
        const isPublicPlaylist = playlistExists.privacy === "PUBLIC";
        const isOwnedByUser = playlistExists.userId === userId;
        let canView = false;
        if (isPublicPlaylist) {
            canView = true;
        }
        else if (isAuthenticated) {
            if (isOwnedByUser) {
                canView = true;
            }
            else if (isSystemPlaylist && playlistExists.privacy === "PRIVATE") {
                if (userRole === "ADMIN") {
                    canView = true;
                }
                else {
                    canView = false;
                }
            }
            else if (userRole === "ADMIN") {
                canView = true;
            }
        }
        if (!canView) {
            res.status(isAuthenticated ? 403 : 401).json({
                success: false,
                message: isAuthenticated
                    ? "You do not have permission to view this playlist"
                    : "Please log in to view this playlist",
            });
            return;
        }
        const playlist = await db_1.default.playlist.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatar: true,
                    },
                },
                tracks: {
                    where: {
                        track: {
                            isActive: true,
                        },
                    },
                    select: {
                        addedAt: true,
                        trackOrder: true,
                        track: {
                            select: {
                                ...prisma_selects_1.trackSelect,
                                album: { select: { id: true, title: true, coverUrl: true } },
                                artist: {
                                    select: { id: true, artistName: true, avatar: true },
                                },
                                genres: { include: { genre: true } },
                            },
                        },
                    },
                    orderBy: {
                        trackOrder: "asc",
                    },
                },
                _count: {
                    select: { tracks: true },
                },
            },
        });
        if (!playlist) {
            res.status(404).json({
                success: false,
                message: "Playlist details not found after permission check.",
            });
            return;
        }
        const formattedTracks = playlist.tracks.map((pt) => ({
            ...pt.track,
            albumTitle: pt.track.album?.title,
            artistName: pt.track.artist?.artistName,
            addedAt: pt.addedAt,
            trackOrder: pt.trackOrder,
        }));
        res.json({
            success: true,
            data: {
                ...playlist,
                tracks: formattedTracks,
                totalTracks: playlist._count.tracks,
                canEdit: playlist.userId === userId || userRole === "ADMIN",
                _count: undefined,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPlaylistById = getPlaylistById;
const addTrackToPlaylist = async (req, res, next) => {
    try {
        const { id: playlistId } = req.params;
        const { trackId } = req.body;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!trackId) {
            res.status(400).json({
                success: false,
                message: "Track ID is required",
            });
            return;
        }
        const playlist = await db_1.default.playlist.findUnique({
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
                message: "Playlist not found",
            });
            return;
        }
        if (playlist.type === "SYSTEM" && playlist.name === "Welcome Mix") {
            res.status(400).json({
                success: false,
                message: `Cannot manually add tracks to ${playlist.name} playlist.`,
            });
            return;
        }
        if (playlist.type === "SYSTEM" && userRole !== "ADMIN") {
            res.status(403).json({
                success: false,
                message: "Only administrators can modify system playlists",
            });
            return;
        }
        if (playlist.type !== "SYSTEM" && playlist.userId !== userId) {
            res.status(403).json({
                success: false,
                message: "You do not have permission to modify this playlist",
            });
            return;
        }
        const track = await db_1.default.track.findUnique({
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
        const existingTrack = await db_1.default.playlistTrack.findFirst({
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
        await db_1.default.playlistTrack.create({
            data: {
                playlistId,
                trackId,
                trackOrder: nextTrackOrder,
            },
        });
        await db_1.default.playlist.update({
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
};
exports.addTrackToPlaylist = addTrackToPlaylist;
const removeTrackFromPlaylist = async (req, res, next) => {
    try {
        const { playlistId, trackId } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        console.log("Removing track from playlist:", {
            playlistId,
            trackId,
            userId,
        });
        const [playlist, track] = await Promise.all([
            db_1.default.playlist.findUnique({
                where: {
                    id: playlistId,
                },
            }),
            db_1.default.track.findUnique({
                where: {
                    id: trackId,
                },
                select: {
                    duration: true,
                },
            }),
        ]);
        if (!playlist) {
            res.status(404).json({
                success: false,
                message: "Playlist not found",
            });
            return;
        }
        if (!track) {
            res.status(404).json({
                success: false,
                message: "Track not found",
            });
            return;
        }
        if (playlist.type === "SYSTEM" && userRole !== "ADMIN") {
            res.status(403).json({
                success: false,
                message: "Only administrators can modify system playlists",
            });
            return;
        }
        if (playlist.type !== "SYSTEM" && playlist.userId !== userId) {
            res.status(403).json({
                success: false,
                message: "You do not have permission to modify this playlist",
            });
            return;
        }
        await db_1.default.playlistTrack.deleteMany({
            where: {
                playlistId,
                trackId,
            },
        });
        await db_1.default.playlist.update({
            where: {
                id: playlistId,
            },
            data: {
                totalTracks: {
                    decrement: 1,
                },
                totalDuration: {
                    decrement: track.duration,
                },
            },
        });
        res.json({
            success: true,
            message: "Track removed from playlist successfully",
        });
        return;
    }
    catch (error) {
        console.error("Error removing track:", error);
        next(error);
        return;
    }
};
exports.removeTrackFromPlaylist = removeTrackFromPlaylist;
const updatePlaylist = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, privacy } = req.body;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        const playlist = await db_1.default.playlist.findUnique({
            where: { id },
        });
        if (!playlist) {
            res.status(404).json({
                success: false,
                message: "Playlist not found",
            });
            return;
        }
        if (playlist.type === "SYSTEM" && userRole !== "ADMIN") {
            res.status(403).json({
                success: false,
                message: "Only administrators can modify system playlists",
            });
            return;
        }
        if (playlist.type !== "SYSTEM" && playlist.userId !== userId) {
            res.status(403).json({
                success: false,
                message: "You do not have permission to modify this playlist",
            });
            return;
        }
        if (playlist.type === "FAVORITE" &&
            privacy &&
            privacy !== playlist.privacy) {
            res.status(400).json({
                success: false,
                message: "Cannot change the privacy of the Favorites playlist",
            });
            return;
        }
        const updateData = {
            name,
            description,
            ...(playlist.type !== "FAVORITE" && { privacy }),
        };
        if (req.file) {
            try {
                const result = await (0, upload_service_1.uploadFile)(req.file.buffer, "playlists/covers", "image");
                updateData.coverUrl = result.secure_url;
                console.log("Uploaded new cover image to Cloudinary:", result.secure_url);
            }
            catch (uploadError) {
                console.error("Error uploading cover image:", uploadError);
                res.status(500).json({
                    success: false,
                    message: "Failed to upload cover image",
                });
                return;
            }
        }
        const updatedPlaylist = await db_1.default.playlist.update({
            where: { id },
            data: updateData,
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
        const responseData = {
            ...updatedPlaylist,
            canEdit: req.user?.role === "ADMIN" || updatedPlaylist.userId === userId,
        };
        res.json({
            success: true,
            data: responseData,
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                res.status(400).json({
                    success: false,
                    message: "You already have a playlist with this name",
                });
            }
        }
        res.status(500).json({
            success: false,
            message: "An error has occurred",
        });
    }
};
exports.updatePlaylist = updatePlaylist;
const deletePlaylist = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        const playlist = await db_1.default.playlist.findUnique({
            where: { id },
        });
        if (!playlist) {
            res.status(404).json({
                success: false,
                message: "Playlist not found",
            });
            return;
        }
        if (playlist.type === "SYSTEM" && userRole !== "ADMIN") {
            res.status(403).json({
                success: false,
                message: "Only administrators can delete system playlists",
            });
            return;
        }
        if (playlist.type !== "SYSTEM" && playlist.userId !== userId) {
            res.status(403).json({
                success: false,
                message: "You do not have permission to delete this playlist",
            });
            return;
        }
        await db_1.default.playlist.delete({
            where: { id },
        });
        res.json({
            success: true,
            message: "Playlist deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deletePlaylist = deletePlaylist;
const getSystemPlaylists = async (req, res, next) => {
    try {
        const result = await playlistService.getSystemPlaylists(req);
        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination,
        });
    }
    catch (error) {
        console.error("Error in getSystemPlaylists:", error);
        next(error);
    }
};
exports.getSystemPlaylists = getSystemPlaylists;
const getUserSystemPlaylists = async (req, res, next) => {
    try {
        const { userId: targetUserId } = req.params;
        if (!targetUserId) {
            res.status(400).json({
                success: false,
                message: "User ID is required in route parameters.",
            });
            return;
        }
        const result = await playlistService.getUserSystemPlaylists(req, targetUserId);
        res.json({ success: true, ...result });
    }
    catch (error) {
        console.error("[PlaylistController] Error in getUserSystemPlaylists:", error);
        next(error);
    }
};
exports.getUserSystemPlaylists = getUserSystemPlaylists;
const updateAllSystemPlaylists = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: "System playlists update job started",
        });
        setTimeout(async () => {
            try {
                console.log("[ServiceTrigger] Starting system playlist update");
                const result = await playlistService.updateAllSystemPlaylists();
                if (result.success) {
                    console.log("[ServiceTrigger] Successfully updated all system playlists");
                }
                else {
                    console.error(`[ServiceTrigger] Completed with ${result.errors.length} errors`);
                }
            }
            catch (error) {
                console.error("[ServiceTrigger] Critical error while updating system playlists:", error);
            }
        }, 10);
    }
    catch (error) {
        console.error("Update all system playlists error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to start system playlists update job",
        });
    }
};
exports.updateAllSystemPlaylists = updateAllSystemPlaylists;
const createBaseSystemPlaylist = async (req, res, next) => {
    try {
        const { name, description, privacy, basedOnMood, basedOnGenre, basedOnArtist, basedOnSongLength, basedOnReleaseTime, trackCount, } = req.body;
        const coverFile = req.file;
        if (!name) {
            res
                .status(400)
                .json({ success: false, message: "Playlist name is required." });
            return;
        }
        let finalDescription = description || "";
        const aiParams = {};
        if (basedOnMood)
            aiParams.basedOnMood = basedOnMood;
        if (basedOnGenre)
            aiParams.basedOnGenre = basedOnGenre;
        if (basedOnArtist)
            aiParams.basedOnArtist = basedOnArtist;
        if (basedOnSongLength)
            aiParams.basedOnSongLength = basedOnSongLength;
        if (basedOnReleaseTime)
            aiParams.basedOnReleaseTime = basedOnReleaseTime;
        if (trackCount)
            aiParams.trackCount = Number(trackCount);
        if (Object.keys(aiParams).length > 0) {
            finalDescription += `\n\n<!--AI_PARAMS:${JSON.stringify(aiParams)}-->`;
        }
        const playlistData = {
            name,
            description: finalDescription,
            privacy: privacy || "PUBLIC",
        };
        const playlist = await playlistService.createBaseSystemPlaylist(playlistData, coverFile);
        res.status(201).json({ success: true, data: playlist });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("already exists")) {
            res.status(400).json({ success: false, message: error.message });
        }
        else {
            (0, handle_utils_1.handleError)(res, error, "Create Base System Playlist");
        }
    }
};
exports.createBaseSystemPlaylist = createBaseSystemPlaylist;
const updateBaseSystemPlaylist = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, privacy, basedOnMood, basedOnGenre, basedOnArtist, basedOnSongLength, basedOnReleaseTime, trackCount, } = req.body;
        const coverFile = req.file;
        let finalDescription = description || "";
        const aiParams = {};
        if (basedOnMood)
            aiParams.basedOnMood = basedOnMood;
        if (basedOnGenre)
            aiParams.basedOnGenre = basedOnGenre;
        if (basedOnArtist)
            aiParams.basedOnArtist = basedOnArtist;
        if (basedOnSongLength)
            aiParams.basedOnSongLength = basedOnSongLength;
        if (basedOnReleaseTime)
            aiParams.basedOnReleaseTime = basedOnReleaseTime;
        if (trackCount)
            aiParams.trackCount = Number(trackCount);
        finalDescription = finalDescription
            .replace(/<!--AI_PARAMS:.*?-->/s, "")
            .trim();
        if (Object.keys(aiParams).length > 0) {
            finalDescription += `\n\n<!--AI_PARAMS:${JSON.stringify(aiParams)}-->`;
        }
        const updateData = {
            name,
            description: finalDescription,
            privacy,
        };
        const playlist = await playlistService.updateBaseSystemPlaylist(id, updateData, coverFile);
        res.status(200).json({ success: true, data: playlist });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("not found")) {
                res.status(404).json({ success: false, message: error.message });
            }
            else if (error.message.includes("already exists")) {
                res.status(400).json({ success: false, message: error.message });
            }
            else {
                (0, handle_utils_1.handleError)(res, error, "Update Base System Playlist");
            }
        }
        else {
            (0, handle_utils_1.handleError)(res, error, "Update Base System Playlist");
        }
    }
};
exports.updateBaseSystemPlaylist = updateBaseSystemPlaylist;
const deleteBaseSystemPlaylist = async (req, res, next) => {
    try {
        const { id } = req.params;
        await playlistService.deleteBaseSystemPlaylist(id);
        res.status(200).json({
            success: true,
            message: "Base system playlist deleted successfully.",
        });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
            res.status(404).json({ success: false, message: error.message });
        }
        else {
            (0, handle_utils_1.handleError)(res, error, "Delete Base System Playlist");
        }
    }
};
exports.deleteBaseSystemPlaylist = deleteBaseSystemPlaylist;
const getAllBaseSystemPlaylists = async (req, res, next) => {
    try {
        const result = await playlistService.getAllBaseSystemPlaylists(req);
        res.status(200).json({ success: true, ...result });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Get All Base System Playlists");
    }
};
exports.getAllBaseSystemPlaylists = getAllBaseSystemPlaylists;
const getHomePageData = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const isAuthenticated = !!userId;
        const [newestAlbums, hotAlbums, topTracks, topArtists] = await Promise.all([
            albumService.getNewestAlbums(20),
            albumService.getHotAlbums(20),
            userService.getTopTracks(),
            userService.getTopArtists(),
        ]);
        const responseData = {
            newestAlbums,
            hotAlbums,
            topTracks,
            topArtists,
            systemPlaylists: [],
        };
        if (isAuthenticated && userId) {
            try {
                const [systemPlaylists, userSystemPlaylists, userPlaylists, userTopTracks, userTopArtists, userPlayHistory,] = await Promise.all([
                    db_1.default.playlist.findMany({
                        where: {
                            type: "SYSTEM",
                            privacy: "PUBLIC",
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
                                    trackOrder: "asc",
                                },
                            },
                        },
                    }),
                    db_1.default.playlist.findMany({
                        where: {
                            userId,
                            type: "SYSTEM",
                            privacy: "PUBLIC",
                        },
                        include: {
                            _count: {
                                select: {
                                    tracks: true,
                                },
                            },
                        },
                    }),
                    db_1.default.playlist.findMany({
                        where: {
                            userId,
                            type: {
                                not: "SYSTEM",
                            },
                        },
                        include: {
                            _count: {
                                select: {
                                    tracks: true,
                                },
                            },
                        },
                    }),
                    userService.getUserTopTracks(req.user),
                    userService.getUserTopArtists(req.user),
                    userService.getPlayHistory(req.user),
                ]);
                responseData.systemPlaylists = systemPlaylists.map((playlist) => ({
                    ...playlist,
                    tracks: playlist.tracks.map((pt) => ({
                        ...pt.track,
                        trackOrder: pt.trackOrder,
                    })),
                }));
                responseData.personalizedSystemPlaylists = userSystemPlaylists.map((playlist) => ({
                    ...playlist,
                    totalTracks: playlist._count.tracks,
                }));
                responseData.userPlaylists = userPlaylists.map((playlist) => ({
                    ...playlist,
                    totalTracks: playlist._count.tracks,
                }));
                responseData.userTopTracks = userTopTracks;
                responseData.userTopArtists = userTopArtists;
                responseData.userPlayHistory = userPlayHistory;
            }
            catch (error) {
                console.error("Error fetching user playlist data:", error);
            }
        }
        res.json({
            success: true,
            data: responseData,
        });
    }
    catch (error) {
        console.error("Error in getHomePageData:", error);
        next(error);
    }
};
exports.getHomePageData = getHomePageData;
const getPlaylistSuggestions = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
            return;
        }
        const suggestions = await playlistService.getPlaylistSuggestions(req);
        if (!suggestions) {
            res.status(404).json({
                success: false,
                message: "No playlist suggestions found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: suggestions,
        });
    }
    catch (error) {
        console.error("Error fetching playlist suggestions:", error);
        next(error);
    }
};
exports.getPlaylistSuggestions = getPlaylistSuggestions;
const reorderPlaylistTracks = async (req, res, next) => {
    try {
        const { playlistId } = req.params;
        const { trackIds } = req.body;
        const userId = req.user?.id;
        const userRole = req.user?.role;
        if (!playlistId) {
            res
                .status(400)
                .json({ success: false, message: "Playlist ID is required" });
            return;
        }
        if (!Array.isArray(trackIds) || trackIds.length === 0) {
            res
                .status(400)
                .json({ success: false, message: "Track IDs array is required" });
            return;
        }
        const result = await playlistService.reorderPlaylistTracks(playlistId, trackIds, userId, userRole);
        if (result.success) {
            res.json({
                success: true,
                message: "Playlist tracks reordered successfully",
            });
        }
        else {
            res.status(result.statusCode || 400).json({
                success: false,
                message: result.message || "Failed to reorder tracks",
            });
        }
    }
    catch (error) {
        console.error("Error in reorderPlaylistTracks controller:", error);
        next(error);
    }
};
exports.reorderPlaylistTracks = reorderPlaylistTracks;
const getUserListeningStats = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const stats = await playlistService.getUserListeningStats(userId);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserListeningStats = getUserListeningStats;
const generateSystemPlaylistForUser = async (req, res, next) => {
    try {
        const adminUserId = req.user?.id;
        const { userId } = req.params;
        const { name, description, focusOnFeatures, requestedTrackCount = 20, } = req.body;
        if (!adminUserId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized: Admin access required",
            });
            return;
        }
        if (!userId) {
            res.status(400).json({
                success: false,
                message: "User ID is required to generate a system playlist.",
            });
            return;
        }
        if (!name) {
            res.status(400).json({
                success: false,
                message: "Playlist name is required.",
            });
            return;
        }
        if (name.length > 50) {
            res.status(400).json({
                success: false,
                message: "Playlist name cannot exceed 50 characters.",
            });
            return;
        }
        if (description && description.trim().length > 150) {
            res.status(400).json({
                success: false,
                message: "Playlist description cannot exceed 150 characters.",
            });
            return;
        }
        if (!focusOnFeatures ||
            !Array.isArray(focusOnFeatures) ||
            focusOnFeatures.length === 0) {
            res.status(400).json({
                success: false,
                message: "focusOnFeatures must be a non-empty array of strings.",
            });
            return;
        }
        if (typeof requestedTrackCount !== "number" ||
            requestedTrackCount < 10 ||
            requestedTrackCount > 50) {
            res.status(400).json({
                success: false,
                message: "Requested track count must be a number between 10 and 50.",
            });
            return;
        }
        const playlist = await playlistService.generateSystemPlaylistFromHistoryFeatures(userId, focusOnFeatures, requestedTrackCount, name, description);
        res.status(201).json({
            success: true,
            message: "System playlist generated successfully for user.",
            data: playlist,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message.includes("No listening history found")) {
            res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        else if (error instanceof Error &&
            error.message.includes("Insufficient data for features")) {
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
        else {
            next(error);
        }
    }
};
exports.generateSystemPlaylistForUser = generateSystemPlaylistForUser;
const deleteUserPlaylist = async (req, res, next) => {
};
exports.deleteUserPlaylist = deleteUserPlaylist;
const getPlaylistDetails = async (req, res, next) => {
    try {
        const { playlistId } = req.params;
        if (!playlistId) {
            res
                .status(400)
                .json({ success: false, message: "Playlist ID is required" });
            return;
        }
        const playlistDetails = await playlistService.getPlaylistDetailsById(playlistId);
        res.json({ success: true, data: playlistDetails });
    }
    catch (error) {
        console.error("[PlaylistController] Error in getPlaylistDetails:", error);
        next(error);
    }
};
exports.getPlaylistDetails = getPlaylistDetails;
const adminDeleteSystemPlaylist = async (req, res, next) => {
    try {
        const { playlistId } = req.params;
        if (!playlistId) {
            res
                .status(400)
                .json({ success: false, message: "Playlist ID is required" });
            return;
        }
        await playlistService.deleteUserSpecificSystemPlaylist(playlistId);
        res.status(200).json({
            success: true,
            message: "System playlist deleted successfully.",
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("not found")) {
                res.status(404).json({ success: false, message: error.message });
                return;
            }
            if (error.message.includes("not a system playlist") ||
                error.message.includes("base system playlist template")) {
                res.status(400).json({ success: false, message: error.message });
                return;
            }
        }
        next(error);
    }
};
exports.adminDeleteSystemPlaylist = adminDeleteSystemPlaylist;
//# sourceMappingURL=playlist.controller.js.map