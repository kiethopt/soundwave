"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderPlaylistTracks = exports.getPlaylistSuggestions = exports.updateAllSystemPlaylists = exports.generateAIPlaylist = exports.getUserSystemPlaylists = exports.getSystemPlaylists = exports.getAllBaseSystemPlaylists = exports.deleteBaseSystemPlaylist = exports.updateBaseSystemPlaylist = exports.createBaseSystemPlaylist = void 0;
exports.updateVibeRewindPlaylist = updateVibeRewindPlaylist;
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
    let aiParams = {};
    if (data.description && data.description.includes("<!--AI_PARAMS:")) {
        const match = data.description.match(/<!--AI_PARAMS:(.*?)-->/s);
        if (match && match[1]) {
            try {
                aiParams = JSON.parse(match[1]);
            }
            catch (e) {
                throw new Error(`Invalid AI parameters format: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    }
    const { basedOnMood, basedOnGenre, basedOnArtist, basedOnSongLength, basedOnReleaseTime, } = aiParams;
    if (!basedOnMood &&
        !basedOnGenre &&
        !basedOnArtist &&
        !basedOnSongLength &&
        !basedOnReleaseTime) {
        throw new Error("At least one AI parameter (mood, genre, artist, song length, or release time) is required to create a base system playlist.");
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
        select: { type: true, userId: true, name: true, description: true },
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
    let aiParams = {};
    const descriptionToCheck = data.description || playlist.description || "";
    if (descriptionToCheck.includes("<!--AI_PARAMS:")) {
        const match = descriptionToCheck.match(/<!--AI_PARAMS:(.*?)-->/s);
        if (match && match[1]) {
            try {
                aiParams = JSON.parse(match[1]);
            }
            catch (e) {
                throw new Error(`Invalid AI parameters format: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    }
    const { basedOnMood, basedOnGenre, basedOnArtist, basedOnSongLength, basedOnReleaseTime, } = aiParams;
    if (!basedOnMood &&
        !basedOnGenre &&
        !basedOnArtist &&
        !basedOnSongLength &&
        !basedOnReleaseTime) {
        throw new Error("At least one AI parameter (mood, genre, artist, song length, or release time) is required for a base system playlist.");
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
        return {
            ...parsedPlaylist,
            id: parsedPlaylist.id || "",
            name: parsedPlaylist.name || "",
            description: parsedPlaylist.description || "",
            coverUrl: parsedPlaylist.coverUrl || null,
            privacy: parsedPlaylist.privacy || "PUBLIC",
            type: parsedPlaylist.type || client_1.PlaylistType.SYSTEM,
            isAIGenerated: parsedPlaylist.isAIGenerated || false,
            totalTracks: parsedPlaylist.totalTracks || 0,
            totalDuration: parsedPlaylist.totalDuration || 0,
            createdAt: parsedPlaylist.createdAt || new Date(),
            updatedAt: parsedPlaylist.updatedAt || new Date(),
            basedOnMood: parsedPlaylist.basedOnMood || null,
            basedOnGenre: parsedPlaylist.basedOnGenre || null,
            basedOnArtist: parsedPlaylist.basedOnArtist || null,
            basedOnSongLength: parsedPlaylist.basedOnSongLength || null,
            basedOnReleaseTime: parsedPlaylist.basedOnReleaseTime || null,
            trackCount: parsedPlaylist.trackCount || 10,
        };
    });
    return result;
};
exports.getAllBaseSystemPlaylists = getAllBaseSystemPlaylists;
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
            genres: pt.track.genres,
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
const generateAIPlaylist = async (userId, options) => {
    console.log(`[PlaylistService] Generating AI playlist for user ${userId} with options:`, options);
    try {
        const playlist = await (0, ai_service_1.createAIGeneratedPlaylist)(userId, options);
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
    }
    catch (error) {
        console.error(`[PlaylistService] Error in generateAIPlaylist:`, error);
        throw error;
    }
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
            select: { name: true, description: true },
        });
        if (baseSystemPlaylists.length === 0) {
            console.log("[PlaylistService] No base system playlists found to update.");
            return { success: true, errors: [] };
        }
        console.log(`[PlaylistService] Updating ${baseSystemPlaylists.length} system playlists for ${users.length} users...`);
        const errors = [];
        const updatePromises = users.flatMap((user) => baseSystemPlaylists.map(async (playlistTemplate) => {
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
                const hasMoodParam = !!aiOptions.basedOnMood;
                const hasGenreParam = !!aiOptions.basedOnGenre;
                const hasArtistParam = !!aiOptions.basedOnArtist;
                const hasSongLengthParam = !!aiOptions.basedOnSongLength;
                const hasReleaseTimeParam = !!aiOptions.basedOnReleaseTime;
                const hasAnyParam = hasMoodParam ||
                    hasGenreParam ||
                    hasArtistParam ||
                    hasSongLengthParam ||
                    hasReleaseTimeParam;
                if (!hasAnyParam) {
                    const userHistory = await db_1.default.history.findMany({
                        where: {
                            userId: user.id,
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
                        take: 50,
                    });
                    if (userHistory.length > 0) {
                        const genreCounts = {};
                        userHistory.forEach((history) => {
                            if (history.track) {
                                history.track.genres.forEach((genreRel) => {
                                    const genreName = genreRel.genre.name;
                                    genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
                                });
                            }
                        });
                        if (Object.keys(genreCounts).length > 0) {
                            const topGenre = Object.entries(genreCounts)
                                .sort(([, a], [, b]) => b - a)
                                .map(([genre]) => genre)[0];
                            aiOptions.basedOnGenre = topGenre;
                            console.log(`[PlaylistService] Adding default genre parameter for user ${user.id}: ${topGenre}`);
                        }
                        else {
                            aiOptions.basedOnMood = "energetic";
                            console.log(`[PlaylistService] Adding default mood parameter for user ${user.id}: energetic`);
                        }
                    }
                    else {
                        aiOptions.basedOnMood = "energetic";
                        console.log(`[PlaylistService] No history found. Adding default mood parameter for user ${user.id}: energetic`);
                    }
                }
                const coverUrl = templatePlaylist.coverUrl ||
                    "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png";
                await (0, ai_service_1.createAIGeneratedPlaylist)(user.id, {
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
        }));
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
const getPlaylistSuggestions = async (req) => {
    const user = req.user;
    if (!user)
        throw new Error("Unauthorized");
    const { playlistId } = req.query;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let existingTrackIds = new Set();
    if (playlistId && typeof playlistId === "string") {
        try {
            const playlist = await db_1.default.playlist.findUnique({
                where: { id: playlistId },
                include: {
                    tracks: {
                        select: { trackId: true },
                    },
                },
            });
            if (playlist) {
                existingTrackIds = new Set(playlist.tracks.map((track) => track.trackId));
            }
        }
        catch (error) {
            console.error("Error fetching playlist tracks:", error);
        }
    }
    const userHistory = await db_1.default.history.findMany({
        where: {
            userId: user.id,
            type: "PLAY",
            createdAt: { gte: thirtyDaysAgo },
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
        take: 50,
    });
    if (userHistory.length === 0) {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const [popularTracks, newReleasedTracks] = await Promise.all([
            db_1.default.track.findMany({
                where: {
                    isActive: true,
                    id: {
                        notIn: Array.from(existingTrackIds),
                    },
                },
                orderBy: { playCount: "desc" },
                take: 20,
                include: {
                    artist: true,
                    album: true,
                    genres: {
                        include: {
                            genre: true,
                        },
                    },
                },
            }),
            db_1.default.track.findMany({
                where: {
                    isActive: true,
                    createdAt: { gte: threeMonthsAgo },
                    id: {
                        notIn: Array.from(existingTrackIds),
                    },
                },
                orderBy: { createdAt: "desc" },
                take: 20,
                include: {
                    artist: true,
                    album: true,
                    genres: {
                        include: {
                            genre: true,
                        },
                    },
                },
            }),
        ]);
        const combinedTracks = [...popularTracks, ...newReleasedTracks]
            .filter((track, index, self) => index === self.findIndex((t) => t.id === track.id))
            .sort(() => Math.random() - 0.5)
            .slice(0, 20);
        return {
            message: "Recommendations based on popular and new releases",
            tracks: combinedTracks,
            basedOn: "discovery",
        };
    }
    const genreCounts = {};
    userHistory.forEach((history) => {
        if (history.track) {
            history.track.genres.forEach((genreRel) => {
                const genreId = genreRel.genre.id;
                const genreName = genreRel.genre.name;
                if (!genreCounts[genreName]) {
                    genreCounts[genreName] = { count: 0, id: genreId };
                }
                genreCounts[genreName].count += 1;
            });
        }
    });
    const topGenres = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 3)
        .map(([name, data]) => ({
        name,
        id: data.id,
        count: data.count,
    }));
    if (topGenres.length === 0) {
        const popularTracks = await db_1.default.track.findMany({
            where: {
                isActive: true,
                id: {
                    notIn: Array.from(existingTrackIds),
                },
            },
            orderBy: { playCount: "desc" },
            take: 20,
            include: {
                artist: true,
                album: true,
                genres: {
                    include: {
                        genre: true,
                    },
                },
            },
        });
        return {
            message: "Recommendations based on popular tracks",
            tracks: popularTracks,
            basedOn: "popular",
        };
    }
    const userTrackIds = userHistory
        .filter((history) => history.track)
        .map((history) => history.track.id);
    const excludeTrackIds = [
        ...new Set([...userTrackIds, ...Array.from(existingTrackIds)]),
    ];
    const recommendedTracks = await db_1.default.track.findMany({
        where: {
            isActive: true,
            id: {
                notIn: excludeTrackIds,
            },
            genres: {
                some: {
                    genreId: {
                        in: topGenres.map((genre) => genre.id),
                    },
                },
            },
        },
        orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
        take: 40,
        include: {
            artist: true,
            album: true,
            genres: {
                include: {
                    genre: true,
                },
            },
        },
    });
    recommendedTracks.sort(() => Math.random() - 0.5);
    const limitedRecommendedTracks = recommendedTracks.slice(0, 20);
    return {
        message: `Recommendations based on your top genres: ${topGenres
            .map((g) => g.name)
            .join(", ")}`,
        tracks: limitedRecommendedTracks,
        basedOn: "genres",
        topGenres: topGenres,
    };
};
exports.getPlaylistSuggestions = getPlaylistSuggestions;
const reorderPlaylistTracks = async (playlistId, orderedTrackIds, requestingUserId, requestingUserRole) => {
    try {
        const playlist = await db_1.default.playlist.findUnique({
            where: { id: playlistId },
            select: { userId: true, type: true },
        });
        if (!playlist) {
            return { success: false, message: "Playlist not found", statusCode: 404 };
        }
        const isOwner = playlist.userId === requestingUserId;
        const isAdmin = requestingUserRole === client_1.Role.ADMIN;
        if (!(playlist.type === "NORMAL" && isOwner) && !isAdmin) {
            return {
                success: false,
                message: "You do not have permission to reorder tracks in this playlist",
                statusCode: 403,
            };
        }
        await db_1.default.$transaction(async (tx) => {
            const existingTracks = await tx.playlistTrack.findMany({
                where: {
                    playlistId: playlistId,
                    trackId: { in: orderedTrackIds },
                },
                select: { trackId: true },
            });
            const existingTrackIdSet = new Set(existingTracks.map((pt) => pt.trackId));
            if (existingTrackIdSet.size !== orderedTrackIds.length) {
                const missingIds = orderedTrackIds.filter((id) => !existingTrackIdSet.has(id));
                console.error(`Attempted to reorder playlist ${playlistId} with invalid/missing track IDs:`, missingIds);
                throw new Error(`Invalid or missing track IDs provided for playlist ${playlistId}.`);
            }
            const updateOperations = orderedTrackIds.map((trackId, index) => {
                return tx.playlistTrack.updateMany({
                    where: {
                        playlistId: playlistId,
                        trackId: trackId,
                    },
                    data: {
                        trackOrder: index,
                    },
                });
            });
            await Promise.all(updateOperations);
        });
        console.log(`[PlaylistService] Successfully reordered tracks for playlist ${playlistId}`);
        return { success: true };
    }
    catch (error) {
        console.error(`[PlaylistService] Error reordering tracks for playlist ${playlistId}:`, error);
        const errorMessage = error instanceof Error
            ? error.message
            : "Failed to reorder tracks due to an internal error";
        const isValidationError = errorMessage.includes("Invalid or missing track IDs");
        return {
            success: false,
            message: errorMessage,
            statusCode: isValidationError ? 400 : 500,
        };
    }
};
exports.reorderPlaylistTracks = reorderPlaylistTracks;
function updateVibeRewindPlaylist(userId) {
    throw new Error('Function not implemented.');
}
//# sourceMappingURL=playlist.service.js.map