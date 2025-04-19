import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../config/db";
import { trackSelect } from "../utils/prisma-selects";
import { Playlist } from "@prisma/client";
import { PlaylistType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import SpotifyWebApi from 'spotify-web-api-node';

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
    }
  }[];
}

// Spotify API configuration
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

// Function to refresh Spotify access token
async function refreshSpotifyToken() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    console.log('[AI] Spotify API token refreshed');
    
    // Set token refresh timer (expires in 1 hour)
    setTimeout(refreshSpotifyToken, (data.body['expires_in'] - 60) * 1000);
  } catch (error) {
    console.error('[AI] Error refreshing Spotify token:', error);
  }
}

// Initialize Spotify token on startup if credentials are available
if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
  refreshSpotifyToken();
} else {
  console.warn('[AI] Spotify credentials not found, advanced audio analysis will be limited');
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
  basedOnDecade?: string | number;
  basedOnYearRange?: { start: number; end: number };
  basedOnSongLength?: number | null;
  basedOnReleaseTime?: string | null;
}

/**
 * Generates a personalized playlist for a user using the Gemini AI model
 * @param userId - The user ID to generate the playlist for
 * @param options - Options for playlist generation
 * @returns A Promise resolving to an array of track IDs
 */
export const generateAIPlaylist  = async (
  userId: string,
  options: PlaylistGenerationOptions = {}
): Promise<string[]> => {
  try {
    console.log(`[AI] Generating playlist for user ${userId} with options:`, options);

    // Số lượng bài hát cần tạo (mặc định là 10)
    const trackCount = options.trackCount || 10;

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

    // Nếu người dùng chưa nghe bài nào, tạo playlist mặc định
    if (userHistory.length === 0) {
      console.log(
        `[AI] User ${userId} has no listening history. Using default playlist.`
      );
      return generateDefaultPlaylistForNewUser(userId);
    }

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

    // Phân tích lịch sử nghe
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

    // Phân tích bài hát đã thích
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

    // Thiết lập điều kiện lọc cơ bản
    const whereClause: any = { isActive: true };
    let trackIds: string[] = [];

    // Lọc theo thời gian phát hành (mới, gần đây, cổ điển)
    if (options.basedOnReleaseTime) {
      const currentYear = new Date().getFullYear();
      
      // Chuyển đổi thành chuỗi để xử lý an toàn hơn
      const releaseTimeValue = String(options.basedOnReleaseTime).toLowerCase();
      
      // Trước tiên kiểm tra xem đó có phải là một năm cụ thể không
      const yearValue = Number(options.basedOnReleaseTime);
      if (!isNaN(yearValue) && yearValue > 1900 && yearValue <= currentYear) {
        // Đó là một năm hợp lệ - lọc các bài hát được phát hành trong năm này
        const startDate = new Date(yearValue, 0, 1); // Ngày 1 tháng 1 của năm chỉ định
        const endDate = new Date(yearValue, 11, 31, 23, 59, 59); // Ngày 31 tháng 12 của năm chỉ định
        
        whereClause.releaseDate = {
          gte: startDate,
          lte: endDate
        };
        console.log(`[AI] Filtering for tracks released in ${yearValue}`);
      } else {
        // Các tùy chọn thời gian phát hành dựa trên văn bản
        switch(releaseTimeValue) {
          case 'new':
          case 'newest':
          case 'recent':
            // Bài hát trong năm nay
            whereClause.releaseDate = {
              gte: new Date(currentYear, 0, 1)
            };
            console.log('[AI] Filtering for new tracks released this year');
            break;
          case 'last year':
            // Bài hát trong năm trước
            whereClause.releaseDate = {
              gte: new Date(currentYear - 1, 0, 1),
              lt: new Date(currentYear, 0, 1)
            };
            console.log('[AI] Filtering for tracks released last year');
            break;
          case 'recent years':
          case 'last 5 years':
            // Bài hát trong 5 năm qua
            whereClause.releaseDate = {
              gte: new Date(currentYear - 5, 0, 1)
            };
            console.log('[AI] Filtering for tracks released in the last 5 years');
            break;
          case 'decade':
          case 'last decade':
            // Bài hát trong thập kỷ qua
            whereClause.releaseDate = {
              gte: new Date(currentYear - 10, 0, 1)
            };
            console.log('[AI] Filtering for tracks released in the last decade');
            break;
          case 'classics':
          case 'classic':
          case 'old':
            // Bài hát hơn 20 năm tuổi
            whereClause.releaseDate = {
              lt: new Date(currentYear - 20, 0, 1)
            };
            console.log('[AI] Filtering for classic tracks (over 20 years old)');
            break;
          default:
            // Nếu tùy chọn không được nhận diện thì kiểm tra thập niên
            if (releaseTimeValue.includes('s') || releaseTimeValue.includes('\'s')) {
              // Có thể là định dạng "80s" hoặc "90's"
              const decade = parseInt(releaseTimeValue.replace(/[^0-9]/g, ''), 10);
              if (!isNaN(decade) && decade >= 0 && decade <= 90) {
                const fullDecade = decade < 100 ? 1900 + decade : decade;
                whereClause.releaseDate = {
                  gte: new Date(fullDecade, 0, 1),
                  lt: new Date(fullDecade + 10, 0, 1)
                };
                console.log(`[AI] Filtering for tracks from the ${decade}s`);
              } else {
                console.log(`[AI] Unrecognized decade format: ${releaseTimeValue}`);
              }
            } else {
              console.log(`[AI] Unknown release time filter: ${options.basedOnReleaseTime}`);
            }
        }
      }
    }

    // Lọc theo độ dài bài hát (ngắn, trung bình, dài)
    if (options.basedOnSongLength) {
      const lengthValue = Number(options.basedOnSongLength);
      
      if (!isNaN(lengthValue)) {
        // Nếu là giá trị số (tính bằng giây), sử dụng trực tiếp
        whereClause.duration = {
          lte: lengthValue
        };
        console.log(`[AI] Filtering for tracks with duration <= ${lengthValue} seconds`);
      } else {
        // Các danh mục độ dài dựa trên văn bản
        const songLengthValue = String(options.basedOnSongLength).toLowerCase();
        
        switch(songLengthValue) {
          case 'short':
            // Bài hát dưới 3 phút
            whereClause.duration = { lte: 180 };
            console.log('[AI] Filtering for short tracks (under 3 minutes)');
            break;
          case 'medium':
            // Bài hát từ 3-5 phút
            whereClause.duration = {
              gte: 180,
              lte: 300
            };
            console.log('[AI] Filtering for medium-length tracks (3-5 minutes)');
            break;
          case 'long':
            // Bài hát trên 5 phút
            whereClause.duration = { gte: 300 };
            console.log('[AI] Filtering for longer tracks (over 5 minutes)');
            break;
          default:
            // Không có bộ lọc độ dài nếu giá trị không được nhận dạng
            console.log(`[AI] Unknown song length filter: ${options.basedOnSongLength}`);
        }
      }
    }

    // Xử lý lọc theo thập kỷ và phạm vi năm
    if (options.basedOnDecade) {
      const decadeStart =
        typeof options.basedOnDecade === 'string'
          ? parseInt(options.basedOnDecade, 10)
          : options.basedOnDecade;
      whereClause.releaseDate = {
        gte: new Date(decadeStart, 0, 1),
        lt: new Date(decadeStart + 10, 0, 1),
      };
    } else if (options.basedOnYearRange) {
      const { start, end } = options.basedOnYearRange;
      whereClause.releaseDate = {
        gte: new Date(start, 0, 1),
        lt: new Date(end + 1, 0, 1),
      };
    }

    // Đọc tham số và quyết định tỷ lệ cho mỗi nguồn bài hát
    const hasArtistParam = options.basedOnArtist ? true : false;
    const hasGenreParam = options.basedOnGenre ? true : false;
    const hasMoodParam = options.basedOnMood ? true : false;
    const hasSongLengthParam = options.basedOnSongLength ? true : false;
    const hasReleaseTimeParam = options.basedOnReleaseTime ? true : false;

    // Thiết lập tỷ lệ mặc định cho các nguồn bài hát
    let artistRatio = 0.5;  // Tỷ lệ bài hát từ nghệ sĩ ưa thích
    let genreRatio = 0.3;   // Tỷ lệ bài hát từ thể loại ưa thích
    let popularRatio = 0.2; // Tỷ lệ bài hát phổ biến

    // Điều chỉnh tỷ lệ dựa trên tham số được cung cấp
    // Case 1: Only basedOnMood
    if (hasMoodParam && !hasGenreParam && !hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.4;
      genreRatio = 0.4;
      popularRatio = 0.2;
    }
    // Case 2: basedOnMood and basedOnGenre
    else if (hasMoodParam && hasGenreParam && !hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.3;
      genreRatio = 0.5;
      popularRatio = 0.2;
    }
    // Case 3: basedOnMood and basedOnArtist
    else if (hasMoodParam && !hasGenreParam && hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.6;
      genreRatio = 0.3;
      popularRatio = 0.1;
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
      artistRatio = 0.3;
      genreRatio = 0.6;
      popularRatio = 0.1;
    }
    // Case 10: basedOnGenre and basedOnArtist
    else if (!hasMoodParam && hasGenreParam && hasArtistParam && !hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.6;
      genreRatio = 0.3;
      popularRatio = 0.1;
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
      artistRatio = 0.7;
      genreRatio = 0.2;
      popularRatio = 0.1;
    }
    // Case 14: basedOnArtist and basedOnSongLength
    else if (!hasMoodParam && !hasGenreParam && hasArtistParam && hasSongLengthParam && !hasReleaseTimeParam) {
      artistRatio = 0.6;
      genreRatio = 0.3;
      popularRatio = 0.1;
    }
    // Case 15: basedOnArtist, basedOnSongLength, basedOnReleaseTime
    else if (!hasMoodParam && !hasGenreParam && hasArtistParam && hasSongLengthParam && hasReleaseTimeParam) {
      artistRatio = 0.6;
      genreRatio = 0.2;
      popularRatio = 0.2;
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
      artistRatio = 0.4;
      genreRatio = 0.4;
      popularRatio = 0.2;
    }

    // Tính toán số lượng bài hát cho mỗi nguồn
    const artistTrackCount = Math.ceil(trackCount * artistRatio);
    const genreTrackCount = Math.ceil(trackCount * genreRatio);
    const popularTrackCount = Math.max(0, trackCount - artistTrackCount - genreTrackCount);

    console.log(`[AI] Allocation: Artist=${artistTrackCount}, Genre=${genreTrackCount}, Popular=${popularTrackCount}`);

    // Biến để lưu trữ tất cả các bài hát của nghệ sĩ được tìm thấy
    let artistTracks: any[] = [];

    // 1. Lấy bài hát từ nghệ sĩ ưa thích
    if (preferredArtistIds.size > 0 && artistTrackCount > 0) {
      // Lọc theo tâm trạng nếu được chỉ định
      const moodFilter = options.basedOnMood
        ? await getMoodFilter(options.basedOnMood)
        : {};

      // Lọc theo nghệ sĩ được chỉ định (nếu có)
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

      // Kết hợp các điều kiện lọc
      const artistTracksQuery = {
        where: {
          isActive: true,
          ...artistFilter,
          // Lọc theo thể loại nếu chỉ định cả nghệ sĩ và thể loại
          ...(selectedGenreId && options.basedOnArtist
            ? {
                genres: {
                  some: {
                    genreId: selectedGenreId,
                  },
                },
              }
            : {}),
          // Kết hợp với các điều kiện lọc khác
          ...whereClause,
          ...moodFilter,
        },
        orderBy: [
          // Ưu tiên bài hát mới hơn và phổ biến hơn
          { createdAt: Prisma.SortOrder.desc },
          { playCount: Prisma.SortOrder.desc },
        ],
        // Lấy nhiều hơn để có thể sắp xếp lại sau
        take: artistTrackCount * 2,
      };

      // Thực hiện truy vấn và lấy bài hát từ nghệ sĩ
      artistTracks = await prisma.track.findMany(artistTracksQuery);

      // Tính điểm cho mỗi bài hát dựa trên mức độ ưa thích nghệ sĩ
      const scoredArtistTracks = artistTracks.map(track => {
        return {
          ...track,
          score: artistPreferenceScore[track.artistId] || 0
        };
      }).sort((a, b) => b.score - a.score);

      // Chọn bài hát dựa trên điểm cao nhất
      const selectedArtistTracks = scoredArtistTracks.slice(0, artistTrackCount);
      trackIds = selectedArtistTracks.map(track => track.id);
    }

    // 2. Lấy bài hát từ thể loại ưa thích
    if (preferredGenreIds.size > 0 && genreTrackCount > 0) {
      // Xác định thể loại mục tiêu - sử dụng thể loại đã chỉ định hoặc thể loại ưa thích hàng đầu
      const targetGenreIds = selectedGenreId
        ? [selectedGenreId]
        : sortedPreferredGenres.slice(0, 3);

      // Lọc theo tâm trạng nếu được chỉ định
      const moodFilter = options.basedOnMood
        ? await getMoodFilter(options.basedOnMood)
        : {};

      // Xây dựng truy vấn cho bài hát dựa trên thể loại
      const genreTracksQuery = {
        where: {
          isActive: true,
          // Loại trừ các bài hát đã được chọn
          id: { notIn: trackIds },
          // Lọc theo thể loại
          genres: {
            some: {
              genreId: { in: targetGenreIds },
            },
          },
          // Kết hợp với các điều kiện lọc khác
          ...whereClause,
          ...moodFilter,
          // Xử lý các trường hợp đặc biệt khi kết hợp thể loại và nghệ sĩ
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
              // Nếu chỉ có thể loại và có bài hát từ nghệ sĩ, loại trừ các nghệ sĩ đã có bài hát
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
        take: genreTrackCount * 2, // Lấy nhiều hơn để có thể lọc và sắp xếp tốt hơn
      };

      // Thực hiện truy vấn để lấy bài hát dựa trên thể loại
      const genreTracks = await prisma.track.findMany(genreTracksQuery);
      
      // Tính điểm cho các bài hát dựa trên thể loại và mức độ phù hợp
      const scoredGenreTracks = genreTracks.map(track => {
        // Tính điểm phù hợp thể loại dựa trên mức độ phù hợp với
        // sở thích thể loại của người dùng
        let genreRelevanceScore = 0;
        (track as TrackWithGenres).genres?.forEach((genreRel: { genreId: string }) => {
          const genreIndex = sortedPreferredGenres.indexOf(genreRel.genreId);
          if (genreIndex !== -1) {
            // Điểm cao hơn cho các thể loại được ưa thích hơn
            genreRelevanceScore += Math.max(0.2, 1 - (genreIndex / sortedPreferredGenres.length));
          }
        });
        
        // Tính điểm phổ biến và mới nhất
        const popularityScore = Math.min(1, (track.playCount || 0) / 1000); 
        const trackAgeDays = Math.max(1, 
          Math.floor((Date.now() - new Date(track.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        );
        const recencyScore = Math.exp(-trackAgeDays / 365);
        
        // Tính điểm cuối cùng với trọng số cân bằng
        const finalScore = (genreRelevanceScore * 0.5) + (popularityScore * 0.3) + (recencyScore * 0.2);
        
        return {
          ...track,
          score: finalScore
        };
      }).sort((a, b) => b.score - a.score);
      
      // Chọn các bài hát có điểm cao nhất
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
          // Loại bỏ các bài hát đã chọn
          id: { notIn: trackIds },
          // Kết hợp với các điều kiện lọc khác
          ...whereClause,
          ...moodFilter,
        },
        orderBy: { playCount: Prisma.SortOrder.desc },
        take: remainingNeeded,
      };

      // Thực hiện truy vấn
      const popularTracks = await prisma.track.findMany(popularTracksQuery);
      trackIds = [...trackIds, ...popularTracks.map(t => t.id)];
    }

    // Cắt giảm danh sách nếu có quá nhiều bài hát
    if (trackIds.length > trackCount) {
      trackIds = trackIds.slice(0, trackCount);
    }

    console.log(`[AI] Successfully generated playlist with ${trackIds.length} tracks`);
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
// Thêm hàm helper để lọc theo mood
/**
 * Tạo điều kiện lọc Prisma dựa trên tâm trạng (mood)
 * @param mood - Tâm trạng cần lọc
 * @returns Object điều kiện lọc Prisma
 */
async function getMoodFilter(mood: string): Promise<any> {
  // Enhanced mood to genre mapping with more nuanced categorizations
  const moodToGenreMap: Record<string, string[]> = {
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

  // Activities associated with specific genres
  const activityToGenreMap: Record<string, string[]> = {
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

  // Audio characteristics associated with different moods for more precise filtering
  // Refined based on Spotify audio features research
  const moodToAudioCharacteristics: Record<string, any> = {
    energetic: { tempo: { gte: 120 }, energy: { gte: 0.7 }, valence: { gte: 0.4 } },
    calm: { tempo: { lte: 100 }, energy: { lte: 0.5 }, acousticness: { gte: 0.5 } },
    happy: { valence: { gte: 0.6 }, energy: { gte: 0.4 } },
    sad: { valence: { lte: 0.4 }, tempo: { lte: 110 } },
    intense: { energy: { gte: 0.8 }, loudness: { gte: -8 }, tempo: { gte: 100 } },
    relaxed: { tempo: { lte: 95 }, energy: { lte: 0.4 }, acousticness: { gte: 0.5 }, instrumentalness: { gte: 0.2 } },
    focused: { instrumentalness: { gte: 0.5 }, speechiness: { lte: 0.1 }, energy: { between: [0.3, 0.7] } },
    party: { danceability: { gte: 0.7 }, energy: { gte: 0.6 }, tempo: { gte: 100 } },
    nostalgic: { acousticness: { gte: 0.3 } }, // Mostly genre-based
    romantic: { valence: { between: [0.3, 0.7] }, tempo: { lte: 110 }, acousticness: { gte: 0.2 } },
    melancholic: { valence: { lte: 0.3 }, energy: { lte: 0.6 }, tempo: { lte: 100 } },
    uplifting: { valence: { gte: 0.6 }, energy: { gte: 0.5 } },
    dreamy: { instrumentalness: { gte: 0.3 }, tempo: { lte: 110 }, acousticness: { gte: 0.3 } },
    dramatic: { energy: { gte: 0.6 }, loudness: { gte: -10 }, tempo: { between: [70, 130] } },
  };

  // Activities associated with specific audio characteristics
  const activityToAudioCharacteristics: Record<string, any> = {
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

  // Chuẩn hóa mood (chuyển thành lowercase và xử lý khoảng trắng)
  const normalizedInput = mood.toLowerCase().trim();
  
  console.log(`[AI] Processing mood/activity: "${normalizedInput}"`);
  
  // Danh sách đầy đủ để tìm kiếm gần đúng
  const allMoods = Object.keys(moodToGenreMap);
  const allActivities = Object.keys(activityToAudioCharacteristics);
  
  // Tìm trong danh sách mood và activity
  let matchedTerm = '';
  
  // Kiểm tra khớp chính xác trước
  if (moodToGenreMap[normalizedInput]) {
    matchedTerm = normalizedInput;
    console.log(`[AI] Exact mood match found: ${matchedTerm}`);
  } else if (activityToAudioCharacteristics[normalizedInput] || activityToGenreMap[normalizedInput]) {
    matchedTerm = normalizedInput;
    console.log(`[AI] Exact activity match found: ${matchedTerm}`);
  } else {
    // Tìm khớp một phần nếu không có khớp chính xác
    // Kiểm tra xem chuỗi nhập có chứa bất kỳ mood nào không
    const possibleMoods = allMoods.filter(m => 
      normalizedInput.includes(m) || m.includes(normalizedInput)
    );
    
    if (possibleMoods.length > 0) {
      matchedTerm = possibleMoods[0]; // Lấy mood đầu tiên khớp
      console.log(`[AI] Similar mood match found: ${matchedTerm} for input "${normalizedInput}"`);
    } else {
      // Kiểm tra activity tương tự
      const possibleActivities = allActivities.filter(a => 
        normalizedInput.includes(a) || a.includes(normalizedInput)
      );
      
      if (possibleActivities.length > 0) {
        matchedTerm = possibleActivities[0];
        console.log(`[AI] Similar activity match found: ${matchedTerm} for input "${normalizedInput}"`);
      } else {
        console.log(`[AI] No match found for: "${normalizedInput}"`);
        return {}; // Không tìm thấy khớp nào
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
    console.log(`[AI] Using mood: ${matchedTerm} with ${relevantGenres.length} genres`);
  } else if (activityToGenreMap[matchedTerm]) {
    // Đây là activity có thể loại
    relevantGenres = activityToGenreMap[matchedTerm] || [];
    audioCharacteristics = activityToAudioCharacteristics[matchedTerm] || {};
    console.log(`[AI] Using activity: ${matchedTerm} with ${relevantGenres.length} genres`);
  } else if (activityToAudioCharacteristics[matchedTerm]) {
    // Đây là activity không có thể loại
    audioCharacteristics = activityToAudioCharacteristics[matchedTerm];
    console.log(`[AI] Using activity: ${matchedTerm} with audio characteristics only`);
  } else {
    // Không nên xảy ra nếu logic ở trên hoạt động đúng
    console.log(`[AI] Logic error - matched term ${matchedTerm} not found in maps`);
    return {};
  }

  // Build a more comprehensive filter combining both genre and audio characteristics
  const filter: any = {};
  
  // Tạo danh sách các điều kiện lọc
  const genreCondition = relevantGenres.length > 0 ? await createGenreCondition(relevantGenres) : null;
  const audioCondition = Object.keys(audioCharacteristics).length > 0 ? createAudioCondition(audioCharacteristics) : null;
  
  console.log(`[AI] Filter conditions: genres=${!!genreCondition}, audio=${!!audioCondition}`);
  
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
  console.log("[AI] Audio characteristics filtering is not supported directly in database queries");
  return null;
}

/**
 * Lấy audio features từ Spotify API cho một bài hát
 * @param trackName Tên bài hát
 * @param artistName Tên nghệ sĩ
 * @returns Object chứa audio features hoặc null nếu không tìm thấy
 */
async function getSpotifyAudioFeatures(trackName: string, artistName: string): Promise<any | null> {
  try {
    if (!spotifyApi.getAccessToken()) {
      await refreshSpotifyToken();
    }
    
    // Tìm kiếm bài hát trên Spotify
    const searchResult = await spotifyApi.searchTracks(`track:${trackName} artist:${artistName}`, { limit: 1 });
    
    if (searchResult.body.tracks && searchResult.body.tracks.items.length > 0) {
      const trackId = searchResult.body.tracks.items[0].id;
      
      // Lấy audio features
      const featuresResult = await spotifyApi.getAudioFeaturesForTrack(trackId);
      
      if (featuresResult.body) {
        console.log(`[AI] Found Spotify audio features for "${trackName}" by ${artistName}`);
        return featuresResult.body;
      }
    }
    
    console.log(`[AI] No Spotify results found for "${trackName}" by ${artistName}`);
    return null;
  } catch (error) {
    console.error('[AI] Error getting Spotify audio features:', error);
    return null;
  }
}

/**
 * Phân tích mood của một bài hát dựa trên audio features từ Spotify
 * @param audioFeatures Audio features từ Spotify API
 * @returns Array of mood tags sorted by relevance
 */
function analyzeMood(audioFeatures: any): string[] {
  // Mapping dựa trên valence (positivity) và energy
  const moods: Record<string, number> = {};
  
  // Valence mapping (positivity)
  if (audioFeatures.valence > 0.8) {
    moods.happy = moods.happy || 0 + 0.8;
    moods.energetic = moods.energetic || 0 + 0.4;
  } else if (audioFeatures.valence > 0.6) {
    moods.happy = moods.happy || 0 + 0.6;
    moods.uplifting = moods.uplifting || 0 + 0.5;
  } else if (audioFeatures.valence < 0.3) {
    moods.sad = moods.sad || 0 + 0.7;
    moods.melancholic = moods.melancholic || 0 + 0.6;
  } else if (audioFeatures.valence < 0.4) {
    moods.sad = moods.sad || 0 + 0.5;
    moods.nostalgic = moods.nostalgic || 0 + 0.4;
  }
  
  // Energy mapping
  if (audioFeatures.energy > 0.8) {
    moods.energetic = moods.energetic || 0 + 0.9;
    moods.intense = moods.intense || 0 + 0.8;
    moods.party = moods.party || 0 + 0.7;
  } else if (audioFeatures.energy > 0.6) {
    moods.energetic = moods.energetic || 0 + 0.7;
    moods.uplifting = moods.uplifting || 0 + 0.5;
  } else if (audioFeatures.energy < 0.4) {
    moods.calm = moods.calm || 0 + 0.8;
    moods.relaxed = moods.relaxed || 0 + 0.7;
  } else if (audioFeatures.energy < 0.3) {
    moods.calm = moods.calm || 0 + 0.9;
    moods.relaxed = moods.relaxed || 0 + 0.8;
    moods.dreamy = moods.dreamy || 0 + 0.6;
  }
  
  // Acousticness mapping
  if (audioFeatures.acousticness > 0.7) {
    moods.calm = moods.calm || 0 + 0.6;
    moods.romantic = moods.romantic || 0 + 0.5;
    moods.nostalgic = moods.nostalgic || 0 + 0.4;
  }
  
  // Danceability mapping
  if (audioFeatures.danceability > 0.7) {
    moods.party = moods.party || 0 + 0.8;
    moods.energetic = moods.energetic || 0 + 0.6;
    moods.happy = moods.happy || 0 + 0.5;
  } else if (audioFeatures.danceability > 0.5) {
    moods.uplifting = moods.uplifting || 0 + 0.5;
  }
  
  // Instrumentalness mapping
  if (audioFeatures.instrumentalness > 0.7) {
    moods.focused = moods.focused || 0 + 0.8;
    moods.dreamy = moods.dreamy || 0 + 0.6;
    moods.calm = moods.calm || 0 + 0.5;
  } else if (audioFeatures.instrumentalness > 0.4) {
    moods.focused = moods.focused || 0 + 0.6;
  }
  
  // Tempo mapping
  if (audioFeatures.tempo > 140) {
    moods.energetic = moods.energetic || 0 + 0.7;
    moods.intense = moods.intense || 0 + 0.6;
    moods.party = moods.party || 0 + 0.5;
  } else if (audioFeatures.tempo > 120) {
    moods.energetic = moods.energetic || 0 + 0.6;
    moods.uplifting = moods.uplifting || 0 + 0.5;
  } else if (audioFeatures.tempo < 80) {
    moods.calm = moods.calm || 0 + 0.7;
    moods.relaxed = moods.relaxed || 0 + 0.6;
    moods.dreamy = moods.dreamy || 0 + 0.5;
  } else if (audioFeatures.tempo < 100) {
    moods.relaxed = moods.relaxed || 0 + 0.5;
  }
  
  // Loudness mapping
  if (audioFeatures.loudness > -5) {
    moods.intense = moods.intense || 0 + 0.6;
    moods.energetic = moods.energetic || 0 + 0.5;
  } else if (audioFeatures.loudness < -10) {
    moods.calm = moods.calm || 0 + 0.5;
    moods.intimate = moods.intimate || 0 + 0.7;
  }
  
  // Mode mapping (major/minor)
  if (audioFeatures.mode === 1) { // Major key
    moods.happy = moods.happy || 0 + 0.5;
    moods.uplifting = moods.uplifting || 0 + 0.4;
  } else { // Minor key
    moods.melancholic = moods.melancholic || 0 + 0.5;
    moods.dramatic = moods.dramatic || 0 + 0.4;
  }
  
  // Complex combinations
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
  } else if (audioFeatures.speechiness < 0.1 && audioFeatures.energy > 0.3 && audioFeatures.energy < 0.6) {
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
  if (audioFeatures.valence > 0.5 && audioFeatures.energy > 0.4 && audioFeatures.energy < 0.7) {
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
  if (audioFeatures.tempo < 90 && audioFeatures.energy < 0.5 && audioFeatures.instrumentalness > 0.4) {
    activities.yoga = 0.9;
    activities.stretching = 0.8;
  }
  
  // Creative work
  if (audioFeatures.energy > 0.4 && audioFeatures.energy < 0.7 && audioFeatures.instrumentalness > 0.3) {
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
