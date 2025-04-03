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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAllSystemPlaylists = exports.generateAIPlaylist = exports.getSystemPlaylists = exports.updateVibeRewindPlaylist = exports.getAllBaseSystemPlaylists = exports.deleteBaseSystemPlaylist = exports.updateBaseSystemPlaylist = exports.createBaseSystemPlaylist = void 0;
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
const createBaseSystemPlaylist = (data, coverFile) => __awaiter(void 0, void 0, void 0, function* () {
    const existing = yield db_1.default.playlist.findFirst({
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
        const uploadResult = yield (0, upload_service_1.uploadFile)(coverFile.buffer, 'playlists/covers');
        coverUrl = uploadResult.secure_url;
    }
    return db_1.default.playlist.create({
        data: Object.assign(Object.assign({}, data), { coverUrl, type: client_1.PlaylistType.SYSTEM, isAIGenerated: true, userId: null }),
        select: baseSystemPlaylistSelect,
    });
});
exports.createBaseSystemPlaylist = createBaseSystemPlaylist;
const updateBaseSystemPlaylist = (playlistId, data, coverFile) => __awaiter(void 0, void 0, void 0, function* () {
    const playlist = yield db_1.default.playlist.findUnique({
        where: { id: playlistId },
        select: { type: true, userId: true, name: true },
    });
    if (!playlist ||
        playlist.type !== client_1.PlaylistType.SYSTEM ||
        playlist.userId !== null) {
        throw new Error('Base system playlist not found.');
    }
    if (data.name && data.name !== playlist.name) {
        const existing = yield db_1.default.playlist.findFirst({
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
        const uploadResult = yield (0, upload_service_1.uploadFile)(coverFile.buffer, 'playlists/covers');
        coverUrl = uploadResult.secure_url;
    }
    return db_1.default.playlist.update({
        where: { id: playlistId },
        data: Object.assign(Object.assign(Object.assign({}, data), (coverUrl && { coverUrl })), { type: client_1.PlaylistType.SYSTEM, userId: null, isAIGenerated: true }),
        select: baseSystemPlaylistSelect,
    });
});
exports.updateBaseSystemPlaylist = updateBaseSystemPlaylist;
const deleteBaseSystemPlaylist = (playlistId) => __awaiter(void 0, void 0, void 0, function* () {
    const playlist = yield db_1.default.playlist.findUnique({
        where: { id: playlistId },
        select: { type: true, userId: true },
    });
    if (!playlist ||
        playlist.type !== client_1.PlaylistType.SYSTEM ||
        playlist.userId !== null) {
        throw new Error('Base system playlist not found.');
    }
    return db_1.default.playlist.delete({
        where: { id: playlistId },
    });
});
exports.deleteBaseSystemPlaylist = deleteBaseSystemPlaylist;
const getAllBaseSystemPlaylists = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { search } = req.query;
    const whereClause = {
        type: client_1.PlaylistType.SYSTEM,
        userId: null,
    };
    if (search && typeof search === 'string') {
        whereClause.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }
    const result = yield (0, handle_utils_1.paginate)(db_1.default.playlist, req, {
        where: whereClause,
        select: baseSystemPlaylistSelect,
        orderBy: { createdAt: 'desc' },
    });
    return result;
});
exports.getAllBaseSystemPlaylists = getAllBaseSystemPlaylists;
const updateVibeRewindPlaylist = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let vibeRewindPlaylist = yield db_1.default.playlist.findFirst({
            where: { userId, name: 'Vibe Rewind' },
        });
        if (!vibeRewindPlaylist) {
            console.log(`[PlaylistService] Creating new Vibe Rewind playlist for user ${userId}...`);
            vibeRewindPlaylist = yield db_1.default.playlist.create({
                data: {
                    name: 'Vibe Rewind',
                    description: "Your personal time capsule - tracks you've been vibing to lately",
                    privacy: 'PRIVATE',
                    type: 'NORMAL',
                    userId,
                },
            });
        }
        const userHistory = yield db_1.default.history.findMany({
            where: { userId, type: 'PLAY', playCount: { gt: 2 } },
            include: {
                track: {
                    include: { artist: true, genres: { include: { genre: true } } },
                },
            },
        });
        if (userHistory.length === 0) {
            console.log(`[PlaylistService] No history found for user ${userId}`);
            return;
        }
        const topPlayedTracks = yield db_1.default.history.findMany({
            where: { userId, playCount: { gt: 5 } },
            include: { track: true },
            orderBy: { playCount: 'desc' },
            take: 10,
        });
        console.log(`[PlaylistService] Found ${topPlayedTracks.length} frequently played tracks for user ${userId}`);
        const genreCounts = new Map();
        const artistCounts = new Map();
        userHistory.forEach((history) => {
            var _a;
            const track = history.track;
            if (track) {
                track.genres.forEach((genreRel) => {
                    const genreId = genreRel.genre.id;
                    genreCounts.set(genreId, (genreCounts.get(genreId) || 0) + 1);
                });
                const artistId = (_a = track.artist) === null || _a === void 0 ? void 0 : _a.id;
                if (artistId) {
                    artistCounts.set(artistId, (artistCounts.get(artistId) || 0) + 1);
                }
            }
        });
        const topGenres = [...genreCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map((entry) => entry[0]);
        const topArtists = [...artistCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map((entry) => entry[0]);
        console.log(`[PlaylistService] Top genres: ${topGenres}`);
        console.log(`[PlaylistService] Top artists: ${topArtists}`);
        const recommendedTracks = yield db_1.default.track.findMany({
            where: {
                OR: [
                    { genres: { some: { genreId: { in: topGenres } } } },
                    { artistId: { in: topArtists } },
                ],
                isActive: true,
            },
            include: { artist: true, album: true },
            orderBy: { playCount: 'desc' },
            take: 10,
        });
        console.log(`[PlaylistService] Found ${recommendedTracks.length} content-based tracks`);
        const similarUsers = yield db_1.default.history.findMany({
            where: {
                trackId: {
                    in: userHistory
                        .map((h) => h.trackId)
                        .filter((id) => id !== null),
                },
                userId: { not: userId },
            },
            select: { userId: true },
            distinct: ['userId'],
        });
        const similarUserIds = similarUsers.map((u) => u.userId);
        console.log(`[PlaylistService] Found ${similarUserIds.length} similar users`);
        const collaborativeTracks = yield db_1.default.history.findMany({
            where: { userId: { in: similarUserIds } },
            include: { track: true },
            orderBy: { playCount: 'desc' },
            take: 10,
        });
        console.log(`[PlaylistService] Found ${collaborativeTracks.length} collaborative filtering tracks`);
        const finalRecommendedTracks = [
            ...new Set([
                ...topPlayedTracks.map((t) => t.track),
                ...recommendedTracks,
                ...collaborativeTracks.map((t) => t.track),
            ]),
        ].slice(0, 10);
        if (finalRecommendedTracks.length === 0) {
            console.log(`[PlaylistService] No tracks found to update in Vibe Rewind for user ${userId}`);
            return;
        }
        yield db_1.default.playlistTrack.deleteMany({
            where: {
                playlistId: vibeRewindPlaylist.id,
            },
        });
        const playlistTrackData = finalRecommendedTracks
            .filter((track) => (track === null || track === void 0 ? void 0 : track.id) !== undefined)
            .map((track, index) => ({
            playlistId: vibeRewindPlaylist.id,
            trackId: track.id,
            trackOrder: index,
        }));
        yield db_1.default.$transaction([
            db_1.default.playlistTrack.createMany({
                data: playlistTrackData.filter((track, index, self) => self.findIndex((t) => t.playlistId === track.playlistId && t.trackId === track.trackId) === index),
            }),
            db_1.default.playlist.update({
                where: { id: vibeRewindPlaylist.id },
                data: {
                    totalTracks: finalRecommendedTracks.length,
                    totalDuration: finalRecommendedTracks.reduce((sum, track) => sum + ((track === null || track === void 0 ? void 0 : track.duration) || 0), 0),
                },
            }),
        ]);
        console.log(`[PlaylistService] Successfully updated tracks for Vibe Rewind for user ${userId}`);
    }
    catch (error) {
        console.error(`[PlaylistService] Error updating tracks for Vibe Rewind for user ${userId}:`, error);
        throw error;
    }
});
exports.updateVibeRewindPlaylist = updateVibeRewindPlaylist;
const getSystemPlaylists = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { search, sortBy, sortOrder } = req.query;
    const whereClause = {
        type: 'SYSTEM',
    };
    if (search && typeof search === 'string') {
        whereClause.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }
    const orderByClause = {};
    if (sortBy &&
        typeof sortBy === 'string' &&
        (sortOrder === 'asc' || sortOrder === 'desc')) {
        if (sortBy === 'name' ||
            sortBy === 'type' ||
            sortBy === 'createdAt' ||
            sortBy === 'updatedAt' ||
            sortBy === 'totalTracks') {
            orderByClause[sortBy] = sortOrder;
        }
        else {
            orderByClause.createdAt = 'desc';
        }
    }
    else {
        orderByClause.createdAt = 'desc';
    }
    const result = yield (0, handle_utils_1.paginate)(db_1.default.playlist, req, {
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
                    trackOrder: 'asc',
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
        return Object.assign(Object.assign({}, playlist), { tracks: formattedTracks });
    });
    return {
        data: formattedPlaylists,
        pagination: result.pagination,
    };
});
exports.getSystemPlaylists = getSystemPlaylists;
const generateAIPlaylist = (userId, options) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[PlaylistService] Generating AI playlist for user ${userId} with options:`, options);
    const playlist = yield (0, ai_service_1.createAIGeneratedPlaylist)(userId, options);
    const playlistWithTracks = yield db_1.default.playlist.findUnique({
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
                    trackOrder: 'asc',
                },
            },
        },
    });
    if (!playlistWithTracks) {
        throw new Error('Failed to retrieve created playlist details');
    }
    const artistsInPlaylist = new Set();
    playlistWithTracks.tracks.forEach((pt) => {
        if (pt.track.artist) {
            artistsInPlaylist.add(pt.track.artist.artistName);
        }
    });
    return Object.assign(Object.assign({}, playlist), { artistCount: artistsInPlaylist.size, previewTracks: playlistWithTracks.tracks.slice(0, 3).map((pt) => {
            var _a;
            return ({
                id: pt.track.id,
                title: pt.track.title,
                artist: (_a = pt.track.artist) === null || _a === void 0 ? void 0 : _a.artistName,
            });
        }), totalTracks: playlistWithTracks.tracks.length });
});
exports.generateAIPlaylist = generateAIPlaylist;
const updateAllSystemPlaylists = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield db_1.default.user.findMany({
            where: { isActive: true },
            select: { id: true },
        });
        const baseSystemPlaylists = yield db_1.default.playlist.findMany({
            where: { type: 'SYSTEM', userId: null },
            select: { name: true },
        });
        if (baseSystemPlaylists.length === 0) {
            console.log('[PlaylistService] No base system playlists found to update.');
            return { success: true, errors: [] };
        }
        console.log(`[PlaylistService] Updating ${baseSystemPlaylists.length} system playlists for ${users.length} users...`);
        const errors = [];
        const updatePromises = users.flatMap((user) => baseSystemPlaylists.map((playlistTemplate) => (() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const templatePlaylist = yield db_1.default.playlist.findFirst({
                    where: {
                        name: playlistTemplate.name,
                        type: 'SYSTEM',
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
                const coverUrl = templatePlaylist.coverUrl ||
                    'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png';
                yield (0, ai_service_1.createAIGeneratedPlaylist)(user.id, {
                    name: templatePlaylist.name,
                    description: templatePlaylist.description || undefined,
                    coverUrl: coverUrl,
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
        }))()));
        yield Promise.allSettled(updatePromises);
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
        console.error('[PlaylistService] Critical error during updateAllSystemPlaylists:', error);
        return {
            success: false,
            errors: [
                { global: error instanceof Error ? error.message : String(error) },
            ],
        };
    }
});
exports.updateAllSystemPlaylists = updateAllSystemPlaylists;
//# sourceMappingURL=playlist.service.js.map