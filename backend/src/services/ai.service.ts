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

// Sử dụng model từ biến môi trường, mặc định là gemini-pro nếu không được cấu hình
const modelName = process.env.GEMINI_MODEL || "gemini-pro";

let model;
try {
  model = genAI.getGenerativeModel({
  model: modelName,
  systemInstruction:
    "You are an expert music curator specializing in personalization. Your primary goal is to create highly personalized playlists that closely match each user's demonstrated preferences. PRIORITIZE tracks from artists the user has already listened to or liked. Only include tracks from other artists if they are extremely similar in style and genre to the user's favorites. Analyze the provided listening history and liked tracks carefully, identifying patterns in genres, artists, and moods. Return ONLY a valid JSON array of track IDs, without any duplicates or explanations. The tracks should strongly reflect the user's taste, with at least 80% being from artists they've shown interest in.",
});
console.log(`[AI] Using Gemini model: ${modelName}`);
} catch (error) {
  console.error("[AI] Error initializing Gemini model:", error);
  throw new Error("Failed to initialize Gemini AI model. Please check your API key and model configuration.");
}

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
          }
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
  let playlistId: string | undefined;
  
  try {
    console.log(
      `[AI] Generating playlist for user ${userId} with options:`,
      options
    );

    // Số lượng bài hát cần tạo (mặc định là 10)
    const trackCount = options.trackCount || 10;

    // Tạo hoặc cập nhật playlist
    if (options.name) {
      // Kiểm tra xem playlist đã tồn tại chưa
      const existingPlaylist = await prisma.playlist.findFirst({
        where: {
          name: options.name,
          userId,
          type: PlaylistType.SYSTEM,
          isAIGenerated: true
        }
      });

      if (existingPlaylist) {
        // Cập nhật playlist đã tồn tại
        const updatedPlaylist = await prisma.playlist.update({
          where: { id: existingPlaylist.id },
          data: {
            description: options.description || existingPlaylist.description,
            coverUrl: options.coverUrl || existingPlaylist.coverUrl,
            tracks: {
              deleteMany: {} // Xóa tất cả các bài hát cũ
            }
          }
        });
        playlistId = updatedPlaylist.id;
        console.log(`[AI] Updated existing playlist with ID: ${playlistId}`);
      } else {
        // Tạo playlist mới
        const playlist = await prisma.playlist.create({
          data: {
            name: options.name,
            description: options.description || "AI-generated playlist",
            userId,
            type: PlaylistType.SYSTEM,
            isAIGenerated: true,
            coverUrl: options.coverUrl,
          }
        });
        playlistId = playlist.id;
        console.log(`[AI] Created new playlist with ID: ${playlistId}`);
      }
    }

    // Lấy lịch sử nghe nhạc gần đây của người dùng
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
      take: 50,
    });

    // Lấy các bài hát người dùng đã thích
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
      take: 50,
    });

    // Xác định các nghệ sĩ và thể loại ưa thích của người dùng
    const preferredArtistIds = new Set<string>();
    const preferredGenreIds = new Set<string>();
    const artistPlayCounts: Record<string, number> = {};
    const artistLikeCounts: Record<string, number> = {};
    const genreCounts: Record<string, number> = {};

    // Phân tích lịch sử nghe nếu có
    if (userHistory.length > 0) {
      userHistory.forEach((history) => {
        if (history.track?.artistId) {
          preferredArtistIds.add(history.track.artistId);
          artistPlayCounts[history.track.artistId] =
            (artistPlayCounts[history.track.artistId] || 0) + 1;
        }

        if (history.track?.genres) {
          history.track.genres.forEach((genreRel: any) => {
            if (genreRel.genreId) {
              preferredGenreIds.add(genreRel.genreId);
              genreCounts[genreRel.genreId] = (genreCounts[genreRel.genreId] || 0) + 1;
            }
          });
        }
      });
    }

    // Phân tích bài hát đã thích nếu có
    if (userLikedTracks.length > 0) {
      userLikedTracks.forEach((like) => {
        if (like.track?.artistId) {
          preferredArtistIds.add(like.track.artistId);
          artistLikeCounts[like.track.artistId] =
            (artistLikeCounts[like.track.artistId] || 0) + 1;
        }

        if (like.track?.genres) {
          like.track.genres.forEach((genreRel: any) => {
            if (genreRel.genreId) {
              preferredGenreIds.add(genreRel.genreId);
              genreCounts[genreRel.genreId] = (genreCounts[genreRel.genreId] || 0) + 3; // Weight likes higher
            }
          });
        }
      });
    }

    // Tính toán điểm số ưa thích cho mỗi nghệ sĩ dựa trên lịch sử nghe và thích
    const artistPreferenceScore: Record<string, number> = {};
    for (const artistId of preferredArtistIds) {
      // Trọng số thích = 3, trọng số nghe = 1
      const playScore = artistPlayCounts[artistId] || 0;
      const likeScore = (artistLikeCounts[artistId] || 0) * 3;
      artistPreferenceScore[artistId] = playScore + likeScore;
    }

    // Sắp xếp thể loại ưa thích theo số lần xuất hiện
    const sortedPreferredGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id);

    // Xác định thể loại cụ thể nếu người dùng đã chỉ định
    let selectedGenreId: string | null = null;
    let enhancedGenreFilter: any = {};

    if (options.basedOnGenre) {
      // Use enhanced genre filter instead of simple matching
      enhancedGenreFilter = await createEnhancedGenreFilter(
        options.basedOnGenre
      );
      console.log(`[AI] Using enhanced genre filter for: ${options.basedOnGenre}`);
      
      // For backward compatibility, still get the selectedGenreId
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

    // Thiết lập điều kiện lọc cơ bản
    const whereClause: any = { isActive: true };

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

    
    if (options.basedOnSongLength) {
      const lengthValue = Number(options.basedOnSongLength); 
      if (!isNaN(lengthValue)) {
        // Add a small buffer for exact length matches
        const buffer = 5; // 5 seconds buffer
        whereClause.duration = { 
            gte: lengthValue - buffer,
            lte: lengthValue + buffer 
        };
        console.log(`[AI] Song length filter: ${lengthValue} seconds (±${buffer}s)`);
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

    // Đọc tham số và quyết định tỷ lệ cho mỗi nguồn bài hát
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

    // Thiết lập tỷ lệ mặc định cho các nguồn bài hát
    let artistRatio = 0.55;  // Tỷ lệ bài hát từ nghệ sĩ ưa thích
    let genreRatio = 0.25;   // Tỷ lệ bài hát từ thể loại ưa thích
    let popularRatio = 0.2;

    console.log("[AI] Initial ratios:", {
      artistRatio,
      genreRatio,
      popularRatio
    });

    // Điều chỉnh tỷ lệ dựa trên tham số được cung cấp
    // Case 1: Only basedOnMood
    if (hasMoodParam && !hasGenreParam && !hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.4;
      genreRatio = 0.4;
      popularRatio = 0.3;
      console.log("[AI] Case 1: Only basedOnMood");
    }
    // Case 2: basedOnMood and basedOnGenre
    else if (hasMoodParam && hasGenreParam && !hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.05;
      genreRatio = 0.9;
      popularRatio = 0.05;
    }
    // Case 3: basedOnMood and basedOnArtist
    else if (hasMoodParam && !hasGenreParam && hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.7;
      genreRatio = 0.15;
      popularRatio = 0.15;
    }
    // Case 4: basedOnMood and basedOnSongLength
    else if (hasMoodParam && !hasGenreParam && !hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.4;
      genreRatio = 0.4;
      popularRatio = 0.2;
    }
    // Case 5: basedOnMood and basedOnReleaseTime
    else if (hasMoodParam && !hasGenreParam && !hasArtistParam && !hasSongLengthParam && hasReleaseTimeParam) {
      artistRatio = 0.4;
      genreRatio = 0.4;
      popularRatio = 0.2;
    }
    // Case 6: basedOnMood, basedOnGenre, basedOnArtist
    else if (hasMoodParam && hasGenreParam && hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.6;
      genreRatio = 0.3;
      popularRatio = 0.1;
    }
    // Case 7: basedOnMood, basedOnGenre, basedOnArtist, basedOnSongLength
    else if (hasMoodParam && hasGenreParam && hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.5;
      genreRatio = 0.4;
      popularRatio = 0.1;
    }
    // Case 8: All parameters (basedOnMood, basedOnGenre, basedOnArtist, basedOnSongLength, basedOnReleaseTime)
    else if (hasMoodParam && hasGenreParam && hasArtistParam && hasSongLengthParam && hasReleaseTimeParam) {
      artistRatio = 0.5;
      genreRatio = 0.3;
      popularRatio = 0.2;
    }
    // Case 9: Only basedOnGenre
    else if (!hasMoodParam && hasGenreParam && !hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.2;
      genreRatio = 0.6;
      popularRatio = 0.2;
    }
    // Case 10: basedOnGenre and basedOnArtist
    else if (!hasMoodParam && hasGenreParam && hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 1; 
      genreRatio = 0;   
      popularRatio = 0; 
    }
    // Case 11: basedOnGenre, basedOnArtist, basedOnSongLength
    else if (!hasMoodParam && hasGenreParam && hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.5;
      genreRatio = 0.4;
      popularRatio = 0.1;
    }
    // Case 12: basedOnGenre, basedOnArtist, basedOnSongLength, basedOnReleaseTime
    else if (!hasMoodParam && hasGenreParam && hasArtistParam && hasSongLengthParam && hasReleaseTimeParam) {
      artistRatio = 0.5;
      genreRatio = 0.3;
      popularRatio = 0.2;
    }
    // Case 13: Only basedOnArtist
    else if (!hasMoodParam && !hasGenreParam && hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 1;
      genreRatio = 0;
      popularRatio = 0;
    }
    // Case 14: basedOnArtist and basedOnSongLength
    else if (!hasMoodParam && !hasGenreParam && hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 1;
      genreRatio = 0;
      popularRatio = 0;
    }
    // Case 15: basedOnArtist, basedOnSongLength, and basedOnReleaseTime
    else if (!hasMoodParam && !hasGenreParam && hasArtistParam && hasSongLengthParam && hasReleaseTimeParam) {
      artistRatio = 1;
      genreRatio = 0;
      popularRatio = 0;
    }
    // Case 16: Only basedOnSongLength
    else if (!hasMoodParam && !hasGenreParam && !hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.4;
      genreRatio = 0.4;
      popularRatio = 0.2;
    }
    // Case 17: basedOnSongLength and basedOnReleaseTime
    else if (!hasMoodParam && !hasGenreParam && !hasArtistParam && hasSongLengthParam && hasReleaseTimeParam) {
      artistRatio = 0.4;
      genreRatio = 0.4;
      popularRatio = 0.2;
    }
    // Case 18: Only basedOnReleaseTime
    else if (!hasMoodParam && !hasGenreParam && !hasArtistParam && !hasSongLengthParam && hasReleaseTimeParam) {
      artistRatio = 0.45;
      genreRatio = 0.45;
      popularRatio = 0.1;
    }
    // Case 19: basedOnGenre and basedOnReleaseTime
    else if (!hasMoodParam && hasGenreParam && !hasArtistParam && !hasSongLengthParam && hasReleaseTimeParam) {
      artistRatio = 0.3;
      genreRatio = 0.6;
      popularRatio = 0.1;
      console.log("[AI] Case 19: basedOnGenre and basedOnReleaseTime");
    }
    // Case 20: basedOnGenre and basedOnSongLength
    else if (!hasMoodParam && hasGenreParam && !hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.3;
      genreRatio = 0.6;
      popularRatio = 0.1;
      console.log("[AI] Case 20: basedOnGenre and basedOnSongLength");
    }
    // Case 21: basedOnGenre, basedOnReleaseTime, and basedOnSongLength
    else if (!hasMoodParam && hasGenreParam && !hasArtistParam && hasSongLengthParam && hasReleaseTimeParam) {
      artistRatio = 0.2;
      genreRatio = 0.7;
      popularRatio = 0.1;
      console.log("[AI] Case 21: basedOnGenre, basedOnReleaseTime, and basedOnSongLength");
    }
    // Case 22: basedOnArtist and basedOnReleaseTime
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

    // Tính toán số lượng bài hát cho mỗi nguồn
    const artistTrackCount = Math.floor(trackCount * artistRatio);
    const genreTrackCount = Math.floor(trackCount * genreRatio);
    const popularTrackCount = trackCount - artistTrackCount - genreTrackCount;

    // Kiểm tra nếu tổng tỷ lệ là 0 thì không tạo playlist
    if (artistRatio === 0 && genreRatio === 0 && popularRatio === 0) {
      console.log("[AI] All ratios are 0, skipping playlist generation");
      return [];
    }

    console.log(`[AI] Track count: ${trackCount}`);
    console.log(`[AI] Allocation: Artist=${artistTrackCount}, Genre=${genreTrackCount}, Popular=${popularTrackCount}`);

    // Biến để lưu trữ tất cả các bài hát của nghệ sĩ được tìm thấy
    let artistTracks: any[] = [];
    let trackIds: string[] = [];

    // 1. Lấy bài hát từ nghệ sĩ ưa thích hoặc nghệ sĩ được chỉ định
    if (artistTrackCount > 0) {
      const moodFilter = options.basedOnMood
        ? await getMoodFilter(options.basedOnMood)
        : {};

      // First try to get tracks from the exact artist
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
          { playCount: Prisma.SortOrder.desc },
          { createdAt: Prisma.SortOrder.desc },
        ],
        take: artistTrackCount * 3,
      };

      let artistTracks = await prisma.track.findMany(artistTracksQuery);
      
      // Only try to find additional tracks if we don't have basedOnReleaseTime
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
          { playCount: Prisma.SortOrder.desc },
            { createdAt: Prisma.SortOrder.desc },
          ],
          take: remainingCount * 3,
        };

        const additionalTracks = await prisma.track.findMany(additionalTracksQuery);
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

    // 2. Lấy bài hát từ thể loại ưa thích hoặc thể loại được chỉ định
    if (genreTrackCount > 0) {
      // Xác định thể loại mục tiêu - sử dụng thể loại đã chỉ định hoặc thể loại ưa thích hàng đầu
      const targetGenreIds = selectedGenreId
        ? [selectedGenreId]
        : sortedPreferredGenres.length > 0
        ? sortedPreferredGenres.slice(0, 3)
        : [];

      // Lọc theo tâm trạng nếu được chỉ định
      const moodFilter = options.basedOnMood
        ? await getMoodFilter(options.basedOnMood)
        : {};

      // Xây dựng truy vấn cho bài hát dựa trên thể loại
      const genreTracksQuery = {
        where: {
          isActive: true,
          id: { notIn: trackIds },
          ...(options.basedOnGenre ? enhancedGenreFilter : targetGenreIds.length > 0 ? {
            genres: {
              some: {
                genreId: { in: targetGenreIds },
              },
            },
          } : {}),
          ...whereClause, // This now includes both genre and song length filters
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
                  notIn: Array.from(
                    new Set(
                      trackIds
                            .map(id => {
                              const track = artistTracks.find(t => t.id === id);
                          return track?.artistId;
                        })
                        .filter(Boolean) as string[]
                    )
                  ),
                },
              }
            : {}),
        },
        orderBy: [{ playCount: Prisma.SortOrder.desc }, { createdAt: Prisma.SortOrder.desc }],
        take: genreTrackCount * 3, // Increased multiplier for better selection
      };

      const genreTracks = await prisma.track.findMany(genreTracksQuery);
      
      // Tính điểm và sắp xếp bài hát
      const scoredGenreTracks = genreTracks
        .map(track => ({
          ...track,
          score: calculateTrackScore(track, options)
        }))
        .sort((a, b) => b.score - a.score);

      // Chọn chính xác số lượng bài hát cần thiết
      const selectedGenreTracks = scoredGenreTracks.slice(0, genreTrackCount);
      trackIds = [...trackIds, ...selectedGenreTracks.map(t => t.id)];
    }

    // 3. Thêm các bài hát phổ biến nếu chưa đủ số lượng
    if (trackIds.length < trackCount && popularTrackCount > 0) {
      const remainingNeeded = trackCount - trackIds.length;
      // Lọc theo tâm trạng nếu được chỉ định
      const moodFilter = options.basedOnMood
        ? await getMoodFilter(options.basedOnMood)
        : {};

      // Truy vấn để lấy bài hát phổ biến
      const popularTracksQuery = {
        where: {
          isActive: true,
          id: { notIn: trackIds },
          ...(options.basedOnGenre && enhancedGenreFilter ? enhancedGenreFilter : {}),
          ...whereClause,
          ...moodFilter,
        },
        orderBy: [
          { playCount: Prisma.SortOrder.desc },
          { createdAt: Prisma.SortOrder.desc }
        ],
        take: remainingNeeded * 3, // Tăng số lượng để có nhiều lựa chọn hơn
      };

      const popularTracks = await prisma.track.findMany(popularTracksQuery);
      
      // Tính điểm và sắp xếp bài hát
      const scoredPopularTracks = popularTracks
        .map(track => ({
          ...track,
          score: calculateTrackScore(track, options)
        }))
        .sort((a, b) => b.score - a.score);

      // Chọn chính xác số lượng bài hát cần thiết
      const selectedPopularTracks = scoredPopularTracks.slice(0, remainingNeeded);
      trackIds = [...trackIds, ...selectedPopularTracks.map(t => t.id)];
    }

    // Đảm bảo số lượng bài hát chính xác
    if (trackIds.length !== trackCount) {
      console.log(`[AI] Warning: Generated ${trackIds.length} tracks instead of requested ${trackCount}`);
    }

    // Lấy thông tin chi tiết của các bài hát trong playlist
    const playlistTracks = await prisma.track.findMany({
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

    // Kiểm tra lại playlist bằng Gemini
    if (playlistTracks.length > 0 && options.basedOnMood) {
      try {
        // Tạo prompt cho Gemini
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
        
        // Gọi Gemini API
        try {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            console.error("[AI] GEMINI_API_KEY is not set in environment variables");
            return trackIds;
          }

          // Khởi tạo Gemini client với phiên bản mới
          const genAI = new GoogleGenerativeAI(apiKey);
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
          
          // Thêm cơ chế retry
          const maxRetries = 3;
          let retryCount = 0;
          let result;
          
          while (retryCount < maxRetries) {
            try {
              result = await model.generateContent(prompt);
              break;
            } catch (error: any) {
              if (error.status === 429 && retryCount < maxRetries - 1) {
                // Tăng thời gian delay lên 2 phút (120 giây)
                const retryDelay = 120 * 1000;
                console.log(`[AI] Rate limit hit, waiting ${retryDelay/1000}s before retry...`);
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
          
          // Phân tích kết quả từ Gemini
          const lines = text.split('\n');
          const mismatchedTracks: { index: number, reason: string }[] = [];
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes("NO") || line.toLowerCase().includes("doesn't match") || line.toLowerCase().includes("does not match")) {
              // Tìm index của bài hát từ dòng trước đó
              const prevLine = lines[i-1];
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
          
          // Nếu có bài hát không phù hợp, thay thế chúng
          if (mismatchedTracks.length > 0) {
            console.log(`[AI] Found ${mismatchedTracks.length} tracks that don't match the criteria. Replacing them...`);
            
            // Xóa các bài hát không phù hợp
            const validTrackIds = trackIds.filter((_, index) => 
              !mismatchedTracks.some(mt => mt.index === index)
            );
            
            // Tìm bài hát thay thế
            const replacementCount = mismatchedTracks.length;
            
            // Tạo điều kiện tìm kiếm dựa trên các tham số
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
                { playCount: Prisma.SortOrder.desc },
                { createdAt: Prisma.SortOrder.desc }
              ],
              take: replacementCount * 2, // Lấy nhiều hơn để có thể chọn ngẫu nhiên
            };
            
            const replacementTracks = await prisma.track.findMany(replacementQuery);
            
            if (replacementTracks.length === 0) {
              console.log("[AI] No suitable replacement tracks found in database");
              return trackIds;
            }
            
            // Chọn ngẫu nhiên các bài hát thay thế
            const selectedReplacements = replacementTracks
              .sort(() => Math.random() - 0.5)
              .slice(0, replacementCount);
            
            console.log("[AI] Selected replacement tracks:", selectedReplacements.map(t => t.title));
            
            // Cập nhật trackIds với các bài hát mới
            const updatedTrackIds = [...validTrackIds];
            mismatchedTracks.forEach((mt, index) => {
              if (selectedReplacements[index]) {
                updatedTrackIds.splice(mt.index, 0, selectedReplacements[index].id);
              }
            });
            
            // Cập nhật playlist trong database
            if (playlistId) {
              try {
                // Xóa tất cả các bài hát hiện tại
                await prisma.playlist.update({
                  where: { id: playlistId },
                  data: {
                    tracks: {
                      deleteMany: {} // Xóa tất cả các bài hát
                    }
                  }
                });

                // Thêm các bài hát mới
                await prisma.playlist.update({
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
              } catch (error) {
                console.error("[AI] Error updating playlist:", error);
              }
            }
            
            // Cập nhật trackIds để trả về
            trackIds = updatedTrackIds;
            
            // Kiểm tra lại playlist sau khi cập nhật
            if (playlistId) {
              const updatedPlaylist = await prisma.playlist.findUnique({
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
          } else {
            console.log("[AI] All tracks match the criteria.");
          }
        } catch (error) {
          console.error("[AI] Error during Gemini verification:", error);
          // Nếu có lỗi trong quá trình kiểm tra, vẫn trả về playlist đã tạo
          console.log("[AI] Continuing with original playlist due to verification error");
        }
      } catch (error) {
        console.error("[AI] Error during Gemini verification:", error);
        // Nếu có lỗi trong quá trình kiểm tra, vẫn trả về playlist đã tạo
      }
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


async function getMoodFilter(mood: string): Promise<any> {
  const moodKeywords: Record<string, string[]> = {
    happy: ['happy', 'joy', 'cheerful', 'upbeat', 'energetic', 'positive', 'sunny', 'bright'],
    sad: ['sad', 'melancholy', 'depressing', 'down', 'emotional', 'heartbreak', 'tears'],
    calm: ['calm', 'peaceful', 'relaxing', 'serene', 'tranquil', 'gentle', 'soothing'],
    energetic: ['energetic', 'powerful', 'strong', 'intense', 'dynamic', 'power', 'force'],
    romantic: ['romantic', 'love', 'passion', 'intimate', 'sweet', 'tender', 'affection'],
    nostalgic: ['nostalgic', 'memories', 'retro', 'vintage', 'classic', 'old', 'remember'],
    mysterious: ['mysterious', 'mystery', 'dark', 'enigmatic', 'secret', 'hidden', 'unknown'],
    dreamy: ['dreamy', 'ethereal', 'atmospheric', 'ambient', 'floating', 'space', 'cloud'],
    angry: ['angry', 'rage', 'furious', 'aggressive', 'intense', 'hate', 'frustrated'],
    hopeful: ['hopeful', 'optimistic', 'inspiring', 'uplifting', 'motivation', 'dream', 'future']
  };

  const normalizedMood = mood.toLowerCase().trim();
  
  // Find matching mood category
  let matchingKeywords: string[] = [];
  for (const [category, keywords] of Object.entries(moodKeywords)) {
    if (keywords.some(keyword => normalizedMood.includes(keyword))) {
      matchingKeywords = keywords;
      break;
    }
  }

  // If no specific mood match found, use the input mood as a keyword
  if (matchingKeywords.length === 0) {
    matchingKeywords = [normalizedMood];
  }

  // Create the filter based on mood keywords
  return {
    OR: [
      // Search in track title
      {
        title: {
          contains: matchingKeywords[0],
          mode: 'insensitive'
        }
      },
      // Search in track description
      {
        description: {
          contains: matchingKeywords[0],
          mode: 'insensitive'
        }
      },
      // Search in genre names
      {
        genres: {
          some: {
            genre: {
              name: {
                contains: matchingKeywords[0],
                mode: 'insensitive'
              }
            }
          }
        }
      },
      // Search in artist name
      {
        artist: {
          artistName: {
            contains: matchingKeywords[0],
            mode: 'insensitive'
          }
        }
      }
    ]
  };
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
          const distance = levenshteinDistance(normalizedInput, result.name.toLowerCase());
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

// Thêm hàm tính điểm cho bài hát
function calculateTrackScore(track: any, params: any): number {
  let score = 0;
  
  // 1. Tính điểm dựa trên sự phù hợp với tham số (0-80 điểm)
  let parameterMatchScore = 0;
  
  // Kiểm tra phù hợp với thể loại
  if (params.basedOnGenre && track.genres) {
    const genreMatch = track.genres.some((g: any) => 
      g.genre.name.toLowerCase().includes(params.basedOnGenre.toLowerCase())
    );
    if (genreMatch) parameterMatchScore += 20;
  }
  
  // Kiểm tra phù hợp với nghệ sĩ
  if (params.basedOnArtist && track.artist) {
    const artistMatch = track.artist.artistName.toLowerCase().includes(params.basedOnArtist.toLowerCase());
    if (artistMatch) parameterMatchScore += 20;
  }
  
  // Kiểm tra phù hợp với độ dài bài hát
  if (params.basedOnSongLength && track.duration) {
    const lengthDiff = Math.abs(track.duration - params.basedOnSongLength);
    if (lengthDiff <= 30) parameterMatchScore += 20; // Cho phép sai lệch 30 giây
  }
  
  // Kiểm tra phù hợp với thời gian phát hành
  if (params.basedOnReleaseTime && track.releaseDate) {
    const releaseYear = new Date(track.releaseDate).getFullYear();
    const currentYear = new Date().getFullYear();
    
    switch(params.basedOnReleaseTime.toLowerCase()) {
      case 'new':
        if (releaseYear === currentYear) parameterMatchScore += 20;
        break;
      case 'recent':
        if (releaseYear >= currentYear - 2) parameterMatchScore += 20;
        break;
      case 'classic':
        if (releaseYear <= currentYear - 20) parameterMatchScore += 20;
        break;
    }
  }
  
  score += parameterMatchScore;
  
  // 2. Tính điểm dựa trên độ mới (0-10 điểm)
  const trackAge = Date.now() - new Date(track.createdAt).getTime();
  const daysOld = trackAge / (1000 * 60 * 60 * 24);
  const newnessScore = Math.max(0, 10 - (daysOld / 90)); // Giảm 1 điểm mỗi 90 ngày
  score += newnessScore;
  
  // 3. Tính điểm dựa trên độ phổ biến (0-10 điểm)
  const popularityScore = Math.min(10, (track.playCount || 0) / 200); // 1 điểm cho mỗi 200 lượt nghe, tối đa 10 điểm
  score += popularityScore;
  
  // Thêm yếu tố ngẫu nhiên nhỏ (0-5 điểm) để tạo sự đa dạng
  score += Math.random() * 5;
  
  return score;
}

