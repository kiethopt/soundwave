import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../config/db';
import { trackSelect } from '../utils/prisma-selects';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction:
    "You are an expert music curator who creates personalized playlists. Analyze user's music preferences and suggest tracks that match their taste.",
});

interface PlaylistGenerationOptions {
  name?: string;
  description?: string;
  trackCount?: number;
  basedOnMood?: string;
  basedOnGenre?: string;
  basedOnArtist?: string;
  includeTopTracks?: boolean;
  includeNewReleases?: boolean;
}

export const generatePersonalizedPlaylist = async (
  userId: string,
  options: PlaylistGenerationOptions = {}
) => {
  try {
    // 1. Thu thập dữ liệu người dùng
    const userListeningData = await getUserListeningData(userId);

    // 2. Xác định các thể loại, nghệ sĩ yêu thích
    const favoriteGenres = extractFavoriteGenres(userListeningData);
    const favoriteArtists = extractFavoriteArtists(userListeningData);

    // 3. Lấy các bài hát đề xuất từ Gemini AI
    const recommendedTrackIds = await getAIRecommendations(
      userListeningData,
      favoriteGenres,
      favoriteArtists,
      options
    );

    // 4. Tạo playlist mới
    const playlistName =
      options.name ||
      `Mix dành riêng cho bạn ${new Date().toLocaleDateString('vi-VN')}`;
    const playlistDescription =
      options.description ||
      `Playlist được tạo tự động dựa trên sở thích nghe nhạc của bạn`;

    // 5. Lưu playlist vào database
    const newPlaylist = await createPlaylistWithTracks(
      userId,
      playlistName,
      playlistDescription,
      recommendedTrackIds
    );

    return newPlaylist;
  } catch (error) {
    console.error('Error generating personalized playlist:', error);
    throw new Error('Failed to generate personalized playlist');
  }
};

// Lấy dữ liệu nghe nhạc của người dùng
const getUserListeningData = async (userId: string) => {
  // Lấy lịch sử nghe nhạc
  const playHistory = await prisma.history.findMany({
    where: {
      userId,
      type: 'PLAY',
      trackId: { not: null },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100, // Lấy 100 bản ghi gần nhất
    select: {
      trackId: true,
      playCount: true,
      duration: true,
      createdAt: true,
      track: {
        select: trackSelect,
      },
    },
  });

  // Lấy bài hát đã thích
  const likedTracks = await prisma.userLikeTrack.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      trackId: true,
      createdAt: true,
      track: {
        select: trackSelect,
      },
    },
  });

  // Lấy danh sách playlist của người dùng và các bài hát
  const playlists = await prisma.playlist.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      tracks: {
        select: {
          trackId: true,
          track: {
            select: trackSelect,
          },
        },
      },
    },
  });

  return { playHistory, likedTracks, playlists };
};

// Trích xuất các thể loại yêu thích
const extractFavoriteGenres = (userListeningData: any) => {
  // Logic để phân tích thể loại nghe nhiều nhất
  const genreCounts: Record<string, number> = {};

  // Đếm từ lịch sử phát
  userListeningData.playHistory.forEach((history: any) => {
    if (history.track && history.track.genres) {
      history.track.genres.forEach((genreItem: any) => {
        const genreName = genreItem.genre.name;
        genreCounts[genreName] =
          (genreCounts[genreName] || 0) + (history.playCount || 1);
      });
    }
  });

  // Đếm từ bài hát đã thích (gán trọng số cao hơn)
  userListeningData.likedTracks.forEach((likedTrack: any) => {
    if (likedTrack.track && likedTrack.track.genres) {
      likedTrack.track.genres.forEach((genreItem: any) => {
        const genreName = genreItem.genre.name;
        genreCounts[genreName] = (genreCounts[genreName] || 0) + 3; // Trọng số cao hơn
      });
    }
  });

  // Sắp xếp và trả về các thể loại hàng đầu
  return Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((entry) => entry[0]);
};

// Trích xuất các nghệ sĩ yêu thích
const extractFavoriteArtists = (userListeningData: any) => {
  // Logic tương tự như trích xuất thể loại nhưng cho nghệ sĩ
  const artistCounts: Record<
    string,
    { count: number; id: string; name: string }
  > = {};

  // Từ lịch sử phát
  userListeningData.playHistory.forEach((history: any) => {
    if (history.track && history.track.artist) {
      const artistId = history.track.artist.id;
      const artistName = history.track.artist.artistName;

      if (!artistCounts[artistId]) {
        artistCounts[artistId] = { count: 0, id: artistId, name: artistName };
      }

      artistCounts[artistId].count += history.playCount || 1;
    }
  });

  // Từ bài hát đã thích (trọng số cao hơn)
  userListeningData.likedTracks.forEach((likedTrack: any) => {
    if (likedTrack.track && likedTrack.track.artist) {
      const artistId = likedTrack.track.artist.id;
      const artistName = likedTrack.track.artist.artistName;

      if (!artistCounts[artistId]) {
        artistCounts[artistId] = { count: 0, id: artistId, name: artistName };
      }

      artistCounts[artistId].count += 3; // Trọng số cao hơn cho bài hát đã thích
    }
  });

  // Sắp xếp và trả về top nghệ sĩ
  return Object.values(artistCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};

// Lấy các bài hát đề xuất từ Gemini AI
const getAIRecommendations = async (
  userListeningData: any,
  favoriteGenres: string[],
  favoriteArtists: Array<{ id: string; name: string; count: number }>,
  options: PlaylistGenerationOptions
) => {
  // Khai báo biến ở ngoài try để có thể truy cập từ catch block
  let availableTracks: Array<any> = [];

  try {
    // 1. Chuẩn bị prompt cho Gemini dựa trên dữ liệu người dùng
    const recentTracks = userListeningData.playHistory
      .slice(0, 20)
      .map((history: any) => ({
        id: history.track.id,
        title: history.track.title,
        artist: history.track.artist.artistName,
        genre:
          history.track.genres?.map((g: any) => g.genre.name).join(', ') ||
          'Unknown',
      }));

    const likedTracks = userListeningData.likedTracks
      .slice(0, 20)
      .map((liked: any) => ({
        id: liked.track.id,
        title: liked.track.title,
        artist: liked.track.artist.artistName,
        genre:
          liked.track.genres?.map((g: any) => g.genre.name).join(', ') ||
          'Unknown',
      }));

    // 2. Tạo dataset để tìm kiếm các bài hát phù hợp
    availableTracks = await prisma.track.findMany({
      where: {
        isActive: true,
        // Lọc theo thể loại nếu được chỉ định
        ...(options.basedOnGenre
          ? {
              genres: {
                some: {
                  genre: {
                    name: {
                      equals: options.basedOnGenre,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            }
          : {}),
        // Lọc theo nghệ sĩ nếu được chỉ định
        ...(options.basedOnArtist
          ? {
              OR: [
                { artist: { artistName: options.basedOnArtist } },
                {
                  featuredArtists: {
                    some: {
                      artistProfile: { artistName: options.basedOnArtist },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      select: trackSelect,
      take: 200, // Tăng lên để có nhiều lựa chọn hơn
    });

    // 3. Tạo prompt để gửi cho Gemini
    const prompt = `
          Tôi cần tạo một playlist được cá nhân hóa cho người dùng dựa trên dữ liệu nghe nhạc của họ.
          
          Thông tin người dùng:
          - Thể loại yêu thích: ${favoriteGenres.join(', ')}
          - Nghệ sĩ yêu thích: ${favoriteArtists.map((a) => a.name).join(', ')}
          ${options.basedOnMood ? `- Tâm trạng: ${options.basedOnMood}` : ''}
          
          Bài hát đã nghe gần đây:
          ${JSON.stringify(recentTracks, null, 2)}
          
          Bài hát đã thích:
          ${JSON.stringify(likedTracks, null, 2)}
          
          Danh sách bài hát có sẵn để chọn (${availableTracks.length} bài):
          ${JSON.stringify(
            availableTracks.map((track: any) => ({
              id: track.id,
              title: track.title,
              artist: track.artist.artistName,
              album: track.album?.title || 'Single',
              genres: track.genres.map((g: any) => g.genre.name),
              duration: track.duration,
              releaseDate: track.releaseDate,
            })),
            null,
            2
          )}
          
          Hãy chọn ${
            options.trackCount || 20
          } bài hát phù hợp nhất cho người dùng này để tạo một playlist hấp dẫn.
          ĐẢM BẢO KHÔNG TRÙNG LẶP ID BÀI HÁT trong danh sách trả về.
          Chỉ trả về danh sách ID của các bài hát được đề xuất dưới dạng mảng JSON, không có thông tin khác.
          `;

    // 4. Gửi yêu cầu đến Gemini và phân tích kết quả
    let trackIds = [];

    try {
      console.log('Sending request to Gemini AI...');
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      console.log('Received response from Gemini AI');

      // Tìm mảng JSON trong kết quả
      const trackIdsMatch = responseText.match(/\[(.|\n|\r)*\]/);
      if (trackIdsMatch) {
        try {
          // Parse JSON array và loại bỏ duplicates
          const parsedIds = JSON.parse(trackIdsMatch[0]);

          // Đảm bảo ID hợp lệ và không trùng lặp
          const uniqueIds = [...new Set(parsedIds)].filter(
            (id) =>
              typeof id === 'string' &&
              availableTracks.some((track: any) => track.id === id)
          );

          console.log(`Found ${uniqueIds.length} unique track IDs`);

          if (uniqueIds.length > 0) {
            trackIds = uniqueIds.slice(0, options.trackCount || 20);
          } else {
            throw new Error('No valid track IDs found in AI response');
          }
        } catch (parseError) {
          console.error('Error parsing Gemini response:', parseError);
          throw parseError;
        }
      } else {
        throw new Error('No JSON array found in AI response');
      }
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      console.log('Using fallback random tracks selection');

      // Fallback: chọn tracks ngẫu nhiên từ availableTracks
      trackIds = availableTracks
        .sort(() => 0.5 - Math.random())
        .slice(0, options.trackCount || 20)
        .map((track: any) => track.id);
    }

    return trackIds;
  } catch (mainError) {
    console.error('Main error in getAIRecommendations:', mainError);

    // Fallback an toàn nhất - nếu availableTracks rỗng, lấy một số bài hát
    if (availableTracks.length === 0) {
      console.log('No available tracks found, fetching random tracks');
      try {
        availableTracks = await prisma.track.findMany({
          where: { isActive: true },
          select: trackSelect,
          take: 50,
        });
      } catch (fetchError) {
        console.error('Error fetching fallback tracks:', fetchError);
        return []; // Trả về mảng rỗng trong trường hợp xấu nhất
      }
    }

    return availableTracks
      .sort(() => 0.5 - Math.random())
      .slice(0, options.trackCount || 20)
      .map((track: any) => track.id);
  }
};

// Tạo playlist mới và lưu bài hát đề xuất
const createPlaylistWithTracks = async (
  userId: string,
  name: string,
  description: string,
  trackIds: string[]
) => {
  try {
    // Loại bỏ duplicates một lần nữa để đảm bảo
    const uniqueTrackIds = [...new Set(trackIds)];
    console.log(
      `Creating playlist with ${uniqueTrackIds.length} unique tracks`
    );

    // Tính tổng thời lượng của tất cả bài hát
    const tracks = await prisma.track.findMany({
      where: { id: { in: uniqueTrackIds } },
      select: { id: true, duration: true },
    });

    // Kiểm tra xem tracks có tồn tại không
    if (tracks.length === 0) {
      throw new Error('No valid tracks found with the provided IDs');
    }

    const totalDuration = tracks.reduce(
      (sum, track) => sum + track.duration,
      0
    );

    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
    const playlist = await prisma.$transaction(async (tx) => {
      // Tạo playlist trước
      const newPlaylist = await tx.playlist.create({
        data: {
          name,
          description,
          privacy: 'PRIVATE',
          type: 'NORMAL',
          isAIGenerated: true,
          totalTracks: uniqueTrackIds.length,
          totalDuration,
          userId,
        },
      });

      // Sau đó thêm từng track vào playlist
      for (let i = 0; i < uniqueTrackIds.length; i++) {
        await tx.playlistTrack.create({
          data: {
            playlistId: newPlaylist.id,
            trackId: uniqueTrackIds[i],
            trackOrder: i + 1,
          },
        });
      }

      return newPlaylist;
    });

    return playlist;
  } catch (error) {
    console.error('Error creating playlist with tracks:', error);
    throw error;
  }
};
