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
exports.getHomePageData = exports.getAllBaseSystemPlaylists = exports.deleteBaseSystemPlaylist = exports.updateBaseSystemPlaylist = exports.createBaseSystemPlaylist = exports.updateAllSystemPlaylists = exports.generateAIPlaylist = exports.updateVibeRewindPlaylist = exports.getUserSystemPlaylists = exports.getSystemPlaylists = exports.deletePlaylist = exports.updatePlaylist = exports.removeTrackFromPlaylist = exports.addTrackToPlaylist = exports.getPlaylistById = exports.getPlaylists = exports.createPlaylist = exports.createFavoritePlaylist = void 0;
const playlistService = __importStar(require("../services/playlist.service"));
const albumService = __importStar(require("../services/album.service"));
const handle_utils_1 = require("../utils/handle-utils");
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../config/db"));
const createFavoritePlaylist = async (userId) => {
    try {
        await db_1.default.playlist.create({
            data: {
                name: "Favorites",
                description: "List of your favorite songs",
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
};
exports.createFavoritePlaylist = createFavoritePlaylist;
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
        if (!isSystemFilter) {
            let favoritePlaylist = await db_1.default.playlist.findFirst({
                where: {
                    userId,
                    type: "FAVORITE",
                },
            });
            if (!favoritePlaylist) {
                favoritePlaylist = await db_1.default.playlist.create({
                    data: {
                        name: "Favorites",
                        description: "List of your favorite songs",
                        privacy: "PRIVATE",
                        type: "FAVORITE",
                        userId,
                    },
                });
            }
            let vibeRewindPlaylist = await db_1.default.playlist.findFirst({
                where: {
                    userId,
                    name: "Vibe Rewind",
                },
            });
            if (!vibeRewindPlaylist) {
                vibeRewindPlaylist = await db_1.default.playlist.create({
                    data: {
                        name: "Vibe Rewind",
                        description: "Your personal time capsule - tracks you've been vibing to lately",
                        privacy: "PRIVATE",
                        type: "SYSTEM",
                        userId,
                    },
                });
                try {
                    await playlistService.updateVibeRewindPlaylist(userId);
                }
                catch (error) {
                    console.error("Error initializing Vibe Rewind playlist:", error);
                }
            }
        }
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
        });
        if (!playlistExists) {
            res.status(404).json({
                success: false,
                message: "Playlist not found",
            });
            return;
        }
        const isSystemPlaylist = playlistExists.type === "SYSTEM";
        const isFavoritePlaylist = playlistExists.type === "FAVORITE";
        const isPublicPlaylist = playlistExists.privacy === "PUBLIC";
        if (!isAuthenticated && !isPublicPlaylist && !isSystemPlaylist) {
            res.status(401).json({
                success: false,
                message: "Please log in to view this playlist",
            });
            return;
        }
        if (playlistExists.type === "NORMAL" &&
            playlistExists.name === "Vibe Rewind") {
            await playlistService.updateVibeRewindPlaylist(userId);
        }
        let playlist;
        if (isSystemPlaylist || isPublicPlaylist) {
            playlist = await db_1.default.playlist.findUnique({
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
                            trackOrder: "asc",
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
            playlist = await db_1.default.playlist.findUnique({
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
                            trackOrder: "asc",
                        },
                    },
                },
            });
        }
        else {
            if (!isAuthenticated) {
                res.status(401).json({
                    success: false,
                    message: "Please log in to view this playlist",
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
            playlist = await db_1.default.playlist.findUnique({
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
                            trackOrder: "asc",
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
            ((isSystemPlaylist && userRole === "ADMIN") ||
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
            data: {
                ...playlist,
                tracks: formattedTracks,
                canEdit,
            },
        });
    }
    catch (error) {
        console.error("Error in getPlaylistById:", error);
        next(error);
    }
};
exports.getPlaylistById = getPlaylistById;
const addTrackToPlaylist = async (req, res, next) => {
    try {
        console.log("AddToPlaylist request:", {
            params: req.params,
            body: req.body,
            user: req.user,
        });
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
        const playlist = await db_1.default.playlist.findUnique({
            where: {
                id: playlistId,
            },
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
        const updateData = {
            name,
            description,
            privacy,
        };
        if (req.file) {
            try {
                const { uploadFile } = require("../services/upload.service");
                const result = await uploadFile(req.file.buffer, "playlists/covers", "image");
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
        const result = await playlistService.getUserSystemPlaylists(req);
        res.json(result);
    }
    catch (error) {
        console.error("Error in getSystemPlaylists:", error);
        next(error);
    }
};
exports.getUserSystemPlaylists = getUserSystemPlaylists;
const updateVibeRewindPlaylist = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        await playlistService.updateVibeRewindPlaylist(user.id);
        res.status(200).json({
            success: true,
            message: "Vibe Rewind playlist updated successfully",
        });
    }
    catch (error) {
        console.error("Update Vibe Rewind playlist error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update Vibe Rewind playlist",
        });
    }
};
exports.updateVibeRewindPlaylist = updateVibeRewindPlaylist;
const generateAIPlaylist = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthorized, please login",
            });
            return;
        }
        const { name, description, trackCount, basedOnMood, basedOnGenre, basedOnArtist, basedOnSongLength, basedOnReleaseTime, } = req.body;
        const hasSpecificParams = basedOnMood || basedOnGenre || basedOnArtist || basedOnSongLength || basedOnReleaseTime;
        if (!hasSpecificParams) {
            res.status(400).json({
                success: false,
                message: "At least one parameter (mood, genre, artist, song length, or release time) is required to generate a playlist.",
            });
            return;
        }
        const playlistData = await playlistService.generateAIPlaylist(userId, {
            name,
            description,
            trackCount: trackCount ? parseInt(trackCount, 10) : undefined,
            basedOnMood,
            basedOnGenre,
            basedOnArtist,
            basedOnSongLength,
            basedOnReleaseTime,
        });
        let message = `AI playlist generated successfully with ${playlistData.totalTracks} tracks from ${playlistData.artistCount} artists`;
        res.status(200).json({
            success: true,
            message,
            data: playlistData,
        });
    }
    catch (error) {
        console.error("Error generating AI playlist:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isValidationError = errorMessage.includes("required to generate") ||
            errorMessage.includes("parameter is required");
        res.status(isValidationError ? 400 : 500).json({
            success: false,
            message: isValidationError ? errorMessage : "Failed to generate AI playlist",
            error: errorMessage,
        });
    }
};
exports.generateAIPlaylist = generateAIPlaylist;
const updateAllSystemPlaylists = async (req, res) => {
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
const createBaseSystemPlaylist = async (req, res) => {
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
const updateBaseSystemPlaylist = async (req, res) => {
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
const deleteBaseSystemPlaylist = async (req, res) => {
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
const getAllBaseSystemPlaylists = async (req, res) => {
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
        const [newestAlbums, hotAlbums] = await Promise.all([
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
                const systemPlaylists = await db_1.default.playlist.findMany({
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
                });
                responseData.systemPlaylists = systemPlaylists.map((playlist) => ({
                    ...playlist,
                    tracks: playlist.tracks.map((pt) => ({
                        ...pt.track,
                        trackOrder: pt.trackOrder,
                    })),
                }));
                const userSystemPlaylists = await db_1.default.playlist.findMany({
                    where: {
                        userId,
                        type: "SYSTEM",
                    },
                    include: {
                        _count: {
                            select: {
                                tracks: true,
                            },
                        },
                    },
                });
                const userPlaylists = await db_1.default.playlist.findMany({
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
                });
                responseData.personalizedSystemPlaylists = userSystemPlaylists.map((playlist) => ({
                    ...playlist,
                    totalTracks: playlist._count.tracks,
                }));
                responseData.userPlaylists = userPlaylists.map((playlist) => ({
                    ...playlist,
                    totalTracks: playlist._count.tracks,
                }));
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
//# sourceMappingURL=playlist.controller.js.map