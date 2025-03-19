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
exports.generateGlobalRecommendedPlaylist = exports.analyzeUserTaste = exports.generatePersonalizedPlaylist = void 0;
const db_1 = __importDefault(require("../config/db"));
const ml_matrix_1 = require("ml-matrix");
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
        for (let i = 0; i < recommendedTracks.length; i++) {
            yield db_1.default.playlistTrack.create({
                data: {
                    playlistId: playlist.id,
                    trackId: recommendedTracks[i].id,
                    trackOrder: i,
                },
            });
        }
        const totalDuration = recommendedTracks.reduce((sum, track) => sum + (track.duration || 0), 0);
        const updatedPlaylist = yield db_1.default.playlist.update({
            where: { id: playlist.id },
            data: {
                totalTracks: recommendedTracks.length,
                totalDuration,
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
        const userHistory = yield db_1.default.history.findMany({
            where: {
                userId,
                type: 'PLAY',
                trackId: { not: null },
            },
            select: { trackId: true, playCount: true },
        });
        const userLikes = yield db_1.default.userLikeTrack.findMany({
            where: { userId },
            select: { trackId: true },
        });
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
                userTrackInteractions.set(l.trackId, currentScore + 3);
            }
        });
        let recommendedTracks = [];
        const matrixRecommendations = yield getMatrixFactorizationRecommendations(userId, Array.from(interactedTrackIds), userTrackInteractions, Math.ceil(limit * 0.6), options);
        recommendedTracks.push(...matrixRecommendations);
        if (recommendedTracks.length < limit) {
            const itemBasedTracks = yield getItemBasedRecommendations(userId, Array.from(interactedTrackIds), limit - recommendedTracks.length, options);
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
        return recommendedTracks;
    }
    catch (error) {
        console.error('Error in getRecommendedTracks:', error);
        return getPopularTracks([], limit, options);
    }
});
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
        if (activeUserIds.length < 5) {
            console.log('Not enough user data for matrix factorization');
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
        const userHistories = yield db_1.default.history.findMany({
            where: {
                type: 'PLAY',
                trackId: { not: null },
                playCount: { gt: 0 },
            },
            select: {
                userId: true,
                trackId: true,
                playCount: true,
            },
        });
        const userLikes = yield db_1.default.userLikeTrack.findMany({
            select: {
                userId: true,
                trackId: true,
            },
        });
        const tracks = new Map();
        userHistories.forEach((history) => {
            if (history.trackId) {
                const trackId = history.trackId;
                const trackInfo = tracks.get(trackId) || { count: 0, score: 0 };
                trackInfo.count += 1;
                trackInfo.score += history.playCount || 1;
                tracks.set(trackId, trackInfo);
            }
        });
        userLikes.forEach((like) => {
            if (like.trackId) {
                const trackId = like.trackId;
                const trackInfo = tracks.get(trackId) || { count: 0, score: 0 };
                trackInfo.count += 1;
                trackInfo.score += 3;
                tracks.set(trackId, trackInfo);
            }
        });
        const sortedTracks = Array.from(tracks.entries())
            .sort((a, b) => {
            if (b[1].score !== a[1].score) {
                return b[1].score - a[1].score;
            }
            return b[1].count - a[1].count;
        })
            .slice(0, limit)
            .map((entry) => entry[0]);
        const recommendedTracks = yield db_1.default.track.findMany({
            where: {
                id: { in: sortedTracks },
                isActive: true,
            },
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
        const playlist = {
            name: 'Soundwave Hits: Trending Right Now',
            description: 'Những bài hát được yêu thích nhất hiện nay trên nền tảng Soundwave',
            tracks: recommendedTracks,
            isGlobal: true,
            totalTracks: recommendedTracks.length,
            totalDuration: recommendedTracks.reduce((sum, track) => sum + (track.duration || 0), 0),
            coverUrl: 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png',
        };
        return playlist;
    }
    catch (error) {
        console.error('Error generating global recommended playlist:', error);
        throw new Error('Failed to generate global recommended playlist');
    }
});
exports.generateGlobalRecommendedPlaylist = generateGlobalRecommendedPlaylist;
//# sourceMappingURL=playlist.service.js.map