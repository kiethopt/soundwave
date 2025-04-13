"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeAllVibeRewindPlaylists = exports.generateDefaultPlaylistForNewUser = exports.createAIGeneratedPlaylist = exports.generateAIPlaylist = exports.model = void 0;
const generative_ai_1 = require("@google/generative-ai");
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const client_1 = require("@prisma/client");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: "You are an expert music curator specializing in personalization. Your primary goal is to create highly personalized playlists that closely match each user's demonstrated preferences. PRIORITIZE tracks from artists the user has already listened to or liked. Only include tracks from other artists if they are extremely similar in style and genre to the user's favorites. Analyze the provided listening history and liked tracks carefully, identifying patterns in genres, artists, and moods. Return ONLY a valid JSON array of track IDs, without any duplicates or explanations. The tracks should strongly reflect the user's taste, with at least 70% being from artists they've shown interest in.",
});
exports.model = model;
console.log(`[AI] Using Gemini model: ${modelName}`);
const generateAIPlaylist = async (userId, options = {}) => {
    try {
        console.log(`[AI] Generating playlist for user ${userId} with options:`, options);
        const trackCount = options.trackCount || 10;
        const userHistory = await db_1.default.history.findMany({
            where: {
                userId,
                type: "PLAY",
            },
            include: {
                track: {
                    select: prisma_selects_1.trackSelect,
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
            take: 30,
        });
        if (userHistory.length === 0) {
            console.log(`[AI] User ${userId} has no listening history. Using default playlist.`);
            return (0, exports.generateDefaultPlaylistForNewUser)(userId, trackCount);
        }
        const userLikedTracks = await db_1.default.userLikeTrack.findMany({
            where: { userId },
            include: {
                track: {
                    select: prisma_selects_1.trackSelect,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 30,
        });
        const preferredArtistIds = new Set();
        const preferredGenreIds = new Set();
        const artistPlayCounts = {};
        const artistLikeCounts = {};
        userHistory.forEach((history) => {
            if (history.track?.artistId) {
                preferredArtistIds.add(history.track.artistId);
                const artistId = history.track.artistId;
                artistPlayCounts[artistId] =
                    (artistPlayCounts[artistId] || 0) + (history.playCount || 1);
            }
            history.track?.genres.forEach((genreRel) => {
                preferredGenreIds.add(genreRel.genre.id);
            });
        });
        userLikedTracks.forEach((like) => {
            if (like.track?.artistId) {
                preferredArtistIds.add(like.track.artistId);
                const artistId = like.track.artistId;
                artistLikeCounts[artistId] = (artistLikeCounts[artistId] || 0) + 1;
            }
            like.track?.genres.forEach((genreRel) => {
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
            const artistByName = await db_1.default.artistProfile.findFirst({
                where: {
                    artistName: {
                        contains: options.basedOnArtist,
                        mode: "insensitive",
                    },
                },
                select: { id: true },
            });
            if (artistByName) {
                preferredArtistIds.add(artistByName.id);
                sortedPreferredArtists.unshift(artistByName.id);
                console.log(`[AI] Adding specified artist to preferences: ${options.basedOnArtist}`);
            }
            else {
                console.log(`[AI] Warning: Specified artist "${options.basedOnArtist}" not found in database`);
            }
        }
        if (options.basedOnGenre) {
            const genreByName = await db_1.default.genre.findFirst({
                where: {
                    name: {
                        contains: options.basedOnGenre,
                        mode: "insensitive",
                    },
                },
                select: { id: true },
            });
            if (genreByName) {
                preferredGenreIds.add(genreByName.id);
                console.log(`[AI] Adding specified genre to preferences: ${options.basedOnGenre}`);
            }
            else {
                console.log(`[AI] Warning: Specified genre "${options.basedOnGenre}" not found in database`);
            }
        }
        const whereClause = { isActive: true };
        let foundMatchingArtist = false;
        let foundMatchingGenre = false;
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
                            mode: "insensitive",
                        },
                    },
                },
            };
        }
        if (options.basedOnArtist && !preferredArtistIds.size) {
            whereClause.artist = {
                artistName: {
                    contains: options.basedOnArtist,
                    mode: "insensitive",
                },
            };
        }
        const availableTracks = await db_1.default.track.findMany({
            where: whereClause,
            select: prisma_selects_1.trackSelect,
            orderBy: [
                {
                    artist: {
                        artistName: preferredArtistIds.size > 0 ? "asc" : undefined,
                    },
                },
                { playCount: "desc" },
            ],
            take: 150,
        });
        console.log(`[AI] Found ${availableTracks.length} potential tracks for recommendation`);
        const preferredArtistNames = new Set();
        userHistory.forEach((h) => {
            if (h.track?.artist?.artistName) {
                preferredArtistNames.add(h.track.artist.artistName);
            }
        });
        userLikedTracks.forEach((l) => {
            if (l.track?.artist?.artistName) {
                preferredArtistNames.add(l.track.artist.artistName);
            }
        });
        const context = {
            user: {
                id: userId,
                preferredArtists: Array.from(preferredArtistNames),
                listeningHistory: userHistory.map((h) => ({
                    trackId: h.track?.id,
                    trackName: h.track?.title,
                    artistName: h.track?.artist?.artistName,
                    playCount: h.playCount || 1,
                    genres: h.track?.genres.map((g) => g.genre.name),
                })),
                likedTracks: userLikedTracks.map((lt) => ({
                    trackId: lt.track?.id,
                    trackName: lt.track?.title,
                    artistName: lt.track?.artist?.artistName,
                    genres: lt.track?.genres.map((g) => g.genre.name),
                })),
            },
            availableTracks: availableTracks.map((track) => ({
                id: track.id,
                title: track.title,
                artist: track.artist?.artistName,
                album: track.album?.title,
                duration: track.duration,
                genres: track.genres.map((g) => g.genre.name),
                playCount: track.playCount,
                releaseDate: track.releaseDate,
            })),
            preferences: {
                trackCount,
                mood: options.basedOnMood,
                genre: options.basedOnGenre,
                artist: options.basedOnArtist,
            },
        };
        const promptText = `Tạo một danh sách phát cá nhân hóa cho người dùng này tập trung chủ yếu vào sở thích đã thể hiện của họ.

Thông tin người dùng:
- Nghệ sĩ ưa thích: ${Array.from(preferredArtistNames).join(", ") || "Không có chỉ định"}
- Lịch sử nghe gần đây: ${userHistory
            .map((h) => h.track?.title || "")
            .filter(Boolean)
            .join(", ")}
- Bài hát đã thích: ${userLikedTracks
            .map((l) => l.track?.title || "")
            .filter(Boolean)
            .join(", ")}

Dữ liệu ngữ cảnh đầy đủ:
${JSON.stringify(context, null, 2)}

Hướng dẫn quan trọng:
1. PHẢI ưu tiên mạnh mẽ các bài hát từ nghệ sĩ mà người dùng đã nghe hoặc thích (${Array.from(preferredArtistNames).join(", ")}).
2. Ít nhất 70% bài hát phải đến từ các nghệ sĩ mà người dùng đã thể hiện sự quan tâm.
3. Chỉ bao gồm bài hát từ nghệ sĩ mà người dùng chưa thể hiện sự quan tâm nếu chúng rất giống với sở thích của người dùng.
4. Xem xét sở thích của người dùng về tâm trạng (${options.basedOnMood || "bất kỳ"}), thể loại (${options.basedOnGenre || "bất kỳ"}), và nghệ sĩ (${options.basedOnArtist || "dựa trên lịch sử"}).
5. Chọn chính xác ${trackCount} bài hát và chỉ trả về mảng ID bài hát JSON hợp lệ.`;
        console.log(`[AI] Gửi lời nhắc cải tiến đến model Gemini ${modelName}`);
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
        });
        const response = result.response;
        const responseText = response.text();
        console.log("[AI] Raw response:", responseText);
        if (options.basedOnArtist) {
            const artistTracks = availableTracks.filter((track) => track.artist?.artistName
                ?.toLowerCase()
                .includes(options.basedOnArtist.toLowerCase()));
            foundMatchingArtist = artistTracks.length > 0;
            if (!foundMatchingArtist) {
                console.log(`[AI] No tracks found for artist "${options.basedOnArtist}"`);
            }
            else {
                console.log(`[AI] Found ${artistTracks.length} tracks for artist "${options.basedOnArtist}"`);
            }
        }
        if (options.basedOnGenre) {
            const genreTracks = availableTracks.filter((track) => track.genres.some((g) => g.genre.name
                .toLowerCase()
                .includes(options.basedOnGenre.toLowerCase())));
            foundMatchingGenre = genreTracks.length > 0;
            if (!foundMatchingGenre) {
                console.log(`[AI] No tracks found for genre "${options.basedOnGenre}"`);
            }
            else {
                console.log(`[AI] Found ${genreTracks.length} tracks for genre "${options.basedOnGenre}"`);
            }
        }
        if (options.basedOnArtist && !foundMatchingArtist) {
            console.log(`[AI] Warning: Couldn't find any tracks for specified artist "${options.basedOnArtist}"`);
        }
        let trackIds = [];
        try {
            const cleanedResponse = responseText.replace(/```json|```/g, "").trim();
            trackIds = JSON.parse(cleanedResponse);
            if (!Array.isArray(trackIds)) {
                console.error("[AI] Response is not a valid array:", cleanedResponse);
                trackIds = [];
            }
        }
        catch (error) {
            console.error("[AI] Error parsing AI response:", error);
            console.error("[AI] Raw response:", responseText);
            trackIds = [];
        }
        if (trackIds.length === 0 && availableTracks.length > 0) {
            console.log("[AI] No valid recommendations from AI, using available tracks directly");
            trackIds = availableTracks.slice(0, trackCount).map((t) => t.id);
        }
        if (trackIds.length === 0) {
            console.log("[AI] No recommendations available, falling back to popular tracks");
            trackIds = await (0, exports.generateDefaultPlaylistForNewUser)(userId, trackCount);
        }
        if (trackIds.length > trackCount) {
            console.log(`[AI] Trimming recommendations from ${trackIds.length} to requested ${trackCount} tracks`);
            trackIds = trackIds.slice(0, trackCount);
        }
        console.log(`[AI] Generated playlist with ${trackIds.length} tracks`);
        return trackIds;
    }
    catch (error) {
        console.error("[AI] Error generating AI playlist:", error);
        return (0, exports.generateDefaultPlaylistForNewUser)(userId, options.trackCount || 10);
    }
};
exports.generateAIPlaylist = generateAIPlaylist;
const createAIGeneratedPlaylist = async (userId, options = {}) => {
    try {
        const playlistName = options.name || "Soundwave Discoveries";
        const trackIds = await (0, exports.generateAIPlaylist)(userId, options);
        const tracks = await db_1.default.track.findMany({
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
            if (track.artist?.artistName) {
                artistsInPlaylist.set(track.artist.id, track.artist.artistName);
            }
        });
        const artistsCount = {};
        tracks.forEach((track) => {
            if (track.artist?.id) {
                artistsCount[track.artist.id] =
                    (artistsCount[track.artist.id] || 0) + 1;
            }
        });
        const sortedArtistIds = Object.keys(artistsCount).sort((a, b) => artistsCount[b] - artistsCount[a]);
        const sortedArtistNames = sortedArtistIds
            .map((id) => artistsInPlaylist.get(id))
            .filter(Boolean);
        const playlistDescription = options.description ||
            `Curated selection featuring ${sortedArtistNames.slice(0, 3).join(", ")}${sortedArtistNames.length > 3 ? " and more" : ""}. Refreshed regularly based on your listening patterns.`;
        const defaultCoverUrl = "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png";
        let playlist = await db_1.default.playlist.findFirst({
            where: {
                userId,
                name: playlistName,
                type: client_1.PlaylistType.SYSTEM,
            },
        });
        const playlistData = {
            description: playlistDescription,
            coverUrl: options.coverUrl === null ? null : options.coverUrl || defaultCoverUrl,
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
            await db_1.default.playlistTrack.deleteMany({
                where: { playlistId: playlist.id },
            });
            playlist = await db_1.default.playlist.update({
                where: { id: playlist.id },
                data: playlistData,
            });
            console.log(`[AI] Updated playlist with ${trackIds.length} tracks from ${artistsInPlaylist.size} artists`);
        }
        else {
            console.log(`[AI] Creating new personalized system playlist "${playlistName}" for user ${userId}`);
            playlist = await db_1.default.playlist.create({
                data: {
                    name: playlistName,
                    userId,
                    type: client_1.PlaylistType.SYSTEM,
                    privacy: "PRIVATE",
                    isAIGenerated: true,
                    ...playlistData,
                },
            });
            console.log(`[AI] Created playlist with ${trackIds.length} tracks from ${artistsInPlaylist.size} artists`);
        }
        return playlist;
    }
    catch (error) {
        console.error("[AI] Error creating/updating AI-generated playlist:", error);
        throw error;
    }
};
exports.createAIGeneratedPlaylist = createAIGeneratedPlaylist;
const generateDefaultPlaylistForNewUser = async (userId, trackCount = 10) => {
    try {
        console.log(`[AI] Generating default playlist for new user ${userId} with ${trackCount} tracks`);
        const popularTracks = await db_1.default.track.findMany({
            where: {
                isActive: true,
            },
            orderBy: {
                playCount: "desc",
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
            take: trackCount,
        });
        console.log(`[AI] Found ${popularTracks.length} popular tracks for new user playlist`);
        if (popularTracks.length > 0) {
            const trackSample = popularTracks
                .slice(0, 3)
                .map((t) => `${t.title} by ${t.artist?.artistName || "Unknown"}`);
            console.log(`[AI] Sample tracks: ${trackSample.join(", ")}`);
        }
        const trackIds = popularTracks.map((track) => track.id);
        if (trackIds.length === 0) {
            console.log(`[AI] No popular tracks found, falling back to random tracks`);
            const randomTracks = await db_1.default.track.findMany({
                where: {
                    isActive: true,
                },
                select: {
                    id: true,
                },
                take: trackCount,
            });
            return randomTracks.map((track) => track.id);
        }
        console.log(`[AI] Generated default playlist with ${trackIds.length} tracks`);
        return trackIds;
    }
    catch (error) {
        console.error("[AI] Error generating default playlist:", error);
        return [];
    }
};
exports.generateDefaultPlaylistForNewUser = generateDefaultPlaylistForNewUser;
const analyzeAllVibeRewindPlaylists = async () => {
    try {
        console.log("[AI] Analyzing all Vibe Rewind playlists to determine popular trends");
        const vibeRewindPlaylists = await db_1.default.playlist.findMany({
            where: {
                name: "Vibe Rewind",
                type: "SYSTEM",
            },
            include: {
                tracks: {
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
                },
            },
            take: 100,
        });
        if (vibeRewindPlaylists.length === 0) {
            console.log("[AI] No Vibe Rewind playlists found. Using default values.");
            return {
                mood: "energetic",
                genres: ["Pop", "Rock", "Hip Hop"],
            };
        }
        const allTracks = vibeRewindPlaylists.flatMap((playlist) => playlist.tracks.map((pt) => pt.track));
        const genreCounts = {};
        allTracks.forEach((track) => {
            track.genres.forEach((genreRel) => {
                const genreName = genreRel.genre.name;
                genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
            });
        });
        const sortedGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .map((entry) => entry[0])
            .slice(0, 3);
        const moodContext = {
            tracks: allTracks.map((track) => ({
                title: track.title,
                genres: track.genres.map((g) => g.genre.name),
            })),
        };
        const analysisPrompt = `Phân tích danh sách bài hát từ tất cả người dùng và trả về:
    1. Tâm trạng phổ biến nhất (mood): happy, sad, energetic, calm, nostalgic, romantic, focused, party
    2. Top 3 thể loại nhạc phổ biến nhất (genres)
    
    Trả về dưới dạng JSON với format:
    {
      "mood": "tâm_trạng",
      "genres": ["thể_loại_1", "thể_loại_2", "thể_loại_3"]
    }
    
    Danh sách bài hát:
    ${JSON.stringify(moodContext, null, 2)}`;
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
        });
        const responseText = result.response.text();
        const cleanedResponse = responseText.replace(/```json|```/g, "").trim();
        let analysis;
        try {
            analysis = JSON.parse(cleanedResponse);
        }
        catch (error) {
            console.error("[AI] Error parsing AI response:", error);
            console.error("[AI] Raw response:", responseText);
            return {
                mood: "energetic",
                genres: sortedGenres.length > 0 ? sortedGenres : ["Pop", "Rock", "Hip Hop"],
            };
        }
        console.log(`[AI] Analyzed ${vibeRewindPlaylists.length} Vibe Rewind playlists with ${allTracks.length} tracks`);
        console.log(`[AI] Most popular mood: ${analysis.mood}`);
        console.log(`[AI] Most popular genres: ${analysis.genres.join(", ")}`);
        return {
            mood: analysis.mood,
            genres: analysis.genres,
        };
    }
    catch (error) {
        console.error("[AI] Error analyzing Vibe Rewind playlists:", error);
        return {
            mood: "energetic",
            genres: ["Pop", "Rock", "Hip Hop"],
        };
    }
};
exports.analyzeAllVibeRewindPlaylists = analyzeAllVibeRewindPlaylists;
//# sourceMappingURL=ai.service.js.map