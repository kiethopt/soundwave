import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { RequestHandler } from 'express';
import * as aiService from '../services/ai.service';
// import * as playlistService from '../services/playlist.service';
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

    const playlist = await aiService.generatePersonalizedPlaylist(userId, {
      name,
      description,
      trackCount,
      basedOnMood,
      basedOnGenre,
      basedOnArtist,
      includeTopTracks,
      includeNewReleases,
    });

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

    // Thêm totalTracks vào response
    const playlistsWithCount = playlists.map((playlist) => ({
      ...playlist,
      totalTracks: playlist._count.tracks,
      _count: undefined,
    }));

    res.json({
      success: true,
      data: playlistsWithCount,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy playlist theo id
export const getPlaylistById: RequestHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    console.log('Getting playlist with params:', {
      playlistId: id,
      userId,
      userFromReq: req.user, // Log toàn bộ user object
    });

    // Kiểm tra xem playlist có tồn tại không, không cần check userId
    const playlistExists = await prisma.playlist.findUnique({
      where: { id },
    });

    console.log('Playlist exists check:', playlistExists);

    if (!playlistExists) {
      res.status(404).json({
        success: false,
        message: 'Playlist not found',
      });
      return;
    }

    // Nếu playlist tồn tại, lấy đầy đủ thông tin
    const playlist = await prisma.playlist.findFirst({
      where: {
        id,
        userId, // Chỉ lấy playlist của user hiện tại
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
        },
      },
    });

    console.log('Full playlist data:', {
      found: !!playlist,
      trackCount: playlist?.tracks?.length,
      playlistData: playlist,
    });

    if (!playlist) {
      res.status(403).json({
        success: false,
        message: "You don't have permission to view this playlist",
      });
      return;
    }

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

    if (!trackId) {
      res.status(400).json({
        success: false,
        message: 'Track ID is required',
      });
      return;
    }

    // Kiểm tra playlist có tồn tại và thuộc về user không
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId,
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

    console.log('Removing track from playlist:', {
      playlistId,
      trackId,
      userId,
    });

    // Kiểm tra quyền sở hữu playlist
    const playlist = await prisma.playlist.findFirst({
      where: {
        id: playlistId,
        userId,
      },
    });

    if (!playlist) {
      res.status(404).json({
        success: false,
        message: 'Playlist không tồn tại hoặc bạn không có quyền truy cập',
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

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const playlist = await prisma.playlist.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!playlist) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy playlist',
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

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const playlist = await prisma.playlist.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!playlist) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy playlist',
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
