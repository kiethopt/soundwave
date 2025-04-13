import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../config/db";
import { trackSelect } from "../utils/prisma-selects";
import { Playlist } from "@prisma/client";
import { PlaylistType } from "@prisma/client";
import { Prisma } from "@prisma/client";

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

    // Giá trị mặc định
    const trackCount = options.trackCount || 10;

    // Lấy lịch sử nghe nhạc của người dùng
    const userHistory = await prisma.history.findMany({
      where: {
        userId,
        type: "PLAY",
      },
      include: {
        track: {
          select: trackSelect,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50, // Tăng từ 30 lên 50 để có lịch sử đầy đủ hơn
    });

    // Check if the user has listening history
    if (userHistory.length === 0) {
      console.log(
        `[AI] User ${userId} has no listening history. Using default playlist.`
      );
      return generateDefaultPlaylistForNewUser(userId);
    }

    // Lấy danh sách bài hát mà người dùng đã thích
    const userLikedTracks = await prisma.userLikeTrack.findMany({
      where: { userId },
      include: {
        track: {
          select: trackSelect,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Tăng từ 30 lên 50 để có danh sách thích đầy đủ hơn
    });

    // Trích xuất nghệ sĩ và thể loại mà người dùng đã thể hiện sự quan tâm
    const preferredArtistIds = new Set<string>();
    const preferredGenreIds = new Set<string>();

    // Đếm số lần xuất hiện của từng nghệ sĩ trong lịch sử để xác định mức độ ưa thích
    const artistPlayCounts: Record<string, number> = {};
    const artistLikeCounts: Record<string, number> = {};
    const genreCounts: Record<string, number> = {};

    // Xử lý lịch sử để tìm nghệ sĩ và thể loại được ưa thích
    userHistory.forEach((history) => {
      if (history.track?.artistId) {
        preferredArtistIds.add(history.track.artistId);

        // Đếm số lần nghe mỗi nghệ sĩ với trọng số thời gian gần đây
        const daysAgo = Math.max(
          1,
          Math.floor(
            (Date.now() - new Date(history.updatedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        const recencyWeight = Math.max(0.5, 1 - daysAgo / 30); // Bài hát gần đây có trọng số cao hơn

        const artistId = history.track.artistId;
        artistPlayCounts[artistId] =
          (artistPlayCounts[artistId] || 0) +
          (history.playCount || 1) * recencyWeight;
      }

      history.track?.genres.forEach((genreRel) => {
        preferredGenreIds.add(genreRel.genre.id);
        // Đếm số lần nghe mỗi thể loại
        const genreId = genreRel.genre.id;
        genreCounts[genreId] =
          (genreCounts[genreId] || 0) + (history.playCount || 1);
      });
    });

    // Xử lý bài hát đã thích để tìm nghệ sĩ và thể loại được ưa thích
    userLikedTracks.forEach((like) => {
      if (like.track?.artistId) {
        preferredArtistIds.add(like.track.artistId);

        // Đếm số lần thích mỗi nghệ sĩ với trọng số thời gian gần đây
        const daysAgo = Math.max(
          1,
          Math.floor(
            (Date.now() - new Date(like.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        const recencyWeight = Math.max(0.5, 1 - daysAgo / 30); // Bài like gần đây có trọng số cao hơn

        const artistId = like.track.artistId;
        artistLikeCounts[artistId] =
          (artistLikeCounts[artistId] || 0) + 2 * recencyWeight; // Like có trọng số gấp đôi
      }

      like.track?.genres.forEach((genreRel) => {
        preferredGenreIds.add(genreRel.genre.id);
        // Đếm số lần thích mỗi thể loại
        const genreId = genreRel.genre.id;
        genreCounts[genreId] = (genreCounts[genreId] || 0) + 2; // Like có trọng số gấp đôi
      });
    });

    // Tính tổng điểm ưa thích cho mỗi nghệ sĩ (nghe + thích) và genres
    const artistPreferenceScore: Record<string, number> = {};
    const sortedPreferredGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);

    // Kết hợp lịch sử nghe và thích để tính điểm ưa thích
    Array.from(preferredArtistIds).forEach((artistId) => {
      // Nghe = 1 điểm, thích = 2 điểm
      artistPreferenceScore[artistId] =
        (artistPlayCounts[artistId] || 0) +
        (artistLikeCounts[artistId] || 0) * 2;
    });

    // Sắp xếp nghệ sĩ theo điểm ưa thích giảm dần
    const sortedPreferredArtists = Array.from(preferredArtistIds).sort(
      (a, b) =>
        (artistPreferenceScore[b] || 0) - (artistPreferenceScore[a] || 0)
    );

    console.log(
      `[AI] User has shown interest in ${preferredArtistIds.size} artists and ${preferredGenreIds.size} genres`
    );

    // Nếu có chỉ định tùy chọn basedOnArtist, ưu tiên nghệ sĩ đó
    if (options.basedOnArtist) {
      const artistByName = await prisma.artistProfile.findFirst({
        where: {
          artistName: {
            contains: options.basedOnArtist,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (artistByName) {
        // Đảm bảo nghệ sĩ được chỉ định luôn ở đầu danh sách ưu tiên
        preferredArtistIds.add(artistByName.id);
        sortedPreferredArtists.unshift(artistByName.id);

        // Tăng điểm ưu tiên cho nghệ sĩ được chọn
        artistPreferenceScore[artistByName.id] =
          (artistPreferenceScore[artistByName.id] || 0) + 100;

        console.log(
          `[AI] Adding specified artist to preferences: ${options.basedOnArtist}`
        );
      }
    }

    // Nếu có chỉ định tùy chọn basedOnGenre, ưu tiên thể loại đó
    let selectedGenreId = null;
    if (options.basedOnGenre) {
      const genreByName = await prisma.genre.findFirst({
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
        // Di chuyển thể loại được chọn lên đầu danh sách
        const genreIndex = sortedPreferredGenres.indexOf(genreByName.id);
        if (genreIndex > -1) {
          sortedPreferredGenres.splice(genreIndex, 1);
        }
        sortedPreferredGenres.unshift(genreByName.id);

        console.log(
          `[AI] Adding specified genre to preferences: ${options.basedOnGenre}`
        );
      }
    }

    // Tạo một truy vấn chính xác hơn cho bài hát
    // Kết hợp điều kiện lọc và điểm ưu tiên
    const whereClause: any = { isActive: true };
    let trackIds: string[] = [];

    // Phân bổ bài hát từ ba nguồn:
    // 1. Từ nghệ sĩ đã chọn/ưa thích
    // 2. Từ thể loại đã chọn/ưa thích
    // 3. Từ các bài phổ biến khác

    // Tính tỷ lệ phân bổ dựa trên có tham số hay không
    const hasArtistParam = options.basedOnArtist ? true : false;
    const hasGenreParam = options.basedOnGenre ? true : false;
    const hasMoodParam = options.basedOnMood ? true : false;

    // Cân bằng phân bổ dựa trên tham số và sở thích người dùng
    let artistRatio = 0.5; // Mặc định 50% từ nghệ sĩ ưa thích
    let genreRatio = 0.3; // Mặc định 30% từ thể loại ưa thích
    let popularRatio = 0.2; // Mặc định 20% từ các bài phổ biến

    // Điều chỉnh tỷ lệ nếu có tham số
    if (hasArtistParam && hasGenreParam) {
      // Khi cả nghệ sĩ và thể loại được chọn, ưu tiên nghệ sĩ cao hơn
      artistRatio = 0.8; // Tăng lên 80% khi cả nghệ sĩ và thể loại được chọn
      genreRatio = 0.15; // Giảm xuống 15% cho thể loại
      popularRatio = 0.05; // Giảm xuống 5% cho phổ biến
    } else if (hasArtistParam) {
      artistRatio = 0.7; // Tăng lên 70% nếu chỉ chọn nghệ sĩ
      genreRatio = 0.2;
      popularRatio = 0.1;
    } else if (hasGenreParam) {
      artistRatio = 0.3;
      genreRatio = 0.6; // Tăng lên 60% nếu chỉ chọn thể loại
      popularRatio = 0.1;
    } else if (hasMoodParam) {
      // Khi chỉ có mood được chọn
      artistRatio = 0.4;
      genreRatio = 0.4;
      popularRatio = 0.2;
    }

    const artistTrackCount = Math.ceil(trackCount * artistRatio);
    const genreTrackCount = Math.ceil(trackCount * genreRatio);
    const popularTrackCount = Math.max(
      0,
      trackCount - artistTrackCount - genreTrackCount
    );

    console.log(
      `[AI] Allocation: Artist=${artistTrackCount}, Genre=${genreTrackCount}, Popular=${popularTrackCount}`
    );

    // 1. Lấy bài hát từ nghệ sĩ ưa thích
    let artistTracks: Array<any> = []; // Định nghĩa biến để lưu trữ
    if (preferredArtistIds.size > 0 && artistTrackCount > 0) {
      // Áp dụng lọc theo mood nếu có
      const moodFilter = options.basedOnMood
        ? await getMoodFilter(options.basedOnMood)
        : {};

      const artistTracksQuery: Prisma.TrackFindManyArgs = {
        where: {
          isActive: true,
          artistId: { in: Array.from(preferredArtistIds) },
          // Lọc thêm thể loại nếu có tham số thể loại
          ...(selectedGenreId
            ? {
                genres: {
                  some: {
                    genreId: selectedGenreId,
                  },
                },
              }
            : {}),
          // Áp dụng lọc theo mood
          ...moodFilter,
        },
        orderBy: [
          // Sắp xếp bài hát gần đây hơn lên trước
          { createdAt: "desc" },
          { playCount: "desc" },
        ],
        take: artistTrackCount * 2, // Lấy nhiều hơn để có đủ lựa chọn
      };

      artistTracks = await prisma.track.findMany(artistTracksQuery);

      // Ưu tiên bài hát từ nghệ sĩ có điểm cao
      const scoredArtistTracks = artistTracks
        .map((track) => {
          return {
            ...track,
            score: artistPreferenceScore[track.artistId || ""] || 0,
          };
        })
        .sort((a, b) => b.score - a.score);

      // Lấy số lượng bài theo phân bổ, nhưng không vượt quá số bài có sẵn
      const selectedArtistTracks = scoredArtistTracks.slice(
        0,
        artistTrackCount
      );
      trackIds = selectedArtistTracks.map((track) => track.id);
    }

    // 2. Lấy bài hát từ thể loại ưa thích
    if (preferredGenreIds.size > 0 && genreTrackCount > 0) {
      // Bắt đầu với thể loại được chỉ định hoặc thể loại đầu tiên trong danh sách ưa thích
      const targetGenreIds = selectedGenreId
        ? [selectedGenreId]
        : sortedPreferredGenres.slice(0, 3); // Lấy 3 thể loại hàng đầu

      // Áp dụng lọc theo mood nếu có
      const moodFilter = options.basedOnMood
        ? await getMoodFilter(options.basedOnMood)
        : {};

      const genreTracksQuery: Prisma.TrackFindManyArgs = {
        where: {
          isActive: true,
          id: { notIn: trackIds }, // Tránh trùng lặp với bài hát đã chọn
          genres: {
            some: {
              genreId: { in: targetGenreIds },
            },
          },
          // Áp dụng lọc theo mood
          ...moodFilter,
          // Khi cả artist và genre được chọn, ưu tiên bài hát từ nghệ sĩ đã chọn
          ...(hasArtistParam && hasGenreParam
            ? {
                artist: {
                  artistName: {
                    contains: options.basedOnArtist,
                    mode: "insensitive",
                  },
                },
              }
            : // Loại trừ nghệ sĩ đã lấy bài nếu chỉ có genre param
            hasGenreParam && !hasArtistParam && trackIds.length > 0
            ? {
                artistId: {
                  notIn: Array.from(
                    new Set(
                      trackIds
                        .map((id) => {
                          const track = artistTracks.find((t) => t.id === id);
                          return track?.artistId;
                        })
                        .filter(Boolean) as string[]
                    )
                  ),
                },
              }
            : {}),
        },
        orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
        take: genreTrackCount,
      };

      const genreTracks = await prisma.track.findMany(genreTracksQuery);
      trackIds = [...trackIds, ...genreTracks.map((t) => t.id)];
    }

    // 3. Bổ sung với các bài hát phổ biến nếu cần
    if (trackIds.length < trackCount && popularTrackCount > 0) {
      const remainingNeeded = trackCount - trackIds.length;

      // Áp dụng lọc theo mood nếu có
      const moodFilter = options.basedOnMood
        ? await getMoodFilter(options.basedOnMood)
        : {};

      const popularTracksQuery: Prisma.TrackFindManyArgs = {
        where: {
          isActive: true,
          id: { notIn: trackIds }, // Tránh trùng lặp
          // Áp dụng lọc theo mood
          ...moodFilter,
        },
        orderBy: { playCount: "desc" },
        take: remainingNeeded,
      };

      const popularTracks = await prisma.track.findMany(popularTracksQuery);
      trackIds = [...trackIds, ...popularTracks.map((t) => t.id)];
    }

    // Đảm bảo chúng ta có số lượng bài hát yêu cầu nếu có thể
    if (trackIds.length > trackCount) {
      trackIds = trackIds.slice(0, trackCount);
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
    const playlistDescription =
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
          skipDuplicates: true, // Avoid errors if track already exists (though we deleted them)
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
  userId: string
): Promise<string[]> => {
  try {
    console.log(`[AI] Generating default playlist for new user ${userId}`);

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
      take: 15,
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

/**
 * Analyzes all Vibe Rewind playlists from users to determine the most popular moods and genres
 * @returns A Promise resolving to an object with the most popular mood and genres
 */
export const analyzeAllVibeRewindPlaylists = async (): Promise<{
  mood: string;
  genres: string[];
}> => {
  try {
    console.log(
      "[AI] Analyzing all Vibe Rewind playlists to determine popular trends"
    );

    // Get all Vibe Rewind playlists
    const vibeRewindPlaylists = await prisma.playlist.findMany({
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
      take: 100, // Limit to 100 playlists to avoid performance issues
    });

    if (vibeRewindPlaylists.length === 0) {
      console.log("[AI] No Vibe Rewind playlists found. Using default values.");
      return {
        mood: "energetic",
        genres: ["Pop", "Rock", "Hip Hop"],
      };
    }

    // Extract all tracks from all Vibe Rewind playlists
    const allTracks = vibeRewindPlaylists.flatMap((playlist) =>
      playlist.tracks.map((pt) => pt.track)
    );

    // Count genres
    const genreCounts: Record<string, number> = {};
    allTracks.forEach((track) => {
      track.genres.forEach((genreRel) => {
        const genreName = genreRel.genre.name;
        genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
      });
    });

    // Sort genres by count
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0])
      .slice(0, 3); // Get top 3 genres

    // Prepare context for mood analysis
    const moodContext = {
      tracks: allTracks.map((track) => ({
        title: track.title,
        genres: track.genres.map((g) => g.genre.name),
      })),
    };

    // Use AI to analyze the overall mood
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

    // Clean the response
    const responseText = result.response.text();
    const cleanedResponse = responseText.replace(/```json|```/g, "").trim();

    let analysis;
    try {
      analysis = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error("[AI] Error parsing AI response:", error);
      console.error("[AI] Raw response:", responseText);

      // Fallback to our own analysis if AI fails
      return {
        mood: "energetic",
        genres:
          sortedGenres.length > 0 ? sortedGenres : ["Pop", "Rock", "Hip Hop"],
      };
    }

    console.log(
      `[AI] Analyzed ${vibeRewindPlaylists.length} Vibe Rewind playlists with ${allTracks.length} tracks`
    );
    console.log(`[AI] Most popular mood: ${analysis.mood}`);
    console.log(`[AI] Most popular genres: ${analysis.genres.join(", ")}`);

    return {
      mood: analysis.mood,
      genres: analysis.genres,
    };
  } catch (error) {
    console.error("[AI] Error analyzing Vibe Rewind playlists:", error);
    // Return default values in case of error
    return {
      mood: "energetic",
      genres: ["Pop", "Rock", "Hip Hop"],
    };
  }
};

// Thêm hàm helper để lọc theo mood
/**
 * Tạo điều kiện lọc Prisma dựa trên tâm trạng (mood)
 * @param mood - Tâm trạng cần lọc
 * @returns Object điều kiện lọc Prisma
 */
async function getMoodFilter(mood: string): Promise<any> {
  // Định nghĩa các thể loại phù hợp với từng tâm trạng
  const moodToGenreMap: Record<string, string[]> = {
    energetic: ["Pop", "EDM", "Rock", "Dance", "Electronic", "Hip Hop"],
    calm: ["Acoustic", "Jazz", "Classical", "Ambient", "Lo-fi"],
    happy: ["Pop", "Dance", "Funk", "Disco", "R&B"],
    sad: ["Ballad", "Blues", "Soul", "Acoustic", "Indie"],
    nostalgic: ["Oldies", "Classic Rock", "Classic", "80s", "90s"],
    romantic: ["R&B", "Soul", "Ballad", "Jazz", "Acoustic"],
    focused: ["Classical", "Lo-fi", "Ambient", "Instrumental", "Jazz"],
    party: ["Dance", "EDM", "Hip Hop", "Pop", "Disco", "Rap"],
  };

  // Chuẩn hóa mood (chuyển thành lowercase)
  const normalizedMood = mood.toLowerCase();

  // Lấy các thể loại phù hợp với mood
  const relevantGenres = moodToGenreMap[normalizedMood] || [];

  if (relevantGenres.length === 0) {
    // Nếu không khớp với bất kỳ mood nào đã biết, trả về filter trống
    return {};
  }

  // Tìm ID của các thể loại liên quan
  const genreIds = await prisma.genre.findMany({
    where: {
      name: {
        in: relevantGenres,
        mode: "insensitive", // Không phân biệt hoa thường
      },
    },
    select: { id: true },
  });

  // Tạo điều kiện lọc Prisma
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

  // Fallback
  return {};
}
