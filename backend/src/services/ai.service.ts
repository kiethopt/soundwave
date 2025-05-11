import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import prisma from "../config/db";
import { PlaylistType, Prisma, Track, PlaylistPrivacy } from "@prisma/client"; // Added PlaylistPrivacy
import { HttpError } from "../utils/errors";

// LOG NGAY TẠI ĐÂY ĐỂ KIỂM TRA GIÁ TRỊ ENUM
console.log(
  "[AI Service Debug] Value of PlaylistPrivacy.PRIVATE:",
  PlaylistPrivacy.PRIVATE
);
console.log(
  "[AI Service Debug] Value of PlaylistPrivacy.PUBLIC:",
  PlaylistPrivacy.PUBLIC
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest"; // Use a specific model

if (!GEMINI_API_KEY) {
  console.warn(
    "GEMINI_API_KEY not found in .env. AI features will be disabled."
  );
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const model = genAI
  ? genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME })
  : null;

const generationConfig = {
  temperature: 0.7, // Slightly reduced for more focused recommendations
  topK: 1,
  topP: 0.95, // Adjusted for potentially broader creative choices
  maxOutputTokens: 2048, // Sufficient for a list of track IDs and brief explanations
};

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

// --- HELPER FUNCTION ---
function escapeBackticks(str: string | null | undefined): string {
  if (str === null || str === undefined) return "";
  return str.replace(/`/g, "\\`");
}

// --- INTERFACES ---
export interface HistoryTrackDetail {
  id: string;
  title: string;
  artistName: string;
  genres: string[];
  tempo?: number | null;
  mood?: string | null;
  key?: string | null;
  scale?: string | null;
  danceability?: number | null;
  energy?: number | null;
}

export interface AIGeneratedPlaylistInput {
  targetUserId: string;
  generationMode: "userHistory" | "topGlobalTracks";
  seedTrackIds?: string[]; // For topGlobalTracks mode or as fallback
  historyTracks?: HistoryTrackDetail[]; // For userHistory mode
  requestedTrackCount: number;
  type: PlaylistType; // e.g., SYSTEM_RECOMMENDATION, SYSTEM_GENERATED
  requestedPrivacy?: PlaylistPrivacy;
  customPromptKeywords?: string; // New field for custom keywords
  // coverUrl?: string; // Optional: if we decide to generate/suggest covers via AI later
}

async function getAvailableTrackIds(limit: number = 500): Promise<string[]> {
  // Fetch a broader set of active tracks. Consider adding more criteria if needed.
  const tracks = await prisma.track.findMany({
    where: {
      isActive: true,
      artist: {
        isActive: true,
      },
      // Potentially filter out tracks with very low playcounts or old release dates if catalog is too large
    },
    orderBy: [{ playCount: "desc" }, { releaseDate: "desc" }],
    take: limit,
    select: { id: true },
  });
  return tracks.map((t) => t.id);
}

export const createAIGeneratedPlaylist = async (
  input: AIGeneratedPlaylistInput
): Promise<
  Prisma.PlaylistGetPayload<{
    include: { tracks: { include: { track: true } } };
  }>
> => {
  if (!model) {
    throw new HttpError(
      503,
      "AI Service is not available. GEMINI_API_KEY might be missing."
    );
  }

  const {
    targetUserId,
    generationMode,
    seedTrackIds = [], // Default to empty array
    historyTracks = [], // Default to empty array
    requestedTrackCount,
    type,
    requestedPrivacy = PlaylistPrivacy.PRIVATE,
    customPromptKeywords,
  } = input;

  let prompt = "";
  let selectedTrackIds: string[] = [];
  let isArtistOnlyModeActive = false;
  let artistSpecificTrackPoolIdsForPrompt: string[] = [];
  let historyTrackIdSetForFiltering: Set<string> | undefined = undefined;

  // Fetch a list of available track IDs from the database for Gemini to choose from
  // This helps ensure Gemini recommends tracks that actually exist in our system.
  // Limit to a reasonable number to avoid overly large prompts, e.g., 500-1000 top/recent tracks.
  const availableSystemTrackIds = await getAvailableTrackIds(1000);
  if (availableSystemTrackIds.length === 0) {
    throw new HttpError(
      500,
      "No available tracks in the system to generate a playlist from."
    );
  }

  const allAvailableTracksString = availableSystemTrackIds.join(", ");
  let customKeywordsPreamble = "";
  if (customPromptKeywords && customPromptKeywords.trim() !== "") {
    customKeywordsPreamble = `IMPORTANT: The administrator has provided the following specific generation guidelines. Adhere to them closely:\n${escapeBackticks(
      customPromptKeywords.trim()
    )}\n\nBased on these guidelines and the user's listening history below, proceed with the recommendation.\n\n`;
  }

  if (generationMode === "userHistory" && historyTracks.length > 0) {
    const historyTracksString = historyTracks
      .map((t) => {
        const safeTitle = escapeBackticks(t.title);
        const safeArtistName = escapeBackticks(t.artistName);
        const safeGenres = t.genres.map((g) => escapeBackticks(g)).join(", ");
        return `  - Title: "${safeTitle}", Artist: ${safeArtistName}, ID: ${
          t.id
        } (Genres: ${safeGenres}, Tempo: ${t.tempo || "N/A"}, Mood: ${
          t.mood || "N/A"
        }, Key: ${t.key || "N/A"} ${t.scale || ""}, Energy: ${
          t.energy
        }, Danceability: ${t.danceability})`;
      })
      .join("\n");
    const historyTrackIds = historyTracks.map((t) => t.id);
    historyTrackIdSetForFiltering = new Set(historyTrackIds);

    // isArtistOnlyModeActive and artistSpecificTrackPoolIdsForPrompt are reset/re-evaluated here for userHistory mode
    isArtistOnlyModeActive = false;
    artistSpecificTrackPoolIdsForPrompt = [];
    let historyArtistNamesForPrompt: string[] = [];

    const keywords = customPromptKeywords?.toLowerCase() || "";
    // Check for Artist-Only mode:
    // - customPromptKeywords indicates ONLY artist was selected.
    // - Specifically, it starts with "strictly prioritize tracks whose artist profiles"
    // - AND does NOT contain other audio feature keywords.
    if (
      customPromptKeywords && // Ensure customPromptKeywords is not null or empty
      keywords.startsWith("strictly prioritize tracks whose artist profiles") &&
      keywords.includes(
        "analyze the most listened to artists and similar artists"
      ) && // This part is specific to artist selection in frontend
      !keywords.includes("genres") &&
      !keywords.includes("mood") &&
      !keywords.includes("tempo") &&
      !keywords.includes("musical key") && // "key (and scale)" becomes "musical key and scale" in customPromptKeywords
      !keywords.includes("danceability") &&
      !keywords.includes("energy")
    ) {
      console.log(
        "[AI Service] Artist-Only mode candidate based on customPromptKeywords."
      );
      historyArtistNamesForPrompt = Array.from(
        new Set(historyTracks.map((t) => t.artistName))
      );

      if (historyArtistNamesForPrompt.length > 0) {
        const tracksByHistoryArtists = await prisma.track.findMany({
          where: {
            artist: {
              artistName: { in: historyArtistNamesForPrompt },
              isActive: true, // Artist must be active
            },
            isActive: true, // Track must be active
            id: {
              in: availableSystemTrackIds, // Must be part of generally available tracks
              notIn: historyTrackIds, // Must not be in user's history
            },
          },
          select: { id: true },
        });
        artistSpecificTrackPoolIdsForPrompt = tracksByHistoryArtists.map(
          (t) => t.id
        );

        if (artistSpecificTrackPoolIdsForPrompt.length > 0) {
          isArtistOnlyModeActive = true;
          console.log(
            `[AI Service] Activated Artist-Only mode. Found ${artistSpecificTrackPoolIdsForPrompt.length} tracks from ${historyArtistNamesForPrompt.length} artists (excluding history).`
          );
        } else {
          console.log(
            "[AI Service] Artist-Only mode: No suitable tracks found from user's history artists (excluding already listened). Falling back to standard history-based recommendation with artist preference from preamble."
          );
        }
      } else {
        // This case should ideally not be hit if historyTracks.length > 0, but as a safeguard
        console.log(
          "[AI Service] Artist-Only mode: No artists found in history. Falling back."
        );
      }
    }

    if (isArtistOnlyModeActive) {
      prompt = `${customKeywordsPreamble}You are Soundwave AI, an expert music curator.
A user wants a playlist featuring *other* songs by artists they already enjoy.
Their listening history (provided for context but not for re-selection) includes tracks by the following artists: ${historyArtistNamesForPrompt.join(
        ", "
      )}.

Your task is to recommend up to ${requestedTrackCount} NEW and DIVERSE songs exclusively from these artists.
The recommended songs MUST NOT be from their listening history (IDs: ${historyTrackIds.join(
        ", "
      )}).
The songs you recommend MUST be chosen EXCLUSIVELY from the following list of available tracks by these artists in our system (${
        artistSpecificTrackPoolIdsForPrompt.length
      } tracks total):
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
    } else {
      // Standard userHistory prompt
      prompt = `${customKeywordsPreamble}You are Soundwave AI, an expert music recommendation engine.
A user has the following listening history:
${historyTracksString}

Analyze this user's taste based on their listening history (preferred genres, artists, moods, energy levels, danceability, tempo ranges, keys).
Ensure your recommendations are fresh, diverse, and explore different facets of the user's potential taste, not just repeating the most obvious patterns.
Your task is to recommend EXACTLY ${requestedTrackCount} NEW and DIVERSE songs that would fit this user's taste.
It is crucial that you return exactly ${requestedTrackCount} unique track IDs.
The recommended songs MUST NOT be from their listening history (IDs: ${historyTrackIds.join(
        ", "
      )}).
The songs you recommend MUST be chosen EXCLUSIVELY from the following list of available track IDs in our system: ${allAvailableTracksString}.
Do not invent new track IDs. Only use IDs from the provided list.
If finding ${requestedTrackCount} distinct tracks that perfectly match all aspects of the user's history is challenging from the available list, slightly broaden your interpretation of 'fitting the user's taste' to ensure the list contains ${requestedTrackCount} tracks. Prioritize variety and discovery.
Please provide your recommendations as a JSON array of ${requestedTrackCount} track IDs. Example: ["trackId1", ..., "trackId${requestedTrackCount}"]
Additionally, very briefly (1-2 sentences total for the whole playlist), explain your choices based on the user's history.
Output format should be a JSON object like this:
{
  "recommended_track_ids": ["id1", ..., "id${requestedTrackCount}"],
  "explanation": "Brief explanation here."
}
`;
    }
  } else {
    // Fallback to topGlobalTracks or if history is empty/insufficient
    let currentSeedTrackIds = seedTrackIds;
    if (!currentSeedTrackIds || currentSeedTrackIds.length === 0) {
      console.warn(
        "[AI Service] No seed tracks provided for topGlobalTracks mode, fetching generic top tracks."
      );
      currentSeedTrackIds = await getTopPlayedTrackIds(30); // Fetch more to give Gemini options
      if (currentSeedTrackIds.length === 0) {
        throw new HttpError(
          500,
          "No seed tracks available to generate a playlist."
        );
      }
    }
    // Filter seedTrackIds to only those present in availableSystemTrackIds to prevent hallucination
    const validSeedTracksForPrompt = currentSeedTrackIds.filter((id) =>
      availableSystemTrackIds.includes(id)
    );
    if (validSeedTracksForPrompt.length === 0) {
      throw new HttpError(
        500,
        "None of the provided seed tracks are available in the current system catalog for selection."
      );
    }

    prompt = `${customKeywordsPreamble}You are Soundwave AI, a playlist curator.
Your task is to select ${requestedTrackCount} tracks to create a "Popular Mix" playlist.
You MUST choose these tracks EXCLUSIVELY from the following list of available track IDs: ${validSeedTracksForPrompt.join(
      ", "
    )}.
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

    // Aggregate stream
    let aggregatedResponseText = "";
    for await (const chunk of result.stream) {
      if (chunk.candidates && chunk.candidates.length > 0) {
        const candidate = chunk.candidates[0];
        if (
          candidate.content &&
          candidate.content.parts &&
          candidate.content.parts.length > 0
        ) {
          aggregatedResponseText += candidate.content.parts[0].text;
        }
      }
    }

    console.log(
      "[AI Service] Aggregated Gemini response text:",
      aggregatedResponseText
    );

    let geminiOutputTrackIds: string[] = [];
    let explanationFromAI: string | undefined = undefined;

    try {
      // Clean potential markdown backticks and "json" prefix
      const cleanedJsonString = aggregatedResponseText
        .replace(/^```json\s*|```$/g, "")
        .trim();
      const parsedResponse = JSON.parse(cleanedJsonString);

      if (
        parsedResponse &&
        parsedResponse.recommended_track_ids &&
        Array.isArray(parsedResponse.recommended_track_ids)
      ) {
        geminiOutputTrackIds = parsedResponse.recommended_track_ids.map(String); // Ensure they are strings
        explanationFromAI = parsedResponse.explanation; // Capture explanation if provided
        console.log(
          "[AI Service] Successfully parsed track IDs from Gemini JSON object:",
          geminiOutputTrackIds
        );
      } else {
        // Fallback for cases where it might be just an array string
        const arrayMatch = aggregatedResponseText.match(/\[([\\s\\S]*?)\]/);
        if (arrayMatch && arrayMatch[0]) {
          geminiOutputTrackIds = JSON.parse(arrayMatch[0]).map(String);
          console.log(
            "[AI Service] Successfully parsed track IDs from regex match (array only):",
            geminiOutputTrackIds
          );
        } else {
          throw new Error(
            "No valid JSON array or object with recommended_track_ids found."
          );
        }
      }
    } catch (parseError) {
      console.error(
        "[AI Service] Failed to parse track IDs from Gemini response after multiple attempts:",
        aggregatedResponseText,
        parseError
      );
      // CRITICAL: If AI fails to provide valid track IDs, we might need a more robust fallback.
      // For now, if history mode, try to use some top tracks as a last resort.
      // If topGlobalTracks mode, this is a hard failure as AI was supposed to pick from a given list.
      if (generationMode === "userHistory") {
        console.warn(
          "[AI Service] Gemini failed to provide tracks in userHistory mode. Attempting to use generic top tracks as an emergency fallback."
        );
        // Ensure this fallback also respects the constraints if possible, though it's an emergency.
        const emergencyFallbackIds = await getTopPlayedTrackIds(
          requestedTrackCount + 20
        ); // fetch more to filter
        const historyTrackIdSetForFallback = new Set(
          historyTracks.map((t) => t.id)
        );
        geminiOutputTrackIds = emergencyFallbackIds
          .filter((id) => !historyTrackIdSetForFallback.has(id))
          .slice(0, requestedTrackCount);

        if (geminiOutputTrackIds.length === 0) {
          throw new HttpError(
            500,
            "AI failed and no fallback tracks could be retrieved that are not in history."
          );
        }
      } else {
        throw new HttpError(
          500,
          "AI failed to return a valid list of track IDs from the provided seed."
        );
      }
    }

    // Rigorous filtering of Gemini's output
    const uniqueGeminiIds = Array.from(
      new Set(geminiOutputTrackIds.map(String))
    );

    let trackPoolSetForFiltering: Set<string>;
    let sourceDescriptionForLog: string;

    if (isArtistOnlyModeActive) {
      trackPoolSetForFiltering = new Set(artistSpecificTrackPoolIdsForPrompt);
      sourceDescriptionForLog = "Artist-Only specific pool";
    } else {
      trackPoolSetForFiltering = new Set(availableSystemTrackIds);
      sourceDescriptionForLog = "general available system tracks";
    }

    let filteredGeminiOutputTrackIds = uniqueGeminiIds.filter((id) =>
      trackPoolSetForFiltering.has(id)
    );

    // This history check is common for all userHistory based generations
    if (generationMode === "userHistory" && historyTrackIdSetForFiltering) {
      filteredGeminiOutputTrackIds = filteredGeminiOutputTrackIds.filter(
        (id) => !historyTrackIdSetForFiltering!.has(id)
      );
    }

    console.log(
      `[AI Service] Gemini initially suggested ${geminiOutputTrackIds.length} IDs (raw unique: ${uniqueGeminiIds.length}). Using ${sourceDescriptionForLog} (${trackPoolSetForFiltering.size} IDs) and excluding history tracks, ${filteredGeminiOutputTrackIds.length} IDs remain for playlist consideration.`
    );

    // Initialize finalTrackIds with the rigorously filtered list from Gemini
    let finalTrackIds: string[] = [...filteredGeminiOutputTrackIds];

    // Ensure uniqueness and correct count (but only cap, don't add)
    finalTrackIds = Array.from(new Set(finalTrackIds)); // Make unique
    // If Gemini provided more than requested (after filtering), cap it.
    // If it provided less, we now accept that and do not add more.
    if (finalTrackIds.length > requestedTrackCount) {
      finalTrackIds = finalTrackIds.slice(0, requestedTrackCount);
    }

    if (finalTrackIds.length === 0) {
      // This condition means that after all processing (AI response, fallback, filtering),
      // we still have no tracks.
      console.warn(
        `[AI Service] No valid track IDs to form a playlist for user ${targetUserId}. Playlist will be empty.`
      );
      // Default name/description will be used for an empty playlist.
    }

    // --- Fetch details for selected tracks to generate name and description ---
    let finalPlaylistName = "Soundwave Radio"; // Default name
    let finalPlaylistDescription =
      "Enjoy fantastic tracks selected by Soundwave AI."; // Default description
    let finalCoverUrl = null; // Default cover URL
    let tracksForPlaylistCreation: { trackId: string; trackOrder: number }[] =
      [];

    if (finalTrackIds.length > 0) {
      const detailedTracks = await prisma.track.findMany({
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

      // Re-order detailedTracks to match finalTrackIds order
      const orderedDetailedTracks = finalTrackIds
        .map((id) => detailedTracks.find((t) => t.id === id))
        .filter((t): t is NonNullable<typeof t> => t !== undefined);

      if (orderedDetailedTracks.length > 0) {
        const firstTrackArtistName =
          orderedDetailedTracks[0].artist?.artistName;
        if (firstTrackArtistName) {
          finalPlaylistName = `${firstTrackArtistName} Radio`;
        }

        const distinctArtistNames = Array.from(
          new Set(
            orderedDetailedTracks
              .slice(0, 3)
              .map((t) => t.artist?.artistName)
              .filter((name): name is string => !!name)
          )
        );

        if (distinctArtistNames.length > 0) {
          let descPrefix = "With ";
          if (distinctArtistNames.length === 1) {
            descPrefix += `${distinctArtistNames[0]}`;
          } else if (distinctArtistNames.length === 2) {
            descPrefix += `${distinctArtistNames[0]}, ${distinctArtistNames[1]}`;
          } else {
            // 3 or more, take first 3
            descPrefix += `${distinctArtistNames.slice(0, 3).join(", ")}`;
          }
          finalPlaylistDescription = `${descPrefix} and more...`;
        }
        tracksForPlaylistCreation = orderedDetailedTracks.map(
          (track, index) => ({
            trackId: track.id,
            trackOrder: index + 1,
          })
        );
      } else {
        // This case means AI selected IDs that are not active/found.
        // Playlist will be empty. Name/Description will remain default.
        console.warn(
          `[AI Service] AI selected track IDs, but none were found active in DB: ${finalTrackIds.join(
            ", "
          )}`
        );
      }
    }
    // --- End of new logic for name and description ---

    // Create playlist in DB
    // Ensure totalTracks and totalDuration are calculated correctly if tracksForPlaylistCreation is empty
    let totalDuration = 0;
    if (tracksForPlaylistCreation.length > 0) {
      const tracksForDurationCalc = await prisma.track.findMany({
        where: { id: { in: tracksForPlaylistCreation.map((t) => t.trackId) } },
        select: { duration: true },
      });
      totalDuration = tracksForDurationCalc.reduce(
        (sum, track) => sum + (track.duration || 0),
        0
      );
    }

    // Log before creating playlist
    console.log("[AI Service] About to create playlist. Data to be saved:", {
      name: finalPlaylistName,
      description: finalPlaylistDescription,
      privacyForDb: requestedPrivacy,
      typeForDb: type,
      userIdForDb: targetUserId,
      isAIGeneratedForDb: true,
      trackCountForDb: finalTrackIds.length,
    });

    const newPlaylist = await prisma.playlist.create({
      data: {
        name: finalPlaylistName,
        description: finalPlaylistDescription,
        coverUrl: finalCoverUrl, // Ensure finalCoverUrl is defined
        privacy: requestedPrivacy,
        type,
        userId: targetUserId,
        isAIGenerated: true,
        totalTracks: tracksForPlaylistCreation.length,
        totalDuration: totalDuration, // Calculate if needed, or set to 0 initially
        lastGeneratedAt: new Date(),
        tracks: {
          create: tracksForPlaylistCreation,
        },
      },
      include: {
        tracks: { include: { track: true } },
      },
    });

    // Log after creating playlist
    console.log(
      "[AI Service] Playlist created with ID:",
      newPlaylist.id,
      "and Privacy:",
      newPlaylist.privacy
    );

    return newPlaylist;
  } catch (error: any) {
    console.error(
      "[AI Service] Error during AI playlist generation process:",
      error
    );
    if (error instanceof HttpError) {
      throw error;
    }
    if (error.message && error.message.includes("SAFETY")) {
      throw new HttpError(
        500,
        "AI content generation blocked due to safety settings. Please try a different request."
      );
    }
    throw new HttpError(
      500,
      `AI service request failed during generation or DB operation: ${
        error.message || "Unknown error"
      }`
    );
  }
  // This line is added to ensure all paths explicitly return or throw.
  throw new HttpError(
    500,
    "AI service reached an unexpected final state. This should not happen."
  );
};

export interface PlaylistGenerationOptions {
  name?: string;
  description?: string;
  trackCount?: number;
  basedOnMood?: string;
  basedOnGenre?: string;
  basedOnArtist?: string;
  coverUrl?: string | null;
  basedOnSongLength?: number | null;
  basedOnReleaseTime?: string | null;
}

/**
 * Tạo danh sách phát mặc định với các bản nhạc phổ biến cho người dùng mới
 * @param userId - The user ID to generate the playlist for
 * @returns A Promise resolving to an array of track IDs
 */
export const generateDefaultPlaylistForNewUser = async (
  userId: string,
  options: PlaylistGenerationOptions = {}
): Promise<string[]> => {
  try {
    console.log(`[AI] Generating default playlist for new user ${userId}`);
    // Số lượng bài hát cần tạo (mặc định là 10)
    const trackCount = options.trackCount || 10;
    // Find popular tracks based on play count
    const popularTracks = await prisma.track.findMany({
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

    console.log(
      `[AI] Found ${popularTracks.length} popular tracks for new user playlist`
    );

    // Log some track names for debugging
    if (popularTracks.length > 0) {
      const trackSample = popularTracks
        .slice(0, 3)
        .map((t) => `${t.title} by ${t.artist?.artistName || "Unknown"}`);
      console.log(`[AI] Sample tracks: ${trackSample.join(", ")}`);
    }

    // Extract track IDs
    const trackIds = popularTracks.map((track) => track.id);

    if (trackIds.length === 0) {
      console.log(
        `[AI] No popular tracks found, falling back to random tracks`
      );

      // Fallback to random tracks if no popular tracks found
      const randomTracks = await prisma.track.findMany({
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

    console.log(
      `[AI] Generated default playlist with ${trackIds.length} popular tracks`
    );
    return trackIds;
  } catch (error) {
    console.error("[AI] Error generating default playlist:", error);
    // Return empty array as fallback
    return [];
  }
};

export const getTopPlayedTrackIds = async (
  count: number = 10
): Promise<string[]> => {
  const topTracks = await prisma.track.findMany({
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

// Placeholder - this function would be more complex, likely involving Gemini again or image generation libraries
// function generateDefaultCoverForPlaylist(playlistName: string): string {
//   // Simple placeholder based on playlist name.
//   return `https://ui-avatars.com/api/?name=${encodeURIComponent(playlistName)}&background=random&size=500`;
// }

// Example function to generate a playlist description using AI (can be expanded)
export const generatePlaylistDescriptionAI = async (
  playlistName: string,
  trackTitles: string[]
): Promise<string> => {
  if (!model) {
    console.warn(
      "[AI Service] AI model not available for generating playlist description."
    );
    return `A collection of great tracks including ${trackTitles
      .slice(0, 3)
      .join(", ")}.`;
  }

  const prompt = `Generate a short, engaging playlist description (1-2 sentences) for a playlist named "${escapeBackticks(
    playlistName
  )}".
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
      }, // Shorter output for description
      safetySettings,
    });

    let aggregatedResponseText = "";
    for await (const chunk of result.stream) {
      // ... (stream aggregation logic as above)
      if (
        chunk.candidates &&
        chunk.candidates.length > 0 &&
        chunk.candidates[0].content &&
        chunk.candidates[0].content.parts &&
        chunk.candidates[0].content.parts.length > 0
      ) {
        aggregatedResponseText += chunk.candidates[0].content.parts[0].text;
      }
    }
    // Basic cleaning of the response
    return aggregatedResponseText.trim().replace(/\\n/g, " ");
  } catch (error) {
    console.error(
      "[AI Service] Error generating playlist description with AI:",
      error
    );
    return `Enjoy this mix: "${escapeBackticks(
      playlistName
    )}" featuring top songs.`; // Fallback
  }
};
