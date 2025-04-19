import prisma from "../config/db";
import { Prisma, PlaylistPrivacy, PlaylistType } from "@prisma/client";
import { Request } from "express";
import { paginate } from "../utils/handle-utils";
import {
  createAIGeneratedPlaylist as createAIGeneratedPlaylistFromAIService,
  PlaylistGenerationOptions,
  model
} from "./ai.service";
import { uploadFile } from "./upload.service";

// Select fields for base system playlist
const baseSystemPlaylistSelect = {
  id: true,
  name: true,
  description: true,
  coverUrl: true,
  privacy: true,
  type: true,
  isAIGenerated: true, // Base system playlists are templates for AI generation
  totalTracks: true, // Might be useful for admin overview, though generated ones vary
  totalDuration: true,
  createdAt: true,
  updatedAt: true,
};

// Create a base system playlist (Admin only)
export const createBaseSystemPlaylist = async (
  data: {
    name: string;
    description?: string;
    privacy?: PlaylistPrivacy;
  },
  coverFile?: Express.Multer.File
) => {
  // Check if a system playlist with this name already exists
  const existing = await prisma.playlist.findFirst({
    where: {
      name: data.name,
      type: PlaylistType.SYSTEM,
      userId: null,
    },
  });

  if (existing) {
    throw new Error(`A system playlist named "${data.name}" already exists.`);
  }

  // Parse AI parameters from description if present
  let aiParams: PlaylistGenerationOptions = {};
  if (data.description && data.description.includes("<!--AI_PARAMS:")) {
    const match = data.description.match(/<!--AI_PARAMS:(.*?)-->/s);
    if (match && match[1]) {
      try {
        aiParams = JSON.parse(match[1]);
      } catch (e) {
        throw new Error(`Invalid AI parameters format: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // Validate that at least one required parameter is present
  const { basedOnMood, basedOnGenre, basedOnArtist, basedOnSongLength, basedOnReleaseTime } = aiParams;
  if (!basedOnMood && !basedOnGenre && !basedOnArtist && !basedOnSongLength && !basedOnReleaseTime) {
    throw new Error(
      "At least one AI parameter (mood, genre, artist, song length, or release time) is required to create a base system playlist."
    );
  }

  let coverUrl = undefined;
  if (coverFile) {
    // Upload cover image if provided
    const uploadResult = await uploadFile(coverFile.buffer, "playlists/covers");
    coverUrl = uploadResult.secure_url;
  }

  return prisma.playlist.create({
    data: {
      ...data,
      coverUrl,
      type: PlaylistType.SYSTEM,
      isAIGenerated: true, // Base system playlists act as AI templates
      userId: null, // Explicitly set userId to null
    },
    select: baseSystemPlaylistSelect,
  });
};

// Update a base system playlist (Admin only)
export const updateBaseSystemPlaylist = async (
  playlistId: string,
  data: {
    name?: string;
    description?: string;
    privacy?: PlaylistPrivacy;
  },
  coverFile?: Express.Multer.File
) => {
  // Check if the playlist exists and is a base system playlist
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { type: true, userId: true, name: true, description: true },
  });

  if (
    !playlist ||
    playlist.type !== PlaylistType.SYSTEM ||
    playlist.userId !== null
  ) {
    throw new Error("Base system playlist not found.");
  }

  // Check for name collision if name is being changed
  if (data.name && data.name !== playlist.name) {
    const existing = await prisma.playlist.findFirst({
      where: {
        name: data.name,
        type: PlaylistType.SYSTEM,
        userId: null,
        id: { not: playlistId },
      },
    });
    if (existing) {
      throw new Error(
        `Another system playlist named "${data.name}" already exists.`
      );
    }
  }

  // Parse AI parameters from description if present, either from the new description or the existing one
  let aiParams: PlaylistGenerationOptions = {};
  const descriptionToCheck = data.description || playlist.description || "";
  
  if (descriptionToCheck.includes("<!--AI_PARAMS:")) {
    const match = descriptionToCheck.match(/<!--AI_PARAMS:(.*?)-->/s);
    if (match && match[1]) {
      try {
        aiParams = JSON.parse(match[1]);
      } catch (e) {
        throw new Error(`Invalid AI parameters format: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // Validate that at least one required parameter is present
  const { basedOnMood, basedOnGenre, basedOnArtist, basedOnSongLength, basedOnReleaseTime } = aiParams;
  if (!basedOnMood && !basedOnGenre && !basedOnArtist && !basedOnSongLength && !basedOnReleaseTime) {
    throw new Error(
      "At least one AI parameter (mood, genre, artist, song length, or release time) is required for a base system playlist."
    );
  }

  let coverUrl = undefined;
  if (coverFile) {
    // Upload cover image if provided
    const uploadResult = await uploadFile(coverFile.buffer, "playlists/covers");
    coverUrl = uploadResult.secure_url;
  }

  return prisma.playlist.update({
    where: { id: playlistId },
    data: {
      ...data,
      ...(coverUrl && { coverUrl }),
      // Ensure type and userId remain unchanged
      type: PlaylistType.SYSTEM,
      userId: null,
      isAIGenerated: true, // Keep this flag
    },
    select: baseSystemPlaylistSelect,
  });
};

// Delete a base system playlist (Admin only)
export const deleteBaseSystemPlaylist = async (playlistId: string) => {
  // Check if the playlist exists and is a base system playlist
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { type: true, userId: true, name: true },
  });

  if (
    !playlist ||
    playlist.type !== PlaylistType.SYSTEM ||
    playlist.userId !== null
  ) {
    throw new Error("Base system playlist not found.");
  }

  // First, delete all user-specific versions of this playlist
  await prisma.playlist.deleteMany({
    where: {
      name: playlist.name,
      type: PlaylistType.SYSTEM,
      userId: { not: null }, // Only delete user-specific versions
    },
  });

  // Then delete the base playlist
  return prisma.playlist.delete({
    where: { id: playlistId },
  });
};

// Get all base system playlists (Admin only, with pagination)
export const getAllBaseSystemPlaylists = async (req: Request) => {
  const { search } = req.query;

  const whereClause: Prisma.PlaylistWhereInput = {
    type: PlaylistType.SYSTEM,
    userId: null, // Only base system playlists
  };

  if (search && typeof search === "string") {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const result = await paginate(prisma.playlist, req, {
    where: whereClause,
    select: baseSystemPlaylistSelect,
    orderBy: { createdAt: "desc" },
  });

  // Parse AI params từ description của mỗi playlist
  result.data = result.data.map((playlist: any) => {
    const parsedPlaylist = { ...playlist }; // Create a shallow copy

    if (
      parsedPlaylist.description &&
      parsedPlaylist.description.includes("<!--AI_PARAMS:")
    ) {
      const match = parsedPlaylist.description.match(/<!--AI_PARAMS:(.*?)-->/s);
      if (match && match[1]) {
        try {
          const aiParams = JSON.parse(match[1]);
          // Thêm các tham số AI vào response
          Object.assign(parsedPlaylist, aiParams);

          // Làm sạch description để hiển thị (remove the comment)
          parsedPlaylist.description = parsedPlaylist.description
            .replace(/\n\n<!--AI_PARAMS:.*?-->/s, "")
            .trim();
        } catch (e) {
          console.error("Error parsing AI parameters:", e);
          // Keep original description if parsing fails
        }
      }
    }

    // Ensure all required fields are present
    return {
      ...parsedPlaylist,
      id: parsedPlaylist.id || "",
      name: parsedPlaylist.name || "",
      description: parsedPlaylist.description || "",
      coverUrl: parsedPlaylist.coverUrl || null,
      privacy: parsedPlaylist.privacy || "PUBLIC",
      type: parsedPlaylist.type || PlaylistType.SYSTEM,
      isAIGenerated: parsedPlaylist.isAIGenerated || false,
      totalTracks: parsedPlaylist.totalTracks || 0,
      totalDuration: parsedPlaylist.totalDuration || 0,
      createdAt: parsedPlaylist.createdAt || new Date(),
      updatedAt: parsedPlaylist.updatedAt || new Date(),
      // AI parameters
      basedOnMood: parsedPlaylist.basedOnMood || null,
      basedOnGenre: parsedPlaylist.basedOnGenre || null,
      basedOnArtist: parsedPlaylist.basedOnArtist || null,
      basedOnSongLength: parsedPlaylist.basedOnSongLength || null,
      basedOnReleaseTime: parsedPlaylist.basedOnReleaseTime || null,
      trackCount: parsedPlaylist.trackCount || 10,
    };
  });

  return result; // Returns { data: playlists, pagination: ... }
};

// Tạo playlist chứa các bài hát từ lịch sử nghe của người dùng
export const updateVibeRewindPlaylist = async (
  userId: string
): Promise<void> => {
  try {
    // Tìm hoặc tạo playlist "Vibe Rewind"
    let vibeRewindPlaylist = await prisma.playlist.findFirst({
      where: { userId, name: "Vibe Rewind" },
    });

    if (!vibeRewindPlaylist) {
      console.log(
        `[PlaylistService] Creating new Vibe Rewind playlist for user ${userId}...`
      );
      vibeRewindPlaylist = await prisma.playlist.create({
        data: {
          name: "Vibe Rewind",
          description:
            "Your personal time capsule - tracks you've been vibing to lately",
          privacy: "PRIVATE",
          type: "SYSTEM",
          userId,
        },
      });
    }

    // Lấy lịch sử nghe nhạc của người dùng (bài có playCount > 2)
    const userHistory = await prisma.history.findMany({
      where: { userId, type: "PLAY", playCount: { gt: 2 } },
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
      orderBy: { playCount: "desc" },
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
      orderBy: { playCount: "desc" },
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
      distinct: ["userId"],
    });

    const similarUserIds = similarUsers.map((u) => u.userId);
    console.log(
      `[PlaylistService] Found ${similarUserIds.length} similar users`
    );

    // Lấy bài hát từ người dùng có sở thích tương tự
    const collaborativeTracks = await prisma.history.findMany({
      where: { userId: { in: similarUserIds } },
      include: { track: true },
      orderBy: { playCount: "desc" },
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


// Lấy các system playlist (cho admin view, với phân trang, tìm kiếm, sắp xếp)
export const getSystemPlaylists = async (req: Request) => {
  const { search, sortBy, sortOrder } = req.query;

  // Dựa vào type là SYSTEM
  const whereClause: Prisma.PlaylistWhereInput = {
    type: "SYSTEM",
  };

  // Thêm điều kiện tìm kiếm nếu có từ khóa tìm kiếm
  if (search && typeof search === "string") {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Sắp xếp theo name, type, createdAt, updatedAt, totalTracks
  const orderByClause: Prisma.PlaylistOrderByWithRelationInput = {};
  if (
    sortBy &&
    typeof sortBy === "string" &&
    (sortOrder === "asc" || sortOrder === "desc")
  ) {
    if (
      sortBy === "name" ||
      sortBy === "type" ||
      sortBy === "createdAt" ||
      sortBy === "updatedAt" ||
      sortBy === "totalTracks"
    ) {
      orderByClause[sortBy] = sortOrder;
    } else {
      orderByClause.createdAt = "desc";
    }
  } else {
    orderByClause.createdAt = "desc";
  }

  const result = await paginate<any>(prisma.playlist, req, {
    where: whereClause,
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
        orderBy: {
          trackOrder: "asc",
        },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: orderByClause,
  });

  // Transform data structure for consistent formatting within the service
  const formattedPlaylists = result.data.map((playlist: any) => {
    const formattedTracks = playlist.tracks.map((pt: any) => ({
      id: pt.track.id,
      title: pt.track.title,
      audioUrl: pt.track.audioUrl,
      duration: pt.track.duration,
      coverUrl: pt.track.coverUrl,
      artist: pt.track.artist,
      album: pt.track.album,
      createdAt: pt.track.createdAt.toISOString(),
    }));

    return {
      ...playlist,
      tracks: formattedTracks,
      // canEdit logic might need adjustment or removal from here
    };
  });

  return {
    data: formattedPlaylists,
    pagination: result.pagination,
  };
};

// Lấy các system playlist của người dùng
export const getUserSystemPlaylists = async (req: Request) => {
  const { search, sortBy, sortOrder } = req.query;

  // Dựa vào type là SYSTEM và userId
  const whereClause: Prisma.PlaylistWhereInput = {
    type: "SYSTEM",
    userId: req.user?.id,
  };

  // Thêm điều kiện tìm kiếm nếu có từ khóa tìm kiếm
  if (search && typeof search === "string") {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const result = await paginate<any>(prisma.playlist, req, {
    where: whereClause,
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
          trackOrder: "asc",
        },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Chuyển đổi dữ liệu để định dạng nhất quán
  const formattedPlaylists = result.data.map((playlist: any) => {
    const formattedTracks = playlist.tracks.map((pt: any) => ({
      id: pt.track.id,
      title: pt.track.title,
      audioUrl: pt.track.audioUrl,
      duration: pt.track.duration,
      coverUrl: pt.track.coverUrl,
      artist: pt.track.artist,
      album: pt.track.album,
      genres: pt.track.genres,
      createdAt: pt.track.createdAt.toISOString(),
    }));

    return {
      ...playlist,
      tracks: formattedTracks,
    };
  });

  return formattedPlaylists;
};

// Generating AI playlists
export const generateAIPlaylist = async (
  userId: string,
  options: PlaylistGenerationOptions // Use imported type
) => {
  console.log(
    `[PlaylistService] Generating AI playlist for user ${userId} with options:`,
    options
  );
  
  try {
    // Create playlist using AI service
    const playlist = await createAIGeneratedPlaylistFromAIService(
      userId,
      options
    );

    // Get additional playlist details for the response
    const playlistWithTracks = await prisma.playlist.findUnique({
      where: { id: playlist.id },
      include: {
        tracks: {
          include: {
            track: {
              include: {
                artist: {
                  select: {
                    id: true,
                    artistName: true,
                    avatar: true,
                  },
                },
              },
            },
          },
          orderBy: {
            trackOrder: "asc",
          },
        },
      },
    });

    if (!playlistWithTracks) {
      throw new Error("Failed to retrieve created playlist details");
    }

    // Count artists in the playlist
    const artistsInPlaylist = new Set();
    playlistWithTracks.tracks.forEach((pt) => {
      if (pt.track.artist) {
        artistsInPlaylist.add(pt.track.artist.artistName);
      }
    });

    return {
      ...playlist,
      artistCount: artistsInPlaylist.size,
      previewTracks: playlistWithTracks.tracks.slice(0, 3).map((pt) => ({
        id: pt.track.id,
        title: pt.track.title,
        artist: pt.track.artist?.artistName,
      })),
      totalTracks: playlistWithTracks.tracks.length, // Ensure totalTracks is accurate
    };
  } catch (error) {
    console.error(`[PlaylistService] Error in generateAIPlaylist:`, error);
    // Re-throw the error to be handled by the controller
    throw error;
  }
};

// Cập nhật tất cả system playlists cho tất cả user
export const updateAllSystemPlaylists = async (): Promise<{
  success: boolean;
  errors: any[];
}> => {
  try {
    // Lấy danh sách tất cả người dùng đang hoạt động
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    // Lấy tất cả playlist hệ thống gốc làm mẫu
    const baseSystemPlaylists = await prisma.playlist.findMany({
      where: { type: "SYSTEM", userId: null },
      select: { name: true, description: true },
    });

    if (baseSystemPlaylists.length === 0) {
      console.log("[PlaylistService] No base system playlists found to update.");
      return { success: true, errors: [] };
    }

    console.log(`[PlaylistService] Updating ${baseSystemPlaylists.length} system playlists for ${users.length} users...`);

    const errors: any[] = [];

    // Xử lý tất cả người dùng theo lô
    const updatePromises = users.flatMap((user) =>
      baseSystemPlaylists.map(async (playlistTemplate) => {
        try {
          // Lấy thông tin chi tiết của template playlist
          const templatePlaylist = await prisma.playlist.findFirst({
            where: {
              name: playlistTemplate.name,
              type: "SYSTEM",
              userId: null,
            },
            select: {
              id: true,
              name: true,
              description: true,
              coverUrl: true,
              privacy: true,
            },
          });

          if (!templatePlaylist) {
            throw new Error(`Base template "${playlistTemplate.name}" not found.`);
          }

          // Phân tích tham số AI từ mô tả (nếu có)
          let aiOptions: Record<string, any> = {};
          if (
            templatePlaylist.description &&
            templatePlaylist.description.includes("<!--AI_PARAMS:")
          ) {
            const match = templatePlaylist.description.match(
              /<!--AI_PARAMS:(.*?)-->/s
            );
            if (match && match[1]) {
              try {
                aiOptions = JSON.parse(match[1]);
                templatePlaylist.description = templatePlaylist.description
                  .replace(/\n\n<!--AI_PARAMS:.*?-->/s, "")
                  .trim();
              } catch (e) {
                console.error(
                  `[PlaylistService] Error parsing AI params for template ${templatePlaylist.name}:`,
                  e
                );
              }
            }
          }
          
          // Kiểm tra tham số AI
          const hasMoodParam = !!aiOptions.basedOnMood;
          const hasGenreParam = !!aiOptions.basedOnGenre;
          const hasArtistParam = !!aiOptions.basedOnArtist;
          const hasSongLengthParam = !!aiOptions.basedOnSongLength;
          const hasReleaseTimeParam = !!aiOptions.basedOnReleaseTime;
          
          // Phải có ít nhất một tham số AI để tạo playlist có ý nghĩa
          const hasAnyParam = hasMoodParam || hasGenreParam || hasArtistParam || 
                             hasSongLengthParam || hasReleaseTimeParam;
                             
          if (!hasAnyParam) {
            // Nếu không có tham số nào, thêm một số tham số mặc định
            // Phân tích lịch sử nghe của người dùng nếu có thể
            const userHistory = await prisma.history.findMany({
              where: {
                userId: user.id,
                type: "PLAY",
              },
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
              orderBy: {
                updatedAt: "desc",
              },
              take: 50,
            });
            
            if (userHistory.length > 0) {
              // Tạo bản đồ đếm thể loại
              const genreCounts: Record<string, number> = {};
              userHistory.forEach(history => {
                if (history.track) {
                  history.track.genres.forEach(genreRel => {
                    const genreName = genreRel.genre.name;
                    genreCounts[genreName] = (genreCounts[genreName] || 0) + 1;
                  });
                }
              });
              
              // Lấy thể loại phổ biến nhất
              if (Object.keys(genreCounts).length > 0) {
                const topGenre = Object.entries(genreCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([genre]) => genre)[0];
                  
                aiOptions.basedOnGenre = topGenre;
                console.log(`[PlaylistService] Adding default genre parameter for user ${user.id}: ${topGenre}`);
              } else {
                // Nếu không tìm thấy thể loại, sử dụng tâm trạng mặc định
                aiOptions.basedOnMood = "energetic";
                console.log(`[PlaylistService] Adding default mood parameter for user ${user.id}: energetic`);
              }
            } else {
              // Nếu không có lịch sử, sử dụng tham số mặc định
              aiOptions.basedOnMood = "energetic";
              console.log(`[PlaylistService] No history found. Adding default mood parameter for user ${user.id}: energetic`);
            }
          }

          // Sử dụng URL ảnh bìa mặc định nếu không có sẵn
          const coverUrl =
            templatePlaylist.coverUrl ||
            "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png";

          // Tạo hoặc cập nhật playlist hệ thống được cá nhân hóa cho người dùng
          await createAIGeneratedPlaylistFromAIService(user.id, {
            name: templatePlaylist.name,
            description: templatePlaylist.description || undefined,
            coverUrl: coverUrl,
            ...aiOptions,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(
            `[PlaylistService] Error updating ${playlistTemplate.name} for user ${user.id}: ${errorMessage}`
          );
          errors.push({
            userId: user.id,
            playlistName: playlistTemplate.name,
            error: errorMessage,
          });
        }
      })
    );

    // Đợi tất cả các tác vụ hoàn thành
    await Promise.allSettled(updatePromises);

    if (errors.length === 0) {
      console.log(
        `[PlaylistService] Successfully finished updating all system playlists.`
      );
      return { success: true, errors: [] };
    } else {
      console.warn(
        `[PlaylistService] Finished updating system playlists with ${errors.length} errors.`
      );
      return { success: false, errors };
    }
  } catch (error) {
    console.error(
      "[PlaylistService] Critical error during updateAllSystemPlaylists:",
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
