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
    select: { type: true, userId: true, name: true },
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
    select: { type: true, userId: true },
  });

  if (
    !playlist ||
    playlist.type !== PlaylistType.SYSTEM ||
    playlist.userId !== null
  ) {
    throw new Error("Base system playlist not found.");
  }

  // Delete the base playlist
  // Note: This does NOT delete the personalized versions for users.
  // Handling cleanup of personalized versions could be a separate feature/process.
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

    return parsedPlaylist; // Return the modified or original playlist object
  });

  return result; // Returns { data: playlists, pagination: ... }
};

// Tạo playlist chứa các bài hát từ lịch sử nghe của người dùng
export const updateVibeRewindPlaylist = async (
  userId: string
): Promise<void> => {
  try {
    // Kiểm tra xem người dùng đã có lịch sử nghe nhạc chưa
    const userHistory = await prisma.history.findMany({
      where: { 
        userId,
        type: 'PLAY'
      },
      include: {
        track: {
          include: {
            genres: {
              include: {
                genre: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 30 // Lấy 30 bài hát gần nhất
    });

    if (userHistory.length === 0) {
      console.log(
        `[PlaylistService] User ${userId} has no listening history. Skipping Vibe Rewind playlist creation.`
      );
      return;
    }

    // Phân tích tâm trạng và thể loại từ lịch sử nghe nhạc
    const moodAndGenreContext = {
      tracks: userHistory.map(h => ({
        title: h.track?.title,
        genres: h.track?.genres.map(g => g.genre.name),
        playCount: h.playCount
      }))
    };

    // Gọi Gemini AI để phân tích tâm trạng và thể loại
    const analysisPrompt = `Phân tích lịch sử nghe nhạc của người dùng và trả về:
    1. Tâm trạng phổ biến nhất (mood): happy, sad, energetic, calm, nostalgic, romantic, focused, party
    2. Top 3 thể loại nhạc được nghe nhiều nhất (genres)
    
    Trả về dưới dạng JSON với format:
    {
      "mood": "tâm_trạng",
      "genres": ["thể_loại_1", "thể_loại_2", "thể_loại_3"]
    }
    
    Lịch sử nghe nhạc:
    ${JSON.stringify(moodAndGenreContext, null, 2)}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    // Clean the response by removing markdown code blocks and whitespace
    const responseText = result.response.text();
    const cleanedResponse = responseText
      .replace(/```json|```/g, '') // Remove markdown code blocks
      .trim(); // Remove leading/trailing whitespace

    let analysis;
    try {
      analysis = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('[PlaylistService] Error parsing AI response:', error);
      console.error('[PlaylistService] Raw response:', responseText);
      throw new Error('Failed to parse AI analysis response');
    }

    const detectedMood = analysis.mood;
    const preferredGenres = analysis.genres;
    
    console.log(`[PlaylistService] Detected user mood: ${detectedMood}`);
    console.log(`[PlaylistService] User's preferred genres: ${preferredGenres.join(', ')}`);

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
          coverUrl: null
        },
      });
    }

    // Sử dụng AI service để tạo playlist với tâm trạng và thể loại đã phân tích
    const playlist = await createAIGeneratedPlaylistFromAIService(userId, {
      name: "Vibe Rewind",
      description: `Your personal time capsule - tracks matching your ${detectedMood} mood and favorite genres: ${preferredGenres.join(', ')}`,
      trackCount: 10,
      basedOnMood: detectedMood,
      basedOnGenre: preferredGenres[0], // Sử dụng thể loại được nghe nhiều nhất
      coverUrl: null
    });

    console.log(
      `[PlaylistService] Successfully updated Vibe Rewind playlist for user ${userId} with ${playlist.totalTracks} tracks based on ${detectedMood} mood and favorite genres: ${preferredGenres.join(', ')}`
    );
  } catch (error) {
    console.error(
      `[PlaylistService] Error updating Vibe Rewind playlist for user ${userId}:`,
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

    // Lấy danh sách base system playlists (templates)
    const baseSystemPlaylists = await prisma.playlist.findMany({
      where: { type: "SYSTEM", userId: null },
      select: { name: true }, // Only need the name to trigger the update
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

    const errors: Array<{
      userId: string;
      playlistName: string;
      error: string;
    }> = [];

    // Use Promise.allSettled for better performance and error handling
    const updatePromises = users.flatMap((user) =>
      baseSystemPlaylists.map((playlistTemplate) =>
        // Inline the logic from the removed updateSystemPlaylistForUser function
        (async () => {
          try {
            // Find the base system playlist template (userId is null)
            const templatePlaylist = await prisma.playlist.findFirst({
              where: {
                name: playlistTemplate.name, // Use name from the map iteration
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
              ); // Throw error to be caught below
            }

            // --- START: Parse AI Params from Description ---
            let aiOptions: PlaylistGenerationOptions = {}; // Define interface if not already done
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
                  // Clean the description before passing it if needed
                  templatePlaylist.description = templatePlaylist.description
                    .replace(/\n\n<!--AI_PARAMS:.*?-->/s, "")
                    .trim();
                } catch (e) {
                  console.error(
                    `[PlaylistService] Error parsing AI params for template ${templatePlaylist.name}:`,
                    e
                  );
                  // Proceed without AI params if parsing fails
                }
              }
            }
            // --- END: Parse AI Params from Description ---

            // Default cover if the template doesn't have one
            const coverUrl =
              templatePlaylist.coverUrl ||
              "https://res.cloudinary.com/dsw1dm5ka/image/upload/v1742393277/jrkkqvephm8d8ozqajvp.png";

            // Call the AI service to create/update the user's personalized version
            // **Pass parsed aiOptions explicitly**
            await createAIGeneratedPlaylistFromAIService(user.id, {
              name: templatePlaylist.name,
              description: templatePlaylist.description || undefined, // Pass cleaned description
              coverUrl: coverUrl,
              ...aiOptions, // Spread the parsed AI options here
            });
          } catch (error: unknown) {
            // Add type annotation here
            // This catch block handles errors for a single user/playlist update
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.error(
              `[PlaylistService] Error updating ${playlistTemplate.name} for user ${user.id}: ${errorMessage}`
            );
            // Push the error details into the shared errors array
            errors.push({
              userId: user.id,
              playlistName: playlistTemplate.name,
              error: errorMessage,
            });
            // Don't rethrow here, let Promise.allSettled handle it
          }
        })()
      )
    );

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
