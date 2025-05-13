"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePlaylistDescriptionAI = exports.getTopPlayedTrackIds = exports.generateDefaultPlaylistForNewUser = exports.createAIGeneratedPlaylist = void 0;
const generative_ai_1 = require("@google/generative-ai");
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
console.log("[AI Service Debug] Value of PlaylistPrivacy.PRIVATE:", client_1.PlaylistPrivacy.PRIVATE);
console.log("[AI Service Debug] Value of PlaylistPrivacy.PUBLIC:", client_1.PlaylistPrivacy.PUBLIC);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not found in .env. AI features will be disabled.");
}
const genAI = GEMINI_API_KEY ? new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY) : null;
const model = genAI
    ? genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME })
    : null;
const generationConfig = {
    temperature: 0.7,
    topK: 1,
    topP: 0.95,
    maxOutputTokens: 2048,
};
const safetySettings = [
    {
        category: generative_ai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: generative_ai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: generative_ai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: generative_ai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: generative_ai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
];
function escapeBackticks(str) {
    if (str === null || str === undefined)
        return "";
    return str.replace(/`/g, "\\`");
}
async function getAvailableTrackIds(limit = 500) {
    const tracks = await db_1.default.track.findMany({
        where: {
            isActive: true,
            artist: {
                isActive: true,
            },
        },
        orderBy: [{ playCount: "desc" }, { releaseDate: "desc" }],
        take: limit,
        select: { id: true },
    });
    return tracks.map((t) => t.id);
}
const createAIGeneratedPlaylist = async (input) => {
    if (!model) {
        throw new errors_1.HttpError(503, "AI Service is not available. GEMINI_API_KEY might be missing.");
    }
    const { targetUserId, generationMode, seedTrackIds = [], historyTracks = [], requestedTrackCount, type, requestedPrivacy = client_1.PlaylistPrivacy.PRIVATE, customPromptKeywords, } = input;
    let prompt = "";
    let selectedTrackIds = [];
    let isArtistOnlyModeActive = false;
    let artistSpecificTrackPoolIdsForPrompt = [];
    let historyTrackIdSetForFiltering = undefined;
    const availableSystemTrackIds = await getAvailableTrackIds(1000);
    if (availableSystemTrackIds.length === 0) {
        throw new errors_1.HttpError(500, "No available tracks in the system to generate a playlist from.");
    }
    const allAvailableTracksString = availableSystemTrackIds.join(", ");
    let customKeywordsPreamble = "";
    if (customPromptKeywords && customPromptKeywords.trim() !== "") {
        customKeywordsPreamble = `IMPORTANT: The administrator has provided the following specific generation guidelines. Adhere to them closely:\n${escapeBackticks(customPromptKeywords.trim())}\n\nBased on these guidelines and the user's listening history below, proceed with the recommendation.\n\n`;
    }
    if (generationMode === "userHistory" && historyTracks.length > 0) {
        const historyTracksString = historyTracks
            .map((t) => {
            const safeTitle = escapeBackticks(t.title);
            const safeArtistName = escapeBackticks(t.artistName);
            const safeGenres = t.genres.map((g) => escapeBackticks(g)).join(", ");
            return `  - Title: "${safeTitle}", Artist: ${safeArtistName}, ID: ${t.id} (Genres: ${safeGenres}, Tempo: ${t.tempo || "N/A"}, Mood: ${t.mood || "N/A"}, Key: ${t.key || "N/A"} ${t.scale || ""}, Energy: ${t.energy}, Danceability: ${t.danceability})`;
        })
            .join("\n");
        const historyTrackIds = historyTracks.map((t) => t.id);
        historyTrackIdSetForFiltering = new Set(historyTrackIds);
        isArtistOnlyModeActive = false;
        artistSpecificTrackPoolIdsForPrompt = [];
        let historyArtistNamesForPrompt = [];
        const keywords = customPromptKeywords?.toLowerCase() || "";
        if (customPromptKeywords &&
            keywords.startsWith("strictly prioritize tracks whose artist profiles") &&
            keywords.includes("analyze the most listened to artists and similar artists") &&
            !keywords.includes("genres") &&
            !keywords.includes("mood") &&
            !keywords.includes("tempo") &&
            !keywords.includes("musical key") &&
            !keywords.includes("danceability") &&
            !keywords.includes("energy")) {
            console.log("[AI Service] Artist-Only mode candidate based on customPromptKeywords.");
            historyArtistNamesForPrompt = Array.from(new Set(historyTracks.map((t) => t.artistName)));
            if (historyArtistNamesForPrompt.length > 0) {
                const tracksByHistoryArtists = await db_1.default.track.findMany({
                    where: {
                        artist: {
                            artistName: { in: historyArtistNamesForPrompt },
                            isActive: true,
                        },
                        isActive: true,
                        id: {
                            in: availableSystemTrackIds,
                            notIn: historyTrackIds,
                        },
                    },
                    select: { id: true },
                });
                artistSpecificTrackPoolIdsForPrompt = tracksByHistoryArtists.map((t) => t.id);
                if (artistSpecificTrackPoolIdsForPrompt.length > 0) {
                    isArtistOnlyModeActive = true;
                    console.log(`[AI Service] Activated Artist-Only mode. Found ${artistSpecificTrackPoolIdsForPrompt.length} tracks from ${historyArtistNamesForPrompt.length} artists (excluding history).`);
                }
                else {
                    console.log("[AI Service] Artist-Only mode: No suitable tracks found from user's history artists (excluding already listened). Falling back to standard history-based recommendation with artist preference from preamble.");
                }
            }
            else {
                console.log("[AI Service] Artist-Only mode: No artists found in history. Falling back.");
            }
        }
        if (isArtistOnlyModeActive) {
            prompt = `${customKeywordsPreamble}You are Soundwave AI, an expert music curator.
A user wants a playlist featuring *other* songs by artists they already enjoy.
Their listening history (provided for context but not for re-selection) includes tracks by the following artists: ${historyArtistNamesForPrompt.join(", ")}.

Your task is to recommend up to ${requestedTrackCount} NEW and DIVERSE songs exclusively from these artists.
The recommended songs MUST NOT be from their listening history (IDs: ${historyTrackIds.join(", ")}).
The songs you recommend MUST be chosen EXCLUSIVELY from the following list of available tracks by these artists in our system (${artistSpecificTrackPoolIdsForPrompt.length} tracks total):
${artistSpecificTrackPoolIdsForPrompt.join(", ")}.
Do not invent new track IDs. Only use IDs from the provided list.
Prioritize variety among the selected tracks from these artists.
If the available pool of tracks by these artists is less than ${requestedTrackCount}, recommend all unique and suitable tracks from this pool.

Please provide your recommendations as a JSON array of track IDs. Example: ["trackId1", "trackId2"]
Output format should be a JSON object like this:
{
  "recommended_track_ids": ["id1", "id2"],
  "explanation": "This playlist features more tracks from artists like ${historyArtistNamesForPrompt
                .slice(0, 2)
                .join(" and ")} that you've enjoyed."
}
`;
        }
        else {
            prompt = `${customKeywordsPreamble}You are Soundwave AI, an expert music recommendation engine.
A user has the following listening history:
${historyTracksString}

Analyze this user's taste based on their listening history (preferred genres, artists, moods, energy levels, danceability, tempo ranges, keys).
Ensure your recommendations are fresh, diverse, and explore different facets of the user's potential taste, not just repeating the most obvious patterns.
Your task is to recommend EXACTLY ${requestedTrackCount} NEW and DIVERSE songs that would fit this user's taste.
You MUST return exactly ${requestedTrackCount} unique track IDs from the provided pool. If you cannot, explain why in the explanation field, but always try to return exactly ${requestedTrackCount} IDs.
The recommended songs MUST NOT be from their listening history (IDs: ${historyTrackIds.join(", ")}).
The songs you recommend MUST be chosen EXCLUSIVELY from the following list of available track IDs in our system: ${allAvailableTracksString}.
Do not invent new track IDs. Only use IDs from the provided list.
If finding ${requestedTrackCount} distinct tracks that perfectly match all aspects of the user's history is challenging from the available list, slightly broaden your interpretation of 'fitting the user's taste' to ensure the list contains ${requestedTrackCount} tracks. Prioritize variety and discovery.
Please provide your recommendations as a JSON array of ${requestedTrackCount} track IDs. Example: ["trackId1", ..., "trackId${requestedTrackCount}"]
Additionally, very briefly (1-2 sentences total for the whole playlist), explain your choices based on the user's history. If you cannot return exactly ${requestedTrackCount} tracks, explain the reason in the explanation field.
Output format should be a JSON object like this:
{
  "recommended_track_ids": ["id1", ..., "id${requestedTrackCount}"],
  "explanation": "Brief explanation here."
}
`;
        }
    }
    else {
        let currentSeedTrackIds = seedTrackIds;
        if (!currentSeedTrackIds || currentSeedTrackIds.length === 0) {
            console.warn("[AI Service] No seed tracks provided for topGlobalTracks mode, fetching generic top tracks.");
            currentSeedTrackIds = await (0, exports.getTopPlayedTrackIds)(30);
            if (currentSeedTrackIds.length === 0) {
                throw new errors_1.HttpError(500, "No seed tracks available to generate a playlist.");
            }
        }
        const validSeedTracksForPrompt = currentSeedTrackIds.filter((id) => availableSystemTrackIds.includes(id));
        if (validSeedTracksForPrompt.length === 0) {
            throw new errors_1.HttpError(500, "None of the provided seed tracks are available in the current system catalog for selection.");
        }
        prompt = `${customKeywordsPreamble}You are Soundwave AI, a playlist curator.
Your task is to select ${requestedTrackCount} tracks to create a "Popular Mix" playlist.
You MUST choose these tracks EXCLUSIVELY from the following list of available track IDs: ${validSeedTracksForPrompt.join(", ")}.
Do not invent new track IDs. Only use IDs from the provided list.
Aim for a diverse selection that represents popular music.
Please provide your selection as a JSON array of track IDs. Example: ["trackId1", "trackId2", "trackId3"]
Output format should be a JSON object like this:
{
  "recommended_track_ids": ["id1", "id2", ...]
}
`;
    }
    console.log("[AI Service] Sending prompt to Gemini:", prompt);
    try {
        const result = await model.generateContentStream({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig,
            safetySettings,
        });
        let aggregatedResponseText = "";
        for await (const chunk of result.stream) {
            if (chunk.candidates && chunk.candidates.length > 0) {
                const candidate = chunk.candidates[0];
                if (candidate.content &&
                    candidate.content.parts &&
                    candidate.content.parts.length > 0) {
                    aggregatedResponseText += candidate.content.parts[0].text;
                }
            }
        }
        console.log("[AI Service] Aggregated Gemini response text:", aggregatedResponseText);
        let geminiOutputTrackIds = [];
        let explanationFromAI = undefined;
        try {
            const cleanedJsonString = aggregatedResponseText
                .replace(/^```json\s*|```$/g, "")
                .trim();
            const parsedResponse = JSON.parse(cleanedJsonString);
            if (parsedResponse &&
                parsedResponse.recommended_track_ids &&
                Array.isArray(parsedResponse.recommended_track_ids)) {
                geminiOutputTrackIds = parsedResponse.recommended_track_ids.map(String);
                explanationFromAI = parsedResponse.explanation;
                console.log("[AI Service] Successfully parsed track IDs from Gemini JSON object:", geminiOutputTrackIds);
            }
            else {
                const arrayMatch = aggregatedResponseText.match(/\[([\\s\\S]*?)\]/);
                if (arrayMatch && arrayMatch[0]) {
                    geminiOutputTrackIds = JSON.parse(arrayMatch[0]).map(String);
                    console.log("[AI Service] Successfully parsed track IDs from regex match (array only):", geminiOutputTrackIds);
                }
                else {
                    throw new Error("No valid JSON array or object with recommended_track_ids found.");
                }
            }
        }
        catch (parseError) {
            console.error("[AI Service] Failed to parse track IDs from Gemini response after multiple attempts:", aggregatedResponseText, parseError);
            if (generationMode === "userHistory") {
                console.warn("[AI Service] Gemini failed to provide tracks in userHistory mode. Attempting to use generic top tracks as an emergency fallback.");
                const emergencyFallbackIds = await (0, exports.getTopPlayedTrackIds)(requestedTrackCount + 20);
                const historyTrackIdSetForFallback = new Set(historyTracks.map((t) => t.id));
                geminiOutputTrackIds = emergencyFallbackIds
                    .filter((id) => !historyTrackIdSetForFallback.has(id))
                    .slice(0, requestedTrackCount);
                if (geminiOutputTrackIds.length === 0) {
                    throw new errors_1.HttpError(500, "AI failed and no fallback tracks could be retrieved that are not in history.");
                }
            }
            else {
                throw new errors_1.HttpError(500, "AI failed to return a valid list of track IDs from the provided seed.");
            }
        }
        const uniqueGeminiIds = Array.from(new Set(geminiOutputTrackIds.map(String)));
        let trackPoolSetForFiltering;
        let sourceDescriptionForLog;
        if (isArtistOnlyModeActive) {
            trackPoolSetForFiltering = new Set(artistSpecificTrackPoolIdsForPrompt);
            sourceDescriptionForLog = "Artist-Only specific pool";
        }
        else {
            trackPoolSetForFiltering = new Set(availableSystemTrackIds);
            sourceDescriptionForLog = "general available system tracks";
        }
        let filteredGeminiOutputTrackIds = uniqueGeminiIds.filter((id) => trackPoolSetForFiltering.has(id));
        if (generationMode === "userHistory" && historyTrackIdSetForFiltering) {
            filteredGeminiOutputTrackIds = filteredGeminiOutputTrackIds.filter((id) => !historyTrackIdSetForFiltering.has(id));
        }
        console.log(`[AI Service] Gemini initially suggested ${geminiOutputTrackIds.length} IDs (raw unique: ${uniqueGeminiIds.length}). Using ${sourceDescriptionForLog} (${trackPoolSetForFiltering.size} IDs) and excluding history tracks, ${filteredGeminiOutputTrackIds.length} IDs remain for playlist consideration.`);
        let finalTrackIds = [...filteredGeminiOutputTrackIds];
        finalTrackIds = Array.from(new Set(finalTrackIds));
        if (finalTrackIds.length > requestedTrackCount) {
            finalTrackIds = finalTrackIds.slice(0, requestedTrackCount);
        }
        if (finalTrackIds.length < requestedTrackCount) {
            console.warn(`[AI Service][WARNING] Gemini/AI did NOT return enough tracks: requested ${requestedTrackCount}, got ${finalTrackIds.length}. Explanation from AI:`, explanationFromAI || "(no explanation)");
        }
        if (finalTrackIds.length === 0) {
            console.warn(`[AI Service] No valid track IDs to form a playlist for user ${targetUserId}. Playlist will be empty.`);
        }
        let finalPlaylistName = "Soundwave Radio";
        let finalPlaylistDescription = "Enjoy fantastic tracks selected by Soundwave AI.";
        let finalCoverUrl = null;
        let tracksForPlaylistCreation = [];
        if (finalTrackIds.length > 0) {
            const detailedTracks = await db_1.default.track.findMany({
                where: {
                    id: { in: finalTrackIds },
                    isActive: true,
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
            });
            const orderedDetailedTracks = finalTrackIds
                .map((id) => detailedTracks.find((t) => t.id === id))
                .filter((t) => t !== undefined);
            if (orderedDetailedTracks.length > 0) {
                const firstTrackArtistName = orderedDetailedTracks[0].artist?.artistName;
                if (firstTrackArtistName) {
                    finalPlaylistName = `${firstTrackArtistName} Playlist`;
                }
                const distinctArtistNames = Array.from(new Set(orderedDetailedTracks
                    .slice(0, 3)
                    .map((t) => t.artist?.artistName)
                    .filter((name) => !!name)));
                if (distinctArtistNames.length > 0) {
                    let descPrefix = "With ";
                    if (distinctArtistNames.length === 1) {
                        descPrefix += `${distinctArtistNames[0]}`;
                    }
                    else if (distinctArtistNames.length === 2) {
                        descPrefix += `${distinctArtistNames[0]}, ${distinctArtistNames[1]}`;
                    }
                    else {
                        descPrefix += `${distinctArtistNames.slice(0, 3).join(", ")}`;
                    }
                    finalPlaylistDescription = `${descPrefix} and more...`;
                }
                tracksForPlaylistCreation = orderedDetailedTracks.map((track, index) => ({
                    trackId: track.id,
                    trackOrder: index + 1,
                }));
            }
            else {
                console.warn(`[AI Service] AI selected track IDs, but none were found active in DB: ${finalTrackIds.join(", ")}`);
            }
        }
        let totalDuration = 0;
        if (tracksForPlaylistCreation.length > 0) {
            const tracksForDurationCalc = await db_1.default.track.findMany({
                where: { id: { in: tracksForPlaylistCreation.map((t) => t.trackId) } },
                select: { duration: true },
            });
            totalDuration = tracksForDurationCalc.reduce((sum, track) => sum + (track.duration || 0), 0);
        }
        console.log("[AI Service] About to create playlist. Data to be saved:", {
            name: finalPlaylistName,
            description: finalPlaylistDescription,
            privacyForDb: requestedPrivacy,
            typeForDb: type,
            userIdForDb: targetUserId,
            isAIGeneratedForDb: true,
            trackCountForDb: finalTrackIds.length,
        });
        const newPlaylist = await db_1.default.playlist.create({
            data: {
                name: finalPlaylistName,
                description: finalPlaylistDescription,
                coverUrl: finalCoverUrl,
                privacy: requestedPrivacy,
                type,
                userId: targetUserId,
                isAIGenerated: true,
                totalTracks: tracksForPlaylistCreation.length,
                totalDuration: totalDuration,
                lastGeneratedAt: new Date(),
                tracks: {
                    create: tracksForPlaylistCreation,
                },
            },
            include: {
                tracks: { include: { track: true } },
            },
        });
        console.log("[AI Service] Playlist created with ID:", newPlaylist.id, "and Privacy:", newPlaylist.privacy);
        return newPlaylist;
    }
    catch (error) {
        console.error("[AI Service] Error during AI playlist generation process:", error);
        if (error instanceof errors_1.HttpError) {
            throw error;
        }
        if (error.message && error.message.includes("SAFETY")) {
            throw new errors_1.HttpError(500, "AI content generation blocked due to safety settings. Please try a different request.");
        }
        throw new errors_1.HttpError(500, `AI service request failed during generation or DB operation: ${error.message || "Unknown error"}`);
    }
    throw new errors_1.HttpError(500, "AI service reached an unexpected final state. This should not happen.");
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
const getTopPlayedTrackIds = async (count = 10) => {
    const topTracks = await db_1.default.track.findMany({
        where: {
            isActive: true,
            artist: { isActive: true },
        },
        orderBy: {
            playCount: "desc",
        },
        take: count,
        select: {
            id: true,
        },
    });
    return topTracks.map((track) => track.id);
};
exports.getTopPlayedTrackIds = getTopPlayedTrackIds;
const generatePlaylistDescriptionAI = async (playlistName, trackTitles) => {
    if (!model) {
        console.warn("[AI Service] AI model not available for generating playlist description.");
        return `A collection of great tracks including ${trackTitles
            .slice(0, 3)
            .join(", ")}.`;
    }
    const prompt = `Generate a short, engaging playlist description (1-2 sentences) for a playlist named "${escapeBackticks(playlistName)}".
The playlist includes tracks like: ${trackTitles
        .slice(0, 5)
        .map((t) => escapeBackticks(t))
        .join(", ")}.
Focus on the vibe or theme these tracks might suggest. Be creative!`;
    try {
        const result = await model.generateContentStream({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                ...generationConfig,
                maxOutputTokens: 150,
                temperature: 0.7,
            },
            safetySettings,
        });
        let aggregatedResponseText = "";
        for await (const chunk of result.stream) {
            if (chunk.candidates &&
                chunk.candidates.length > 0 &&
                chunk.candidates[0].content &&
                chunk.candidates[0].content.parts &&
                chunk.candidates[0].content.parts.length > 0) {
                aggregatedResponseText += chunk.candidates[0].content.parts[0].text;
            }
        }
        return aggregatedResponseText.trim().replace(/\\n/g, " ");
    }
    catch (error) {
        console.error("[AI Service] Error generating playlist description with AI:", error);
        return `Enjoy this mix: "${escapeBackticks(playlistName)}" featuring top songs.`;
    }
};
exports.generatePlaylistDescriptionAI = generatePlaylistDescriptionAI;
//# sourceMappingURL=ai.service.js.map