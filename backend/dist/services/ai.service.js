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
    systemInstruction: "You are an expert music curator specializing in personalization. Your primary goal is to create highly personalized playlists that closely match each user's demonstrated preferences. PRIORITIZE tracks from artists the user has already listened to or liked. Only include tracks from other artists if they are extremely similar in style and genre to the user's favorites. Analyze the provided listening history and liked tracks carefully, identifying patterns in genres, artists, and moods. Return ONLY a valid JSON array of track IDs, without any duplicates or explanations. The tracks should strongly reflect the user's taste, with at least 80% being from artists they've shown interest in.",
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
            take: 50,
        });
        if (userHistory.length === 0) {
            console.log(`[AI] User ${userId} has no listening history. Using default playlist.`);
            return (0, exports.generateDefaultPlaylistForNewUser)(userId);
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
            take: 50,
        });
        const preferredArtistIds = new Set();
        const preferredGenreIds = new Set();
        const artistPlayCounts = {};
        const artistLikeCounts = {};
        const genreCounts = {};
        userHistory.forEach((history) => {
            if (history.track?.artistId) {
                preferredArtistIds.add(history.track.artistId);
                const daysAgo = Math.max(1, Math.floor((Date.now() - new Date(history.updatedAt).getTime()) /
                    (1000 * 60 * 60 * 24)));
                const recencyWeight = Math.max(0.5, 1 - daysAgo / 30);
                const artistId = history.track.artistId;
                artistPlayCounts[artistId] =
                    (artistPlayCounts[artistId] || 0) +
                        (history.playCount || 1) * recencyWeight;
            }
            history.track?.genres.forEach((genreRel) => {
                preferredGenreIds.add(genreRel.genre.id);
                const genreId = genreRel.genre.id;
                genreCounts[genreId] =
                    (genreCounts[genreId] || 0) + (history.playCount || 1);
            });
        });
        userLikedTracks.forEach((like) => {
            if (like.track?.artistId) {
                preferredArtistIds.add(like.track.artistId);
                const daysAgo = Math.max(1, Math.floor((Date.now() - new Date(like.createdAt).getTime()) /
                    (1000 * 60 * 60 * 24)));
                const recencyWeight = Math.max(0.5, 1 - daysAgo / 30);
                const artistId = like.track.artistId;
                artistLikeCounts[artistId] =
                    (artistLikeCounts[artistId] || 0) + 2 * recencyWeight;
            }
            like.track?.genres.forEach((genreRel) => {
                preferredGenreIds.add(genreRel.genre.id);
                const genreId = genreRel.genre.id;
                genreCounts[genreId] = (genreCounts[genreId] || 0) + 2;
            });
        });
        const artistPreferenceScore = {};
        const sortedPreferredGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .map((entry) => entry[0]);
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
                artistPreferenceScore[artistByName.id] =
                    (artistPreferenceScore[artistByName.id] || 0) + 100;
                console.log(`[AI] Adding specified artist to preferences: ${options.basedOnArtist}`);
            }
        }
        let selectedGenreId = null;
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
                selectedGenreId = genreByName.id;
                const genreIndex = sortedPreferredGenres.indexOf(genreByName.id);
                if (genreIndex > -1) {
                    sortedPreferredGenres.splice(genreIndex, 1);
                }
                sortedPreferredGenres.unshift(genreByName.id);
                console.log(`[AI] Adding specified genre to preferences: ${options.basedOnGenre}`);
            }
        }
        const whereClause = { isActive: true };
        let trackIds = [];
        const hasArtistParam = options.basedOnArtist ? true : false;
        const hasGenreParam = options.basedOnGenre ? true : false;
        const hasMoodParam = options.basedOnMood ? true : false;
        let artistRatio = 0.5;
        let genreRatio = 0.3;
        let popularRatio = 0.2;
        if (hasArtistParam && hasGenreParam) {
            artistRatio = 0.8;
            genreRatio = 0.15;
            popularRatio = 0.05;
        }
        else if (hasArtistParam) {
            artistRatio = 0.7;
            genreRatio = 0.2;
            popularRatio = 0.1;
        }
        else if (hasGenreParam) {
            artistRatio = 0.3;
            genreRatio = 0.6;
            popularRatio = 0.1;
        }
        else if (hasMoodParam) {
            artistRatio = 0.4;
            genreRatio = 0.4;
            popularRatio = 0.2;
        }
        const artistTrackCount = Math.ceil(trackCount * artistRatio);
        const genreTrackCount = Math.ceil(trackCount * genreRatio);
        const popularTrackCount = Math.max(0, trackCount - artistTrackCount - genreTrackCount);
        console.log(`[AI] Allocation: Artist=${artistTrackCount}, Genre=${genreTrackCount}, Popular=${popularTrackCount}`);
        let artistTracks = [];
        if (preferredArtistIds.size > 0 && artistTrackCount > 0) {
            const moodFilter = options.basedOnMood
                ? await getMoodFilter(options.basedOnMood)
                : {};
            const artistTracksQuery = {
                where: {
                    isActive: true,
                    artistId: { in: Array.from(preferredArtistIds) },
                    ...(selectedGenreId
                        ? {
                            genres: {
                                some: {
                                    genreId: selectedGenreId,
                                },
                            },
                        }
                        : {}),
                    ...moodFilter,
                },
                orderBy: [
                    { createdAt: "desc" },
                    { playCount: "desc" },
                ],
                take: artistTrackCount * 2,
            };
            artistTracks = await db_1.default.track.findMany(artistTracksQuery);
            const scoredArtistTracks = artistTracks
                .map((track) => {
                return {
                    ...track,
                    score: artistPreferenceScore[track.artistId || ""] || 0,
                };
            })
                .sort((a, b) => b.score - a.score);
            const selectedArtistTracks = scoredArtistTracks.slice(0, artistTrackCount);
            trackIds = selectedArtistTracks.map((track) => track.id);
        }
        if (preferredGenreIds.size > 0 && genreTrackCount > 0) {
            const targetGenreIds = selectedGenreId
                ? [selectedGenreId]
                : sortedPreferredGenres.slice(0, 3);
            const moodFilter = options.basedOnMood
                ? await getMoodFilter(options.basedOnMood)
                : {};
            const genreTracksQuery = {
                where: {
                    isActive: true,
                    id: { notIn: trackIds },
                    genres: {
                        some: {
                            genreId: { in: targetGenreIds },
                        },
                    },
                    ...moodFilter,
                    ...(hasArtistParam && hasGenreParam
                        ? {
                            artist: {
                                artistName: {
                                    contains: options.basedOnArtist,
                                    mode: "insensitive",
                                },
                            },
                        }
                        :
                            hasGenreParam && !hasArtistParam && trackIds.length > 0
                                ? {
                                    artistId: {
                                        notIn: Array.from(new Set(trackIds
                                            .map((id) => {
                                            const track = artistTracks.find((t) => t.id === id);
                                            return track?.artistId;
                                        })
                                            .filter(Boolean))),
                                    },
                                }
                                : {}),
                },
                orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
                take: genreTrackCount,
            };
            const genreTracks = await db_1.default.track.findMany(genreTracksQuery);
            trackIds = [...trackIds, ...genreTracks.map((t) => t.id)];
        }
        if (trackIds.length < trackCount && popularTrackCount > 0) {
            const remainingNeeded = trackCount - trackIds.length;
            const moodFilter = options.basedOnMood
                ? await getMoodFilter(options.basedOnMood)
                : {};
            const popularTracksQuery = {
                where: {
                    isActive: true,
                    id: { notIn: trackIds },
                    ...moodFilter,
                },
                orderBy: { playCount: "desc" },
                take: remainingNeeded,
            };
            const popularTracks = await db_1.default.track.findMany(popularTracksQuery);
            trackIds = [...trackIds, ...popularTracks.map((t) => t.id)];
        }
        if (trackIds.length > trackCount) {
            trackIds = trackIds.slice(0, trackCount);
        }
        console.log(`[AI] Successfully generated playlist with ${trackIds.length} tracks`);
        return trackIds;
    }
    catch (error) {
        console.error("[AI] Error generating playlist:", error);
        throw error;
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
const generateDefaultPlaylistForNewUser = async (userId) => {
    try {
        console.log(`[AI] Generating default playlist for new user ${userId}`);
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
            take: 15,
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
                take: 15,
            });
            return randomTracks.map((track) => track.id);
        }
        console.log(`[AI] Generated default playlist with ${trackIds.length} popular tracks`);
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
async function getMoodFilter(mood) {
    const moodToGenreMap = {
        energetic: ["Pop", "EDM", "Rock", "Dance", "Electronic", "Hip Hop"],
        calm: ["Acoustic", "Jazz", "Classical", "Ambient", "Lo-fi"],
        happy: ["Pop", "Dance", "Funk", "Disco", "R&B"],
        sad: ["Ballad", "Blues", "Soul", "Acoustic", "Indie"],
        nostalgic: ["Oldies", "Classic Rock", "Classic", "80s", "90s"],
        romantic: ["R&B", "Soul", "Ballad", "Jazz", "Acoustic"],
        focused: ["Classical", "Lo-fi", "Ambient", "Instrumental", "Jazz"],
        party: ["Dance", "EDM", "Hip Hop", "Pop", "Disco", "Rap"],
    };
    const normalizedMood = mood.toLowerCase();
    const relevantGenres = moodToGenreMap[normalizedMood] || [];
    if (relevantGenres.length === 0) {
        return {};
    }
    const genreIds = await db_1.default.genre.findMany({
        where: {
            name: {
                in: relevantGenres,
                mode: "insensitive",
            },
        },
        select: { id: true },
    });
    if (genreIds.length > 0) {
        return {
            genres: {
                some: {
                    genreId: {
                        in: genreIds.map((g) => g.id),
                    },
                },
            },
        };
    }
    return {};
}
//# sourceMappingURL=ai.service.js.map