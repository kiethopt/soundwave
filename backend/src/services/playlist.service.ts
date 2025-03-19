import prisma from '../config/db';
import { Playlist } from '@prisma/client';
import { Matrix } from 'ml-matrix'; // Thay thế mathjs bằng ml-matrix

/**
 * Tạo playlist được cá nhân hóa dựa trên thuật toán Collaborative Filtering
 * @param userId ID của người dùng
 * @param options Tùy chọn tạo playlist (tên, mô tả, số lượng bài hát, v.v.)
 */
export const generatePersonalizedPlaylist = async (
  userId: string,
  options: {
    name?: string;
    description?: string;
    trackCount?: number;
    basedOnMood?: string;
    basedOnGenre?: string;
    basedOnArtist?: string;
    includeTopTracks?: boolean;
    includeNewReleases?: boolean;
  }
): Promise<Playlist> => {
  try {
    // Mặc định nếu không có options
    const {
      name = 'Playlist được đề xuất cho bạn',
      description = 'Danh sách nhạc được tạo tự động dựa trên sở thích của bạn',
      trackCount = 20,
      basedOnGenre,
      basedOnArtist,
      includeTopTracks = true,
      includeNewReleases = false,
    } = options;

    // 1. Tạo playlist trống
    const playlist = await prisma.playlist.create({
      data: {
        name,
        description,
        privacy: 'PRIVATE',
        isAIGenerated: true,
        userId,
      },
    });

    // 2. Lấy danh sách bài hát đề xuất bằng Collaborative Filtering
    const recommendedTracks = await getRecommendedTracks(userId, trackCount, {
      basedOnGenre,
      basedOnArtist,
      includeTopTracks,
      includeNewReleases,
    });

    // 3. Thêm tracks vào playlist
    for (let i = 0; i < recommendedTracks.length; i++) {
      await prisma.playlistTrack.create({
        data: {
          playlistId: playlist.id,
          trackId: recommendedTracks[i].id,
          trackOrder: i,
        },
      });
    }

    // 4. Cập nhật thông tin tổng số bài hát và thời lượng
    const totalDuration = recommendedTracks.reduce(
      (sum, track) => sum + (track.duration || 0),
      0
    );

    const updatedPlaylist = await prisma.playlist.update({
      where: { id: playlist.id },
      data: {
        totalTracks: recommendedTracks.length,
        totalDuration,
      },
      include: {
        tracks: {
          include: {
            track: {
              include: {
                artist: true,
                album: true,
              },
            },
          },
        },
      },
    });

    return updatedPlaylist;
  } catch (error) {
    console.error('Error generating personalized playlist:', error);
    throw new Error('Failed to generate personalized playlist');
  }
};

/**
 * Nhận danh sách bài hát được đề xuất cho người dùng
 * Kết hợp matrix factorization và các phương pháp khác
 */
const getRecommendedTracks = async (
  userId: string,
  limit: number,
  options: {
    basedOnGenre?: string;
    basedOnArtist?: string;
    includeTopTracks?: boolean;
    includeNewReleases?: boolean;
  }
): Promise<any[]> => {
  try {
    // Lấy các bài hát mà người dùng đã nghe hoặc thích
    const userHistory = await prisma.history.findMany({
      where: {
        userId,
        type: 'PLAY',
        trackId: { not: null },
      },
      select: { trackId: true, playCount: true },
    });

    const userLikes = await prisma.userLikeTrack.findMany({
      where: { userId },
      select: { trackId: true },
    });

    // Tạo danh sách các ID bài hát mà người dùng đã tương tác
    const interactedTrackIds = new Set(
      [
        ...userHistory.map((h) => h.trackId),
        ...userLikes.map((l) => l.trackId),
      ].filter(Boolean) as string[]
    );

    // Tạo map tương tác của user với các bài hát (để tính trọng số)
    const userTrackInteractions = new Map<string, number>();

    // Thêm lịch sử nghe vào map tương tác
    userHistory.forEach((h) => {
      if (h.trackId) {
        userTrackInteractions.set(h.trackId, h.playCount || 1);
      }
    });

    // Thêm like với trọng số cao hơn
    userLikes.forEach((l) => {
      if (l.trackId) {
        const currentScore = userTrackInteractions.get(l.trackId) || 0;
        userTrackInteractions.set(l.trackId, currentScore + 3); // Tăng trọng số cho like
      }
    });

    // Kết hợp các phương pháp gợi ý
    let recommendedTracks: any[] = [];

    // 1. Matrix Factorization (kỹ thuật chính của Spotify)
    const matrixRecommendations = await getMatrixFactorizationRecommendations(
      userId,
      Array.from(interactedTrackIds),
      userTrackInteractions,
      Math.ceil(limit * 0.6), // 60% bài hát từ kỹ thuật matrix factorization
      options
    );

    recommendedTracks.push(...matrixRecommendations);

    // 2. Item-based Collaborative Filtering (tìm bài hát tương tự)
    if (recommendedTracks.length < limit) {
      const itemBasedTracks = await getItemBasedRecommendations(
        userId,
        Array.from(interactedTrackIds),
        limit - recommendedTracks.length,
        options
      );

      // Thêm vào kết quả, đảm bảo không trùng lặp
      for (const track of itemBasedTracks) {
        if (!recommendedTracks.some((t) => t.id === track.id)) {
          recommendedTracks.push(track);
          if (recommendedTracks.length >= limit) break;
        }
      }
    }

    // 3. Nếu vẫn chưa đủ, bổ sung với bài hát phổ biến
    if (recommendedTracks.length < limit) {
      const popularTracks = await getPopularTracks(
        recommendedTracks.map((t) => t.id),
        limit - recommendedTracks.length,
        options
      );

      for (const track of popularTracks) {
        if (!recommendedTracks.some((t) => t.id === track.id)) {
          recommendedTracks.push(track);
          if (recommendedTracks.length >= limit) break;
        }
      }
    }

    return recommendedTracks;
  } catch (error) {
    console.error('Error in getRecommendedTracks:', error);
    // Fallback to popular tracks if collaborative filtering fails
    return getPopularTracks([], limit, options);
  }
};

/**
 * Matrix Factorization Collaborative Filtering
 * Phương pháp chính của Spotify: tạo và phân tích ma trận tương tác user-track
 */
const getMatrixFactorizationRecommendations = async (
  userId: string,
  interactedTrackIds: string[],
  userTrackInteractions: Map<string, number>,
  limit: number,
  options: {
    basedOnGenre?: string;
    basedOnArtist?: string;
    includeTopTracks?: boolean;
    includeNewReleases?: boolean;
  }
): Promise<any[]> => {
  try {
    // Bước 1: Lấy dữ liệu từ cơ sở dữ liệu
    // Lấy những user có lượt play > 20 bài để có đủ dữ liệu tính toán
    const activeUsers = await prisma.user.findMany({
      where: {
        history: {
          some: {
            type: 'PLAY',
            playCount: { gt: 5 },
          },
        },
      },
      select: { id: true },
    });

    const activeUserIds = activeUsers.map((u) => u.id);

    if (activeUserIds.length < 5) {
      // Không đủ dữ liệu người dùng để thực hiện matrix factorization hiệu quả
      console.log('Not enough user data for matrix factorization');
      return [];
    }

    // Lấy lịch sử nghe của tất cả các user active và người dùng hiện tại
    const allUserHistory = await prisma.history.findMany({
      where: {
        userId: { in: [...activeUserIds, userId] },
        type: 'PLAY',
        trackId: { not: null },
      },
      select: {
        userId: true,
        trackId: true,
        playCount: true,
      },
    });

    // Lấy lượt like để tăng trọng số
    const allUserLikes = await prisma.userLikeTrack.findMany({
      where: {
        userId: { in: [...activeUserIds, userId] },
      },
      select: {
        userId: true,
        trackId: true,
      },
    });

    // Bước 2: Tạo ma trận tương tác User-Track
    // Cần map ID của user và track về index để tạo ma trận
    const userIdToIndex = new Map<string, number>();
    const trackIdToIndex = new Map<string, number>();
    const indexToTrackId = new Map<number, string>();

    // Tập hợp tất cả các trackId từ lịch sử và like
    const allTrackIds = new Set<string>();
    allUserHistory.forEach((h) => h.trackId && allTrackIds.add(h.trackId));
    allUserLikes.forEach((l) => l.trackId && allTrackIds.add(l.trackId));

    // Tạo ánh xạ User ID => Index
    activeUserIds.forEach((id, index) => {
      userIdToIndex.set(id, index);
    });

    // Đảm bảo user hiện tại có trong map
    if (!userIdToIndex.has(userId)) {
      userIdToIndex.set(userId, activeUserIds.length);
    }

    // Tạo ánh xạ Track ID => Index
    Array.from(allTrackIds).forEach((id, index) => {
      trackIdToIndex.set(id, index);
      indexToTrackId.set(index, id);
    });

    // Khởi tạo ma trận tương tác với giá trị 0
    const userCount = userIdToIndex.size;
    const trackCount = trackIdToIndex.size;

    if (trackCount === 0) {
      return [];
    }

    // Tạo ma trận trống với tất cả giá trị là 0 (sử dụng ml-matrix)
    const interactionMatrix = new Matrix(userCount, trackCount);

    // Điền giá trị vào ma trận từ lịch sử nghe
    allUserHistory.forEach((history) => {
      if (history.trackId) {
        const userIndex = userIdToIndex.get(history.userId);
        const trackIndex = trackIdToIndex.get(history.trackId);

        if (userIndex !== undefined && trackIndex !== undefined) {
          // Lấy giá trị hiện tại và cộng thêm playCount
          const currentValue = interactionMatrix.get(userIndex, trackIndex);
          interactionMatrix.set(
            userIndex,
            trackIndex,
            currentValue + (history.playCount || 1)
          );
        }
      }
    });

    // Điền giá trị từ lượt like (với trọng số cao hơn)
    allUserLikes.forEach((like) => {
      if (like.trackId) {
        const userIndex = userIdToIndex.get(like.userId);
        const trackIndex = trackIdToIndex.get(like.trackId);

        if (userIndex !== undefined && trackIndex !== undefined) {
          // Tăng trọng số cho like (cộng thêm 3 cho mỗi like)
          const currentValue = interactionMatrix.get(userIndex, trackIndex);
          interactionMatrix.set(userIndex, trackIndex, currentValue + 3);
        }
      }
    });

    // Bước 3: Chuẩn hóa ma trận
    // Chuẩn hóa để giảm ảnh hưởng của sự khác biệt trong số lượng tương tác
    const normalizedMatrix = normalizeMatrix(interactionMatrix);

    // Bước 4: Tính toán ma trận tương đồng (similarity matrix)
    // Tính ma trận tương đồng giữa các bài hát (item-item similarity)
    const itemSimilarityMatrix = calculateItemSimilarity(normalizedMatrix);

    // Bước 5: Tính toán điểm dự đoán cho người dùng hiện tại
    const userIndex = userIdToIndex.get(userId);
    if (userIndex === undefined) {
      return [];
    }

    // Vector tương tác của người dùng hiện tại
    const userVector = normalizedMatrix.getRow(userIndex);

    // Tính toán điểm dự đoán cho mỗi bài hát
    const predictedScores = [];
    for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
      let score = 0;
      for (let j = 0; j < trackCount; j++) {
        score += userVector[j] * itemSimilarityMatrix.get(j, trackIndex);
      }
      predictedScores.push(score);
    }

    // Bước 6: Lọc và xếp hạng các đề xuất
    const recommendations: Array<{ trackId: string; score: number }> = [];

    // Duyệt qua tất cả các bài hát và tính toán điểm dự đoán
    for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
      const trackId = indexToTrackId.get(trackIndex);

      // Bỏ qua các bài hát mà người dùng đã tương tác
      if (trackId && !interactedTrackIds.includes(trackId)) {
        const score = predictedScores[trackIndex];

        if (score > 0) {
          // Chỉ đề xuất những bài hát có điểm dự đoán dương
          recommendations.push({ trackId, score });
        }
      }
    }

    // Sắp xếp theo điểm dự đoán từ cao xuống thấp
    recommendations.sort((a, b) => b.score - a.score);

    // Lấy top bài hát theo limit
    const topRecommendedTrackIds = recommendations
      .slice(0, limit * 2) // Lấy nhiều hơn để có thể lọc theo điều kiện
      .map((rec) => rec.trackId);

    if (topRecommendedTrackIds.length === 0) {
      return [];
    }

    // Bước 7: Truy vấn DB để lấy thông tin chi tiết của bài hát được đề xuất
    const whereClause: any = {
      id: { in: topRecommendedTrackIds },
      isActive: true,
    };

    // Thêm điều kiện về thể loại nếu có
    if (options.basedOnGenre) {
      whereClause.genres = {
        some: {
          genre: {
            name: options.basedOnGenre,
          },
        },
      };
    }

    // Thêm điều kiện về nghệ sĩ nếu có
    if (options.basedOnArtist) {
      whereClause.OR = [
        { artistId: options.basedOnArtist },
        {
          featuredArtists: {
            some: {
              artistId: options.basedOnArtist,
            },
          },
        },
      ];
    }

    const recommendedTracks = await prisma.track.findMany({
      where: whereClause,
      include: {
        artist: true,
        album: true,
        genres: {
          include: {
            genre: true,
          },
        },
      },
      take: limit,
    });

    return recommendedTracks;
  } catch (error) {
    console.error('Error in getMatrixFactorizationRecommendations:', error);
    return [];
  }
};

/**
 * Chuẩn hóa ma trận - sử dụng ml-matrix
 * @param matrix Ma trận cần chuẩn hóa
 * @returns Ma trận đã chuẩn hóa
 */
const normalizeMatrix = (matrix: Matrix): Matrix => {
  // Clone ma trận để không làm thay đổi ma trận gốc
  const normalizedMatrix = matrix.clone();
  const rows = normalizedMatrix.rows;
  const columns = normalizedMatrix.columns;

  // Chuẩn hóa theo hàng (user)
  for (let i = 0; i < rows; i++) {
    // Lấy tất cả giá trị trong hàng
    const rowValues = normalizedMatrix.getRow(i);
    const sum = rowValues.reduce((acc, val) => acc + val, 0);

    if (sum > 0) {
      // Chuẩn hóa từng giá trị trong hàng
      for (let j = 0; j < columns; j++) {
        const currentValue = normalizedMatrix.get(i, j);
        const normalizedValue = currentValue / sum;
        normalizedMatrix.set(i, j, normalizedValue);
      }
    }
  }

  return normalizedMatrix;
};

/**
 * Tính toán ma trận tương đồng giữa các bài hát (item-item similarity)
 * @param matrix Ma trận tương tác đã chuẩn hóa
 * @returns Ma trận tương đồng item-item
 */
const calculateItemSimilarity = (matrix: Matrix): Matrix => {
  // Chuyển vị ma trận để dễ dàng tính toán tương đồng giữa các bài hát
  const transposedMatrix = matrix.transpose();
  const itemCount = transposedMatrix.rows;

  // Tạo ma trận tương đồng item-item
  const similarityMatrix = new Matrix(itemCount, itemCount);

  // Tính toán cosine similarity giữa các vector bài hát
  for (let i = 0; i < itemCount; i++) {
    for (let j = 0; j < itemCount; j++) {
      if (i === j) {
        // Ma trận đường chéo (self-similarity) = 1
        similarityMatrix.set(i, j, 1);
      } else {
        // Lấy vectors của 2 bài hát
        const itemVectorI = transposedMatrix.getRow(i);
        const itemVectorJ = transposedMatrix.getRow(j);

        // Tính cosine similarity
        const similarity = cosineSimilarity(itemVectorI, itemVectorJ);
        similarityMatrix.set(i, j, similarity);
      }
    }
  }

  return similarityMatrix;
};

/**
 * Tính cosine similarity giữa hai vector
 * @param vectorA Vector đầu tiên
 * @param vectorB Vector thứ hai
 * @returns Độ tương đồng cosine
 */
const cosineSimilarity = (vectorA: number[], vectorB: number[]): number => {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  // Tránh chia cho 0
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
};

/**
 * Item-based Collaborative Filtering (Phương pháp bổ sung)
 * Tìm bài hát tương tự với các bài hát người dùng đã thích
 */
const getItemBasedRecommendations = async (
  userId: string,
  interactedTrackIds: string[],
  limit: number,
  options: {
    basedOnGenre?: string;
    basedOnArtist?: string;
    includeTopTracks?: boolean;
    includeNewReleases?: boolean;
  }
): Promise<any[]> => {
  try {
    if (interactedTrackIds.length === 0) {
      return [];
    }

    // 1. Lấy thể loại từ các bài hát người dùng thích
    const userGenres = await prisma.trackGenre.findMany({
      where: {
        trackId: { in: interactedTrackIds },
      },
      include: {
        genre: true,
      },
    });

    // Đếm số lần xuất hiện từng thể loại
    const genreCounts = new Map<string, number>();
    userGenres.forEach((trackGenre) => {
      const genreId = trackGenre.genreId;
      genreCounts.set(genreId, (genreCounts.get(genreId) || 0) + 1);
    });

    // Sắp xếp thể loại theo mức độ ưa thích
    const topGenreIds = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);

    if (topGenreIds.length === 0) {
      return [];
    }

    // 2. Lấy các nghệ sĩ mà người dùng thích
    const userArtists = await prisma.track.findMany({
      where: {
        id: { in: interactedTrackIds },
      },
      select: {
        artistId: true,
        featuredArtists: {
          select: {
            artistId: true,
          },
        },
      },
    });

    // Đếm số lần xuất hiện từng nghệ sĩ
    const artistCounts = new Map<string, number>();
    userArtists.forEach((track) => {
      // Thêm nghệ sĩ chính
      if (track.artistId) {
        artistCounts.set(
          track.artistId,
          (artistCounts.get(track.artistId) || 0) + 2
        );
      }

      // Thêm nghệ sĩ featured (với trọng số thấp hơn)
      track.featuredArtists.forEach((featured) => {
        if (featured.artistId) {
          artistCounts.set(
            featured.artistId,
            (artistCounts.get(featured.artistId) || 0) + 1
          );
        }
      });
    });

    // Sắp xếp nghệ sĩ theo mức độ ưa thích
    const topArtistIds = [...artistCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);

    // 3. Tìm bài hát tương tự dựa trên thể loại và nghệ sĩ
    let similarTracks = await prisma.track.findMany({
      where: {
        id: { notIn: interactedTrackIds },
        isActive: true,
        OR: [
          // Bài hát cùng thể loại
          {
            genres: {
              some: {
                genreId: { in: topGenreIds },
              },
            },
          },
          // Bài hát cùng nghệ sĩ
          { artistId: { in: topArtistIds } },
          // Bài hát có nghệ sĩ featured là nghệ sĩ mà người dùng thích
          {
            featuredArtists: {
              some: {
                artistId: { in: topArtistIds },
              },
            },
          },
        ],
        ...(options.basedOnGenre
          ? {
              genres: {
                some: {
                  genre: {
                    name: options.basedOnGenre,
                  },
                },
              },
            }
          : {}),
        ...(options.basedOnArtist
          ? {
              OR: [
                { artistId: options.basedOnArtist },
                {
                  featuredArtists: {
                    some: {
                      artistId: options.basedOnArtist,
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        artist: true,
        album: true,
        genres: {
          include: {
            genre: true,
          },
        },
      },
      orderBy: [{ playCount: 'desc' }],
      take: limit,
    });

    return similarTracks;
  } catch (error) {
    console.error('Error in getItemBasedRecommendations:', error);
    return [];
  }
};

/**
 * Tìm các bài hát phổ biến để bổ sung nếu chưa đủ
 */
const getPopularTracks = async (
  excludedTrackIds: string[],
  limit: number,
  options: {
    basedOnGenre?: string;
    basedOnArtist?: string;
    includeTopTracks?: boolean;
    includeNewReleases?: boolean;
  }
): Promise<any[]> => {
  try {
    // Tìm bài hát dựa trên trọng số lượt nghe và mới phát hành
    const whereClause: any = {
      id: { notIn: excludedTrackIds },
      isActive: true,
    };

    // Thêm điều kiện về thể loại nếu có
    if (options.basedOnGenre) {
      whereClause.genres = {
        some: {
          genre: {
            name: options.basedOnGenre,
          },
        },
      };
    }

    // Thêm điều kiện về nghệ sĩ nếu có
    if (options.basedOnArtist) {
      whereClause.OR = [
        { artistId: options.basedOnArtist },
        {
          featuredArtists: {
            some: {
              artistId: options.basedOnArtist,
            },
          },
        },
      ];
    }

    let orderBy: any = [{ playCount: 'desc' }];

    // Nếu muốn ưu tiên bài hát mới
    if (options.includeNewReleases) {
      orderBy = [{ releaseDate: 'desc' }, { playCount: 'desc' }];
    }

    const popularTracks = await prisma.track.findMany({
      where: whereClause,
      include: {
        artist: true,
        album: true,
        genres: {
          include: {
            genre: true,
          },
        },
      },
      orderBy,
      take: limit,
    });

    return popularTracks;
  } catch (error) {
    console.error('Error in getPopularTracks:', error);
    return [];
  }
};

/**
 * Phân tích dữ liệu lịch sử nghe bài hát của user để sinh ra một playlist phù hợp
 */
export const analyzeUserTaste = async (userId: string) => {
  try {
    // Phân tích lịch sử nghe
    const playHistory = await prisma.history.findMany({
      where: {
        userId,
        type: 'PLAY',
        trackId: { not: null },
      },
      include: {
        track: {
          include: {
            genres: {
              include: {
                genre: true,
              },
            },
            artist: true,
          },
        },
      },
    });

    // Phân tích bài hát đã thích
    const likedTracks = await prisma.userLikeTrack.findMany({
      where: {
        userId,
      },
      include: {
        track: {
          include: {
            genres: {
              include: {
                genre: true,
              },
            },
            artist: true,
          },
        },
      },
    });

    // Thống kê thể loại
    const genreCounts = new Map<string, number>();
    const artistCounts = new Map<string, number>();

    // Xử lý từ lịch sử nghe
    playHistory.forEach((history) => {
      if (history.track?.genres) {
        history.track.genres.forEach((trackGenre) => {
          const genreName = trackGenre.genre.name;
          genreCounts.set(genreName, (genreCounts.get(genreName) || 0) + 1);
        });

        const artistName = history.track.artist?.artistName || '';
        if (artistName) {
          artistCounts.set(artistName, (artistCounts.get(artistName) || 0) + 1);
        }
      }
    });

    // Xử lý từ bài hát đã thích (với trọng số cao hơn)
    likedTracks.forEach((like) => {
      if (like.track?.genres) {
        like.track.genres.forEach((trackGenre) => {
          const genreName = trackGenre.genre.name;
          genreCounts.set(genreName, (genreCounts.get(genreName) || 0) + 2); // Tăng trọng số cho bài đã like
        });

        const artistName = like.track.artist?.artistName || '';
        if (artistName) {
          artistCounts.set(artistName, (artistCounts.get(artistName) || 0) + 2);
        }
      }
    });

    // Sắp xếp thể loại yêu thích
    const favoriteGenres = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);

    // Sắp xếp nghệ sĩ yêu thích
    const favoriteArtists = [...artistCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((entry) => entry[0]);

    return {
      favoriteGenres,
      favoriteArtists,
      totalTracksListened: playHistory.length,
      totalLikedTracks: likedTracks.length,
    };
  } catch (error) {
    console.error('Error analyzing user taste:', error);
    throw new Error('Failed to analyze user listening habits');
  }
};
