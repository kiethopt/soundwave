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
exports.generateGlobalRecommendedPlaylist = exports.analyzeUserTaste = exports.generatePersonalizedPlaylist = exports.systemPlaylistService = exports.SystemPlaylistService = void 0;
const db_1 = __importDefault(require("../config/db"));
const ml_matrix_1 = require("ml-matrix");
const SYSTEM_PLAYLIST_TYPES = {
    TOP_HITS: 'TOP_HITS',
    NEW_RELEASES: 'NEW_RELEASES',
    GENRE_BASED: 'GENRE_BASED',
    MOOD_BASED: 'MOOD_BASED',
    DISCOVER_WEEKLY: 'DISCOVER_WEEKLY',
    TIME_CAPSULE: 'TIME_CAPSULE',
};
const SYSTEM_PLAYLIST_NAMES = {
    [SYSTEM_PLAYLIST_TYPES.TOP_HITS]: 'Soundwave Hits: Trending Right Now',
    [SYSTEM_PLAYLIST_TYPES.NEW_RELEASES]: 'Soundwave Fresh: New Releases',
    [SYSTEM_PLAYLIST_TYPES.GENRE_BASED]: 'Soundwave Genre Mix',
    [SYSTEM_PLAYLIST_TYPES.MOOD_BASED]: 'Soundwave Mood Mix',
    [SYSTEM_PLAYLIST_TYPES.DISCOVER_WEEKLY]: 'Discover Weekly',
    [SYSTEM_PLAYLIST_TYPES.TIME_CAPSULE]: 'Your Time Capsule',
};
class SystemPlaylistService {
    initializeForNewUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`[SystemPlaylistService] Initializing playlists for new user: ${userId}`);
                const user = yield db_1.default.user.findUnique({ where: { id: userId } });
                if (!user) {
                    throw new Error(`User with ID ${userId} not found`);
                }
                yield Promise.all([
                    this.connectUserToGlobalPlaylist(userId, SYSTEM_PLAYLIST_TYPES.TOP_HITS),
                    this.createDiscoverWeeklyPlaylist(userId),
                    this.createNewReleasesPlaylist(userId),
                ]);
                console.log(`[SystemPlaylistService] Successfully initialized playlists for user: ${userId}`);
            }
            catch (error) {
                console.error(`[SystemPlaylistService] Error initializing playlists for user ${userId}:`, error);
                throw new Error(`Failed to initialize playlists for new user: ${error}`);
            }
        });
    }
    connectUserToGlobalPlaylist(userId, playlistType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const globalPlaylist = yield db_1.default.playlist.findFirst({
                    where: {
                        name: SYSTEM_PLAYLIST_NAMES[playlistType],
                        type: 'SYSTEM',
                    },
                });
                if (!globalPlaylist) {
                    console.log(`[SystemPlaylistService] Global ${playlistType} playlist not found, creating it...`);
                    yield this.createOrUpdateGlobalPlaylist(playlistType);
                    return this.connectUserToGlobalPlaylist(userId, playlistType);
                }
                console.log(`[SystemPlaylistService] Connected user ${userId} to global ${playlistType} playlist`);
            }
            catch (error) {
                console.error(`[SystemPlaylistService] Error connecting user to global playlist:`, error);
            }
        });
    }
    createDiscoverWeeklyPlaylist(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const existingPlaylist = yield db_1.default.playlist.findFirst({
                    where: {
                        userId,
                        name: SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.DISCOVER_WEEKLY],
                        type: 'SYSTEM',
                    },
                });
                if (existingPlaylist) {
                    yield this.updateDiscoverWeeklyPlaylist(existingPlaylist.id);
                    return existingPlaylist;
                }
                const playlist = yield db_1.default.playlist.create({
                    data: {
                        name: SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.DISCOVER_WEEKLY],
                        description: 'Khám phá những bài hát mới được cá nhân hóa dành riêng cho bạn. Cập nhật hàng tuần vào Thứ Hai.',
                        type: 'SYSTEM',
                        privacy: 'PUBLIC',
                        userId,
                        coverUrl: 'https://newjams-images.scdn.co/image/ab676477000033ad/dt/v3/discover-weekly/4O2moMBFA5GYrAnwXLtFDVEVPCc0WhFTI0aWB3b9bpDcL3CQ4dzOmLlizDEvd4Ia0o3B5vUTT-1pD72G0LDfyGH-CQi5qH97BppF-pQ82ww=/NzQ6ODA6NzBUNDAtNDAtNQ==',
                    },
                });
                yield this.updateDiscoverWeeklyPlaylist(playlist.id);
                return playlist;
            }
            catch (error) {
                console.error(`[SystemPlaylistService] Error creating Discover Weekly playlist:`, error);
                return null;
            }
        });
    }
    updateDiscoverWeeklyPlaylist(playlistId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const playlist = yield db_1.default.playlist.findUnique({
                    where: { id: playlistId },
                    include: { tracks: true },
                });
                if (!playlist) {
                    throw new Error(`Playlist with ID ${playlistId} not found`);
                }
                yield db_1.default.playlistTrack.deleteMany({
                    where: { playlistId },
                });
                const recommendedTracks = yield getRecommendedTracks(playlist.userId, 30, {
                    includeTopTracks: false,
                    includeNewReleases: true,
                });
                if (recommendedTracks.length > 0) {
                    const playlistTrackData = recommendedTracks.map((track, index) => ({
                        playlistId,
                        trackId: track.id,
                        trackOrder: index,
                    }));
                    yield db_1.default.$transaction([
                        db_1.default.playlistTrack.createMany({
                            data: playlistTrackData,
                        }),
                        db_1.default.playlist.update({
                            where: { id: playlistId },
                            data: {
                                totalTracks: recommendedTracks.length,
                                totalDuration: recommendedTracks.reduce((sum, track) => sum + (track.duration || 0), 0),
                                updatedAt: new Date(),
                            },
                        }),
                    ]);
                }
                else {
                    yield db_1.default.playlist.update({
                        where: { id: playlistId },
                        data: {
                            totalTracks: 0,
                            totalDuration: 0,
                            updatedAt: new Date(),
                        },
                    });
                }
                console.log(`[SystemPlaylistService] Updated Discover Weekly playlist: ${playlistId}`);
            }
            catch (error) {
                console.error(`[SystemPlaylistService] Error updating Discover Weekly playlist:`, error);
            }
        });
    }
    createNewReleasesPlaylist(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const existingPlaylist = yield db_1.default.playlist.findFirst({
                    where: {
                        userId,
                        name: SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.NEW_RELEASES],
                        type: 'SYSTEM',
                    },
                });
                if (existingPlaylist) {
                    yield this.updateNewReleasesPlaylist(existingPlaylist.id);
                    return existingPlaylist;
                }
                const playlist = yield db_1.default.playlist.create({
                    data: {
                        name: SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.NEW_RELEASES],
                        description: 'Những bản phát hành mới nhất từ các nghệ sĩ mà bạn yêu thích và có thể sẽ thích. Cập nhật hàng tuần vào Thứ Sáu.',
                        type: 'SYSTEM',
                        privacy: 'PUBLIC',
                        userId,
                        coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742551340/testAlbum/cv6rm3txh8beiln4x5u1.jpg',
                    },
                });
                yield this.updateNewReleasesPlaylist(playlist.id);
                return playlist;
            }
            catch (error) {
                console.error(`[SystemPlaylistService] Error creating New Releases playlist:`, error);
                return null;
            }
        });
    }
    updateNewReleasesPlaylist(playlistId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const playlist = yield db_1.default.playlist.findUnique({
                    where: { id: playlistId },
                    include: { user: true, tracks: true },
                });
                if (!playlist) {
                    throw new Error(`Playlist with ID ${playlistId} not found`);
                }
                yield db_1.default.playlistTrack.deleteMany({
                    where: { playlistId },
                });
                const userHistory = yield db_1.default.history.findMany({
                    where: {
                        userId: playlist.userId,
                        type: 'PLAY',
                    },
                    include: {
                        track: {
                            include: {
                                artist: true,
                            },
                        },
                    },
                });
                const artistCounts = new Map();
                userHistory.forEach((history) => {
                    var _a;
                    if ((_a = history.track) === null || _a === void 0 ? void 0 : _a.artistId) {
                        const artistId = history.track.artistId;
                        artistCounts.set(artistId, (artistCounts.get(artistId) || 0) + 1);
                    }
                });
                const favoriteArtistIds = [...artistCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map((entry) => entry[0]);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const newReleases = yield db_1.default.track.findMany({
                    where: {
                        releaseDate: {
                            gte: thirtyDaysAgo,
                        },
                        isActive: true,
                        OR: [
                            { artistId: { in: favoriteArtistIds } },
                            { releaseDate: { gte: thirtyDaysAgo } },
                        ],
                    },
                    orderBy: [
                        { releaseDate: 'desc' },
                    ],
                    include: {
                        artist: true,
                        album: true,
                    },
                    take: 30,
                });
                if (newReleases.length > 0) {
                    const playlistTrackData = newReleases.map((track, index) => ({
                        playlistId,
                        trackId: track.id,
                        trackOrder: index,
                    }));
                    yield db_1.default.$transaction([
                        db_1.default.playlistTrack.createMany({
                            data: playlistTrackData,
                        }),
                        db_1.default.playlist.update({
                            where: { id: playlistId },
                            data: {
                                totalTracks: newReleases.length,
                                totalDuration: newReleases.reduce((sum, track) => sum + (track.duration || 0), 0),
                                updatedAt: new Date(),
                            },
                        }),
                    ]);
                }
                else {
                    yield db_1.default.playlist.update({
                        where: { id: playlistId },
                        data: {
                            totalTracks: 0,
                            totalDuration: 0,
                            updatedAt: new Date(),
                        },
                    });
                }
                console.log(`[SystemPlaylistService] Updated New Releases playlist: ${playlistId}`);
            }
            catch (error) {
                console.error(`[SystemPlaylistService] Error updating New Releases playlist:`, error);
            }
        });
    }
    createOrUpdateGlobalPlaylist(playlistType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const existingPlaylist = yield db_1.default.playlist.findFirst({
                    where: {
                        name: SYSTEM_PLAYLIST_NAMES[playlistType],
                        type: 'SYSTEM',
                    },
                });
                if (existingPlaylist) {
                    return yield this.updateGlobalPlaylistContent(existingPlaylist.id, playlistType);
                }
                const adminUser = yield db_1.default.user.findFirst({
                    where: { role: 'ADMIN' },
                });
                if (!adminUser) {
                    throw new Error('No admin user found to assign global playlist ownership');
                }
                const playlist = yield db_1.default.playlist.create({
                    data: {
                        name: SYSTEM_PLAYLIST_NAMES[playlistType],
                        description: this.getPlaylistDescription(playlistType),
                        type: 'SYSTEM',
                        privacy: 'PUBLIC',
                        userId: adminUser.id,
                        coverUrl: this.getPlaylistCoverUrl(playlistType),
                    },
                });
                return yield this.updateGlobalPlaylistContent(playlist.id, playlistType);
            }
            catch (error) {
                console.error(`[SystemPlaylistService] Error creating global playlist:`, error);
                return null;
            }
        });
    }
    updateGlobalPlaylistContent(playlistId, playlistType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield db_1.default.playlistTrack.deleteMany({
                    where: { playlistId },
                });
                let tracks = [];
                switch (playlistType) {
                    case SYSTEM_PLAYLIST_TYPES.TOP_HITS:
                        const recommendations = yield (0, exports.generateGlobalRecommendedPlaylist)(30);
                        tracks = recommendations.tracks;
                        break;
                    case SYSTEM_PLAYLIST_TYPES.NEW_RELEASES:
                        const twoWeeksAgo = new Date();
                        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                        tracks = yield db_1.default.track.findMany({
                            where: {
                                releaseDate: { gte: twoWeeksAgo },
                                isActive: true,
                            },
                            orderBy: { releaseDate: 'desc' },
                            include: {
                                artist: true,
                                album: true,
                            },
                            take: 30,
                        });
                        break;
                }
                if (tracks.length > 0) {
                    const playlistTrackData = tracks.map((track, index) => ({
                        playlistId,
                        trackId: track.id,
                        trackOrder: index,
                    }));
                    yield db_1.default.$transaction([
                        db_1.default.playlistTrack.createMany({
                            data: playlistTrackData,
                        }),
                        db_1.default.playlist.update({
                            where: { id: playlistId },
                            data: {
                                totalTracks: tracks.length,
                                totalDuration: tracks.reduce((sum, track) => sum + (track.duration || 0), 0),
                                updatedAt: new Date(),
                            },
                        }),
                    ]);
                }
                else {
                    yield db_1.default.playlist.update({
                        where: { id: playlistId },
                        data: {
                            totalTracks: 0,
                            totalDuration: 0,
                            updatedAt: new Date(),
                        },
                    });
                }
                const updatedPlaylist = yield db_1.default.playlist.findUnique({
                    where: { id: playlistId },
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
                console.log(`[SystemPlaylistService] Updated ${playlistType} global playlist: ${playlistId}`);
                return updatedPlaylist;
            }
            catch (error) {
                console.error(`[SystemPlaylistService] Error updating global playlist content:`, error);
                return null;
            }
        });
    }
    updateAllSystemPlaylists() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`[SystemPlaylistService] Starting update of all system playlists`);
                const globalPlaylistPromises = [
                    this.createOrUpdateGlobalPlaylist(SYSTEM_PLAYLIST_TYPES.TOP_HITS),
                    this.createOrUpdateGlobalPlaylist(SYSTEM_PLAYLIST_TYPES.NEW_RELEASES),
                ];
                yield Promise.all(globalPlaylistPromises);
                const userPlaylists = yield db_1.default.playlist.findMany({
                    where: {
                        type: 'SYSTEM',
                        OR: [
                            {
                                name: SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.DISCOVER_WEEKLY],
                            },
                            { name: SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.NEW_RELEASES] },
                        ],
                    },
                });
                const batchSize = 10;
                for (let i = 0; i < userPlaylists.length; i += batchSize) {
                    const batch = userPlaylists.slice(i, i + batchSize);
                    yield Promise.all(batch.map((playlist) => {
                        if (playlist.name ===
                            SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.DISCOVER_WEEKLY]) {
                            return this.updateDiscoverWeeklyPlaylist(playlist.id);
                        }
                        else if (playlist.name ===
                            SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.NEW_RELEASES]) {
                            return this.updateNewReleasesPlaylist(playlist.id);
                        }
                    }));
                }
                console.log(`[SystemPlaylistService] Completed update of all system playlists`);
            }
            catch (error) {
                console.error(`[SystemPlaylistService] Error updating all system playlists:`, error);
                throw new Error(`Failed to update all system playlists: ${error}`);
            }
        });
    }
    getPlaylistDescription(playlistType) {
        switch (playlistType) {
            case SYSTEM_PLAYLIST_TYPES.TOP_HITS:
                return 'Những bài hát được yêu thích nhất hiện nay trên nền tảng Soundwave, được cập nhật tự động dựa trên hoạt động nghe nhạc của cộng đồng.';
            case SYSTEM_PLAYLIST_TYPES.NEW_RELEASES:
                return 'Những bản phát hành mới nhất và hot nhất trên nền tảng Soundwave. Cập nhật hàng tuần vào Thứ Sáu.';
            case SYSTEM_PLAYLIST_TYPES.GENRE_BASED:
                return 'Collection of tracks based on your favorite genres.';
            case SYSTEM_PLAYLIST_TYPES.MOOD_BASED:
                return 'Music tuned to your current mood.';
            default:
                return 'A playlist curated by Soundwave.';
        }
    }
    getPlaylistCoverUrl(playlistType) {
        switch (playlistType) {
            case SYSTEM_PLAYLIST_TYPES.TOP_HITS:
                return 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png';
            case SYSTEM_PLAYLIST_TYPES.NEW_RELEASES:
                return 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742551340/testAlbum/cv6rm3txh8beiln4x5u1.jpg';
            case SYSTEM_PLAYLIST_TYPES.DISCOVER_WEEKLY:
                return 'https://newjams-images.scdn.co/image/ab676477000033ad/dt/v3/discover-weekly/4O2moMBFA5GYrAnwXLtFDVEVPCc0WhFTI0aWB3b9bpDcL3CQ4dzOmLlizDEvd4Ia0o3B5vUTT-1pD72G0LDfyGH-CQi5qH97BppF-pQ82ww=/NzQ6ODA6NzBUNDAtNDAtNQ==';
            default:
                return 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png';
        }
    }
}
exports.SystemPlaylistService = SystemPlaylistService;
exports.systemPlaylistService = new SystemPlaylistService();
const generatePersonalizedPlaylist = (userId, options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name = 'Playlist được đề xuất cho bạn', description = 'Danh sách nhạc được tạo tự động dựa trên sở thích của bạn', trackCount = 20, basedOnGenre, basedOnArtist, includeTopTracks = true, includeNewReleases = false, } = options;
        const playlist = yield db_1.default.playlist.create({
            data: {
                name,
                description,
                privacy: 'PRIVATE',
                isAIGenerated: true,
                userId,
            },
        });
        const recommendedTracks = yield getRecommendedTracks(userId, trackCount, {
            basedOnGenre,
            basedOnArtist,
            includeTopTracks,
            includeNewReleases,
        });
        if (recommendedTracks.length > 0) {
            const playlistTrackData = recommendedTracks.map((track, index) => ({
                playlistId: playlist.id,
                trackId: track.id,
                trackOrder: index,
            }));
            const totalDuration = recommendedTracks.reduce((sum, track) => sum + (track.duration || 0), 0);
            yield db_1.default.$transaction([
                db_1.default.playlistTrack.createMany({
                    data: playlistTrackData,
                }),
                db_1.default.playlist.update({
                    where: { id: playlist.id },
                    data: {
                        totalTracks: recommendedTracks.length,
                        totalDuration,
                    },
                }),
            ]);
        }
        const updatedPlaylist = yield db_1.default.playlist.findUnique({
            where: { id: playlist.id },
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
        if (!updatedPlaylist) {
            throw new Error('Failed to retrieve updated playlist');
        }
        return updatedPlaylist;
    }
    catch (error) {
        console.error('Error generating personalized playlist:', error);
        throw new Error('Failed to generate personalized playlist');
    }
});
exports.generatePersonalizedPlaylist = generatePersonalizedPlaylist;
const getRecommendedTracks = (userId, limit, options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [userHistory, userLikes] = yield Promise.all([
            db_1.default.history.findMany({
                where: {
                    userId,
                    type: 'PLAY',
                    trackId: { not: null },
                },
                select: { trackId: true, playCount: true },
            }),
            db_1.default.userLikeTrack.findMany({
                where: { userId },
                select: { trackId: true },
            }),
        ]);
        const interactedTrackIds = new Set([
            ...userHistory.map((h) => h.trackId),
            ...userLikes.map((l) => l.trackId),
        ].filter(Boolean));
        const userTrackInteractions = new Map();
        userHistory.forEach((h) => {
            if (h.trackId) {
                userTrackInteractions.set(h.trackId, h.playCount || 1);
            }
        });
        userLikes.forEach((l) => {
            if (l.trackId) {
                const currentScore = userTrackInteractions.get(l.trackId) || 0;
                userTrackInteractions.set(l.trackId, currentScore + 5);
            }
        });
        const artistInteractions = new Map();
        const trackArtists = yield db_1.default.track.findMany({
            where: {
                id: { in: Array.from(interactedTrackIds) },
            },
            select: {
                id: true,
                artistId: true,
            },
        });
        trackArtists.forEach((track) => {
            if (track.artistId) {
                const interactionStrength = userTrackInteractions.get(track.id) || 0;
                const currentCount = artistInteractions.get(track.artistId) || 0;
                artistInteractions.set(track.artistId, currentCount + interactionStrength);
            }
        });
        let recommendedTracks = [];
        const totalInteractionScore = Array.from(userTrackInteractions.values()).reduce((sum, score) => sum + score, 0);
        const hasEnoughInteractions = interactedTrackIds.size >= 3;
        const hasStrongPreferences = totalInteractionScore >= 20;
        const matrixLimit = hasEnoughInteractions
            ? hasStrongPreferences
                ? Math.ceil(limit * 0.7)
                : Math.ceil(limit * 0.6)
            : Math.ceil(limit * 0.4);
        const matrixRecommendations = yield getMatrixFactorizationRecommendations(userId, Array.from(interactedTrackIds), userTrackInteractions, matrixLimit, options);
        recommendedTracks.push(...matrixRecommendations);
        if (recommendedTracks.length < limit) {
            const itemBasedLimit = hasEnoughInteractions
                ? limit - recommendedTracks.length
                : Math.ceil((limit - recommendedTracks.length) * 0.6);
            const itemBasedTracks = yield getItemBasedRecommendations(userId, Array.from(interactedTrackIds), itemBasedLimit, options);
            for (const track of itemBasedTracks) {
                if (!recommendedTracks.some((t) => t.id === track.id)) {
                    recommendedTracks.push(track);
                    if (recommendedTracks.length >= limit)
                        break;
                }
            }
        }
        if (recommendedTracks.length < limit) {
            const popularTracks = yield getPopularTracks(recommendedTracks.map((t) => t.id), limit - recommendedTracks.length, options);
            for (const track of popularTracks) {
                if (!recommendedTracks.some((t) => t.id === track.id)) {
                    recommendedTracks.push(track);
                    if (recommendedTracks.length >= limit)
                        break;
                }
            }
        }
        if (artistInteractions.size > 0 && recommendedTracks.length > 0) {
            recommendedTracks = recommendedTracks.sort((trackA, trackB) => {
                const artistScoreA = artistInteractions.get(trackA.artistId) || 0;
                const artistScoreB = artistInteractions.get(trackB.artistId) || 0;
                if (Math.abs(artistScoreA - artistScoreB) > 10) {
                    return artistScoreB - artistScoreA;
                }
                return 0;
            });
        }
        if (recommendedTracks.length > 5) {
            const topCount = Math.ceil(recommendedTracks.length * 0.3);
            const bottomCount = Math.floor(recommendedTracks.length * 0.2);
            const middleCount = recommendedTracks.length - topCount - bottomCount;
            const topTracks = recommendedTracks.slice(0, topCount);
            let middleTracks = recommendedTracks.slice(topCount, topCount + middleCount);
            const middleSegmentSize = Math.ceil(middleTracks.length / 2);
            const middleUpperTracks = shuffleArray(middleTracks.slice(0, middleSegmentSize));
            const middleLowerTracks = shuffleArray(middleTracks.slice(middleSegmentSize));
            middleTracks = [...middleUpperTracks, ...middleLowerTracks];
            const bottomTracks = recommendedTracks.slice(topCount + middleCount);
            recommendedTracks = [...topTracks, ...middleTracks, ...bottomTracks];
        }
        return recommendedTracks;
    }
    catch (error) {
        console.error('Error in getRecommendedTracks:', error);
        return getPopularTracks([], limit, options);
    }
});
function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}
const getMatrixFactorizationRecommendations = (userId, interactedTrackIds, userTrackInteractions, limit, options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const activeUsers = yield db_1.default.user.findMany({
            where: {
                history: {
                    some: {
                        type: 'PLAY',
                        playCount: { gt: 5 },
                    },
                },
            },
            select: { id: true },
        });
        const activeUserIds = activeUsers.map((u) => u.id);
        if (activeUserIds.length < 2) {
            console.log('Not enough user data for matrix factorization, using user history for simple personalization');
            const userFavoriteGenres = yield db_1.default.track.findMany({
                where: {
                    id: { in: interactedTrackIds },
                },
                include: {
                    genres: {
                        include: {
                            genre: true,
                        },
                    },
                    artist: true,
                },
            });
            const genreCounts = new Map();
            const artistCounts = new Map();
            userFavoriteGenres.forEach((track) => {
                const artistId = track.artistId;
                artistCounts.set(artistId, (artistCounts.get(artistId) || 0) +
                    (userTrackInteractions.get(track.id) || 1));
                track.genres.forEach((genreRel) => {
                    const genreId = genreRel.genre.id;
                    genreCounts.set(genreId, (genreCounts.get(genreId) || 0) +
                        (userTrackInteractions.get(track.id) || 1));
                });
            });
            const topGenreIds = [...genreCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map((entry) => entry[0]);
            const topArtistIds = [...artistCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map((entry) => entry[0]);
            if (topGenreIds.length > 0 || topArtistIds.length > 0) {
                const personalizedTracks = yield db_1.default.track.findMany({
                    where: Object.assign(Object.assign({ id: { notIn: interactedTrackIds }, isActive: true, OR: [
                            topGenreIds.length > 0
                                ? {
                                    genres: {
                                        some: {
                                            genreId: { in: topGenreIds },
                                        },
                                    },
                                }
                                : {},
                            topArtistIds.length > 0 ? { artistId: { in: topArtistIds } } : {},
                        ] }, (options.basedOnGenre
                        ? {
                            genres: {
                                some: {
                                    genre: {
                                        name: options.basedOnGenre,
                                    },
                                },
                            },
                        }
                        : {})), (options.basedOnArtist
                        ? {
                            OR: [
                                { artistId: options.basedOnArtist },
                                {
                                    featuredArtists: {
                                        some: {
                                            artistId: options.basedOnArtist,
                                        },
                                    },
                                },
                            ],
                        }
                        : {})),
                    include: {
                        artist: true,
                        album: true,
                        genres: {
                            include: {
                                genre: true,
                            },
                        },
                    },
                    orderBy: options.includeNewReleases
                        ? [{ releaseDate: 'desc' }, { playCount: 'desc' }]
                        : [{ playCount: 'desc' }],
                    take: limit,
                });
                return personalizedTracks;
            }
            return [];
        }
        const allUserHistory = yield db_1.default.history.findMany({
            where: {
                userId: { in: [...activeUserIds, userId] },
                type: 'PLAY',
                trackId: { not: null },
            },
            select: {
                userId: true,
                trackId: true,
                playCount: true,
            },
        });
        const allUserLikes = yield db_1.default.userLikeTrack.findMany({
            where: {
                userId: { in: [...activeUserIds, userId] },
            },
            select: {
                userId: true,
                trackId: true,
            },
        });
        const userIdToIndex = new Map();
        const trackIdToIndex = new Map();
        const indexToTrackId = new Map();
        const allTrackIds = new Set();
        allUserHistory.forEach((h) => h.trackId && allTrackIds.add(h.trackId));
        allUserLikes.forEach((l) => l.trackId && allTrackIds.add(l.trackId));
        activeUserIds.forEach((id, index) => {
            userIdToIndex.set(id, index);
        });
        if (!userIdToIndex.has(userId)) {
            userIdToIndex.set(userId, activeUserIds.length);
        }
        Array.from(allTrackIds).forEach((id, index) => {
            trackIdToIndex.set(id, index);
            indexToTrackId.set(index, id);
        });
        const userCount = userIdToIndex.size;
        const trackCount = trackIdToIndex.size;
        if (trackCount === 0) {
            return [];
        }
        const interactionMatrix = new ml_matrix_1.Matrix(userCount, trackCount);
        allUserHistory.forEach((history) => {
            if (history.trackId) {
                const userIndex = userIdToIndex.get(history.userId);
                const trackIndex = trackIdToIndex.get(history.trackId);
                if (userIndex !== undefined && trackIndex !== undefined) {
                    const currentValue = interactionMatrix.get(userIndex, trackIndex);
                    interactionMatrix.set(userIndex, trackIndex, currentValue + (history.playCount || 1));
                }
            }
        });
        allUserLikes.forEach((like) => {
            if (like.trackId) {
                const userIndex = userIdToIndex.get(like.userId);
                const trackIndex = trackIdToIndex.get(like.trackId);
                if (userIndex !== undefined && trackIndex !== undefined) {
                    const currentValue = interactionMatrix.get(userIndex, trackIndex);
                    interactionMatrix.set(userIndex, trackIndex, currentValue + 3);
                }
            }
        });
        const normalizedMatrix = normalizeMatrix(interactionMatrix);
        const itemSimilarityMatrix = calculateItemSimilarity(normalizedMatrix);
        const userIndex = userIdToIndex.get(userId);
        if (userIndex === undefined) {
            return [];
        }
        const userVector = normalizedMatrix.getRow(userIndex);
        const predictedScores = [];
        for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
            let score = 0;
            for (let j = 0; j < trackCount; j++) {
                score += userVector[j] * itemSimilarityMatrix.get(j, trackIndex);
            }
            predictedScores.push(score);
        }
        const recommendations = [];
        for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
            const trackId = indexToTrackId.get(trackIndex);
            if (trackId && !interactedTrackIds.includes(trackId)) {
                const score = predictedScores[trackIndex];
                if (score > 0) {
                    recommendations.push({ trackId, score });
                }
            }
        }
        recommendations.sort((a, b) => b.score - a.score);
        const topRecommendedTrackIds = recommendations
            .slice(0, limit * 2)
            .map((rec) => rec.trackId);
        if (topRecommendedTrackIds.length === 0) {
            return [];
        }
        const whereClause = {
            id: { in: topRecommendedTrackIds },
            isActive: true,
        };
        if (options.basedOnGenre) {
            whereClause.genres = {
                some: {
                    genre: {
                        name: options.basedOnGenre,
                    },
                },
            };
        }
        if (options.basedOnArtist) {
            whereClause.OR = [
                { artistId: options.basedOnArtist },
                {
                    featuredArtists: {
                        some: {
                            artistId: options.basedOnArtist,
                        },
                    },
                },
            ];
        }
        const recommendedTracks = yield db_1.default.track.findMany({
            where: whereClause,
            include: {
                artist: true,
                album: true,
                genres: {
                    include: {
                        genre: true,
                    },
                },
            },
            take: limit,
        });
        return recommendedTracks;
    }
    catch (error) {
        console.error('Error in getMatrixFactorizationRecommendations:', error);
        return [];
    }
});
const normalizeMatrix = (matrix) => {
    const normalizedMatrix = matrix.clone();
    const rows = normalizedMatrix.rows;
    const columns = normalizedMatrix.columns;
    for (let i = 0; i < rows; i++) {
        const rowValues = normalizedMatrix.getRow(i);
        const sum = rowValues.reduce((acc, val) => acc + val, 0);
        if (sum > 0) {
            for (let j = 0; j < columns; j++) {
                const currentValue = normalizedMatrix.get(i, j);
                const normalizedValue = currentValue / sum;
                normalizedMatrix.set(i, j, normalizedValue);
            }
        }
    }
    return normalizedMatrix;
};
const calculateItemSimilarity = (matrix) => {
    const transposedMatrix = matrix.transpose();
    const itemCount = transposedMatrix.rows;
    const similarityMatrix = new ml_matrix_1.Matrix(itemCount, itemCount);
    for (let i = 0; i < itemCount; i++) {
        for (let j = 0; j < itemCount; j++) {
            if (i === j) {
                similarityMatrix.set(i, j, 1);
            }
            else {
                const itemVectorI = transposedMatrix.getRow(i);
                const itemVectorJ = transposedMatrix.getRow(j);
                const similarity = cosineSimilarity(itemVectorI, itemVectorJ);
                similarityMatrix.set(i, j, similarity);
            }
        }
    }
    return similarityMatrix;
};
const cosineSimilarity = (vectorA, vectorB) => {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
        magnitudeA += vectorA[i] * vectorA[i];
        magnitudeB += vectorB[i] * vectorB[i];
    }
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }
    return dotProduct / (magnitudeA * magnitudeB);
};
const getItemBasedRecommendations = (userId, interactedTrackIds, limit, options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (interactedTrackIds.length === 0) {
            return [];
        }
        const userGenres = yield db_1.default.trackGenre.findMany({
            where: {
                trackId: { in: interactedTrackIds },
            },
            include: {
                genre: true,
            },
        });
        const genreCounts = new Map();
        userGenres.forEach((trackGenre) => {
            const genreId = trackGenre.genreId;
            genreCounts.set(genreId, (genreCounts.get(genreId) || 0) + 1);
        });
        const topGenreIds = [...genreCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map((entry) => entry[0]);
        if (topGenreIds.length === 0) {
            return [];
        }
        const userArtists = yield db_1.default.track.findMany({
            where: {
                id: { in: interactedTrackIds },
            },
            select: {
                artistId: true,
                featuredArtists: {
                    select: {
                        artistId: true,
                    },
                },
            },
        });
        const artistCounts = new Map();
        userArtists.forEach((track) => {
            if (track.artistId) {
                artistCounts.set(track.artistId, (artistCounts.get(track.artistId) || 0) + 2);
            }
            track.featuredArtists.forEach((featured) => {
                if (featured.artistId) {
                    artistCounts.set(featured.artistId, (artistCounts.get(featured.artistId) || 0) + 1);
                }
            });
        });
        const topArtistIds = [...artistCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map((entry) => entry[0]);
        let similarTracks = yield db_1.default.track.findMany({
            where: Object.assign(Object.assign({ id: { notIn: interactedTrackIds }, isActive: true, OR: [
                    {
                        genres: {
                            some: {
                                genreId: { in: topGenreIds },
                            },
                        },
                    },
                    { artistId: { in: topArtistIds } },
                    {
                        featuredArtists: {
                            some: {
                                artistId: { in: topArtistIds },
                            },
                        },
                    },
                ] }, (options.basedOnGenre
                ? {
                    genres: {
                        some: {
                            genre: {
                                name: options.basedOnGenre,
                            },
                        },
                    },
                }
                : {})), (options.basedOnArtist
                ? {
                    OR: [
                        { artistId: options.basedOnArtist },
                        {
                            featuredArtists: {
                                some: {
                                    artistId: options.basedOnArtist,
                                },
                            },
                        },
                    ],
                }
                : {})),
            include: {
                artist: true,
                album: true,
                genres: {
                    include: {
                        genre: true,
                    },
                },
            },
            orderBy: [{ playCount: 'desc' }],
            take: limit,
        });
        return similarTracks;
    }
    catch (error) {
        console.error('Error in getItemBasedRecommendations:', error);
        return [];
    }
});
const getPopularTracks = (excludedTrackIds, limit, options) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const whereClause = {
            id: { notIn: excludedTrackIds },
            isActive: true,
        };
        if (options.basedOnGenre) {
            whereClause.genres = {
                some: {
                    genre: {
                        name: options.basedOnGenre,
                    },
                },
            };
        }
        if (options.basedOnArtist) {
            whereClause.OR = [
                { artistId: options.basedOnArtist },
                {
                    featuredArtists: {
                        some: {
                            artistId: options.basedOnArtist,
                        },
                    },
                },
            ];
        }
        let orderBy = [{ playCount: 'desc' }];
        if (options.includeNewReleases) {
            orderBy = [{ releaseDate: 'desc' }, { playCount: 'desc' }];
        }
        const popularTracks = yield db_1.default.track.findMany({
            where: whereClause,
            include: {
                artist: true,
                album: true,
                genres: {
                    include: {
                        genre: true,
                    },
                },
            },
            orderBy,
            take: limit,
        });
        return popularTracks;
    }
    catch (error) {
        console.error('Error in getPopularTracks:', error);
        return [];
    }
});
const analyzeUserTaste = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const playHistory = yield db_1.default.history.findMany({
            where: {
                userId,
                type: 'PLAY',
                trackId: { not: null },
            },
            include: {
                track: {
                    include: {
                        genres: {
                            include: {
                                genre: true,
                            },
                        },
                        artist: true,
                    },
                },
            },
        });
        const likedTracks = yield db_1.default.userLikeTrack.findMany({
            where: {
                userId,
            },
            include: {
                track: {
                    include: {
                        genres: {
                            include: {
                                genre: true,
                            },
                        },
                        artist: true,
                    },
                },
            },
        });
        const genreCounts = new Map();
        const artistCounts = new Map();
        playHistory.forEach((history) => {
            var _a, _b;
            if ((_a = history.track) === null || _a === void 0 ? void 0 : _a.genres) {
                history.track.genres.forEach((trackGenre) => {
                    const genreName = trackGenre.genre.name;
                    genreCounts.set(genreName, (genreCounts.get(genreName) || 0) + 1);
                });
                const artistName = ((_b = history.track.artist) === null || _b === void 0 ? void 0 : _b.artistName) || '';
                if (artistName) {
                    artistCounts.set(artistName, (artistCounts.get(artistName) || 0) + 1);
                }
            }
        });
        likedTracks.forEach((like) => {
            var _a, _b;
            if ((_a = like.track) === null || _a === void 0 ? void 0 : _a.genres) {
                like.track.genres.forEach((trackGenre) => {
                    const genreName = trackGenre.genre.name;
                    genreCounts.set(genreName, (genreCounts.get(genreName) || 0) + 2);
                });
                const artistName = ((_b = like.track.artist) === null || _b === void 0 ? void 0 : _b.artistName) || '';
                if (artistName) {
                    artistCounts.set(artistName, (artistCounts.get(artistName) || 0) + 2);
                }
            }
        });
        const favoriteGenres = [...genreCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map((entry) => entry[0]);
        const favoriteArtists = [...artistCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map((entry) => entry[0]);
        return {
            favoriteGenres,
            favoriteArtists,
            totalTracksListened: playHistory.length,
            totalLikedTracks: likedTracks.length,
        };
    }
    catch (error) {
        console.error('Error analyzing user taste:', error);
        throw new Error('Failed to analyze user listening habits');
    }
});
exports.analyzeUserTaste = analyzeUserTaste;
const generateGlobalRecommendedPlaylist = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 20) {
    try {
        console.log('[PlaylistService] Starting global recommended playlist generation, limit:', limit);
        console.log('[PlaylistService] Fetching user interactions data...');
        const [userHistories, userLikes, allTracks] = yield Promise.all([
            db_1.default.history.findMany({
                where: {
                    type: 'PLAY',
                    trackId: { not: null },
                    playCount: { gt: 0 },
                },
                include: {
                    track: {
                        include: {
                            genres: {
                                include: {
                                    genre: true,
                                },
                            },
                            artist: true,
                        },
                    },
                },
            }),
            db_1.default.userLikeTrack.findMany({
                where: {},
                include: {
                    track: {
                        include: {
                            genres: {
                                include: {
                                    genre: true,
                                },
                            },
                            artist: true,
                        },
                    },
                },
            }),
            db_1.default.track.findMany({
                where: {
                    isActive: true,
                },
                include: {
                    genres: {
                        include: {
                            genre: true,
                        },
                    },
                    artist: true,
                },
            }),
        ]);
        console.log('[PlaylistService] Data fetched:', 'userHistories:', userHistories.length, 'userLikes:', userLikes.length, 'allTracks:', allTracks.length);
        if (allTracks.length === 0) {
            console.log('[PlaylistService] No active tracks found in the database');
            return {
                name: '',
                description: '',
                tracks: [],
                totalTracks: 0,
                totalDuration: 0,
            };
        }
        console.log('[PlaylistService] Calculating track scores...');
        const trackScores = new Map();
        allTracks.forEach((track) => {
            trackScores.set(track.id, {
                score: 0,
                playCount: 0,
                likeCount: 0,
                completionRate: 0.5,
                lastPlayed: new Date(0),
                genres: new Set(track.genres.map((g) => g.genre.name)),
                artistId: track.artistId,
                track,
            });
        });
        console.log('[PlaylistService] Processing play history...');
        userHistories.forEach((history) => {
            if (!history.track)
                return;
            const trackInfo = trackScores.get(history.trackId);
            if (!trackInfo)
                return;
            const daysAgo = (Date.now() - history.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            const timeDecayFactor = Math.exp(-0.1 * daysAgo);
            const completion = history.duration && history.track.duration
                ? Math.min(history.duration / history.track.duration, 1)
                : 0.5;
            trackInfo.playCount += history.playCount || 1;
            if (history.duration && history.track.duration) {
                trackInfo.completionRate =
                    (trackInfo.completionRate * (trackInfo.playCount - 1) + completion) /
                        trackInfo.playCount;
            }
            trackInfo.score +=
                (history.playCount || 1) * timeDecayFactor * (0.5 + 0.5 * completion);
            trackInfo.lastPlayed = new Date(Math.max(trackInfo.lastPlayed.getTime(), history.createdAt.getTime()));
        });
        allTracks.forEach((track) => {
            const trackInfo = trackScores.get(track.id);
            if (trackInfo) {
                trackInfo.playCount = Math.max(trackInfo.playCount, track.playCount);
                trackInfo.score += track.playCount;
            }
        });
        console.log('[PlaylistService] Processing likes...');
        userLikes.forEach((like) => {
            if (!like.track)
                return;
            const trackInfo = trackScores.get(like.trackId);
            if (!trackInfo)
                return;
            const daysAgo = (Date.now() - like.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            const timeDecayFactor = Math.exp(-0.05 * daysAgo);
            trackInfo.likeCount += 1;
            trackInfo.score += 3 * timeDecayFactor;
        });
        console.log('[PlaylistService] Track scores summary:');
        const trackScoresList = Array.from(trackScores.entries());
        trackScoresList
            .sort((a, b) => b[1].score - a[1].score)
            .slice(0, 10)
            .forEach(([trackId, info]) => {
            console.log(`Track: ${info.track.title} - PlayCount: ${info.playCount} - LikeCount: ${info.likeCount} - Score: ${info.score.toFixed(2)} - CompletionRate: ${info.completionRate.toFixed(2)}`);
        });
        console.log('[PlaylistService] Applying quality filters...');
        const popularity = {
            highPlayCount: 10,
            highLikeCount: 3,
            highScore: 20,
            mediumPlayCount: 5,
            mediumLikeCount: 2,
            mediumScore: 10,
            minPlayCount: 1,
            minLikeCount: 1,
        };
        let qualityTracks = trackScoresList.filter(([_, info]) => info.playCount >= popularity.highPlayCount ||
            info.likeCount >= popularity.highLikeCount ||
            info.score >= popularity.highScore);
        console.log('[PlaylistService] Tracks after high quality filter:', qualityTracks.length);
        if (qualityTracks.length < Math.min(limit, 10)) {
            qualityTracks = trackScoresList.filter(([_, info]) => info.playCount >= popularity.mediumPlayCount ||
                info.likeCount >= popularity.mediumLikeCount ||
                info.score >= popularity.mediumScore);
            console.log('[PlaylistService] Tracks after medium quality filter:', qualityTracks.length);
        }
        if (qualityTracks.length < Math.min(limit / 2, 5)) {
            qualityTracks = trackScoresList.filter(([_, info]) => info.playCount >= popularity.minPlayCount ||
                info.likeCount >= popularity.minLikeCount);
            console.log('[PlaylistService] Tracks after minimum quality filter:', qualityTracks.length);
        }
        qualityTracks.sort((a, b) => b[1].score - a[1].score);
        qualityTracks.slice(0, 5).forEach(([_, info]) => {
            console.log(`After filter - Track: ${info.track.title} - Score: ${info.score.toFixed(2)} - PlayCount: ${info.playCount} - LikeCount: ${info.likeCount}`);
        });
        if (qualityTracks.length === 0) {
            console.log('[PlaylistService] No tracks meet quality criteria, using most played tracks instead...');
            const topTracks = trackScoresList
                .sort((a, b) => b[1].playCount - a[1].playCount)
                .slice(0, limit);
            console.log('[PlaylistService] Tracks after using play count only:', topTracks.length);
            if (topTracks.length === 0) {
                console.log('[PlaylistService] No tracks with plays, using random active tracks fallback');
                if (allTracks.length > 0) {
                    console.log('[PlaylistService] Using random tracks fallback');
                    const shuffledTracks = [...allTracks].sort(() => 0.5 - Math.random());
                    const randomTracks = shuffledTracks.slice(0, Math.min(limit, shuffledTracks.length));
                    const playlist = {
                        name: 'Soundwave Hits: Trending Right Now',
                        description: 'Những bài hát được yêu thích nhất hiện nay trên nền tảng Soundwave, được cập nhật tự động dựa trên hoạt động nghe nhạc của cộng đồng.',
                        tracks: randomTracks,
                        isGlobal: true,
                        totalTracks: randomTracks.length,
                        totalDuration: randomTracks.reduce((sum, track) => sum + (track.duration || 0), 0),
                        coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png',
                    };
                    console.log('[PlaylistService] Generated playlist with random tracks - count:', randomTracks.length);
                    return playlist;
                }
                console.log('[PlaylistService] No tracks after all fallbacks, returning empty playlist');
                return {
                    name: '',
                    description: '',
                    tracks: [],
                    totalTracks: 0,
                    totalDuration: 0,
                };
            }
            const finalTracks = topTracks.map(([_, info]) => info.track);
            const playlist = {
                name: 'Soundwave Hits: Trending Right Now',
                description: 'Những bài hát được yêu thích nhất hiện nay trên nền tảng Soundwave, được cập nhật tự động dựa trên hoạt động nghe nhạc của cộng đồng.',
                tracks: finalTracks,
                isGlobal: true,
                totalTracks: finalTracks.length,
                totalDuration: finalTracks.reduce((sum, track) => sum + (track.duration || 0), 0),
                coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png',
            };
            console.log('[PlaylistService] Generated playlist with relaxed criteria - tracks:', finalTracks.length);
            return playlist;
        }
        console.log('[PlaylistService] Creating diverse playlist...');
        const selectedTracks = new Set();
        const selectedGenres = new Map();
        const selectedArtists = new Map();
        const finalTracks = [];
        for (const [trackId, info] of qualityTracks) {
            if (finalTracks.length >= limit)
                break;
            if (selectedTracks.has(trackId))
                continue;
            const artistCount = selectedArtists.get(info.artistId) || 0;
            if (artistCount >= 3)
                continue;
            let genreOk = true;
            for (const genre of info.genres) {
                const genreCount = selectedGenres.get(genre) || 0;
                if (genreCount >= 5) {
                    genreOk = false;
                    break;
                }
            }
            if (!genreOk)
                continue;
            selectedTracks.add(trackId);
            selectedArtists.set(info.artistId, artistCount + 1);
            info.genres.forEach((genre) => {
                selectedGenres.set(genre, (selectedGenres.get(genre) || 0) + 1);
            });
            finalTracks.push(info.track);
        }
        console.log('[PlaylistService] Final tracks selected:', finalTracks.length);
        console.log('[PlaylistService] Selected tracks:');
        finalTracks.slice(0, 5).forEach((track) => {
            console.log(`- ${track.title} (PlayCount: ${track.playCount})`);
        });
        const playlist = {
            name: 'Soundwave Hits: Trending Right Now',
            description: 'Những bài hát được yêu thích nhất hiện nay trên nền tảng Soundwave, được cập nhật tự động dựa trên hoạt động nghe nhạc của cộng đồng.',
            tracks: finalTracks,
            isGlobal: true,
            totalTracks: finalTracks.length,
            totalDuration: finalTracks.reduce((sum, track) => sum + (track.duration || 0), 0),
            coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png',
        };
        console.log('[PlaylistService] Generated playlist - tracks:', finalTracks.length);
        return playlist;
    }
    catch (error) {
        console.error('[PlaylistService] Error generating global recommended playlist:', error);
        throw new Error('Failed to generate global recommended playlist');
    }
});
exports.generateGlobalRecommendedPlaylist = generateGlobalRecommendedPlaylist;
//# sourceMappingURL=playlist.service.js.map