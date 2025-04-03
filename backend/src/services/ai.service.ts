import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../config/db';
import { trackSelect } from '../utils/prisma-selects';
import { Playlist } from '@prisma/client';
import { PlaylistType } from '@prisma/client';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Sử dụng model từ biến môi trường, mặc định là gemini-2.0-flash nếu không được cấu hình
const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const model = genAI.getGenerativeModel({
  model: modelName,
  systemInstruction:
    "You are an expert music curator specializing in personalization. Your primary goal is to create highly personalized playlists that closely match each user's demonstrated preferences. PRIORITIZE tracks from artists the user has already listened to or liked. Only include tracks from other artists if they are extremely similar in style and genre to the user's favorites. Analyze the provided listening history and liked tracks carefully, identifying patterns in genres, artists, and moods. Return ONLY a valid JSON array of track IDs, without any duplicates or explanations. The tracks should strongly reflect the user's taste, with at least 70% being from artists they've shown interest in.",
});
console.log(`[AI] Using Gemini model: ${modelName}`);

interface PlaylistGenerationOptions {
  name?: string;
  description?: string;
  trackCount?: number;
  basedOnMood?: string;
  basedOnGenre?: string;
  basedOnArtist?: string;
  coverUrl?: string;
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
        type: 'PLAY',
      },
      include: {
        track: {
          select: trackSelect,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 30, // Tăng từ 20 lên 30 để có lịch sử đầy đủ hơn
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
        createdAt: 'desc',
      },
      take: 30, // Tăng từ 20 lên 30 để có danh sách thích đầy đủ hơn
    });

    // Trích xuất nghệ sĩ và thể loại mà người dùng đã thể hiện sự quan tâm
    const preferredArtistIds = new Set<string>();
    const preferredGenreIds = new Set<string>();

    // Đếm số lần xuất hiện của từng nghệ sĩ trong lịch sử để xác định mức độ ưa thích
    const artistPlayCounts: Record<string, number> = {};
    const artistLikeCounts: Record<string, number> = {};

    // Xử lý lịch sử để tìm nghệ sĩ và thể loại được ưa thích
    userHistory.forEach((history) => {
      if (history.track?.artistId) {
        preferredArtistIds.add(history.track.artistId);

        // Đếm số lần nghe mỗi nghệ sĩ
        const artistId = history.track.artistId;
        artistPlayCounts[artistId] =
          (artistPlayCounts[artistId] || 0) + (history.playCount || 1);
      }

      history.track?.genres.forEach((genreRel) => {
        preferredGenreIds.add(genreRel.genre.id);
      });
    });

    // Xử lý bài hát đã thích để tìm nghệ sĩ và thể loại được ưa thích
    userLikedTracks.forEach((like) => {
      if (like.track?.artistId) {
        preferredArtistIds.add(like.track.artistId);

        // Đếm số lần thích mỗi nghệ sĩ
        const artistId = like.track.artistId;
        artistLikeCounts[artistId] = (artistLikeCounts[artistId] || 0) + 1;
      }

      like.track?.genres.forEach((genreRel) => {
        preferredGenreIds.add(genreRel.genre.id);
      });
    });

    // Tính tổng điểm ưa thích cho mỗi nghệ sĩ (nghe + thích)
    const artistPreferenceScore: Record<string, number> = {};

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
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });

      if (artistByName) {
        // Đảm bảo nghệ sĩ được chỉ định luôn ở đầu danh sách ưu tiên
        preferredArtistIds.add(artistByName.id);
        sortedPreferredArtists.unshift(artistByName.id);

        console.log(
          `[AI] Adding specified artist to preferences: ${options.basedOnArtist}`
        );
      }
    }

    // Nếu có chỉ định tùy chọn basedOnGenre, ưu tiên thể loại đó
    if (options.basedOnGenre) {
      const genreByName = await prisma.genre.findFirst({
        where: {
          name: {
            contains: options.basedOnGenre,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      });

      if (genreByName) {
        preferredGenreIds.add(genreByName.id);
        console.log(
          `[AI] Adding specified genre to preferences: ${options.basedOnGenre}`
        );
      }
    }

    // Tạo một truy vấn mục tiêu hơn cho các bài hát có sẵn
    const whereClause: any = { isActive: true };

    // Chỉ lọc theo các điều kiện này nếu chúng ta có tùy chọn (nếu không, trở lại hành vi ban đầu)
    if (preferredArtistIds.size > 0 || preferredGenreIds.size > 0) {
      whereClause.OR = [];

      // Ưu tiên bài hát từ nghệ sĩ ưa thích
      if (preferredArtistIds.size > 0) {
        whereClause.OR.push({
          artistId: { in: Array.from(preferredArtistIds) },
        });
      }

      // Cũng bao gồm bài hát với thể loại ưa thích
      if (preferredGenreIds.size > 0) {
        whereClause.OR.push({
          genres: {
            some: {
              genreId: { in: Array.from(preferredGenreIds) },
            },
          },
        });
      }
    }

    // Áp dụng bộ lọc thể loại và nghệ sĩ từ tùy chọn nếu được cung cấp
    if (options.basedOnGenre && !preferredGenreIds.size) {
      whereClause.genres = {
        some: {
          genre: {
            name: {
              contains: options.basedOnGenre,
              mode: 'insensitive',
            },
          },
        },
      };
    }

    if (options.basedOnArtist && !preferredArtistIds.size) {
      whereClause.artist = {
        artistName: {
          contains: options.basedOnArtist,
          mode: 'insensitive',
        },
      };
    }

    // Truy vấn tất cả bài hát, ưu tiên những bài hát khớp với sở thích của người dùng
    const availableTracks = await prisma.track.findMany({
      where: whereClause,
      select: trackSelect,
      orderBy: [
        // Ưu tiên bài hát từ nghệ sĩ người dùng đã nghe
        {
          artist: {
            artistName: preferredArtistIds.size > 0 ? 'asc' : undefined,
          },
        },
        // Sau đó là theo độ phổ biến
        { playCount: 'desc' },
      ],
      take: 150, // Tăng số lượng bài hát tiềm năng nhưng sẽ ưu tiên nghệ sĩ ưa thích
    });

    console.log(
      `[AI] Found ${availableTracks.length} potential tracks for recommendation`
    );

    // Trích xuất tên nghệ sĩ để tạo ngữ cảnh tốt hơn
    const preferredArtistNames = new Set<string>();
    userHistory.forEach((h) => {
      if (h.track?.artist?.artistName) {
        preferredArtistNames.add(h.track.artist.artistName);
      }
    });
    userLikedTracks.forEach((l) => {
      if (l.track?.artist?.artistName) {
        preferredArtistNames.add(l.track.artist.artistName);
      }
    });

    // Chuẩn bị ngữ cảnh cho Gemini AI với nhấn mạnh rõ ràng hơn vào sở thích của người dùng
    const context = {
      user: {
        id: userId,
        preferredArtists: Array.from(preferredArtistNames),
        listeningHistory: userHistory.map((h) => ({
          trackId: h.track?.id,
          trackName: h.track?.title,
          artistName: h.track?.artist?.artistName,
          playCount: h.playCount || 1,
          genres: h.track?.genres.map((g) => g.genre.name),
        })),
        likedTracks: userLikedTracks.map((lt) => ({
          trackId: lt.track?.id,
          trackName: lt.track?.title,
          artistName: lt.track?.artist?.artistName,
          genres: lt.track?.genres.map((g) => g.genre.name),
        })),
      },
      availableTracks: availableTracks.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist?.artistName,
        album: track.album?.title,
        duration: track.duration,
        genres: track.genres.map((g) => g.genre.name),
        playCount: track.playCount,
        releaseDate: track.releaseDate,
      })),
      preferences: {
        trackCount,
        mood: options.basedOnMood,
        genre: options.basedOnGenre,
        artist: options.basedOnArtist,
      },
    };

    // Tạo một lời nhắc cụ thể hơn nhấn mạnh việc duy trì trong sở thích của người dùng
    const promptText = `Tạo một danh sách phát cá nhân hóa cho người dùng này tập trung chủ yếu vào sở thích đã thể hiện của họ.

Thông tin người dùng:
- Nghệ sĩ ưa thích: ${
      Array.from(preferredArtistNames).join(', ') || 'Không có chỉ định'
    }
- Lịch sử nghe gần đây: ${userHistory
      .map((h) => h.track?.title || '')
      .filter(Boolean)
      .join(', ')}
- Bài hát đã thích: ${userLikedTracks
      .map((l) => l.track?.title || '')
      .filter(Boolean)
      .join(', ')}

Dữ liệu ngữ cảnh đầy đủ:
${JSON.stringify(context, null, 2)}

Hướng dẫn quan trọng:
1. PHẢI ưu tiên mạnh mẽ các bài hát từ nghệ sĩ mà người dùng đã nghe hoặc thích (${Array.from(
      preferredArtistNames
    ).join(', ')}).
2. Ít nhất 70% bài hát phải đến từ các nghệ sĩ mà người dùng đã thể hiện sự quan tâm.
3. Chỉ bao gồm bài hát từ nghệ sĩ mà người dùng chưa thể hiện sự quan tâm nếu chúng rất giống với sở thích của người dùng.
4. Xem xét sở thích của người dùng về tâm trạng (${
      options.basedOnMood || 'bất kỳ'
    }), thể loại (${options.basedOnGenre || 'bất kỳ'}), và nghệ sĩ (${
      options.basedOnArtist || 'dựa trên lịch sử'
    }).
5. Chọn chính xác ${trackCount} bài hát và chỉ trả về mảng ID bài hát JSON hợp lệ.`;

    console.log(`[AI] Gửi lời nhắc cải tiến đến model Gemini ${modelName}`);

    // Gọi Gemini AI với lời nhắc đã chuẩn bị
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.3, // Giảm từ 0.2 để có kết quả xác định hơn một chút
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    // Xử lý phản hồi
    const response = result.response;
    const responseText = response.text();

    // Phân tích phản hồi JSON để lấy ID bài hát
    let trackIds: string[] = [];
    try {
      // Làm sạch phản hồi để đảm bảo nó là JSON hợp lệ
      const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
      trackIds = JSON.parse(cleanedResponse);

      // Xác minh ID bài hát tồn tại trong cơ sở dữ liệu
      const validTrackIds = await prisma.track.findMany({
        where: {
          id: { in: trackIds },
          isActive: true,
        },
        select: { id: true, artistId: true },
      });

      trackIds = validTrackIds.map((t) => t.id);

      // Kiểm tra xem đã đạt được tỷ lệ nghệ sĩ ưa thích mong muốn chưa
      if (preferredArtistIds.size > 0) {
        const tracksFromPreferredArtists = validTrackIds.filter((t) =>
          preferredArtistIds.has(t.artistId)
        ).length;

        const preferredArtistPercentage =
          (tracksFromPreferredArtists / trackIds.length) * 100;

        console.log(
          `[AI] Initial tracks from preferred artists: ${preferredArtistPercentage.toFixed(
            1
          )}%`
        );

        // Nếu chưa đạt được tỷ lệ 70%, cần điều chỉnh
        if (preferredArtistPercentage < 70 && trackIds.length > 0) {
          // Chúng ta sẽ điều chỉnh danh sách trong bước dự phòng
          console.log(
            `[AI] Need to increase preferred artist percentage (currently ${preferredArtistPercentage.toFixed(
              1
            )}%)`
          );
        }
      }
    } catch (error) {
      console.error('[AI] Error parsing Gemini response:', error);
      console.error('[AI] Raw response:', responseText);
      throw new Error('Failed to parse AI-generated playlist recommendations');
    }

    // Nếu không có đủ bài hát hoặc không có bài hát nào, hãy chuyển sang cách tiếp cận có mục tiêu hơn
    if (trackIds.length < trackCount || preferredArtistIds.size > 0) {
      console.log(
        `[AI] Adjusting playlist to ensure at least 70% from preferred artists`
      );

      // Trước hết, hãy lấy danh sách hiện tại của các bài hát và nghệ sĩ của chúng
      const currentTracks = await prisma.track.findMany({
        where: {
          id: { in: trackIds },
          isActive: true,
        },
        select: {
          id: true,
          artistId: true,
          title: true,
          artist: {
            select: { artistName: true },
          },
        },
      });

      // Tách thành bài hát từ nghệ sĩ ưa thích và không ưa thích
      const tracksFromPreferredArtists = currentTracks.filter((t) =>
        preferredArtistIds.has(t.artistId)
      );

      const tracksFromOtherArtists = currentTracks.filter(
        (t) => !preferredArtistIds.has(t.artistId)
      );

      const preferredArtistPercentage =
        (tracksFromPreferredArtists.length / (currentTracks.length || 1)) * 100;

      // Nếu chưa đạt được tỷ lệ 70% và chúng ta có nghệ sĩ ưa thích, điều chỉnh danh sách
      if (preferredArtistPercentage < 70 && preferredArtistIds.size > 0) {
        // Tính số lượng bài hát cần thêm từ nghệ sĩ ưa thích
        const desiredPreferredTracks = Math.ceil(trackCount * 0.7);
        const additionalPreferredTracksNeeded = Math.max(
          0,
          desiredPreferredTracks - tracksFromPreferredArtists.length
        );

        console.log(
          `[AI] Need ${additionalPreferredTracksNeeded} more tracks from preferred artists to reach 70%`
        );

        // Ưu tiên lấy bài hát từ nghệ sĩ được nghe nhiều nhất trước (dựa trên sortedPreferredArtists)
        if (additionalPreferredTracksNeeded > 0) {
          const additionalPreferredTracks = await prisma.track.findMany({
            where: {
              artistId: { in: sortedPreferredArtists },
              isActive: true,
              id: { notIn: trackIds }, // Tránh trùng lặp
            },
            orderBy: { playCount: 'desc' },
            take: additionalPreferredTracksNeeded * 2, // Lấy nhiều hơn để có thể lọc
            select: { id: true, artistId: true },
          });

          // Lọc để có được đúng số lượng cần thiết, ưu tiên các nghệ sĩ theo thứ tự ưa thích
          const additionalTrackIds = additionalPreferredTracks
            .sort((a, b) => {
              const aIndex = sortedPreferredArtists.indexOf(a.artistId);
              const bIndex = sortedPreferredArtists.indexOf(b.artistId);
              return aIndex - bIndex;
            })
            .slice(0, additionalPreferredTracksNeeded)
            .map((t) => t.id);

          // Nếu chúng ta vẫn chưa đạt được tổng số bài hát yêu cầu
          const remainingTracksNeeded = Math.max(
            0,
            trackCount - (trackIds.length + additionalTrackIds.length)
          );

          // Kết hợp tất cả các bài hát, ưu tiên nghệ sĩ ưa thích
          const finalTrackIds = [
            ...tracksFromPreferredArtists.map((t) => t.id), // Bài hát từ nghệ sĩ ưa thích (đã chọn)
            ...additionalTrackIds, // Bài hát bổ sung từ nghệ sĩ ưa thích
            ...tracksFromOtherArtists.map((t) => t.id), // Bài hát từ nghệ sĩ khác (đã chọn)
          ];

          trackIds = finalTrackIds;

          // Thêm bài hát phổ biến nếu cần
          if (remainingTracksNeeded > 0) {
            const fallbackTracks = await prisma.track.findMany({
              where: {
                isActive: true,
                id: { notIn: trackIds }, // Tránh trùng lặp
              },
              orderBy: { playCount: 'desc' },
              take: remainingTracksNeeded,
              select: { id: true },
            });

            trackIds = [...trackIds, ...fallbackTracks.map((t) => t.id)];
          }

          // Tính tỷ lệ cuối cùng để ghi lại
          const finalPreferredTracks = await prisma.track.findMany({
            where: {
              id: { in: trackIds },
              artistId: { in: Array.from(preferredArtistIds) },
            },
            select: { id: true },
          });

          const finalPercentage =
            (finalPreferredTracks.length / trackIds.length) * 100;
          console.log(
            `[AI] Final preferred artist percentage: ${finalPercentage.toFixed(
              1
            )}%`
          );
        }
      }
    }

    // Đảm bảo chúng ta có số lượng bài hát yêu cầu nếu có thể
    if (trackIds.length > trackCount) {
      trackIds = trackIds.slice(0, trackCount);
    } else if (trackIds.length < trackCount) {
      // Nếu vẫn thiếu, lấy thêm các bài hát phổ biến
      const additionalTracks = await prisma.track.findMany({
        where: {
          isActive: true,
          id: { notIn: trackIds },
        },
        orderBy: { playCount: 'desc' },
        take: trackCount - trackIds.length,
        select: { id: true },
      });

      trackIds = [...trackIds, ...additionalTracks.map((t) => t.id)];
    }

    console.log(
      `[AI] Successfully generated playlist with ${trackIds.length} tracks`
    );
    return trackIds;
  } catch (error) {
    console.error('[AI] Error generating playlist:', error);
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
    const playlistName = options.name || 'Soundwave Discoveries';

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
      `Curated selection featuring ${sortedArtistNames.slice(0, 3).join(', ')}${
        sortedArtistNames.length > 3 ? ' and more' : ''
      }. Refreshed regularly based on your listening patterns.`;

    // Default cover URL for AI-generated playlists
    const defaultCoverUrl =
      'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png';

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
      coverUrl: options.coverUrl || defaultCoverUrl, // Use cover from options or default
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
          privacy: 'PRIVATE', // User's personalized playlists are private
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
    console.error('[AI] Error creating/updating AI-generated playlist:', error);
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
        playCount: 'desc',
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
        .map((t) => `${t.title} by ${t.artist?.artistName || 'Unknown'}`);
      console.log(`[AI] Sample tracks: ${trackSample.join(', ')}`);
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
    console.error('[AI] Error generating default playlist:', error);
    // Return empty array as fallback
    return [];
  }
};
