import prisma from "../config/db";
import { Prisma, PlaylistPrivacy, PlaylistType, Role } from "@prisma/client";
import { Request } from "express";
import { paginate } from "../utils/handle-utils";
import {
  createAIGeneratedPlaylist as createAIGeneratedPlaylistFromAIService,
  AIGeneratedPlaylistInput,
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
  let aiParams: any = {};
  if (data.description && data.description.includes("<!--AI_PARAMS:")) {
    const match = data.description.match(/<!--AI_PARAMS:(.*?)-->/s);
    if (match && match[1]) {
      try {
        aiParams = JSON.parse(match[1]);
      } catch (e) {
        throw new Error(
          `Invalid AI parameters format: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      }
    }
  }

  // Validate that at least one required parameter is present
  const {
    basedOnMood,
    basedOnGenre,
    basedOnArtist,
    basedOnSongLength,
    basedOnReleaseTime,
  } = aiParams;
  if (
    !basedOnMood &&
    !basedOnGenre &&
    !basedOnArtist &&
    !basedOnSongLength &&
    !basedOnReleaseTime
  ) {
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
  let aiParams: any = {};
  const descriptionToCheck = data.description || playlist.description || "";

  if (descriptionToCheck.includes("<!--AI_PARAMS:")) {
    const match = descriptionToCheck.match(/<!--AI_PARAMS:(.*?)-->/s);
    if (match && match[1]) {
      try {
        aiParams = JSON.parse(match[1]);
      } catch (e) {
        throw new Error(
          `Invalid AI parameters format: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      }
    }
  }

  // Validate that at least one required parameter is present
  const {
    basedOnMood,
    basedOnGenre,
    basedOnArtist,
    basedOnSongLength,
    basedOnReleaseTime,
  } = aiParams;
  if (
    !basedOnMood &&
    !basedOnGenre &&
    !basedOnArtist &&
    !basedOnSongLength &&
    !basedOnReleaseTime
  ) {
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

// NEW FUNCTION to delete a user-specific system playlist (Admin only)
export const deleteUserSpecificSystemPlaylist = async (playlistId: string) => {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: { type: true, userId: true }, // Select only necessary fields
  });

  if (!playlist) {
    throw new Error("Playlist not found.");
  }

  if (playlist.type !== PlaylistType.SYSTEM) {
    throw new Error("Playlist is not a system playlist.");
  }

  if (!playlist.userId) {
    throw new Error(
      "This is a base system playlist template. Use deleteBaseSystemPlaylist to delete it."
    );
  }

  // If all checks pass, delete the playlist
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

// Lấy các system playlist (cho admin view, với phân trang, tìm kiếm, sắp xếp)
export const getSystemPlaylists = async (req: Request) => {
  const { search, sortBy, sortOrder } = req.query;

  // Dựa vào type là SYSTEM và phải là PUBLIC
  const whereClause: Prisma.PlaylistWhereInput = {
    type: "SYSTEM",
    privacy: "PUBLIC",
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
      genres: pt.track.genres,
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
export const getUserSystemPlaylists = async (
  req: Request, // Giữ lại req để lấy query params cho pagination/sort/search
  targetUserId: string // Thêm tham số targetUserId
) => {
  const { search, sortBy, sortOrder, page, limit } = req.query;

  // Dựa vào type là SYSTEM và targetUserId
  const whereClause: Prisma.PlaylistWhereInput = {
    type: "SYSTEM",
    userId: targetUserId, // Sửa ở đây: sử dụng targetUserId
  };

  // Thêm điều kiện tìm kiếm nếu có từ khóa tìm kiếm
  if (search && typeof search === "string") {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const validSortKeys: (keyof Prisma.PlaylistOrderByWithRelationInput)[] = [
    "name",
    "createdAt",
    "updatedAt",
    "totalTracks",
    "privacy",
  ];
  const orderBy: Prisma.PlaylistOrderByWithRelationInput = {};
  if (
    typeof sortBy === "string" &&
    validSortKeys.includes(
      sortBy as keyof Prisma.PlaylistOrderByWithRelationInput
    ) &&
    (sortOrder === "asc" || sortOrder === "desc")
  ) {
    orderBy[sortBy as keyof Prisma.PlaylistOrderByWithRelationInput] =
      sortOrder;
  } else {
    orderBy.createdAt = "desc"; // Mặc định
  }

  // Sử dụng paginate utility
  const result = await paginate<
    Prisma.PlaylistGetPayload<{
      include: {
        tracks: {
          select: {
            track: {
              select: {
                id: true;
                title: true;
                coverUrl: true;
                artist: { select: { artistName: true } };
              };
            };
            trackOrder: true;
          };
          orderBy: { trackOrder: "asc" };
          take: 3;
        };
        // user: { select: { id: true, name: true, email: true } }, // Có thể bỏ user nếu không dùng
        _count: { select: { tracks: true } };
      };
    }>
  >(prisma.playlist, req, {
    where: whereClause,
    include: {
      tracks: {
        select: {
          track: {
            select: {
              id: true,
              title: true,
              coverUrl: true,
              artist: { select: { artistName: true } },
            },
          },
          trackOrder: true,
        },
        orderBy: {
          trackOrder: "asc",
        },
        take: 3, // Lấy 3 track đầu làm preview
      },
      // user: {
      //   select: { id: true, name: true, email: true },
      // },
      _count: {
        // Để lấy tổng số track thực tế
        select: { tracks: true },
      },
    },
    orderBy: orderBy, // Sử dụng orderBy đã định nghĩa
  });

  // Chuyển đổi dữ liệu để định dạng nhất quán
  type PlaylistFromService = Prisma.PlaylistGetPayload<{
    include: {
      tracks: {
        select: {
          track: {
            select: {
              id: true;
              title: true;
              coverUrl: true;
              artist: { select: { artistName: true } };
            };
          };
          trackOrder: true;
        };
      };
      _count: { select: { tracks: true } };
    };
  }>;

  const formattedPlaylists = result.data.map(
    (playlist: PlaylistFromService) => {
      const previewTracks = playlist.tracks.map((pt) => {
        // pt sẽ có kiểu được suy luận đúng
        return {
          id: pt.track.id,
          title: pt.track.title,
          coverUrl: pt.track.coverUrl,
          artistName: pt.track.artist?.artistName || "Unknown Artist",
        };
      });

      return {
        // Lấy các trường cần thiết từ playlist, tránh spread ...playlist nếu nó chứa nhiều dữ liệu không cần
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        coverUrl: playlist.coverUrl,
        privacy: playlist.privacy,
        type: playlist.type,
        isAIGenerated: playlist.isAIGenerated,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
        userId: playlist.userId, // Giữ lại userId của playlist
        lastGeneratedAt: (playlist as any).lastGeneratedAt, // Giữ lại nếu có, ép kiểu nếu cần
        totalTracks: playlist._count?.tracks ?? 0,
        tracks: previewTracks,
      };
    }
  );

  // Trả về đối tượng bao gồm cả data đã format và thông tin pagination
  return {
    data: formattedPlaylists,
    pagination: result.pagination,
  };
};

// Helper function to convert old aiOptions to a string of keywords
const convertAiOptionsToKeywords = (aiOptions: any): string => {
  if (!aiOptions || typeof aiOptions !== "object") return "";
  const keywords = [];
  if (aiOptions.basedOnMood) keywords.push(`mood: ${aiOptions.basedOnMood}`);
  if (aiOptions.basedOnGenre) keywords.push(`genre: ${aiOptions.basedOnGenre}`);
  if (aiOptions.basedOnArtist)
    keywords.push(`artist: ${aiOptions.basedOnArtist}`);
  if (aiOptions.basedOnSongLength)
    keywords.push(`song length: ${aiOptions.basedOnSongLength}`);
  if (aiOptions.basedOnReleaseTime)
    keywords.push(`release time: ${aiOptions.basedOnReleaseTime}`);
  // Add more specific conversions if needed in the future
  return keywords.join(", ");
};

// Generating AI playlists -> Now: Generating System Playlists based on History Features
export const generateSystemPlaylistFromHistoryFeatures = async (
  userId: string,
  focusOnFeatures: string[],
  requestedTrackCount: number,
  customName?: string,
  customDescription?: string
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  // 1. Fetch recent listening history with necessary track details
  const historyItems = await prisma.history.findMany({
    where: {
      userId: userId,
      trackId: { not: null },
      createdAt: {
        gte: new Date(new Date().setDate(new Date().getDate() - 90)), // Last 90 days
      },
    },
    include: {
      track: {
        select: {
          id: true,
          title: true,
          mood: true,
          key: true,
          scale: true,
          tempo: true,
          energy: true,
          danceability: true,
          genres: { include: { genre: { select: { name: true } } } },
          artist: { select: { artistName: true } },
          album: { select: { title: true } },
          duration: true,
          audioUrl: true,
          coverUrl: true,
        },
      },
    },
    take: 200, // Analyze up to 200 recent tracks
    orderBy: {
      createdAt: "desc",
    },
  });

  if (historyItems.length === 0) {
    // Nếu không có lịch sử, lấy top tracks phổ biến với yếu tố random
    const randomOffset = Math.floor(Math.random() * 20); // Random offset để tránh trùng lặp
    const randomGenreFilter = Math.random() > 0.5; // Đôi khi lọc theo thể loại

    let genreFilter = {};
    if (randomGenreFilter) {
      // Lấy ngẫu nhiên một số thể loại phổ biến để filter
      const popularGenres = await prisma.genre.findMany({
        take: 5,
        orderBy: {
          tracks: { _count: "desc" }
        },
        select: { id: true }
      });
      
      if (popularGenres.length > 0) {
        // Chọn ngẫu nhiên 1-3 thể loại
        const selectedGenres = popularGenres
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.ceil(Math.random() * 3));
        
        if (selectedGenres.length > 0) {
          genreFilter = {
            genres: {
              some: {
                genreId: { in: selectedGenres.map(g => g.id) }
              }
            }
          };
        }
      }
    }

    // Áp dụng nhiều tiêu chí sắp xếp khác nhau
    const orderCriteria = Math.random() > 0.3
      ? [{ playCount: "desc" as const }, { createdAt: "desc" as const }]
      : Math.random() > 0.5
        ? [{ createdAt: "desc" as const }, { playCount: "desc" as const }]
        : [{ playCount: "desc" as const }, { releaseDate: "desc" as const }];

    const topTracks = await prisma.track.findMany({
      where: { 
        isActive: true,
        ...genreFilter
      },
      orderBy: orderCriteria,
      skip: randomOffset,
      take: requestedTrackCount + 5, // Lấy nhiều hơn để có thể shuffle
      select: {
        id: true,
        title: true,
        duration: true,
        coverUrl: true,
        audioUrl: true,
        artist: { select: { id: true, artistName: true, avatar: true } },
        album: { select: { id: true, title: true } },
      },
    });
    
    // Shuffle kết quả để đa dạng hóa
    const shuffledTracks = topTracks
      .sort(() => 0.5 - Math.random())
      .slice(0, requestedTrackCount);
      
    if (shuffledTracks.length === 0) {
      throw new Error("No tracks available to generate playlist.");
    }
    
    const playlistName = customName
      ? customName.substring(0, 50)
      : `Popular Mix for ${userId.substring(0, 8)}`;
    const playlistDescription = customDescription
      ? customDescription.substring(0, 150)
      : `A playlist of popular tracks for user ${userId}.`;
    const newPlaylist = await prisma.playlist.create({
      data: {
        name: playlistName,
        description: playlistDescription,
        userId: userId,
        type: PlaylistType.SYSTEM,
        privacy: PlaylistPrivacy.PUBLIC,
        isAIGenerated: false,
        tracks: {
          create: shuffledTracks.map((track, index) => ({
            trackId: track.id,
            trackOrder: index,
          })),
        },
        totalTracks: shuffledTracks.length,
        totalDuration: shuffledTracks.reduce((sum, track) => sum + (track.duration || 0), 0),
      },
      include: {
        tracks: { include: { track: { include: { artist: true } } } },
        user: { select: { id: true, name: true } },
      },
    });
    return newPlaylist;
  }

  // --- Feature Analysis from History ---
  let filterCriteria: any = { isActive: true }; // Base filter for active tracks
  const dominantFeatures: Record<string, any> = {};

  // Helper to get top N items from a count map
  const getTopN = (counts: Record<string, number>, n: number = 1) =>
    Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .map(([name]) => name);

  if (focusOnFeatures.includes("mood")) {
    const moodCounts: Record<string, number> = {};
    historyItems.forEach((item) => {
      const mood = (item.track as any)?.mood;
      if (mood && typeof mood === "string")
        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });
    if (Object.keys(moodCounts).length > 0) {
      dominantFeatures.moods = getTopN(moodCounts, 2); // Top 2 moods
      // @ts-ignore - Prisma type for mood filter
      filterCriteria.mood = { in: dominantFeatures.moods };
    }
  }

  if (focusOnFeatures.includes("genres")) {
    const genreCounts: Record<string, number> = {};
    historyItems.forEach((item) =>
      item.track?.genres?.forEach((g) => {
        if (g.genre?.name)
          genreCounts[g.genre.name] = (genreCounts[g.genre.name] || 0) + 1;
      })
    );
    if (Object.keys(genreCounts).length > 0) {
      dominantFeatures.genres = getTopN(genreCounts, 3); // Top 3 genres
      filterCriteria.genres = {
        some: { genre: { name: { in: dominantFeatures.genres } } },
      };
    }
  }

  if (focusOnFeatures.includes("artist")) {
    const artistCounts: Record<string, number> = {};
    historyItems.forEach((item) => {
      const artistName = (item.track as any)?.artist?.artistName;
      if (artistName && typeof artistName === "string")
        artistCounts[artistName] = (artistCounts[artistName] || 0) + 1;
    });
    if (Object.keys(artistCounts).length > 0) {
      dominantFeatures.artists = getTopN(artistCounts, 3); // Top 3 artists
      // This requires knowing how artist is linked. If direct:
      // filterCriteria.artist = { name: { in: dominantFeatures.artists } };
      // If through artistId on track:
      // const artistIds = await prisma.artistProfile.findMany({ where: { artistName: { in: dominantFeatures.artists } }, select: { id: true }});
      // filterCriteria.artistId = { in: artistIds.map(a => a.id) };
      // For simplicity, assuming a direct name filter or that artistName is unique enough for a general search
      // This part may need refinement based on schema for precise filtering
    }
  }

  // TODO: Add filtering logic for key, tempo, energy, danceability if selected in focusOnFeatures
  // This would involve calculating averages/ranges from history and applying them as Prisma where clauses.
  // Example for tempo (conceptual):
  // if (focusOnFeatures.includes("tempo")) {
  //   const tempos = historyItems.map(item => (item.track as any)?.tempo).filter(t => typeof t === 'number');
  //   if (tempos.length > 0) {
  //     const avgTempo = tempos.reduce((s, t) => s + t, 0) / tempos.length;
  //     filterCriteria.tempo = { gte: avgTempo - 10, lte: avgTempo + 10 }; // Example range
  //   }
  // }

  // --- Track Selection ---
  // Fetch all tracks from user's history that match any of the dominant features found.
  // This initial fetch might be broad, then we filter down or re-query with combined criteria.

  // Refined query with actual filterCriteria built above
  const candidateTracks = await prisma.track.findMany({
    where: {
      AND: [
        filterCriteria, // existing filters like isActive, mood, genres
        { id: { notIn: historyItems.map((h) => h.track!.id) } }, // Exclude tracks already in recent history for discovery
      ],
    },
    take: requestedTrackCount * 3, // Fetch more candidates to allow for shuffling/diversity
    orderBy: { playCount: "desc" }, // Or some other metric like releaseDate
    // Ensure the select here is compatible with playlist track creation
    select: {
      id: true,
      title: true,
      duration: true,
      coverUrl: true,
      audioUrl: true,
      artist: { select: { id: true, artistName: true, avatar: true } },
      album: { select: { id: true, title: true } },
      // Add other fields that PlaylistTrack might need e.g. albumId
    },
  });

  // Simple shuffle and take requested count
  const selectedTracks = candidateTracks
    .sort(() => 0.5 - Math.random())
    .slice(0, requestedTrackCount);

  if (
    selectedTracks.length < Math.min(requestedTrackCount, 5) &&
    selectedTracks.length === 0
  ) {
    // Check if not enough tracks found, or even none
    throw new Error(
      `Could not find enough tracks matching the criteria (found ${selectedTracks.length}). Try broader features or check user history diversity.`
    );
  }

  // --- Playlist Creation ---
  const playlistName = customName
    ? customName.substring(0, 50) // Áp dụng giới hạn ký tự
    : `System Mix for ${userId.substring(0, 8)} - Focus: ${
        focusOnFeatures.join(" & ") || "General"
      }`;

  const playlistDescription = customDescription
    ? customDescription.substring(0, 150) // Áp dụng giới hạn ký tự
    : `A system-generated playlist for user ${userId} focusing on ${focusOnFeatures.join(
        ", "
      )}. Tracks based on listening history analysis.`;

  const newPlaylist = await prisma.playlist.create({
    data: {
      name: playlistName,
      description: playlistDescription,
      userId: userId,
      type: PlaylistType.SYSTEM,
      privacy: PlaylistPrivacy.PUBLIC,
      isAIGenerated: false,
      tracks: {
        create: selectedTracks.map((track, index) => ({
          trackId: track.id,
          trackOrder: index,
        })),
      },
      totalTracks: selectedTracks.length,
      totalDuration: selectedTracks.reduce(
        (sum, track) => sum + (track.duration || 0),
        0
      ),
    },
    include: {
      tracks: { include: { track: { include: { artist: true } } } },
      user: { select: { id: true, name: true } },
    },
  });

  console.log(
    "[PlaylistService] Successfully generated system playlist:",
    newPlaylist
  );
  return newPlaylist;
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
      console.log(
        "[PlaylistService] No base system playlists found to update."
      );
      return { success: true, errors: [] };
    }

    console.log(
      `[PlaylistService] Updating ${baseSystemPlaylists.length} system playlists for ${users.length} users...`
    );

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
            throw new Error(
              `Base template "${playlistTemplate.name}" not found.`
            );
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
          const hasAnyParam =
            hasMoodParam ||
            hasGenreParam ||
            hasArtistParam ||
            hasSongLengthParam ||
            hasReleaseTimeParam;

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
              userHistory.forEach((history) => {
                if (history.track) {
                  history.track.genres.forEach((genreRel) => {
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
                console.log(
                  `[PlaylistService] Adding default genre parameter for user ${user.id}: ${topGenre}`
                );
              } else {
                // Nếu không tìm thấy thể loại, sử dụng tâm trạng mặc định
                aiOptions.basedOnMood = "energetic";
                console.log(
                  `[PlaylistService] Adding default mood parameter for user ${user.id}: energetic`
                );
              }
            } else {
              // Nếu không có lịch sử, sử dụng tham số mặc định
              aiOptions.basedOnMood = "energetic";
              console.log(
                `[PlaylistService] No history found. Adding default mood parameter for user ${user.id}: energetic`
              );
            }
          }

          // Sử dụng URL ảnh bìa mặc định nếu không có sẵn
          const coverUrl =
            templatePlaylist.coverUrl ||
            "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png";

          // Tạo hoặc cập nhật playlist hệ thống được cá nhân hóa cho người dùng
          await generateSystemPlaylistFromHistoryFeatures(
            user.id,
            ["mood", "genres"],
            aiOptions.trackCount || 20
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
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

export const getPlaylistSuggestions = async (req: Request) => {
  const user = req.user;
  if (!user) throw new Error("Unauthorized");

  const { playlistId } = req.query;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // If playlistId is provided, get the tracks that are already in the playlist
  let existingTrackIds: Set<string> = new Set();
  if (playlistId && typeof playlistId === "string") {
    try {
      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        include: {
          tracks: {
            select: { trackId: true },
          },
        },
      });

      if (playlist) {
        existingTrackIds = new Set(
          playlist.tracks.map((track) => track.trackId)
        );
      }
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
    }
  }

  // Get user's listening history to analyze genre preferences
  const userHistory = await prisma.history.findMany({
    where: {
      userId: user.id,
      type: "PLAY",
      createdAt: { gte: thirtyDaysAgo },
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
    take: 50, // Consider most recent 50 tracks
  });

  // If no history, return a mix of popular tracks and new releases
  if (userHistory.length === 0) {
    // Get recently released tracks (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Get a mix of popular tracks and new releases
    const [popularTracks, newReleasedTracks] = await Promise.all([
      // Popular tracks
      prisma.track.findMany({
        where: {
          isActive: true,
          id: {
            notIn: Array.from(existingTrackIds), // Exclude tracks already in the playlist
          },
        },
        orderBy: { playCount: "desc" },
        take: 20,
        include: {
          artist: true,
          album: true,
          genres: {
            include: {
              genre: true,
            },
          },
        },
      }),

      // New released tracks from the last 3 months
      prisma.track.findMany({
        where: {
          isActive: true,
          createdAt: { gte: threeMonthsAgo },
          id: {
            notIn: Array.from(existingTrackIds), // Exclude tracks already in the playlist
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          artist: true,
          album: true,
          genres: {
            include: {
              genre: true,
            },
          },
        },
      }),
    ]);

    // Combine and shuffle the results to give equal opportunity to new tracks
    const combinedTracks = [...popularTracks, ...newReleasedTracks]
      .filter(
        (track, index, self) =>
          index === self.findIndex((t) => t.id === track.id)
      )
      // Simple shuffle algorithm
      .sort(() => Math.random() - 0.5)
      .slice(0, 20);

    return {
      message: "Recommendations based on popular and new releases",
      tracks: combinedTracks,
      basedOn: "discovery",
    };
  }

  // Count genre occurrences in user history
  const genreCounts: Record<string, { count: number; id: string }> = {};

  userHistory.forEach((history) => {
    if (history.track) {
      history.track.genres.forEach((genreRel) => {
        const genreId = genreRel.genre.id;
        const genreName = genreRel.genre.name;

        if (!genreCounts[genreName]) {
          genreCounts[genreName] = { count: 0, id: genreId };
        }
        genreCounts[genreName].count += 1;
      });
    }
  });

  // Sort genres by count and get top 3
  const topGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 3)
    .map(([name, data]) => ({
      name,
      id: data.id,
      count: data.count,
    }));

  if (topGenres.length === 0) {
    // Fallback to popular tracks if no genres found
    const popularTracks = await prisma.track.findMany({
      where: {
        isActive: true,
        id: {
          notIn: Array.from(existingTrackIds), // Exclude tracks already in the playlist
        },
      },
      orderBy: { playCount: "desc" },
      take: 20,
      include: {
        artist: true,
        album: true,
        genres: {
          include: {
            genre: true,
          },
        },
      },
    });

    return {
      message: "Recommendations based on popular tracks",
      tracks: popularTracks,
      basedOn: "popular",
    };
  }

  // Get track IDs from user history to exclude them from recommendations
  const userTrackIds = userHistory
    .filter((history) => history.track)
    .map((history) => history.track!.id);

  // Combine user history track IDs with existing playlist track IDs
  const excludeTrackIds = [
    ...new Set([...userTrackIds, ...Array.from(existingTrackIds)]),
  ];

  // Get recommended tracks based on top genres
  const recommendedTracks = await prisma.track.findMany({
    where: {
      isActive: true,
      id: {
        notIn: excludeTrackIds, // Exclude both listened tracks and playlist tracks
      },
      genres: {
        some: {
          genreId: {
            in: topGenres.map((genre) => genre.id),
          },
        },
      },
    },
    orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
    take: 40,
    include: {
      artist: true,
      album: true,
      genres: {
        include: {
          genre: true,
        },
      },
    },
  });

  recommendedTracks.sort(() => Math.random() - 0.5);
  const limitedRecommendedTracks = recommendedTracks.slice(0, 20);

  return {
    message: `Recommendations based on your top genres: ${topGenres
      .map((g) => g.name)
      .join(", ")}`,
    tracks: limitedRecommendedTracks,
    basedOn: "genres",
    topGenres: topGenres,
  };
};

// Reorder tracks within a specific playlist
export const reorderPlaylistTracks = async (
  playlistId: string,
  orderedTrackIds: string[], // Array of track IDs in the desired order
  requestingUserId?: string, // ID of the user making the request
  requestingUserRole?: Role // Role of the user making the request
): Promise<{ success: boolean; message?: string; statusCode?: number }> => {
  try {
    // 1. Find the playlist and check permissions
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      select: { userId: true, type: true }, // Select only necessary fields
    });

    if (!playlist) {
      return { success: false, message: "Playlist not found", statusCode: 404 };
    }

    // Permission check: Only owner of NORMAL playlist or ADMIN can reorder
    const isOwner = playlist.userId === requestingUserId;
    const isAdmin = requestingUserRole === Role.ADMIN;

    if (!(playlist.type === "NORMAL" && isOwner) && !isAdmin) {
      return {
        success: false,
        message:
          "You do not have permission to reorder tracks in this playlist",
        statusCode: 403,
      };
    }

    // 2. Perform reordering within a transaction
    await prisma.$transaction(async (tx) => {
      // Fetch existing PlaylistTrack entries to verify tracks belong to the playlist
      const existingTracks = await tx.playlistTrack.findMany({
        where: {
          playlistId: playlistId,
          trackId: { in: orderedTrackIds },
        },
        select: { trackId: true }, // Select only trackId
      });

      const existingTrackIdSet = new Set(
        existingTracks.map((pt) => pt.trackId)
      );

      // Validate that all provided trackIds actually exist in this playlist
      if (existingTrackIdSet.size !== orderedTrackIds.length) {
        const missingIds = orderedTrackIds.filter(
          (id) => !existingTrackIdSet.has(id)
        );
        console.error(
          `Attempted to reorder playlist ${playlistId} with invalid/missing track IDs:`,
          missingIds
        );
        throw new Error(
          `Invalid or missing track IDs provided for playlist ${playlistId}.`
        );
      }

      // Prepare update operations
      const updateOperations = orderedTrackIds.map((trackId, index) => {
        return tx.playlistTrack.updateMany({
          where: {
            playlistId: playlistId,
            trackId: trackId,
          },
          data: {
            trackOrder: index, // Set trackOrder to the index in the new array
          },
        });
      });

      // Execute all updates concurrently within the transaction
      await Promise.all(updateOperations);
    });

    console.log(
      `[PlaylistService] Successfully reordered tracks for playlist ${playlistId}`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `[PlaylistService] Error reordering tracks for playlist ${playlistId}:`,
      error
    );
    // Determine if it was a validation error or server error
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to reorder tracks due to an internal error";
    const isValidationError = errorMessage.includes(
      "Invalid or missing track IDs"
    );

    return {
      success: false,
      message: errorMessage,
      statusCode: isValidationError ? 400 : 500,
    };
  }
};

export function updateVibeRewindPlaylist(userId: string) {
  throw new Error("Function not implemented.");
}

export const getUserListeningStats = async (userId: string) => {
  const historyItems = await prisma.history.findMany({
    where: {
      userId: userId,
      trackId: { not: null },
    },
    include: {
      track: {
        select: {
          id: true,
          title: true,
          mood: true,
          key: true,
          scale: true,
          tempo: true,
          energy: true,
          danceability: true,
          artist: { select: { artistName: true } },
          genres: { include: { genre: { select: { name: true } } } },
        },
      },
    },
    take: 200,
    orderBy: {
      createdAt: "desc",
    },
  });

  if (historyItems.length === 0) {
    return {
      message: "No listening history found to generate stats.",
      topMoods: [],
      topGenres: [],
      topArtists: [],
      topKeys: [],
      tempo: { average: null, min: null, max: null, count: 0 },
      energy: { average: null, min: null, max: null, count: 0 },
      danceability: { average: null, min: null, max: null, count: 0 },
      totalHistoryItemsAnalyzed: 0,
    };
  }

  const moodCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};
  const artistCounts: Record<string, number> = {};
  const keyCounts: Record<string, number> = {};

  const tempos: number[] = [];
  const energies: number[] = [];
  const danceabilities: number[] = [];

  for (const item of historyItems) {
    if (!item.track) continue;
    // Use 'as any' for fields whose existence/type isn't certain without the exact schema
    const track = item.track as any;

    // Mood
    if (
      track.mood &&
      typeof track.mood === "string" &&
      track.mood.trim() !== ""
    ) {
      moodCounts[track.mood.trim()] = (moodCounts[track.mood.trim()] || 0) + 1;
    }

    // Genres
    // Assuming track.genres is an array of { genre: { name: string } }
    if (Array.isArray(track.genres)) {
      track.genres.forEach((g: any) => {
        if (g.genre?.name && typeof g.genre.name === "string") {
          genreCounts[g.genre.name] = (genreCounts[g.genre.name] || 0) + 1;
        }
      });
    }

    // Artist
    if (
      track.artist?.artistName &&
      typeof track.artist.artistName === "string"
    ) {
      artistCounts[track.artist.artistName] =
        (artistCounts[track.artist.artistName] || 0) + 1;
    }

    // Key & Scale
    if (track.key && typeof track.key === "string" && track.key.trim() !== "") {
      const keyText = track.key.trim();
      const scaleText =
        track.scale && typeof track.scale === "string"
          ? track.scale.trim()
          : "";
      const fullKey = scaleText ? `${keyText} ${scaleText}` : keyText;
      keyCounts[fullKey] = (keyCounts[fullKey] || 0) + 1;
    }

    // Numerical features
    if (typeof track.tempo === "number") tempos.push(track.tempo);
    if (typeof track.energy === "number") energies.push(track.energy);
    if (typeof track.danceability === "number")
      danceabilities.push(track.danceability);
  }

  const calculateTopN = (counts: Record<string, number>, n: number = 5) => {
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .map(([name, count]) => ({ name, count }));
  };

  const calculateNumericStats = (arr: number[]) => {
    if (arr.length === 0)
      return { average: null, min: null, max: null, count: 0 };
    const sum = arr.reduce((acc, val) => acc + val, 0);
    const average = sum / arr.length;
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    return {
      average: parseFloat(average.toFixed(2)),
      min,
      max,
      count: arr.length,
    };
  };

  return {
    topMoods: calculateTopN(moodCounts),
    topGenres: calculateTopN(genreCounts),
    topArtists: calculateTopN(artistCounts),
    topKeys: calculateTopN(keyCounts),
    tempo: calculateNumericStats(tempos),
    energy: calculateNumericStats(energies),
    danceability: calculateNumericStats(danceabilities),
    totalHistoryItemsAnalyzed: historyItems.length,
  };
};

// NEW FUNCTION TO GET FULL PLAYLIST DETAILS
export const getPlaylistDetailsById = async (playlistId: string) => {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    include: {
      tracks: {
        orderBy: { trackOrder: "asc" },
        select: {
          id: true, // PlaylistTrack ID
          addedAt: true,
          trackOrder: true,
          track: {
            // The actual Track object
            select: {
              id: true,
              title: true,
              coverUrl: true,
              duration: true,
              artist: {
                select: {
                  id: true,
                  artistName: true,
                },
              },
              album: {
                select: {
                  id: true,
                  title: true,
                },
              },
              genres: {
                select: {
                  genre: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              // Include other track fields if needed by the modal
            },
          },
        },
      },
      user: {
        // Include user details if you want to display who the playlist belongs to
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        // Keep total track count
        select: { tracks: true },
      },
    },
  });

  if (!playlist) {
    throw new Error("Playlist not found"); // Or handle as a 404 in controller
  }

  // Transform genres to a simpler array of strings for each track, if desired
  // This matches the PreviewTrack interface in the modal more closely if it expects simple genre names
  const transformedPlaylist = {
    ...playlist,
    tracks: playlist.tracks.map((pt) => ({
      ...pt,
      track: {
        ...pt.track,
        genres:
          pt.track.genres?.map((g) => g.genre.name).filter((name) => !!name) ||
          [],
        albumTitle: pt.track.album?.title, // Flatten album title
        artistName: pt.track.artist?.artistName, // Flatten artist name
      },
    })),
  };

  return transformedPlaylist;
};

// Helper function (should be after the export)
const calculateTopN = (counts: Record<string, number>, n: number = 5) => {
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
};
