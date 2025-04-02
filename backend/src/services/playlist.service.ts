import prisma from '../config/db';

// Tạo playlist chứa các bài hát từ lịch sử nghe của người dùng
export const updateVibeRewindPlaylist = async (
  userId: string
): Promise<void> => {
  try {
    // Tìm hoặc tạo playlist "Vibe Rewind"
    let vibeRewindPlaylist = await prisma.playlist.findFirst({
      where: { userId, name: 'Vibe Rewind' },
    });

    if (!vibeRewindPlaylist) {
      console.log(
        `[PlaylistService] Creating new Vibe Rewind playlist for user ${userId}...`
      );
      vibeRewindPlaylist = await prisma.playlist.create({
        data: {
          name: 'Vibe Rewind',
          description:
            "Your personal time capsule - tracks you've been vibing to lately",
          privacy: 'PRIVATE',
          type: 'NORMAL',
          userId,
        },
      });
    }

    // Lấy lịch sử nghe nhạc của người dùng (bài có playCount > 2)
    const userHistory = await prisma.history.findMany({
      where: { userId, type: 'PLAY', playCount: { gt: 2 } },
      include: {
        track: {
          include: { artist: true, genres: { include: { genre: true } } },
        },
      },
    });

    if (userHistory.length === 0) {
      console.log(`[PlaylistService] No history found for user ${userId}`);
      return;
    }

    // Lấy bài hát mà người dùng nghe nhiều nhất (playCount > 5)
    const topPlayedTracks = await prisma.history.findMany({
      where: { userId, playCount: { gt: 5 } },
      include: { track: true },
      orderBy: { playCount: 'desc' },
      take: 10, // Giới hạn số lượng bài hát phổ biến
    });

    console.log(
      `[PlaylistService] Found ${topPlayedTracks.length} frequently played tracks for user ${userId}`
    );

    // Xác định thể loại & nghệ sĩ yêu thích
    const genreCounts = new Map<string, number>();
    const artistCounts = new Map<string, number>();

    userHistory.forEach((history) => {
      const track = history.track;
      if (track) {
        // Null check for track
        track.genres.forEach((genreRel) => {
          const genreId = genreRel.genre.id;
          genreCounts.set(genreId, (genreCounts.get(genreId) || 0) + 1);
        });

        const artistId = track.artist?.id;
        if (artistId) {
          artistCounts.set(artistId, (artistCounts.get(artistId) || 0) + 1);
        }
      }
    });

    const topGenres = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((entry) => entry[0]);
    const topArtists = [...artistCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((entry) => entry[0]);

    console.log(`[PlaylistService] Top genres: ${topGenres}`);
    console.log(`[PlaylistService] Top artists: ${topArtists}`);

    // Tìm bài hát dựa trên Content-Based Filtering
    const recommendedTracks = await prisma.track.findMany({
      where: {
        OR: [
          { genres: { some: { genreId: { in: topGenres } } } },
          { artistId: { in: topArtists } },
        ],
        isActive: true,
      },
      include: { artist: true, album: true },
      orderBy: { playCount: 'desc' },
      take: 10,
    });

    console.log(
      `[PlaylistService] Found ${recommendedTracks.length} content-based tracks`
    );

    // Collaborative Filtering - Tìm người dùng có sở thích giống nhau
    const similarUsers = await prisma.history.findMany({
      where: {
        trackId: {
          in: userHistory
            .map((h) => h.trackId)
            .filter((id): id is string => id !== null),
        },
        userId: { not: userId },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    const similarUserIds = similarUsers.map((u) => u.userId);
    console.log(
      `[PlaylistService] Found ${similarUserIds.length} similar users`
    );

    // Lấy bài hát từ người dùng có sở thích tương tự
    const collaborativeTracks = await prisma.history.findMany({
      where: { userId: { in: similarUserIds } },
      include: { track: true },
      orderBy: { playCount: 'desc' },
      take: 10,
    });

    console.log(
      `[PlaylistService] Found ${collaborativeTracks.length} collaborative filtering tracks`
    );

    // Gộp kết quả từ cả ba phương pháp
    const finalRecommendedTracks = [
      ...new Set([
        ...topPlayedTracks.map((t) => t.track), // Ưu tiên bài hát được nghe nhiều nhất
        ...recommendedTracks,
        ...collaborativeTracks.map((t) => t.track),
      ]),
    ].slice(0, 10); // Giữ tối đa 10 bài hát duy nhất

    if (finalRecommendedTracks.length === 0) {
      console.log(
        `[PlaylistService] No tracks found to update in Vibe Rewind for user ${userId}`
      );
      return;
    }

    // Clear existing tracks in the playlist
    await prisma.playlistTrack.deleteMany({
      where: {
        playlistId: vibeRewindPlaylist.id,
      },
    });

    // Add new tracks to the playlist
    const playlistTrackData = finalRecommendedTracks
      .filter(
        (track): track is NonNullable<typeof track> => track?.id !== undefined
      )
      .map((track, index) => ({
        playlistId: vibeRewindPlaylist.id,
        trackId: track.id,
        trackOrder: index,
      }));

    await prisma.$transaction([
      prisma.playlistTrack.createMany({
        data: playlistTrackData.filter(
          (track, index, self) =>
            self.findIndex(
              (t) =>
                t.playlistId === track.playlistId && t.trackId === track.trackId
            ) === index
        ),
      }),
      prisma.playlist.update({
        where: { id: vibeRewindPlaylist.id },
        data: {
          totalTracks: finalRecommendedTracks.length,
          totalDuration: finalRecommendedTracks.reduce(
            (sum, track) => sum + (track?.duration || 0),
            0
          ),
        },
      }),
    ]);

    console.log(
      `[PlaylistService] Successfully updated tracks for Vibe Rewind for user ${userId}`
    );
  } catch (error) {
    console.error(
      `[PlaylistService] Error updating tracks for Vibe Rewind for user ${userId}:`,
      error
    );
    throw error;
  }
};

// Danh sách các system playlist mặc định
const DEFAULT_SYSTEM_PLAYLISTS = [
  {
    name: 'Discover Weekly',
    description:
      "Discover new music we think you'll like based on your listening habits",
    type: 'SYSTEM' as const,
    privacy: 'PUBLIC' as const,
    coverUrl:
      'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1717339128/system/discover_weekly_pl.jpg',
    isAIGenerated: true,
  },
  {
    name: 'Release Radar',
    description:
      'Catch all the latest releases from artists you follow and more',
    type: 'SYSTEM' as const,
    privacy: 'PUBLIC' as const,
    coverUrl:
      'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1717339128/system/release_radar_pl.jpg',
    isAIGenerated: true,
  },
  {
    name: 'Daily Mix',
    description: 'A perfect mix of your favorites and new discoveries',
    type: 'SYSTEM' as const,
    privacy: 'PUBLIC' as const,
    coverUrl:
      'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1717339128/system/daily_mix_pl.jpg',
    isAIGenerated: true,
  },
];

// Tạo các system playlist mặc định (gọi khi khởi tạo hệ thống)
export const createDefaultSystemPlaylists = async (): Promise<void> => {
  try {
    for (const playlist of DEFAULT_SYSTEM_PLAYLISTS) {
      // Kiểm tra xem playlist đã tồn tại chưa
      const existingPlaylist = await prisma.playlist.findFirst({
        where: {
          name: playlist.name,
          userId: null, // System playlist không có user ID
          type: 'SYSTEM',
        },
      });

      if (!existingPlaylist) {
        await prisma.playlist.create({
          data: {
            name: playlist.name,
            description: playlist.description,
            privacy: playlist.privacy,
            type: 'SYSTEM',
            isAIGenerated: true,
            coverUrl: playlist.coverUrl,
            lastGeneratedAt: new Date(),
          },
        });
        console.log(
          `[PlaylistService] Created system playlist: ${playlist.name}`
        );
      } else if (!existingPlaylist.isAIGenerated) {
        // Update existing playlist to set isAIGenerated to true if it's not already
        await prisma.playlist.update({
          where: { id: existingPlaylist.id },
          data: { isAIGenerated: true },
        });
        console.log(
          `[PlaylistService] Updated system playlist: ${playlist.name} to set isAIGenerated flag`
        );
      }
    }
  } catch (error) {
    console.error('[PlaylistService] Error creating system playlists:', error);
    throw error;
  }
};

// Lấy recommendations cho một user cụ thể dựa trên lịch sử nghe
const getPersonalizedRecommendations = async (userId: string, limit = 20) => {
  // Lấy lịch sử nghe nhạc của user
  const userHistory = await prisma.history.findMany({
    where: {
      userId,
      type: 'PLAY',
      playCount: { gt: 0 }, // Chỉ lấy những bài đã được nghe
    },
    include: {
      track: {
        include: {
          artist: true,
          genres: { include: { genre: true } },
          album: true,
        },
      },
    },
    orderBy: { playCount: 'desc' },
    take: 50, // Lấy 50 bài gần đây nhất
  });

  // Nếu không có lịch sử, trả về các bài hát phổ biến
  if (userHistory.length === 0) {
    return prisma.track.findMany({
      where: { isActive: true },
      include: { artist: true, album: true },
      orderBy: { playCount: 'desc' },
      take: limit,
    });
  }

  // Xác định thể loại và nghệ sĩ yêu thích
  const genreCounts = new Map<string, number>();
  const artistCounts = new Map<string, number>();

  userHistory.forEach((history) => {
    const track = history.track;
    if (track) {
      track.genres.forEach((genreRel) => {
        const genreId = genreRel.genre.id;
        genreCounts.set(genreId, (genreCounts.get(genreId) || 0) + 1);
      });

      const artistId = track.artist?.id;
      if (artistId) {
        artistCounts.set(artistId, (artistCounts.get(artistId) || 0) + 1);
      }
    }
  });

  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((entry) => entry[0]);

  const topArtists = [...artistCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((entry) => entry[0]);

  // Lấy những bài hát thuộc thể loại yêu thích hoặc nghệ sĩ yêu thích
  const recommendations = await prisma.track.findMany({
    where: {
      AND: [
        { isActive: true },
        {
          OR: [
            { genres: { some: { genreId: { in: topGenres } } } },
            { artistId: { in: topArtists } },
          ],
        },
        // Loại bỏ các bài hát đã nghe
        {
          id: {
            notIn: userHistory
              .map((h) => h.trackId)
              .filter((id): id is string => id !== null),
          },
        },
      ],
    },
    include: {
      artist: true,
      album: true,
    },
    orderBy: { playCount: 'desc' },
    take: limit,
  });

  // Nếu không đủ khuyến nghị, thêm các bài hát phổ biến
  if (recommendations.length < limit) {
    const popularTracks = await prisma.track.findMany({
      where: {
        isActive: true,
        id: {
          notIn: [
            ...recommendations.map((t) => t.id),
            ...userHistory
              .map((h) => h.trackId)
              .filter((id): id is string => id !== null),
          ],
        },
      },
      include: { artist: true, album: true },
      orderBy: { playCount: 'desc' },
      take: limit - recommendations.length,
    });

    return [...recommendations, ...popularTracks];
  }

  return recommendations;
};

// Lấy các bài phát hành mới từ các nghệ sĩ mà user theo dõi
const getNewReleases = async (userId: string, limit = 20) => {
  // Lấy danh sách nghệ sĩ mà user theo dõi
  const followedArtists = await prisma.userFollow.findMany({
    where: {
      followerId: userId,
      followingType: 'ARTIST',
    },
    select: {
      followingArtistId: true,
    },
  });

  const artistIds = followedArtists
    .map((f) => f.followingArtistId)
    .filter((id): id is string => id !== null);

  // Nếu không theo dõi ai, lấy các release mới nhất nói chung
  if (artistIds.length === 0) {
    return prisma.track.findMany({
      where: {
        isActive: true,
        releaseDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 ngày trước
        },
      },
      include: { artist: true, album: true },
      orderBy: { releaseDate: 'desc' },
      take: limit,
    });
  }

  // Lấy các bản phát hành mới từ nghệ sĩ được theo dõi
  const followedArtistReleases = await prisma.track.findMany({
    where: {
      artistId: { in: artistIds },
      isActive: true,
      releaseDate: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 ngày trước
      },
    },
    include: { artist: true, album: true },
    orderBy: { releaseDate: 'desc' },
    take: limit,
  });

  // Nếu không đủ bài hát, bổ sung thêm bài hát mới từ các nghệ sĩ phổ biến
  if (followedArtistReleases.length < limit) {
    const otherNewReleases = await prisma.track.findMany({
      where: {
        artistId: { notIn: artistIds },
        isActive: true,
        releaseDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 ngày trước
        },
        id: { notIn: followedArtistReleases.map((t) => t.id) },
      },
      include: { artist: true, album: true },
      orderBy: { releaseDate: 'desc' },
      take: limit - followedArtistReleases.length,
    });

    return [...followedArtistReleases, ...otherNewReleases];
  }

  return followedArtistReleases;
};

// Lấy mix hàng ngày dựa trên thể loại và nghệ sĩ yêu thích
const getDailyMix = async (userId: string, limit = 20) => {
  // Lấy bài hát từ lịch sử nghe nhạc
  const userLikedTracks = await prisma.userLikeTrack.findMany({
    where: { userId },
    include: {
      track: {
        include: {
          artist: true,
          genres: { include: { genre: true } },
        },
      },
    },
    take: 50,
  });

  const userPlayHistory = await prisma.history.findMany({
    where: {
      userId,
      type: 'PLAY',
      playCount: { gt: 2 },
    },
    include: {
      track: {
        include: {
          artist: true,
          genres: { include: { genre: true } },
        },
      },
    },
    orderBy: { playCount: 'desc' },
    take: 50,
  });

  // Nếu không có lịch sử, trả về các bài hát phổ biến
  if (userPlayHistory.length === 0 && userLikedTracks.length === 0) {
    return prisma.track.findMany({
      where: { isActive: true },
      include: { artist: true, album: true },
      orderBy: { playCount: 'desc' },
      take: limit,
    });
  }

  // Xây dựng danh sách tracks để phân tích
  const tracksToAnalyze = [
    ...userLikedTracks
      .map((t) => t.track)
      .filter((track): track is NonNullable<typeof track> => !!track),
    ...userPlayHistory
      .map((h) => h.track)
      .filter((track): track is NonNullable<typeof track> => !!track),
  ];

  // Xác định thể loại và nghệ sĩ yêu thích
  const genreCounts = new Map<string, number>();
  const artistCounts = new Map<string, number>();

  tracksToAnalyze.forEach((track) => {
    if (track) {
      track.genres.forEach((genreRel) => {
        const genreId = genreRel.genre.id;
        genreCounts.set(genreId, (genreCounts.get(genreId) || 0) + 1);
      });

      const artistId = track.artist?.id;
      if (artistId) {
        artistCounts.set(artistId, (artistCounts.get(artistId) || 0) + 1);
      }
    }
  });

  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((entry) => entry[0]);

  const topArtists = [...artistCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((entry) => entry[0]);

  // 50% bài hát từ nghệ sĩ yêu thích, 50% từ thể loại tương tự
  const favoriteTracks = await prisma.track.findMany({
    where: {
      artistId: { in: topArtists },
      isActive: true,
      id: {
        notIn: tracksToAnalyze
          .map((t) => t.id)
          .filter((id): id is string => id !== undefined),
      },
    },
    include: { artist: true, album: true },
    orderBy: [{ playCount: 'desc' }],
    take: Math.ceil(limit / 2),
  });

  const similarGenreTracks = await prisma.track.findMany({
    where: {
      genres: { some: { genreId: { in: topGenres } } },
      artistId: { notIn: topArtists }, // Tránh trùng lặp với nghệ sĩ yêu thích
      isActive: true,
      id: {
        notIn: [
          ...favoriteTracks.map((t) => t.id),
          ...tracksToAnalyze
            .map((t) => t.id)
            .filter((id): id is string => id !== undefined),
        ],
      },
    },
    include: { artist: true, album: true },
    orderBy: { playCount: 'desc' },
    take: Math.floor(limit / 2),
  });

  // Trộn ngẫu nhiên bài hát
  const mixedTracks = [...favoriteTracks, ...similarGenreTracks];
  for (let i = mixedTracks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mixedTracks[i], mixedTracks[j]] = [mixedTracks[j], mixedTracks[i]];
  }

  return mixedTracks;
};

// Cập nhật System Playlist cho một user cụ thể
export const updateSystemPlaylistForUser = async (
  systemPlaylistName: string,
  userId: string
): Promise<void> => {
  try {
    // Tìm system playlist gốc (template)
    const templatePlaylist = await prisma.playlist.findFirst({
      where: {
        name: systemPlaylistName,
        type: 'SYSTEM',
        userId: null,
      },
    });

    if (!templatePlaylist) {
      console.error(
        `[PlaylistService] System playlist ${systemPlaylistName} not found`
      );
      return;
    }

    // Tìm hoặc tạo playlist cá nhân hóa cho user
    let userPlaylist = await prisma.playlist.findFirst({
      where: {
        name: systemPlaylistName,
        type: 'SYSTEM',
        userId: userId,
      },
    });

    // Nếu không tìm thấy, tạo bản sao cho user
    if (!userPlaylist) {
      userPlaylist = await prisma.playlist.create({
        data: {
          name: templatePlaylist.name,
          description: templatePlaylist.description,
          privacy: templatePlaylist.privacy,
          type: 'SYSTEM',
          isAIGenerated: true,
          coverUrl: templatePlaylist.coverUrl,
          userId: userId,
          lastGeneratedAt: new Date(),
        },
      });
      console.log(
        `[PlaylistService] Created personalized system playlist "${systemPlaylistName}" for user ${userId}`
      );
    }

    // Lấy tracks tùy thuộc vào loại playlist
    let tracks;
    switch (systemPlaylistName) {
      case 'Discover Weekly':
        tracks = await getPersonalizedRecommendations(userId, 30);
        break;
      case 'Release Radar':
        tracks = await getNewReleases(userId, 30);
        break;
      case 'Daily Mix':
        tracks = await getDailyMix(userId, 30);
        break;
      default:
        tracks = await getPersonalizedRecommendations(userId, 30);
    }

    if (!tracks || tracks.length === 0) {
      console.log(
        `[PlaylistService] No tracks found for ${systemPlaylistName} for user ${userId}`
      );
      return;
    }

    // Xóa tất cả các track hiện tại trong playlist cá nhân hóa
    await prisma.playlistTrack.deleteMany({
      where: {
        playlistId: userPlaylist.id,
      },
    });

    // Thêm tracks mới (đảm bảo không trùng lặp)
    const playlistTrackData = tracks.map((track, index) => ({
      playlistId: userPlaylist.id,
      trackId: track.id,
      trackOrder: index,
    }));

    // Lọc bỏ các track trùng lặp
    const uniqueTrackData = playlistTrackData.filter(
      (track, index, self) =>
        self.findIndex(
          (t) =>
            t.playlistId === track.playlistId && t.trackId === track.trackId
        ) === index
    );

    await prisma.$transaction([
      prisma.playlistTrack.createMany({
        data: uniqueTrackData,
      }),
      prisma.playlist.update({
        where: { id: userPlaylist.id },
        data: {
          totalTracks: tracks.length,
          totalDuration: tracks.reduce(
            (sum, track) => sum + (track?.duration || 0),
            0
          ),
          lastGeneratedAt: new Date(),
        },
      }),
    ]);

    console.log(
      `[PlaylistService] Successfully updated ${tracks.length} tracks for ${systemPlaylistName} for user ${userId}`
    );
  } catch (error) {
    console.error(
      `[PlaylistService] Error updating tracks for ${systemPlaylistName} for user ${userId}:`,
      error
    );
    throw error;
  }
};

// Lấy System Playlist đã được cá nhân hóa cho một user
export const getPersonalizedSystemPlaylist = async (
  systemPlaylistName: string,
  userId: string
) => {
  try {
    // Tìm playlist cá nhân hóa của user trước
    let userPlaylist = await prisma.playlist.findFirst({
      where: {
        name: systemPlaylistName,
        type: 'SYSTEM',
        userId: userId,
      },
      include: {
        tracks: {
          include: {
            track: {
              include: {
                artist: true,
                album: true,
                genres: {
                  include: {
                    genre: true,
                  },
                },
              },
            },
          },
          orderBy: {
            trackOrder: 'asc',
          },
        },
      },
    });

    // Nếu user chưa có playlist này, hoặc playlist này chưa có tracks hoặc cần cập nhật
    if (!userPlaylist || userPlaylist.tracks.length === 0) {
      console.log(
        `[PlaylistService] User ${userId} doesn't have playlist "${systemPlaylistName}" yet or it's empty. Creating and populating...`
      );

      // Tạo và cập nhật playlist cho user
      await updateSystemPlaylistForUser(systemPlaylistName, userId);

      // Lấy lại playlist sau khi cập nhật
      userPlaylist = await prisma.playlist.findFirst({
        where: {
          name: systemPlaylistName,
          type: 'SYSTEM',
          userId: userId,
        },
        include: {
          tracks: {
            include: {
              track: {
                include: {
                  artist: true,
                  album: true,
                  genres: {
                    include: {
                      genre: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              trackOrder: 'asc',
            },
          },
        },
      });
    } else {
      // Kiểm tra xem playlist có cần cập nhật không (24 giờ)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const needsRefresh =
        !userPlaylist.lastGeneratedAt ||
        userPlaylist.lastGeneratedAt < oneDayAgo;

      if (needsRefresh) {
        console.log(
          `[PlaylistService] Refreshing system playlist "${systemPlaylistName}" for user ${userId}`
        );
        try {
          await updateSystemPlaylistForUser(systemPlaylistName, userId);

          // Lấy lại playlist sau khi cập nhật
          userPlaylist = await prisma.playlist.findFirst({
            where: {
              name: systemPlaylistName,
              type: 'SYSTEM',
              userId: userId,
            },
            include: {
              tracks: {
                include: {
                  track: {
                    include: {
                      artist: true,
                      album: true,
                      genres: {
                        include: {
                          genre: true,
                        },
                      },
                    },
                  },
                },
                orderBy: {
                  trackOrder: 'asc',
                },
              },
            },
          });
        } catch (error) {
          console.error(
            `[PlaylistService] Error refreshing system playlist: ${error}`
          );
          // Return existing playlist even if refresh failed
        }
      }
    }

    return userPlaylist;
  } catch (error) {
    console.error(
      `[PlaylistService] Error getting personalized system playlist:`,
      error
    );
    throw error;
  }
};

// Cập nhật tất cả system playlists cho tất cả user
export const updateAllSystemPlaylists = async (): Promise<{
  success: boolean;
  errors: any[];
}> => {
  try {
    // Lấy danh sách tất cả users
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    // Lấy danh sách system playlists
    const systemPlaylists = await prisma.playlist.findMany({
      where: { type: 'SYSTEM', userId: null },
      select: { name: true },
    });

    console.log(
      `[PlaylistService] Updating system playlists for ${users.length} users`
    );

    // Danh sách lỗi để theo dõi
    const errors: Array<{
      userId: string;
      playlistName: string;
      error: string;
    }> = [];

    // Cập nhật từng playlist cho từng user
    for (const user of users) {
      for (const playlist of systemPlaylists) {
        try {
          await updateSystemPlaylistForUser(playlist.name, user.id);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(
            `[PlaylistService] Error updating ${playlist.name} for user ${user.id}: ${errorMessage}`
          );
          errors.push({
            userId: user.id,
            playlistName: playlist.name,
            error: errorMessage,
          });
          // Continue with next playlist/user despite this error
        }
      }
    }

    if (errors.length === 0) {
      console.log(
        `[PlaylistService] Successfully updated all system playlists`
      );
      return { success: true, errors: [] };
    } else {
      console.error(`[PlaylistService] Completed with ${errors.length} errors`);
      return { success: false, errors };
    }
  } catch (error) {
    console.error(
      '[PlaylistService] Error updating all system playlists:',
      error
    );
    return {
      success: false,
      errors: [
        { global: error instanceof Error ? error.message : String(error) },
      ],
    };
  }
};
