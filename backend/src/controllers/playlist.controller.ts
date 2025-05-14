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
import { Role } from "@prisma/client";
import upload from "../middleware/upload.middleware";

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
          genres: pt.track.genres,
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
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const isAuthenticated = !!userId;

    const playlistExists = await prisma.playlist.findUnique({
      where: { id },
      select: {
        // Select only necessary fields for permission check
        id: true,
        type: true,
        privacy: true,
        userId: true,
      },
    });

    if (!playlistExists) {
      res.status(404).json({
        success: false,
        message: "Playlist not found",
      });
      return;
    }

    const isSystemPlaylist = playlistExists.type === "SYSTEM";
    const isPublicPlaylist = playlistExists.privacy === "PUBLIC";
    const isOwnedByUser = playlistExists.userId === userId;

    let canView = false;

    if (isPublicPlaylist) {
      canView = true;
    } else if (isAuthenticated) {
      if (isOwnedByUser) {
        canView = true;
      } else if (isSystemPlaylist && playlistExists.privacy === "PRIVATE") {
        // If it's a PRIVATE SYSTEM playlist not owned by the current user, they cannot view it (unless admin)
        if (userRole === "ADMIN") {
          canView = true;
        } else {
          canView = false;
        }
      } else if (userRole === "ADMIN") {
        canView = true;
      }
      // For NORMAL/FAVORITE private playlists not owned by user, canView remains false unless admin
    }
    // Unauthenticated users trying to access non-public playlists: canView remains false

    if (!canView) {
      res.status(isAuthenticated ? 403 : 401).json({
        success: false,
        message: isAuthenticated
          ? "You do not have permission to view this playlist"
          : "Please log in to view this playlist",
      });
      return;
    }

    // If canView is true, fetch the full playlist details
    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        user: {
          // Owner of the playlist
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        tracks: {
          where: {
            track: {
              isActive: true, // Only include active tracks in the playlist view
            },
          },
          select: {
            addedAt: true,
            trackOrder: true,
            track: {
              select: {
                ...trackSelect, // Use the predefined selection set for tracks
                album: { select: { id: true, title: true, coverUrl: true } },
                artist: {
                  select: { id: true, artistName: true, avatar: true },
                },
                genres: { include: { genre: true } }, // Include genre details
              },
            },
          },
          orderBy: {
            trackOrder: "asc",
          },
        },
        _count: {
          select: { tracks: true },
        },
      },
    });

    if (!playlist) {
      // This should theoretically not happen if playlistExists was found and canView is true
      // but as a safeguard:
      res.status(404).json({
        success: false,
        message: "Playlist details not found after permission check.",
      });
      return;
    }

    const formattedTracks = playlist.tracks.map((pt: any) => ({
      ...pt.track,
      albumTitle: pt.track.album?.title,
      artistName: pt.track.artist?.artistName,
      addedAt: pt.addedAt,
      trackOrder: pt.trackOrder,
      // genres: pt.track.genres.map((g: any) => g.genre.name), // Example if you want just names
    }));

    res.json({
      success: true,
      data: {
        ...playlist,
        tracks: formattedTracks,
        totalTracks: playlist._count.tracks,
        canEdit: playlist.userId === userId || userRole === "ADMIN",
        _count: undefined, // Remove _count from final response
      },
    });
  } catch (error) {
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
    if (playlist.type === "SYSTEM" && playlist.name === "Welcome Mix") {
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
): Promise<void> => {
  try {
    const { userId: targetUserId } = req.params;

    if (!targetUserId) {
      res.status(400).json({
        success: false,
        message: "User ID is required in route parameters.",
      });
      return;
    }

    const result = await playlistService.getUserSystemPlaylists(
      req,
      targetUserId
    );

    res.json({ success: true, ...result });
  } catch (error) {
    console.error(
      "[PlaylistController] Error in getUserSystemPlaylists:",
      error
    );
    next(error);
  }
};

// Generating AI playlists
// export const generateAIPlaylist = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const userId = req.user?.id;
//     if (!userId) {
//       res.status(401).json({
//         success: false,
//         message: "Unauthorized, please login",
//       });
//       return;
//     }

//     // Extract options from request body
//     const {
//       name,
//       description,
//       trackCount,
//       basedOnMood,
//       basedOnGenre,
//       basedOnArtist,
//       basedOnSongLength,
//       basedOnReleaseTime,
//     } = req.body;

//     // Check if any specific parameters are provided
//     const hasSpecificParams =
//       basedOnMood ||
//       basedOnGenre ||
//       basedOnArtist ||
//       basedOnSongLength ||
//       basedOnReleaseTime;

//     // Case 19: If no parameters are provided, return an error
//     if (!hasSpecificParams) {
//       res.status(400).json({
//         success: false,
//         message:
//           "At least one parameter (mood, genre, artist, song length, or release time) is required to generate a playlist.",
//       });
//       return;
//     }

//     // Call the service function
//     const playlistData = await playlistService.generateAIPlaylist(userId, {
//       name,
//       description,
//       trackCount: trackCount ? parseInt(trackCount, 10) : undefined,
//       basedOnMood,
//       basedOnGenre,
//       basedOnArtist,
//       basedOnSongLength,
//       basedOnReleaseTime,
//     });

//     // Determine the message based on parameters
//     let message = `AI playlist generated successfully with ${playlistData.totalTracks} tracks from ${playlistData.artistCount} artists`;

//     res.status(200).json({
//       success: true,
//       message,
//       data: playlistData,
//     });
//   } catch (error) {
//     console.error("Error generating AI playlist:", error);

//     // Use appropriate status code based on error type
//     const errorMessage = error instanceof Error ? error.message : String(error);
//     const isValidationError =
//       errorMessage.includes("required to generate") ||
//       errorMessage.includes("parameter is required");

//     res.status(isValidationError ? 400 : 500).json({
//       success: false,
//       message: isValidationError
//         ? errorMessage
//         : "Failed to generate AI playlist",
//       error: errorMessage,
//     });
//   }
// };

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
              privacy: "PUBLIC",
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
// export const suggestMoreTracksForPlaylist = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { id: playlistId } = req.params;
//     const userId = req.user?.id;
//     const count = req.query.count ? parseInt(req.query.count as string, 10) : 5;

//     if (!userId) {
//       res.status(401).json({
//         success: false,
//         message: "Unauthorized, please login",
//       });
//       return;
//     }

//     // Validate playlist ownership
//     const playlist = await prisma.playlist.findUnique({
//       where: { id: playlistId },
//       select: { userId: true, type: true },
//     });

//     if (!playlist) {
//       res.status(404).json({
//         success: false,
//         message: "Playlist not found",
//       });
//       return;
//     }

//     // Check if the user owns this playlist or it's a SYSTEM playlist
//     if (playlist.type !== "SYSTEM" && playlist.userId !== userId) {
//       res.status(403).json({
//         success: false,
//         message: "You do not have permission to modify this playlist",
//       });
//       return;
//     }

//     // Use the AI service to suggest more tracks
//     const suggestedTrackIds = await aiService.suggestMoreTracksUsingAI(
//       playlistId,
//       userId,
//       count
//     );

//     // Get more details about the suggested tracks
//     const suggestedTracks = await prisma.track.findMany({
//       where: {
//         id: { in: suggestedTrackIds },
//         isActive: true,
//       },
//       include: {
//         artist: true,
//         album: true,
//       },
//     });

//     res.status(200).json({
//       success: true,
//       message: `Generated ${suggestedTrackIds.length} track suggestions for the playlist`,
//       data: suggestedTracks.map((track) => ({
//         id: track.id,
//         title: track.title,
//         artist: track.artist,
//         album: track.album,
//         duration: track.duration,
//         coverUrl: track.coverUrl,
//         audioUrl: track.audioUrl,
//       })),
//     });
//   } catch (error) {
//     console.error(
//       "Playlist suggestion error:",
//       error instanceof Error ? error.message : "Unknown error"
//     );
//     if (
//       error instanceof Error &&
//       error.message.includes("Playlist must have at least 3 tracks")
//     ) {
//       res.status(400).json({
//         // 400 Bad Request
//         success: false,
//         message: error.message,
//       });
//     } else {
//       // 500 Internal Server Error
//       res.status(500).json({
//         success: false,
//         message: "Failed to generate track suggestions",
//         error: error instanceof Error ? error.message : "Unknown error",
//       });
//     }
//   }
// };

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

// User listening stats route
export const getUserListeningStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    // @ts-ignore - Assuming getUserListeningStats is correctly added to playlistService
    const stats = await playlistService.getUserListeningStats(userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// Controller action to generate a system playlist for a specific user by an admin
export const generateSystemPlaylistForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminUserId = req.user?.id; // ID của admin thực hiện yêu cầu
    const { userId } = req.params; // ID của user mà playlist được tạo cho
    const {
      name, // Sẽ được truyền vào customName trong service
      description, // Sẽ được truyền vào customDescription trong service
      focusOnFeatures,
      requestedTrackCount = 20, // Giá trị mặc định nếu không được cung cấp
    } = req.body;

    if (!adminUserId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Admin access required",
      });
      return;
    }

    if (!userId) {
      res.status(400).json({
        success: false,
        message: "User ID is required to generate a system playlist.",
      });
      return;
    }

    // Giữ lại việc bắt buộc name và description theo logic modal và controller hiện tại
    if (!name) {
      res.status(400).json({
        success: false,
        message: "Playlist name is required.",
      });
      return;
    }
    // Kiểm tra độ dài của name
    if (name.length > 50) {
      res.status(400).json({
        success: false,
        message: "Playlist name cannot exceed 50 characters.",
      });
      return;
    }
    // Kiểm tra độ dài của description nếu nó được cung cấp
    if (description && description.trim().length > 150) {
      res.status(400).json({
        success: false,
        message: "Playlist description cannot exceed 150 characters.",
      });
      return;
    }

    if (
      !focusOnFeatures ||
      !Array.isArray(focusOnFeatures) ||
      focusOnFeatures.length === 0
    ) {
      res.status(400).json({
        success: false,
        message: "focusOnFeatures must be a non-empty array of strings.",
      });
      return;
    }

    if (
      typeof requestedTrackCount !== "number" ||
      requestedTrackCount < 10 ||
      requestedTrackCount > 50
    ) {
      res.status(400).json({
        success: false,
        message: "Requested track count must be a number between 10 and 50.",
      });
      return;
    }

    const playlist =
      await playlistService.generateSystemPlaylistFromHistoryFeatures(
        userId,
        focusOnFeatures,
        requestedTrackCount,
        name, // customName
        description // customDescription
      );

    res.status(201).json({
      success: true,
      message: "System playlist generated successfully for user.",
      data: playlist,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("No listening history found")
    ) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    } else if (
      error instanceof Error &&
      error.message.includes("Insufficient data for features")
    ) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    } else {
      next(error);
    }
  }
};

export const deleteUserPlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // ... (nội dung hàm deleteUserPlaylist giữ nguyên) ...
};

// NEW CONTROLLER ACTION
export const getPlaylistDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { playlistId } = req.params;
    if (!playlistId) {
      res
        .status(400)
        .json({ success: false, message: "Playlist ID is required" });
      return;
    }

    // Optional: Check if user has permission to view this playlist if it's not public
    // For admin panel, this might not be needed if admin can see all, or could be added based on playlist.userId
    // const requestingUserId = (req.user as AuthenticatedUser)?.id;
    // const requestingUserRole = (req.user as AuthenticatedUser)?.role;

    const playlistDetails = await playlistService.getPlaylistDetailsById(
      playlistId
    );

    // Service throws an error if not found, which will be caught by the error handler
    // or you can handle it here:
    // if (!playlistDetails) {
    //   res.status(404).json({ success: false, message: "Playlist not found" });
    //   return;
    // }

    res.json({ success: true, data: playlistDetails });
  } catch (error) {
    // Log the error for debugging on the backend
    console.error("[PlaylistController] Error in getPlaylistDetails:", error);
    // Forward the error to the global error handler (or handle specific errors here)
    next(error);
  }
};
// END OF NEW CONTROLLER ACTION

// NEW ADMIN CONTROLLER ACTION to delete a user-specific system playlist
export const adminDeleteSystemPlaylist = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { playlistId } = req.params;
    if (!playlistId) {
      res
        .status(400)
        .json({ success: false, message: "Playlist ID is required" });
      return;
    }

    // Assuming admin role is already verified by middleware
    await playlistService.deleteUserSpecificSystemPlaylist(playlistId);

    res.status(200).json({
      success: true,
      message: "System playlist deleted successfully.",
    });
  } catch (error) {
    // Handle specific errors from service (e.g., not found, not system playlist)
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
      if (
        error.message.includes("not a system playlist") ||
        error.message.includes("base system playlist template")
      ) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
    }
    // Forward other errors to global error handler
    next(error);
  }
};
