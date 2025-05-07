"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePlaylistCoverImage = generatePlaylistCoverImage;
exports.generatePlaylistFromPrompt = generatePlaylistFromPrompt;
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
        }
    });
    console.log(`[AI Playlist] Fetched ${tracks.length} tracks.`);
    const trackContext = tracks.map(track => {
        const genreNames = track.genres.map(g => g.genre.name).join(', ');
        return `- ID: ${track.id}, Title: "${track.title}", Artist: "${track.artist.artistName}", Genres: [${genreNames || 'N/A'}], Mood: ${track.mood || 'N/A'}, Tempo: ${track.tempo || 'N/A'}`;
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
    try {
        const trackContext = await getTrackContextForAI(150);
        if (!trackContext) {
            console.warn("[AI Playlist] No track context available. Cannot generate playlist.");
            return null;
        }
        const systemPrompt = `
You are Soundwave AI, an expert music curator specializing in Vietnamese and international music. Your task is to create a playlist based on the user's request using ONLY the tracks provided in the 'Available Tracks' list.

**Instructions:**
1.  Analyze the user's prompt carefully to understand their desired mood, genre, artist, or theme.
2.  Scan the 'Available Tracks' list. Each track has an ID, Title, Artist, Genres, Mood, and Tempo.
3.  Select ONLY the track IDs from the 'Available Tracks' list that BEST match the user's prompt. Prioritize relevance to the prompt.
4.  Generate a creative and relevant playlist name (max 5 words) and a brief description (1-2 sentences) based on the user's prompt and the selected tracks.
5.  Return your response ONLY as a valid JSON object adhering strictly to this schema:
    {
      "type": "object",
      "properties": {
        "trackIds": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of track IDs from the 'Available Tracks' that match the request."
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
6.  **Crucially:** If no tracks in the 'Available Tracks' list match the user's prompt, return a JSON object with an empty "trackIds" array, and provide a suitable name/description indicating no matches were found (e.g., name: "No Matches Found", description: "Couldn't find tracks matching your specific request in our current selection.").
7.  Do NOT include any tracks in the "trackIds" array that are not explicitly listed in the 'Available Tracks'.
8.  Do NOT add any commentary, explanations, or text outside the JSON object. The entire response must be the JSON object itself.
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
console.log("generate.service.ts logic loaded");
//# sourceMappingURL=generate.service.js.map