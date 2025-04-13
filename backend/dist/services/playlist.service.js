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
exports.updateAllSystemPlaylists = exports.generateAIPlaylist = exports.createImprovedAIGeneratedPlaylist = exports.getUserSystemPlaylists = exports.getSystemPlaylists = exports.updateVibeRewindPlaylist = exports.getAllBaseSystemPlaylists = exports.deleteBaseSystemPlaylist = exports.updateBaseSystemPlaylist = exports.createBaseSystemPlaylist = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const handle_utils_1 = require("../utils/handle-utils");
const ai_service_1 = require("./ai.service");
const upload_service_1 = require("./upload.service");
const baseSystemPlaylistSelect = {
    id: true,
    name: true,
    description: true,
    coverUrl: true,
    privacy: true,
    type: true,
    isAIGenerated: true,
    totalTracks: true,
    totalDuration: true,
    createdAt: true,
    updatedAt: true,
};
const createBaseSystemPlaylist = async (data, coverFile) => {
    const existing = await db_1.default.playlist.findFirst({
        where: {
            name: data.name,
            type: client_1.PlaylistType.SYSTEM,
            userId: null,
        },
    });
    if (existing) {
        throw new Error(`A system playlist named "${data.name}" already exists.`);
    }
    let coverUrl = undefined;
    if (coverFile) {
        const uploadResult = await (0, upload_service_1.uploadFile)(coverFile.buffer, "playlists/covers");
        coverUrl = uploadResult.secure_url;
    }
    return db_1.default.playlist.create({
        data: {
            ...data,
            coverUrl,
            type: client_1.PlaylistType.SYSTEM,
            isAIGenerated: true,
            userId: null,
        },
        select: baseSystemPlaylistSelect,
    });
};
exports.createBaseSystemPlaylist = createBaseSystemPlaylist;
const updateBaseSystemPlaylist = async (playlistId, data, coverFile) => {
    const playlist = await db_1.default.playlist.findUnique({
        where: { id: playlistId },
        select: { type: true, userId: true, name: true },
    });
    if (!playlist ||
        playlist.type !== client_1.PlaylistType.SYSTEM ||
        playlist.userId !== null) {
        throw new Error("Base system playlist not found.");
    }
    if (data.name && data.name !== playlist.name) {
        const existing = await db_1.default.playlist.findFirst({
            where: {
                name: data.name,
                type: client_1.PlaylistType.SYSTEM,
                userId: null,
                id: { not: playlistId },
            },
        });
        if (existing) {
            throw new Error(`Another system playlist named "${data.name}" already exists.`);
        }
    }
    let coverUrl = undefined;
    if (coverFile) {
        const uploadResult = await (0, upload_service_1.uploadFile)(coverFile.buffer, "playlists/covers");
        coverUrl = uploadResult.secure_url;
    }
    return db_1.default.playlist.update({
        where: { id: playlistId },
        data: {
            ...data,
            ...(coverUrl && { coverUrl }),
            type: client_1.PlaylistType.SYSTEM,
            userId: null,
            isAIGenerated: true,
        },
        select: baseSystemPlaylistSelect,
    });
};
exports.updateBaseSystemPlaylist = updateBaseSystemPlaylist;
const deleteBaseSystemPlaylist = async (playlistId) => {
    const playlist = await db_1.default.playlist.findUnique({
        where: { id: playlistId },
        select: { type: true, userId: true, name: true },
    });
    if (!playlist ||
        playlist.type !== client_1.PlaylistType.SYSTEM ||
        playlist.userId !== null) {
        throw new Error("Base system playlist not found.");
    }
    await db_1.default.playlist.deleteMany({
        where: {
            name: playlist.name,
            type: client_1.PlaylistType.SYSTEM,
            userId: { not: null },
        },
    });
    return db_1.default.playlist.delete({
        where: { id: playlistId },
    });
};
exports.deleteBaseSystemPlaylist = deleteBaseSystemPlaylist;
const getAllBaseSystemPlaylists = async (req) => {
    const { search } = req.query;
    const whereClause = {
        type: client_1.PlaylistType.SYSTEM,
        userId: null,
    };
    if (search && typeof search === "string") {
        whereClause.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
        ];
    }
    const result = await (0, handle_utils_1.paginate)(db_1.default.playlist, req, {
        where: whereClause,
        select: baseSystemPlaylistSelect,
        orderBy: { createdAt: "desc" },
    });
    result.data = result.data.map((playlist) => {
        const parsedPlaylist = { ...playlist };
        if (parsedPlaylist.description &&
            parsedPlaylist.description.includes("<!--AI_PARAMS:")) {
            const match = parsedPlaylist.description.match(/<!--AI_PARAMS:(.*?)-->/s);
            if (match && match[1]) {
                try {
                    const aiParams = JSON.parse(match[1]);
                    Object.assign(parsedPlaylist, aiParams);
                    parsedPlaylist.description = parsedPlaylist.description
                        .replace(/\n\n<!--AI_PARAMS:.*?-->/s, "")
                        .trim();
                }
                catch (e) {
                    console.error("Error parsing AI parameters:", e);
                }
            }
        }
        return parsedPlaylist;
    });
    return result;
};
exports.getAllBaseSystemPlaylists = getAllBaseSystemPlaylists;
const updateVibeRewindPlaylist = async (userId) => {
    try {
        const userHistory = await db_1.default.history.findMany({
            where: {
                userId,
                type: "PLAY",
            },
            include: {
                track: {
                    include: {
                        genres: {
                            include: {
                                genre: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
            take: 30,
        });
        if (userHistory.length === 0) {
            console.log(`[PlaylistService] User ${userId} has no listening history. Skipping Vibe Rewind playlist creation.`);
            return;
        }
        const moodAndGenreContext = {
            tracks: userHistory.map((h) => ({
                title: h.track?.title,
                genres: h.track?.genres.map((g) => g.genre.name),
                playCount: h.playCount,
            })),
        };
        const analysisPrompt = `Phân tích lịch sử nghe nhạc của người dùng và trả về:
    1. Tâm trạng phổ biến nhất (mood): happy, sad, energetic, calm, nostalgic, romantic, focused, party
    2. Top 3 thể loại nhạc được nghe nhiều nhất (genres)
    
    Trả về dưới dạng JSON với format:
    {
      "mood": "tâm_trạng",
      "genres": ["thể_loại_1", "thể_loại_2", "thể_loại_3"]
    }
    
    Lịch sử nghe nhạc:
    ${JSON.stringify(moodAndGenreContext, null, 2)}`;
        const result = await ai_service_1.model.generateContent({
            contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
        });
        const responseText = result.response.text();
        const cleanedResponse = responseText
            .replace(/```json|```/g, "")
            .trim();
        let analysis;
        try {
            analysis = JSON.parse(cleanedResponse);
        }
        catch (error) {
            console.error("[PlaylistService] Error parsing AI response:", error);
            console.error("[PlaylistService] Raw response:", responseText);
            throw new Error("Failed to parse AI analysis response");
        }
        const detectedMood = analysis.mood;
        const preferredGenres = analysis.genres;
        console.log(`[PlaylistService] Detected user mood: ${detectedMood}`);
        console.log(`[PlaylistService] User's preferred genres: ${preferredGenres.join(", ")}`);
        let vibeRewindPlaylist = await db_1.default.playlist.findFirst({
            where: { userId, name: "Vibe Rewind" },
        });
        if (!vibeRewindPlaylist) {
            console.log(`[PlaylistService] Creating new Vibe Rewind playlist for user ${userId}...`);
            vibeRewindPlaylist = await db_1.default.playlist.create({
                data: {
                    name: "Vibe Rewind",
                    description: "Your personal time capsule - tracks you've been vibing to lately",
                    privacy: "PRIVATE",
                    type: "SYSTEM",
                    userId,
                    coverUrl: null,
                },
            });
        }
        const playlist = await (0, ai_service_1.createAIGeneratedPlaylist)(userId, {
            name: "Vibe Rewind",
            description: `Your personal time capsule - tracks matching your ${detectedMood} mood and favorite genres: ${preferredGenres.join(", ")}`,
            trackCount: 10,
            basedOnMood: detectedMood,
            basedOnGenre: preferredGenres[0],
            coverUrl: null,
        });
        console.log(`[PlaylistService] Successfully updated Vibe Rewind playlist for user ${userId} with ${playlist.totalTracks} tracks based on ${detectedMood} mood and favorite genres: ${preferredGenres.join(", ")}`);
    }
    catch (error) {
        console.error(`[PlaylistService] Error updating Vibe Rewind playlist for user ${userId}:`, error);
        throw error;
    }
};
exports.updateVibeRewindPlaylist = updateVibeRewindPlaylist;
const getSystemPlaylists = async (req) => {
    const { search, sortBy, sortOrder } = req.query;
    const whereClause = {
        type: "SYSTEM",
    };
    if (search && typeof search === "string") {
        whereClause.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
        ];
    }
    const orderByClause = {};
    if (sortBy &&
        typeof sortBy === "string" &&
        (sortOrder === "asc" || sortOrder === "desc")) {
        if (sortBy === "name" ||
            sortBy === "type" ||
            sortBy === "createdAt" ||
            sortBy === "updatedAt" ||
            sortBy === "totalTracks") {
            orderByClause[sortBy] = sortOrder;
        }
        else {
            orderByClause.createdAt = "desc";
        }
    }
    else {
        orderByClause.createdAt = "desc";
    }
    const result = await (0, handle_utils_1.paginate)(db_1.default.playlist, req, {
        where: whereClause,
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
            user: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: orderByClause,
    });
    const formattedPlaylists = result.data.map((playlist) => {
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
        };
    });
    return {
        data: formattedPlaylists,
        pagination: result.pagination,
    };
};
exports.getSystemPlaylists = getSystemPlaylists;
const getUserSystemPlaylists = async (req) => {
    const { search, sortBy, sortOrder } = req.query;
    const whereClause = {
        type: "SYSTEM",
        userId: req.user?.id,
    };
    if (search && typeof search === "string") {
        whereClause.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
        ];
    }
    const result = await (0, handle_utils_1.paginate)(db_1.default.playlist, req, {
        where: whereClause,
        include: {
            tracks: {
                include: {
                    track: {
                        include: {
                            artist: true,
                            album: true,
                            genres: {
                                include: {
                                    genre: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    trackOrder: "asc",
                },
            },
            user: {
                select: { id: true, name: true, email: true },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    const formattedPlaylists = result.data.map((playlist) => {
        const formattedTracks = playlist.tracks.map((pt) => ({
            id: pt.track.id,
            title: pt.track.title,
            audioUrl: pt.track.audioUrl,
            duration: pt.track.duration,
            coverUrl: pt.track.coverUrl,
            artist: pt.track.artist,
            album: pt.track.album,
            genres: pt.track.genres,
            createdAt: pt.track.createdAt.toISOString(),
        }));
        return {
            ...playlist,
            tracks: formattedTracks,
        };
    });
    return formattedPlaylists;
};
exports.getUserSystemPlaylists = getUserSystemPlaylists;
const createImprovedAIGeneratedPlaylist = async (userId, options) => {
    console.log(`[PlaylistService] Creating AI playlist for user ${userId} with options:`, options);
    try {
        const { createAIGeneratedPlaylist } = await Promise.resolve().then(() => __importStar(require("./ai.service")));
        const playlistData = await createAIGeneratedPlaylist(userId, {
            ...options,
            trackCount: options.trackCount || 10,
        });
        return playlistData;
    }
    catch (error) {
        console.error(`[PlaylistService] Error creating AI playlist: ${error}`);
        throw error;
    }
};
exports.createImprovedAIGeneratedPlaylist = createImprovedAIGeneratedPlaylist;
const generateAIPlaylist = async (userId, options) => {
    console.log(`[PlaylistService] Generating AI playlist for user ${userId} with options:`, options);
    if (!options.basedOnMood && !options.basedOnGenre && !options.basedOnArtist) {
        console.log(`[PlaylistService] No specific parameters provided. Analyzing all Vibe Rewind playlists for trends.`);
        try {
            const { analyzeAllVibeRewindPlaylists } = await Promise.resolve().then(() => __importStar(require("./ai.service")));
            const analysis = await analyzeAllVibeRewindPlaylists();
            options = {
                ...options,
                basedOnMood: analysis.mood,
                basedOnGenre: analysis.genres[0],
                description: options.description ||
                    `A curated playlist based on the most popular ${analysis.mood} mood and ${analysis.genres.join(", ")} genres from our community.`,
                name: options.name || `Community ${analysis.mood} Vibes`,
            };
            console.log(`[PlaylistService] Using community trends: mood=${analysis.mood}, genres=${analysis.genres.join(", ")}`);
        }
        catch (error) {
            console.error(`[PlaylistService] Error analyzing Vibe Rewind playlists:`, error);
        }
    }
    const playlist = await (0, exports.createImprovedAIGeneratedPlaylist)(userId, options);
    const playlistWithTracks = await db_1.default.playlist.findUnique({
        where: { id: playlist.id },
        include: {
            tracks: {
                include: {
                    track: {
                        include: {
                            artist: {
                                select: {
                                    id: true,
                                    artistName: true,
                                    avatar: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    trackOrder: "asc",
                },
            },
        },
    });
    if (!playlistWithTracks) {
        throw new Error("Failed to retrieve created playlist details");
    }
    const artistsInPlaylist = new Set();
    playlistWithTracks.tracks.forEach((pt) => {
        if (pt.track.artist) {
            artistsInPlaylist.add(pt.track.artist.artistName);
        }
    });
    return {
        ...playlist,
        artistCount: artistsInPlaylist.size,
        previewTracks: playlistWithTracks.tracks.slice(0, 3).map((pt) => ({
            id: pt.track.id,
            title: pt.track.title,
            artist: pt.track.artist?.artistName,
        })),
        totalTracks: playlistWithTracks.tracks.length,
    };
};
exports.generateAIPlaylist = generateAIPlaylist;
const updateAllSystemPlaylists = async () => {
    try {
        const users = await db_1.default.user.findMany({
            where: { isActive: true },
            select: { id: true },
        });
        const baseSystemPlaylists = await db_1.default.playlist.findMany({
            where: { type: "SYSTEM", userId: null },
            select: { name: true },
        });
        if (baseSystemPlaylists.length === 0) {
            console.log("[PlaylistService] No base system playlists found to update.");
            return { success: true, errors: [] };
        }
        console.log(`[PlaylistService] Updating ${baseSystemPlaylists.length} system playlists for ${users.length} users...`);
        const errors = [];
        const updatePromises = users.flatMap((user) => baseSystemPlaylists.map((playlistTemplate) => (async () => {
            try {
                const templatePlaylist = await db_1.default.playlist.findFirst({
                    where: {
                        name: playlistTemplate.name,
                        type: "SYSTEM",
                        userId: null,
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        coverUrl: true,
                        privacy: true,
                    },
                });
                if (!templatePlaylist) {
                    throw new Error(`Base template "${playlistTemplate.name}" not found.`);
                }
                let aiOptions = {};
                if (templatePlaylist.description &&
                    templatePlaylist.description.includes("<!--AI_PARAMS:")) {
                    const match = templatePlaylist.description.match(/<!--AI_PARAMS:(.*?)-->/s);
                    if (match && match[1]) {
                        try {
                            aiOptions = JSON.parse(match[1]);
                            templatePlaylist.description = templatePlaylist.description
                                .replace(/\n\n<!--AI_PARAMS:.*?-->/s, "")
                                .trim();
                        }
                        catch (e) {
                            console.error(`[PlaylistService] Error parsing AI params for template ${templatePlaylist.name}:`, e);
                        }
                    }
                }
                const coverUrl = templatePlaylist.coverUrl ||
                    "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png";
                await (0, exports.createImprovedAIGeneratedPlaylist)(user.id, {
                    name: templatePlaylist.name,
                    description: templatePlaylist.description || undefined,
                    coverUrl: coverUrl,
                    ...aiOptions,
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[PlaylistService] Error updating ${playlistTemplate.name} for user ${user.id}: ${errorMessage}`);
                errors.push({
                    userId: user.id,
                    playlistName: playlistTemplate.name,
                    error: errorMessage,
                });
            }
        })()));
        await Promise.allSettled(updatePromises);
        if (errors.length === 0) {
            console.log(`[PlaylistService] Successfully finished updating all system playlists.`);
            return { success: true, errors: [] };
        }
        else {
            console.warn(`[PlaylistService] Finished updating system playlists with ${errors.length} errors.`);
            return { success: false, errors };
        }
    }
    catch (error) {
        console.error("[PlaylistService] Critical error during updateAllSystemPlaylists:", error);
        return {
            success: false,
            errors: [
                { global: error instanceof Error ? error.message : String(error) },
            ],
        };
    }
};
exports.updateAllSystemPlaylists = updateAllSystemPlaylists;
//# sourceMappingURL=playlist.service.js.map