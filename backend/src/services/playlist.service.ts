import prisma from '../config/db';
import { Playlist } from '@prisma/client';
import { Matrix } from 'ml-matrix';

// Các hằng số cho playlist hệ thống
const SYSTEM_PLAYLIST_TYPES = {
  TOP_HITS: 'TOP_HITS',
  NEW_RELEASES: 'NEW_RELEASES',
  GENRE_BASED: 'GENRE_BASED',
  MOOD_BASED: 'MOOD_BASED',
  DISCOVER_WEEKLY: 'DISCOVER_WEEKLY',
  TIME_CAPSULE: 'TIME_CAPSULE',
};

// Map tên hiển thị cho các loại playlist hệ thống
const SYSTEM_PLAYLIST_NAMES = {
  [SYSTEM_PLAYLIST_TYPES.TOP_HITS]: 'Soundwave Hits: Trending Right Now',
  [SYSTEM_PLAYLIST_TYPES.NEW_RELEASES]: 'Soundwave Fresh: New Releases',
  [SYSTEM_PLAYLIST_TYPES.GENRE_BASED]: 'Soundwave Genre Mix',
  [SYSTEM_PLAYLIST_TYPES.MOOD_BASED]: 'Soundwave Mood Mix',
  [SYSTEM_PLAYLIST_TYPES.DISCOVER_WEEKLY]: 'Discover Weekly',
  [SYSTEM_PLAYLIST_TYPES.TIME_CAPSULE]: 'Your Time Capsule',
};

/**
 * Tạo và quản lý tất cả các playlist hệ thống
 */
export class SystemPlaylistService {
  /**
   * Tạo tất cả các playlist hệ thống cho người dùng mới
   * @param userId ID của người dùng mới
   */
  async initializeForNewUser(userId: string): Promise<void> {
    try {
      console.log(
        `[SystemPlaylistService] Initializing playlists for new user: ${userId}`
      );

      // Kiểm tra người dùng tồn tại
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Thực hiện các tác vụ song song để tăng hiệu suất
      await Promise.all([
        // 1. Connect user to global TOP_HITS playlist
        this.connectUserToGlobalPlaylist(
          userId,
          SYSTEM_PLAYLIST_TYPES.TOP_HITS
        ),

        // 2. Create personalized DISCOVER_WEEKLY playlist
        this.createDiscoverWeeklyPlaylist(userId),

        // 3. Create personalized NEW_RELEASES playlist
        this.createNewReleasesPlaylist(userId),
      ]);

      console.log(
        `[SystemPlaylistService] Successfully initialized playlists for user: ${userId}`
      );
    } catch (error) {
      console.error(
        `[SystemPlaylistService] Error initializing playlists for user ${userId}:`,
        error
      );
      throw new Error(`Failed to initialize playlists for new user: ${error}`);
    }
  }

  /**
   * Kết nối người dùng với playlist toàn cầu có sẵn
   */
  async connectUserToGlobalPlaylist(
    userId: string,
    playlistType: string
  ): Promise<void> {
    try {
      // Tìm playlist toàn cầu theo loại
      const globalPlaylist = await prisma.playlist.findFirst({
        where: {
          name: SYSTEM_PLAYLIST_NAMES[playlistType],
          type: 'SYSTEM',
        },
      });

      if (!globalPlaylist) {
        console.log(
          `[SystemPlaylistService] Global ${playlistType} playlist not found, creating it...`
        );
        await this.createOrUpdateGlobalPlaylist(playlistType);
        return this.connectUserToGlobalPlaylist(userId, playlistType); // Gọi lại để kết nối sau khi tạo
      }

      // Không cần tạo UserPlaylist vì user có thể truy cập trực tiếp
      console.log(
        `[SystemPlaylistService] Connected user ${userId} to global ${playlistType} playlist`
      );
    } catch (error) {
      console.error(
        `[SystemPlaylistService] Error connecting user to global playlist:`,
        error
      );
    }
  }

  /**
   * Tạo Discover Weekly playlist cá nhân hóa cho người dùng
   */
  async createDiscoverWeeklyPlaylist(userId: string): Promise<Playlist | null> {
    try {
      // Kiểm tra xem đã có playlist này chưa
      const existingPlaylist = await prisma.playlist.findFirst({
        where: {
          userId,
          name: SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.DISCOVER_WEEKLY],
          type: 'SYSTEM',
        },
      });

      if (existingPlaylist) {
        // Nếu đã tồn tại, cập nhật nội dung
        await this.updateDiscoverWeeklyPlaylist(existingPlaylist.id);
        return existingPlaylist;
      }

      // Tạo playlist mới cho user này
      const playlist = await prisma.playlist.create({
        data: {
          name: SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.DISCOVER_WEEKLY],
          description:
            'Khám phá những bài hát mới được cá nhân hóa dành riêng cho bạn. Cập nhật hàng tuần vào Thứ Hai.',
          type: 'SYSTEM',
          privacy: 'PUBLIC',
          userId,
          coverUrl:
            'https://newjams-images.scdn.co/image/ab676477000033ad/dt/v3/discover-weekly/4O2moMBFA5GYrAnwXLtFDVEVPCc0WhFTI0aWB3b9bpDcL3CQ4dzOmLlizDEvd4Ia0o3B5vUTT-1pD72G0LDfyGH-CQi5qH97BppF-pQ82ww=/NzQ6ODA6NzBUNDAtNDAtNQ==',
        },
      });

      // Cập nhật nội dung cho playlist mới tạo
      await this.updateDiscoverWeeklyPlaylist(playlist.id);

      return playlist;
    } catch (error) {
      console.error(
        `[SystemPlaylistService] Error creating Discover Weekly playlist:`,
        error
      );
      return null;
    }
  }

  /**
   * Cập nhật nội dung cho Discover Weekly playlist
   */
  async updateDiscoverWeeklyPlaylist(playlistId: string): Promise<void> {
    try {
      // Lấy thông tin playlist
      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        include: { tracks: true },
      });

      if (!playlist) {
        throw new Error(`Playlist with ID ${playlistId} not found`);
      }

      // Xóa tracks hiện tại
      await prisma.playlistTrack.deleteMany({
        where: { playlistId },
      });

      // Tạo recommendations dựa trên sở thích người dùng
      const recommendedTracks = await getRecommendedTracks(
        playlist.userId,
        30,
        {
          includeTopTracks: false, // Không lấy top hits phổ biến
          includeNewReleases: true, // Ưu tiên bài hát mới
        }
      );

      if (recommendedTracks.length > 0) {
        // Tạo mảng dữ liệu để thêm vào một lần
        const playlistTrackData = recommendedTracks.map((track, index) => ({
          playlistId,
          trackId: track.id,
          trackOrder: index,
        }));

        // Thêm tracks mới vào playlist trong một lần chạy transaction
        await prisma.$transaction([
          prisma.playlistTrack.createMany({
            data: playlistTrackData,
          }),
          prisma.playlist.update({
            where: { id: playlistId },
            data: {
              totalTracks: recommendedTracks.length,
              totalDuration: recommendedTracks.reduce(
                (sum, track) => sum + (track.duration || 0),
                0
              ),
              updatedAt: new Date(),
            },
          }),
        ]);
      } else {
        // Cập nhật thông tin playlist nếu không có tracks
        await prisma.playlist.update({
          where: { id: playlistId },
          data: {
            totalTracks: 0,
            totalDuration: 0,
            updatedAt: new Date(),
          },
        });
      }

      console.log(
        `[SystemPlaylistService] Updated Discover Weekly playlist: ${playlistId}`
      );
    } catch (error) {
      console.error(
        `[SystemPlaylistService] Error updating Discover Weekly playlist:`,
        error
      );
    }
  }

  /**
   * Tạo New Releases playlist cá nhân hóa cho người dùng
   */
  async createNewReleasesPlaylist(userId: string): Promise<Playlist | null> {
    try {
      // Kiểm tra xem đã có playlist này chưa
      const existingPlaylist = await prisma.playlist.findFirst({
        where: {
          userId,
          name: SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.NEW_RELEASES],
          type: 'SYSTEM',
        },
      });

      if (existingPlaylist) {
        // Nếu đã tồn tại, cập nhật nội dung
        await this.updateNewReleasesPlaylist(existingPlaylist.id);
        return existingPlaylist;
      }

      // Tạo playlist mới cho user này
      const playlist = await prisma.playlist.create({
        data: {
          name: SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.NEW_RELEASES],
          description:
            'Những bản phát hành mới nhất từ các nghệ sĩ mà bạn yêu thích và có thể sẽ thích. Cập nhật hàng tuần vào Thứ Sáu.',
          type: 'SYSTEM',
          privacy: 'PUBLIC',
          userId,
          coverUrl:
            'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742551340/testAlbum/cv6rm3txh8beiln4x5u1.jpg',
        },
      });

      // Cập nhật nội dung cho playlist mới tạo
      await this.updateNewReleasesPlaylist(playlist.id);

      return playlist;
    } catch (error) {
      console.error(
        `[SystemPlaylistService] Error creating New Releases playlist:`,
        error
      );
      return null;
    }
  }

  /**
   * Cập nhật nội dung cho New Releases playlist
   */
  async updateNewReleasesPlaylist(playlistId: string): Promise<void> {
    try {
      // Lấy thông tin playlist
      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        include: { user: true, tracks: true },
      });

      if (!playlist) {
        throw new Error(`Playlist with ID ${playlistId} not found`);
      }

      // Xóa tracks hiện tại
      await prisma.playlistTrack.deleteMany({
        where: { playlistId },
      });

      // Lấy danh sách nghệ sĩ mà người dùng thích nghe
      const userHistory = await prisma.history.findMany({
        where: {
          userId: playlist.userId,
          type: 'PLAY',
        },
        include: {
          track: {
            include: {
              artist: true,
            },
          },
        },
      });

      // Đếm số lần xuất hiện từng nghệ sĩ
      const artistCounts = new Map<string, number>();
      userHistory.forEach((history) => {
        if (history.track?.artistId) {
          const artistId = history.track.artistId;
          artistCounts.set(artistId, (artistCounts.get(artistId) || 0) + 1);
        }
      });

      // Sắp xếp nghệ sĩ theo mức độ ưa thích
      const favoriteArtistIds = [...artistCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map((entry) => entry[0]);

      // Tìm các bài hát mới ra mắt (trong 30 ngày gần đây)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newReleases = await prisma.track.findMany({
        where: {
          releaseDate: {
            gte: thirtyDaysAgo,
          },
          isActive: true,
          OR: [
            // Ưu tiên từ nghệ sĩ yêu thích
            { artistId: { in: favoriteArtistIds } },
            // Nếu không đủ, lấy các release mới nhất
            { releaseDate: { gte: thirtyDaysAgo } },
          ],
        },
        orderBy: [
          // Sắp xếp ưu tiên: nghệ sĩ yêu thích -> ngày phát hành gần nhất
          { releaseDate: 'desc' },
        ],
        include: {
          artist: true,
          album: true,
        },
        take: 30,
      });

      if (newReleases.length > 0) {
        // Tạo mảng dữ liệu để thêm vào một lần
        const playlistTrackData = newReleases.map((track, index) => ({
          playlistId,
          trackId: track.id,
          trackOrder: index,
        }));

        // Thêm tracks mới và cập nhật thông tin playlist trong một transaction
        await prisma.$transaction([
          prisma.playlistTrack.createMany({
            data: playlistTrackData,
          }),
          prisma.playlist.update({
            where: { id: playlistId },
            data: {
              totalTracks: newReleases.length,
              totalDuration: newReleases.reduce(
                (sum, track) => sum + (track.duration || 0),
                0
              ),
              updatedAt: new Date(),
            },
          }),
        ]);
      } else {
        // Cập nhật nếu không có bài hát mới
        await prisma.playlist.update({
          where: { id: playlistId },
          data: {
            totalTracks: 0,
            totalDuration: 0,
            updatedAt: new Date(),
          },
        });
      }

      console.log(
        `[SystemPlaylistService] Updated New Releases playlist: ${playlistId}`
      );
    } catch (error) {
      console.error(
        `[SystemPlaylistService] Error updating New Releases playlist:`,
        error
      );
    }
  }

  /**
   * Tạo hoặc cập nhật playlist toàn cầu
   */
  async createOrUpdateGlobalPlaylist(
    playlistType: string
  ): Promise<Playlist | null> {
    try {
      // Tìm playlist hiện có
      const existingPlaylist = await prisma.playlist.findFirst({
        where: {
          name: SYSTEM_PLAYLIST_NAMES[playlistType],
          type: 'SYSTEM',
        },
      });

      if (existingPlaylist) {
        // Cập nhật playlist hiện có
        return await this.updateGlobalPlaylistContent(
          existingPlaylist.id,
          playlistType
        );
      }

      // Tìm admin user để gán ownership
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });

      if (!adminUser) {
        throw new Error(
          'No admin user found to assign global playlist ownership'
        );
      }

      // Tạo playlist mới
      const playlist = await prisma.playlist.create({
        data: {
          name: SYSTEM_PLAYLIST_NAMES[playlistType],
          description: this.getPlaylistDescription(playlistType),
          type: 'SYSTEM',
          privacy: 'PUBLIC',
          userId: adminUser.id,
          coverUrl: this.getPlaylistCoverUrl(playlistType),
        },
      });

      // Cập nhật nội dung
      return await this.updateGlobalPlaylistContent(playlist.id, playlistType);
    } catch (error) {
      console.error(
        `[SystemPlaylistService] Error creating global playlist:`,
        error
      );
      return null;
    }
  }

  /**
   * Cập nhật nội dung cho global playlist dựa trên loại
   */
  async updateGlobalPlaylistContent(
    playlistId: string,
    playlistType: string
  ): Promise<Playlist | null> {
    try {
      // Xóa tracks hiện tại
      await prisma.playlistTrack.deleteMany({
        where: { playlistId },
      });

      let tracks: any[] = [];

      // Tùy theo loại playlist mà lấy các bài hát khác nhau
      switch (playlistType) {
        case SYSTEM_PLAYLIST_TYPES.TOP_HITS:
          // Sử dụng hàm có sẵn để tạo top hits
          const recommendations = await generateGlobalRecommendedPlaylist(30);
          tracks = recommendations.tracks;
          break;

        case SYSTEM_PLAYLIST_TYPES.NEW_RELEASES:
          // Lấy các bài hát mới phát hành trong 14 ngày qua
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

          tracks = await prisma.track.findMany({
            where: {
              releaseDate: { gte: twoWeeksAgo },
              isActive: true,
            },
            orderBy: { releaseDate: 'desc' },
            include: {
              artist: true,
              album: true,
            },
            take: 30,
          });
          break;
      }

      if (tracks.length > 0) {
        // Tạo dữ liệu cho việc thêm nhiều track cùng lúc
        const playlistTrackData = tracks.map((track, index) => ({
          playlistId,
          trackId: track.id,
          trackOrder: index,
        }));

        // Thực hiện transaction để đảm bảo tính nhất quán dữ liệu
        await prisma.$transaction([
          prisma.playlistTrack.createMany({
            data: playlistTrackData,
          }),
          prisma.playlist.update({
            where: { id: playlistId },
            data: {
              totalTracks: tracks.length,
              totalDuration: tracks.reduce(
                (sum, track) => sum + (track.duration || 0),
                0
              ),
              updatedAt: new Date(),
            },
          }),
        ]);
      } else {
        // Cập nhật nếu không có tracks
        await prisma.playlist.update({
          where: { id: playlistId },
          data: {
            totalTracks: 0,
            totalDuration: 0,
            updatedAt: new Date(),
          },
        });
      }

      // Lấy playlist đã cập nhật cùng với các tracks
      const updatedPlaylist = await prisma.playlist.findUnique({
        where: { id: playlistId },
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

      console.log(
        `[SystemPlaylistService] Updated ${playlistType} global playlist: ${playlistId}`
      );
      return updatedPlaylist;
    } catch (error) {
      console.error(
        `[SystemPlaylistService] Error updating global playlist content:`,
        error
      );
      return null;
    }
  }

  /**
   * Cập nhật tất cả các playlist hệ thống cho tất cả user
   */
  async updateAllSystemPlaylists(): Promise<void> {
    try {
      console.log(
        `[SystemPlaylistService] Starting update of all system playlists`
      );

      // 1. Cập nhật các playlist toàn cầu
      const globalPlaylistPromises = [
        this.createOrUpdateGlobalPlaylist(SYSTEM_PLAYLIST_TYPES.TOP_HITS),
        this.createOrUpdateGlobalPlaylist(SYSTEM_PLAYLIST_TYPES.NEW_RELEASES),
      ];

      await Promise.all(globalPlaylistPromises);

      // 2. Cập nhật các playlist cá nhân hóa
      const userPlaylists = await prisma.playlist.findMany({
        where: {
          type: 'SYSTEM',
          OR: [
            {
              name: SYSTEM_PLAYLIST_NAMES[
                SYSTEM_PLAYLIST_TYPES.DISCOVER_WEEKLY
              ],
            },
            { name: SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.NEW_RELEASES] },
          ],
        },
      });

      // Chia playlists thành các batch để không quá tải server
      const batchSize = 10;
      for (let i = 0; i < userPlaylists.length; i += batchSize) {
        const batch = userPlaylists.slice(i, i + batchSize);

        // Xử lý song song các playlist trong batch
        await Promise.all(
          batch.map((playlist) => {
            if (
              playlist.name ===
              SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.DISCOVER_WEEKLY]
            ) {
              return this.updateDiscoverWeeklyPlaylist(playlist.id);
            } else if (
              playlist.name ===
              SYSTEM_PLAYLIST_NAMES[SYSTEM_PLAYLIST_TYPES.NEW_RELEASES]
            ) {
              return this.updateNewReleasesPlaylist(playlist.id);
            }
          })
        );
      }

      console.log(
        `[SystemPlaylistService] Completed update of all system playlists`
      );
    } catch (error) {
      console.error(
        `[SystemPlaylistService] Error updating all system playlists:`,
        error
      );
      throw new Error(`Failed to update all system playlists: ${error}`);
    }
  }

  /**
   * Lấy mô tả cho playlist dựa trên loại
   */
  private getPlaylistDescription(playlistType: string): string {
    switch (playlistType) {
      case SYSTEM_PLAYLIST_TYPES.TOP_HITS:
        return 'Những bài hát được yêu thích nhất hiện nay trên nền tảng Soundwave, được cập nhật tự động dựa trên hoạt động nghe nhạc của cộng đồng.';
      case SYSTEM_PLAYLIST_TYPES.NEW_RELEASES:
        return 'Những bản phát hành mới nhất và hot nhất trên nền tảng Soundwave. Cập nhật hàng tuần vào Thứ Sáu.';
      case SYSTEM_PLAYLIST_TYPES.GENRE_BASED:
        return 'Collection of tracks based on your favorite genres.';
      case SYSTEM_PLAYLIST_TYPES.MOOD_BASED:
        return 'Music tuned to your current mood.';
      default:
        return 'A playlist curated by Soundwave.';
    }
  }

  /**
   * Lấy URL hình ảnh bìa cho playlist dựa trên loại
   */
  private getPlaylistCoverUrl(playlistType: string): string {
    switch (playlistType) {
      case SYSTEM_PLAYLIST_TYPES.TOP_HITS:
        return 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png';
      case SYSTEM_PLAYLIST_TYPES.NEW_RELEASES:
        return 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742551340/testAlbum/cv6rm3txh8beiln4x5u1.jpg';
      case SYSTEM_PLAYLIST_TYPES.DISCOVER_WEEKLY:
        return 'https://newjams-images.scdn.co/image/ab676477000033ad/dt/v3/discover-weekly/4O2moMBFA5GYrAnwXLtFDVEVPCc0WhFTI0aWB3b9bpDcL3CQ4dzOmLlizDEvd4Ia0o3B5vUTT-1pD72G0LDfyGH-CQi5qH97BppF-pQ82ww=/NzQ6ODA6NzBUNDAtNDAtNQ==';
      default:
        return 'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png';
    }
  }
}

// Singleton instance
export const systemPlaylistService = new SystemPlaylistService();

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

    if (recommendedTracks.length > 0) {
      // 3. Chuẩn bị dữ liệu cho việc thêm nhiều track cùng lúc
      const playlistTrackData = recommendedTracks.map((track, index) => ({
        playlistId: playlist.id,
        trackId: track.id,
        trackOrder: index,
      }));

      // Tính tổng thời lượng
      const totalDuration = recommendedTracks.reduce(
        (sum, track) => sum + (track.duration || 0),
        0
      );

      // Thực hiện transaction để đảm bảo tính nhất quán
      await prisma.$transaction([
        prisma.playlistTrack.createMany({
          data: playlistTrackData,
        }),
        prisma.playlist.update({
          where: { id: playlist.id },
          data: {
            totalTracks: recommendedTracks.length,
            totalDuration,
          },
        }),
      ]);
    }

    // 4. Trả về playlist đã cập nhật với đầy đủ thông tin
    const updatedPlaylist = await prisma.playlist.findUnique({
      where: { id: playlist.id },
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

    if (!updatedPlaylist) {
      throw new Error('Failed to retrieve updated playlist');
    }

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
    const [userHistory, userLikes] = await Promise.all([
      prisma.history.findMany({
        where: {
          userId,
          type: 'PLAY',
          trackId: { not: null },
        },
        select: { trackId: true, playCount: true },
      }),
      prisma.userLikeTrack.findMany({
        where: { userId },
        select: { trackId: true },
      }),
    ]);

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
        userTrackInteractions.set(l.trackId, currentScore + 5); // Tăng trọng số cho like từ 3 lên 5
      }
    });

    // Phân tích artist preferences để phân bổ kết quả theo tỷ lệ
    const artistInteractions = new Map<string, number>();
    const trackArtists = await prisma.track.findMany({
      where: {
        id: { in: Array.from(interactedTrackIds) },
      },
      select: {
        id: true,
        artistId: true,
      },
    });

    // Build map of artist preferences based on play counts and likes
    trackArtists.forEach((track) => {
      if (track.artistId) {
        const interactionStrength = userTrackInteractions.get(track.id) || 0;
        const currentCount = artistInteractions.get(track.artistId) || 0;
        artistInteractions.set(
          track.artistId,
          currentCount + interactionStrength
        );
      }
    });

    // Kết hợp các phương pháp gợi ý
    let recommendedTracks: any[] = [];

    // Điều chỉnh tỷ lệ phân bổ từ các phương pháp khác nhau dựa trên lượng tương tác
    // Tính toán tổng interaction score để đánh giá mức độ tương tác
    const totalInteractionScore = Array.from(
      userTrackInteractions.values()
    ).reduce((sum, score) => sum + score, 0);
    const hasEnoughInteractions = interactedTrackIds.size >= 3; // Giảm ngưỡng từ 5 xuống 3
    const hasStrongPreferences = totalInteractionScore >= 20; // New metric to check if user has strong preferences

    // 1. Matrix Factorization (kỹ thuật chính của Spotify) - tăng tỷ lệ khi có strong preferences
    const matrixLimit = hasEnoughInteractions
      ? hasStrongPreferences
        ? Math.ceil(limit * 0.7)
        : Math.ceil(limit * 0.6) // Tăng lên 70% nếu có strong preferences
      : Math.ceil(limit * 0.4); // Tăng từ 30% lên 40% khi ít dữ liệu

    const matrixRecommendations = await getMatrixFactorizationRecommendations(
      userId,
      Array.from(interactedTrackIds),
      userTrackInteractions,
      matrixLimit,
      options
    );

    recommendedTracks.push(...matrixRecommendations);

    // 2. Item-based Collaborative Filtering (tìm bài hát tương tự)
    if (recommendedTracks.length < limit) {
      const itemBasedLimit = hasEnoughInteractions
        ? limit - recommendedTracks.length
        : Math.ceil((limit - recommendedTracks.length) * 0.6); // Giảm từ 0.7 xuống 0.6 để cân bằng hơn

      const itemBasedTracks = await getItemBasedRecommendations(
        userId,
        Array.from(interactedTrackIds),
        itemBasedLimit,
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

    // 4. Re-sort tracks by artist preference to ensure favorite artists appear earlier
    if (artistInteractions.size > 0 && recommendedTracks.length > 0) {
      recommendedTracks = recommendedTracks.sort((trackA, trackB) => {
        const artistScoreA = artistInteractions.get(trackA.artistId) || 0;
        const artistScoreB = artistInteractions.get(trackB.artistId) || 0;
        // If scores are very different, prioritize by artist score
        if (Math.abs(artistScoreA - artistScoreB) > 10) {
          return artistScoreB - artistScoreA;
        }
        // Otherwise maintain the original order (which includes diversity)
        return 0;
      });
    }

    // 5. Apply controlled shuffling with smaller segments for better diversity while preserving relevance
    if (recommendedTracks.length > 5) {
      // Chia danh sách thành các phần nhỏ hơn: top 30%, middle 50%, bottom 20%
      const topCount = Math.ceil(recommendedTracks.length * 0.3); // Increased from 20% to 30%
      const bottomCount = Math.floor(recommendedTracks.length * 0.2);
      const middleCount = recommendedTracks.length - topCount - bottomCount;

      // Giữ nguyên top tracks để đảm bảo tracks phù hợp nhất hiện đầu tiên
      const topTracks = recommendedTracks.slice(0, topCount);

      // Xáo trộn phần giữa thành 2-3 nhóm nhỏ để duy trì thứ tự tương đối
      let middleTracks = recommendedTracks.slice(
        topCount,
        topCount + middleCount
      );

      // Chia phần giữa thành 2 nhóm để shuffling có kiểm soát hơn
      const middleSegmentSize = Math.ceil(middleTracks.length / 2);
      const middleUpperTracks = shuffleArray(
        middleTracks.slice(0, middleSegmentSize)
      );
      const middleLowerTracks = shuffleArray(
        middleTracks.slice(middleSegmentSize)
      );
      middleTracks = [...middleUpperTracks, ...middleLowerTracks];

      // Giữ nguyên bottom tracks
      const bottomTracks = recommendedTracks.slice(topCount + middleCount);

      // Ghép lại
      recommendedTracks = [...topTracks, ...middleTracks, ...bottomTracks];
    }

    return recommendedTracks;
  } catch (error) {
    console.error('Error in getRecommendedTracks:', error);
    // Fallback to popular tracks if collaborative filtering fails
    return getPopularTracks([], limit, options);
  }
};

// Hàm trợ giúp để xáo trộn mảng (Fisher-Yates shuffle)
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

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
    // Lấy những user có lượt play > 5 bài để có đủ dữ liệu tính toán
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

    // Giảm min users từ 5 xuống 2 để hoạt động tốt hơn trong môi trường ít người dùng
    if (activeUserIds.length < 2) {
      console.log(
        'Not enough user data for matrix factorization, using user history for simple personalization'
      );

      // Nếu không đủ user, tìm kiếm bài hát tương tự dựa trên thể loại và nghệ sĩ mà người dùng đã nghe
      const userFavoriteGenres = await prisma.track.findMany({
        where: {
          id: { in: interactedTrackIds },
        },
        include: {
          genres: {
            include: {
              genre: true,
            },
          },
          artist: true,
        },
      });

      // Trích xuất thể loại và nghệ sĩ yêu thích
      const genreCounts = new Map<string, number>();
      const artistCounts = new Map<string, number>();

      userFavoriteGenres.forEach((track) => {
        // Đếm nghệ sĩ
        const artistId = track.artistId;
        artistCounts.set(
          artistId,
          (artistCounts.get(artistId) || 0) +
            (userTrackInteractions.get(track.id) || 1)
        );

        // Đếm thể loại
        track.genres.forEach((genreRel) => {
          const genreId = genreRel.genre.id;
          genreCounts.set(
            genreId,
            (genreCounts.get(genreId) || 0) +
              (userTrackInteractions.get(track.id) || 1)
          );
        });
      });

      // Sắp xếp và lấy top
      const topGenreIds = [...genreCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map((entry) => entry[0]);

      const topArtistIds = [...artistCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map((entry) => entry[0]);

      // Tìm bài hát tương tự dựa trên thể loại và nghệ sĩ yêu thích
      if (topGenreIds.length > 0 || topArtistIds.length > 0) {
        const personalizedTracks = await prisma.track.findMany({
          where: {
            id: { notIn: interactedTrackIds },
            isActive: true,
            OR: [
              topGenreIds.length > 0
                ? {
                    genres: {
                      some: {
                        genreId: { in: topGenreIds },
                      },
                    },
                  }
                : {},
              topArtistIds.length > 0 ? { artistId: { in: topArtistIds } } : {},
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
          orderBy: options.includeNewReleases
            ? [{ releaseDate: 'desc' }, { playCount: 'desc' }]
            : [{ playCount: 'desc' }],
          take: limit,
        });

        return personalizedTracks;
      }

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

/**
 * Tạo playlist đề xuất chung cho tất cả người dùng sử dụng Collaborative Filtering
 * với các cải tiến về scoring và đa dạng nội dung
 * @param limit Số lượng bài hát tối đa trong playlist
 * @returns Playlist chung cho tất cả người dùng
 */
export const generateGlobalRecommendedPlaylist = async (
  limit = 20
): Promise<any> => {
  try {
    console.log(
      '[PlaylistService] Starting global recommended playlist generation, limit:',
      limit
    );

    // 1. Lấy dữ liệu tương tác của người dùng
    console.log('[PlaylistService] Fetching user interactions data...');
    const [userHistories, userLikes, allTracks] = await Promise.all([
      prisma.history.findMany({
        where: {
          type: 'PLAY',
          trackId: { not: null },
          playCount: { gt: 0 },
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
      }),
      prisma.userLikeTrack.findMany({
        where: {},
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
      }),
      prisma.track.findMany({
        where: {
          isActive: true,
        },
        include: {
          genres: {
            include: {
              genre: true,
            },
          },
          artist: true,
        },
      }),
    ]);

    console.log(
      '[PlaylistService] Data fetched:',
      'userHistories:',
      userHistories.length,
      'userLikes:',
      userLikes.length,
      'allTracks:',
      allTracks.length
    );

    if (allTracks.length === 0) {
      console.log('[PlaylistService] No active tracks found in the database');
      return {
        name: '',
        description: '',
        tracks: [],
        totalTracks: 0,
        totalDuration: 0,
      };
    }

    // 2. Tính toán điểm số cho mỗi bài hát
    console.log('[PlaylistService] Calculating track scores...');
    const trackScores = new Map<
      string,
      {
        score: number;
        playCount: number;
        likeCount: number;
        completionRate: number;
        lastPlayed: Date;
        genres: Set<string>;
        artistId: string;
        track: any;
      }
    >();

    // Khởi tạo thông tin cơ bản cho mỗi bài hát
    allTracks.forEach((track) => {
      trackScores.set(track.id, {
        score: 0,
        playCount: 0,
        likeCount: 0,
        completionRate: 0.5, // Set default completionRate to 0.5 instead of 0
        lastPlayed: new Date(0),
        genres: new Set(track.genres.map((g) => g.genre.name)),
        artistId: track.artistId,
        track,
      });
    });

    // Xử lý lịch sử nghe
    console.log('[PlaylistService] Processing play history...');
    userHistories.forEach((history) => {
      if (!history.track) return;

      const trackInfo = trackScores.get(history.trackId!);
      if (!trackInfo) return;

      const daysAgo =
        (Date.now() - history.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const timeDecayFactor = Math.exp(-0.1 * daysAgo); // Giảm dần theo thời gian

      // Tính completion rate
      const completion =
        history.duration && history.track.duration
          ? Math.min(history.duration / history.track.duration, 1)
          : 0.5;

      trackInfo.playCount += history.playCount || 1;

      // Cập nhật completionRate chỉ khi có thông tin duration hợp lệ
      if (history.duration && history.track.duration) {
        trackInfo.completionRate =
          (trackInfo.completionRate * (trackInfo.playCount - 1) + completion) /
          trackInfo.playCount;
      }

      trackInfo.score +=
        (history.playCount || 1) * timeDecayFactor * (0.5 + 0.5 * completion);
      trackInfo.lastPlayed = new Date(
        Math.max(trackInfo.lastPlayed.getTime(), history.createdAt.getTime())
      );
    });

    // Update play count from track's own playCount - this is important for tracks that get plays
    // from anonymous users or users that don't have history recorded
    allTracks.forEach((track) => {
      const trackInfo = trackScores.get(track.id);
      if (trackInfo) {
        trackInfo.playCount = Math.max(trackInfo.playCount, track.playCount);
        // Add direct track playCount to score
        trackInfo.score += track.playCount;
      }
    });

    // Xử lý lượt like
    console.log('[PlaylistService] Processing likes...');
    userLikes.forEach((like) => {
      if (!like.track) return;

      const trackInfo = trackScores.get(like.trackId);
      if (!trackInfo) return;

      const daysAgo =
        (Date.now() - like.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const timeDecayFactor = Math.exp(-0.05 * daysAgo); // Giảm dần chậm hơn play count

      trackInfo.likeCount += 1;
      trackInfo.score += 3 * timeDecayFactor; // Like có trọng số cao hơn
    });

    // Log track scores for debugging
    console.log('[PlaylistService] Track scores summary:');
    const trackScoresList = Array.from(trackScores.entries());
    trackScoresList
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 10)
      .forEach(([trackId, info]) => {
        console.log(
          `Track: ${info.track.title} - PlayCount: ${
            info.playCount
          } - LikeCount: ${info.likeCount} - Score: ${info.score.toFixed(
            2
          )} - CompletionRate: ${info.completionRate.toFixed(2)}`
        );
      });

    // 3. Áp dụng các bộ lọc chất lượng - IMPROVED FILTERING LOGIC
    console.log('[PlaylistService] Applying quality filters...');

    // Thiết lập ngưỡng phổ biến dựa trên số lượng bài hát
    const popularity = {
      // Ngưỡng cao: Sử dụng cho trường hợp có nhiều bài hát phổ biến
      highPlayCount: 10, // Ít nhất 10 lượt nghe
      highLikeCount: 3, // Ít nhất 3 lượt thích
      highScore: 20, // Ít nhất điểm 20

      // Ngưỡng trung bình: Sử dụng khi ít bài hát đạt ngưỡng cao
      mediumPlayCount: 5, // Ít nhất 5 lượt nghe
      mediumLikeCount: 2, // Ít nhất 2 lượt thích
      mediumScore: 10, // Ít nhất điểm 10

      // Ngưỡng cơ bản: Chấp nhận mọi bài hát có tương tác
      minPlayCount: 1, // Ít nhất 1 lượt nghe
      minLikeCount: 1, // Ít nhất 1 lượt thích
    };

    // Lọc bài hát theo ngưỡng cao -> trung bình -> cơ bản, đảm bảo đủ số lượng bài hát
    // Thử lọc với ngưỡng cao trước
    let qualityTracks = trackScoresList.filter(
      ([_, info]) =>
        info.playCount >= popularity.highPlayCount ||
        info.likeCount >= popularity.highLikeCount ||
        info.score >= popularity.highScore
    );

    console.log(
      '[PlaylistService] Tracks after high quality filter:',
      qualityTracks.length
    );

    // Nếu không đủ số lượng, lọc với ngưỡng trung bình
    if (qualityTracks.length < Math.min(limit, 10)) {
      qualityTracks = trackScoresList.filter(
        ([_, info]) =>
          info.playCount >= popularity.mediumPlayCount ||
          info.likeCount >= popularity.mediumLikeCount ||
          info.score >= popularity.mediumScore
      );

      console.log(
        '[PlaylistService] Tracks after medium quality filter:',
        qualityTracks.length
      );
    }

    // Nếu vẫn không đủ, sử dụng ngưỡng cơ bản
    if (qualityTracks.length < Math.min(limit / 2, 5)) {
      qualityTracks = trackScoresList.filter(
        ([_, info]) =>
          info.playCount >= popularity.minPlayCount ||
          info.likeCount >= popularity.minLikeCount
      );

      console.log(
        '[PlaylistService] Tracks after minimum quality filter:',
        qualityTracks.length
      );
    }

    // Sắp xếp bài hát theo điểm số giảm dần
    qualityTracks.sort((a, b) => b[1].score - a[1].score);

    // Log lại top tracks sau khi lọc để kiểm tra
    qualityTracks.slice(0, 5).forEach(([_, info]) => {
      console.log(
        `After filter - Track: ${
          info.track.title
        } - Score: ${info.score.toFixed(2)} - PlayCount: ${
          info.playCount
        } - LikeCount: ${info.likeCount}`
      );
    });

    // If no tracks meet the quality criteria, relax the filters entirely
    if (qualityTracks.length === 0) {
      console.log(
        '[PlaylistService] No tracks meet quality criteria, using most played tracks instead...'
      );
      // Just take the top tracks by play count without any filtering
      const topTracks = trackScoresList
        .sort((a, b) => b[1].playCount - a[1].playCount)
        .slice(0, limit);

      console.log(
        '[PlaylistService] Tracks after using play count only:',
        topTracks.length
      );

      // If still no tracks, fall back to random active tracks
      if (topTracks.length === 0) {
        console.log(
          '[PlaylistService] No tracks with plays, using random active tracks fallback'
        );

        // Simply use any active tracks available
        if (allTracks.length > 0) {
          // Select random tracks from all active tracks
          console.log('[PlaylistService] Using random tracks fallback');
          const shuffledTracks = [...allTracks].sort(() => 0.5 - Math.random());
          const randomTracks = shuffledTracks.slice(
            0,
            Math.min(limit, shuffledTracks.length)
          );

          const playlist = {
            name: 'Soundwave Hits: Trending Right Now',
            description:
              'Những bài hát được yêu thích nhất hiện nay trên nền tảng Soundwave, được cập nhật tự động dựa trên hoạt động nghe nhạc của cộng đồng.',
            tracks: randomTracks,
            isGlobal: true,
            totalTracks: randomTracks.length,
            totalDuration: randomTracks.reduce(
              (sum, track) => sum + (track.duration || 0),
              0
            ),
            coverUrl:
              'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png',
          };

          console.log(
            '[PlaylistService] Generated playlist with random tracks - count:',
            randomTracks.length
          );
          return playlist;
        }

        console.log(
          '[PlaylistService] No tracks after all fallbacks, returning empty playlist'
        );
        return {
          name: '',
          description: '',
          tracks: [],
          totalTracks: 0,
          totalDuration: 0,
        };
      }

      // Use the relaxed tracks
      const finalTracks = topTracks.map(([_, info]) => info.track);

      const playlist = {
        name: 'Soundwave Hits: Trending Right Now',
        description:
          'Những bài hát được yêu thích nhất hiện nay trên nền tảng Soundwave, được cập nhật tự động dựa trên hoạt động nghe nhạc của cộng đồng.',
        tracks: finalTracks,
        isGlobal: true,
        totalTracks: finalTracks.length,
        totalDuration: finalTracks.reduce(
          (sum, track) => sum + (track.duration || 0),
          0
        ),
        coverUrl:
          'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png',
      };

      console.log(
        '[PlaylistService] Generated playlist with relaxed criteria - tracks:',
        finalTracks.length
      );
      return playlist;
    }

    // 4. Tạo playlist với sự đa dạng
    console.log('[PlaylistService] Creating diverse playlist...');
    const selectedTracks = new Set<string>();
    const selectedGenres = new Map<string, number>();
    const selectedArtists = new Map<string, number>();
    const finalTracks = [];

    for (const [trackId, info] of qualityTracks) {
      // Kiểm tra giới hạn bài hát
      if (finalTracks.length >= limit) break;

      // Kiểm tra xem bài hát đã được chọn chưa
      if (selectedTracks.has(trackId)) continue;

      // Kiểm tra giới hạn nghệ sĩ (tối đa 3 bài/nghệ sĩ)
      const artistCount = selectedArtists.get(info.artistId) || 0;
      if (artistCount >= 3) continue;

      // Kiểm tra giới hạn thể loại (tối đa 5 bài/thể loại)
      let genreOk = true;
      for (const genre of info.genres) {
        const genreCount = selectedGenres.get(genre) || 0;
        if (genreCount >= 5) {
          genreOk = false;
          break;
        }
      }
      if (!genreOk) continue;

      // Thêm bài hát vào playlist
      selectedTracks.add(trackId);
      selectedArtists.set(info.artistId, artistCount + 1);
      info.genres.forEach((genre) => {
        selectedGenres.set(genre, (selectedGenres.get(genre) || 0) + 1);
      });
      finalTracks.push(info.track);
    }

    console.log('[PlaylistService] Final tracks selected:', finalTracks.length);

    // Log the selected tracks for debugging
    console.log('[PlaylistService] Selected tracks:');
    finalTracks.slice(0, 5).forEach((track) => {
      console.log(`- ${track.title} (PlayCount: ${track.playCount})`);
    });

    // 5. Tạo playlist với tên và mô tả phù hợp
    const playlist = {
      name: 'Soundwave Hits: Trending Right Now',
      description:
        'Những bài hát được yêu thích nhất hiện nay trên nền tảng Soundwave, được cập nhật tự động dựa trên hoạt động nghe nhạc của cộng đồng.',
      tracks: finalTracks,
      isGlobal: true,
      totalTracks: finalTracks.length,
      totalDuration: finalTracks.reduce(
        (sum, track) => sum + (track.duration || 0),
        0
      ),
      coverUrl:
        'https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png',
    };

    console.log(
      '[PlaylistService] Generated playlist - tracks:',
      finalTracks.length
    );
    return playlist;
  } catch (error) {
    console.error(
      '[PlaylistService] Error generating global recommended playlist:',
      error
    );
    throw new Error('Failed to generate global recommended playlist');
  }
};

/**
 * Cập nhật nội dung cho RECOMMENDED PLAYLIST dựa trên lịch sử nghe nhạc & Collaborative Filtering
 * @param userId ID của người dùng
 */
export const updateRecommendedPlaylistTracks = async (
  userId: string
): Promise<void> => {
  try {
    // Đảm bảo danh sách phát RECOMMENDED PLAYLIST tồn tại
    let recommendedPlaylist = await prisma.playlist.findFirst({
      where: {
        userId,
        type: 'NORMAL',
      },
    });

    if (!recommendedPlaylist) {
      console.log(
        `[PlaylistService] No RECOMMENDED PLAYLIST found for user ${userId}, creating one...`
      );
      recommendedPlaylist = await prisma.playlist.create({
        data: {
          name: 'RECOMMENDED PLAYLIST',
          description:
            'Danh sách bài hát được gợi ý dựa trên lịch sử nghe nhạc của bạn',
          privacy: 'PRIVATE',
          type: 'NORMAL',
          userId,
        },
      });
    }

    // Lấy lịch sử nghe nhạc của người dùng (chỉ bài có playCount > 2)
    const userHistory = await prisma.history.findMany({
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
    });

    if (userHistory.length === 0) {
      console.log(
        `[PlaylistService] No tracks with playCount > 2 found for user ${userId}`
      );
      return;
    }

    console.log(
      `[PlaylistService] Found ${userHistory.length} history entries for user ${userId}`
    );

    // Xác định thể loại & nghệ sĩ yêu thích
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
      .slice(0, 3)
      .map((entry) => entry[0]);

    const topArtists = [...artistCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((entry) => entry[0]);

    console.log(`[PlaylistService] Top genres: ${topGenres}`);
    console.log(`[PlaylistService] Top artists: ${topArtists}`);

    // Tìm bài hát theo Content-Based Filtering
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
      take: 5,
    });

    console.log(
      `[PlaylistService] Found ${recommendedTracks.length} content-based tracks`
    );

    // Tìm người dùng có sở thích giống nhau (Collaborative Filtering - User-Based CF)
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

    //  Lấy bài hát từ người dùng có sở thích tương tự
    const collaborativeTracks = await prisma.history.findMany({
      where: { userId: { in: similarUserIds } },
      include: { track: true },
      orderBy: { playCount: 'desc' },
      take: 10,
    });

    console.log(
      `[PlaylistService] Found ${collaborativeTracks.length} collaborative filtering tracks`
    );

    //  Gộp kết quả từ cả hai phương pháp
    const finalRecommendedTracks = [
      ...new Set([
        ...recommendedTracks,
        ...collaborativeTracks.map((t) => t.track),
      ]),
    ].slice(0, 10); // Giữ tối đa 10 bài hát duy nhất

    if (finalRecommendedTracks.length === 0) {
      console.log(
        `[PlaylistService] No tracks found to update in RECOMMENDED PLAYLIST for user ${userId}`
      );
      return;
    }

    // Clear existing tracks in the playlist
    await prisma.playlistTrack.deleteMany({
      where: {
        playlistId: recommendedPlaylist.id,
      },
    });

    // Add new tracks to the playlist
    const playlistTrackData = recommendedTracks.map((track, index) => ({
      playlistId: recommendedPlaylist.id,
      trackId: track.id,
      trackOrder: index,
    }));

    await prisma.$transaction([
      prisma.playlistTrack.createMany({
        data: playlistTrackData,
      }),
      prisma.playlist.update({
        where: { id: recommendedPlaylist.id },
        data: {
          totalTracks: recommendedTracks.length,
          totalDuration: recommendedTracks.reduce(
            (sum, track) => sum + (track.duration || 0),
            0
          ),
        },
      }),
    ]);

    console.log(
      `[PlaylistService] Successfully updated tracks for RECOMMENDED PLAYLIST for user ${userId}`
    );
  } catch (error) {
    console.error(
      `[PlaylistService] Error updating tracks for RECOMMENDED PLAYLIST for user ${userId}:`,
      error
    );
    throw error;
  }
};

/**
 * Creates or updates the "Vibe Rewind" playlist based on user's listening history
 * @param userId ID of the user
 */
export const updateVibeRewindPlaylist = async (
  userId: string
): Promise<void> => {
  try {
    // Find existing Vibe Rewind playlist or create a new one
    let vibeRewindPlaylist = await prisma.playlist.findFirst({
      where: {
        userId,
        name: 'Vibe Rewind',
      },
    });

    if (!vibeRewindPlaylist) {
      console.log(
        `[PlaylistService] No Vibe Rewind playlist found for user ${userId}, creating one...`
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

    // Get user's listening history (most recently played tracks)
    const userHistory = await prisma.history.findMany({
      where: {
        userId,
        type: 'PLAY',
      },
      include: {
        track: {
          include: {
            artist: true,
            album: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      distinct: ['trackId'],
      take: 30, // Limit to 30 most recent tracks
    });

    if (userHistory.length === 0) {
      console.log(
        `[PlaylistService] No playback history found for user ${userId}`
      );
      return;
    }

    // Filter out null tracks
    const validHistory = userHistory.filter(
      (history) => history.track !== null
    );

    console.log(
      `[PlaylistService] Found ${validHistory.length} recent tracks for user ${userId}`
    );

    // Clear existing tracks in the playlist
    await prisma.playlistTrack.deleteMany({
      where: {
        playlistId: vibeRewindPlaylist.id,
      },
    });

    // Add tracks to the playlist
    const playlistTrackData = validHistory.map((history, index) => ({
      playlistId: vibeRewindPlaylist.id,
      trackId: history.track!.id,
      trackOrder: index,
    }));

    // Calculate total duration
    const totalDuration = validHistory.reduce(
      (sum, history) => sum + (history.track!.duration || 0),
      0
    );

    // Update playlist
    await prisma.$transaction([
      prisma.playlistTrack.createMany({
        data: playlistTrackData,
      }),
      prisma.playlist.update({
        where: { id: vibeRewindPlaylist.id },
        data: {
          totalTracks: validHistory.length,
          totalDuration: totalDuration,
          updatedAt: new Date(),
        },
      }),
    ]);

    console.log(
      `[PlaylistService] Successfully updated Vibe Rewind playlist for user ${userId}`
    );
  } catch (error) {
    console.error(
      `[PlaylistService] Error updating Vibe Rewind playlist for user ${userId}:`,
      error
    );
    throw error;
  }
};
