"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDefaultPlaylistForNewUser = exports.createAIGeneratedPlaylist = exports.generateAIPlaylist = exports.model = void 0;
const generative_ai_1 = require("@google/generative-ai");
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const client_1 = require("@prisma/client");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY);
const modelName = process.env.GEMINI_MODEL || "gemini-pro";
let model;
try {
    exports.model = model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: "You are an expert music curator specializing in personalization. Your primary goal is to create highly personalized playlists that closely match each user's demonstrated preferences. PRIORITIZE tracks from artists the user has already listened to or liked. Only include tracks from other artists if they are extremely similar in style and genre to the user's favorites. Analyze the provided listening history and liked tracks carefully, identifying patterns in genres, artists, and moods. Return ONLY a valid JSON array of track IDs, without any duplicates or explanations. The tracks should strongly reflect the user's taste, with at least 80% being from artists they've shown interest in.",
    });
    console.log(`[AI] Using Gemini model: ${modelName}`);
}
catch (error) {
    console.error("[AI] Error initializing Gemini model:", error);
    throw new Error("Failed to initialize Gemini AI model. Please check your API key and model configuration.");
}
async function createEnhancedGenreFilter(genreInput) {
    const { mainGenre, mainGenreId, relatedGenres, subGenres, parentGenres } = await analyzeGenre(genreInput);
    const filter = mainGenreId ? {
        genres: {
            some: {
                genreId: mainGenreId
            }
        }
    } : {};
    console.log("[AI] Created genre filter:", {
        mainGenre,
        mainGenreId,
        filter
    });
    return filter;
}
const generateAIPlaylist = async (userId, options = {}) => {
    let playlistId;
    try {
        console.log(`[AI] Generating playlist for user ${userId} with options:`, options);
        const trackCount = options.trackCount || 10;
        if (options.name) {
            const existingPlaylist = await db_1.default.playlist.findFirst({
                where: {
                    name: options.name,
                    userId,
                    type: client_1.PlaylistType.SYSTEM,
                    isAIGenerated: true
                }
            });
            if (existingPlaylist) {
                const updatedPlaylist = await db_1.default.playlist.update({
                    where: { id: existingPlaylist.id },
                    data: {
                        description: options.description || existingPlaylist.description,
                        coverUrl: options.coverUrl || existingPlaylist.coverUrl,
                        tracks: {
                            deleteMany: {}
                        }
                    }
                });
                playlistId = updatedPlaylist.id;
                console.log(`[AI] Updated existing playlist with ID: ${playlistId}`);
            }
            else {
                const playlist = await db_1.default.playlist.create({
                    data: {
                        name: options.name,
                        description: options.description || "AI-generated playlist",
                        userId,
                        type: client_1.PlaylistType.SYSTEM,
                        isAIGenerated: true,
                        coverUrl: options.coverUrl,
                    }
                });
                playlistId = playlist.id;
                console.log(`[AI] Created new playlist with ID: ${playlistId}`);
            }
        }
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
        if (userHistory.length > 0) {
            userHistory.forEach((history) => {
                if (history.track?.artistId) {
                    preferredArtistIds.add(history.track.artistId);
                    artistPlayCounts[history.track.artistId] =
                        (artistPlayCounts[history.track.artistId] || 0) + 1;
                }
                if (history.track?.genres) {
                    history.track.genres.forEach((genreRel) => {
                        if (genreRel.genreId) {
                            preferredGenreIds.add(genreRel.genreId);
                            genreCounts[genreRel.genreId] = (genreCounts[genreRel.genreId] || 0) + 1;
                        }
                    });
                }
            });
        }
        if (userLikedTracks.length > 0) {
            userLikedTracks.forEach((like) => {
                if (like.track?.artistId) {
                    preferredArtistIds.add(like.track.artistId);
                    artistLikeCounts[like.track.artistId] =
                        (artistLikeCounts[like.track.artistId] || 0) + 1;
                }
                if (like.track?.genres) {
                    like.track.genres.forEach((genreRel) => {
                        if (genreRel.genreId) {
                            preferredGenreIds.add(genreRel.genreId);
                            genreCounts[genreRel.genreId] = (genreCounts[genreRel.genreId] || 0) + 3;
                        }
                    });
                }
            });
        }
        const artistPreferenceScore = {};
        for (const artistId of preferredArtistIds) {
            const playScore = artistPlayCounts[artistId] || 0;
            const likeScore = (artistLikeCounts[artistId] || 0) * 3;
            artistPreferenceScore[artistId] = playScore + likeScore;
        }
        const sortedPreferredGenres = Object.entries(genreCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([id]) => id);
        let selectedGenreId = null;
        let enhancedGenreFilter = {};
        if (options.basedOnGenre) {
            enhancedGenreFilter = await createEnhancedGenreFilter(options.basedOnGenre);
            console.log(`[AI] Using enhanced genre filter for: ${options.basedOnGenre}`);
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
        if (options.basedOnReleaseTime) {
            const currentYear = new Date().getFullYear();
            const releaseTimeValue = String(options.basedOnReleaseTime).toLowerCase();
            const yearValue = Number(options.basedOnReleaseTime);
            if (!isNaN(yearValue) && yearValue > 1900 && yearValue <= currentYear) {
                const startDate = new Date(yearValue, 0, 1);
                const endDate = new Date(yearValue, 11, 31, 23, 59, 59);
                whereClause.releaseDate = {
                    gte: startDate,
                    lte: endDate,
                };
                console.log(`[AI] Release time filter: ${yearValue}`);
            }
            else {
                switch (releaseTimeValue) {
                    case "new":
                    case "newest":
                    case "recent":
                        whereClause.releaseDate = {
                            gte: new Date(currentYear, 0, 1),
                        };
                        console.log("[AI] Filtering for new tracks released this year");
                        break;
                    case "last year":
                        whereClause.releaseDate = {
                            gte: new Date(currentYear - 1, 0, 1),
                            lt: new Date(currentYear, 0, 1),
                        };
                        console.log("[AI] Filtering for tracks released last year");
                        break;
                    case "recent years":
                    case "last 5 years":
                        whereClause.releaseDate = {
                            gte: new Date(currentYear - 5, 0, 1),
                        };
                        console.log("[AI] Filtering for tracks released in the last 5 years");
                        break;
                    case "decade":
                    case "last decade":
                        whereClause.releaseDate = {
                            gte: new Date(currentYear - 10, 0, 1),
                        };
                        console.log("[AI] Filtering for tracks released in the last decade");
                        break;
                    case "classic":
                    case "classics":
                        whereClause.releaseDate = {
                            lt: new Date(currentYear - 20, 0, 1),
                        };
                        console.log("[AI] Filtering for classic tracks (over 20 years old)");
                        break;
                    default:
                        if (releaseTimeValue.includes("s") ||
                            releaseTimeValue.includes("'s")) {
                            const decade = parseInt(releaseTimeValue.replace(/[^0-9]/g, ""), 10);
                            if (!isNaN(decade) && decade >= 0 && decade <= 90) {
                                const fullDecade = decade < 100 ? 1900 + decade : decade;
                                whereClause.releaseDate = {
                                    gte: new Date(fullDecade, 0, 1),
                                    lt: new Date(fullDecade + 10, 0, 1),
                                };
                                console.log(`[AI] Filtering for tracks from the ${decade}s`);
                            }
                        }
                }
            }
        }
        if (options.basedOnSongLength) {
            const lengthValue = Number(options.basedOnSongLength);
            if (!isNaN(lengthValue)) {
                const buffer = 5;
                whereClause.duration = {
                    gte: lengthValue - buffer,
                    lte: lengthValue + buffer
                };
                console.log(`[AI] Song length filter: ${lengthValue} seconds (±${buffer}s)`);
            }
            else {
                const songLengthValue = String(options.basedOnSongLength).toLowerCase();
                switch (songLengthValue) {
                    case "short":
                        whereClause.duration = { lte: 180 };
                        console.log("[AI] Filtering for short tracks (under 3 minutes)");
                        break;
                    case "medium":
                        whereClause.duration = {
                            gte: 180,
                            lte: 300,
                        };
                        console.log("[AI] Filtering for medium-length tracks (3-5 minutes)");
                        break;
                    case "long":
                        whereClause.duration = { gte: 300 };
                        console.log("[AI] Filtering for longer tracks (over 5 minutes)");
                        break;
                }
            }
        }
        const hasArtistParam = options.basedOnArtist ? true : false;
        const hasGenreParam = options.basedOnGenre ? true : false;
        const hasMoodParam = options.basedOnMood ? true : false;
        const hasSongLengthParam = options.basedOnSongLength ? true : false;
        const hasReleaseTimeParam = options.basedOnReleaseTime ? true : false;
        console.log("[AI] Parameters:", {
            hasArtistParam,
            hasGenreParam,
            hasMoodParam,
            hasSongLengthParam,
            hasReleaseTimeParam
        });
        let artistRatio = 0.55;
        let genreRatio = 0.25;
        let popularRatio = 0.2;
        console.log("[AI] Initial ratios:", {
            artistRatio,
            genreRatio,
            popularRatio
        });
        if (hasMoodParam && !hasGenreParam && !hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.4;
            genreRatio = 0.4;
            popularRatio = 0.3;
            console.log("[AI] Case 1: Only basedOnMood");
        }
        else if (hasMoodParam && hasGenreParam && !hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.05;
            genreRatio = 0.9;
            popularRatio = 0.05;
        }
        else if (hasMoodParam && !hasGenreParam && hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.7;
            genreRatio = 0.15;
            popularRatio = 0.15;
        }
        else if (hasMoodParam && !hasGenreParam && !hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.4;
            genreRatio = 0.4;
            popularRatio = 0.2;
        }
        else if (hasMoodParam && !hasGenreParam && !hasArtistParam && !hasSongLengthParam && hasReleaseTimeParam) {
            artistRatio = 0.4;
            genreRatio = 0.4;
            popularRatio = 0.2;
        }
        else if (hasMoodParam && hasGenreParam && hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.6;
            genreRatio = 0.3;
            popularRatio = 0.1;
        }
        else if (hasMoodParam && hasGenreParam && hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.5;
            genreRatio = 0.4;
            popularRatio = 0.1;
        }
        else if (hasMoodParam && hasGenreParam && hasArtistParam && hasSongLengthParam && hasReleaseTimeParam) {
            artistRatio = 0.5;
            genreRatio = 0.3;
            popularRatio = 0.2;
        }
        else if (!hasMoodParam && hasGenreParam && !hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0;
            genreRatio = 1;
            popularRatio = 0;
        }
        else if (!hasMoodParam && hasGenreParam && hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 1;
            genreRatio = 0;
            popularRatio = 0;
        }
        else if (!hasMoodParam && hasGenreParam && hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.5;
            genreRatio = 0.4;
            popularRatio = 0.1;
        }
        else if (!hasMoodParam && hasGenreParam && hasArtistParam && hasSongLengthParam && hasReleaseTimeParam) {
            artistRatio = 0.5;
            genreRatio = 0.3;
            popularRatio = 0.2;
        }
        else if (!hasMoodParam && !hasGenreParam && hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 1;
            genreRatio = 0;
            popularRatio = 0;
        }
        else if (!hasMoodParam && !hasGenreParam && hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 1;
            genreRatio = 0;
            popularRatio = 0;
        }
        else if (!hasMoodParam && !hasGenreParam && hasArtistParam && hasSongLengthParam && hasReleaseTimeParam) {
            artistRatio = 1;
            genreRatio = 0;
            popularRatio = 0;
        }
        else if (!hasMoodParam && !hasGenreParam && !hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.4;
            genreRatio = 0.4;
            popularRatio = 0.2;
        }
        else if (!hasMoodParam && !hasGenreParam && !hasArtistParam && hasSongLengthParam && hasReleaseTimeParam) {
            artistRatio = 0.4;
            genreRatio = 0.4;
            popularRatio = 0.2;
        }
        else if (!hasMoodParam && !hasGenreParam && !hasArtistParam && !hasSongLengthParam && hasReleaseTimeParam) {
            artistRatio = 0.45;
            genreRatio = 0.45;
            popularRatio = 0.1;
        }
        else if (!hasMoodParam && hasGenreParam && !hasArtistParam && !hasSongLengthParam && hasReleaseTimeParam) {
            artistRatio = 0.3;
            genreRatio = 0.6;
            popularRatio = 0.1;
            console.log("[AI] Case 19: basedOnGenre and basedOnReleaseTime");
        }
        else if (!hasMoodParam && hasGenreParam && !hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.3;
            genreRatio = 0.6;
            popularRatio = 0.1;
            console.log("[AI] Case 20: basedOnGenre and basedOnSongLength");
        }
        else if (!hasMoodParam && hasGenreParam && !hasArtistParam && hasSongLengthParam && hasReleaseTimeParam) {
            artistRatio = 0.2;
            genreRatio = 0.7;
            popularRatio = 0.1;
            console.log("[AI] Case 21: basedOnGenre, basedOnReleaseTime, and basedOnSongLength");
        }
        else if (!hasMoodParam && !hasGenreParam && hasArtistParam && !hasSongLengthParam && hasReleaseTimeParam) {
            artistRatio = 1;
            genreRatio = 0;
            popularRatio = 0;
            console.log("[AI] Case 22: basedOnArtist and basedOnReleaseTime");
        }
        console.log("[AI] Final ratios after adjustment:", {
            artistRatio,
            genreRatio,
            popularRatio
        });
        const artistTrackCount = Math.floor(trackCount * artistRatio);
        const genreTrackCount = Math.floor(trackCount * genreRatio);
        const popularTrackCount = trackCount - artistTrackCount - genreTrackCount;
        if (artistRatio === 0 && genreRatio === 0 && popularRatio === 0) {
            console.log("[AI] All ratios are 0, skipping playlist generation");
            return [];
        }
        console.log(`[AI] Track count: ${trackCount}`);
        console.log(`[AI] Allocation: Artist=${artistTrackCount}, Genre=${genreTrackCount}, Popular=${popularTrackCount}`);
        let artistTracks = [];
        let trackIds = [];
        if (artistTrackCount > 0) {
            const moodFilter = options.basedOnMood
                ? await getMoodFilter(options.basedOnMood)
                : {};
            const exactArtistFilter = options.basedOnArtist
                ? {
                    artist: {
                        artistName: {
                            equals: options.basedOnArtist,
                            mode: "insensitive",
                        },
                    },
                }
                : {};
            const releaseTimeFilter = options.basedOnReleaseTime
                ? {
                    releaseDate: {
                        gte: new Date(`${options.basedOnReleaseTime}-01-01`),
                        lt: new Date(`${parseInt(options.basedOnReleaseTime) + 1}-01-01`),
                    },
                }
                : {};
            const artistTracksQuery = {
                where: {
                    isActive: true,
                    ...exactArtistFilter,
                    ...releaseTimeFilter,
                    ...whereClause,
                    ...moodFilter,
                },
                orderBy: [
                    { playCount: client_1.Prisma.SortOrder.desc },
                    { createdAt: client_1.Prisma.SortOrder.desc },
                ],
                take: artistTrackCount * 3,
            };
            let artistTracks = await db_1.default.track.findMany(artistTracksQuery);
            if (artistTracks.length < artistTrackCount && !options.basedOnReleaseTime) {
                const remainingCount = artistTrackCount - artistTracks.length;
                const additionalTracksQuery = {
                    where: {
                        isActive: true,
                        id: { notIn: artistTracks.map(t => t.id) },
                        ...whereClause,
                        ...moodFilter,
                    },
                    orderBy: [
                        { playCount: client_1.Prisma.SortOrder.desc },
                        { createdAt: client_1.Prisma.SortOrder.desc },
                    ],
                    take: remainingCount * 3,
                };
                const additionalTracks = await db_1.default.track.findMany(additionalTracksQuery);
                artistTracks = [...artistTracks, ...additionalTracks];
            }
            const scoredArtistTracks = artistTracks
                .map(track => ({
                ...track,
                score: calculateTrackScore(track, options)
            }))
                .sort((a, b) => b.score - a.score);
            const selectedArtistTracks = scoredArtistTracks.slice(0, artistTrackCount);
            trackIds = selectedArtistTracks.map(track => track.id);
        }
        if (genreTrackCount > 0) {
            const targetGenreIds = selectedGenreId
                ? [selectedGenreId]
                : sortedPreferredGenres.length > 0
                    ? sortedPreferredGenres.slice(0, 3)
                    : [];
            const moodFilter = options.basedOnMood
                ? await getMoodFilter(options.basedOnMood)
                : {};
            const genreTracksQuery = {
                where: {
                    isActive: true,
                    id: { notIn: trackIds },
                    ...(options.basedOnGenre ? enhancedGenreFilter : targetGenreIds.length > 0 ? {
                        genres: {
                            every: {
                                genreId: { in: targetGenreIds },
                            },
                        },
                    } : {}),
                    ...whereClause,
                    ...moodFilter,
                    ...(hasArtistParam && hasGenreParam
                        ? {
                            artist: {
                                artistName: {
                                    equals: options.basedOnArtist,
                                    mode: "insensitive",
                                },
                            },
                        }
                        : {}),
                },
                orderBy: [
                    { playCount: client_1.Prisma.SortOrder.desc },
                    { createdAt: client_1.Prisma.SortOrder.desc },
                ],
                take: genreTrackCount * 3,
            };
            const genreTracks = await db_1.default.track.findMany(genreTracksQuery);
            const scoredGenreTracks = genreTracks
                .map(track => ({
                ...track,
                score: calculateTrackScore(track, options)
            }))
                .sort((a, b) => b.score - a.score);
            const selectedGenreTracks = scoredGenreTracks.slice(0, genreTrackCount);
            trackIds = [...trackIds, ...selectedGenreTracks.map(t => t.id)];
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
                    ...(options.basedOnGenre && enhancedGenreFilter ? enhancedGenreFilter : {}),
                    ...whereClause,
                    ...moodFilter,
                },
                orderBy: [
                    { playCount: client_1.Prisma.SortOrder.desc },
                    { createdAt: client_1.Prisma.SortOrder.desc }
                ],
                take: remainingNeeded * 3,
            };
            const popularTracks = await db_1.default.track.findMany(popularTracksQuery);
            const scoredPopularTracks = popularTracks
                .map(track => ({
                ...track,
                score: calculateTrackScore(track, options)
            }))
                .sort((a, b) => b.score - a.score);
            const selectedPopularTracks = scoredPopularTracks.slice(0, remainingNeeded);
            trackIds = [...trackIds, ...selectedPopularTracks.map(t => t.id)];
        }
        if (trackIds.length !== trackCount) {
            console.log(`[AI] Warning: Generated ${trackIds.length} tracks instead of requested ${trackCount}`);
        }
        const playlistTracks = await db_1.default.track.findMany({
            where: {
                id: { in: trackIds }
            },
            include: {
                artist: {
                    select: {
                        artistName: true
                    }
                },
                genres: {
                    include: {
                        genre: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });
        if (playlistTracks.length > 0 && options.basedOnMood) {
            try {
                let prompt = "Please analyze these songs and verify if they match the following mood:\n\n";
                prompt += `Mood: ${options.basedOnMood}\n`;
                prompt += "\nSongs in the playlist:\n";
                playlistTracks.forEach((track, index) => {
                    prompt += `${index + 1}. ${track.title} by ${track.artist?.artistName || 'Unknown'}\n`;
                    if (track.genres && track.genres.length > 0) {
                        prompt += `   Genres: ${track.genres.map(g => g.genre.name).join(', ')}\n`;
                    }
                    prompt += `   Duration: ${track.duration} seconds\n`;
                    prompt += `   Release Date: ${track.releaseDate.toISOString().split('T')[0]}\n\n`;
                });
                prompt += "\nFor each song, you MUST provide a definitive YES or NO answer (no MAYBE allowed) indicating if it matches the mood. If the answer is NO, explain why and suggest a replacement that would be more appropriate. Base your decision on the song title, genres, and any other available information. Be decisive and clear in your assessment.";
                try {
                    const apiKey = process.env.GEMINI_API_KEY;
                    if (!apiKey) {
                        console.error("[AI] GEMINI_API_KEY is not set in environment variables");
                        return trackIds;
                    }
                    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
                    const modelName = process.env.GEMINI_MODEL || "gemini-pro";
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 1024,
                        }
                    });
                    const maxRetries = 3;
                    let retryCount = 0;
                    let result;
                    while (retryCount < maxRetries) {
                        try {
                            result = await model.generateContent(prompt);
                            break;
                        }
                        catch (error) {
                            if (error.status === 429 && retryCount < maxRetries - 1) {
                                const retryDelay = 120 * 1000;
                                console.log(`[AI] Rate limit hit, waiting ${retryDelay / 1000}s before retry...`);
                                await new Promise(resolve => setTimeout(resolve, retryDelay));
                                retryCount++;
                                continue;
                            }
                            throw error;
                        }
                    }
                    if (!result) {
                        throw new Error("Failed to generate content after retries");
                    }
                    const response = await result.response;
                    const text = response.text();
                    console.log("[AI] Gemini verification result:", text);
                    const lines = text.split('\n');
                    const mismatchedTracks = [];
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        if (line.includes("NO") || line.toLowerCase().includes("doesn't match") || line.toLowerCase().includes("does not match")) {
                            const prevLine = lines[i - 1];
                            if (prevLine && prevLine.match(/^\d+\./)) {
                                const index = parseInt(prevLine.split('.')[0]) - 1;
                                if (index >= 0 && index < playlistTracks.length) {
                                    mismatchedTracks.push({
                                        index,
                                        reason: line
                                    });
                                }
                            }
                        }
                    }
                    if (mismatchedTracks.length > 0) {
                        console.log(`[AI] Found ${mismatchedTracks.length} tracks that don't match the criteria. Replacing them...`);
                        const validTrackIds = trackIds.filter((_, index) => !mismatchedTracks.some(mt => mt.index === index));
                        const replacementCount = mismatchedTracks.length;
                        const replacementQuery = {
                            where: {
                                isActive: true,
                                id: { notIn: validTrackIds },
                                ...whereClause,
                                ...(options.basedOnMood ? await getMoodFilter(options.basedOnMood) : {}),
                                ...(options.basedOnGenre ? enhancedGenreFilter : {}),
                                ...(options.basedOnArtist ? {
                                    artist: {
                                        artistName: {
                                            contains: options.basedOnArtist,
                                            mode: "insensitive",
                                        },
                                    },
                                } : {}),
                            },
                            include: {
                                artist: true,
                                genres: {
                                    include: {
                                        genre: true
                                    }
                                }
                            },
                            orderBy: [
                                { playCount: client_1.Prisma.SortOrder.desc },
                                { createdAt: client_1.Prisma.SortOrder.desc }
                            ],
                            take: replacementCount * 2,
                        };
                        const replacementTracks = await db_1.default.track.findMany(replacementQuery);
                        if (replacementTracks.length === 0) {
                            console.log("[AI] No suitable replacement tracks found in database");
                            return trackIds;
                        }
                        const selectedReplacements = replacementTracks
                            .sort(() => Math.random() - 0.5)
                            .slice(0, replacementCount);
                        console.log("[AI] Selected replacement tracks:", selectedReplacements.map(t => t.title));
                        const updatedTrackIds = [...validTrackIds];
                        mismatchedTracks.forEach((mt, index) => {
                            if (selectedReplacements[index]) {
                                updatedTrackIds.splice(mt.index, 0, selectedReplacements[index].id);
                            }
                        });
                        if (playlistId) {
                            try {
                                await db_1.default.playlist.update({
                                    where: { id: playlistId },
                                    data: {
                                        tracks: {
                                            deleteMany: {}
                                        }
                                    }
                                });
                                await db_1.default.playlist.update({
                                    where: { id: playlistId },
                                    data: {
                                        tracks: {
                                            create: updatedTrackIds.map((id, index) => ({
                                                track: { connect: { id } },
                                                trackOrder: index
                                            }))
                                        }
                                    }
                                });
                                console.log(`[AI] Successfully updated playlist with ${updatedTrackIds.length} tracks`);
                            }
                            catch (error) {
                                console.error("[AI] Error updating playlist:", error);
                            }
                        }
                        trackIds = updatedTrackIds;
                        if (playlistId) {
                            const updatedPlaylist = await db_1.default.playlist.findUnique({
                                where: { id: playlistId },
                                include: {
                                    tracks: {
                                        include: {
                                            track: {
                                                include: {
                                                    artist: true,
                                                    genres: {
                                                        include: {
                                                            genre: true
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            });
                            if (updatedPlaylist) {
                                console.log("[AI] Updated playlist tracks:", updatedPlaylist.tracks.map(t => t.track.title));
                            }
                        }
                        return trackIds;
                    }
                    else {
                        console.log("[AI] All tracks match the criteria.");
                    }
                }
                catch (error) {
                    console.error("[AI] Error during Gemini verification:", error);
                    console.log("[AI] Continuing with original playlist due to verification error");
                }
            }
            catch (error) {
                console.error("[AI] Error during Gemini verification:", error);
            }
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
        let playlistDescription = options.description ||
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
const generateDefaultPlaylistForNewUser = async (userId, options = {}) => {
    try {
        console.log(`[AI] Generating default playlist for new user ${userId}`);
        const trackCount = options.trackCount || 10;
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
async function getMoodFilter(mood) {
    const moodKeywords = {
        happy: ['happy', 'joy', 'cheerful', 'upbeat', 'energetic', 'positive', 'sunny', 'bright', 'uplifting', 'fun', 'party', 'dance', 'celebrate', 'smile', 'laugh'],
        sad: ['sad', 'melancholy', 'depressing', 'down', 'emotional', 'heartbreak', 'tears', 'cry', 'pain', 'lonely', 'missing', 'hurt', 'broken', 'sorrow', 'grief'],
        calm: ['calm', 'peaceful', 'relaxing', 'serene', 'tranquil', 'gentle', 'soothing', 'quiet', 'meditation', 'zen', 'peace', 'soft', 'smooth', 'easy', 'light'],
        energetic: ['energetic', 'powerful', 'strong', 'intense', 'dynamic', 'power', 'force', 'drive', 'pump', 'boost', 'high', 'rush', 'adrenaline', 'fast', 'loud'],
        romantic: ['romantic', 'love', 'passion', 'intimate', 'sweet', 'tender', 'affection', 'heart', 'soul', 'forever', 'together', 'kiss', 'embrace', 'devotion', 'adore'],
        nostalgic: ['nostalgic', 'memories', 'retro', 'vintage', 'classic', 'old', 'remember', 'past', 'yesterday', 'childhood', 'memory', 'throwback', 'throw back', 'old school'],
        mysterious: ['mysterious', 'mystery', 'dark', 'enigmatic', 'secret', 'hidden', 'unknown', 'strange', 'weird', 'curious', 'enigma', 'puzzle', 'riddle', 'shadow', 'veil'],
        dreamy: ['dreamy', 'ethereal', 'atmospheric', 'ambient', 'floating', 'space', 'cloud', 'dream', 'fantasy', 'magical', 'heavenly', 'celestial', 'cosmic', 'astral', 'ether'],
        angry: ['angry', 'rage', 'furious', 'aggressive', 'intense', 'hate', 'frustrated', 'mad', 'angst', 'fury', 'wrath', 'outrage', 'violent', 'hostile', 'hostility'],
        hopeful: ['hopeful', 'optimistic', 'inspiring', 'uplifting', 'motivation', 'dream', 'future', 'hope', 'faith', 'believe', 'trust', 'confidence', 'courage', 'strength', 'light']
    };
    const moodGenres = {
        happy: ['pop', 'dance', 'disco', 'funk'],
        sad: ['blues', 'soul', 'ballad', 'indie'],
        calm: ['ambient', 'classical', 'jazz', 'acoustic'],
        energetic: ['rock', 'metal', 'electronic', 'hip-hop'],
        romantic: ['r&b', 'soul', 'jazz', 'pop'],
        nostalgic: ['oldies', 'classic rock', 'folk', 'retro'],
        mysterious: ['electronic', 'ambient', 'experimental', 'instrumental'],
        dreamy: ['ambient', 'electronic', 'indie', 'alternative'],
        angry: ['metal', 'rock', 'punk', 'hardcore'],
        hopeful: ['gospel', 'pop', 'indie', 'alternative']
    };
    const normalizedMood = mood.toLowerCase().trim();
    let matchingKeywords = [];
    let matchingCategory = '';
    for (const [category, keywords] of Object.entries(moodKeywords)) {
        if (keywords.some(keyword => normalizedMood.includes(keyword))) {
            matchingKeywords = keywords;
            matchingCategory = category;
            console.log(`[AI] Found mood category: ${category} with ${keywords.length} keywords`);
            break;
        }
    }
    if (matchingKeywords.length === 0) {
        matchingKeywords = [normalizedMood];
        console.log(`[AI] No specific mood category found, using input mood: ${normalizedMood}`);
    }
    const selectedKeywords = matchingKeywords.slice(0, 5);
    console.log(`[AI] Using keywords for mood filter: ${selectedKeywords.join(', ')}`);
    const orConditions = selectedKeywords.flatMap(keyword => [
        {
            title: {
                contains: keyword,
                mode: client_1.Prisma.QueryMode.insensitive
            }
        },
        {
            genres: {
                some: {
                    genre: {
                        name: {
                            contains: keyword,
                            mode: client_1.Prisma.QueryMode.insensitive
                        }
                    }
                }
            }
        }
    ]);
    if (matchingCategory && moodGenres[matchingCategory]) {
        const genreConditions = moodGenres[matchingCategory].map(genre => ({
            genres: {
                some: {
                    genre: {
                        name: {
                            contains: genre,
                            mode: client_1.Prisma.QueryMode.insensitive
                        }
                    }
                }
            }
        }));
        orConditions.push(...genreConditions);
    }
    return {
        AND: [
            { isActive: true },
            { OR: orConditions }
        ]
    };
}
async function analyzeGenre(genreInput) {
    console.log(`[AI] Analyzing genre: "${genreInput}"`);
    const normalizedInput = genreInput.trim().toLowerCase();
    console.log(`[AI] Normalized input: "${normalizedInput}"`);
    let mainGenre = null;
    let mainGenreId = null;
    const foundSubGenres = [];
    const foundRelatedGenres = [];
    const foundParentGenres = [];
    const allGenres = await db_1.default.genre.findMany({
        select: { id: true, name: true },
    });
    console.log(`[AI] Found ${allGenres.length} genres in database`);
    const exactGenre = allGenres.find((genre) => genre.name.toLowerCase() === normalizedInput);
    if (exactGenre) {
        console.log(`[AI] Found exact genre match: ${exactGenre.name}`);
        mainGenre = exactGenre.name;
        mainGenreId = exactGenre.id;
    }
    else {
        for (const [genre, synonyms] of Object.entries(genreSynonyms)) {
            if (genre.toLowerCase() === normalizedInput ||
                synonyms.some((s) => s.toLowerCase() === normalizedInput)) {
                console.log(`[AI] Found genre from synonyms: ${genre}`);
                const dbGenre = allGenres.find((g) => g.name.toLowerCase() === genre.toLowerCase());
                if (dbGenre) {
                    mainGenre = dbGenre.name;
                    mainGenreId = dbGenre.id;
                    break;
                }
            }
        }
        if (!mainGenre) {
            const keywordGenres = allGenres.filter((genre) => genre.name.toLowerCase().includes(normalizedInput));
            if (keywordGenres.length > 0) {
                let bestMatch = keywordGenres[0];
                let bestScore = 0;
                for (const genre of keywordGenres) {
                    const genreName = genre.name.toLowerCase();
                    let score = 0;
                    if (genreName === normalizedInput) {
                        score += 100;
                    }
                    else if (genreName.startsWith(normalizedInput)) {
                        score += 80;
                    }
                    else if (genreName.endsWith(normalizedInput)) {
                        score += 60;
                    }
                    else if (genreName.includes(normalizedInput)) {
                        score += 40;
                    }
                    const lengthRatio = normalizedInput.length / genreName.length;
                    if (lengthRatio > 0.8) {
                        score += 20;
                    }
                    else if (lengthRatio > 0.5) {
                        score += 10;
                    }
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = genre;
                    }
                }
                if (bestScore >= 40) {
                    console.log(`[AI] Found best keyword match: ${bestMatch.name} (score: ${bestScore})`);
                    mainGenre = bestMatch.name;
                    mainGenreId = bestMatch.id;
                }
                else {
                    const fuzzyResults = allGenres.filter((genre) => genre.name.toLowerCase().includes(normalizedInput.substring(0, 3)));
                    if (fuzzyResults.length > 0) {
                        let closestMatch = fuzzyResults[0];
                        let minDistance = levenshteinDistance(normalizedInput, closestMatch.name.toLowerCase());
                        for (const result of fuzzyResults) {
                            const distance = levenshteinDistance(normalizedInput, result.name.toLowerCase());
                            if (distance < minDistance) {
                                minDistance = distance;
                                closestMatch = result;
                            }
                        }
                        if (minDistance < 2) {
                            console.log(`[AI] Found fuzzy match: ${closestMatch.name} (distance: ${minDistance})`);
                            mainGenre = closestMatch.name;
                            mainGenreId = closestMatch.id;
                        }
                    }
                }
            }
        }
    }
    if (mainGenre) {
        const subGenres = genreHierarchy[mainGenre.toLowerCase()] || [];
        for (const subGenre of subGenres) {
            const dbSubGenre = allGenres.find((g) => g.name.toLowerCase() === subGenre.toLowerCase());
            if (dbSubGenre) {
                foundSubGenres.push({
                    id: dbSubGenre.id,
                    name: dbSubGenre.name,
                });
            }
        }
        const related = relatedGenres[mainGenre.toLowerCase()] || [];
        for (const relatedGenre of related) {
            const dbRelatedGenre = allGenres.find((g) => g.name.toLowerCase() === relatedGenre.toLowerCase());
            if (dbRelatedGenre) {
                foundRelatedGenres.push({
                    id: dbRelatedGenre.id,
                    name: dbRelatedGenre.name,
                });
            }
        }
        for (const [parent, children] of Object.entries(genreHierarchy)) {
            if (children.some((child) => child.toLowerCase() === mainGenre.toLowerCase())) {
                const dbParentGenre = allGenres.find((g) => g.name.toLowerCase() === parent.toLowerCase());
                if (dbParentGenre) {
                    foundParentGenres.push({
                        id: dbParentGenre.id,
                        name: dbParentGenre.name,
                    });
                }
            }
        }
    }
    console.log(`[AI] Analysis results:`, {
        mainGenre,
        mainGenreId,
        subGenres: foundSubGenres.length,
        relatedGenres: foundRelatedGenres.length,
        parentGenres: foundParentGenres.length,
    });
    return {
        mainGenre,
        mainGenreId,
        relatedGenres: foundRelatedGenres,
        subGenres: foundSubGenres,
        parentGenres: foundParentGenres,
    };
}
const genreHierarchy = {
    rock: [
        "alternative rock",
        "classic rock",
        "hard rock",
        "indie rock",
        "progressive rock",
        "punk rock",
        "psychedelic rock",
        "soft rock",
        "blues rock",
        "folk rock",
        "garage rock",
        "grunge",
        "metal",
    ],
    pop: [
        "dance pop",
        "electropop",
        "indie pop",
        "k-pop",
        "synth-pop",
        "art pop",
        "baroque pop",
        "dream pop",
        "j-pop",
        "power pop",
        "teen pop",
        "V-Pop",
    ],
    "hip hop": [
        "trap",
        "rap",
        "drill",
        "old school hip hop",
        "alternative hip hop",
        "conscious hip hop",
        "east coast hip hop",
        "west coast hip hop",
        "southern hip hop",
        "gangsta rap",
        "abstract hip hop",
        "boom bap",
        "trip hop",
    ],
    "r&b": [
        "soul",
        "funk",
        "contemporary r&b",
        "neo soul",
        "quiet storm",
        "new jack swing",
        "motown",
        "disco",
    ],
    electronic: [
        "techno",
        "house",
        "edm",
        "ambient",
        "drum and bass",
        "dubstep",
        "trance",
        "idm",
        "electro",
        "breakbeat",
        "downtempo",
        "electronica",
    ],
    jazz: [
        "bebop",
        "swing",
        "smooth jazz",
        "cool jazz",
        "hard bop",
        "fusion",
        "modal jazz",
        "free jazz",
        "jazz funk",
        "big band",
    ],
    classical: [
        "baroque",
        "romantic",
        "modern classical",
        "orchestral",
        "chamber music",
        "opera",
        "symphony",
        "concerto",
        "sonata",
        "minimalism",
    ],
    folk: [
        "americana",
        "traditional folk",
        "folk rock",
        "contemporary folk",
        "celtic",
        "bluegrass",
        "singer-songwriter",
        "folk pop",
    ],
    country: [
        "alternative country",
        "traditional country",
        "outlaw country",
        "country pop",
        "country rock",
        "bluegrass",
        "americana",
        "honky tonk",
        "nashville sound",
    ],
    metal: [
        "heavy metal",
        "thrash metal",
        "death metal",
        "black metal",
        "power metal",
        "doom metal",
        "progressive metal",
        "nu metal",
        "metalcore",
        "folk metal",
        "symphonic metal",
    ],
    blues: [
        "chicago blues",
        "delta blues",
        "electric blues",
        "country blues",
        "jump blues",
        "rhythm and blues",
        "soul blues",
    ],
    reggae: [
        "dancehall",
        "dub",
        "roots reggae",
        "ska",
        "rocksteady",
        "reggaeton",
        "lover's rock",
    ],
    punk: [
        "hardcore punk",
        "post-punk",
        "pop punk",
        "anarcho-punk",
        "skate punk",
        "garage punk",
        "emo",
    ],
    world: [
        "afrobeat",
        "latin",
        "bossa nova",
        "salsa",
        "samba",
        "flamenco",
        "fado",
        "reggaeton",
        "k-pop",
        "j-pop",
        "bollywood",
    ],
    funk: [
        "p-funk",
        "go-go",
        "funk rock",
        "funk metal",
        "afrofunk",
        "deep funk",
        "soul funk",
        "electro funk",
    ],
    latin: [
        "salsa",
        "bossa nova",
        "samba",
        "tango",
        "bachata",
        "reggaeton",
        "latin pop",
        "latin jazz",
        "cumbia",
        "merengue",
    ],
    alternative: [
        "indie",
        "alternative rock",
        "post-punk",
        "new wave",
        "college rock",
        "alt-country",
        "grunge",
        "britpop",
        "shoegaze",
        "dream pop",
        "industrial",
    ],
    indie: [
        "indie rock",
        "indie pop",
        "indie folk",
        "indie electronic",
        "lo-fi",
        "bedroom pop",
        "shoegaze",
        "dream pop",
        "post-punk revival",
    ],
    edm: [
        "house",
        "techno",
        "trance",
        "dubstep",
        "trap",
        "drum and bass",
        "future bass",
        "big room",
        "progressive house",
        "hardstyle",
    ],
};
const genreSynonyms = {
    rock: ["rock and roll", "rock n roll", "rock & roll", "rockn roll"],
    "hip hop": ["hiphop", "hip-hop", "rap"],
    "r&b": ["rnb", "rhythm and blues", "rhythm & blues"],
    electronic: ["electronica", "electro", "electronic dance music", "edm"],
    classical: ["orchestra", "orchestral", "symphony", "classic"],
    alternative: ["alt", "alt rock", "alternative music"],
    indie: ["independent", "indie music"],
    edm: ["electronic dance music", "electronic dance", "dance music", "club"],
    metal: ["heavy", "headbanger", "metalhead"],
    funk: ["funky", "funk music"],
    disco: ["70s dance", "discotheque"],
    house: ["deep house", "house music", "club house"],
    trance: ["trance music", "psytrance"],
    techno: ["techno music", "detroit techno"],
    ambient: ["ambient music", "atmospheric", "chill"],
    jazz: ["jazzy", "jazz music"],
};
const relatedGenres = {
    rock: ["punk", "metal", "alternative", "indie", "blues"],
    pop: ["dance pop", "r&b", "indie pop", "electropop", "hip hop"],
    "hip hop": ["r&b", "trap", "pop", "electronic", "funk"],
    "r&b": ["soul", "hip hop", "funk", "jazz", "pop"],
    electronic: ["edm", "ambient", "techno", "house", "pop"],
    jazz: ["blues", "funk", "soul", "r&b", "classical"],
    classical: ["soundtrack", "opera", "jazz", "ambient", "folk"],
    folk: ["country", "acoustic", "indie folk", "singer-songwriter", "americana"],
    country: ["folk", "americana", "bluegrass", "country rock", "country pop"],
    metal: ["rock", "hard rock", "punk", "alternative", "progressive"],
    blues: ["rock", "jazz", "r&b", "soul", "folk"],
    reggae: ["dancehall", "ska", "world", "dub", "hip hop"],
    punk: ["rock", "hardcore", "alternative", "post-punk", "indie"],
    world: ["latin", "reggae", "afrobeat", "folk", "traditional"],
    funk: ["r&b", "soul", "disco", "jazz", "hip hop"],
    latin: ["salsa", "reggaeton", "pop", "world", "dance"],
    alternative: ["indie", "rock", "post-punk", "grunge", "shoegaze"],
    indie: ["alternative", "rock", "indie pop", "indie rock", "indie folk"],
    edm: ["electronic", "house", "techno", "trance", "dubstep"],
};
function levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
}
function calculateTrackScore(track, params) {
    let score = 0;
    let parameterMatchScore = 0;
    if (params.basedOnGenre && track.genres) {
        const genreMatch = track.genres.some((g) => g.genre.name.toLowerCase().includes(params.basedOnGenre.toLowerCase()));
        if (genreMatch)
            parameterMatchScore += 20;
    }
    if (params.basedOnArtist && track.artist) {
        const artistMatch = track.artist.artistName.toLowerCase().includes(params.basedOnArtist.toLowerCase());
        if (artistMatch)
            parameterMatchScore += 20;
    }
    if (params.basedOnSongLength && track.duration) {
        const lengthDiff = Math.abs(track.duration - params.basedOnSongLength);
        if (lengthDiff <= 30)
            parameterMatchScore += 20;
    }
    if (params.basedOnReleaseTime && track.releaseDate) {
        const releaseYear = new Date(track.releaseDate).getFullYear();
        const currentYear = new Date().getFullYear();
        switch (params.basedOnReleaseTime.toLowerCase()) {
            case 'new':
                if (releaseYear === currentYear)
                    parameterMatchScore += 20;
                break;
            case 'recent':
                if (releaseYear >= currentYear - 2)
                    parameterMatchScore += 20;
                break;
            case 'classic':
                if (releaseYear <= currentYear - 20)
                    parameterMatchScore += 20;
                break;
        }
    }
    score += parameterMatchScore;
    const trackAge = Date.now() - new Date(track.createdAt).getTime();
    const daysOld = trackAge / (1000 * 60 * 60 * 24);
    const newnessScore = Math.max(0, 10 - (daysOld / 90));
    score += newnessScore;
    const popularityScore = Math.min(10, (track.playCount || 0) / 200);
    score += popularityScore;
    score += Math.random() * 5;
    return score;
}
//# sourceMappingURL=ai.service.js.map