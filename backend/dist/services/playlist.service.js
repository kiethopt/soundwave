"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlaylistDetailsById = exports.getUserListeningStats = exports.reorderPlaylistTracks = exports.getPlaylistSuggestions = exports.updateAllSystemPlaylists = exports.generateSystemPlaylistFromHistoryFeatures = exports.getUserSystemPlaylists = exports.getSystemPlaylists = exports.getAllBaseSystemPlaylists = exports.deleteUserSpecificSystemPlaylist = exports.deleteBaseSystemPlaylist = exports.updateBaseSystemPlaylist = exports.createBaseSystemPlaylist = void 0;
exports.updateVibeRewindPlaylist = updateVibeRewindPlaylist;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const handle_utils_1 = require("../utils/handle-utils");
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
const deleteUserSpecificSystemPlaylist = async (playlistId) => {
    const playlist = await db_1.default.playlist.findUnique({
        where: { id: playlistId },
        select: { type: true, userId: true },
    });
    if (!playlist) {
        throw new Error("Playlist not found.");
    }
    if (playlist.type !== client_1.PlaylistType.SYSTEM) {
        throw new Error("Playlist is not a system playlist.");
    }
    if (!playlist.userId) {
        throw new Error("This is a base system playlist template. Use deleteBaseSystemPlaylist to delete it.");
    }
    return db_1.default.playlist.delete({
        where: { id: playlistId },
    });
};
exports.deleteUserSpecificSystemPlaylist = deleteUserSpecificSystemPlaylist;
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
        privacy: "PUBLIC",
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
const getUserSystemPlaylists = async (req, targetUserId) => {
    const { search, sortBy, sortOrder, page, limit } = req.query;
    const whereClause = {
        type: "SYSTEM",
        userId: targetUserId,
    };
    if (search && typeof search === "string") {
        whereClause.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
        ];
    }
    const validSortKeys = [
        "name",
        "createdAt",
        "updatedAt",
        "totalTracks",
        "privacy",
    ];
    const orderBy = {};
    if (typeof sortBy === "string" &&
        validSortKeys.includes(sortBy) &&
        (sortOrder === "asc" || sortOrder === "desc")) {
        orderBy[sortBy] =
            sortOrder;
    }
    else {
        orderBy.createdAt = "desc";
    }
    const result = await (0, handle_utils_1.paginate)(db_1.default.playlist, req, {
        where: whereClause,
        include: {
            tracks: {
                select: {
                    track: {
                        select: {
                            id: true,
                            title: true,
                            coverUrl: true,
                            artist: { select: { artistName: true } },
                        },
                    },
                    trackOrder: true,
                },
                orderBy: {
                    trackOrder: "asc",
                },
                take: 3,
            },
            _count: {
                select: { tracks: true },
            },
        },
        orderBy: orderBy,
    });
    const formattedPlaylists = result.data.map((playlist) => {
        const previewTracks = playlist.tracks.map((pt) => {
            return {
                id: pt.track.id,
                title: pt.track.title,
                coverUrl: pt.track.coverUrl,
                artistName: pt.track.artist?.artistName || "Unknown Artist",
            };
        });
        return {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            coverUrl: playlist.coverUrl,
            privacy: playlist.privacy,
            type: playlist.type,
            isAIGenerated: playlist.isAIGenerated,
            createdAt: playlist.createdAt,
            updatedAt: playlist.updatedAt,
            userId: playlist.userId,
            lastGeneratedAt: playlist.lastGeneratedAt,
            totalTracks: playlist._count?.tracks ?? 0,
            tracks: previewTracks,
        };
    });
    return {
        data: formattedPlaylists,
        pagination: result.pagination,
    };
};
exports.getUserSystemPlaylists = getUserSystemPlaylists;
const convertAiOptionsToKeywords = (aiOptions) => {
    if (!aiOptions || typeof aiOptions !== "object")
        return "";
    const keywords = [];
    if (aiOptions.basedOnMood)
        keywords.push(`mood: ${aiOptions.basedOnMood}`);
    if (aiOptions.basedOnGenre)
        keywords.push(`genre: ${aiOptions.basedOnGenre}`);
    if (aiOptions.basedOnArtist)
        keywords.push(`artist: ${aiOptions.basedOnArtist}`);
    if (aiOptions.basedOnSongLength)
        keywords.push(`song length: ${aiOptions.basedOnSongLength}`);
    if (aiOptions.basedOnReleaseTime)
        keywords.push(`release time: ${aiOptions.basedOnReleaseTime}`);
    return keywords.join(", ");
};
const generateSystemPlaylistFromHistoryFeatures = async (userId, focusOnFeatures, requestedTrackCount, customName, customDescription) => {
    const user = await db_1.default.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new Error("User not found");
    }
    const historyItems = await db_1.default.history.findMany({
        where: {
            userId: userId,
            trackId: { not: null },
            createdAt: {
                gte: new Date(new Date().setDate(new Date().getDate() - 90)),
            },
        },
        include: {
            track: {
                select: {
                    id: true,
                    title: true,
                    mood: true,
                    key: true,
                    scale: true,
                    tempo: true,
                    energy: true,
                    danceability: true,
                    genres: { include: { genre: { select: { name: true } } } },
                    artist: { select: { artistName: true } },
                    album: { select: { title: true } },
                    duration: true,
                    audioUrl: true,
                    coverUrl: true,
                },
            },
        },
        take: 200,
        orderBy: {
            createdAt: "desc",
        },
    });
    if (historyItems.length === 0) {
        const randomOffset = Math.floor(Math.random() * 20);
        const randomGenreFilter = Math.random() > 0.5;
        let genreFilter = {};
        if (randomGenreFilter) {
            const popularGenres = await db_1.default.genre.findMany({
                take: 5,
                orderBy: {
                    tracks: { _count: "desc" }
                },
                select: { id: true }
            });
            if (popularGenres.length > 0) {
                const selectedGenres = popularGenres
                    .sort(() => 0.5 - Math.random())
                    .slice(0, Math.ceil(Math.random() * 3));
                if (selectedGenres.length > 0) {
                    genreFilter = {
                        genres: {
                            some: {
                                genreId: { in: selectedGenres.map(g => g.id) }
                            }
                        }
                    };
                }
            }
        }
        const orderCriteria = Math.random() > 0.3
            ? [{ playCount: "desc" }, { createdAt: "desc" }]
            : Math.random() > 0.5
                ? [{ createdAt: "desc" }, { playCount: "desc" }]
                : [{ playCount: "desc" }, { releaseDate: "desc" }];
        const topTracks = await db_1.default.track.findMany({
            where: {
                isActive: true,
                ...genreFilter
            },
            orderBy: orderCriteria,
            skip: randomOffset,
            take: requestedTrackCount + 5,
            select: {
                id: true,
                title: true,
                duration: true,
                coverUrl: true,
                audioUrl: true,
                artist: { select: { id: true, artistName: true, avatar: true } },
                album: { select: { id: true, title: true } },
            },
        });
        const shuffledTracks = topTracks
            .sort(() => 0.5 - Math.random())
            .slice(0, requestedTrackCount);
        if (shuffledTracks.length === 0) {
            throw new Error("No tracks available to generate playlist.");
        }
        const playlistName = customName
            ? customName.substring(0, 50)
            : `Popular Mix for ${userId.substring(0, 8)}`;
        const playlistDescription = customDescription
            ? customDescription.substring(0, 150)
            : `A playlist of popular tracks for user ${userId}.`;
        const newPlaylist = await db_1.default.playlist.create({
            data: {
                name: playlistName,
                description: playlistDescription,
                userId: userId,
                type: client_1.PlaylistType.SYSTEM,
                privacy: client_1.PlaylistPrivacy.PUBLIC,
                isAIGenerated: false,
                tracks: {
                    create: shuffledTracks.map((track, index) => ({
                        trackId: track.id,
                        trackOrder: index,
                    })),
                },
                totalTracks: shuffledTracks.length,
                totalDuration: shuffledTracks.reduce((sum, track) => sum + (track.duration || 0), 0),
            },
            include: {
                tracks: { include: { track: { include: { artist: true } } } },
                user: { select: { id: true, name: true } },
            },
        });
        return newPlaylist;
    }
    let filterCriteria = { isActive: true };
    const dominantFeatures = {};
    const getTopN = (counts, n = 1) => Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, n)
        .map(([name]) => name);
    if (focusOnFeatures.includes("mood")) {
        const moodCounts = {};
        historyItems.forEach((item) => {
            const mood = item.track?.mood;
            if (mood && typeof mood === "string")
                moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        });
        if (Object.keys(moodCounts).length > 0) {
            dominantFeatures.moods = getTopN(moodCounts, 2);
            filterCriteria.mood = { in: dominantFeatures.moods };
        }
    }
    if (focusOnFeatures.includes("genres")) {
        const genreCounts = {};
        historyItems.forEach((item) => item.track?.genres?.forEach((g) => {
            if (g.genre?.name)
                genreCounts[g.genre.name] = (genreCounts[g.genre.name] || 0) + 1;
        }));
        if (Object.keys(genreCounts).length > 0) {
            dominantFeatures.genres = getTopN(genreCounts, 3);
            filterCriteria.genres = {
                some: { genre: { name: { in: dominantFeatures.genres } } },
            };
        }
    }
    if (focusOnFeatures.includes("artist")) {
        const artistCounts = {};
        historyItems.forEach((item) => {
            const artistName = item.track?.artist?.artistName;
            if (artistName && typeof artistName === "string")
                artistCounts[artistName] = (artistCounts[artistName] || 0) + 1;
        });
        if (Object.keys(artistCounts).length > 0) {
            dominantFeatures.artists = getTopN(artistCounts, 3);
        }
    }
    const candidateTracks = await db_1.default.track.findMany({
        where: {
            AND: [
                filterCriteria,
                { id: { notIn: historyItems.map((h) => h.track.id) } },
            ],
        },
        take: requestedTrackCount * 3,
        orderBy: { playCount: "desc" },
        select: {
            id: true,
            title: true,
            duration: true,
            coverUrl: true,
            audioUrl: true,
            artist: { select: { id: true, artistName: true, avatar: true } },
            album: { select: { id: true, title: true } },
        },
    });
    const selectedTracks = candidateTracks
        .sort(() => 0.5 - Math.random())
        .slice(0, requestedTrackCount);
    if (selectedTracks.length < Math.min(requestedTrackCount, 5) &&
        selectedTracks.length === 0) {
        throw new Error(`Could not find enough tracks matching the criteria (found ${selectedTracks.length}). Try broader features or check user history diversity.`);
    }
    const playlistName = customName
        ? customName.substring(0, 50)
        : `System Mix for ${userId.substring(0, 8)} - Focus: ${focusOnFeatures.join(" & ") || "General"}`;
    const playlistDescription = customDescription
        ? customDescription.substring(0, 150)
        : `A system-generated playlist for user ${userId} focusing on ${focusOnFeatures.join(", ")}. Tracks based on listening history analysis.`;
    const newPlaylist = await db_1.default.playlist.create({
        data: {
            name: playlistName,
            description: playlistDescription,
            userId: userId,
            type: client_1.PlaylistType.SYSTEM,
            privacy: client_1.PlaylistPrivacy.PUBLIC,
            isAIGenerated: false,
            tracks: {
                create: selectedTracks.map((track, index) => ({
                    trackId: track.id,
                    trackOrder: index,
                })),
            },
            totalTracks: selectedTracks.length,
            totalDuration: selectedTracks.reduce((sum, track) => sum + (track.duration || 0), 0),
        },
        include: {
            tracks: { include: { track: { include: { artist: true } } } },
            user: { select: { id: true, name: true } },
        },
    });
    console.log("[PlaylistService] Successfully generated system playlist:", newPlaylist);
    return newPlaylist;
};
exports.generateSystemPlaylistFromHistoryFeatures = generateSystemPlaylistFromHistoryFeatures;
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
                await (0, exports.generateSystemPlaylistFromHistoryFeatures)(user.id, ["mood", "genres"], aiOptions.trackCount || 20);
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
    throw new Error("Function not implemented.");
}
const getUserListeningStats = async (userId) => {
    const historyItems = await db_1.default.history.findMany({
        where: {
            userId: userId,
            trackId: { not: null },
        },
        include: {
            track: {
                select: {
                    id: true,
                    title: true,
                    mood: true,
                    key: true,
                    scale: true,
                    tempo: true,
                    energy: true,
                    danceability: true,
                    artist: { select: { artistName: true } },
                    genres: { include: { genre: { select: { name: true } } } },
                },
            },
        },
        take: 200,
        orderBy: {
            createdAt: "desc",
        },
    });
    if (historyItems.length === 0) {
        return {
            message: "No listening history found to generate stats.",
            topMoods: [],
            topGenres: [],
            topArtists: [],
            topKeys: [],
            tempo: { average: null, min: null, max: null, count: 0 },
            energy: { average: null, min: null, max: null, count: 0 },
            danceability: { average: null, min: null, max: null, count: 0 },
            totalHistoryItemsAnalyzed: 0,
        };
    }
    const moodCounts = {};
    const genreCounts = {};
    const artistCounts = {};
    const keyCounts = {};
    const tempos = [];
    const energies = [];
    const danceabilities = [];
    for (const item of historyItems) {
        if (!item.track)
            continue;
        const track = item.track;
        if (track.mood &&
            typeof track.mood === "string" &&
            track.mood.trim() !== "") {
            moodCounts[track.mood.trim()] = (moodCounts[track.mood.trim()] || 0) + 1;
        }
        if (Array.isArray(track.genres)) {
            track.genres.forEach((g) => {
                if (g.genre?.name && typeof g.genre.name === "string") {
                    genreCounts[g.genre.name] = (genreCounts[g.genre.name] || 0) + 1;
                }
            });
        }
        if (track.artist?.artistName &&
            typeof track.artist.artistName === "string") {
            artistCounts[track.artist.artistName] =
                (artistCounts[track.artist.artistName] || 0) + 1;
        }
        if (track.key && typeof track.key === "string" && track.key.trim() !== "") {
            const keyText = track.key.trim();
            const scaleText = track.scale && typeof track.scale === "string"
                ? track.scale.trim()
                : "";
            const fullKey = scaleText ? `${keyText} ${scaleText}` : keyText;
            keyCounts[fullKey] = (keyCounts[fullKey] || 0) + 1;
        }
        if (typeof track.tempo === "number")
            tempos.push(track.tempo);
        if (typeof track.energy === "number")
            energies.push(track.energy);
        if (typeof track.danceability === "number")
            danceabilities.push(track.danceability);
    }
    const calculateTopN = (counts, n = 5) => {
        return Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, n)
            .map(([name, count]) => ({ name, count }));
    };
    const calculateNumericStats = (arr) => {
        if (arr.length === 0)
            return { average: null, min: null, max: null, count: 0 };
        const sum = arr.reduce((acc, val) => acc + val, 0);
        const average = sum / arr.length;
        const min = Math.min(...arr);
        const max = Math.max(...arr);
        return {
            average: parseFloat(average.toFixed(2)),
            min,
            max,
            count: arr.length,
        };
    };
    return {
        topMoods: calculateTopN(moodCounts),
        topGenres: calculateTopN(genreCounts),
        topArtists: calculateTopN(artistCounts),
        topKeys: calculateTopN(keyCounts),
        tempo: calculateNumericStats(tempos),
        energy: calculateNumericStats(energies),
        danceability: calculateNumericStats(danceabilities),
        totalHistoryItemsAnalyzed: historyItems.length,
    };
};
exports.getUserListeningStats = getUserListeningStats;
const getPlaylistDetailsById = async (playlistId) => {
    const playlist = await db_1.default.playlist.findUnique({
        where: { id: playlistId },
        include: {
            tracks: {
                orderBy: { trackOrder: "asc" },
                select: {
                    id: true,
                    addedAt: true,
                    trackOrder: true,
                    track: {
                        select: {
                            id: true,
                            title: true,
                            coverUrl: true,
                            duration: true,
                            artist: {
                                select: {
                                    id: true,
                                    artistName: true,
                                },
                            },
                            album: {
                                select: {
                                    id: true,
                                    title: true,
                                },
                            },
                            genres: {
                                select: {
                                    genre: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            user: {
                select: {
                    id: true,
                    name: true,
                },
            },
            _count: {
                select: { tracks: true },
            },
        },
    });
    if (!playlist) {
        throw new Error("Playlist not found");
    }
    const transformedPlaylist = {
        ...playlist,
        tracks: playlist.tracks.map((pt) => ({
            ...pt,
            track: {
                ...pt.track,
                genres: pt.track.genres?.map((g) => g.genre.name).filter((name) => !!name) ||
                    [],
                albumTitle: pt.track.album?.title,
                artistName: pt.track.artist?.artistName,
            },
        })),
    };
    return transformedPlaylist;
};
exports.getPlaylistDetailsById = getPlaylistDetailsById;
const calculateTopN = (counts, n = 5) => {
    return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, n)
        .map(([name, count]) => ({ name, count }));
};
//# sourceMappingURL=playlist.service.js.map