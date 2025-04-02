import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { RequestHandler } from 'express';
import * as playlistService from '../services/playlist.service';
import { handleError } from '../utils/handle-utils';
import { createAIGeneratedPlaylist } from '../services/ai.service';
import { updateVibeRewindPlaylist as updateVibeRewindPlaylistService } from '../services/playlist.service';

const prisma = new PrismaClient();

// Tạo playlist FAVORITE (mặc định khi tạo tài khoản sẽ có 1 cái playlist này)
export const createFavoritePlaylist = async (userId: string): Promise<void> => {
  try {
    await prisma.playlist.create({
      data: {
        name: 'Bài hát yêu thích',
        description: 'Danh sách những bài hát yêu thích của bạn',
        privacy: 'PRIVATE',
        type: 'FAVORITE',
        userId,
      },
    });
  } catch (error) {
    console.error('Error creating favorite playlist:', error);
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
      privacy = 'PRIVATE',
      type = 'NORMAL',
    } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Nếu đang cố tạo playlist FAVORITE, kiểm tra xem đã có chưa
    if (type === 'FAVORITE') {
      const existingFavorite = await prisma.playlist.findFirst({
        where: {
          userId,
          type: 'FAVORITE',
        },
      });

      if (existingFavorite) {
        res.status(400).json({
          success: false,
          message: 'Bạn đã có playlist Yêu thích',
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
      message: 'Đã tạo playlist thành công',
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
        message: 'Unauthorized',
      });
      return;
    }

    // Check if we're filtering for system playlists only
    const filterType = req.header('X-Filter-Type');
    const isSystemFilter = filterType === 'system';

    // Create favorite playlist if it doesn't exist (for all non-system requests)
    if (!isSystemFilter) {
      // Kiểm tra xem có playlist yêu thích chưa
      let favoritePlaylist = await prisma.playlist.findFirst({
        where: {
          userId,
          type: 'FAVORITE',
        },
      });

      // Nếu chưa có, tạo mới playlist yêu thích
      if (!favoritePlaylist) {
        favoritePlaylist = await prisma.playlist.create({
          data: {
            name: 'Bài hát yêu thích',
            description: 'Danh sách những bài hát yêu thích của bạn',
            privacy: 'PRIVATE',
            type: 'FAVORITE',
            userId,
          },
        });
      }

      // Also check for Vibe Rewind playlist
      let vibeRewindPlaylist = await prisma.playlist.findFirst({
        where: {
          userId,
          name: 'Vibe Rewind',
        },
      });

      // Create Vibe Rewind playlist if it doesn't exist
      if (!vibeRewindPlaylist) {
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

        // Automatically update it with user's history if available
        try {
          await playlistService.updateVibeRewindPlaylist(userId);
        } catch (error) {
          console.error('Error initializing Vibe Rewind playlist:', error);
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
              type: 'SYSTEM',
            },
            // Global system playlists
            {
              type: 'SYSTEM',
              privacy: 'PUBLIC',
              user: {
                role: 'ADMIN',
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
              trackOrder: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
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
          canEdit: req.user?.role === 'ADMIN' || playlist.userId === userId,
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
          createdAt: 'desc',
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
        message: 'Playlist not found',
      });
      return;
    }

    // Check if this is a system playlist, favorite playlist, or public playlist
    const isSystemPlaylist = playlistExists.type === 'SYSTEM';
    const isFavoritePlaylist = playlistExists.type === 'FAVORITE';
    const isPublicPlaylist = playlistExists.privacy === 'PUBLIC';

    // For unauthenticated users, only allow PUBLIC or SYSTEM playlists
    if (!isAuthenticated && !isPublicPlaylist && !isSystemPlaylist) {
      res.status(401).json({
        success: false,
        message: 'Please log in to view this playlist',
      });
      return;
    }
    // If the playlist is the Recommended Playlist, update it automatically
    if (
      playlistExists.type === 'NORMAL' &&
      playlistExists.name === 'Vibe Rewind'
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
              trackOrder: 'asc',
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
              trackOrder: 'asc',
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
          message: 'Please log in to view this playlist',
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
              trackOrder: 'asc',
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
      ((isSystemPlaylist && userRole === 'ADMIN') ||
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
    console.error('Error in getPlaylistById:', error);
    next(error);
  }
};

// Thêm bài hát vào playlist
export const addTrackToPlaylist: RequestHandler = async (req, res, next) => {
  try {
    console.log('AddToPlaylist request:', {
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
        message: 'Track ID is required',
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
        message: 'Playlist not found',
      });
      return;
    }

    // Check if it's a SYSTEM playlist - only ADMIN can modify
    if (playlist.type === 'SYSTEM' && userRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can modify system playlists',
      });
      return;
    }

    // For regular playlists, check if the user owns it
    if (playlist.type !== 'SYSTEM' && playlist.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this playlist',
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
        message: 'Track not found',
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
        message: 'Track already exists in playlist',
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
      message: 'Track added to playlist successfully',
    });
    return;
  } catch (error) {
    console.error('Error in addTrackToPlaylist:', error);
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

    console.log('Removing track from playlist:', {
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
        message: 'Playlist not found',
      });
      return;
    }

    // Check if it's a SYSTEM playlist - only ADMIN can modify
    if (playlist.type === 'SYSTEM' && userRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can modify system playlists',
      });
      return;
    }

    // For regular playlists, check if the user owns it
    if (playlist.type !== 'SYSTEM' && playlist.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this playlist',
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
      message: 'Đã xóa bài hát khỏi playlist',
    });
    return;
  } catch (error) {
    console.error('Error removing track:', error);
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
        message: 'Unauthorized',
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
        message: 'Playlist not found',
      });
      return;
    }

    // Check if it's a SYSTEM playlist - only ADMIN can modify
    if (playlist.type === 'SYSTEM' && userRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can modify system playlists',
      });
      return;
    }

    // For regular playlists, check if the user owns it
    if (playlist.type !== 'SYSTEM' && playlist.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this playlist',
      });
      return;
    }

    const updatedPlaylist = await prisma.playlist.update({
      where: { id },
      data: {
        name,
        description,
        privacy,
      },
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
            trackOrder: 'asc',
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedPlaylist,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        res.status(400).json({
          success: false,
          message: 'Bạn đã có playlist với tên này',
        });
      }
    }
    res.status(500).json({
      success: false,
      message: 'Đã có lỗi xảy ra',
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
        message: 'Unauthorized',
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
        message: 'Playlist not found',
      });
      return;
    }

    // Check if it's a SYSTEM playlist - only ADMIN can delete
    if (playlist.type === 'SYSTEM' && userRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can delete system playlists',
      });
      return;
    }

    // For regular playlists, check if the user owns it
    if (playlist.type !== 'SYSTEM' && playlist.userId !== userId) {
      res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this playlist',
      });
      return;
    }

    await prisma.playlist.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Đã xóa playlist thành công',
    });
  } catch (error) {
    next(error);
  }
};

// Lấy các playlist từ hệ thống
export const getSystemPlaylists: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const isAuthenticated = !!userId;

    // Find global playlists for non-authenticated users
    // Or both global and user-specific playlists for authenticated users
    const systemPlaylists = await prisma.playlist.findMany({
      where: isAuthenticated
        ? {
            OR: [
              // Global system playlists (public)
              {
                type: 'SYSTEM',
                user: {
                  role: 'ADMIN',
                },
                privacy: 'PUBLIC',
              },
              // User-specific system playlists - no name filter here
              {
                type: 'SYSTEM',
                userId: userId,
              },
            ],
          }
        : {
            // Only global public playlists for non-authenticated users
            type: 'SYSTEM',
            privacy: 'PUBLIC',
            user: {
              role: 'ADMIN',
            },
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
            trackOrder: 'asc',
          },
        },
      },
    });

    // Transform data structure for consistent formatting
    const formattedPlaylists = systemPlaylists.map((playlist: any) => {
      const canEdit =
        isAuthenticated &&
        (req.user?.role === 'ADMIN' || playlist.userId === userId);

      // Handle playlist tracks properly with typing
      const formattedTracks = playlist.tracks.map((pt: any) => ({
        id: pt.track.id,
        title: pt.track.title,
        audioUrl: pt.track.audioUrl, // Add this line to ensure audioUrl is included
        duration: pt.track.duration,
        coverUrl: pt.track.coverUrl,
        artist: pt.track.artist,
        album: pt.track.album,
        createdAt: pt.track.createdAt.toISOString(),
      }));

      return {
        ...playlist,
        tracks: formattedTracks,
        canEdit,
      };
    });

    console.log(
      `Returning ${formattedPlaylists.length} system playlists for ${
        isAuthenticated ? 'authenticated' : 'non-authenticated'
      } user.`
    );

    res.json({
      success: true,
      data: formattedPlaylists,
    });
  } catch (error) {
    console.error('Error in getSystemPlaylists:', error);
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
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    await updateVibeRewindPlaylistService(user.id);

    res.status(200).json({
      success: true,
      message: 'Vibe Rewind playlist updated successfully',
    });
  } catch (error) {
    console.error('Update Vibe Rewind playlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update Vibe Rewind playlist',
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
        message: 'Unauthorized, please login',
      });
      return;
    }

    const {
      name,
      description,
      trackCount,
      basedOnMood,
      basedOnGenre,
      basedOnArtist,
    } = req.body;

    console.log(`[PlaylistController] Generating AI playlist with options:`, {
      name,
      description,
      trackCount,
      basedOnMood,
      basedOnGenre,
      basedOnArtist,
    });

    // Create playlist with AI recommendations
    const playlist = await createAIGeneratedPlaylist(userId, {
      name,
      description,
      trackCount: trackCount ? parseInt(trackCount, 10) : undefined,
      basedOnMood,
      basedOnGenre,
      basedOnArtist,
    });

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
            trackOrder: 'asc',
          },
        },
      },
    });

    if (!playlistWithTracks) {
      throw new Error('Failed to retrieve created playlist details');
    }

    // Count artists in the playlist
    const artistsInPlaylist = new Set();
    playlistWithTracks.tracks.forEach((pt) => {
      if (pt.track.artist) {
        artistsInPlaylist.add(pt.track.artist.artistName);
      }
    });

    res.status(200).json({
      success: true,
      message: `AI playlist generated successfully with ${playlistWithTracks.tracks.length} tracks from ${artistsInPlaylist.size} artists`,
      data: {
        ...playlist,
        artistCount: artistsInPlaylist.size,
        previewTracks: playlistWithTracks.tracks.slice(0, 3).map((pt) => ({
          id: pt.track.id,
          title: pt.track.title,
          artist: pt.track.artist?.artistName,
        })),
      },
    });
  } catch (error) {
    console.error('Error generating AI playlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI playlist',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// ------ SYSTEM PLAYLIST CONTROLLERS ------

// Tạo các system playlists mặc định (Admin only)
export const createSystemPlaylists: RequestHandler = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    await playlistService.createDefaultSystemPlaylists();

    res.status(200).json({
      success: true,
      message: 'System playlists created successfully',
    });
  } catch (error) {
    console.error('Create system playlists error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create system playlists',
    });
  }
};

// Lấy system playlist được cá nhân hóa cho user
export const getSystemPlaylist: RequestHandler = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const { playlistName } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const playlist = await playlistService.getPersonalizedSystemPlaylist(
      playlistName,
      user.id
    );

    if (!playlist) {
      res.status(404).json({
        success: false,
        message: `System playlist "${playlistName}" not found`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: playlist,
    });
  } catch (error) {
    console.error('Get system playlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system playlist',
    });
  }
};

// Cập nhật tất cả system playlists cho tất cả users (Admin only - cho cron job)
export const updateAllSystemPlaylists: RequestHandler = async (
  req,
  res
): Promise<void> => {
  try {
    // Admin check is now handled by middleware, no need to check here

    // Sử dụng setTimeout để không làm chặn response
    res.status(200).json({
      success: true,
      message: 'System playlists update job started',
    });

    // Update sau khi response đã gửi
    setTimeout(async () => {
      try {
        console.log('[AdminJob] Starting system playlist update');
        const result = await playlistService.updateAllSystemPlaylists();

        if (result.success) {
          console.log('[AdminJob] Successfully updated all system playlists');
        } else {
          console.error(
            `[AdminJob] Completed with ${result.errors.length} errors`
          );

          if (result.errors.length > 0) {
            // Log just a few errors as samples
            const sampleErrors = result.errors.slice(0, 3);
            console.error(
              '[AdminJob] Sample errors:',
              JSON.stringify(sampleErrors, null, 2)
            );

            if (result.errors.length > 3) {
              console.error(
                `[AdminJob] ...and ${result.errors.length - 3} more errors`
              );
            }
          }
        }
      } catch (error) {
        console.error(
          '[AdminJob] Critical error while updating system playlists:',
          error
        );
      }
    }, 10);
  } catch (error) {
    console.error('Update all system playlists error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start system playlists update job',
    });
  }
};

// Cập nhật system playlist cho một user cụ thể (Admin only hoặc user tự cập nhật)
export const updateSystemPlaylistForUser: RequestHandler = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const { playlistName, userId } = req.params;
    const user = req.user;

    // Ensure user exists
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Check if user is updating their own playlist
    if (user.id !== userId) {
      // If not, this must be an admin (already verified by middleware)
      // No need for a separate role check
    }

    await playlistService.updateSystemPlaylistForUser(playlistName, userId);

    res.status(200).json({
      success: true,
      message: `System playlist "${playlistName}" updated successfully for user`,
    });
  } catch (error) {
    console.error('Update system playlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update system playlist',
    });
  }
};

// Get homepage data (combines multiple endpoints for efficiency)
export const getHomePageData: RequestHandler = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const user = req.user; // May be undefined for non-authenticated users
    const userId = user?.id;

    // Get system playlists (global ones for all users)
    const systemPlaylists = await prisma.playlist.findMany({
      where: {
        type: 'SYSTEM',
        userId: null,
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
            trackOrder: 'asc',
          },
        },
      },
    });

    // Get newest albums
    const newestAlbums = await prisma.album.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      include: {
        artist: true,
      },
    });

    // Get popular albums
    const hotAlbums = await prisma.album.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          createdAt: 'desc',
        },
      ],
      take: 10,
      include: {
        artist: true,
      },
    });

    // Data to return for all users (authenticated or not)
    const responseData: {
      systemPlaylists: any[];
      newestAlbums: any[];
      hotAlbums: any[];
      userPlaylists: any[];
    } = {
      systemPlaylists,
      newestAlbums,
      hotAlbums,
      userPlaylists: [],
    };

    // Additional data for authenticated users
    if (userId) {
      // Get personalized playlists (system playlists personalized for this user)
      // We'll handle personalization by checking if each system playlist has content
      // and refreshing if needed when the user accesses them

      // Get user's playlists
      const userPlaylists = await prisma.playlist.findMany({
        where: {
          userId,
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
            take: 5, // Just get a few tracks for preview
            orderBy: {
              trackOrder: 'asc',
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      responseData.userPlaylists = userPlaylists;
    }

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Error getting homepage data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch homepage data',
    });
  }
};
