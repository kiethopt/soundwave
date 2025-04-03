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
exports.generateDefaultPlaylistForNewUser = exports.createAIGeneratedPlaylist = exports.generateAIPlaylist = void 0;
const generative_ai_1 = require("@google/generative-ai");
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const client_1 = require("@prisma/client");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
}
const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: "You are an expert music curator specializing in personalization. Your primary goal is to create highly personalized playlists that closely match each user's demonstrated preferences. PRIORITIZE tracks from artists the user has already listened to or liked. Only include tracks from other artists if they are extremely similar in style and genre to the user's favorites. Analyze the provided listening history and liked tracks carefully, identifying patterns in genres, artists, and moods. Return ONLY a valid JSON array of track IDs, without any duplicates or explanations. The tracks should strongly reflect the user's taste, with at least 70% being from artists they've shown interest in.",
});
console.log(`[AI] Using Gemini model: ${modelName}`);
const generateAIPlaylist = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, options = {}) {
    try {
        console.log(`[AI] Generating playlist for user ${userId} with options:`, options);
        const trackCount = options.trackCount || 10;
        const userHistory = yield db_1.default.history.findMany({
            where: {
                userId,
                type: 'PLAY',
            },
            include: {
                track: {
                    select: prisma_selects_1.trackSelect,
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: 30,
        });
        if (userHistory.length === 0) {
            console.log(`[AI] User ${userId} has no listening history. Using default playlist.`);
            return (0, exports.generateDefaultPlaylistForNewUser)(userId);
        }
        const userLikedTracks = yield db_1.default.userLikeTrack.findMany({
            where: { userId },
            include: {
                track: {
                    select: prisma_selects_1.trackSelect,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 30,
        });
        const preferredArtistIds = new Set();
        const preferredGenreIds = new Set();
        const artistPlayCounts = {};
        const artistLikeCounts = {};
        userHistory.forEach((history) => {
            var _a, _b;
            if ((_a = history.track) === null || _a === void 0 ? void 0 : _a.artistId) {
                preferredArtistIds.add(history.track.artistId);
                const artistId = history.track.artistId;
                artistPlayCounts[artistId] =
                    (artistPlayCounts[artistId] || 0) + (history.playCount || 1);
            }
            (_b = history.track) === null || _b === void 0 ? void 0 : _b.genres.forEach((genreRel) => {
                preferredGenreIds.add(genreRel.genre.id);
            });
        });
        userLikedTracks.forEach((like) => {
            var _a, _b;
            if ((_a = like.track) === null || _a === void 0 ? void 0 : _a.artistId) {
                preferredArtistIds.add(like.track.artistId);
                const artistId = like.track.artistId;
                artistLikeCounts[artistId] = (artistLikeCounts[artistId] || 0) + 1;
            }
            (_b = like.track) === null || _b === void 0 ? void 0 : _b.genres.forEach((genreRel) => {
                preferredGenreIds.add(genreRel.genre.id);
            });
        });
        const artistPreferenceScore = {};
        Array.from(preferredArtistIds).forEach((artistId) => {
            artistPreferenceScore[artistId] =
                (artistPlayCounts[artistId] || 0) +
                    (artistLikeCounts[artistId] || 0) * 2;
        });
        const sortedPreferredArtists = Array.from(preferredArtistIds).sort((a, b) => (artistPreferenceScore[b] || 0) - (artistPreferenceScore[a] || 0));
        console.log(`[AI] User has shown interest in ${preferredArtistIds.size} artists and ${preferredGenreIds.size} genres`);
        if (options.basedOnArtist) {
            const artistByName = yield db_1.default.artistProfile.findFirst({
                where: {
                    artistName: {
                        contains: options.basedOnArtist,
                        mode: 'insensitive',
                    },
                },
                select: { id: true },
            });
            if (artistByName) {
                preferredArtistIds.add(artistByName.id);
                sortedPreferredArtists.unshift(artistByName.id);
                console.log(`[AI] Adding specified artist to preferences: ${options.basedOnArtist}`);
            }
        }
        if (options.basedOnGenre) {
            const genreByName = yield db_1.default.genre.findFirst({
                where: {
                    name: {
                        contains: options.basedOnGenre,
                        mode: 'insensitive',
                    },
                },
                select: { id: true },
            });
            if (genreByName) {
                preferredGenreIds.add(genreByName.id);
                console.log(`[AI] Adding specified genre to preferences: ${options.basedOnGenre}`);
            }
        }
        const whereClause = { isActive: true };
        if (preferredArtistIds.size > 0 || preferredGenreIds.size > 0) {
            whereClause.OR = [];
            if (preferredArtistIds.size > 0) {
                whereClause.OR.push({
                    artistId: { in: Array.from(preferredArtistIds) },
                });
            }
            if (preferredGenreIds.size > 0) {
                whereClause.OR.push({
                    genres: {
                        some: {
                            genreId: { in: Array.from(preferredGenreIds) },
                        },
                    },
                });
            }
        }
        if (options.basedOnGenre && !preferredGenreIds.size) {
            whereClause.genres = {
                some: {
                    genre: {
                        name: {
                            contains: options.basedOnGenre,
                            mode: 'insensitive',
                        },
                    },
                },
            };
        }
        if (options.basedOnArtist && !preferredArtistIds.size) {
            whereClause.artist = {
                artistName: {
                    contains: options.basedOnArtist,
                    mode: 'insensitive',
                },
            };
        }
        const availableTracks = yield db_1.default.track.findMany({
            where: whereClause,
            select: prisma_selects_1.trackSelect,
            orderBy: [
                {
                    artist: {
                        artistName: preferredArtistIds.size > 0 ? 'asc' : undefined,
                    },
                },
                { playCount: 'desc' },
            ],
            take: 150,
        });
        console.log(`[AI] Found ${availableTracks.length} potential tracks for recommendation`);
        const preferredArtistNames = new Set();
        userHistory.forEach((h) => {
            var _a, _b;
            if ((_b = (_a = h.track) === null || _a === void 0 ? void 0 : _a.artist) === null || _b === void 0 ? void 0 : _b.artistName) {
                preferredArtistNames.add(h.track.artist.artistName);
            }
        });
        userLikedTracks.forEach((l) => {
            var _a, _b;
            if ((_b = (_a = l.track) === null || _a === void 0 ? void 0 : _a.artist) === null || _b === void 0 ? void 0 : _b.artistName) {
                preferredArtistNames.add(l.track.artist.artistName);
            }
        });
        const context = {
            user: {
                id: userId,
                preferredArtists: Array.from(preferredArtistNames),
                listeningHistory: userHistory.map((h) => {
                    var _a, _b, _c, _d, _e;
                    return ({
                        trackId: (_a = h.track) === null || _a === void 0 ? void 0 : _a.id,
                        trackName: (_b = h.track) === null || _b === void 0 ? void 0 : _b.title,
                        artistName: (_d = (_c = h.track) === null || _c === void 0 ? void 0 : _c.artist) === null || _d === void 0 ? void 0 : _d.artistName,
                        playCount: h.playCount || 1,
                        genres: (_e = h.track) === null || _e === void 0 ? void 0 : _e.genres.map((g) => g.genre.name),
                    });
                }),
                likedTracks: userLikedTracks.map((lt) => {
                    var _a, _b, _c, _d, _e;
                    return ({
                        trackId: (_a = lt.track) === null || _a === void 0 ? void 0 : _a.id,
                        trackName: (_b = lt.track) === null || _b === void 0 ? void 0 : _b.title,
                        artistName: (_d = (_c = lt.track) === null || _c === void 0 ? void 0 : _c.artist) === null || _d === void 0 ? void 0 : _d.artistName,
                        genres: (_e = lt.track) === null || _e === void 0 ? void 0 : _e.genres.map((g) => g.genre.name),
                    });
                }),
            },
            availableTracks: availableTracks.map((track) => {
                var _a, _b;
                return ({
                    id: track.id,
                    title: track.title,
                    artist: (_a = track.artist) === null || _a === void 0 ? void 0 : _a.artistName,
                    album: (_b = track.album) === null || _b === void 0 ? void 0 : _b.title,
                    duration: track.duration,
                    genres: track.genres.map((g) => g.genre.name),
                    playCount: track.playCount,
                    releaseDate: track.releaseDate,
                });
            }),
            preferences: {
                trackCount,
                mood: options.basedOnMood,
                genre: options.basedOnGenre,
                artist: options.basedOnArtist,
            },
        };
        const promptText = `Tạo một danh sách phát cá nhân hóa cho người dùng này tập trung chủ yếu vào sở thích đã thể hiện của họ.

Thông tin người dùng:
- Nghệ sĩ ưa thích: ${Array.from(preferredArtistNames).join(', ') || 'Không có chỉ định'}
- Lịch sử nghe gần đây: ${userHistory
            .map((h) => { var _a; return ((_a = h.track) === null || _a === void 0 ? void 0 : _a.title) || ''; })
            .filter(Boolean)
            .join(', ')}
- Bài hát đã thích: ${userLikedTracks
            .map((l) => { var _a; return ((_a = l.track) === null || _a === void 0 ? void 0 : _a.title) || ''; })
            .filter(Boolean)
            .join(', ')}

Dữ liệu ngữ cảnh đầy đủ:
${JSON.stringify(context, null, 2)}

Hướng dẫn quan trọng:
1. PHẢI ưu tiên mạnh mẽ các bài hát từ nghệ sĩ mà người dùng đã nghe hoặc thích (${Array.from(preferredArtistNames).join(', ')}).
2. Ít nhất 70% bài hát phải đến từ các nghệ sĩ mà người dùng đã thể hiện sự quan tâm.
3. Chỉ bao gồm bài hát từ nghệ sĩ mà người dùng chưa thể hiện sự quan tâm nếu chúng rất giống với sở thích của người dùng.
4. Xem xét sở thích của người dùng về tâm trạng (${options.basedOnMood || 'bất kỳ'}), thể loại (${options.basedOnGenre || 'bất kỳ'}), và nghệ sĩ (${options.basedOnArtist || 'dựa trên lịch sử'}).
5. Chọn chính xác ${trackCount} bài hát và chỉ trả về mảng ID bài hát JSON hợp lệ.`;
        console.log(`[AI] Gửi lời nhắc cải tiến đến model Gemini ${modelName}`);
        const result = yield model.generateContent({
            contents: [{ role: 'user', parts: [{ text: promptText }] }],
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
        });
        const response = result.response;
        const responseText = response.text();
        let trackIds = [];
        try {
            const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
            trackIds = JSON.parse(cleanedResponse);
            const validTrackIds = yield db_1.default.track.findMany({
                where: {
                    id: { in: trackIds },
                    isActive: true,
                },
                select: { id: true, artistId: true },
            });
            trackIds = validTrackIds.map((t) => t.id);
            if (preferredArtistIds.size > 0) {
                const tracksFromPreferredArtists = validTrackIds.filter((t) => preferredArtistIds.has(t.artistId)).length;
                const preferredArtistPercentage = (tracksFromPreferredArtists / trackIds.length) * 100;
                console.log(`[AI] Initial tracks from preferred artists: ${preferredArtistPercentage.toFixed(1)}%`);
                if (preferredArtistPercentage < 70 && trackIds.length > 0) {
                    console.log(`[AI] Need to increase preferred artist percentage (currently ${preferredArtistPercentage.toFixed(1)}%)`);
                }
            }
        }
        catch (error) {
            console.error('[AI] Error parsing Gemini response:', error);
            console.error('[AI] Raw response:', responseText);
            throw new Error('Failed to parse AI-generated playlist recommendations');
        }
        if (trackIds.length < trackCount || preferredArtistIds.size > 0) {
            console.log(`[AI] Adjusting playlist to ensure at least 70% from preferred artists`);
            const currentTracks = yield db_1.default.track.findMany({
                where: {
                    id: { in: trackIds },
                    isActive: true,
                },
                select: {
                    id: true,
                    artistId: true,
                    title: true,
                    artist: {
                        select: { artistName: true },
                    },
                },
            });
            const tracksFromPreferredArtists = currentTracks.filter((t) => preferredArtistIds.has(t.artistId));
            const tracksFromOtherArtists = currentTracks.filter((t) => !preferredArtistIds.has(t.artistId));
            const preferredArtistPercentage = (tracksFromPreferredArtists.length / (currentTracks.length || 1)) * 100;
            if (preferredArtistPercentage < 70 && preferredArtistIds.size > 0) {
                const desiredPreferredTracks = Math.ceil(trackCount * 0.7);
                const additionalPreferredTracksNeeded = Math.max(0, desiredPreferredTracks - tracksFromPreferredArtists.length);
                console.log(`[AI] Need ${additionalPreferredTracksNeeded} more tracks from preferred artists to reach 70%`);
                if (additionalPreferredTracksNeeded > 0) {
                    const additionalPreferredTracks = yield db_1.default.track.findMany({
                        where: {
                            artistId: { in: sortedPreferredArtists },
                            isActive: true,
                            id: { notIn: trackIds },
                        },
                        orderBy: { playCount: 'desc' },
                        take: additionalPreferredTracksNeeded * 2,
                        select: { id: true, artistId: true },
                    });
                    const additionalTrackIds = additionalPreferredTracks
                        .sort((a, b) => {
                        const aIndex = sortedPreferredArtists.indexOf(a.artistId);
                        const bIndex = sortedPreferredArtists.indexOf(b.artistId);
                        return aIndex - bIndex;
                    })
                        .slice(0, additionalPreferredTracksNeeded)
                        .map((t) => t.id);
                    const remainingTracksNeeded = Math.max(0, trackCount - (trackIds.length + additionalTrackIds.length));
                    const finalTrackIds = [
                        ...tracksFromPreferredArtists.map((t) => t.id),
                        ...additionalTrackIds,
                        ...tracksFromOtherArtists.map((t) => t.id),
                    ];
                    trackIds = finalTrackIds;
                    if (remainingTracksNeeded > 0) {
                        const fallbackTracks = yield db_1.default.track.findMany({
                            where: {
                                isActive: true,
                                id: { notIn: trackIds },
                            },
                            orderBy: { playCount: 'desc' },
                            take: remainingTracksNeeded,
                            select: { id: true },
                        });
                        trackIds = [...trackIds, ...fallbackTracks.map((t) => t.id)];
                    }
                    const finalPreferredTracks = yield db_1.default.track.findMany({
                        where: {
                            id: { in: trackIds },
                            artistId: { in: Array.from(preferredArtistIds) },
                        },
                        select: { id: true },
                    });
                    const finalPercentage = (finalPreferredTracks.length / trackIds.length) * 100;
                    console.log(`[AI] Final preferred artist percentage: ${finalPercentage.toFixed(1)}%`);
                }
            }
        }
        if (trackIds.length > trackCount) {
            trackIds = trackIds.slice(0, trackCount);
        }
        else if (trackIds.length < trackCount) {
            const additionalTracks = yield db_1.default.track.findMany({
                where: {
                    isActive: true,
                    id: { notIn: trackIds },
                },
                orderBy: { playCount: 'desc' },
                take: trackCount - trackIds.length,
                select: { id: true },
            });
            trackIds = [...trackIds, ...additionalTracks.map((t) => t.id)];
        }
        console.log(`[AI] Successfully generated playlist with ${trackIds.length} tracks`);
        return trackIds;
    }
    catch (error) {
        console.error('[AI] Error generating playlist:', error);
        throw error;
    }
});
exports.generateAIPlaylist = generateAIPlaylist;
const createAIGeneratedPlaylist = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, options = {}) {
    try {
        const playlistName = options.name || 'Soundwave Discoveries';
        const trackIds = yield (0, exports.generateAIPlaylist)(userId, options);
        const tracks = yield db_1.default.track.findMany({
            where: { id: { in: trackIds } },
            select: {
                id: true,
                duration: true,
                artist: {
                    select: {
                        id: true,
                        artistName: true,
                    },
                },
            },
        });
        const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);
        const artistsInPlaylist = new Map();
        tracks.forEach((track) => {
            var _a;
            if ((_a = track.artist) === null || _a === void 0 ? void 0 : _a.artistName) {
                artistsInPlaylist.set(track.artist.id, track.artist.artistName);
            }
        });
        const artistsCount = {};
        tracks.forEach((track) => {
            var _a;
            if ((_a = track.artist) === null || _a === void 0 ? void 0 : _a.id) {
                artistsCount[track.artist.id] =
                    (artistsCount[track.artist.id] || 0) + 1;
            }
        });
        const sortedArtistIds = Object.keys(artistsCount).sort((a, b) => artistsCount[b] - artistsCount[a]);
        const sortedArtistNames = sortedArtistIds
            .map((id) => artistsInPlaylist.get(id))
            .filter(Boolean);
        const playlistDescription = options.description ||
            `Curated selection featuring ${sortedArtistNames.slice(0, 3).join(', ')}${sortedArtistNames.length > 3 ? ' and more' : ''}. Refreshed regularly based on your listening patterns.`;
        const defaultCoverUrl = 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png';
        let playlist = yield db_1.default.playlist.findFirst({
            where: {
                userId,
                name: playlistName,
                type: client_1.PlaylistType.SYSTEM,
            },
        });
        const playlistData = {
            description: playlistDescription,
            coverUrl: options.coverUrl || defaultCoverUrl,
            totalTracks: trackIds.length,
            totalDuration,
            updatedAt: new Date(),
            lastGeneratedAt: new Date(),
            tracks: {
                createMany: {
                    data: trackIds.map((trackId, index) => ({
                        trackId,
                        trackOrder: index,
                    })),
                    skipDuplicates: true,
                },
            },
        };
        if (playlist) {
            console.log(`[AI] Updating personalized system playlist ${playlist.id} for user ${userId}`);
            yield db_1.default.playlistTrack.deleteMany({
                where: { playlistId: playlist.id },
            });
            playlist = yield db_1.default.playlist.update({
                where: { id: playlist.id },
                data: playlistData,
            });
            console.log(`[AI] Updated playlist with ${trackIds.length} tracks from ${artistsInPlaylist.size} artists`);
        }
        else {
            console.log(`[AI] Creating new personalized system playlist "${playlistName}" for user ${userId}`);
            playlist = yield db_1.default.playlist.create({
                data: Object.assign({ name: playlistName, userId, type: client_1.PlaylistType.SYSTEM, privacy: 'PRIVATE', isAIGenerated: true }, playlistData),
            });
            console.log(`[AI] Created playlist with ${trackIds.length} tracks from ${artistsInPlaylist.size} artists`);
        }
        return playlist;
    }
    catch (error) {
        console.error('[AI] Error creating/updating AI-generated playlist:', error);
        throw error;
    }
});
exports.createAIGeneratedPlaylist = createAIGeneratedPlaylist;
const generateDefaultPlaylistForNewUser = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`[AI] Generating default playlist for new user ${userId}`);
        const popularTracks = yield db_1.default.track.findMany({
            where: {
                isActive: true,
            },
            orderBy: {
                playCount: 'desc',
            },
            select: {
                id: true,
                title: true,
                artist: {
                    select: {
                        artistName: true,
                    },
                },
            },
            take: 15,
        });
        console.log(`[AI] Found ${popularTracks.length} popular tracks for new user playlist`);
        if (popularTracks.length > 0) {
            const trackSample = popularTracks
                .slice(0, 3)
                .map((t) => { var _a; return `${t.title} by ${((_a = t.artist) === null || _a === void 0 ? void 0 : _a.artistName) || 'Unknown'}`; });
            console.log(`[AI] Sample tracks: ${trackSample.join(', ')}`);
        }
        const trackIds = popularTracks.map((track) => track.id);
        if (trackIds.length === 0) {
            console.log(`[AI] No popular tracks found, falling back to random tracks`);
            const randomTracks = yield db_1.default.track.findMany({
                where: {
                    isActive: true,
                },
                select: {
                    id: true,
                },
                take: 15,
            });
            return randomTracks.map((track) => track.id);
        }
        console.log(`[AI] Generated default playlist with ${trackIds.length} popular tracks`);
        return trackIds;
    }
    catch (error) {
        console.error('[AI] Error generating default playlist:', error);
        return [];
    }
});
exports.generateDefaultPlaylistForNewUser = generateDefaultPlaylistForNewUser;
//# sourceMappingURL=ai.service.js.map