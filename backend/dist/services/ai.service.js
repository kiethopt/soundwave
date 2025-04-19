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
const client_2 = require("@prisma/client");
const spotify_web_api_node_1 = __importDefault(require("spotify-web-api-node"));
const spotifyApi = new spotify_web_api_node_1.default({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});
async function refreshSpotifyToken() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        console.log('[AI] Spotify API token refreshed');
        setTimeout(refreshSpotifyToken, (data.body['expires_in'] - 60) * 1000);
    }
    catch (error) {
        console.error('[AI] Error refreshing Spotify token:', error);
    }
}
if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    refreshSpotifyToken();
}
else {
    console.warn('[AI] Spotify credentials not found, advanced audio analysis will be limited');
}
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
        if (options.basedOnReleaseTime) {
            const currentYear = new Date().getFullYear();
            const releaseTimeValue = String(options.basedOnReleaseTime).toLowerCase();
            const yearValue = Number(options.basedOnReleaseTime);
            if (!isNaN(yearValue) && yearValue > 1900 && yearValue <= currentYear) {
                const startDate = new Date(yearValue, 0, 1);
                const endDate = new Date(yearValue, 11, 31, 23, 59, 59);
                whereClause.releaseDate = {
                    gte: startDate,
                    lte: endDate
                };
                console.log(`[AI] Filtering for tracks released in ${yearValue}`);
            }
            else {
                switch (releaseTimeValue) {
                    case 'new':
                    case 'newest':
                    case 'recent':
                        whereClause.releaseDate = {
                            gte: new Date(currentYear, 0, 1)
                        };
                        console.log('[AI] Filtering for new tracks released this year');
                        break;
                    case 'last year':
                        whereClause.releaseDate = {
                            gte: new Date(currentYear - 1, 0, 1),
                            lt: new Date(currentYear, 0, 1)
                        };
                        console.log('[AI] Filtering for tracks released last year');
                        break;
                    case 'recent years':
                    case 'last 5 years':
                        whereClause.releaseDate = {
                            gte: new Date(currentYear - 5, 0, 1)
                        };
                        console.log('[AI] Filtering for tracks released in the last 5 years');
                        break;
                    case 'decade':
                    case 'last decade':
                        whereClause.releaseDate = {
                            gte: new Date(currentYear - 10, 0, 1)
                        };
                        console.log('[AI] Filtering for tracks released in the last decade');
                        break;
                    case 'classics':
                    case 'classic':
                    case 'old':
                        whereClause.releaseDate = {
                            lt: new Date(currentYear - 20, 0, 1)
                        };
                        console.log('[AI] Filtering for classic tracks (over 20 years old)');
                        break;
                    default:
                        if (releaseTimeValue.includes('s') || releaseTimeValue.includes('\'s')) {
                            const decade = parseInt(releaseTimeValue.replace(/[^0-9]/g, ''), 10);
                            if (!isNaN(decade) && decade >= 0 && decade <= 90) {
                                const fullDecade = decade < 100 ? 1900 + decade : decade;
                                whereClause.releaseDate = {
                                    gte: new Date(fullDecade, 0, 1),
                                    lt: new Date(fullDecade + 10, 0, 1)
                                };
                                console.log(`[AI] Filtering for tracks from the ${decade}s`);
                            }
                            else {
                                console.log(`[AI] Unrecognized decade format: ${releaseTimeValue}`);
                            }
                        }
                        else {
                            console.log(`[AI] Unknown release time filter: ${options.basedOnReleaseTime}`);
                        }
                }
            }
        }
        if (options.basedOnSongLength) {
            const lengthValue = Number(options.basedOnSongLength);
            if (!isNaN(lengthValue)) {
                whereClause.duration = {
                    lte: lengthValue
                };
                console.log(`[AI] Filtering for tracks with duration <= ${lengthValue} seconds`);
            }
            else {
                const songLengthValue = String(options.basedOnSongLength).toLowerCase();
                switch (songLengthValue) {
                    case 'short':
                        whereClause.duration = { lte: 180 };
                        console.log('[AI] Filtering for short tracks (under 3 minutes)');
                        break;
                    case 'medium':
                        whereClause.duration = {
                            gte: 180,
                            lte: 300
                        };
                        console.log('[AI] Filtering for medium-length tracks (3-5 minutes)');
                        break;
                    case 'long':
                        whereClause.duration = { gte: 300 };
                        console.log('[AI] Filtering for longer tracks (over 5 minutes)');
                        break;
                    default:
                        console.log(`[AI] Unknown song length filter: ${options.basedOnSongLength}`);
                }
            }
        }
        if (options.basedOnDecade) {
            const decadeStart = typeof options.basedOnDecade === 'string'
                ? parseInt(options.basedOnDecade, 10)
                : options.basedOnDecade;
            whereClause.releaseDate = {
                gte: new Date(decadeStart, 0, 1),
                lt: new Date(decadeStart + 10, 0, 1),
            };
        }
        else if (options.basedOnYearRange) {
            const { start, end } = options.basedOnYearRange;
            whereClause.releaseDate = {
                gte: new Date(start, 0, 1),
                lt: new Date(end + 1, 0, 1),
            };
        }
        const hasArtistParam = options.basedOnArtist ? true : false;
        const hasGenreParam = options.basedOnGenre ? true : false;
        const hasMoodParam = options.basedOnMood ? true : false;
        const hasSongLengthParam = options.basedOnSongLength ? true : false;
        const hasReleaseTimeParam = options.basedOnReleaseTime ? true : false;
        let artistRatio = 0.5;
        let genreRatio = 0.3;
        let popularRatio = 0.2;
        if (hasMoodParam && !hasGenreParam && !hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.4;
            genreRatio = 0.4;
            popularRatio = 0.2;
        }
        else if (hasMoodParam && hasGenreParam && !hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.3;
            genreRatio = 0.5;
            popularRatio = 0.2;
        }
        else if (hasMoodParam && !hasGenreParam && hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.6;
            genreRatio = 0.3;
            popularRatio = 0.1;
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
            artistRatio = 0.3;
            genreRatio = 0.6;
            popularRatio = 0.1;
        }
        else if (!hasMoodParam && hasGenreParam && hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.6;
            genreRatio = 0.3;
            popularRatio = 0.1;
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
            artistRatio = 0.7;
            genreRatio = 0.2;
            popularRatio = 0.1;
        }
        else if (!hasMoodParam && !hasGenreParam && hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
            artistRatio = 0.6;
            genreRatio = 0.3;
            popularRatio = 0.1;
        }
        else if (!hasMoodParam && !hasGenreParam && hasArtistParam && hasSongLengthParam && hasReleaseTimeParam) {
            artistRatio = 0.6;
            genreRatio = 0.2;
            popularRatio = 0.2;
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
            const artistFilter = options.basedOnArtist
                ? {
                    artist: {
                        artistName: {
                            contains: options.basedOnArtist,
                            mode: "insensitive",
                        },
                    },
                }
                : { artistId: { in: Array.from(preferredArtistIds) } };
            const artistTracksQuery = {
                where: {
                    isActive: true,
                    ...artistFilter,
                    ...(selectedGenreId && options.basedOnArtist
                        ? {
                            genres: {
                                some: {
                                    genreId: selectedGenreId,
                                },
                            },
                        }
                        : {}),
                    ...whereClause,
                    ...moodFilter,
                },
                orderBy: [
                    { createdAt: client_2.Prisma.SortOrder.desc },
                    { playCount: client_2.Prisma.SortOrder.desc },
                ],
                take: artistTrackCount * 2,
            };
            artistTracks = await db_1.default.track.findMany(artistTracksQuery);
            const scoredArtistTracks = artistTracks.map(track => {
                return {
                    ...track,
                    score: artistPreferenceScore[track.artistId] || 0
                };
            }).sort((a, b) => b.score - a.score);
            const selectedArtistTracks = scoredArtistTracks.slice(0, artistTrackCount);
            trackIds = selectedArtistTracks.map(track => track.id);
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
                    ...whereClause,
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
                                            .map(id => {
                                            const track = artistTracks.find(t => t.id === id);
                                            return track?.artistId;
                                        })
                                            .filter(Boolean))),
                                    },
                                }
                                : {}),
                },
                orderBy: [{ playCount: client_2.Prisma.SortOrder.desc }, { createdAt: client_2.Prisma.SortOrder.desc }],
                take: genreTrackCount * 2,
            };
            const genreTracks = await db_1.default.track.findMany(genreTracksQuery);
            const scoredGenreTracks = genreTracks.map(track => {
                let genreRelevanceScore = 0;
                track.genres?.forEach((genreRel) => {
                    const genreIndex = sortedPreferredGenres.indexOf(genreRel.genreId);
                    if (genreIndex !== -1) {
                        genreRelevanceScore += Math.max(0.2, 1 - (genreIndex / sortedPreferredGenres.length));
                    }
                });
                const popularityScore = Math.min(1, (track.playCount || 0) / 1000);
                const trackAgeDays = Math.max(1, Math.floor((Date.now() - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
                const recencyScore = Math.exp(-trackAgeDays / 365);
                const finalScore = (genreRelevanceScore * 0.5) + (popularityScore * 0.3) + (recencyScore * 0.2);
                return {
                    ...track,
                    score: finalScore
                };
            }).sort((a, b) => b.score - a.score);
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
                    ...whereClause,
                    ...moodFilter,
                },
                orderBy: { playCount: client_2.Prisma.SortOrder.desc },
                take: remainingNeeded,
            };
            const popularTracks = await db_1.default.track.findMany(popularTracksQuery);
            trackIds = [...trackIds, ...popularTracks.map(t => t.id)];
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
async function getMoodFilter(mood) {
    const moodToGenreMap = {
        energetic: ["Pop", "EDM", "Rock", "Dance", "Electronic", "Hip Hop", "Punk", "Metal", "Trap"],
        calm: ["Acoustic", "Jazz", "Classical", "Ambient", "Lo-fi", "Folk", "New Age", "Chillout", "Instrumental"],
        happy: ["Pop", "Dance", "Funk", "Disco", "R&B", "Indie Pop", "Synthpop", "K-Pop", "J-Pop", "Upbeat"],
        sad: ["Ballad", "Blues", "Soul", "Acoustic", "Indie", "Alternative", "Emo", "R&B", "Singer-Songwriter"],
        nostalgic: ["Oldies", "Classic Rock", "Classic", "80s", "90s", "Retro", "Vintage", "Golden Oldies", "Throwback"],
        romantic: ["R&B", "Soul", "Ballad", "Jazz", "Acoustic", "Pop Ballad", "Bolero", "Love Songs", "Soft Rock"],
        focused: ["Classical", "Lo-fi", "Ambient", "Instrumental", "Jazz", "Post-Rock", "Minimal", "Electronic", "Study"],
        party: ["Dance", "EDM", "Hip Hop", "Pop", "Disco", "Rap", "Reggaeton", "House", "Trap", "Club"],
        intense: ["Rock", "Metal", "Hardcore", "Punk", "Industrial", "Drum and Bass", "Dubstep", "Heavy Metal", "Grunge"],
        relaxed: ["Reggae", "Chill", "Bossa Nova", "Lounge", "Smooth Jazz", "Downtempo", "Trip-Hop", "Easy Listening"],
        melancholic: ["Alternative", "Indie", "Post-Rock", "Shoegaze", "Dream Pop", "Ambient", "Contemporary Classical"],
        uplifting: ["Gospel", "Worship", "Inspirational", "Motivational", "Positive", "Upbeat", "Feel Good"],
        dreamy: ["Dream Pop", "Shoegaze", "Ambient", "Chillwave", "Psychedelic", "Ethereal", "Space Music"],
        dramatic: ["Soundtrack", "Orchestral", "Cinematic", "Epic", "Trailer Music", "Film Score"],
    };
    const activityToGenreMap = {
        workout: ["EDM", "Hip Hop", "Rock", "Electronic", "Pop", "Metal", "Trap"],
        study: ["Classical", "Lo-fi", "Ambient", "Jazz", "Instrumental", "Acoustic"],
        sleep: ["Ambient", "Classical", "New Age", "Lo-fi", "Chillout", "Instrumental"],
        driving: ["Rock", "Pop", "Electronic", "Hip Hop", "Country", "R&B"],
        meditation: ["Ambient", "New Age", "Classical", "World", "Instrumental", "Lo-fi"],
        gaming: ["Electronic", "Rock", "Metal", "Dubstep", "Soundtrack", "Lo-fi"],
        cooking: ["Jazz", "Pop", "Soul", "Funk", "Acoustic", "Latin"],
        reading: ["Classical", "Ambient", "Jazz", "Lo-fi", "Acoustic", "Instrumental"],
        party: ["Dance", "Hip Hop", "Pop", "Electronic", "Reggaeton", "R&B", "Latin"],
        focus: ["Classical", "Lo-fi", "Ambient", "Post-Rock", "Instrumental", "Electronic"],
    };
    const moodToAudioCharacteristics = {
        energetic: { tempo: { gte: 120 }, energy: { gte: 0.7 }, valence: { gte: 0.4 } },
        calm: { tempo: { lte: 100 }, energy: { lte: 0.5 }, acousticness: { gte: 0.5 } },
        happy: { valence: { gte: 0.6 }, energy: { gte: 0.4 } },
        sad: { valence: { lte: 0.4 }, tempo: { lte: 110 } },
        intense: { energy: { gte: 0.8 }, loudness: { gte: -8 }, tempo: { gte: 100 } },
        relaxed: { tempo: { lte: 95 }, energy: { lte: 0.4 }, acousticness: { gte: 0.5 }, instrumentalness: { gte: 0.2 } },
        focused: { instrumentalness: { gte: 0.5 }, speechiness: { lte: 0.1 }, energy: { between: [0.3, 0.7] } },
        party: { danceability: { gte: 0.7 }, energy: { gte: 0.6 }, tempo: { gte: 100 } },
        nostalgic: { acousticness: { gte: 0.3 } },
        romantic: { valence: { between: [0.3, 0.7] }, tempo: { lte: 110 }, acousticness: { gte: 0.2 } },
        melancholic: { valence: { lte: 0.3 }, energy: { lte: 0.6 }, tempo: { lte: 100 } },
        uplifting: { valence: { gte: 0.6 }, energy: { gte: 0.5 } },
        dreamy: { instrumentalness: { gte: 0.3 }, tempo: { lte: 110 }, acousticness: { gte: 0.3 } },
        dramatic: { energy: { gte: 0.6 }, loudness: { gte: -10 }, tempo: { between: [70, 130] } },
    };
    const activityToAudioCharacteristics = {
        workout: { energy: { gte: 0.7 }, tempo: { gte: 120 }, danceability: { gte: 0.6 } },
        study: { instrumentalness: { gte: 0.3 }, energy: { between: [0.3, 0.6] }, speechiness: { lte: 0.1 } },
        sleep: { energy: { lte: 0.4 }, tempo: { lte: 80 }, acousticness: { gte: 0.5 }, loudness: { lte: -12 } },
        driving: { energy: { gte: 0.5 }, danceability: { gte: 0.5 }, tempo: { gte: 100 } },
        meditation: { instrumentalness: { gte: 0.7 }, energy: { lte: 0.3 }, tempo: { lte: 70 } },
        gaming: { energy: { gte: 0.6 }, tempo: { gte: 110 } },
        cooking: { valence: { gte: 0.5 }, energy: { between: [0.4, 0.7] } },
        reading: { instrumentalness: { gte: 0.4 }, energy: { lte: 0.5 }, tempo: { lte: 100 } },
        party: { danceability: { gte: 0.7 }, energy: { gte: 0.7 }, speechiness: { gte: 0.1 } },
        focus: { instrumentalness: { gte: 0.4 }, energy: { between: [0.3, 0.6] }, speechiness: { lte: 0.1 } },
    };
    const normalizedInput = mood.toLowerCase().trim();
    console.log(`[AI] Processing mood/activity: "${normalizedInput}"`);
    const allMoods = Object.keys(moodToGenreMap);
    const allActivities = Object.keys(activityToAudioCharacteristics);
    let matchedTerm = '';
    if (moodToGenreMap[normalizedInput]) {
        matchedTerm = normalizedInput;
        console.log(`[AI] Exact mood match found: ${matchedTerm}`);
    }
    else if (activityToAudioCharacteristics[normalizedInput] || activityToGenreMap[normalizedInput]) {
        matchedTerm = normalizedInput;
        console.log(`[AI] Exact activity match found: ${matchedTerm}`);
    }
    else {
        const possibleMoods = allMoods.filter(m => normalizedInput.includes(m) || m.includes(normalizedInput));
        if (possibleMoods.length > 0) {
            matchedTerm = possibleMoods[0];
            console.log(`[AI] Similar mood match found: ${matchedTerm} for input "${normalizedInput}"`);
        }
        else {
            const possibleActivities = allActivities.filter(a => normalizedInput.includes(a) || a.includes(normalizedInput));
            if (possibleActivities.length > 0) {
                matchedTerm = possibleActivities[0];
                console.log(`[AI] Similar activity match found: ${matchedTerm} for input "${normalizedInput}"`);
            }
            else {
                console.log(`[AI] No match found for: "${normalizedInput}"`);
                return {};
            }
        }
    }
    let audioCharacteristics = {};
    let relevantGenres = [];
    if (moodToGenreMap[matchedTerm]) {
        relevantGenres = moodToGenreMap[matchedTerm] || [];
        audioCharacteristics = moodToAudioCharacteristics[matchedTerm] || {};
        console.log(`[AI] Using mood: ${matchedTerm} with ${relevantGenres.length} genres`);
    }
    else if (activityToGenreMap[matchedTerm]) {
        relevantGenres = activityToGenreMap[matchedTerm] || [];
        audioCharacteristics = activityToAudioCharacteristics[matchedTerm] || {};
        console.log(`[AI] Using activity: ${matchedTerm} with ${relevantGenres.length} genres`);
    }
    else if (activityToAudioCharacteristics[matchedTerm]) {
        audioCharacteristics = activityToAudioCharacteristics[matchedTerm];
        console.log(`[AI] Using activity: ${matchedTerm} with audio characteristics only`);
    }
    else {
        console.log(`[AI] Logic error - matched term ${matchedTerm} not found in maps`);
        return {};
    }
    const filter = {};
    const genreCondition = relevantGenres.length > 0 ? await createGenreCondition(relevantGenres) : null;
    const audioCondition = Object.keys(audioCharacteristics).length > 0 ? createAudioCondition(audioCharacteristics) : null;
    console.log(`[AI] Filter conditions: genres=${!!genreCondition}, audio=${!!audioCondition}`);
    if (genreCondition && audioCondition) {
        filter.AND = [genreCondition, audioCondition];
    }
    else if (genreCondition) {
        return genreCondition;
    }
    else if (audioCondition) {
        return audioCondition;
    }
    return filter;
}
async function createGenreCondition(relevantGenres) {
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
    return null;
}
function createAudioCondition(audioCharacteristics) {
    console.log("[AI] Audio characteristics filtering is not supported directly in database queries");
    return null;
}
async function getSpotifyAudioFeatures(trackName, artistName) {
    try {
        if (!spotifyApi.getAccessToken()) {
            await refreshSpotifyToken();
        }
        const searchResult = await spotifyApi.searchTracks(`track:${trackName} artist:${artistName}`, { limit: 1 });
        if (searchResult.body.tracks && searchResult.body.tracks.items.length > 0) {
            const trackId = searchResult.body.tracks.items[0].id;
            const featuresResult = await spotifyApi.getAudioFeaturesForTrack(trackId);
            if (featuresResult.body) {
                console.log(`[AI] Found Spotify audio features for "${trackName}" by ${artistName}`);
                return featuresResult.body;
            }
        }
        console.log(`[AI] No Spotify results found for "${trackName}" by ${artistName}`);
        return null;
    }
    catch (error) {
        console.error('[AI] Error getting Spotify audio features:', error);
        return null;
    }
}
function analyzeMood(audioFeatures) {
    const moods = {};
    if (audioFeatures.valence > 0.8) {
        moods.happy = moods.happy || 0 + 0.8;
        moods.energetic = moods.energetic || 0 + 0.4;
    }
    else if (audioFeatures.valence > 0.6) {
        moods.happy = moods.happy || 0 + 0.6;
        moods.uplifting = moods.uplifting || 0 + 0.5;
    }
    else if (audioFeatures.valence < 0.3) {
        moods.sad = moods.sad || 0 + 0.7;
        moods.melancholic = moods.melancholic || 0 + 0.6;
    }
    else if (audioFeatures.valence < 0.4) {
        moods.sad = moods.sad || 0 + 0.5;
        moods.nostalgic = moods.nostalgic || 0 + 0.4;
    }
    if (audioFeatures.energy > 0.8) {
        moods.energetic = moods.energetic || 0 + 0.9;
        moods.intense = moods.intense || 0 + 0.8;
        moods.party = moods.party || 0 + 0.7;
    }
    else if (audioFeatures.energy > 0.6) {
        moods.energetic = moods.energetic || 0 + 0.7;
        moods.uplifting = moods.uplifting || 0 + 0.5;
    }
    else if (audioFeatures.energy < 0.4) {
        moods.calm = moods.calm || 0 + 0.8;
        moods.relaxed = moods.relaxed || 0 + 0.7;
    }
    else if (audioFeatures.energy < 0.3) {
        moods.calm = moods.calm || 0 + 0.9;
        moods.relaxed = moods.relaxed || 0 + 0.8;
        moods.dreamy = moods.dreamy || 0 + 0.6;
    }
    if (audioFeatures.acousticness > 0.7) {
        moods.calm = moods.calm || 0 + 0.6;
        moods.romantic = moods.romantic || 0 + 0.5;
        moods.nostalgic = moods.nostalgic || 0 + 0.4;
    }
    if (audioFeatures.danceability > 0.7) {
        moods.party = moods.party || 0 + 0.8;
        moods.energetic = moods.energetic || 0 + 0.6;
        moods.happy = moods.happy || 0 + 0.5;
    }
    else if (audioFeatures.danceability > 0.5) {
        moods.uplifting = moods.uplifting || 0 + 0.5;
    }
    if (audioFeatures.instrumentalness > 0.7) {
        moods.focused = moods.focused || 0 + 0.8;
        moods.dreamy = moods.dreamy || 0 + 0.6;
        moods.calm = moods.calm || 0 + 0.5;
    }
    else if (audioFeatures.instrumentalness > 0.4) {
        moods.focused = moods.focused || 0 + 0.6;
    }
    if (audioFeatures.tempo > 140) {
        moods.energetic = moods.energetic || 0 + 0.7;
        moods.intense = moods.intense || 0 + 0.6;
        moods.party = moods.party || 0 + 0.5;
    }
    else if (audioFeatures.tempo > 120) {
        moods.energetic = moods.energetic || 0 + 0.6;
        moods.uplifting = moods.uplifting || 0 + 0.5;
    }
    else if (audioFeatures.tempo < 80) {
        moods.calm = moods.calm || 0 + 0.7;
        moods.relaxed = moods.relaxed || 0 + 0.6;
        moods.dreamy = moods.dreamy || 0 + 0.5;
    }
    else if (audioFeatures.tempo < 100) {
        moods.relaxed = moods.relaxed || 0 + 0.5;
    }
    if (audioFeatures.loudness > -5) {
        moods.intense = moods.intense || 0 + 0.6;
        moods.energetic = moods.energetic || 0 + 0.5;
    }
    else if (audioFeatures.loudness < -10) {
        moods.calm = moods.calm || 0 + 0.5;
        moods.intimate = moods.intimate || 0 + 0.7;
    }
    if (audioFeatures.mode === 1) {
        moods.happy = moods.happy || 0 + 0.5;
        moods.uplifting = moods.uplifting || 0 + 0.4;
    }
    else {
        moods.melancholic = moods.melancholic || 0 + 0.5;
        moods.dramatic = moods.dramatic || 0 + 0.4;
    }
    if (audioFeatures.valence < 0.4 && audioFeatures.energy > 0.7) {
        moods.angry = moods.angry || 0 + 0.8;
        moods.intense = moods.intense || 0 + 0.7;
    }
    if (audioFeatures.valence > 0.6 && audioFeatures.tempo < 100 && audioFeatures.acousticness > 0.5) {
        moods.peaceful = moods.peaceful || 0 + 0.8;
        moods.content = moods.content || 0 + 0.7;
    }
    if (audioFeatures.valence < 0.3 && audioFeatures.energy < 0.4 && audioFeatures.acousticness > 0.6) {
        moods.somber = moods.somber || 0 + 0.9;
        moods.heartbroken = moods.heartbroken || 0 + 0.8;
    }
    const sortedMoods = Object.entries(moods)
        .sort(([, a], [, b]) => b - a)
        .map(([mood]) => mood);
    return sortedMoods.slice(0, 3);
}
function analyzeActivity(audioFeatures) {
    const activities = {};
    if (audioFeatures.tempo > 120 && audioFeatures.energy > 0.7) {
        activities.workout = 0.9;
        activities.running = 0.8;
    }
    else if (audioFeatures.tempo > 100 && audioFeatures.energy > 0.6) {
        activities.workout = 0.6;
        activities.jogging = 0.7;
    }
    if (audioFeatures.instrumentalness > 0.6 && audioFeatures.energy < 0.7) {
        activities.study = 0.9;
        activities.focus = 0.9;
        activities.work = 0.8;
    }
    else if (audioFeatures.speechiness < 0.1 && audioFeatures.energy > 0.3 && audioFeatures.energy < 0.6) {
        activities.study = 0.7;
        activities.focus = 0.7;
        activities.work = 0.6;
    }
    if (audioFeatures.energy < 0.3 && audioFeatures.tempo < 80) {
        activities.sleep = 0.9;
        activities.meditation = 0.8;
        activities.relaxation = 0.9;
    }
    else if (audioFeatures.energy < 0.4 && audioFeatures.acousticness > 0.6) {
        activities.sleep = 0.7;
        activities.meditation = 0.6;
        activities.relaxation = 0.8;
    }
    if (audioFeatures.energy > 0.5 && audioFeatures.danceability > 0.5) {
        activities.driving = 0.8;
        activities.roadtrip = 0.7;
    }
    else if (audioFeatures.energy > 0.7 && audioFeatures.tempo > 100) {
        activities.driving = 0.7;
        activities.commuting = 0.6;
    }
    if (audioFeatures.danceability > 0.7 && audioFeatures.energy > 0.7) {
        activities.party = 0.9;
        activities.dancing = 0.9;
        activities.clubbing = 0.8;
    }
    else if (audioFeatures.danceability > 0.6 && audioFeatures.energy > 0.6) {
        activities.party = 0.7;
        activities.socializing = 0.8;
    }
    if (audioFeatures.instrumentalness > 0.5 && audioFeatures.energy < 0.5) {
        activities.reading = 0.8;
    }
    else if (audioFeatures.acousticness > 0.6 && audioFeatures.energy < 0.4) {
        activities.reading = 0.7;
    }
    if (audioFeatures.valence > 0.5 && audioFeatures.energy > 0.4 && audioFeatures.energy < 0.7) {
        activities.cooking = 0.7;
        activities.baking = 0.6;
    }
    else if (audioFeatures.danceability > 0.5 && audioFeatures.valence > 0.6) {
        activities.cooking = 0.6;
        activities.housework = 0.7;
    }
    if (audioFeatures.energy > 0.7 && audioFeatures.tempo > 110) {
        activities.gaming = 0.8;
        activities.competitive = 0.7;
    }
    else if (audioFeatures.energy > 0.6 && audioFeatures.tempo > 100) {
        activities.gaming = 0.6;
        activities.casual_gaming = 0.7;
    }
    if (audioFeatures.energy > 0.6 && audioFeatures.valence > 0.6) {
        activities.hiking = 0.7;
        activities.beach = 0.7;
        activities.outdoor = 0.8;
    }
    if (audioFeatures.tempo < 90 && audioFeatures.energy < 0.5 && audioFeatures.instrumentalness > 0.4) {
        activities.yoga = 0.9;
        activities.stretching = 0.8;
    }
    if (audioFeatures.energy > 0.4 && audioFeatures.energy < 0.7 && audioFeatures.instrumentalness > 0.3) {
        activities.creative_work = 0.8;
        activities.art = 0.7;
        activities.writing = 0.7;
    }
    const sortedActivities = Object.entries(activities)
        .sort(([, a], [, b]) => b - a)
        .map(([activity]) => activity);
    return sortedActivities.slice(0, 3);
}
//# sourceMappingURL=ai.service.js.map