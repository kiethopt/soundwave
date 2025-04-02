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
exports.getHomePageData = exports.updateAllSystemPlaylists = exports.getPersonalizedSystemPlaylist = exports.updateSystemPlaylistForUser = exports.createDefaultSystemPlaylists = exports.generateAIPlaylist = exports.getSystemPlaylists = exports.updateVibeRewindPlaylist = void 0;
const db_1 = __importDefault(require("../config/db"));
const handle_utils_1 = require("../utils/handle-utils");
const ai_service_1 = require("./ai.service");
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
const DEFAULT_SYSTEM_PLAYLISTS = [
    {
        name: 'Discover Weekly',
        description: "Discover new music we think you'll like based on your listening habits",
        type: 'SYSTEM',
        privacy: 'PUBLIC',
        coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png',
        isAIGenerated: true,
    },
    {
        name: 'Release Radar',
        description: 'Catch all the latest releases from artists you follow and more',
        type: 'SYSTEM',
        privacy: 'PUBLIC',
        coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png',
        isAIGenerated: true,
    },
    {
        name: 'Daily Mix',
        description: 'A perfect mix of your favorites and new discoveries',
        type: 'SYSTEM',
        privacy: 'PUBLIC',
        coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png',
        isAIGenerated: true,
    },
];
const createDefaultSystemPlaylists = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        for (const playlist of DEFAULT_SYSTEM_PLAYLISTS) {
            const existingPlaylist = yield db_1.default.playlist.findFirst({
                where: {
                    name: playlist.name,
                    userId: null,
                    type: 'SYSTEM',
                },
            });
            if (!existingPlaylist) {
                yield db_1.default.playlist.create({
                    data: {
                        name: playlist.name,
                        description: playlist.description,
                        privacy: playlist.privacy,
                        type: 'SYSTEM',
                        isAIGenerated: true,
                        coverUrl: playlist.coverUrl,
                        lastGeneratedAt: new Date(),
                    },
                });
                console.log(`[PlaylistService] Created system playlist: ${playlist.name}`);
            }
            else if (!existingPlaylist.isAIGenerated) {
                yield db_1.default.playlist.update({
                    where: { id: existingPlaylist.id },
                    data: { isAIGenerated: true },
                });
                console.log(`[PlaylistService] Updated system playlist: ${playlist.name} to set isAIGenerated flag`);
            }
        }
    }
    catch (error) {
        console.error('[PlaylistService] Error creating system playlists:', error);
        throw error;
    }
});
exports.createDefaultSystemPlaylists = createDefaultSystemPlaylists;
const getPersonalizedRecommendations = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, limit = 20) {
    const userHistory = yield db_1.default.history.findMany({
        where: {
            userId,
            type: 'PLAY',
            playCount: { gt: 0 },
        },
        include: {
            track: {
                include: {
                    artist: true,
                    genres: { include: { genre: true } },
                    album: true,
                },
            },
        },
        orderBy: { playCount: 'desc' },
        take: 50,
    });
    if (userHistory.length === 0) {
        return db_1.default.track.findMany({
            where: { isActive: true },
            include: { artist: true, album: true },
            orderBy: { playCount: 'desc' },
            take: limit,
        });
    }
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
        .slice(0, 5)
        .map((entry) => entry[0]);
    const topArtists = [...artistCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry) => entry[0]);
    const recommendations = yield db_1.default.track.findMany({
        where: {
            AND: [
                { isActive: true },
                {
                    OR: [
                        { genres: { some: { genreId: { in: topGenres } } } },
                        { artistId: { in: topArtists } },
                    ],
                },
                {
                    id: {
                        notIn: userHistory
                            .map((h) => h.trackId)
                            .filter((id) => id !== null),
                    },
                },
            ],
        },
        include: {
            artist: true,
            album: true,
        },
        orderBy: { playCount: 'desc' },
        take: limit,
    });
    if (recommendations.length < limit) {
        const popularTracks = yield db_1.default.track.findMany({
            where: {
                isActive: true,
                id: {
                    notIn: [
                        ...recommendations.map((t) => t.id),
                        ...userHistory
                            .map((h) => h.trackId)
                            .filter((id) => id !== null),
                    ],
                },
            },
            include: { artist: true, album: true },
            orderBy: { playCount: 'desc' },
            take: limit - recommendations.length,
        });
        return [...recommendations, ...popularTracks];
    }
    return recommendations;
});
const getNewReleases = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, limit = 20) {
    const followedArtists = yield db_1.default.userFollow.findMany({
        where: {
            followerId: userId,
            followingType: 'ARTIST',
        },
        select: {
            followingArtistId: true,
        },
    });
    const artistIds = followedArtists
        .map((f) => f.followingArtistId)
        .filter((id) => id !== null);
    if (artistIds.length === 0) {
        return db_1.default.track.findMany({
            where: {
                isActive: true,
                releaseDate: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
            },
            include: { artist: true, album: true },
            orderBy: { releaseDate: 'desc' },
            take: limit,
        });
    }
    const followedArtistReleases = yield db_1.default.track.findMany({
        where: {
            artistId: { in: artistIds },
            isActive: true,
            releaseDate: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
        },
        include: { artist: true, album: true },
        orderBy: { releaseDate: 'desc' },
        take: limit,
    });
    if (followedArtistReleases.length < limit) {
        const otherNewReleases = yield db_1.default.track.findMany({
            where: {
                artistId: { notIn: artistIds },
                isActive: true,
                releaseDate: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
                id: { notIn: followedArtistReleases.map((t) => t.id) },
            },
            include: { artist: true, album: true },
            orderBy: { releaseDate: 'desc' },
            take: limit - followedArtistReleases.length,
        });
        return [...followedArtistReleases, ...otherNewReleases];
    }
    return followedArtistReleases;
});
const getDailyMix = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, limit = 20) {
    const userLikedTracks = yield db_1.default.userLikeTrack.findMany({
        where: { userId },
        include: {
            track: {
                include: {
                    artist: true,
                    genres: { include: { genre: true } },
                },
            },
        },
        take: 50,
    });
    const userPlayHistory = yield db_1.default.history.findMany({
        where: {
            userId,
            type: 'PLAY',
            playCount: { gt: 2 },
        },
        include: {
            track: {
                include: {
                    artist: true,
                    genres: { include: { genre: true } },
                },
            },
        },
        orderBy: { playCount: 'desc' },
        take: 50,
    });
    if (userPlayHistory.length === 0 && userLikedTracks.length === 0) {
        return db_1.default.track.findMany({
            where: { isActive: true },
            include: { artist: true, album: true },
            orderBy: { playCount: 'desc' },
            take: limit,
        });
    }
    const tracksToAnalyze = [
        ...userLikedTracks
            .map((t) => t.track)
            .filter((track) => !!track),
        ...userPlayHistory
            .map((h) => h.track)
            .filter((track) => !!track),
    ];
    const genreCounts = new Map();
    const artistCounts = new Map();
    tracksToAnalyze.forEach((track) => {
        var _a;
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
        .slice(0, 5)
        .map((entry) => entry[0]);
    const topArtists = [...artistCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry) => entry[0]);
    const favoriteTracks = yield db_1.default.track.findMany({
        where: {
            artistId: { in: topArtists },
            isActive: true,
            id: {
                notIn: tracksToAnalyze
                    .map((t) => t.id)
                    .filter((id) => id !== undefined),
            },
        },
        include: { artist: true, album: true },
        orderBy: [{ playCount: 'desc' }],
        take: Math.ceil(limit / 2),
    });
    const similarGenreTracks = yield db_1.default.track.findMany({
        where: {
            genres: { some: { genreId: { in: topGenres } } },
            artistId: { notIn: topArtists },
            isActive: true,
            id: {
                notIn: [
                    ...favoriteTracks.map((t) => t.id),
                    ...tracksToAnalyze
                        .map((t) => t.id)
                        .filter((id) => id !== undefined),
                ],
            },
        },
        include: { artist: true, album: true },
        orderBy: { playCount: 'desc' },
        take: Math.floor(limit / 2),
    });
    const mixedTracks = [...favoriteTracks, ...similarGenreTracks];
    for (let i = mixedTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mixedTracks[i], mixedTracks[j]] = [mixedTracks[j], mixedTracks[i]];
    }
    return mixedTracks;
});
const updateSystemPlaylistForUser = (systemPlaylistName, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const templatePlaylist = yield db_1.default.playlist.findFirst({
            where: {
                name: systemPlaylistName,
                type: 'SYSTEM',
                userId: null,
            },
        });
        if (!templatePlaylist) {
            console.error(`[PlaylistService] System playlist ${systemPlaylistName} not found`);
            return;
        }
        let userPlaylist = yield db_1.default.playlist.findFirst({
            where: {
                name: systemPlaylistName,
                type: 'SYSTEM',
                userId: userId,
            },
        });
        if (!userPlaylist) {
            userPlaylist = yield db_1.default.playlist.create({
                data: {
                    name: templatePlaylist.name,
                    description: templatePlaylist.description,
                    privacy: templatePlaylist.privacy,
                    type: 'SYSTEM',
                    isAIGenerated: true,
                    coverUrl: templatePlaylist.coverUrl,
                    userId: userId,
                    lastGeneratedAt: new Date(),
                },
            });
            console.log(`[PlaylistService] Created personalized system playlist "${systemPlaylistName}" for user ${userId}`);
        }
        let tracks;
        switch (systemPlaylistName) {
            case 'Discover Weekly':
                tracks = yield getPersonalizedRecommendations(userId, 30);
                break;
            case 'Release Radar':
                tracks = yield getNewReleases(userId, 30);
                break;
            case 'Daily Mix':
                tracks = yield getDailyMix(userId, 30);
                break;
            default:
                tracks = yield getPersonalizedRecommendations(userId, 30);
        }
        if (!tracks || tracks.length === 0) {
            console.log(`[PlaylistService] No tracks found for ${systemPlaylistName} for user ${userId}`);
            return;
        }
        yield db_1.default.playlistTrack.deleteMany({
            where: {
                playlistId: userPlaylist.id,
            },
        });
        const playlistTrackData = tracks.map((track, index) => ({
            playlistId: userPlaylist.id,
            trackId: track.id,
            trackOrder: index,
        }));
        const uniqueTrackData = playlistTrackData.filter((track, index, self) => self.findIndex((t) => t.playlistId === track.playlistId && t.trackId === track.trackId) === index);
        yield db_1.default.$transaction([
            db_1.default.playlistTrack.createMany({
                data: uniqueTrackData,
            }),
            db_1.default.playlist.update({
                where: { id: userPlaylist.id },
                data: {
                    totalTracks: tracks.length,
                    totalDuration: tracks.reduce((sum, track) => sum + ((track === null || track === void 0 ? void 0 : track.duration) || 0), 0),
                    lastGeneratedAt: new Date(),
                },
            }),
        ]);
        console.log(`[PlaylistService] Successfully updated ${tracks.length} tracks for ${systemPlaylistName} for user ${userId}`);
    }
    catch (error) {
        console.error(`[PlaylistService] Error updating tracks for ${systemPlaylistName} for user ${userId}:`, error);
        throw error;
    }
});
exports.updateSystemPlaylistForUser = updateSystemPlaylistForUser;
const getPersonalizedSystemPlaylist = (systemPlaylistName, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let userPlaylist = yield db_1.default.playlist.findFirst({
            where: {
                name: systemPlaylistName,
                type: 'SYSTEM',
                userId: userId,
            },
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
                        trackOrder: 'asc',
                    },
                },
            },
        });
        if (!userPlaylist || userPlaylist.tracks.length === 0) {
            console.log(`[PlaylistService] User ${userId} doesn't have playlist "${systemPlaylistName}" yet or it's empty. Creating and populating...`);
            yield (0, exports.updateSystemPlaylistForUser)(systemPlaylistName, userId);
            userPlaylist = yield db_1.default.playlist.findFirst({
                where: {
                    name: systemPlaylistName,
                    type: 'SYSTEM',
                    userId: userId,
                },
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
                            trackOrder: 'asc',
                        },
                    },
                },
            });
        }
        else {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const needsRefresh = !userPlaylist.lastGeneratedAt ||
                userPlaylist.lastGeneratedAt < oneDayAgo;
            if (needsRefresh) {
                console.log(`[PlaylistService] Refreshing system playlist "${systemPlaylistName}" for user ${userId}`);
                try {
                    yield (0, exports.updateSystemPlaylistForUser)(systemPlaylistName, userId);
                    userPlaylist = yield db_1.default.playlist.findFirst({
                        where: {
                            name: systemPlaylistName,
                            type: 'SYSTEM',
                            userId: userId,
                        },
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
                                    trackOrder: 'asc',
                                },
                            },
                        },
                    });
                }
                catch (error) {
                    console.error(`[PlaylistService] Error refreshing system playlist: ${error}`);
                }
            }
        }
        return userPlaylist;
    }
    catch (error) {
        console.error(`[PlaylistService] Error getting personalized system playlist:`, error);
        throw error;
    }
});
exports.getPersonalizedSystemPlaylist = getPersonalizedSystemPlaylist;
const updateAllSystemPlaylists = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield db_1.default.user.findMany({
            where: { isActive: true },
            select: { id: true },
        });
        const systemPlaylists = yield db_1.default.playlist.findMany({
            where: { type: 'SYSTEM', userId: null },
            select: { name: true },
        });
        console.log(`[PlaylistService] Updating system playlists for ${users.length} users`);
        const errors = [];
        for (const user of users) {
            for (const playlist of systemPlaylists) {
                try {
                    yield (0, exports.updateSystemPlaylistForUser)(playlist.name, user.id);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`[PlaylistService] Error updating ${playlist.name} for user ${user.id}: ${errorMessage}`);
                    errors.push({
                        userId: user.id,
                        playlistName: playlist.name,
                        error: errorMessage,
                    });
                }
            }
        }
        if (errors.length === 0) {
            console.log(`[PlaylistService] Successfully updated all system playlists`);
            return { success: true, errors: [] };
        }
        else {
            console.error(`[PlaylistService] Completed with ${errors.length} errors`);
            return { success: false, errors };
        }
    }
    catch (error) {
        console.error('[PlaylistService] Error updating all system playlists:', error);
        return {
            success: false,
            errors: [
                { global: error instanceof Error ? error.message : String(error) },
            ],
        };
    }
});
exports.updateAllSystemPlaylists = updateAllSystemPlaylists;
const getHomePageData = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const systemPlaylists = yield db_1.default.playlist.findMany({
        where: {
            type: 'SYSTEM',
            userId: null,
            privacy: 'PUBLIC',
        },
        take: 5,
        include: {
            user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    const newestAlbums = yield db_1.default.album.findMany({
        where: {
            isActive: true,
        },
        orderBy: {
            releaseDate: 'desc',
        },
        take: 10,
        include: {
            artist: { select: { id: true, artistName: true, avatar: true } },
        },
    });
    const hotAlbums = yield db_1.default.album.findMany({
        where: {
            isActive: true,
        },
        orderBy: [
            { createdAt: 'desc' },
        ],
        take: 10,
        include: {
            artist: { select: { id: true, artistName: true, avatar: true } },
        },
    });
    const responseData = {
        systemPlaylists,
        newestAlbums,
        hotAlbums,
        userPlaylists: [],
        personalizedSystemPlaylists: [],
    };
    if (userId) {
        const userPlaylists = yield db_1.default.playlist.findMany({
            where: {
                userId,
                type: 'NORMAL',
            },
            include: {
                _count: { select: { tracks: true } },
            },
            take: 5,
            orderBy: {
                updatedAt: 'desc',
            },
        });
        responseData.userPlaylists = userPlaylists.map((p) => (Object.assign(Object.assign({}, p), { totalTracks: p._count.tracks })));
        const personalizedSystemPlaylists = yield db_1.default.playlist.findMany({
            where: {
                userId: userId,
                type: 'SYSTEM',
            },
            take: 5,
            include: {
                _count: { select: { tracks: true } },
            },
            orderBy: { lastGeneratedAt: 'desc' },
        });
        responseData.personalizedSystemPlaylists = personalizedSystemPlaylists.map((p) => (Object.assign(Object.assign({}, p), { totalTracks: p._count.tracks })));
    }
    return responseData;
});
exports.getHomePageData = getHomePageData;
//# sourceMappingURL=playlist.service.js.map