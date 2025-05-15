import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, SchemaType } from "@google/generative-ai";
import prisma from '../config/db';
import { Playlist, PlaylistPrivacy, PlaylistType } from '@prisma/client';
import { trackSelect } from '../utils/prisma-selects';
import { uploadToCloudinary } from '../utils/cloudinary';
import { Buffer } from 'buffer';

// TODO: Add GEMINI_API_KEY to .env file
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. AI playlist generation will not work.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");

// TODO: Add GEMINI_MODEL to .env file, e.g., gemini-1.5-flash
const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

// Define safety settings - adjust as needed
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Define generation config for JSON output
const generationConfig: GenerationConfig = {
  responseMimeType: "application/json",
  responseSchema: {
    type: SchemaType.OBJECT,
    properties: {
      trackIds: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "List of track IDs that match the user's request based on the provided track list.",
      },
      playlistName: {
          type: SchemaType.STRING,
          description: "A short, creative name for the playlist based on the user's prompt and the selected tracks (max 5 words)."
      },
      playlistDescription: {
          type: SchemaType.STRING,
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

// Interface for the expected JSON response from the AI
interface AIPlaylistResponse {
    trackIds: string[];
    playlistName: string;
    playlistDescription: string;
}

// --- Helper Function to get Track Context ---
/**
 * Fetches a sample of tracks to provide context to the AI.
 * Currently fetches top 100 most played tracks.
 */
async function getTrackContextForAI(limit = 100): Promise<string> {
    console.log(`[AI Playlist] Fetching top ${limit} tracks for context...`);
    const tracks = await prisma.track.findMany({
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

    // Format the track data into a string for the prompt
    const trackContext = tracks.map(track => {
        const genreNames = track.genres.map(g => g.genre.name).join(', ');
        return `- ID: ${track.id}, Title: "${track.title}", Artist: "${track.artist.artistName}", Genres: [${genreNames || 'N/A'}], Mood: ${track.mood || 'N/A'}, Tempo: ${track.tempo || 'N/A'}, Key: ${track.key || 'N/A'} ${track.scale || ''}, Danceability: ${track.danceability !== null ? track.danceability.toFixed(2) : 'N/A'}, Energy: ${track.energy !== null ? track.energy.toFixed(2) : 'N/A'}`;
    }).join('\n');

    return trackContext;
}

// --- Image Generation Function ---
/**
 * Generates a cover image for a playlist using the Gemini Flash image generation model.
 * @param playlistName The name of the playlist
 * @param playlistDescription The description of the playlist
 * @param artistNames Optional array of artist names included in the playlist
 * @returns Promise resolving to the URL of the generated image
 */
export async function generatePlaylistCoverImage(playlistName: string, playlistDescription: string, artistNames: string[] = []): Promise<string | null> {
  console.log(`[AI Cover] Generating cover image for playlist "${playlistName}" using Gemini Flash`);

  if (!GEMINI_API_KEY) {
    console.error("[AI Cover] Cannot generate cover image: GEMINI_API_KEY is not set.");
    return null;
  }

  try {
    // Create a descriptive prompt for the image
    const artistsText = artistNames.length > 0 
      ? `featuring artists: ${artistNames.slice(0, 3).join(', ')}${artistNames.length > 3 ? ', and others' : ''}`
      : '';
    
    // Style the image as a modern, abstract playlist cover
    const imagePrompt = `Create a modern, artistic album cover for a music playlist titled "${playlistName}". 
      The playlist is about: ${playlistDescription} ${artistsText}.
      Style: Minimalist, modern design with abstract shapes and vibrant colors.
      Make it visually appealing as a playlist cover without any text.`;
    
    console.log(`[AI Cover] Sending prompt to Gemini Flash: "${imagePrompt.slice(0, 100)}..."`);

    // Get the Gemini Flash image generation model instance
    const imageModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-preview-image-generation" });

    // Generate content including an image
    const result = await imageModel.generateContent({
      contents: [{ role: "user", parts: [{ text: imagePrompt }] }],
      // IMPORTANT: Specify response modalities as strings
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        // temperature: 0.7 
      } as any // Using 'as any' temporarily if types conflict
    });
    
    const response = result.response;

    if (response && response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) { // Check for inlineData which holds the image
            const imageData = Buffer.from(part.inlineData.data, 'base64');
            
            // Upload the image to Cloudinary
            const uploadResult = await uploadToCloudinary(imageData, {
              folder: 'playlist-covers',
              resource_type: 'image',
            });
            
            const imageUrl = (uploadResult as any).secure_url;
            console.log(`[AI Cover] Successfully generated and uploaded cover image: ${imageUrl}`);
            return imageUrl;
          }
        }
        // Log if text was generated but no image part was found
        const textPart = candidate.content.parts.find(p => p.text);
        if (textPart && textPart.text) {
           console.warn(`[AI Cover] Gemini responded with text but no image: "${textPart.text.substring(0, 100)}..."`);
        } else {
            console.warn("[AI Cover] No image data found in the response parts.");
        }
      } else {
          console.warn("[AI Cover] No content found in the response candidate.");
      }
    } else {
        console.warn("[AI Cover] No valid candidates found in the response.");
    }
    
    return null; // Return null if no image was successfully generated and uploaded

  } catch (error) {
    console.error("[AI Cover] Error generating cover image with Gemini Flash:", error);
    if (error instanceof Error) console.error("[AI Cover] Error Details:", error.message);
    return null;
  }
}

// --- Main Function to Generate Playlist ---
/**
 * Generates an AI playlist based on a user prompt.
 * @param userId The ID of the user requesting the playlist.
 * @param userPrompt The text prompt describing the desired playlist.
 * @returns The newly created playlist object or null if generation failed.
 */
export async function generatePlaylistFromPrompt(userId: string, userPrompt: string): Promise<Playlist | null> {
    console.log(`[AI Playlist] Starting generation for user ${userId} with prompt: "${userPrompt}"`);

    if (!GEMINI_API_KEY) {
      console.error("[AI Playlist] Cannot generate playlist: GEMINI_API_KEY is not set.");
      throw new Error("AI features are currently unavailable.");
    }

    // --- BEGIN PROMPT PRE-FILTERING ---
    const musicKeywords = [
        'song', 'track', 'music', 'artist', 'genre', 'album', 'playlist',
        'add', 'suggest', 'find', 'play', 'listen', 'beat', 'rhythm', 'mood', 'vibe', 'create', 'generate', 'make',
        'pop', 'rock', 'jazz', 'electronic', 'hip hop', 'classical', 'instrumental', 'ost', 'soundtrack',
        'singer', 'band', 'cover', 'remix', 'acoustic', 'electric', 'dance', 'chill', 'workout', 'focus', 'sleep',
        'upbeat', 'sad', 'happy', 'energy', 'tempo', 'ballad', 'lofi', 'anthem', 'oldies', 'hits', 'trending',
        // Vietnamese specific keywords
        'nhạc', 'bài hát', 'ca sĩ', 'thể loại', 'danh sách phát', 'nghe', 'giai điệu', 'tâm trạng',
        'nhạc trẻ', 'nhạc vàng', 'nhạc trịnh', 'nhạc cách mạng', 'nhạc thiếu nhi', 'nhạc phim', 'v-pop',
        'ca khúc', 'sáng tác', 'hòa tấu', 'nhạc không lời'
    ];

    const normalizedUserPrompt = userPrompt.toLowerCase().trim();
    const isMusicRelated = musicKeywords.some(keyword => normalizedUserPrompt.includes(keyword));

    if (!isMusicRelated && normalizedUserPrompt.length > 0) {
        const commonNonMusicPhrases = ['tell me', 'what is', 'who is', 'how to', 'why is', 'can you explain', 'can you write', 'give me', 'help me with'];
        const isLikelyNonMusicQuestion = commonNonMusicPhrases.some(phrase => normalizedUserPrompt.startsWith(phrase));
        const seemsLikeGibberish = normalizedUserPrompt.length < 10 && !normalizedUserPrompt.includes(" "); // Very short, no spaces

        if (isLikelyNonMusicQuestion || seemsLikeGibberish || (normalizedUserPrompt.length < 15 && !isMusicRelated) ) {
            console.log(`[AI Playlist Gen] Prompt "${userPrompt}" deemed non-music related or too vague. Bypassing Gemini.`);
            throw new Error("INVALID_PROMPT:Your request didn't seem to be about creating a music playlist. Please try a prompt like 'Create a playlist of upbeat V-pop songs' or 'Make a lofi playlist for studying'.");
        }
    }
    // --- END PROMPT PRE-FILTERING ---

    try {
        // 1. Get Track Context
        const trackContext = await getTrackContextForAI(400);
        if (!trackContext) {
            console.warn("[AI Playlist] No track context available. Cannot generate playlist.");
            return null;
        }

        // 2. Construct the Prompt for Gemini
        // Correctly use template literals for the multi-line system prompt
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

        // Combine system prompt and user-specific context
        const fullPrompt = `${systemPrompt}\nUser Prompt: "${userPrompt}"\n\nAvailable Tracks:\n${trackContext}`; // Combine prompts

        // console.log("[AI Playlist] Sending prompt to Gemini:", fullPrompt); // Be cautious logging full prompt

        // 3. Call Gemini API
        // Construct the request object correctly
        const requestPayload = {
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
        };
        const result = await model.generateContent(requestPayload); // Pass the structured request
        const response = result.response;

        // console.log("[AI Playlist] Raw response from Gemini:", JSON.stringify(response, null, 2));

        if (!response) {
            console.error('[AI Playlist] No response received from Gemini API.');
            throw new Error('Failed to get response from AI service.');
        }

        // Check for safety blocks
        if (response.promptFeedback?.blockReason) {
             console.warn(`[AI Playlist] Prompt blocked due to: ${response.promptFeedback.blockReason}`);
             throw new Error(`Your request was blocked due to safety reasons: ${response.promptFeedback.blockReason}`);
        }
        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content) {
             console.warn('[AI Playlist] No valid candidates in Gemini response.');
             throw new Error('AI service did not return valid suggestions.');
        }

         // Ensure finishReason is acceptable
        const finishReason = response.candidates[0].finishReason;
        if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
            console.warn(`[AI Playlist] Generation finished unexpectedly: ${finishReason}`, response.candidates[0].finishMessage);
            throw new Error(`AI generation finished unexpectedly (${finishReason}). Please try again or refine your prompt.`);
        }

        // 4. Parse and Validate Response
        let aiResponse: AIPlaylistResponse | null = null;
        try {
            const responseText = response.text(); // text() should parse JSON if mimeType is application/json
            console.log("[AI Playlist] Parsed text/JSON from Gemini:", responseText);
            // Attempt to parse if it's still a string (fallback)
             if (typeof responseText === 'string') {
                 try {
                     aiResponse = JSON.parse(responseText);
                 } catch (e) {
                     console.error("[AI Playlist] Failed to parse Gemini response string as JSON:", e, "Response text:", responseText);
                     throw new Error("AI response was not valid JSON.");
                 }
             } else if (typeof responseText === 'object' && responseText !== null) {
                 // If response.text() directly returns an object (due to responseMimeType)
                 aiResponse = responseText as AIPlaylistResponse;
             }


            if (!aiResponse || !Array.isArray(aiResponse.trackIds) || !aiResponse.playlistName || !aiResponse.playlistDescription) {
                console.error("[AI Playlist] Invalid JSON structure received:", aiResponse);
                throw new Error("AI response has an invalid format.");
            }
        } catch (parseError) {
            console.error('[AI Playlist] Error parsing AI response:', parseError, "Raw Response:", JSON.stringify(response, null, 2));
            throw new Error('Failed to parse AI response. Please try again.');
        }

        const { trackIds: suggestedTrackIds, playlistName, playlistDescription } = aiResponse;
        console.log(`[AI Playlist] AI suggested ${suggestedTrackIds.length} tracks. Name: "${playlistName}", Desc: "${playlistDescription}"`);

        if (suggestedTrackIds.length === 0) {
            console.log("[AI Playlist] AI returned no matching tracks.");
            // Optionally create an empty playlist or just return null/message
            // For now, let's create the empty playlist as suggested by the AI
        }

        // Validate track IDs against the database
        const existingTracks = await prisma.track.findMany({
            where: {
                id: { in: suggestedTrackIds },
                isActive: true, // Ensure tracks are active
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


        // 5. Create Playlist in Database
        console.log(`[AI Playlist] Creating playlist "${playlistName}" for user ${userId} with ${validTrackIds.length} valid tracks.`);
        const totalDuration = existingTracks.reduce((sum, track) => sum + (track.duration || 0), 0);

        // Extract artist names for cover image generation
        const artistNames = [...new Set(existingTracks.map(track => track.artist.artistName))];
        
        // Generate a cover image for the playlist
        const coverUrl = await generatePlaylistCoverImage(playlistName, playlistDescription, artistNames);

        const newPlaylist = await prisma.playlist.create({
            data: {
                name: playlistName.substring(0, 100), // Ensure name is within limits
                description: playlistDescription.substring(0, 500), // Ensure description is within limits
                userId: userId,
                privacy: PlaylistPrivacy.PRIVATE, // Default to private
                type: PlaylistType.NORMAL, // Or a new 'AI' type if added to schema
                isAIGenerated: true,
                coverUrl: coverUrl, // Add the generated cover image URL
                lastGeneratedAt: new Date(),
                totalTracks: validTrackIds.length,
                totalDuration: totalDuration,
                tracks: {
                    create: validTrackIds.map((trackId, index) => ({
                        trackId: trackId,
                        trackOrder: index + 1, // Order based on AI response order (after filtering)
                    })),
                },
            },
            include: {
                tracks: {
                    orderBy: { trackOrder: 'asc' }, // Order tracks when fetching
                    include: {
                        track: { select: trackSelect }, // Include full track details
                    }
                },
                user: { select: { id: true, name: true, username: true } } // Include basic user info
            }
        });

        console.log(`[AI Playlist] Successfully created playlist ID: ${newPlaylist.id}`);
        return newPlaylist;

    } catch (error) {
        console.error('[AI Playlist] Error during playlist generation:', error);
        // Re-throw specific errors or a generic one
        if (error instanceof Error && error.message.startsWith('AI')) { // Propagate AI-specific errors
             throw error;
        }
        throw new Error('Failed to generate AI playlist. Please try again later.');
    }
}

// --- Function to Suggest More Tracks for an Existing Playlist ---
interface AISuggestMoreResponse {
    suggestedTrackIds: string[];
}

const MAX_SUGGESTIONS_PER_REQUEST = 20; // Giới hạn số lượng track được đề xuất
const DEFAULT_SUGGESTIONS_IF_UNSPECIFIED = 5; // Mặc định nếu AI không suy ra từ prompt

export async function suggestTracksForExistingPlaylist(
    playlistId: string,
    userId: string,
    userPrompt: string
): Promise<string[]> {
    console.log(`[AI SuggestMore] Starting suggestion for playlist ${playlistId}, user ${userId}, prompt: "${userPrompt}"`);

    if (!GEMINI_API_KEY) {
        console.error("[AI SuggestMore] Cannot suggest tracks: GEMINI_API_KEY is not set.");
        throw new Error("AI features are currently unavailable.");
    }

    // --- BEGIN PROMPT PRE-FILTERING ---
    const musicKeywords = [
        'song', 'track', 'music', 'artist', 'genre', 'album', 'playlist',
        'add', 'suggest', 'find', 'play', 'listen', 'beat', 'rhythm', 'mood', 'vibe', 'create', 'generate', 'make',
        'pop', 'rock', 'jazz', 'electronic', 'hip hop', 'classical', 'instrumental', 'ost', 'soundtrack',
        'singer', 'band', 'cover', 'remix', 'acoustic', 'electric', 'dance', 'chill', 'workout', 'focus', 'sleep',
        'upbeat', 'sad', 'happy', 'energy', 'tempo', 'ballad', 'lofi', 'anthem', 'oldies', 'hits', 'trending',
        // Vietnamese specific keywords
        'nhạc', 'bài hát', 'ca sĩ', 'thể loại', 'danh sách phát', 'nghe', 'giai điệu', 'tâm trạng',
        'nhạc trẻ', 'nhạc vàng', 'nhạc trịnh', 'nhạc cách mạng', 'nhạc thiếu nhi', 'nhạc phim', 'v-pop',
        'ca khúc', 'sáng tác', 'hòa tấu', 'nhạc không lời'
    ];

    const normalizedUserPrompt = userPrompt.toLowerCase().trim();
    const isMusicRelated = musicKeywords.some(keyword => normalizedUserPrompt.includes(keyword));

    if (!isMusicRelated && normalizedUserPrompt.length > 0) { 
        const commonNonMusicPhrases = ['tell me', 'what is', 'who is', 'how to', 'why is', 'can you explain', 'can you write', 'give me', 'help me with'];
        const isLikelyNonMusicQuestion = commonNonMusicPhrases.some(phrase => normalizedUserPrompt.startsWith(phrase));
        const seemsLikeGibberish = normalizedUserPrompt.length < 10 && !normalizedUserPrompt.includes(" "); // Very short, no spaces

        if (isLikelyNonMusicQuestion || seemsLikeGibberish || (normalizedUserPrompt.length < 15 && !isMusicRelated)) {
             console.log(`[AI SuggestMore] Prompt "${userPrompt}" deemed non-music related or too vague. Bypassing Gemini.`);
             throw new Error("INVALID_PROMPT:Your request didn't seem to be about suggesting music tracks. Please try a prompt like 'Add more songs by this artist' or 'Suggest similar tracks with higher energy'.");
        }
    }
    // --- END PROMPT PRE-FILTERING ---

    try {
        // 1. Fetch the target playlist and its current tracks
        const playlist = await prisma.playlist.findUnique({
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

        // 2. Get global track context for AI suggestions
        const availableTracksContext = await getTrackContextForAI(250); // Increased context size
        if (!availableTracksContext) {
            console.warn("[AI SuggestMore] No available track context. Cannot suggest tracks.");
            return [];
        }

        // 3. Define a new generationConfig for suggesting tracks
        const generationConfigSuggest: GenerationConfig = {
            responseMimeType: "application/json",
            responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                    suggestedTrackIds: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        description: `List of unique track IDs suggested to be added. The AI should infer the number of tracks from the user's prompt (e.g., 'add 10 songs', 'suggest 7 V-pop tracks'). If no number is specified, the AI should suggest around ${DEFAULT_SUGGESTIONS_IF_UNSPECIFIED} tracks. These IDs must NOT be in the 'Current Playlist Tracks' list and must be chosen from 'Available Tracks'.`,
                        maxItems: MAX_SUGGESTIONS_PER_REQUEST, 
                        minItems: 0 
                    },
                },
                required: ['suggestedTrackIds'],
            },
            temperature: 0.8, // Slightly higher for more creative suggestions
            topP: 0.9,
            topK: 40,
        };

        const suggestModel = genAI.getGenerativeModel({ model: modelName, safetySettings, generationConfig: generationConfigSuggest });

        // 4. Construct the prompt for Gemini
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

        // console.log("[AI SuggestMore] Sending prompt to Gemini:", fullPrompt.substring(0, 500) + "..."); // Log snippet

        // 5. Call Gemini API
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
            // Do not throw an error here, try to process partial response if available
        }


        // 6. Parse and Validate Response
        let aiSuggResponse: AISuggestMoreResponse | null = null;
        try {
            const responseText = response.text();
            // console.log("[AI SuggestMore] Raw text from Gemini:", responseText);
             if (typeof responseText === 'string') {
                 try {
                     aiSuggResponse = JSON.parse(responseText);
                 } catch (e: any) {
                     console.error("[AI SuggestMore] Failed to parse Gemini response string as JSON:", e.message, "Response text:", responseText);
                     // Try to extract array if JSON is malformed but contains an array like structure
                     const arrayMatch = responseText.match(/\[\s*("([^"]|\\")*"\s*,?\s*)*\]/);
                     if (arrayMatch && arrayMatch[0]) {
                         try {
                             aiSuggResponse = { suggestedTrackIds: JSON.parse(arrayMatch[0]) };
                             console.warn("[AI SuggestMore] Partially parsed track IDs from malformed JSON.");
                         } catch (e2) {
                            console.error("[AI SuggestMore] Failed to parse extracted array:", e2);
                            throw new Error("AI suggestions were not valid JSON, even after attempting to extract an array.");
                         }
                     } else {
                        throw new Error("AI suggestions were not valid JSON and no array could be extracted.");
                     }
                 }
             } else if (typeof responseText === 'object' && responseText !== null) {
                 aiSuggResponse = responseText as AISuggestMoreResponse;
             }


            if (!aiSuggResponse || !Array.isArray(aiSuggResponse.suggestedTrackIds)) {
                console.error("[AI SuggestMore] Invalid JSON structure received for suggestions:", aiSuggResponse);
                throw new Error("AI suggestions have an invalid format.");
            }
        } catch (parseError) {
            console.error('[AI SuggestMore] Error parsing AI suggestions:', parseError, "Raw Response (if available):", JSON.stringify(response, null, 2));
            throw new Error('Failed to parse AI suggestions. Please try again.');
        }

        const { suggestedTrackIds: rawSuggestedTrackIds } = aiSuggResponse;
        console.log(`[AI SuggestMore] AI suggested ${rawSuggestedTrackIds.length} track IDs raw.`);

        // 7. Further validation of suggestedTrackIds
        // Ensure suggestions are not already in the playlist
        const newUniqueSuggestedIds = [...new Set(rawSuggestedTrackIds)].filter(id => !currentTrackIdsInPlaylist.includes(id));
        console.log(`[AI SuggestMore] Filtered to ${newUniqueSuggestedIds.length} new and unique track IDs.`);
        
        if (newUniqueSuggestedIds.length === 0) {
            console.log("[AI SuggestMore] AI returned no new tracks to add or all suggestions were duplicates.");
            return [];
        }

        // Validate track IDs against the database
        const existingTracks = await prisma.track.findMany({
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
        
        // Return the validated & filtered suggestions, capped at MAX_SUGGESTIONS_PER_REQUEST
        const finalSuggestions = validSuggestedTrackIds.slice(0, MAX_SUGGESTIONS_PER_REQUEST);
        console.log(`[AI SuggestMore] Returning ${finalSuggestions.length} valid track IDs to add (capped at ${MAX_SUGGESTIONS_PER_REQUEST}).`);
        return finalSuggestions;

    } catch (error) {
        console.error('[AI SuggestMore] Error during track suggestion:', error);
        if (error instanceof Error && (error.message.startsWith('AI') || error.message.startsWith('Your suggestion request was blocked'))) {
             throw error;
        }
        throw new Error('Failed to get AI track suggestions. Please try again later.');
    }
}

// console.log("generate.service.ts logic loaded"); 