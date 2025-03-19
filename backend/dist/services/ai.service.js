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
exports.generatePersonalizedPlaylist = void 0;
const generative_ai_1 = require("@google/generative-ai");
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables');
}
const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: "You are an expert music curator who creates personalized playlists. Analyze user's music preferences and suggest tracks that match their taste.",
});
console.log(`[AI] Using Gemini model: ${modelName}`);
const generatePersonalizedPlaylist = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, options = {}) {
    try {
        const userListeningData = yield getUserListeningData(userId);
        const favoriteGenres = extractFavoriteGenres(userListeningData);
        const favoriteArtists = extractFavoriteArtists(userListeningData);
        const recommendedTrackIds = yield getAIRecommendations(userListeningData, favoriteGenres, favoriteArtists, options);
        const playlistName = options.name ||
            `Mix dành riêng cho bạn ${new Date().toLocaleDateString('vi-VN')}`;
        const playlistDescription = options.description ||
            `Playlist được tạo tự động dựa trên sở thích nghe nhạc của bạn`;
        const newPlaylist = yield createPlaylistWithTracks(userId, playlistName, playlistDescription, recommendedTrackIds);
        return newPlaylist;
    }
    catch (error) {
        console.error('Error generating personalized playlist:', error);
        throw new Error('Failed to generate personalized playlist');
    }
});
exports.generatePersonalizedPlaylist = generatePersonalizedPlaylist;
const getUserListeningData = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const playHistory = yield db_1.default.history.findMany({
        where: {
            userId,
            type: 'PLAY',
            trackId: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: {
            trackId: true,
            playCount: true,
            duration: true,
            createdAt: true,
            track: {
                select: prisma_selects_1.trackSelect,
            },
        },
    });
    const likedTracks = yield db_1.default.userLikeTrack.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
            trackId: true,
            createdAt: true,
            track: {
                select: prisma_selects_1.trackSelect,
            },
        },
    });
    const playlists = yield db_1.default.playlist.findMany({
        where: { userId },
        select: {
            id: true,
            name: true,
            tracks: {
                select: {
                    trackId: true,
                    track: {
                        select: prisma_selects_1.trackSelect,
                    },
                },
            },
        },
    });
    return { playHistory, likedTracks, playlists };
});
const extractFavoriteGenres = (userListeningData) => {
    const genreCounts = {};
    userListeningData.playHistory.forEach((history) => {
        if (history.track && history.track.genres) {
            history.track.genres.forEach((genreItem) => {
                const genreName = genreItem.genre.name;
                genreCounts[genreName] =
                    (genreCounts[genreName] || 0) + (history.playCount || 1);
            });
        }
    });
    userListeningData.likedTracks.forEach((likedTrack) => {
        if (likedTrack.track && likedTrack.track.genres) {
            likedTrack.track.genres.forEach((genreItem) => {
                const genreName = genreItem.genre.name;
                genreCounts[genreName] = (genreCounts[genreName] || 0) + 3;
            });
        }
    });
    return Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map((entry) => entry[0]);
};
const extractFavoriteArtists = (userListeningData) => {
    const artistCounts = {};
    userListeningData.playHistory.forEach((history) => {
        if (history.track && history.track.artist) {
            const artistId = history.track.artist.id;
            const artistName = history.track.artist.artistName;
            if (!artistCounts[artistId]) {
                artistCounts[artistId] = { count: 0, id: artistId, name: artistName };
            }
            artistCounts[artistId].count += history.playCount || 1;
        }
    });
    userListeningData.likedTracks.forEach((likedTrack) => {
        if (likedTrack.track && likedTrack.track.artist) {
            const artistId = likedTrack.track.artist.id;
            const artistName = likedTrack.track.artist.artistName;
            if (!artistCounts[artistId]) {
                artistCounts[artistId] = { count: 0, id: artistId, name: artistName };
            }
            artistCounts[artistId].count += 3;
        }
    });
    return Object.values(artistCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
};
const getAIRecommendations = (userListeningData, favoriteGenres, favoriteArtists, options) => __awaiter(void 0, void 0, void 0, function* () {
    let availableTracks = [];
    try {
        const recentTracks = userListeningData.playHistory
            .slice(0, 20)
            .map((history) => {
            var _a;
            return ({
                id: history.track.id,
                title: history.track.title,
                artist: history.track.artist.artistName,
                genre: ((_a = history.track.genres) === null || _a === void 0 ? void 0 : _a.map((g) => g.genre.name).join(', ')) ||
                    'Unknown',
            });
        });
        const likedTracks = userListeningData.likedTracks
            .slice(0, 20)
            .map((liked) => {
            var _a;
            return ({
                id: liked.track.id,
                title: liked.track.title,
                artist: liked.track.artist.artistName,
                genre: ((_a = liked.track.genres) === null || _a === void 0 ? void 0 : _a.map((g) => g.genre.name).join(', ')) ||
                    'Unknown',
            });
        });
        availableTracks = yield db_1.default.track.findMany({
            where: Object.assign(Object.assign({ isActive: true }, (options.basedOnGenre
                ? {
                    genres: {
                        some: {
                            genre: {
                                name: {
                                    equals: options.basedOnGenre,
                                    mode: 'insensitive',
                                },
                            },
                        },
                    },
                }
                : {})), (options.basedOnArtist
                ? {
                    OR: [
                        { artist: { artistName: options.basedOnArtist } },
                        {
                            featuredArtists: {
                                some: {
                                    artistProfile: { artistName: options.basedOnArtist },
                                },
                            },
                        },
                    ],
                }
                : {})),
            select: prisma_selects_1.trackSelect,
            take: 200,
        });
        const prompt = `
          Tôi cần tạo một playlist được cá nhân hóa cho người dùng dựa trên dữ liệu nghe nhạc của họ.
          
          Thông tin người dùng:
          - Thể loại yêu thích: ${favoriteGenres.join(', ')}
          - Nghệ sĩ yêu thích: ${favoriteArtists.map((a) => a.name).join(', ')}
          ${options.basedOnMood ? `- Tâm trạng: ${options.basedOnMood}` : ''}
          
          Bài hát đã nghe gần đây:
          ${JSON.stringify(recentTracks, null, 2)}
          
          Bài hát đã thích:
          ${JSON.stringify(likedTracks, null, 2)}
          
          Danh sách bài hát có sẵn để chọn (${availableTracks.length} bài):
          ${JSON.stringify(availableTracks.map((track) => {
            var _a;
            return ({
                id: track.id,
                title: track.title,
                artist: track.artist.artistName,
                album: ((_a = track.album) === null || _a === void 0 ? void 0 : _a.title) || 'Single',
                genres: track.genres.map((g) => g.genre.name),
                duration: track.duration,
                releaseDate: track.releaseDate,
            });
        }), null, 2)}
          
          Hãy chọn ${options.trackCount || 20} bài hát phù hợp nhất cho người dùng này để tạo một playlist hấp dẫn.
          ĐẢM BẢO KHÔNG TRÙNG LẶP ID BÀI HÁT trong danh sách trả về.
          Chỉ trả về danh sách ID của các bài hát được đề xuất dưới dạng mảng JSON, không có thông tin khác.
          `;
        let trackIds = [];
        try {
            console.log('Sending request to Gemini AI...');
            const result = yield model.generateContent(prompt);
            const responseText = result.response.text();
            console.log('Received response from Gemini AI');
            const trackIdsMatch = responseText.match(/\[(.|\n|\r)*\]/);
            if (trackIdsMatch) {
                try {
                    const parsedIds = JSON.parse(trackIdsMatch[0]);
                    const uniqueIds = [...new Set(parsedIds)].filter((id) => typeof id === 'string' &&
                        availableTracks.some((track) => track.id === id));
                    console.log(`Found ${uniqueIds.length} unique track IDs`);
                    if (uniqueIds.length > 0) {
                        trackIds = uniqueIds.slice(0, options.trackCount || 20);
                    }
                    else {
                        throw new Error('No valid track IDs found in AI response');
                    }
                }
                catch (parseError) {
                    console.error('Error parsing Gemini response:', parseError);
                    throw parseError;
                }
            }
            else {
                throw new Error('No JSON array found in AI response');
            }
        }
        catch (error) {
            console.error('Error getting AI recommendations:', error);
            console.log('Using fallback random tracks selection');
            trackIds = availableTracks
                .sort(() => 0.5 - Math.random())
                .slice(0, options.trackCount || 20)
                .map((track) => track.id);
        }
        return trackIds;
    }
    catch (mainError) {
        console.error('Main error in getAIRecommendations:', mainError);
        if (availableTracks.length === 0) {
            console.log('No available tracks found, fetching random tracks');
            try {
                availableTracks = yield db_1.default.track.findMany({
                    where: { isActive: true },
                    select: prisma_selects_1.trackSelect,
                    take: 50,
                });
            }
            catch (fetchError) {
                console.error('Error fetching fallback tracks:', fetchError);
                return [];
            }
        }
        return availableTracks
            .sort(() => 0.5 - Math.random())
            .slice(0, options.trackCount || 20)
            .map((track) => track.id);
    }
});
const createPlaylistWithTracks = (userId, name, description, trackIds) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uniqueTrackIds = [...new Set(trackIds)];
        console.log(`Creating playlist with ${uniqueTrackIds.length} unique tracks`);
        const tracks = yield db_1.default.track.findMany({
            where: { id: { in: uniqueTrackIds } },
            select: { id: true, duration: true },
        });
        if (tracks.length === 0) {
            throw new Error('No valid tracks found with the provided IDs');
        }
        const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);
        const playlist = yield db_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const newPlaylist = yield tx.playlist.create({
                data: {
                    name,
                    description,
                    privacy: 'PRIVATE',
                    type: 'NORMAL',
                    isAIGenerated: true,
                    totalTracks: uniqueTrackIds.length,
                    totalDuration,
                    userId,
                },
            });
            for (let i = 0; i < uniqueTrackIds.length; i++) {
                yield tx.playlistTrack.create({
                    data: {
                        playlistId: newPlaylist.id,
                        trackId: uniqueTrackIds[i],
                        trackOrder: i + 1,
                    },
                });
            }
            return newPlaylist;
        }));
        return playlist;
    }
    catch (error) {
        console.error('Error creating playlist with tracks:', error);
        throw error;
    }
});
//# sourceMappingURL=ai.service.js.map