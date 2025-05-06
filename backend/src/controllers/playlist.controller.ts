import { NextFunction, Request, Response } from "express";
import * as playlistService from "../services/playlist.service";
import * as albumService from "../services/album.service";
import * as userService from "../services/user.service";
import * as aiService from "../services/ai.service";
import { handleError } from "../utils/handle-utils";
import { Prisma } from "@prisma/client";
import prisma from "../config/db";
import { uploadFile } from "../services/upload.service";
import { trackSelect } from "../utils/prisma-selects";

// Tạo playlist mới
export const createPlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction
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
export const getPlaylists = async (
  req: Request,
  res: Response,
  next: NextFunction
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
export const getPlaylistById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

    const canEdit =
      isAuthenticated &&
      ((isSystemPlaylist && userRole === "ADMIN") ||
        (!isSystemPlaylist && playlist.userId === userId));

    // Transform data structure
    const formattedTracks = playlist.tracks.map((pt) => ({
      id: pt.track.id,
      title: pt.track.title,
      audioUrl: pt.track.audioUrl,
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
export const addTrackToPlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // console.log("AddToPlaylist request:", {
    //   params: req.params,
    //   body: req.body,
    //   user: req.user,
    // });

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
    if (
      playlist.type === "SYSTEM" &&
      (playlist.name === "Welcome Mix")
    ) {
      res.status(400).json({
        success: false,
        message: `Cannot manually add tracks to ${playlist.name} playlist.`,
      });
      return;
    }

    // Existing check: Only ADMIN can modify other SYSTEM playlists
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
export const removeTrackFromPlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction
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

    // Kiểm tra playlist có tồn tại không và lấy thông tin track cần xóa
    const [playlist, track] = await Promise.all([
      prisma.playlist.findUnique({
        where: {
          id: playlistId,
        },
      }),
      prisma.track.findUnique({
        where: {
          id: trackId,
        },
        select: {
          duration: true,
        },
      }),
    ]);

    if (!playlist) {
      res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
      return;
    }

    if (!track) {
      res.status(404).json({
        success: false,
        message: "Track not found",
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

    // Cập nhật totalTracks và totalDuration của playlist
    await prisma.playlist.update({
      where: {
        id: playlistId,
      },
      data: {
        totalTracks: {
          decrement: 1,
        },
        totalDuration: {
          decrement: track.duration,
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
export const updatePlaylist = async (
  req: Request,
  res: Response
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

    // Prevent changing privacy for FAVORITE playlists
    if (
      playlist.type === "FAVORITE" &&
      privacy &&
      privacy !== playlist.privacy
    ) {
      res.status(400).json({
        success: false,
        message: "Cannot change the privacy of the Favorites playlist",
      });
      return;
    }

    // Chuẩn bị dữ liệu cập nhật
    const updateData: any = {
      name,
      description,
      ...(playlist.type !== "FAVORITE" && { privacy }),
    };

    // Xử lý upload file nếu có
    if (req.file) {
      try {
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
export const deletePlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction
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
export const getSystemPlaylists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

export const getUserSystemPlaylists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await playlistService.getUserSystemPlaylists(req);

    res.json(result);
  } catch (error) {
    console.error("Error in getSystemPlaylists:", error);
    next(error);
  }
};

// Generating AI playlists
export const generateAIPlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction
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
      basedOnSongLength,
      basedOnReleaseTime,
    } = req.body;

    // Check if any specific parameters are provided
    const hasSpecificParams =
      basedOnMood ||
      basedOnGenre ||
      basedOnArtist ||
      basedOnSongLength ||
      basedOnReleaseTime;

    // Case 19: If no parameters are provided, return an error
    if (!hasSpecificParams) {
      res.status(400).json({
        success: false,
        message:
          "At least one parameter (mood, genre, artist, song length, or release time) is required to generate a playlist.",
      });
      return;
    }

    // Call the service function
    const playlistData = await playlistService.generateAIPlaylist(userId, {
      name,
      description,
      trackCount: trackCount ? parseInt(trackCount, 10) : undefined,
      basedOnMood,
      basedOnGenre,
      basedOnArtist,
      basedOnSongLength,
      basedOnReleaseTime,
    });

    // Determine the message based on parameters
    let message = `AI playlist generated successfully with ${playlistData.totalTracks} tracks from ${playlistData.artistCount} artists`;

    res.status(200).json({
      success: true,
      message,
      data: playlistData,
    });
  } catch (error) {
    console.error("Error generating AI playlist:", error);

    // Use appropriate status code based on error type
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isValidationError =
      errorMessage.includes("required to generate") ||
      errorMessage.includes("parameter is required");

    res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: isValidationError
        ? errorMessage
        : "Failed to generate AI playlist",
      error: errorMessage,
    });
  }
};

// ------ SYSTEM PLAYLIST CONTROLLERS ------

// Cập nhật tất cả system playlists cho tất cả users (Admin only - cho cron job)
export const updateAllSystemPlaylists = async (
  req: Request,
  res: Response,
  next: NextFunction
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
export const createBaseSystemPlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction
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
      basedOnSongLength,
      basedOnReleaseTime,
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
    if (basedOnSongLength) aiParams.basedOnSongLength = basedOnSongLength;
    if (basedOnReleaseTime) aiParams.basedOnReleaseTime = basedOnReleaseTime;
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
export const updateBaseSystemPlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction
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
      basedOnSongLength,
      basedOnReleaseTime,
      trackCount,
    } = req.body;
    const coverFile = req.file;

    // Tạo metadata AI params
    let finalDescription = description || "";
    const aiParams: Record<string, any> = {}; // Use Record for better type safety
    if (basedOnMood) aiParams.basedOnMood = basedOnMood;
    if (basedOnGenre) aiParams.basedOnGenre = basedOnGenre;
    if (basedOnArtist) aiParams.basedOnArtist = basedOnArtist;
    if (basedOnSongLength) aiParams.basedOnSongLength = basedOnSongLength;
    if (basedOnReleaseTime) aiParams.basedOnReleaseTime = basedOnReleaseTime;
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
export const deleteBaseSystemPlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction
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
export const getAllBaseSystemPlaylists = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await playlistService.getAllBaseSystemPlaylists(req);
    res.status(200).json({ success: true, ...result }); // Spread result to include data and pagination
  } catch (error) {
    handleError(res, error, "Get All Base System Playlists");
  }
};

// Get data for the home page (newest albums, hot albums, system playlists, and user playlists)
export const getHomePageData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const isAuthenticated = !!userId;

    // Get albums data and top tracks/artists
    const [newestAlbums, hotAlbums, topTracks, topArtists] = await Promise.all([
      albumService.getNewestAlbums(20),
      albumService.getHotAlbums(20),
      userService.getTopTracks(),
      userService.getTopArtists(),
    ]);

    // Prepare the response data object
    const responseData: any = {
      newestAlbums,
      hotAlbums,
      topTracks,
      topArtists,
      systemPlaylists: [],
    };

    // For authenticated users, get personalized system playlists and user playlists
    if (isAuthenticated && userId) {
      try {
        const [
          systemPlaylists,
          userSystemPlaylists,
          userPlaylists,
          userTopTracks,
          userTopArtists,
          userPlayHistory,
        ] = await Promise.all([
          prisma.playlist.findMany({
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
          }),
          prisma.playlist.findMany({
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
          }),
          prisma.playlist.findMany({
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
          }),
          userService.getUserTopTracks(req.user),
          userService.getUserTopArtists(req.user),
          userService.getPlayHistory(req.user),
        ]);

        // Transform the data to match the expected format
        responseData.systemPlaylists = systemPlaylists.map((playlist) => ({
          ...playlist,
          tracks: playlist.tracks.map((pt) => ({
            ...pt.track,
            trackOrder: pt.trackOrder,
          })),
        }));

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

        responseData.userTopTracks = userTopTracks;
        responseData.userTopArtists = userTopArtists;
        responseData.userPlayHistory = userPlayHistory;
      } catch (error: any) {
        console.error("Error fetching user playlist data:", error);
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

export const getPlaylistSuggestions = async (
  req: Request,
  res: Response,
  next: NextFunction
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

    const suggestions = await playlistService.getPlaylistSuggestions(req);

    if (!suggestions) {
      res.status(404).json({
        success: false,
        message: "No playlist suggestions found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error("Error fetching playlist suggestions:", error);
    next(error);
  }
};

// New controller for suggesting more tracks for a playlist using AI
export const suggestMoreTracksForPlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: playlistId } = req.params;
    const userId = req.user?.id;
    const count = req.query.count ? parseInt(req.query.count as string, 10) : 5;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized, please login",
      });
      return;
    }

    // Validate playlist ownership
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      select: { userId: true, type: true },
    });

    if (!playlist) {
      res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
      return;
    }

    // Check if the user owns this playlist or it's a SYSTEM playlist
    if (playlist.type !== "SYSTEM" && playlist.userId !== userId) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to modify this playlist",
      });
      return;
    }

    // Use the AI service to suggest more tracks
    const suggestedTrackIds = await aiService.suggestMoreTracksUsingAI(
      playlistId,
      userId,
      count
    );

    // Get more details about the suggested tracks
    const suggestedTracks = await prisma.track.findMany({
      where: {
        id: { in: suggestedTrackIds },
        isActive: true,
      },
      include: {
        artist: true,
        album: true,
      },
    });

    res.status(200).json({
      success: true,
      message: `Generated ${suggestedTrackIds.length} track suggestions for the playlist`,
      data: suggestedTracks.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        duration: track.duration,
        coverUrl: track.coverUrl,
        audioUrl: track.audioUrl,
      })),
    });
  } catch (error) {
    console.error(
      "Playlist suggestion error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    if (
      error instanceof Error &&
      error.message.includes("Playlist must have at least 3 tracks")
    ) {
      res.status(400).json({
        // 400 Bad Request
        success: false,
        message: error.message,
      });
    } else {
      // 500 Internal Server Error
      res.status(500).json({
        success: false,
        message: "Failed to generate track suggestions",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
};

// Reorder tracks in a playlist
export const reorderPlaylistTracks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { playlistId } = req.params;
    const { trackIds } = req.body; // Expecting an array of track IDs in the new order
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!playlistId) {
      res
        .status(400)
        .json({ success: false, message: "Playlist ID is required" });
      return;
    }

    if (!Array.isArray(trackIds) || trackIds.length === 0) {
      res
        .status(400)
        .json({ success: false, message: "Track IDs array is required" });
      return;
    }

    // Call the service function to handle the reordering logic
    const result = await playlistService.reorderPlaylistTracks(
      playlistId,
      trackIds,
      userId,
      userRole
    );

    if (result.success) {
      res.json({
        success: true,
        message: "Playlist tracks reordered successfully",
      });
    } else {
      // Use the status code provided by the service or default to 400/500
      res.status(result.statusCode || 400).json({
        success: false,
        message: result.message || "Failed to reorder tracks",
      });
    }
  } catch (error) {
    console.error("Error in reorderPlaylistTracks controller:", error);
    next(error); // Pass error to the global error handler
  }
};
