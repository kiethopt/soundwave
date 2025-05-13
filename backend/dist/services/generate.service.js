"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePlaylistCoverImage = generatePlaylistCoverImage;
exports.generatePlaylistFromPrompt = generatePlaylistFromPrompt;
exports.suggestTracksForExistingPlaylist = suggestTracksForExistingPlaylist;
const generative_ai_1 = require("@google/generative-ai");
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const prisma_selects_1 = require("../utils/prisma-selects");
const cloudinary_1 = require("../utils/cloudinary");
const buffer_1 = require("buffer");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. AI playlist generation will not work.");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(GEMINI_API_KEY || "");
const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
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
const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            trackIds: {
                type: generative_ai_1.SchemaType.ARRAY,
                items: { type: generative_ai_1.SchemaType.STRING },
                description: "List of track IDs that match the user's request based on the provided track list.",
            },
            playlistName: {
                type: generative_ai_1.SchemaType.STRING,
                description: "A short, creative name for the playlist based on the user's prompt and the selected tracks (max 5 words)."
            },
            playlistDescription: {
                type: generative_ai_1.SchemaType.STRING,
                description: "A brief description for the playlist based on the user's prompt and the selected tracks (1-2 sentences)."
            }
        },
        required: ['trackIds', 'playlistName', 'playlistDescription'],
    },
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
};
const model = genAI.getGenerativeModel({ model: modelName, safetySettings, generationConfig });
async function getTrackContextForAI(limit = 100) {
    console.log(`[AI Playlist] Fetching top ${limit} tracks for context...`);
    const tracks = await db_1.default.track.findMany({
        where: { isActive: true },
        orderBy: { playCount: 'desc' },
        take: limit,
        select: {
            id: true,
            title: true,
            artist: { select: { artistName: true } },
            genres: { select: { genre: { select: { name: true } } } },
            mood: true,
            tempo: true,
            key: true,
            scale: true,
            danceability: true,
            energy: true,
        }
    });
    console.log(`[AI Playlist] Fetched ${tracks.length} tracks.`);
    const trackContext = tracks.map(track => {
        const genreNames = track.genres.map(g => g.genre.name).join(', ');
        return `- ID: ${track.id}, Title: "${track.title}", Artist: "${track.artist.artistName}", Genres: [${genreNames || 'N/A'}], Mood: ${track.mood || 'N/A'}, Tempo: ${track.tempo || 'N/A'}, Key: ${track.key || 'N/A'} ${track.scale || ''}, Danceability: ${track.danceability !== null ? track.danceability.toFixed(2) : 'N/A'}, Energy: ${track.energy !== null ? track.energy.toFixed(2) : 'N/A'}`;
    }).join('\n');
    return trackContext;
}
async function generatePlaylistCoverImage(playlistName, playlistDescription, artistNames = []) {
    console.log(`[AI Cover] Generating cover image for playlist "${playlistName}" using Gemini Flash`);
    if (!GEMINI_API_KEY) {
        console.error("[AI Cover] Cannot generate cover image: GEMINI_API_KEY is not set.");
        return null;
    }
    try {
        const artistsText = artistNames.length > 0
            ? `featuring artists: ${artistNames.slice(0, 3).join(', ')}${artistNames.length > 3 ? ', and others' : ''}`
            : '';
        const imagePrompt = `Create a modern, artistic album cover for a music playlist titled "${playlistName}". 
      The playlist is about: ${playlistDescription} ${artistsText}.
      Style: Minimalist, modern design with abstract shapes and vibrant colors.
      Make it visually appealing as a playlist cover without any text.`;
        console.log(`[AI Cover] Sending prompt to Gemini Flash: "${imagePrompt.slice(0, 100)}..."`);
        const imageModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-preview-image-generation" });
        const result = await imageModel.generateContent({
            contents: [{ role: "user", parts: [{ text: imagePrompt }] }],
            generationConfig: {
                responseModalities: ["TEXT", "IMAGE"],
            }
        });
        const response = result.response;
        if (response && response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData) {
                        const imageData = buffer_1.Buffer.from(part.inlineData.data, 'base64');
                        const uploadResult = await (0, cloudinary_1.uploadToCloudinary)(imageData, {
                            folder: 'playlist-covers',
                            resource_type: 'image',
                        });
                        const imageUrl = uploadResult.secure_url;
                        console.log(`[AI Cover] Successfully generated and uploaded cover image: ${imageUrl}`);
                        return imageUrl;
                    }
                }
                const textPart = candidate.content.parts.find(p => p.text);
                if (textPart && textPart.text) {
                    console.warn(`[AI Cover] Gemini responded with text but no image: "${textPart.text.substring(0, 100)}..."`);
                }
                else {
                    console.warn("[AI Cover] No image data found in the response parts.");
                }
            }
            else {
                console.warn("[AI Cover] No content found in the response candidate.");
            }
        }
        else {
            console.warn("[AI Cover] No valid candidates found in the response.");
        }
        return null;
    }
    catch (error) {
        console.error("[AI Cover] Error generating cover image with Gemini Flash:", error);
        if (error instanceof Error)
            console.error("[AI Cover] Error Details:", error.message);
        return null;
    }
}
async function generatePlaylistFromPrompt(userId, userPrompt) {
    console.log(`[AI Playlist] Starting generation for user ${userId} with prompt: "${userPrompt}"`);
    if (!GEMINI_API_KEY) {
        console.error("[AI Playlist] Cannot generate playlist: GEMINI_API_KEY is not set.");
        throw new Error("AI features are currently unavailable.");
    }
    const musicKeywords = [
        'song', 'track', 'music', 'artist', 'genre', 'album', 'playlist',
        'add', 'suggest', 'find', 'play', 'listen', 'beat', 'rhythm', 'mood', 'vibe', 'create', 'generate', 'make',
        'pop', 'rock', 'jazz', 'electronic', 'hip hop', 'classical', 'instrumental', 'ost', 'soundtrack',
        'singer', 'band', 'cover', 'remix', 'acoustic', 'electric', 'dance', 'chill', 'workout', 'focus', 'sleep',
        'upbeat', 'sad', 'happy', 'energy', 'tempo', 'ballad', 'lofi', 'anthem', 'oldies', 'hits', 'trending',
        'nhạc', 'bài hát', 'ca sĩ', 'thể loại', 'danh sách phát', 'nghe', 'giai điệu', 'tâm trạng',
        'nhạc trẻ', 'nhạc vàng', 'nhạc trịnh', 'nhạc cách mạng', 'nhạc thiếu nhi', 'nhạc phim', 'v-pop',
        'ca khúc', 'sáng tác', 'hòa tấu', 'nhạc không lời'
    ];
    const normalizedUserPrompt = userPrompt.toLowerCase().trim();
    const isMusicRelated = musicKeywords.some(keyword => normalizedUserPrompt.includes(keyword));
    if (!isMusicRelated && normalizedUserPrompt.length > 0) {
        const commonNonMusicPhrases = ['tell me', 'what is', 'who is', 'how to', 'why is', 'can you explain', 'can you write', 'give me', 'help me with'];
        const isLikelyNonMusicQuestion = commonNonMusicPhrases.some(phrase => normalizedUserPrompt.startsWith(phrase));
        const seemsLikeGibberish = normalizedUserPrompt.length < 10 && !normalizedUserPrompt.includes(" ");
        if (isLikelyNonMusicQuestion || seemsLikeGibberish || (normalizedUserPrompt.length < 15 && !isMusicRelated)) {
            console.log(`[AI Playlist Gen] Prompt "${userPrompt}" deemed non-music related or too vague. Bypassing Gemini.`);
            throw new Error("INVALID_PROMPT:Your request didn't seem to be about creating a music playlist. Please try a prompt like 'Create a playlist of upbeat V-pop songs' or 'Make a lofi playlist for studying'.");
        }
    }
    try {
        const trackContext = await getTrackContextForAI(400);
        if (!trackContext) {
            console.warn("[AI Playlist] No track context available. Cannot generate playlist.");
            return null;
        }
        const systemPrompt = `
You are Soundwave AI, an expert music curator specializing in Vietnamese and international music. Your task is to create a playlist based on the user\'s request using ONLY the tracks provided in the \'Available Tracks\' list.

**Instructions:**
1.  Analyze the user\'s prompt carefully to understand their desired mood, genre, artist, or theme. Consider all provided track attributes (Genres, Mood, Tempo, Key, Scale, Danceability, Energy) for deeper understanding.
2.  Scan the \'Available Tracks\' list. Each track has an ID, Title, Artist, Genres, Mood, Tempo, Key, Scale, Danceability, and Energy.
3.  Select ONLY the track IDs from the \'Available Tracks\' list that BEST match the user's prompt. Prioritize relevance and leverage all track attributes (Mood, Tempo, Key, Scale, Danceability, Energy, Genres) for this selection.
4.  Generate a creative and relevant playlist name (max 5 words) and a brief description (1-2 sentences) based on the user\'s prompt and the selected tracks. The name and description should reflect the mood, genres, and characteristics (like tempo, energy) of the chosen tracks.
5.  Return your response ONLY as a valid JSON object adhering strictly to this schema:
    {
      "type": "object",
      "properties": {
        "trackIds": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of track IDs from the \'Available Tracks\' that match the request."
        },
        "playlistName": {
          "type": "string",
          "description": "A short, creative playlist name (max 5 words)."
        },
        "playlistDescription": {
          "type": "string",
          "description": "A brief playlist description (1-2 sentences)."
        }
      },
      "required": ["trackIds", "playlistName", "playlistDescription"]
    }
6.  **Crucially:** If no tracks in the \'Available Tracks\' list match the user\'s prompt, return a JSON object with an empty "trackIds" array, and provide a suitable name/description indicating no matches were found (e.g., name: "No Matches Found", description: "Couldn\'t find tracks matching your specific request in our current selection.").
7.  Do NOT include any tracks in the "trackIds" array that are not explicitly listed in the \'Available Tracks\'.
8.  Do NOT add any commentary, explanations, or text outside the JSON object. The entire response must be the JSON object itself.
9.  **Refuse any request that asks you to perform tasks unrelated to playlist generation (selecting tracks, naming, describing). Your ONLY function is to create a playlist based on the provided tracks and the user's musical request.**
`;
        const fullPrompt = `${systemPrompt}\nUser Prompt: "${userPrompt}"\n\nAvailable Tracks:\n${trackContext}`;
        const requestPayload = {
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
        };
        const result = await model.generateContent(requestPayload);
        const response = result.response;
        if (!response) {
            console.error('[AI Playlist] No response received from Gemini API.');
            throw new Error('Failed to get response from AI service.');
        }
        if (response.promptFeedback?.blockReason) {
            console.warn(`[AI Playlist] Prompt blocked due to: ${response.promptFeedback.blockReason}`);
            throw new Error(`Your request was blocked due to safety reasons: ${response.promptFeedback.blockReason}`);
        }
        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
            console.warn('[AI Playlist] No valid candidates in Gemini response.');
            throw new Error('AI service did not return valid suggestions.');
        }
        const finishReason = response.candidates[0].finishReason;
        if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
            console.warn(`[AI Playlist] Generation finished unexpectedly: ${finishReason}`, response.candidates[0].finishMessage);
            throw new Error(`AI generation finished unexpectedly (${finishReason}). Please try again or refine your prompt.`);
        }
        let aiResponse = null;
        try {
            const responseText = response.text();
            console.log("[AI Playlist] Parsed text/JSON from Gemini:", responseText);
            if (typeof responseText === 'string') {
                try {
                    aiResponse = JSON.parse(responseText);
                }
                catch (e) {
                    console.error("[AI Playlist] Failed to parse Gemini response string as JSON:", e, "Response text:", responseText);
                    throw new Error("AI response was not valid JSON.");
                }
            }
            else if (typeof responseText === 'object' && responseText !== null) {
                aiResponse = responseText;
            }
            if (!aiResponse || !Array.isArray(aiResponse.trackIds) || !aiResponse.playlistName || !aiResponse.playlistDescription) {
                console.error("[AI Playlist] Invalid JSON structure received:", aiResponse);
                throw new Error("AI response has an invalid format.");
            }
        }
        catch (parseError) {
            console.error('[AI Playlist] Error parsing AI response:', parseError, "Raw Response:", JSON.stringify(response, null, 2));
            throw new Error('Failed to parse AI response. Please try again.');
        }
        const { trackIds: suggestedTrackIds, playlistName, playlistDescription } = aiResponse;
        console.log(`[AI Playlist] AI suggested ${suggestedTrackIds.length} tracks. Name: "${playlistName}", Desc: "${playlistDescription}"`);
        if (suggestedTrackIds.length === 0) {
            console.log("[AI Playlist] AI returned no matching tracks.");
        }
        const existingTracks = await db_1.default.track.findMany({
            where: {
                id: { in: suggestedTrackIds },
                isActive: true,
            },
            select: { id: true, duration: true, artist: { select: { artistName: true } } },
        });
        const validTrackIds = existingTracks.map(t => t.id);
        const invalidTrackIds = suggestedTrackIds.filter(id => !validTrackIds.includes(id));
        if (invalidTrackIds.length > 0) {
            console.warn(`[AI Playlist] AI suggested invalid/inactive track IDs: ${invalidTrackIds.join(', ')}`);
        }
        if (validTrackIds.length === 0 && suggestedTrackIds.length > 0) {
            console.warn("[AI Playlist] AI suggested tracks, but none were valid/active in the DB.");
        }
        console.log(`[AI Playlist] Creating playlist "${playlistName}" for user ${userId} with ${validTrackIds.length} valid tracks.`);
        const totalDuration = existingTracks.reduce((sum, track) => sum + (track.duration || 0), 0);
        const artistNames = [...new Set(existingTracks.map(track => track.artist.artistName))];
        const coverUrl = await generatePlaylistCoverImage(playlistName, playlistDescription, artistNames);
        const newPlaylist = await db_1.default.playlist.create({
            data: {
                name: playlistName.substring(0, 100),
                description: playlistDescription.substring(0, 500),
                userId: userId,
                privacy: client_1.PlaylistPrivacy.PRIVATE,
                type: client_1.PlaylistType.NORMAL,
                isAIGenerated: true,
                coverUrl: coverUrl,
                lastGeneratedAt: new Date(),
                totalTracks: validTrackIds.length,
                totalDuration: totalDuration,
                tracks: {
                    create: validTrackIds.map((trackId, index) => ({
                        trackId: trackId,
                        trackOrder: index + 1,
                    })),
                },
            },
            include: {
                tracks: {
                    orderBy: { trackOrder: 'asc' },
                    include: {
                        track: { select: prisma_selects_1.trackSelect },
                    }
                },
                user: { select: { id: true, name: true, username: true } }
            }
        });
        console.log(`[AI Playlist] Successfully created playlist ID: ${newPlaylist.id}`);
        return newPlaylist;
    }
    catch (error) {
        console.error('[AI Playlist] Error during playlist generation:', error);
        if (error instanceof Error && error.message.startsWith('AI')) {
            throw error;
        }
        throw new Error('Failed to generate AI playlist. Please try again later.');
    }
}
const MAX_SUGGESTIONS_PER_REQUEST = 20;
const DEFAULT_SUGGESTIONS_IF_UNSPECIFIED = 5;
async function suggestTracksForExistingPlaylist(playlistId, userId, userPrompt) {
    console.log(`[AI SuggestMore] Starting suggestion for playlist ${playlistId}, user ${userId}, prompt: "${userPrompt}"`);
    if (!GEMINI_API_KEY) {
        console.error("[AI SuggestMore] Cannot suggest tracks: GEMINI_API_KEY is not set.");
        throw new Error("AI features are currently unavailable.");
    }
    const musicKeywords = [
        'song', 'track', 'music', 'artist', 'genre', 'album', 'playlist',
        'add', 'suggest', 'find', 'play', 'listen', 'beat', 'rhythm', 'mood', 'vibe', 'create', 'generate', 'make',
        'pop', 'rock', 'jazz', 'electronic', 'hip hop', 'classical', 'instrumental', 'ost', 'soundtrack',
        'singer', 'band', 'cover', 'remix', 'acoustic', 'electric', 'dance', 'chill', 'workout', 'focus', 'sleep',
        'upbeat', 'sad', 'happy', 'energy', 'tempo', 'ballad', 'lofi', 'anthem', 'oldies', 'hits', 'trending',
        'nhạc', 'bài hát', 'ca sĩ', 'thể loại', 'danh sách phát', 'nghe', 'giai điệu', 'tâm trạng',
        'nhạc trẻ', 'nhạc vàng', 'nhạc trịnh', 'nhạc cách mạng', 'nhạc thiếu nhi', 'nhạc phim', 'v-pop',
        'ca khúc', 'sáng tác', 'hòa tấu', 'nhạc không lời'
    ];
    const normalizedUserPrompt = userPrompt.toLowerCase().trim();
    const isMusicRelated = musicKeywords.some(keyword => normalizedUserPrompt.includes(keyword));
    if (!isMusicRelated && normalizedUserPrompt.length > 0) {
        const commonNonMusicPhrases = ['tell me', 'what is', 'who is', 'how to', 'why is', 'can you explain', 'can you write', 'give me', 'help me with'];
        const isLikelyNonMusicQuestion = commonNonMusicPhrases.some(phrase => normalizedUserPrompt.startsWith(phrase));
        const seemsLikeGibberish = normalizedUserPrompt.length < 10 && !normalizedUserPrompt.includes(" ");
        if (isLikelyNonMusicQuestion || seemsLikeGibberish || (normalizedUserPrompt.length < 15 && !isMusicRelated)) {
            console.log(`[AI SuggestMore] Prompt "${userPrompt}" deemed non-music related or too vague. Bypassing Gemini.`);
            throw new Error("INVALID_PROMPT:Your request didn't seem to be about suggesting music tracks. Please try a prompt like 'Add more songs by this artist' or 'Suggest similar tracks with higher energy'.");
        }
    }
    try {
        const playlist = await db_1.default.playlist.findUnique({
            where: { id: playlistId },
            include: {
                tracks: {
                    select: {
                        track: {
                            select: {
                                id: true,
                                title: true,
                                artist: { select: { artistName: true } },
                                genres: { select: { genre: { select: { name: true } } } },
                            }
                        }
                    },
                    orderBy: { trackOrder: 'asc' }
                }
            }
        });
        if (!playlist) {
            console.error(`[AI SuggestMore] Playlist with ID ${playlistId} not found.`);
            throw new Error("Playlist not found");
        }
        const currentTrackObjectsInPlaylist = playlist.tracks.map(pt => pt.track);
        const currentTrackIdsInPlaylist = currentTrackObjectsInPlaylist.map(t => t.id);
        const currentTracksContext = currentTrackObjectsInPlaylist.map(track => {
            const genreNames = track.genres.map(g => g.genre.name).join(', ');
            return `- ID: ${track.id}, Title: "${track.title}", Artist: "${track.artist.artistName}", Genres: [${genreNames || 'N/A'}]`;
        }).join('\\n');
        console.log(`[AI SuggestMore] Current playlist has ${currentTrackIdsInPlaylist.length} tracks.`);
        const availableTracksContext = await getTrackContextForAI(250);
        if (!availableTracksContext) {
            console.warn("[AI SuggestMore] No available track context. Cannot suggest tracks.");
            return [];
        }
        const generationConfigSuggest = {
            responseMimeType: "application/json",
            responseSchema: {
                type: generative_ai_1.SchemaType.OBJECT,
                properties: {
                    suggestedTrackIds: {
                        type: generative_ai_1.SchemaType.ARRAY,
                        items: { type: generative_ai_1.SchemaType.STRING },
                        description: `List of unique track IDs suggested to be added. The AI should infer the number of tracks from the user's prompt (e.g., 'add 10 songs', 'suggest 7 V-pop tracks'). If no number is specified, the AI should suggest around ${DEFAULT_SUGGESTIONS_IF_UNSPECIFIED} tracks. These IDs must NOT be in the 'Current Playlist Tracks' list and must be chosen from 'Available Tracks'.`,
                        maxItems: MAX_SUGGESTIONS_PER_REQUEST,
                        minItems: 0
                    },
                },
                required: ['suggestedTrackIds'],
            },
            temperature: 0.8,
            topP: 0.9,
            topK: 40,
        };
        const suggestModel = genAI.getGenerativeModel({ model: modelName, safetySettings, generationConfig: generationConfigSuggest });
        const systemPrompt = `
You are Soundwave AI, an expert music curator. Your task is to suggest additional tracks for an EXISTING playlist based on the user\'s request.
You are given:
1. The user\'s textual request.
2. A list of \'Current Playlist Tracks\' that are already in the playlist.
3. A list of \'Available Tracks\' from which you MUST choose your suggestions. Each available track includes ID, Title, Artist, Genres, Mood, Tempo, Key, Scale, Danceability, and Energy.

**Critical Instructions:**
1.  Analyze the user\'s prompt (e.g., "${userPrompt}") AND the \'Current Playlist Tracks\' to understand the desired mood, genre, artists, or theme for the new additions. Consider all provided track attributes (Genres, Mood, Tempo, Key, Scale, Danceability, Energy) for deeper understanding.
2.  Scan the \'Available Tracks\' list. Each track has an ID, Title, Artist, Genres, Mood, Tempo, Key, Scale, Danceability, and Energy.
3.  Infer the desired number of tracks from the user's prompt. If the user asks for a specific number of tracks (e.g., "add 10 tracks", "give me 7 songs"), aim to provide that many unique track IDs. If no number is specified in the prompt, aim to provide around ${DEFAULT_SUGGESTIONS_IF_UNSPECIFIED} unique track IDs. Select these unique track IDs from the \'Available Tracks\' list that BEST match the user\'s prompt AND stylistically complement the \'Current Playlist Tracks\'. Leverage all track attributes (Mood, Tempo, Key, Scale, Danceability, Energy, Genres) for this selection.
4.  **ABSOLUTELY DO NOT suggest any track IDs that are already present in the \'Current Playlist Tracks\' list.** Your suggestions must be new additions.
5.  If you cannot find a sufficient number of suitable and new tracks from \'Available Tracks\' that meet the user\'s criteria (based on their prompt or the default of ${DEFAULT_SUGGESTIONS_IF_UNSPECIFIED}), suggest as many as you can find, or an empty list if none are suitable AT ALL.
6.  Return your response ONLY as a valid JSON object adhering strictly to the defined schema, containing only the "suggestedTrackIds" array.
7.  Do NOT include any tracks in "suggestedTrackIds" that are not explicitly listed in the \'Available Tracks\'.
8.  Do NOT add any commentary, explanations, or text outside the JSON object. The entire response must be the JSON object itself.
9.  **Strictly Adhere: Your ONLY function is to suggest relevant track IDs based on musical criteria. If the user's prompt asks for anything non-musical (e.g., telling a joke, providing information, writing a story, answering general questions, etc.), you MUST refuse by returning the JSON response: { "suggestedTrackIds": [] }. No other response is acceptable for non-musical requests.**
`;
        const fullPrompt = `${systemPrompt}

User Prompt: "${userPrompt}"

Current Playlist Tracks (DO NOT suggest these IDs: ${currentTrackIdsInPlaylist.join(', ')}):
${currentTracksContext || 'This playlist is currently empty.'}

Available Tracks (Choose ONLY from this list. Each line is a track):
${availableTracksContext}`;
        const result = await suggestModel.generateContent({ contents: [{ role: "user", parts: [{ text: fullPrompt }] }] });
        const response = result.response;
        if (!response) {
            console.error('[AI SuggestMore] No response received from Gemini API.');
            throw new Error('Failed to get response from AI service for suggestions.');
        }
        if (response.promptFeedback?.blockReason) {
            console.warn(`[AI SuggestMore] Prompt blocked due to: ${response.promptFeedback.blockReason}`);
            throw new Error(`Your suggestion request was blocked for safety reasons: ${response.promptFeedback.blockReason}`);
        }
        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
            console.warn('[AI SuggestMore] No valid candidates in Gemini response.');
            throw new Error('AI service did not return valid suggestions.');
        }
        const finishReason = response.candidates[0].finishReason;
        if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
            console.warn(`[AI SuggestMore] Generation finished unexpectedly: ${finishReason}`, response.candidates[0].finishMessage);
        }
        let aiSuggResponse = null;
        try {
            const responseText = response.text();
            if (typeof responseText === 'string') {
                try {
                    aiSuggResponse = JSON.parse(responseText);
                }
                catch (e) {
                    console.error("[AI SuggestMore] Failed to parse Gemini response string as JSON:", e.message, "Response text:", responseText);
                    const arrayMatch = responseText.match(/\[\s*("([^"]|\\")*"\s*,?\s*)*\]/);
                    if (arrayMatch && arrayMatch[0]) {
                        try {
                            aiSuggResponse = { suggestedTrackIds: JSON.parse(arrayMatch[0]) };
                            console.warn("[AI SuggestMore] Partially parsed track IDs from malformed JSON.");
                        }
                        catch (e2) {
                            console.error("[AI SuggestMore] Failed to parse extracted array:", e2);
                            throw new Error("AI suggestions were not valid JSON, even after attempting to extract an array.");
                        }
                    }
                    else {
                        throw new Error("AI suggestions were not valid JSON and no array could be extracted.");
                    }
                }
            }
            else if (typeof responseText === 'object' && responseText !== null) {
                aiSuggResponse = responseText;
            }
            if (!aiSuggResponse || !Array.isArray(aiSuggResponse.suggestedTrackIds)) {
                console.error("[AI SuggestMore] Invalid JSON structure received for suggestions:", aiSuggResponse);
                throw new Error("AI suggestions have an invalid format.");
            }
        }
        catch (parseError) {
            console.error('[AI SuggestMore] Error parsing AI suggestions:', parseError, "Raw Response (if available):", JSON.stringify(response, null, 2));
            throw new Error('Failed to parse AI suggestions. Please try again.');
        }
        const { suggestedTrackIds: rawSuggestedTrackIds } = aiSuggResponse;
        console.log(`[AI SuggestMore] AI suggested ${rawSuggestedTrackIds.length} track IDs raw.`);
        const newUniqueSuggestedIds = [...new Set(rawSuggestedTrackIds)].filter(id => !currentTrackIdsInPlaylist.includes(id));
        console.log(`[AI SuggestMore] Filtered to ${newUniqueSuggestedIds.length} new and unique track IDs.`);
        if (newUniqueSuggestedIds.length === 0) {
            console.log("[AI SuggestMore] AI returned no new tracks to add or all suggestions were duplicates.");
            return [];
        }
        const existingTracks = await db_1.default.track.findMany({
            where: {
                id: { in: newUniqueSuggestedIds },
                isActive: true,
            },
            select: { id: true },
        });
        const validSuggestedTrackIds = existingTracks.map(t => t.id);
        const invalidTrackIds = newUniqueSuggestedIds.filter(id => !validSuggestedTrackIds.includes(id));
        if (invalidTrackIds.length > 0) {
            console.warn(`[AI SuggestMore] AI suggested invalid/inactive track IDs that were filtered out: ${invalidTrackIds.join(', ')}`);
        }
        const finalSuggestions = validSuggestedTrackIds.slice(0, MAX_SUGGESTIONS_PER_REQUEST);
        console.log(`[AI SuggestMore] Returning ${finalSuggestions.length} valid track IDs to add (capped at ${MAX_SUGGESTIONS_PER_REQUEST}).`);
        return finalSuggestions;
    }
    catch (error) {
        console.error('[AI SuggestMore] Error during track suggestion:', error);
        if (error instanceof Error && (error.message.startsWith('AI') || error.message.startsWith('Your suggestion request was blocked'))) {
            throw error;
        }
        throw new Error('Failed to get AI track suggestions. Please try again later.');
    }
}
console.log("generate.service.ts logic loaded");
//# sourceMappingURL=generate.service.js.map