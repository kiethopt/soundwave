import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../config/db";
import { trackSelect } from "../utils/prisma-selects";
import { Playlist } from "@prisma/client";
import { PlaylistType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import SpotifyWebApi from "spotify-web-api-node";

// Interface for track with genres
interface TrackWithGenres {
  id: string;
  // Include all other Track properties
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  artistId: string;
  title: string;
  coverUrl: string | null;
  releaseDate: Date;
  duration: number;
  playCount: number;
  albumId: string | null;
  // Add the genres relationship
  genres?: {
    genreId: string;
    genre?: {
      id: string;
      name: string;
    };
  }[];
}

// Spotify API configuration
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Function to refresh Spotify access token
async function refreshSpotifyToken() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body["access_token"]);
    console.log("[AI] Spotify API token refreshed");

    // Set token refresh timer (expires in 1 hour)
    setTimeout(refreshSpotifyToken, (data.body["expires_in"] - 60) * 1000);
  } catch (error) {
    console.error("[AI] Error refreshing Spotify token:", error);
  }
}

// Initialize Spotify token on startup if credentials are available
if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
  refreshSpotifyToken();
} else {
  console.warn(
    "[AI] Spotify credentials not found, advanced audio analysis will be limited"
  );
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Sử dụng model từ biến môi trường, mặc định là gemini-2.0-flash nếu không được cấu hình
const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const model = genAI.getGenerativeModel({
  model: modelName,
  systemInstruction:
    "You are an expert music curator specializing in personalization. Your primary goal is to create highly personalized playlists that closely match each user's demonstrated preferences. PRIORITIZE tracks from artists the user has already listened to or liked. Only include tracks from other artists if they are extremely similar in style and genre to the user's favorites. Analyze the provided listening history and liked tracks carefully, identifying patterns in genres, artists, and moods. Return ONLY a valid JSON array of track IDs, without any duplicates or explanations. The tracks should strongly reflect the user's taste, with at least 80% being from artists they've shown interest in.",
});
console.log(`[AI] Using Gemini model: ${modelName}`);

export { model };

// Export the interface
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
 * Tạo điều kiện lọc Prisma nâng cao cho thể loại
 * @param genreInput Tên thể loại người dùng nhập
 * @returns Object chứa điều kiện truy vấn Prisma
 */
async function createEnhancedGenreFilter(genreInput: string): Promise<any> {
  try {
    // Phân tích thể loại để tìm thể loại chính và thể loại liên quan
    const { mainGenreId, relatedGenres, subGenres, parentGenres } =
      await analyzeGenre(genreInput);

    // Các IDs thể loại phân theo nhóm
    const allMainGenreIds = mainGenreId ? [mainGenreId] : [];
    const allSubGenreIds = subGenres.map((g) => g.id);
    const allRelatedGenreIds = relatedGenres.map((g) => g.id);
    const allParentGenreIds = parentGenres.map((g) => g.id);

    console.log(`[AI] Genre distribution for "${genreInput}":`);
    if (allMainGenreIds.length > 0)
      console.log(`[AI] - Main: ${allMainGenreIds.length} genres`);
    if (allSubGenreIds.length > 0)
      console.log(`[AI] - Sub: ${allSubGenreIds.length} genres`);
    if (allRelatedGenreIds.length > 0)
      console.log(`[AI] - Related: ${allRelatedGenreIds.length} genres`);
    if (allParentGenreIds.length > 0)
      console.log(`[AI] - Parent: ${allParentGenreIds.length} genres`);

    // Tạo danh sách IDs thể loại theo độ ưu tiên
    const prioritizedGenreIds = [
      ...allMainGenreIds, // Higher weight by appearing first
      ...allSubGenreIds,
      ...allParentGenreIds,
      ...allRelatedGenreIds,
    ];

    // Nếu không tìm thấy thể loại nào, thử tìm kiếm miễn là tên thể loại có chứa chuỗi đầu vào
    if (prioritizedGenreIds.length === 0) {
      console.log(`[AI] No exact genre matches found, searching by name`);
      const fallbackGenres = await prisma.genre.findMany({
        where: {
          name: {
            contains: genreInput,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (fallbackGenres.length > 0) {
        return {
          genres: {
            some: {
              genreId: {
                in: fallbackGenres.map((g) => g.id),
              },
            },
          },
        };
      }

      // Vẫn không tìm thấy, trả về lọc cơ bản
      return {
        genres: {
          some: {
            genre: {
              name: {
                contains: genreInput,
                mode: "insensitive",
              },
            },
          },
        },
      };
    }

    // Tạo bộ lọc phức tạp dựa trên độ ưu tiên thể loại
    return {
      genres: {
        some: {
          genreId: {
            in: prioritizedGenreIds,
          },
        },
      },
    };
  } catch (error) {
    console.error("[AI] Error creating enhanced genre filter:", error);

    // Trả về lọc cơ bản nếu có lỗi
    return {
      genres: {
        some: {
          genre: {
            name: {
              contains: genreInput,
              mode: "insensitive",
            },
          },
        },
      },
    };
  }
}

/**
 * Generates a personalized playlist for a user using the Gemini AI model
 * @param userId - The user ID to generate the playlist for
 * @param options - Options for playlist generation
 * @returns A Promise resolving to an array of track IDs
 */
export const generateAIPlaylist = async (
  userId: string,
  options: PlaylistGenerationOptions = {}
): Promise<string[]> => {
  try {
    console.log(
      `[AI] Generating playlist for user ${userId} with options:`,
      options
    );

    // Số lượng bài hát cần tạo (mặc định là 10)
    const trackCount = options.trackCount || 10;

    // Thiết lập điều kiện lọc cơ bản
    const whereClause: any = { isActive: true };
    let trackIds: string[] = [];

    // Ưu tiên lọc theo nghệ sĩ trước
    const artistFilter = options.basedOnArtist
      ? await createEnhancedArtistFilter(options.basedOnArtist)
      : {};

    console.log("[AI] Artist filter:", JSON.stringify(artistFilter, null, 2));

    // Xác định thể loại cụ thể nếu người dùng đã chỉ định
    let enhancedGenreFilter: any = {};
    if (options.basedOnGenre) {
      enhancedGenreFilter = await createEnhancedGenreFilter(
        options.basedOnGenre
      );
      console.log(
        `[AI] Genre filter:`,
        JSON.stringify(enhancedGenreFilter, null, 2)
      );
    }

    // Lọc theo thời gian phát hành (mới, gần đây, cổ điển)
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
      } else {
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
            console.log(
              "[AI] Filtering for tracks released in the last 5 years"
            );
            break;
          case "decade":
          case "last decade":
            whereClause.releaseDate = {
              gte: new Date(currentYear - 10, 0, 1),
            };
            console.log(
              "[AI] Filtering for tracks released in the last decade"
            );
            break;
          case "classic":
          case "classics":
            whereClause.releaseDate = {
              lt: new Date(currentYear - 20, 0, 1),
            };
            console.log(
              "[AI] Filtering for classic tracks (over 20 years old)"
            );
            break;
          default:
            if (
              releaseTimeValue.includes("s") ||
              releaseTimeValue.includes("'s")
            ) {
              const decade = parseInt(
                releaseTimeValue.replace(/[^0-9]/g, ""),
                10
              );
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

    // Lọc theo độ dài bài hát
    if (options.basedOnSongLength) {
      const lengthValue = Number(options.basedOnSongLength);
      if (!isNaN(lengthValue)) {
        whereClause.duration = { lte: lengthValue };
        console.log(`[AI] Song length filter: <= ${lengthValue} seconds`);
      } else {
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
            console.log(
              "[AI] Filtering for medium-length tracks (3-5 minutes)"
            );
            break;
          case "long":
            whereClause.duration = { gte: 300 };
            console.log("[AI] Filtering for longer tracks (over 5 minutes)");
            break;
        }
      }
    }

    // Lọc theo tâm trạng nếu được chỉ định
    const moodFilter = options.basedOnMood
      ? await getMoodFilter(options.basedOnMood)
      : {};

    if (Object.keys(moodFilter).length > 0) {
      console.log("[AI] Mood filter:", JSON.stringify(moodFilter, null, 2));
    }

    // Kết hợp tất cả các điều kiện lọc
    const finalFilter = {
      where: {
        isActive: true,
        ...whereClause,
        ...moodFilter,
        ...artistFilter,
        ...(options.basedOnGenre ? enhancedGenreFilter : {}),
      },
      orderBy: [
        { playCount: Prisma.SortOrder.desc },
        { createdAt: Prisma.SortOrder.desc },
      ],
      take: trackCount,
      include: {
        artist: {
          select: {
            artistName: true,
          },
        },
      },
    };

    console.log("[AI] Final filter:", JSON.stringify(finalFilter, null, 2));

    // Thực hiện truy vấn để lấy bài hát
    const tracks = await prisma.track.findMany(finalFilter);

    console.log(
      `[AI] Found ${tracks.length} tracks:`,
      tracks.map((t) => `${t.title} by ${t.artist?.artistName}`)
    );

    trackIds = tracks.map((track) => track.id);

    if (trackIds.length === 0 && options.basedOnArtist) {
      // Nếu không tìm thấy bài hát nào với filter phức tạp, thử tìm kiếm đơn giản hơn
      console.log(
        "[AI] No tracks found with complex filter, trying simple artist search"
      );
      const simpleArtistFilter = {
        where: {
          isActive: true,
          artistProfile: {
            artistName: {
              contains: options.basedOnArtist,
              mode: "insensitive",
            },
          },
        },
        orderBy: [
          { playCount: Prisma.SortOrder.desc },
          { createdAt: Prisma.SortOrder.desc },
        ],
        take: trackCount,
        include: {
          artist: {
            select: {
              artistName: true,
            },
          },
        },
      };

      console.log(
        "[AI] Simple artist filter:",
        JSON.stringify(simpleArtistFilter, null, 2)
      );

      const simpleTracks = await prisma.track.findMany(simpleArtistFilter);
      trackIds = simpleTracks.map((track) => track.id);

      console.log(
        `[AI] Found ${simpleTracks.length} tracks with simple search:`,
        simpleTracks.map((t) => `${t.title} by ${t.artist?.artistName}`)
      );
    }

    console.log(
      `[AI] Successfully generated playlist with ${trackIds.length} tracks`
    );
    return trackIds;
  } catch (error) {
    console.error("[AI] Error generating playlist:", error);
    throw error;
  }
};

/**
 * Creates or updates an AI-generated playlist for a user
 * @param userId - The user ID to create the playlist for
 * @param options - Options for playlist generation
 * @returns The created or updated playlist
 */
export const createAIGeneratedPlaylist = async (
  userId: string,
  options: PlaylistGenerationOptions = {}
): Promise<Playlist> => {
  try {
    // Use the name from options if provided, otherwise generate one
    const playlistName = options.name || "Soundwave Discoveries";

    // Generate track recommendations
    const trackIds = await generateAIPlaylist(userId, options);

    // Lấy thông tin bài hát để cải thiện mô tả
    const tracks = await prisma.track.findMany({
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

    // Tính tổng thời lượng
    const totalDuration = tracks.reduce(
      (sum, track) => sum + track.duration,
      0
    );

    // Trích xuất nghệ sĩ duy nhất để có mô tả tốt hơn
    const artistsInPlaylist = new Map<string, string>();
    tracks.forEach((track) => {
      if (track.artist?.artistName) {
        artistsInPlaylist.set(track.artist.id, track.artist.artistName);
      }
    });

    // Phân tích để hiển thị nghệ sĩ hàng đầu trước trong mô tả
    const artistsCount: Record<string, number> = {};
    tracks.forEach((track) => {
      if (track.artist?.id) {
        artistsCount[track.artist.id] =
          (artistsCount[track.artist.id] || 0) + 1;
      }
    });

    // Sắp xếp nghệ sĩ theo số lần xuất hiện trong danh sách phát
    const sortedArtistIds = Object.keys(artistsCount).sort(
      (a, b) => artistsCount[b] - artistsCount[a]
    );

    // Lấy tên nghệ sĩ đã sắp xếp theo mức độ phổ biến
    const sortedArtistNames = sortedArtistIds
      .map((id) => artistsInPlaylist.get(id))
      .filter(Boolean) as string[];

    // Use description from options if provided, otherwise generate a default one
    let playlistDescription =
      options.description ||
      `Curated selection featuring ${sortedArtistNames.slice(0, 3).join(", ")}${
        sortedArtistNames.length > 3 ? " and more" : ""
      }. Refreshed regularly based on your listening patterns.`;

    // Default cover URL for AI-generated playlists
    const defaultCoverUrl =
      "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png";

    // Find if the user already has a personalized system playlist with this name
    // It should match the base playlist name used for generation.
    let playlist = await prisma.playlist.findFirst({
      where: {
        userId,
        name: playlistName,
        type: PlaylistType.SYSTEM, // Ensure we are looking for the user's personalized system playlist
      },
    });

    const playlistData = {
      description: playlistDescription,
      coverUrl:
        options.coverUrl === null ? null : options.coverUrl || defaultCoverUrl,
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
      // Update existing personalized system playlist
      console.log(
        `[AI] Updating personalized system playlist ${playlist.id} for user ${userId}`
      );

      // Remove existing tracks first
      await prisma.playlistTrack.deleteMany({
        where: { playlistId: playlist.id },
      });

      // Update playlist details and add new tracks
      playlist = await prisma.playlist.update({
        where: { id: playlist.id },
        data: playlistData,
      });

      console.log(
        `[AI] Updated playlist with ${trackIds.length} tracks from ${artistsInPlaylist.size} artists`
      );
    } else {
      // Create new personalized system playlist for the user
      console.log(
        `[AI] Creating new personalized system playlist "${playlistName}" for user ${userId}`
      );

      playlist = await prisma.playlist.create({
        data: {
          name: playlistName,
          userId,
          type: PlaylistType.SYSTEM, // Mark as user's personalized system playlist
          privacy: "PRIVATE", // User's personalized playlists are private
          isAIGenerated: true,
          ...playlistData,
        },
      });

      console.log(
        `[AI] Created playlist with ${trackIds.length} tracks from ${artistsInPlaylist.size} artists`
      );
    }

    return playlist;
  } catch (error) {
    console.error("[AI] Error creating/updating AI-generated playlist:", error);
    throw error;
  }
};

/**
 * Generates a default playlist with popular tracks for new users
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
// Thêm hàm helper để lọc theo mood
/**
 * Tạo điều kiện lọc Prisma dựa trên tâm trạng (mood)
 * @param mood - Tâm trạng cần lọc
 * @returns Object điều kiện lọc Prisma
 */
async function getMoodFilter(mood: string): Promise<any> {
  // Enhanced mood to genre mapping with more nuanced categorizations
  const moodToGenreMap: Record<string, string[]> = {
    // Existing moods
    energetic: [
      "Pop",
      "EDM",
      "Rock",
      "Dance",
      "Electronic",
      "Hip Hop",
      "Punk",
      "Metal",
      "Trap",
      "Drum and Bass",
      "Techno",
    ],
    calm: [
      "Acoustic",
      "Jazz",
      "Classical",
      "Ambient",
      "Lo-fi",
      "Folk",
      "New Age",
      "Chillout",
      "Instrumental",
      "Piano",
      "Meditation",
    ],
    happy: [
      "Pop",
      "Dance",
      "Funk",
      "Disco",
      "R&B",
      "Indie Pop",
      "Synthpop",
      "K-Pop",
      "J-Pop",
      "Upbeat",
      "Sunshine Pop",
      "Tropical House",
    ],
    sad: [
      "Ballad",
      "Blues",
      "Soul",
      "Acoustic",
      "Indie",
      "Alternative",
      "Emo",
      "R&B",
      "Singer-Songwriter",
      "Dark Ambient",
      "Slowcore",
    ],
    nostalgic: [
      "Oldies",
      "Classic Rock",
      "Classic",
      "80s",
      "90s",
      "Retro",
      "Vintage",
      "Golden Oldies",
      "Throwback",
      "Synthwave",
      "Vaporwave",
    ],
    romantic: [
      "R&B",
      "Soul",
      "Ballad",
      "Jazz",
      "Acoustic",
      "Pop Ballad",
      "Bolero",
      "Love Songs",
      "Soft Rock",
      "Bossa Nova",
      "Neo Soul",
    ],
    focused: [
      "Classical",
      "Lo-fi",
      "Ambient",
      "Instrumental",
      "Jazz",
      "Post-Rock",
      "Minimal",
      "Electronic",
      "Study",
      "Concentration",
      "Deep Focus",
    ],
    party: [
      "Dance",
      "EDM",
      "Hip Hop",
      "Pop",
      "Disco",
      "Rap",
      "Reggaeton",
      "House",
      "Trap",
      "Club",
      "Latin",
      "Dancehall",
    ],
    intense: [
      "Rock",
      "Metal",
      "Hardcore",
      "Punk",
      "Industrial",
      "Drum and Bass",
      "Dubstep",
      "Heavy Metal",
      "Grunge",
      "Thrash",
      "Death Metal",
    ],
    relaxed: [
      "Reggae",
      "Chill",
      "Bossa Nova",
      "Lounge",
      "Smooth Jazz",
      "Downtempo",
      "Trip-Hop",
      "Easy Listening",
      "Soft Rock",
      "Indie Folk",
    ],
    melancholic: [
      "Alternative",
      "Indie",
      "Post-Rock",
      "Shoegaze",
      "Dream Pop",
      "Ambient",
      "Contemporary Classical",
      "Dark Folk",
      "Neo-Classical",
    ],
    uplifting: [
      "Gospel",
      "Worship",
      "Inspirational",
      "Motivational",
      "Positive",
      "Upbeat",
      "Feel Good",
      "Anthem",
      "Orchestral",
      "Power Pop",
    ],
    dreamy: [
      "Dream Pop",
      "Shoegaze",
      "Ambient",
      "Chillwave",
      "Psychedelic",
      "Ethereal",
      "Space Music",
      "Atmospheric",
      "Bedroom Pop",
    ],
    dramatic: [
      "Soundtrack",
      "Orchestral",
      "Cinematic",
      "Epic",
      "Trailer Music",
      "Film Score",
      "Opera",
      "Baroque",
      "Symphonic",
    ],
    angry: [
      "Metal",
      "Hardcore",
      "Punk",
      "Industrial",
      "Rap",
      "Grindcore",
      "Thrash Metal",
      "Death Metal",
      "Metalcore",
      "Rage",
    ],
    empowering: [
      "Hip Hop",
      "Rock",
      "Pop",
      "R&B",
      "Electronic",
      "Motivational",
      "Anthem",
      "Power Pop",
      "Dance",
    ],
    reflective: [
      "Indie Folk",
      "Acoustic",
      "Singer-Songwriter",
      "Piano",
      "Ambient",
      "Jazz",
      "Contemporary Classical",
      "Post-Rock",
    ],
    anxious: [
      "IDM",
      "Glitch",
      "Experimental",
      "Industrial",
      "Noise",
      "Avant-garde",
      "Breakcore",
      "Dark Ambient",
    ],
    peaceful: [
      "Ambient",
      "New Age",
      "Classical",
      "Acoustic",
      "Folk",
      "Piano",
      "Meditation",
      "Nature Sounds",
      "Minimal",
    ],
    ethereal: [
      "Ambient",
      "Dream Pop",
      "Shoegaze",
      "Post-Rock",
      "New Age",
      "Space Music",
      "Ethereal Wave",
      "Dreampunk",
    ],
    groovy: [
      "Funk",
      "Disco",
      "Soul",
      "R&B",
      "Motown",
      "Boogie",
      "Acid Jazz",
      "House",
      "Deep House",
      "Nu-Disco",
    ],

    // New detailed moods
    euphoric: [
      "Trance",
      "Progressive House",
      "Uplifting Trance",
      "EDM",
      "Dance",
      "Electronic",
      "Festival",
      "Big Room",
      "Melodic House",
    ],
    bittersweet: [
      "Indie",
      "Alternative",
      "Folk",
      "Singer-Songwriter",
      "Acoustic",
      "Emo",
      "Post-Rock",
      "Dream Pop",
      "Chamber Pop",
    ],
    triumphant: [
      "Orchestral",
      "Soundtrack",
      "Epic",
      "Trailer Music",
      "Power Metal",
      "Symphonic Metal",
      "Classical",
      "Cinematic",
    ],
    mysterious: [
      "Dark Ambient",
      "Experimental",
      "Drone",
      "Minimal",
      "Atmospheric",
      "Post-Rock",
      "Neo-Classical",
      "Avant-garde",
    ],
    sensual: [
      "R&B",
      "Soul",
      "Neo Soul",
      "Jazz",
      "Blues",
      "Smooth Jazz",
      "Lounge",
      "Downtempo",
      "Trip-Hop",
    ],
    rebellious: [
      "Punk",
      "Rock",
      "Alternative",
      "Grunge",
      "Metal",
      "Hardcore",
      "Industrial",
      "Noise Rock",
      "Garage Rock",
    ],
    whimsical: [
      "Indie Pop",
      "Folk",
      "Acoustic",
      "Chamber Pop",
      "Baroque Pop",
      "Twee Pop",
      "Bubblegum Pop",
      "Indie Folk",
    ],
    cathartic: [
      "Post-Rock",
      "Progressive Rock",
      "Experimental",
      "Ambient",
      "Drone",
      "Minimal",
      "Contemporary Classical",
    ],
    contemplative: [
      "Ambient",
      "Minimal",
      "Drone",
      "Contemporary Classical",
      "Post-Rock",
      "Experimental",
      "Neo-Classical",
    ],
  };

  const moodToAudioCharacteristics: Record<string, any> = {
    energetic: {
      tempo: { gte: 120 },
      energy: { gte: 0.7 },
      valence: { gte: 0.4 },
    },
    calm: {
      tempo: { lte: 100 },
      energy: { lte: 0.5 },
      acousticness: { gte: 0.5 },
    },
    happy: { valence: { gte: 0.6 }, energy: { gte: 0.4 } },
    sad: { valence: { lte: 0.4 }, tempo: { lte: 110 } },
    intense: {
      energy: { gte: 0.8 },
      loudness: { gte: -8 },
      tempo: { gte: 100 },
    },
    relaxed: {
      tempo: { lte: 95 },
      energy: { lte: 0.4 },
      acousticness: { gte: 0.5 },
      instrumentalness: { gte: 0.2 },
    },
    focused: {
      instrumentalness: { gte: 0.5 },
      speechiness: { lte: 0.1 },
      energy: { between: [0.3, 0.7] },
    },
    party: {
      danceability: { gte: 0.7 },
      energy: { gte: 0.6 },
      tempo: { gte: 100 },
    },
    nostalgic: { acousticness: { gte: 0.3 } }, // Mostly genre-based
    romantic: {
      valence: { between: [0.3, 0.7] },
      tempo: { lte: 110 },
      acousticness: { gte: 0.2 },
    },
    melancholic: {
      valence: { lte: 0.3 },
      energy: { lte: 0.6 },
      tempo: { lte: 100 },
    },
    uplifting: { valence: { gte: 0.6 }, energy: { gte: 0.5 } },
    dreamy: {
      instrumentalness: { gte: 0.3 },
      tempo: { lte: 110 },
      acousticness: { gte: 0.3 },
    },
    dramatic: {
      energy: { gte: 0.6 },
      loudness: { gte: -10 },
      tempo: { between: [70, 130] },
    },
    angry: {
      energy: { gte: 0.8 },
      valence: { lte: 0.4 },
      loudness: { gte: -7 },
    },
    empowering: {
      energy: { gte: 0.6 },
      valence: { gte: 0.5 },
      loudness: { gte: -9 },
    },
    reflective: {
      valence: { between: [0.3, 0.6] },
      energy: { lte: 0.6 },
      acousticness: { gte: 0.4 },
    },
    anxious: {
      energy: { between: [0.5, 0.8] },
      valence: { lte: 0.4 },
      tempo: { gte: 100 },
    },
    peaceful: {
      energy: { lte: 0.4 },
      valence: { gte: 0.5 },
      acousticness: { gte: 0.5 },
      tempo: { lte: 90 },
    },
    ethereal: {
      instrumentalness: { gte: 0.5 },
      acousticness: { gte: 0.3 },
      energy: { lte: 0.5 },
    },
    groovy: {
      danceability: { gte: 0.7 },
      energy: { between: [0.6, 0.8] },
      valence: { gte: 0.5 },
    },
  };

  const activityToAudioCharacteristics: Record<string, any> = {
    workout: {
      energy: { gte: 0.7 },
      tempo: { gte: 120 },
      danceability: { gte: 0.6 },
    },
    study: {
      instrumentalness: { gte: 0.3 },
      energy: { between: [0.3, 0.6] },
      speechiness: { lte: 0.1 },
    },
    sleep: {
      energy: { lte: 0.4 },
      tempo: { lte: 80 },
      acousticness: { gte: 0.5 },
      loudness: { lte: -12 },
    },
    driving: {
      energy: { gte: 0.5 },
      danceability: { gte: 0.5 },
      tempo: { gte: 100 },
    },
    meditation: {
      instrumentalness: { gte: 0.7 },
      energy: { lte: 0.3 },
      tempo: { lte: 70 },
    },
    gaming: { energy: { gte: 0.6 }, tempo: { gte: 110 } },
    cooking: { valence: { gte: 0.5 }, energy: { between: [0.4, 0.7] } },
    reading: {
      instrumentalness: { gte: 0.4 },
      energy: { lte: 0.5 },
      tempo: { lte: 100 },
    },
    party: {
      danceability: { gte: 0.7 },
      energy: { gte: 0.7 },
      speechiness: { gte: 0.1 },
    },
    focus: {
      instrumentalness: { gte: 0.4 },
      energy: { between: [0.3, 0.6] },
      speechiness: { lte: 0.1 },
    },
    running: {
      energy: { gte: 0.7 },
      tempo: { gte: 140 },
      danceability: { gte: 0.5 },
    },
    relaxation: {
      energy: { lte: 0.4 },
      tempo: { lte: 85 },
      acousticness: { gte: 0.5 },
    },
    morning: {
      valence: { gte: 0.5 },
      energy: { between: [0.4, 0.7] },
      tempo: { between: [90, 120] },
    },
    evening: {
      energy: { lte: 0.6 },
      acousticness: { gte: 0.3 },
      valence: { between: [0.3, 0.7] },
    },
    social: {
      danceability: { gte: 0.6 },
      energy: { gte: 0.5 },
      valence: { gte: 0.5 },
    },
    creative: {
      instrumentalness: { gte: 0.4 },
      complexity: { gte: 0.5 },
      energy: { between: [0.3, 0.7] },
    },
    yoga: {
      instrumentalness: { gte: 0.6 },
      energy: { lte: 0.4 },
      tempo: { lte: 90 },
    },
    travel: { energy: { between: [0.4, 0.8] }, valence: { gte: 0.5 } },
    commute: {
      energy: { between: [0.5, 0.8] },
      danceability: { gte: 0.5 },
      complexity: { lte: 0.7 },
    },
    shopping: {
      energy: { between: [0.5, 0.8] },
      danceability: { gte: 0.6 },
      valence: { gte: 0.5 },
    },
  };

  // Activities associated with specific audio characteristics
  const activityToGenreMap: Record<string, string[]> = {
    workout: [
      "EDM",
      "Hip Hop",
      "Rock",
      "Electronic",
      "Pop",
      "Metal",
      "Trap",
      "Drum and Bass",
      "Techno",
      "Dubstep",
      "House",
      "Dancehall",
    ],
    study: [
      "Classical",
      "Lo-fi",
      "Ambient",
      "Jazz",
      "Instrumental",
      "Acoustic",
      "Post-Rock",
      "Piano",
      "Minimal",
      "Contemporary Classical",
    ],
    sleep: [
      "Ambient",
      "Classical",
      "New Age",
      "Lo-fi",
      "Chillout",
      "Instrumental",
      "Piano",
      "Meditation",
      "Nature Sounds",
      "Minimal",
    ],
    driving: [
      "Rock",
      "Pop",
      "Electronic",
      "Hip Hop",
      "Country",
      "R&B",
      "Classic Rock",
      "Indie",
      "Alternative",
      "Road Trip",
    ],
    meditation: [
      "Ambient",
      "New Age",
      "Classical",
      "World",
      "Instrumental",
      "Lo-fi",
      "Meditation",
      "Nature Sounds",
      "Minimal",
      "Yoga",
    ],
    gaming: [
      "Electronic",
      "Rock",
      "Metal",
      "Dubstep",
      "Soundtrack",
      "Lo-fi",
      "Synthwave",
      "Trap",
      "EDM",
      "Drum and Bass",
    ],
    cooking: [
      "Jazz",
      "Pop",
      "Soul",
      "Funk",
      "Acoustic",
      "Latin",
      "Bossa Nova",
      "French",
      "Indie",
      "World",
    ],
    reading: [
      "Classical",
      "Ambient",
      "Jazz",
      "Lo-fi",
      "Acoustic",
      "Instrumental",
      "Piano",
      "Post-Rock",
      "Chamber Music",
      "Minimal",
    ],
    party: [
      "Dance",
      "Hip Hop",
      "Pop",
      "Electronic",
      "Reggaeton",
      "R&B",
      "Latin",
      "House",
      "Disco",
      "Trap",
      "Club",
      "Dancehall",
    ],
    focus: [
      "Concentration",
      "Attention",
      "Productivity",
      "Work",
      "Deep Work",
      "Flow",
      "Mental Clarity",
      "Mindfulness",
      "Attentiveness",
      "Diligence",
    ],
    running: [
      "EDM",
      "Rock",
      "Pop",
      "Hip Hop",
      "Electronic",
      "House",
      "Drum and Bass",
      "Motivation",
      "Techno",
      "Trap",
    ],
    relaxation: [
      "Ambient",
      "New Age",
      "Classical",
      "Acoustic",
      "Lo-fi",
      "Jazz",
      "Chillout",
      "Nature Sounds",
      "Meditation",
      "Spa",
    ],
    morning: [
      "Pop",
      "Indie",
      "Folk",
      "Jazz",
      "Classical",
      "Acoustic",
      "Electronic",
      "Positive",
      "Upbeat",
      "Sunrise",
    ],
    evening: [
      "Jazz",
      "Soul",
      "Blues",
      "Lo-fi",
      "Chill",
      "Ambient",
      "Trip-Hop",
      "Downtempo",
      "Smooth Jazz",
      "Dim Lights",
    ],
    social: [
      "Pop",
      "Dance",
      "Hip Hop",
      "Latin",
      "Reggaeton",
      "R&B",
      "Indie",
      "Rock",
      "Electronic",
      "Alternative",
    ],
    creative: [
      "Ambient",
      "Jazz",
      "Classical",
      "Electronic",
      "Lo-fi",
      "Experimental",
      "Post-Rock",
      "Minimal",
      "Instrumental",
    ],
    yoga: [
      "Ambient",
      "World",
      "New Age",
      "Meditation",
      "Classical",
      "Instrumental",
      "Minimal",
      "Nature Sounds",
      "Ethereal",
    ],
    travel: [
      "World",
      "Pop",
      "Electronic",
      "Indie",
      "Folk",
      "Jazz",
      "Alternative",
      "Global",
      "Upbeat",
      "Chill",
    ],
    commute: [
      "Pop",
      "Rock",
      "Hip Hop",
      "Podcast",
      "Audiobook",
      "Alternative",
      "Electronic",
      "Indie",
      "Jazz",
      "Classical",
    ],
    shopping: [
      "Pop",
      "Electronic",
      "Indie Pop",
      "R&B",
      "Dance",
      "Lounge",
      "Disco",
      "Funk",
      "House",
      "Upbeat",
    ],
  };

  // Activity synonyms for better matching
  const activitySynonyms: Record<string, string[]> = {
    workout: [
      "exercise",
      "fitness",
      "training",
      "gym",
      "cardio",
      "lifting",
      "aerobics",
      "sport",
      "athletics",
      "physical activity",
    ],
    study: [
      "learning",
      "homework",
      "research",
      "reading",
      "concentration",
      "academics",
      "school",
      "college",
      "university",
      "education",
    ],
    sleep: [
      "rest",
      "slumber",
      "nap",
      "bedtime",
      "doze",
      "snooze",
      "night",
      "relaxation",
      "dream",
      "deep sleep",
    ],
    driving: [
      "road",
      "car",
      "travel",
      "commute",
      "journey",
      "trip",
      "ride",
      "highway",
      "road trip",
      "transportation",
    ],
    meditation: [
      "mindfulness",
      "reflection",
      "zen",
      "spiritual",
      "contemplation",
      "focus",
      "breathing",
      "yoga",
      "calm",
      "inner peace",
    ],
    gaming: [
      "video games",
      "esports",
      "play",
      "console",
      "pc gaming",
      "rpg",
      "fps",
      "action",
      "adventure",
      "strategy",
    ],
    cooking: [
      "baking",
      "kitchen",
      "food",
      "culinary",
      "meal prep",
      "chef",
      "home cooking",
      "recipe",
      "gastronomy",
      "food preparation",
    ],
    reading: [
      "books",
      "literature",
      "stories",
      "novels",
      "magazines",
      "articles",
      "texts",
      "ebooks",
      "publications",
      "kindle",
    ],
    party: [
      "celebration",
      "event",
      "gathering",
      "social",
      "festivity",
      "get-together",
      "fiesta",
      "bash",
      "hangout",
      "shindig",
    ],
    focus: [
      "concentration",
      "attention",
      "productivity",
      "work",
      "deep work",
      "flow",
      "mental clarity",
      "mindfulness",
      "attentiveness",
      "diligence",
    ],
  };

  // Mood synonyms for better matching
  const moodSynonyms: Record<string, string[]> = {
    happy: [
      "joyful",
      "cheerful",
      "upbeat",
      "excited",
      "elated",
      "jubilant",
      "delighted",
      "pleased",
      "content",
      "blissful",
    ],
    calm: [
      "peaceful",
      "serene",
      "tranquil",
      "soothing",
      "gentle",
      "quiet",
      "mellow",
      "soft",
      "still",
      "placid",
    ],
    energetic: [
      "lively",
      "vigorous",
      "active",
      "dynamic",
      "spirited",
      "vibrant",
      "powerful",
      "pumped",
      "high-energy",
      "upbeat",
    ],
    sad: [
      "sorrowful",
      "unhappy",
      "depressed",
      "gloomy",
      "melancholy",
      "downcast",
      "blue",
      "down",
      "heartbroken",
      "tearful",
    ],
    nostalgic: [
      "reminiscent",
      "sentimental",
      "wistful",
      "yearning",
      "retrospective",
      "memory",
      "throwback",
      "bygone",
      "retro",
      "classic",
    ],
    romantic: [
      "passionate",
      "amorous",
      "loving",
      "sentimental",
      "intimate",
      "tender",
      "affectionate",
      "warm",
      "heartfelt",
      "dreamy",
    ],
    focused: [
      "concentrated",
      "attentive",
      "intent",
      "alert",
      "dedicated",
      "mindful",
      "absorbed",
      "engaged",
      "undistracted",
      "zeroed-in",
    ],
    party: [
      "festive",
      "celebratory",
      "exuberant",
      "lively",
      "wild",
      "fun",
      "social",
      "exciting",
      "upbeat",
      "animated",
    ],
    intense: [
      "powerful",
      "strong",
      "fierce",
      "passionate",
      "extreme",
      "forceful",
      "vigorous",
      "fervent",
      "deep",
      "heavy",
    ],
    relaxed: [
      "chilled",
      "laid-back",
      "easy-going",
      "mellow",
      "untroubled",
      "comfortable",
      "loose",
      "unwound",
      "rested",
      "content",
    ],
    melancholic: [
      "plaintive",
      "solemn",
      "wistful",
      "pensive",
      "sorrowful",
      "introspective",
      "blue",
      "mournful",
      "bittersweet",
      "somber",
    ],
    uplifting: [
      "inspiring",
      "encouraging",
      "heartening",
      "cheering",
      "hopeful",
      "motivating",
      "positive",
      "elevating",
      "optimistic",
      "rousing",
    ],
    dreamy: [
      "ethereal",
      "fantastical",
      "wistful",
      "surreal",
      "trance-like",
      "gauzy",
      "otherworldly",
      "reverie",
      "floating",
      "airy",
    ],
    dramatic: [
      "theatrical",
      "powerful",
      "moving",
      "stirring",
      "emotional",
      "passionate",
      "intense",
      "epic",
      "grand",
      "gripping",
    ],
    euphoric: [
      "ecstatic",
      "exhilarated",
      "elated",
      "blissful",
      "exuberant",
      "jubilant",
      "rapturous",
      "overjoyed",
      "thrilled",
      "exalted",
    ],
    bittersweet: [
      "nostalgic",
      "poignant",
      "touching",
      "moving",
      "emotional",
      "tender",
      "melancholy",
      "wistful",
      "yearning",
      "sentimental",
    ],
    triumphant: [
      "victorious",
      "successful",
      "achieving",
      "conquering",
      "winning",
      "prevailing",
      "dominant",
      "ascendant",
      "glorious",
      "celebratory",
    ],
    mysterious: [
      "enigmatic",
      "cryptic",
      "puzzling",
      "perplexing",
      "intriguing",
      "curious",
      "uncanny",
      "eerie",
      "strange",
      "unusual",
    ],
    sensual: [
      "erotic",
      "passionate",
      "intimate",
      "tactile",
      "physical",
      "pleasurable",
      "arousing",
      "stimulating",
      "provocative",
      "alluring",
    ],
    rebellious: [
      "defiant",
      "insubordinate",
      "unruly",
      "disobedient",
      "resistant",
      "revolutionary",
      "nonconformist",
      "unconventional",
      "radical",
      "subversive",
    ],
    whimsical: [
      "playful",
      "fanciful",
      "quirky",
      "eccentric",
      "capricious",
      "unpredictable",
      "imaginative",
      "creative",
      "unconventional",
      "offbeat",
    ],
    cathartic: [
      "cleansing",
      "purifying",
      "releasing",
      "liberating",
      "healing",
      "therapeutic",
      "transformative",
      "renewing",
      "restorative",
      "rejuvenating",
    ],
    contemplative: [
      "thoughtful",
      "reflective",
      "meditative",
      "introspective",
      "pensive",
      "ruminative",
      "philosophical",
      "deep",
      "serious",
      "pondering",
    ],
  };

  // Chuẩn hóa mood (chuyển thành lowercase và xử lý khoảng trắng)
  const normalizedInput = mood.toLowerCase().trim();

  console.log(`[AI] Processing mood/activity: "${normalizedInput}"`);

  // Danh sách đầy đủ để tìm kiếm gần đúng
  const allMoods = Object.keys(moodToGenreMap);
  const allActivities = Object.keys(activityToGenreMap);

  // Tìm trong danh sách mood và activity
  let matchedTerm = "";

  // Kiểm tra khớp chính xác trước
  if (moodToGenreMap[normalizedInput]) {
    matchedTerm = normalizedInput;
    console.log(`[AI] Exact mood match found: ${matchedTerm}`);
  } else if (
    activityToGenreMap[normalizedInput] ||
    activityToAudioCharacteristics[normalizedInput]
  ) {
    matchedTerm = normalizedInput;
    console.log(`[AI] Exact activity match found: ${matchedTerm}`);
  } else {
    // Tìm khớp trong từ đồng nghĩa
    let foundInSynonyms = false;

    // Kiểm tra trong từ đồng nghĩa của mood
    for (const [mood, synonyms] of Object.entries(moodSynonyms)) {
      if (synonyms.includes(normalizedInput)) {
        matchedTerm = mood;
        foundInSynonyms = true;
        console.log(
          `[AI] Found in mood synonyms: ${normalizedInput} → ${matchedTerm}`
        );
        break;
      }
    }

    // Nếu không tìm thấy trong mood synonyms, kiểm tra activity synonyms
    if (!foundInSynonyms) {
      for (const [activity, synonyms] of Object.entries(activitySynonyms)) {
        if (synonyms.includes(normalizedInput)) {
          matchedTerm = activity;
          foundInSynonyms = true;
          console.log(
            `[AI] Found in activity synonyms: ${normalizedInput} → ${matchedTerm}`
          );
          break;
        }
      }
    }

    // Nếu vẫn không tìm thấy, tìm khớp một phần
    if (!foundInSynonyms) {
      // Kiểm tra xem chuỗi nhập có chứa bất kỳ mood nào không
      const possibleMoods = allMoods.filter(
        (m) => normalizedInput.includes(m) || m.includes(normalizedInput)
      );

      if (possibleMoods.length > 0) {
        matchedTerm = possibleMoods[0]; // Lấy mood đầu tiên khớp
        console.log(
          `[AI] Similar mood match found: ${matchedTerm} for input "${normalizedInput}"`
        );
      } else {
        // Kiểm tra activity tương tự
        const possibleActivities = allActivities.filter(
          (a) => normalizedInput.includes(a) || a.includes(normalizedInput)
        );

        if (possibleActivities.length > 0) {
          matchedTerm = possibleActivities[0];
          console.log(
            `[AI] Similar activity match found: ${matchedTerm} for input "${normalizedInput}"`
          );
        } else {
          // Xử lý trường hợp không tìm thấy khớp - thử tìm kiếm dựa trên khoảng cách Levenshtein
          const allTerms = [...allMoods, ...allActivities];
          let bestMatch = "";
          let lowestDistance = Number.MAX_SAFE_INTEGER;

          for (const term of allTerms) {
            const distance = levenshteinDistance(normalizedInput, term);
            if (distance < lowestDistance && distance <= 3) {
              // Threshold of 3 edits
              lowestDistance = distance;
              bestMatch = term;
            }
          }

          if (bestMatch) {
            matchedTerm = bestMatch;
            console.log(
              `[AI] Approximate match found using edit distance: ${matchedTerm} for input "${normalizedInput}" (distance: ${lowestDistance})`
            );
          } else {
            console.log(`[AI] No match found for: "${normalizedInput}"`);
            return {}; // Không tìm thấy khớp nào
          }
        }
      }
    }
  }

  // Kiểm tra xem input có phải là mood hay activity
  let audioCharacteristics = {};
  let relevantGenres: string[] = [];

  // Đã có matchedTerm, xác định xem nó là mood hay activity
  if (moodToGenreMap[matchedTerm]) {
    // Đây là mood
    relevantGenres = moodToGenreMap[matchedTerm] || [];
    audioCharacteristics = moodToAudioCharacteristics[matchedTerm] || {};
    console.log(
      `[AI] Using mood: ${matchedTerm} with ${relevantGenres.length} genres`
    );
  } else if (activityToGenreMap[matchedTerm]) {
    // Đây là activity có thể loại
    relevantGenres = activityToGenreMap[matchedTerm] || [];
    audioCharacteristics = activityToAudioCharacteristics[matchedTerm] || {};
    console.log(
      `[AI] Using activity: ${matchedTerm} with ${relevantGenres.length} genres`
    );
  } else if (activityToAudioCharacteristics[matchedTerm]) {
    // Đây là activity không có thể loại
    audioCharacteristics = activityToAudioCharacteristics[matchedTerm];
    console.log(
      `[AI] Using activity: ${matchedTerm} with audio characteristics only`
    );
  } else {
    // Không nên xảy ra nếu logic ở trên hoạt động đúng
    console.log(
      `[AI] Logic error - matched term ${matchedTerm} not found in maps`
    );
    return {};
  }

  // Build a more comprehensive filter combining both genre and audio characteristics
  const filter: any = {};

  // Tạo danh sách các điều kiện lọc
  const genreCondition =
    relevantGenres.length > 0
      ? await createGenreCondition(relevantGenres)
      : null;
  const audioCondition =
    Object.keys(audioCharacteristics).length > 0
      ? createAudioCondition(audioCharacteristics)
      : null;

  console.log(
    `[AI] Filter conditions: genres=${!!genreCondition}, audio=${!!audioCondition}`
  );

  // Áp dụng chiến lược lọc mạnh hơn bằng cách kết hợp các điều kiện với AND thay vì OR
  if (genreCondition && audioCondition) {
    // Nếu có cả điều kiện về thể loại và đặc điểm âm thanh, kết hợp chúng với AND
    filter.AND = [genreCondition, audioCondition];
  } else if (genreCondition) {
    // Chỉ có điều kiện về thể loại
    return genreCondition;
  } else if (audioCondition) {
    // Chỉ có điều kiện về đặc điểm âm thanh
    return audioCondition;
  }

  return filter;
}

// Helper function to calculate Levenshtein distance (edit distance) between two strings
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize the matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Hàm trợ giúp tạo điều kiện lọc thể loại
async function createGenreCondition(relevantGenres: string[]) {
  const genreIds = await prisma.genre.findMany({
    where: {
      name: {
        in: relevantGenres,
        mode: "insensitive", // Không phân biệt hoa thường
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

// Hàm trợ giúp tạo điều kiện lọc đặc điểm âm thanh
function createAudioCondition(audioCharacteristics: any) {
  // Trả về null thay vì tạo điều kiện lọc audio
  // Vì database không có các trường audio features như valence, tempo, energy, etc.
  console.log(
    "[AI] Audio characteristics filtering is not supported directly in database queries"
  );
  return null;
}

/**
 * Lấy audio features từ Spotify API cho một bài hát
 * @param trackName Tên bài hát
 * @param artistName Tên nghệ sĩ
 * @returns Object chứa audio features hoặc null nếu không tìm thấy
 */
async function getSpotifyAudioFeatures(
  trackName: string,
  artistName: string
): Promise<any | null> {
  try {
    if (!spotifyApi.getAccessToken()) {
      await refreshSpotifyToken();
    }

    // Tìm kiếm bài hát trên Spotify
    const searchResult = await spotifyApi.searchTracks(
      `track:${trackName} artist:${artistName}`,
      { limit: 1 }
    );

    if (searchResult.body.tracks && searchResult.body.tracks.items.length > 0) {
      const trackId = searchResult.body.tracks.items[0].id;

      // Lấy audio features
      const featuresResult = await spotifyApi.getAudioFeaturesForTrack(trackId);

      if (featuresResult.body) {
        console.log(
          `[AI] Found Spotify audio features for "${trackName}" by ${artistName}`
        );
        return featuresResult.body;
      }
    }

    console.log(
      `[AI] No Spotify results found for "${trackName}" by ${artistName}`
    );
    return null;
  } catch (error) {
    console.error("[AI] Error getting Spotify audio features:", error);
    return null;
  }
}

/**
 * Phân tích mood của một bài hát dựa trên audio features từ Spotify
 * @param audioFeatures Audio features từ Spotify API
 * @returns Array of mood tags sorted by relevance
 */
function analyzeMood(audioFeatures: any): string[] {
  const moods: Record<string, number> = {};

  // Enhanced valence analysis
  if (audioFeatures.valence > 0.85) {
    moods.euphoric = (moods.euphoric || 0) + 0.9;
    moods.happy = (moods.happy || 0) + 0.8;
    moods.energetic = (moods.energetic || 0) + 0.6;
  } else if (audioFeatures.valence > 0.7) {
    moods.happy = (moods.happy || 0) + 0.7;
    moods.uplifting = (moods.uplifting || 0) + 0.6;
    moods.energetic = (moods.energetic || 0) + 0.5;
  } else if (audioFeatures.valence < 0.25) {
    moods.sad = (moods.sad || 0) + 0.8;
    moods.melancholic = (moods.melancholic || 0) + 0.7;
    moods.bittersweet = (moods.bittersweet || 0) + 0.6;
  } else if (audioFeatures.valence < 0.4) {
    moods.sad = (moods.sad || 0) + 0.6;
    moods.nostalgic = (moods.nostalgic || 0) + 0.5;
    moods.bittersweet = (moods.bittersweet || 0) + 0.4;
  }

  // Enhanced energy analysis
  if (audioFeatures.energy > 0.85) {
    moods.energetic = (moods.energetic || 0) + 0.9;
    moods.intense = (moods.intense || 0) + 0.8;
    moods.party = (moods.party || 0) + 0.7;
    moods.triumphant = (moods.triumphant || 0) + 0.6;
  } else if (audioFeatures.energy > 0.7) {
    moods.energetic = (moods.energetic || 0) + 0.7;
    moods.uplifting = (moods.uplifting || 0) + 0.6;
    moods.empowering = (moods.empowering || 0) + 0.5;
  } else if (audioFeatures.energy < 0.3) {
    moods.calm = (moods.calm || 0) + 0.8;
    moods.relaxed = (moods.relaxed || 0) + 0.7;
    moods.contemplative = (moods.contemplative || 0) + 0.6;
  } else if (audioFeatures.energy < 0.4) {
    moods.calm = (moods.calm || 0) + 0.7;
    moods.relaxed = (moods.relaxed || 0) + 0.6;
    moods.dreamy = (moods.dreamy || 0) + 0.5;
  }

  // Enhanced acousticness analysis
  if (audioFeatures.acousticness > 0.8) {
    moods.calm = (moods.calm || 0) + 0.7;
    moods.romantic = (moods.romantic || 0) + 0.6;
    moods.nostalgic = (moods.nostalgic || 0) + 0.5;
    moods.contemplative = (moods.contemplative || 0) + 0.4;
  } else if (audioFeatures.acousticness > 0.6) {
    moods.calm = (moods.calm || 0) + 0.6;
    moods.romantic = (moods.romantic || 0) + 0.5;
    moods.bittersweet = (moods.bittersweet || 0) + 0.4;
  }

  // Enhanced danceability analysis
  if (audioFeatures.danceability > 0.8) {
    moods.party = (moods.party || 0) + 0.9;
    moods.energetic = (moods.energetic || 0) + 0.7;
    moods.happy = (moods.happy || 0) + 0.6;
    moods.groovy = (moods.groovy || 0) + 0.5;
  } else if (audioFeatures.danceability > 0.6) {
    moods.uplifting = (moods.uplifting || 0) + 0.6;
    moods.sensual = (moods.sensual || 0) + 0.5;
  }

  // Enhanced instrumentalness analysis
  if (audioFeatures.instrumentalness > 0.8) {
    moods.focused = (moods.focused || 0) + 0.9;
    moods.dreamy = (moods.dreamy || 0) + 0.7;
    moods.calm = (moods.calm || 0) + 0.6;
    moods.contemplative = (moods.contemplative || 0) + 0.5;
  } else if (audioFeatures.instrumentalness > 0.5) {
    moods.focused = (moods.focused || 0) + 0.7;
    moods.mysterious = (moods.mysterious || 0) + 0.5;
  }

  // Enhanced tempo analysis
  if (audioFeatures.tempo > 150) {
    moods.energetic = (moods.energetic || 0) + 0.8;
    moods.intense = (moods.intense || 0) + 0.7;
    moods.party = (moods.party || 0) + 0.6;
    moods.euphoric = (moods.euphoric || 0) + 0.5;
  } else if (audioFeatures.tempo > 130) {
    moods.energetic = (moods.energetic || 0) + 0.7;
    moods.uplifting = (moods.uplifting || 0) + 0.6;
    moods.triumphant = (moods.triumphant || 0) + 0.5;
  } else if (audioFeatures.tempo < 70) {
    moods.calm = (moods.calm || 0) + 0.8;
    moods.relaxed = (moods.relaxed || 0) + 0.7;
    moods.dreamy = (moods.dreamy || 0) + 0.6;
    moods.contemplative = (moods.contemplative || 0) + 0.5;
  } else if (audioFeatures.tempo < 90) {
    moods.relaxed = (moods.relaxed || 0) + 0.6;
    moods.bittersweet = (moods.bittersweet || 0) + 0.5;
  }

  // Enhanced loudness analysis
  if (audioFeatures.loudness > -5) {
    moods.intense = (moods.intense || 0) + 0.7;
    moods.energetic = (moods.energetic || 0) + 0.6;
    moods.triumphant = (moods.triumphant || 0) + 0.5;
  } else if (audioFeatures.loudness < -12) {
    moods.calm = (moods.calm || 0) + 0.6;
    moods.intimate = (moods.intimate || 0) + 0.7;
    moods.mysterious = (moods.mysterious || 0) + 0.5;
  }

  // Enhanced mode analysis
  if (audioFeatures.mode === 1) {
    // Major key
    moods.happy = (moods.happy || 0) + 0.6;
    moods.uplifting = (moods.uplifting || 0) + 0.5;
    moods.euphoric = (moods.euphoric || 0) + 0.4;
  } else {
    // Minor key
    moods.melancholic = (moods.melancholic || 0) + 0.6;
    moods.dramatic = (moods.dramatic || 0) + 0.5;
    moods.bittersweet = (moods.bittersweet || 0) + 0.4;
  }

  // Complex combinations
  if (audioFeatures.valence < 0.3 && audioFeatures.energy > 0.7) {
    moods.angry = (moods.angry || 0) + 0.9;
    moods.intense = (moods.intense || 0) + 0.8;
    moods.rebellious = (moods.rebellious || 0) + 0.7;
  }

  if (
    audioFeatures.valence > 0.7 &&
    audioFeatures.tempo < 100 &&
    audioFeatures.acousticness > 0.6
  ) {
    moods.peaceful = (moods.peaceful || 0) + 0.9;
    moods.content = (moods.content || 0) + 0.8;
    moods.contemplative = (moods.contemplative || 0) + 0.7;
  }

  if (
    audioFeatures.valence < 0.3 &&
    audioFeatures.energy < 0.4 &&
    audioFeatures.acousticness > 0.7
  ) {
    moods.somber = (moods.somber || 0) + 0.9;
    moods.heartbroken = (moods.heartbroken || 0) + 0.8;
    moods.bittersweet = (moods.bittersweet || 0) + 0.7;
  }

  if (
    audioFeatures.danceability > 0.7 &&
    audioFeatures.energy > 0.7 &&
    audioFeatures.valence > 0.7
  ) {
    moods.euphoric = (moods.euphoric || 0) + 0.9;
    moods.party = (moods.party || 0) + 0.8;
    moods.happy = (moods.happy || 0) + 0.7;
  }

  if (
    audioFeatures.instrumentalness > 0.7 &&
    audioFeatures.acousticness > 0.6 &&
    audioFeatures.energy < 0.4
  ) {
    moods.contemplative = (moods.contemplative || 0) + 0.9;
    moods.mysterious = (moods.mysterious || 0) + 0.8;
    moods.dreamy = (moods.dreamy || 0) + 0.7;
  }

  // Sort moods by score
  const sortedMoods = Object.entries(moods)
    .sort(([, a], [, b]) => b - a)
    .map(([mood]) => mood);

  return sortedMoods.slice(0, 3); // Return top 3 moods
}

/**
 * Phân tích hoạt động phù hợp với một bài hát dựa trên audio features từ Spotify
 * @param audioFeatures Audio features từ Spotify API
 * @returns Array of activity tags sorted by relevance
 */
function analyzeActivity(audioFeatures: any): string[] {
  const activities: Record<string, number> = {};

  // Workout suitability
  if (audioFeatures.tempo > 120 && audioFeatures.energy > 0.7) {
    activities.workout = 0.9;
    activities.running = 0.8;
  } else if (audioFeatures.tempo > 100 && audioFeatures.energy > 0.6) {
    activities.workout = 0.6;
    activities.jogging = 0.7;
  }

  // Study/focus suitability
  if (audioFeatures.instrumentalness > 0.6 && audioFeatures.energy < 0.7) {
    activities.study = 0.9;
    activities.focus = 0.9;
    activities.work = 0.8;
  } else if (
    audioFeatures.speechiness < 0.1 &&
    audioFeatures.energy > 0.3 &&
    audioFeatures.energy < 0.6
  ) {
    activities.study = 0.7;
    activities.focus = 0.7;
    activities.work = 0.6;
  }

  // Sleep/relaxation suitability
  if (audioFeatures.energy < 0.3 && audioFeatures.tempo < 80) {
    activities.sleep = 0.9;
    activities.meditation = 0.8;
    activities.relaxation = 0.9;
  } else if (audioFeatures.energy < 0.4 && audioFeatures.acousticness > 0.6) {
    activities.sleep = 0.7;
    activities.meditation = 0.6;
    activities.relaxation = 0.8;
  }

  // Driving suitability
  if (audioFeatures.energy > 0.5 && audioFeatures.danceability > 0.5) {
    activities.driving = 0.8;
    activities.roadtrip = 0.7;
  } else if (audioFeatures.energy > 0.7 && audioFeatures.tempo > 100) {
    activities.driving = 0.7;
    activities.commuting = 0.6;
  }

  // Party suitability
  if (audioFeatures.danceability > 0.7 && audioFeatures.energy > 0.7) {
    activities.party = 0.9;
    activities.dancing = 0.9;
    activities.clubbing = 0.8;
  } else if (audioFeatures.danceability > 0.6 && audioFeatures.energy > 0.6) {
    activities.party = 0.7;
    activities.socializing = 0.8;
  }

  // Reading suitability
  if (audioFeatures.instrumentalness > 0.5 && audioFeatures.energy < 0.5) {
    activities.reading = 0.8;
  } else if (audioFeatures.acousticness > 0.6 && audioFeatures.energy < 0.4) {
    activities.reading = 0.7;
  }

  // Cooking suitability
  if (
    audioFeatures.valence > 0.5 &&
    audioFeatures.energy > 0.4 &&
    audioFeatures.energy < 0.7
  ) {
    activities.cooking = 0.7;
    activities.baking = 0.6;
  } else if (audioFeatures.danceability > 0.5 && audioFeatures.valence > 0.6) {
    activities.cooking = 0.6;
    activities.housework = 0.7;
  }

  // Gaming suitability
  if (audioFeatures.energy > 0.7 && audioFeatures.tempo > 110) {
    activities.gaming = 0.8;
    activities.competitive = 0.7;
  } else if (audioFeatures.energy > 0.6 && audioFeatures.tempo > 100) {
    activities.gaming = 0.6;
    activities.casual_gaming = 0.7;
  }

  // Outdoor activities
  if (audioFeatures.energy > 0.6 && audioFeatures.valence > 0.6) {
    activities.hiking = 0.7;
    activities.beach = 0.7;
    activities.outdoor = 0.8;
  }

  // Yoga/stretching
  if (
    audioFeatures.tempo < 90 &&
    audioFeatures.energy < 0.5 &&
    audioFeatures.instrumentalness > 0.4
  ) {
    activities.yoga = 0.9;
    activities.stretching = 0.8;
  }

  // Creative work
  if (
    audioFeatures.energy > 0.4 &&
    audioFeatures.energy < 0.7 &&
    audioFeatures.instrumentalness > 0.3
  ) {
    activities.creative_work = 0.8;
    activities.art = 0.7;
    activities.writing = 0.7;
  }

  // Sort activities by score
  const sortedActivities = Object.entries(activities)
    .sort(([, a], [, b]) => b - a)
    .map(([activity]) => activity);

  return sortedActivities.slice(0, 3); // Return top 3 activities
}

/**
 * Phân tích bài hát dựa trên nghệ sĩ và tìm các nghệ sĩ tương tự
 * @param artistName Tên nghệ sĩ
 * @returns Object chứa thông tin về nghệ sĩ tương tự và thể loại liên quan
 */
async function analyzeArtist(
  artistName: string
): Promise<{ similarArtists: string[]; relatedGenres: string[] }> {
  try {
    console.log(`[AI] Analyzing artist: ${artistName}`);

    // Chuẩn hóa tên nghệ sĩ
    const normalizedArtistName = artistName.toLowerCase().trim();

    // Tìm nghệ sĩ trong database
    const artist = await prisma.artistProfile.findFirst({
      where: {
        artistName: {
          contains: normalizedArtistName,
          mode: "insensitive",
        },
        isActive: true,
      },
      include: {
        tracks: {
          where: { isActive: true },
          include: {
            genres: {
              include: {
                genre: true,
              },
            },
          },
          take: 20,
        },
      },
    });

    if (!artist) {
      console.log(
        `[AI] Artist "${artistName}" not found in database, trying Spotify lookup`
      );
      // Không tìm thấy nghệ sĩ trong database, thử tìm trên Spotify
      return await findSimilarArtistsViaSpotify(normalizedArtistName);
    }

    // Phân tích thể loại từ các bài hát của nghệ sĩ
    const genreCounts: Record<string, number> = {};
    artist.tracks.forEach((track) => {
      track.genres.forEach((genreRelation) => {
        if (genreRelation.genre) {
          const genreName = genreRelation.genre.name;
          genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
        }
      });
    });

    // Sắp xếp thể loại theo số lần xuất hiện
    const sortedGenres = Object.entries(genreCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .map(([genre]) => genre);

    const dominantGenres = sortedGenres.slice(0, 3);
    console.log(
      `[AI] Dominant genres for ${artistName}: ${dominantGenres.join(", ")}`
    );

    // Tìm nghệ sĩ tương tự dựa trên thể loại tương đồng
    const similarArtists = await findSimilarArtistsByGenres(
      dominantGenres,
      artist.id
    );

    return {
      similarArtists: similarArtists.map((a) => a.artistName),
      relatedGenres: dominantGenres,
    };
  } catch (error) {
    console.error("[AI] Error analyzing artist:", error);
    return { similarArtists: [], relatedGenres: [] };
  }
}

/**
 * Tìm các nghệ sĩ tương tự dựa trên thể loại
 * @param genres Danh sách thể loại
 * @param excludeArtistId ID nghệ sĩ cần loại trừ
 * @returns Danh sách nghệ sĩ tương tự
 */
async function findSimilarArtistsByGenres(
  genres: string[],
  excludeArtistId: string
): Promise<{ id: string; artistName: string }[]> {
  try {
    // Tìm các genre IDs từ tên thể loại
    const genreEntities = await prisma.genre.findMany({
      where: {
        name: {
          in: genres,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    const genreIds = genreEntities.map((g) => g.id);

    if (genreIds.length === 0) {
      return [];
    }

    // Tìm các nghệ sĩ có bài hát thuộc các thể loại tương tự
    const artistsWithSimilarGenres = await prisma.artistProfile.findMany({
      where: {
        id: { not: excludeArtistId },
        isActive: true,
        tracks: {
          some: {
            isActive: true,
            genres: {
              some: {
                genreId: { in: genreIds },
              },
            },
          },
        },
      },
      select: {
        id: true,
        artistName: true,
        tracks: {
          where: {
            genres: {
              some: {
                genreId: { in: genreIds },
              },
            },
          },
          select: { id: true },
        },
      },
      orderBy: {
        tracks: { _count: "desc" },
      },
      take: 10,
    });

    // Sắp xếp nghệ sĩ theo số lượng bài hát có thể loại tương tự
    const sortedArtists = artistsWithSimilarGenres
      .map((artist) => ({
        id: artist.id,
        artistName: artist.artistName,
        trackCount: artist.tracks.length,
      }))
      .sort((a, b) => b.trackCount - a.trackCount)
      .map(({ id, artistName }) => ({ id, artistName }));

    return sortedArtists;
  } catch (error) {
    console.error("[AI] Error finding similar artists by genres:", error);
    return [];
  }
}

/**
 * Tìm nghệ sĩ tương tự thông qua Spotify API
 * @param artistName Tên nghệ sĩ
 * @returns Danh sách nghệ sĩ tương tự và thể loại liên quan
 */
async function findSimilarArtistsViaSpotify(
  artistName: string
): Promise<{ similarArtists: string[]; relatedGenres: string[] }> {
  try {
    if (!spotifyApi.getAccessToken()) {
      await refreshSpotifyToken();
    }

    // Tìm kiếm nghệ sĩ trên Spotify
    const searchResult = await spotifyApi.searchArtists(artistName, {
      limit: 1,
    });

    if (!searchResult.body.artists || !searchResult.body.artists.items.length) {
      console.log(`[AI] Artist "${artistName}" not found on Spotify`);
      return { similarArtists: [], relatedGenres: [] };
    }

    const artist = searchResult.body.artists.items[0];
    const artistId = artist.id;

    // Lấy danh sách nghệ sĩ liên quan từ Spotify
    const relatedArtistsResult = await spotifyApi.getArtistRelatedArtists(
      artistId
    );
    const relatedArtists = relatedArtistsResult.body.artists || [];

    // Lấy thông tin chi tiết về nghệ sĩ
    const artistInfo = await spotifyApi.getArtist(artistId);
    const genres = artistInfo.body.genres || [];

    console.log(
      `[AI] Found ${relatedArtists.length} similar artists and ${genres.length} genres for "${artistName}" via Spotify`
    );

    return {
      similarArtists: relatedArtists.slice(0, 10).map((a) => a.name),
      relatedGenres: genres.slice(0, 5),
    };
  } catch (error) {
    console.error("[AI] Error finding similar artists via Spotify:", error);
    return { similarArtists: [], relatedGenres: [] };
  }
}

/**
 * Cải thiện truy vấn tìm bài hát dựa trên nghệ sĩ
 * @param artistName Tên nghệ sĩ
 * @returns Object chứa điều kiện truy vấn Prisma
 */
async function createEnhancedArtistFilter(artistName: string): Promise<any> {
  try {
    // Phân tích nghệ sĩ để tìm nghệ sĩ tương tự và thể loại liên quan
    const { similarArtists, relatedGenres } = await analyzeArtist(artistName);

    console.log(`[AI] Enhanced artist filter for "${artistName}"`);
    console.log(
      `[AI] Similar artists: ${similarArtists.slice(0, 5).join(", ")}${
        similarArtists.length > 5 ? "..." : ""
      }`
    );
    console.log(`[AI] Related genres: ${relatedGenres.join(", ")}`);

    // Nếu không tìm thấy thông tin về nghệ sĩ, trả về lọc cơ bản
    if (similarArtists.length === 0 && relatedGenres.length === 0) {
      return {
        artist: {
          artistName: {
            contains: artistName,
            mode: "insensitive",
          },
        },
      };
    }

    // Tạo điều kiện lọc nâng cao bao gồm cả nghệ sĩ tương tự
    const filter: any = {
      OR: [
        // Bài hát của nghệ sĩ chính
        {
          artist: {
            artistName: {
              contains: artistName,
              mode: "insensitive",
            },
          },
        },
      ],
    };

    // Thêm điều kiện lọc cho các nghệ sĩ tương tự
    similarArtists.slice(0, 5).forEach((similarArtist) => {
      filter.OR.push({
        artist: {
          artistName: {
            contains: similarArtist,
            mode: "insensitive",
          },
        },
      });

      filter.OR.push({
        featuredArtists: {
          some: {
            artistProfile: {
              artistName: {
                contains: similarArtist,
                mode: "insensitive",
              },
            },
          },
        },
      });
    });

    // Nếu có thể loại liên quan, thêm điều kiện lọc thể loại
    if (relatedGenres.length > 0) {
      const genreIds = await prisma.genre.findMany({
        where: {
          name: {
            in: relatedGenres,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (genreIds.length > 0) {
        filter.OR.push({
          genres: {
            some: {
              genreId: {
                in: genreIds.map((g) => g.id),
              },
            },
          },
        });
      }
    }

    return filter;
  } catch (error) {
    console.error("[AI] Error creating enhanced artist filter:", error);

    // Trả về lọc cơ bản nếu có lỗi
    return {
      artist: {
        artistName: {
          contains: artistName,
          mode: "insensitive",
        },
      },
    };
  }
}

/**
 * Phân tích và tìm thể loại nhạc dựa trên đầu vào của người dùng
 * @param genreInput Tên thể loại người dùng nhập
 * @returns Object chứa thông tin về thể loại và thể loại liên quan
 */
async function analyzeGenre(genreInput: string): Promise<{
  mainGenre: string | null;
  mainGenreId: string | null;
  relatedGenres: { id: string; name: string }[];
  subGenres: { id: string; name: string }[];
  parentGenres: { id: string; name: string }[];
}> {
  console.log(`[AI] Analyzing genre: "${genreInput}"`);

  // Normalize input string
  const normalizedInput = genreInput.trim().toLowerCase();
  console.log(`[AI] Normalized input: "${normalizedInput}"`);

  // Genre dictionary and subgenres remain the same
  // ... existing genre dictionaries ...

  let mainGenre: string | null = null;
  let mainGenreId: string | null = null;
  const foundSubGenres: { id: string; name: string }[] = [];
  const foundRelatedGenres: { id: string; name: string }[] = [];
  const foundParentGenres: { id: string; name: string }[] = [];

  // Step 1: Try exact match first
  const exactGenre = await prisma.genre.findFirst({
    where: {
      name: {
        equals: normalizedInput,
        mode: "insensitive",
      },
    },
  });

  if (exactGenre) {
    console.log(`[AI] Found exact genre match: ${exactGenre.name}`);
    mainGenre = exactGenre.name;
    mainGenreId = exactGenre.id;
  } else {
    // Step 2: Try synonym matching
    for (const [genre, synonyms] of Object.entries(genreSynonyms)) {
      if (
        genre.toLowerCase() === normalizedInput ||
        synonyms.some((s) => s.toLowerCase() === normalizedInput)
      ) {
        console.log(`[AI] Found genre from synonyms: ${genre}`);

        const dbGenre = await prisma.genre.findFirst({
          where: {
            name: {
              equals: genre,
              mode: "insensitive",
            },
          },
        });

        if (dbGenre) {
          mainGenre = dbGenre.name;
          mainGenreId = dbGenre.id;
          break;
        }
      }
    }

    // Step 3: Try fuzzy matching if still no match
    if (!mainGenre) {
      const fuzzyResults = await prisma.genre.findMany({
        where: {
          name: {
            contains: normalizedInput,
            mode: "insensitive",
          },
        },
        take: 5,
      });

      if (fuzzyResults.length > 0) {
        // Find the closest match using Levenshtein distance
        let closestMatch = fuzzyResults[0];
        let minDistance = levenshteinDistance(
          normalizedInput,
          closestMatch.name.toLowerCase()
        );

        for (const result of fuzzyResults) {
          const distance = levenshteinDistance(
            normalizedInput,
            result.name.toLowerCase()
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestMatch = result;
          }
        }

        // Only use fuzzy match if it's reasonably close (distance < 3)
        if (minDistance < 3) {
          console.log(
            `[AI] Found fuzzy match: ${closestMatch.name} (distance: ${minDistance})`
          );
          mainGenre = closestMatch.name;
          mainGenreId = closestMatch.id;
        }
      }
    }
  }

  // If we found a main genre, populate related genres
  if (mainGenre) {
    // Find sub-genres
    const subGenres = genreHierarchy[mainGenre.toLowerCase()] || [];
    for (const subGenre of subGenres) {
      const dbSubGenre = await prisma.genre.findFirst({
        where: {
          name: {
            equals: subGenre,
            mode: "insensitive",
          },
        },
      });

      if (dbSubGenre) {
        foundSubGenres.push({
          id: dbSubGenre.id,
          name: dbSubGenre.name,
        });
      }
    }

    // Find related genres
    const related = relatedGenres[mainGenre.toLowerCase()] || [];
    for (const relatedGenre of related) {
      const dbRelatedGenre = await prisma.genre.findFirst({
        where: {
          name: {
            equals: relatedGenre,
            mode: "insensitive",
          },
        },
      });

      if (dbRelatedGenre) {
        foundRelatedGenres.push({
          id: dbRelatedGenre.id,
          name: dbRelatedGenre.name,
        });
      }
    }

    // Find parent genres
    for (const [parent, children] of Object.entries(genreHierarchy)) {
      if (
        children.some(
          (child) => child.toLowerCase() === mainGenre.toLowerCase()
        )
      ) {
        const dbParentGenre = await prisma.genre.findFirst({
          where: {
            name: {
              equals: parent,
              mode: "insensitive",
            },
          },
        });

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

// Genre dictionaries and type definitions
const genreHierarchy: Record<string, string[]> = {
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

const genreSynonyms: Record<string, string[]> = {
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

const relatedGenres: Record<string, string[]> = {
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

// Genre mappings for common variations
const genreVariations: Record<string, string[]> = {
  rock: ["rock music", "rock and roll", "rocks"],
  pop: ["popular", "pop music"],
  "hip hop": ["hiphop", "rap", "hip-hop"],
  electronic: ["electronica", "electronic music", "edm"],
  classical: ["classic", "orchestra", "orchestral"],
  ambient: ["ambient music", "atmospheric", "chill"],
  jazz: ["jazzy", "jazz music"],
};

// Function to find the closest genre match
function findClosestGenre(input: string, genres: string[]): string | null {
  let closestMatch = null;
  let minDistance = Infinity;

  for (const genre of genres) {
    const distance = levenshteinDistance(
      input.toLowerCase(),
      genre.toLowerCase()
    );
    if (distance < minDistance) {
      minDistance = distance;
      closestMatch = genre;
    }
  }

  // Only return a match if the distance is reasonably small
  return minDistance <= 3 ? closestMatch : null;
}
