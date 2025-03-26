import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { RequestHandler } from 'express';
import * as playlistService from '../services/playlist.service';
import { systemPlaylistService } from '../services/playlist.service';
import { handleError } from '../utils/handle-utils';

const prisma = new PrismaClient();

// Tạo playlist dựa trên các yếu tố được chọn
export const createPersonalizedPlaylist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      name,
      description,
      trackCount,
      basedOnMood,
      basedOnGenre,
      basedOnArtist,
      includeTopTracks,
      includeNewReleases,
    } = req.body;

    const playlist = await playlistService.generatePersonalizedPlaylist(
      userId,
      {
        name,
        description,
        trackCount,
        basedOnMood,
        basedOnGenre,
        basedOnArtist,
        includeTopTracks,
        includeNewReleases,
      }
    );

    res.status(201).json({
      message: 'AI Playlist created successfully',
      playlist,
    });
  } catch (error) {
    handleError(res, error, 'Create AI playlist');
  }
};

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

// Get the system playlist (Soundwave Hits)
export const getSystemPlaylist: RequestHandler = async (req, res, next) => {
  try {
    // Find the system playlist
    const systemPlaylist = await prisma.playlist.findFirst({
      where: {
        OR: [
          { type: 'SYSTEM' },
          { name: 'Soundwave Hits: Trending Right Now' },
        ],
      },
    });

    if (!systemPlaylist) {
      res.status(404).json({
        success: false,
        message: 'System playlist not found',
      });
      return;
    }

    // Get the full details of the playlist with tracks
    const playlist = await prisma.playlist.findUnique({
      where: { id: systemPlaylist.id },
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

    // Add the canEdit field based on user role
    const userRole = req.user?.role;
    const canEdit = userRole === 'ADMIN';

    // Transform data structure
    const formattedTracks =
      playlist?.tracks.map((pt) => ({
        id: pt.track.id,
        title: pt.track.title,
        duration: pt.track.duration,
        coverUrl: pt.track.coverUrl,
        artist: pt.track.artist,
        album: pt.track.album,
        createdAt: pt.track.createdAt.toISOString(),
      })) || [];

    res.json({
      success: true,
      data: {
        ...playlist,
        tracks: formattedTracks,
        canEdit,
      },
    });
  } catch (error) {
    console.error('Error in getSystemPlaylist:', error);
    next(error);
  }
};

// Lấy các playlist được hệ thống tạo riêng cho user đang đăng nhập
export const getPersonalizedSystemPlaylists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const playlists = await prisma.playlist.findMany({
      where: {
        userId,
        type: 'SYSTEM',
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

    res.json({
      success: true,
      data: playlists,
    });
  } catch (error) {
    handleError(res, error, 'Get personalized system playlists');
  }
};

// Cập nhật tất cả playlist hệ thống
export const updateAllSystemPlaylists = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userRole = req.user?.role;

    // Chỉ ADMIN mới có quyền gọi API này
    if (userRole !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Only administrators can update system playlists',
      });
      return;
    }

    // Gọi service để cập nhật tất cả playlist hệ thống
    const result = await systemPlaylistService.updateAllSystemPlaylists();

    res.json({
      success: true,
      message: 'All system playlists have been updated successfully',
    });
  } catch (error) {
    handleError(res, error, 'Update all system playlists');
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

    // Lấy tất cả playlist của user
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

    // Check if this is a system playlist (based on type)
    // System playlists should be accessible to all users for viewing
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

    let playlist;

    if (
      isSystemPlaylist ||
      playlistExists.name === 'Soundwave Hits: Trending Right Now'
    ) {
      // For system playlists, don't filter by userId - allow viewing by anyone
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
    // Only ADMIN can edit SYSTEM playlists
    const canEdit =
      isAuthenticated && // Must be authenticated to edit anything
      ((isSystemPlaylist && userRole === 'ADMIN') ||
        (!isSystemPlaylist && playlist.userId === userId));

    // Transform data structure
    const formattedTracks = playlist.tracks.map((pt) => ({
      id: pt.track.id,
      title: pt.track.title,
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
  res,
  next
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

// Add this new controller function
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

export const createRecommendPlaylist = async (userId: string): Promise<void> => {
  try {
    // Check if the user has a listening history
    const hasHistory = await prisma.history.findFirst({
      where: {
        userId,
      },
    });

    if (!hasHistory) {
      throw new Error('User has no listening history to generate recommendations');
    }

    // Create the recommended playlist
    await prisma.playlist.create({
      data: {
        name: 'RECOMMENDED PLAYLIST',
        description: 'Danh sách bài hát được gợi ý dựa trên lịch sử nghe nhạc của bạn',
        privacy: 'PRIVATE',
        type: 'NORMAL',
        userId,
      },
    });
  } catch (error) {
    console.error('Error creating recommended playlist:', error);
    throw error;
  }
};

export const updateRecommendPlaylist: RequestHandler = async (
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

    // Automatically update the recommended playlist
    const recommendedPlaylist = await prisma.playlist.findFirst({
      where: {
        userId,
        type: 'NORMAL',
      },
    });

    if (!recommendedPlaylist) {
      // Create the recommended playlist if it doesn't exist
      await prisma.playlist.create({
        data: {
          name: 'RECOMMENDED PLAYLIST',
          description: 'Danh sách bài hát được gợi ý dựa trên lịch sử nghe nhạc của bạn',
          privacy: 'PRIVATE',
          type: 'NORMAL',
          userId,
        },
      });
    }

    // Call the service to update the recommended playlist tracks
    await playlistService.updateRecommendedPlaylistTracks(userId);

    res.status(200).json({
      success: true,
      message: 'Recommended playlist updated successfully',
    });
  } catch (error) {
    console.error('Error in updateRecommendPlaylist:', error);
    next(error);
  }
};
