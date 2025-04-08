import { RequestHandler } from "express";
import * as playlistService from "../services/playlist.service";
import * as albumService from "../services/album.service";
import { handleError } from "../utils/handle-utils"; // Import error handler
import { PrismaClient, Prisma } from "@prisma/client";
import prisma from "../config/db"; // Import configured prisma instance

// Tạo playlist FAVORITE (mặc định khi tạo tài khoản sẽ có 1 cái playlist này)
export const createFavoritePlaylist = async (userId: string): Promise<void> => {
  try {
    await prisma.playlist.create({
      data: {
        name: "Favorites",
        description: "List of your favorite songs",
        privacy: "PRIVATE",
        type: "FAVORITE",
        userId,
      },
    });
  } catch (error) {
    console.error("Error creating favorite playlist:", error);
    throw error;
  }
};

// Tạo playlist mới
export const createPlaylist: RequestHandler = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const {
      name,
      description,
      privacy = "PRIVATE",
      type = "NORMAL",
    } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    // Nếu đang cố tạo playlist FAVORITE, kiểm tra xem đã có chưa
    if (type === "FAVORITE") {
      const existingFavorite = await prisma.playlist.findFirst({
        where: {
          userId,
          type: "FAVORITE",
        },
      });

      if (existingFavorite) {
        res.status(400).json({
          success: false,
          message: "You already have a Favorites playlist",
        });
        return;
      }
    }

    // Tạo playlist mới
    const playlist = await prisma.playlist.create({
      data: {
        name,
        description,
        privacy,
        type,
        userId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Playlist created successfully",
      data: playlist,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy danh sách playlist của user
export const getPlaylists: RequestHandler = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    // Check if we're filtering for system playlists only
    const filterType = req.header("X-Filter-Type");
    const isSystemFilter = filterType === "system";

    // Create favorite playlist if it doesn't exist (for all non-system requests)
    if (!isSystemFilter) {
      // Kiểm tra xem có playlist yêu thích chưa
      let favoritePlaylist = await prisma.playlist.findFirst({
        where: {
          userId,
          type: "FAVORITE",
        },
      });

      // Nếu chưa có, tạo mới playlist yêu thích
      if (!favoritePlaylist) {
        favoritePlaylist = await prisma.playlist.create({
          data: {
            name: "Favorites",
            description: "List of your favorite songs",
            privacy: "PRIVATE",
            type: "FAVORITE",
            userId,
          },
        });
      }

      // Also check for Vibe Rewind playlist
      let vibeRewindPlaylist = await prisma.playlist.findFirst({
        where: {
          userId,
          name: "Vibe Rewind",
        },
      });

      // Create Vibe Rewind playlist if it doesn't exist
      if (!vibeRewindPlaylist) {
        vibeRewindPlaylist = await prisma.playlist.create({
          data: {
            name: "Vibe Rewind",
            description:
              "Your personal time capsule - tracks you've been vibing to lately",
            privacy: "PRIVATE",
            type: "NORMAL",
            userId,
          },
        });

        // Automatically update it with user's history if available
        try {
          await playlistService.updateVibeRewindPlaylist(userId);
        } catch (error) {
          console.error("Error initializing Vibe Rewind playlist:", error);
          // Continue even if this fails
        }
      }
    }

    if (isSystemFilter) {
      // For system playlists, use a more specific query
      const systemPlaylists = await prisma.playlist.findMany({
        where: {
          OR: [
            // User's own system playlists
            {
              userId,
              type: "SYSTEM",
            },
            // Global system playlists
            {
              type: "SYSTEM",
              privacy: "PUBLIC",
              user: {
                role: "ADMIN",
              },
            },
          ],
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
            orderBy: {
              trackOrder: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Format system playlists with track data
      const formattedPlaylists = systemPlaylists.map((playlist) => {
        const formattedTracks = playlist.tracks.map((pt: any) => ({
          id: pt.track.id,
          title: pt.track.title,
          audioUrl: pt.track.audioUrl, // Add audioUrl here
          duration: pt.track.duration,
          coverUrl: pt.track.coverUrl,
          artist: pt.track.artist,
          album: pt.track.album,
          createdAt: pt.track.createdAt.toISOString(),
        }));

        return {
          ...playlist,
          tracks: formattedTracks,
          canEdit: req.user?.role === "ADMIN" || playlist.userId === userId,
        };
      });

      console.log(
        `Returning ${formattedPlaylists.length} system playlists for authenticated user.`
      );

      res.json({
        success: true,
        data: formattedPlaylists,
      });
    } else {
      // Default behavior - get all user's playlists
      const playlists = await prisma.playlist.findMany({
        where: {
          userId,
        },
        include: {
          _count: {
            select: {
              tracks: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Default response with playlist counts
      const playlistsWithCount = playlists.map((playlist) => ({
        ...playlist,
        totalTracks: playlist._count.tracks,
        _count: undefined,
      }));

      res.json({
        success: true,
        data: playlistsWithCount,
      });
    }
  } catch (error) {
    next(error);
  }
};

// Lấy playlist theo id
export const getPlaylistById: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // Will be undefined for unauthenticated users
    const userRole = req.user?.role;
    const isAuthenticated = !!userId;

    // Kiểm tra xem playlist có tồn tại không, không cần check userId
    const playlistExists = await prisma.playlist.findUnique({
      where: { id },
    });

    if (!playlistExists) {
      res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
      return;
    }

    // Check if this is a system playlist, favorite playlist, or public playlist
    const isSystemPlaylist = playlistExists.type === "SYSTEM";
    const isFavoritePlaylist = playlistExists.type === "FAVORITE";
    const isPublicPlaylist = playlistExists.privacy === "PUBLIC";

    // For unauthenticated users, only allow PUBLIC or SYSTEM playlists
    if (!isAuthenticated && !isPublicPlaylist && !isSystemPlaylist) {
      res.status(401).json({
        success: false,
        message: "Please log in to view this playlist",
      });
      return;
    }
    // If the playlist is the Recommended Playlist, update it automatically
    if (
      playlistExists.type === "NORMAL" &&
      playlistExists.name === "Vibe Rewind"
    ) {
      await playlistService.updateVibeRewindPlaylist(userId!);
    }

    let playlist;

    // For SYSTEM playlists or PUBLIC playlists, allow viewing by anyone
    if (isSystemPlaylist || isPublicPlaylist) {
      playlist = await prisma.playlist.findUnique({
        where: { id },
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
        },
      });
    }
    // For FAVORITE playlists, only allow the owner to view it
    else if (isFavoritePlaylist) {
      // Ensure the user is the owner of this favorite playlist
      if (!isAuthenticated || playlistExists.userId !== userId) {
        res.status(403).json({
          success: false,
          message: "You don't have permission to view this playlist",
        });
        return;
      }

      playlist = await prisma.playlist.findUnique({
        where: { id },
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
        },
      });
    }
    // For regular playlists, check if the user owns it
    else {
      if (!isAuthenticated) {
        res.status(401).json({
          success: false,
          message: "Please log in to view this playlist",
        });
        return;
      }

      // Check if the user is the owner
      if (playlistExists.userId !== userId) {
        res.status(403).json({
          success: false,
          message: "You don't have permission to view this playlist",
        });
        return;
      }

      playlist = await prisma.playlist.findUnique({
        where: { id },
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
        },
      });
    }

    if (!playlist) {
      res.status(403).json({
        success: false,
        message: "You don't have permission to view this playlist",
      });
      return;
    }

    // Add a field to indicate if the user can edit this playlist
    // Only ADMIN can edit SYSTEM playlists, and only owner can edit their playlists
    const canEdit =
      isAuthenticated && // Must be authenticated to edit anything
      ((isSystemPlaylist && userRole === "ADMIN") ||
        (!isSystemPlaylist && playlist.userId === userId));

    // Transform data structure
    const formattedTracks = playlist.tracks.map((pt) => ({
      id: pt.track.id,
      title: pt.track.title,
      audioUrl: pt.track.audioUrl, // Add this line to ensure audioUrl is included
      duration: pt.track.duration,
      coverUrl: pt.track.coverUrl,
      artist: pt.track.artist,
      album: pt.track.album,
      createdAt: pt.track.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      data: {
        ...playlist,
        tracks: formattedTracks,
        canEdit,
      },
    });
  } catch (error) {
    console.error("Error in getPlaylistById:", error);
    next(error);
  }
};

// Thêm bài hát vào playlist
export const addTrackToPlaylist: RequestHandler = async (req, res, next) => {
  try {
    console.log("AddToPlaylist request:", {
      params: req.params,
      body: req.body,
      user: req.user,
    });

    const { id: playlistId } = req.params;
    const { trackId } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!trackId) {
      res.status(400).json({
        success: false,
        message: "Track ID is required",
      });
      return;
    }

    // Kiểm tra playlist có tồn tại không
    const playlist = await prisma.playlist.findUnique({
      where: {
        id: playlistId,
      },
      include: {
        tracks: true,
      },
    });

    if (!playlist) {
      res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
      return;
    }

    // Check if it's a SYSTEM playlist - only ADMIN can modify
    if (playlist.type === "SYSTEM" && userRole !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Only administrators can modify system playlists",
      });
      return;
    }

    // For regular playlists, check if the user owns it
    if (playlist.type !== "SYSTEM" && playlist.userId !== userId) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to modify this playlist",
      });
      return;
    }

    // Kiểm tra track có tồn tại không
    const track = await prisma.track.findUnique({
      where: {
        id: trackId,
      },
    });

    if (!track) {
      res.status(404).json({
        success: false,
        message: "Track not found",
      });
      return;
    }

    // Kiểm tra xem bài hát đã có trong playlist chưa
    const existingTrack = await prisma.playlistTrack.findFirst({
      where: {
        playlistId,
        trackId,
      },
    });

    if (existingTrack) {
      res.status(400).json({
        success: false,
        message: "Track already exists in playlist",
      });
      return;
    }

    // Thêm bài hát vào playlist với trackOrder là số thứ tự tiếp theo
    const nextTrackOrder = playlist.tracks.length;

    await prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId,
        trackOrder: nextTrackOrder,
      },
    });

    // Cập nhật totalTracks và totalDuration của playlist
    await prisma.playlist.update({
      where: {
        id: playlistId,
      },
      data: {
        totalTracks: {
          increment: 1,
        },
        totalDuration: {
          increment: track.duration,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Track added to playlist successfully",
    });
    return;
  } catch (error) {
    console.error("Error in addTrackToPlaylist:", error);
    next(error);
    return;
  }
};

// Xóa bài hát khỏi playlist
export const removeTrackFromPlaylist: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { playlistId, trackId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    console.log("Removing track from playlist:", {
      playlistId,
      trackId,
      userId,
    });

    // Kiểm tra playlist có tồn tại không
    const playlist = await prisma.playlist.findUnique({
      where: {
        id: playlistId,
      },
    });

    if (!playlist) {
      res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
      return;
    }

    // Check if it's a SYSTEM playlist - only ADMIN can modify
    if (playlist.type === "SYSTEM" && userRole !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Only administrators can modify system playlists",
      });
      return;
    }

    // For regular playlists, check if the user owns it
    if (playlist.type !== "SYSTEM" && playlist.userId !== userId) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to modify this playlist",
      });
      return;
    }

    // Xóa track khỏi playlist
    await prisma.playlistTrack.deleteMany({
      where: {
        playlistId,
        trackId,
      },
    });

    // Cập nhật totalTracks của playlist
    await prisma.playlist.update({
      where: {
        id: playlistId,
      },
      data: {
        totalTracks: {
          decrement: 1,
        },
      },
    });

    res.json({
      success: true,
      message: "Track removed from playlist successfully",
    });
    return;
  } catch (error) {
    console.error("Error removing track:", error);
    next(error);
    return;
  }
};

// Cập nhật playlist
export const updatePlaylist: RequestHandler = async (
  req,
  res
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, privacy } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    // Kiểm tra playlist có tồn tại không
    const playlist = await prisma.playlist.findUnique({
      where: { id },
    });

    if (!playlist) {
      res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
      return;
    }

    // Check if it's a SYSTEM playlist - only ADMIN can modify
    if (playlist.type === "SYSTEM" && userRole !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Only administrators can modify system playlists",
      });
      return;
    }

    // For regular playlists, check if the user owns it
    if (playlist.type !== "SYSTEM" && playlist.userId !== userId) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to modify this playlist",
      });
      return;
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData: any = {
      name,
      description,
      privacy,
    };

    // Xử lý upload file nếu có
    if (req.file) {
      try {
        // Import service upload cho Cloudinary
        const { uploadFile } = require("../services/upload.service");

        // Upload file vào Cloudinary
        const result = await uploadFile(
          req.file.buffer,
          "playlists/covers",
          "image"
        );

        // Thêm coverUrl vào dữ liệu cập nhật
        updateData.coverUrl = result.secure_url;

        console.log(
          "Uploaded new cover image to Cloudinary:",
          result.secure_url
        );
      } catch (uploadError) {
        console.error("Error uploading cover image:", uploadError);
        res.status(500).json({
          success: false,
          message: "Failed to upload cover image",
        });
        return;
      }
    }

    const updatedPlaylist = await prisma.playlist.update({
      where: { id },
      data: updateData,
      include: {
        tracks: {
          include: {
            track: {
              include: {
                artist: true,
              },
            },
          },
          orderBy: {
            trackOrder: "asc",
          },
        },
      },
    });

    // Thêm thuộc tính canEdit vào kết quả trả về
    const responseData = {
      ...updatedPlaylist,
      canEdit: req.user?.role === "ADMIN" || updatedPlaylist.userId === userId,
    };

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        res.status(400).json({
          success: false,
          message: "You already have a playlist with this name",
        });
      }
    }
    res.status(500).json({
      success: false,
      message: "An error has occurred",
    });
  }
};

// Xóa playlist
export const deletePlaylist: RequestHandler = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    // Kiểm tra playlist có tồn tại không
    const playlist = await prisma.playlist.findUnique({
      where: { id },
    });

    if (!playlist) {
      res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
      return;
    }

    // Check if it's a SYSTEM playlist - only ADMIN can delete
    if (playlist.type === "SYSTEM" && userRole !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Only administrators can delete system playlists",
      });
      return;
    }

    // For regular playlists, check if the user owns it
    if (playlist.type !== "SYSTEM" && playlist.userId !== userId) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to delete this playlist",
      });
      return;
    }

    await prisma.playlist.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Playlist deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Lấy các playlist từ hệ thống
export const getSystemPlaylists: RequestHandler = async (req, res, next) => {
  try {
    // Call the service function, passing the request object for pagination
    const result = await playlistService.getSystemPlaylists(req);

    // Note: Determining 'canEdit' might require passing user info to the service
    // or handling it here based on the returned data (e.g., playlist.userId)
    // For now, the service returns playlists without the canEdit flag.

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error in getSystemPlaylists:", error);
    next(error);
  }
};

// Update the Vibe Rewind playlist (tracks user has listened to)
export const updateVibeRewindPlaylist: RequestHandler = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // Call the service function
    await playlistService.updateVibeRewindPlaylist(user.id);

    res.status(200).json({
      success: true,
      message: "Vibe Rewind playlist updated successfully",
    });
  } catch (error) {
    console.error("Update Vibe Rewind playlist error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update Vibe Rewind playlist",
    });
  }
};

// Generating AI playlists
export const generateAIPlaylist: RequestHandler = async (
  req,
  res
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized, please login",
      });
      return;
    }

    // Extract options from request body
    const {
      name,
      description,
      trackCount,
      basedOnMood,
      basedOnGenre,
      basedOnArtist,
    } = req.body;

    // Call the service function
    const playlistData = await playlistService.generateAIPlaylist(userId, {
      name,
      description,
      trackCount: trackCount ? parseInt(trackCount, 10) : undefined,
      basedOnMood,
      basedOnGenre,
      basedOnArtist,
    });

    res.status(200).json({
      success: true,
      message: `AI playlist generated successfully with ${playlistData.totalTracks} tracks from ${playlistData.artistCount} artists`,
      data: playlistData,
    });
  } catch (error) {
    console.error("Error generating AI playlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate AI playlist",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// ------ SYSTEM PLAYLIST CONTROLLERS ------

// Cập nhật tất cả system playlists cho tất cả users (Admin only - cho cron job)
export const updateAllSystemPlaylists: RequestHandler = async (
  req,
  res
): Promise<void> => {
  try {
    // Admin check is handled by middleware

    // Respond immediately
    res.status(200).json({
      success: true,
      message: "System playlists update job started",
    });

    // Trigger background update using the service function
    setTimeout(async () => {
      try {
        console.log("[ServiceTrigger] Starting system playlist update");
        // Call the service function directly
        const result = await playlistService.updateAllSystemPlaylists();

        if (result.success) {
          console.log(
            "[ServiceTrigger] Successfully updated all system playlists"
          );
        } else {
          console.error(
            `[ServiceTrigger] Completed with ${result.errors.length} errors`
          );
          // Optional: Log sample errors as before
        }
      } catch (error) {
        console.error(
          "[ServiceTrigger] Critical error while updating system playlists:",
          error
        );
      }
    }, 10);
  } catch (error) {
    console.error("Update all system playlists error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start system playlists update job",
    });
  }
};

// Create Base System Playlist (Admin Only)
export const createBaseSystemPlaylist: RequestHandler = async (
  req,
  res
): Promise<void> => {
  try {
    // Lấy cả tham số AI từ form data
    const {
      name,
      description,
      privacy,
      basedOnMood,
      basedOnGenre,
      basedOnArtist,
      trackCount,
    } = req.body;
    const coverFile = req.file;

    // Basic validation
    if (!name) {
      res
        .status(400)
        .json({ success: false, message: "Playlist name is required." });
      return;
    }

    // Tạo metadata AI params
    let finalDescription = description || "";
    const aiParams: Record<string, any> = {}; // Use Record for better type safety
    if (basedOnMood) aiParams.basedOnMood = basedOnMood;
    if (basedOnGenre) aiParams.basedOnGenre = basedOnGenre;
    if (basedOnArtist) aiParams.basedOnArtist = basedOnArtist;
    if (trackCount) aiParams.trackCount = Number(trackCount); // Ensure trackCount is a number

    // Thêm metadata AI nếu có bất kỳ tham số AI nào
    if (Object.keys(aiParams).length > 0) {
      finalDescription += `\n\n<!--AI_PARAMS:${JSON.stringify(aiParams)}-->`;
    }

    // Chuẩn bị dữ liệu để tạo
    const playlistData: any = {
      name,
      description: finalDescription, // Use the description with metadata
      privacy: privacy || "PUBLIC",
    };

    const playlist = await playlistService.createBaseSystemPlaylist(
      playlistData,
      coverFile
    );

    res.status(201).json({ success: true, data: playlist });
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      handleError(res, error, "Create Base System Playlist");
    }
  }
};

// Update Base System Playlist (Admin Only)
export const updateBaseSystemPlaylist: RequestHandler = async (
  req,
  res
): Promise<void> => {
  try {
    const { id } = req.params;
    // Lấy cả tham số AI từ form data
    const {
      name,
      description,
      privacy,
      basedOnMood,
      basedOnGenre,
      basedOnArtist,
      trackCount,
    } = req.body;
    const coverFile = req.file;

    // Tạo metadata AI params
    let finalDescription = description || "";
    const aiParams: Record<string, any> = {}; // Use Record for better type safety
    if (basedOnMood) aiParams.basedOnMood = basedOnMood;
    if (basedOnGenre) aiParams.basedOnGenre = basedOnGenre;
    if (basedOnArtist) aiParams.basedOnArtist = basedOnArtist;
    if (trackCount) aiParams.trackCount = Number(trackCount); // Ensure trackCount is a number

    // Xóa metadata cũ nếu có
    finalDescription = finalDescription
      .replace(/<!--AI_PARAMS:.*?-->/s, "")
      .trim();

    // Thêm metadata mới nếu có bất kỳ tham số AI nào
    if (Object.keys(aiParams).length > 0) {
      finalDescription += `\n\n<!--AI_PARAMS:${JSON.stringify(aiParams)}-->`;
    }

    // Chuẩn bị dữ liệu để cập nhật
    const updateData: any = {
      name,
      description: finalDescription, // Use the description with metadata
      privacy,
    };

    const playlist = await playlistService.updateBaseSystemPlaylist(
      id,
      updateData,
      coverFile // Pass the file to the service
    );

    res.status(200).json({ success: true, data: playlist });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        res.status(404).json({ success: false, message: error.message });
      } else if (error.message.includes("already exists")) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        handleError(res, error, "Update Base System Playlist");
      }
    } else {
      handleError(res, error, "Update Base System Playlist");
    }
  }
};

// Delete Base System Playlist (Admin Only)
export const deleteBaseSystemPlaylist: RequestHandler = async (
  req,
  res
): Promise<void> => {
  try {
    const { id } = req.params;
    await playlistService.deleteBaseSystemPlaylist(id);
    res.status(200).json({
      success: true,
      message: "Base system playlist deleted successfully.",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({ success: false, message: error.message });
    } else {
      handleError(res, error, "Delete Base System Playlist");
    }
  }
};

// Get All Base System Playlists (Admin Only)
export const getAllBaseSystemPlaylists: RequestHandler = async (
  req,
  res
): Promise<void> => {
  try {
    const result = await playlistService.getAllBaseSystemPlaylists(req);
    res.status(200).json({ success: true, ...result }); // Spread result to include data and pagination
  } catch (error) {
    handleError(res, error, "Get All Base System Playlists");
  }
};

// Get data for the home page (newest albums, hot albums, system playlists, and user playlists)
export const getHomePageData: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const isAuthenticated = !!userId;

    // Get albums data
    const [newestAlbums, hotAlbums] = await Promise.all([
      albumService.getNewestAlbums(8),
      albumService.getHotAlbums(8),
    ]);

    // Prepare the response data object
    const responseData: any = {
      newestAlbums,
      hotAlbums,
      systemPlaylists: [],
    };

    // For authenticated users, get personalized system playlists and user playlists
    if (isAuthenticated && userId) {
      try {
        const systemPlaylists = await prisma.playlist.findMany({
          where: {
            type: "SYSTEM",
            privacy: "PUBLIC",
          },
          include: {
            tracks: {
              select: {
                track: {
                  include: {
                    artist: true,
                  },
                },
                trackOrder: true,
              },
              orderBy: {
                trackOrder: "asc",
              },
            },
          },
        });

        // Transform the data to match the expected format
        responseData.systemPlaylists = systemPlaylists.map((playlist) => ({
          ...playlist,
          tracks: playlist.tracks.map((pt) => ({
            ...pt.track,
            trackOrder: pt.trackOrder,
          })),
        }));

        // Get personalized playlists for the user
        const userSystemPlaylists = await prisma.playlist.findMany({
          where: {
            userId,
            type: "SYSTEM",
          },
          include: {
            _count: {
              select: {
                tracks: true,
              },
            },
          },
        });

        // Get user's own playlists
        const userPlaylists = await prisma.playlist.findMany({
          where: {
            userId,
            type: {
              not: "SYSTEM",
            },
          },
          include: {
            _count: {
              select: {
                tracks: true,
              },
            },
          },
        });

        // Add to response data
        responseData.personalizedSystemPlaylists = userSystemPlaylists.map(
          (playlist) => ({
            ...playlist,
            totalTracks: playlist._count.tracks,
          })
        );

        responseData.userPlaylists = userPlaylists.map((playlist) => ({
          ...playlist,
          totalTracks: playlist._count.tracks,
        }));
      } catch (error: any) {
        console.error("Error fetching user playlist data:", error);
        // Continue with partial data rather than failing completely
      }
    }

    // Return the combined data
    res.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error("Error in getHomePageData:", error);
    next(error);
  }
};
