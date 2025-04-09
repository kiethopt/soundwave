import { PrismaClient, Role, FollowingType, Album, Track, HistoryType } from '@prisma/client';
import {
  artistProfileSelect,
  albumSelect,
  trackSelect,
  userSelect,
} from '../utils/prisma-selects';
import { client, setCache } from '../middleware/cache.middleware';
import { uploadFile } from './upload.service';

const prisma = new PrismaClient();

interface UpdateArtistProfileData {
  bio?: string;
  socialMediaLinks?: Record<string, string>;
  genreIds?: string[];
  isVerified?: boolean;
  artistName?: string;
}

export class ArtistService {
  static async canViewArtistData(
    user: any,
    artistProfileId: string
  ): Promise<boolean> {
    if (!user) return false;
    if (user.role === Role.ADMIN) return true;
    if (user.artistProfile?.isVerified) return true;
    return false;
  }

  static async canEditArtistData(
    user: any,
    artistProfileId: string
  ): Promise<{ canEdit: boolean; message?: string }> {
    if (!user) {
      return { canEdit: false, message: 'Unauthorized' };
    }

    if (user.role === Role.ADMIN) {
      return { canEdit: true };
    }

    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id: artistProfileId },
      select: { userId: true, isVerified: true },
    });

    if (!artistProfile) {
      return { canEdit: false, message: 'Artist profile not found' };
    }

    if (artistProfile.userId === user.id && artistProfile.isVerified) {
      return { canEdit: true };
    }

    return {
      canEdit: false,
      message: 'You do not have permission to edit this profile',
    };
  }

  static async getAllArtistsProfile(user: any, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const currentArtistId = user.artistProfile?.id;

    const whereCondition = {
      isVerified: true,
      role: Role.ARTIST,
      id: { not: currentArtistId },
    };

    const [artists, total] = await Promise.all([
      prisma.artistProfile.findMany({
        where: whereCondition,
        skip: offset,
        take: limit,
        select: artistProfileSelect,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.artistProfile.count({ where: whereCondition }),
    ]);

    return {
      artists,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getArtistProfile(id: string) {
    const cacheKey = `/api/artist/profile/${id}`;
    const cachedData = await client.get(cacheKey);

    if (cachedData) {
      console.log(`[Redis] Serving artist profile from cache: ${id}`);
      return JSON.parse(cachedData);
    }

    const artist = await prisma.artistProfile.findUnique({
      where: { id },
      select: artistProfileSelect,
    });

    if (artist) {
      await client.set(cacheKey, JSON.stringify(artist), { EX: 600 });
      console.log(`[Redis] Cached artist profile: ${id}`);
    }

    return artist;
  }

  static async getArtistAlbums(
    user: any,
    id: string,
    page: number,
    limit: number
  ) {
    const offset = (page - 1) * limit;
    const cacheKey = `/api/artists/${id}/albums?page=${page}&limit=${limit}`;

    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log('Serving artist albums from cache:', cacheKey);
        return JSON.parse(cachedData);
      }
    }

    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id },
      select: { id: true, isVerified: true, userId: true },
    });

    if (!artistProfile) {
      return null;
    }

    let whereCondition: any = { artistId: id };
    if (user.role !== Role.ADMIN && user.id !== artistProfile.userId) {
      whereCondition.isActive = true;
      if (!artistProfile.isVerified) {
        throw new Error('Artist is not verified');
      }
    }

    const [albums, total] = await Promise.all([
      prisma.album.findMany({
        where: whereCondition,
        skip: offset,
        take: limit,
        select: albumSelect,
        orderBy: { releaseDate: 'desc' },
      }),
      prisma.album.count({ where: whereCondition }),
    ]);

    const response = {
      albums,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    if (process.env.USE_REDIS_CACHE === 'true') {
      await setCache(cacheKey, response, 1800);
    }

    return response;
  }

  static async getArtistTracks(
    user: any,
    id: string,
    page: number,
    limit: number
  ) {
    const offset = (page - 1) * limit;
    const cacheKey = `/api/artists/${id}/tracks?page=${page}&limit=${limit}`;

    if (process.env.USE_REDIS_CACHE === 'true') {
      const cachedData = await client.get(cacheKey);
      if (cachedData) {
        console.log('Serving artist tracks from cache:', cacheKey);
        return JSON.parse(cachedData);
      }
    }

    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id },
      select: { id: true, isVerified: true, userId: true },
    });

    if (!artistProfile) {
      return null;
    }

    let whereCondition: any = { artistId: id };
    if (user.role !== Role.ADMIN && user.id !== artistProfile.userId) {
      whereCondition.isActive = true;
      if (!artistProfile.isVerified) {
        throw new Error('Artist is not verified');
      }
    }

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where: whereCondition,
        skip: offset,
        take: limit,
        select: trackSelect,
        orderBy: { releaseDate: 'desc' },
      }),
      prisma.track.count({ where: whereCondition }),
    ]);

    const response = {
      tracks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    if (process.env.USE_REDIS_CACHE === 'true') {
      await setCache(cacheKey, response, 1800);
    }

    return response;
  }

  static async updateArtistProfile(
    user: any,
    id: string,
    data: UpdateArtistProfileData,
    files?: { [fieldname: string]: Express.Multer.File[] }
  ) {
    const { canEdit, message } = await this.canEditArtistData(user, id);
    if (!canEdit) {
      throw new Error(message);
    }

    if (data.isVerified !== undefined && user?.role !== Role.ADMIN) {
      throw new Error('Only admin can change verification status');
    }

    let avatarUrl: string | undefined;
    if (files?.avatar?.[0]) {
      const result = await uploadFile(
        files.avatar[0].buffer,
        'avatar',
        'image'
      );
      avatarUrl = result.secure_url;
    }

    let bannerUrl: string | undefined;
    if (files?.artistBanner?.[0]) {
      const result = await uploadFile(
        files.artistBanner[0].buffer,
        'artistBanner',
        'image'
      );
      bannerUrl = result.secure_url;
    }

    if (data.genreIds?.length) {
      const existingGenres = await prisma.genre.findMany({
        where: { id: { in: data.genreIds } },
      });
      if (existingGenres.length !== data.genreIds.length) {
        throw new Error('One or more genres do not exist');
      }
    }

    const updatedArtistProfile = await prisma.artistProfile.update({
      where: { id },
      data: {
        artistName: data.artistName,
        bio: data.bio,
        ...(avatarUrl && { avatar: avatarUrl }),
        ...(bannerUrl && { artistBanner: bannerUrl }),
        ...(data.socialMediaLinks && {
          socialMediaLinks: data.socialMediaLinks,
        }),
        ...(data.isVerified !== undefined && {
          isVerified: data.isVerified,
          verifiedAt: data.isVerified ? new Date() : null,
        }),
        ...(data.genreIds && {
          genres: {
            deleteMany: {},
            create: data.genreIds.map((genreId) => ({ genreId })),
          },
        }),
      },
      select: artistProfileSelect,
    });

    await Promise.all([
      client.del(`/api/artists/profile/${id}`),
      client.del(`/api/artists/tracks/${id}`),
      client.del(`/api/artists/albums/${id}`),
      client.del(`/api/artists/stats/${id}`),
    ]);

    return updatedArtistProfile;
  }

  static async getArtistStats(user: any) {
    if (!user || !user.artistProfile) {
      throw new Error('Forbidden');
    }

    const artistProfileId = user.artistProfile.id;

    const [
        artistData,
        totalPlaysData,
        albumsData,
        topTracksData,
        listenerHistory,
        followersData,
        trackLikersData,
        artistGenresData
    ] = await Promise.all([
      prisma.artistProfile.findUnique({
        where: { id: artistProfileId },
        select: {
          artistName: true,
          avatar: true,
          monthlyListeners: true,
          _count: {
            select: {
              albums: { where: { isActive: true } },
              tracks: { where: { isActive: true } },
              followers: { where: { followingType: FollowingType.ARTIST } },
            },
          },
        },
      }),
      prisma.track.aggregate({
        where: { artistId: artistProfileId, isActive: true },
        _sum: {
          playCount: true,
        },
      }),
      prisma.album.findMany({
        where: {
          artistId: artistProfileId,
          isActive: true,
          tracks: { some: { isActive: true } },
        },
        select: {
          id: true,
          title: true,
          coverUrl: true,
          tracks: {
            where: { isActive: true },
            select: {
              playCount: true,
            },
          },
        },
      }),
      prisma.track.findMany({
        where: { artistId: artistProfileId, isActive: true },
        select: {
          id: true,
          title: true,
          playCount: true,
          coverUrl: true,
          duration: true,
          album: {
            select: {
              id: true,
              title: true,
            }
          }
        },
        orderBy: { playCount: 'desc' },
        take: 5,
      }),
      prisma.history.groupBy({
        by: ['userId'],
        where: {
          type: HistoryType.PLAY,
          track: {
            artistId: artistProfileId,
            isActive: true,
          },
          user: {
            isActive: true,
          }
        },
        _sum: {
          playCount: true,
        },
        orderBy: {
          _sum: {
            playCount: 'desc',
          },
        },
        take: 7,
      }),
      prisma.userFollow.findMany({
        where: {
          followingArtistId: artistProfileId,
          followingType: FollowingType.ARTIST,
          follower: {
            isActive: true,
          }
        },
        select: {
          follower: {
            select: userSelect,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
      prisma.userLikeTrack.findMany({
          where: {
              track: {
                  artistId: artistProfileId,
                  isActive: true,
              },
              user: {
                  isActive: true,
              }
          },
          select: {
              user: {
                  select: userSelect,
              },
              createdAt: true,
          },
          orderBy: {
              createdAt: 'desc',
          },
          distinct: ['userId'],
          take: 10,
      }),
      prisma.trackGenre.findMany({
        where: {
          track: {
            artistId: artistProfileId,
            isActive: true,
          }
        },
        select: {
          genre: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        distinct: ['genreId'],
      }),
    ]);

    if (!artistData) {
      throw new Error('Artist profile not found');
    }

    const topListenerIds = listenerHistory.map(item => item.userId);
    const topListenersDetails = topListenerIds.length > 0 ? await prisma.user.findMany({
        where: { id: { in: topListenerIds } },
        select: userSelect,
    }) : [];

    const topListeners = listenerHistory.map(hist => {
        const userDetail = topListenersDetails.find(u => u.id === hist.userId);
        return {
            ...(userDetail || {}),
            totalPlays: hist._sum.playCount || 0,
        };
    }).filter(listener => listener.id);

    // Tính tổng lượt nghe cho mỗi album và sắp xếp
    const albumsWithTotalPlays = albumsData.map((album: { id: string; title: string; coverUrl: string | null; tracks: { playCount: number | null }[] }) => {
      const totalAlbumPlays = album.tracks.reduce((sum: number, track: { playCount: number | null }) => sum + (track.playCount || 0), 0);
      return {
        id: album.id,
        title: album.title,
        coverUrl: album.coverUrl,
        totalPlays: totalAlbumPlays,
      };
    });

    // Sắp xếp albums theo tổng lượt nghe và lấy top 5
    const topAlbums = albumsWithTotalPlays
      .sort((a, b) => b.totalPlays - a.totalPlays)
      .slice(0, 5);

    const followerCount = artistData._count.followers;
    const totalPlays = totalPlaysData._sum.playCount || 0;

    // Trích xuất thông tin followers và track likers
    const followers = followersData.map(f => f.follower);
    const trackLikers = trackLikersData.map(l => l.user);

    // Extract genres from the new query result
    const genres = artistGenresData.map(tg => tg.genre);

    return {
      artistName: artistData.artistName,
      avatar: artistData.avatar,
      monthlyListeners: artistData.monthlyListeners || 0,
      albumCount: artistData._count.albums,
      trackCount: artistData._count.tracks,
      followerCount: followerCount,
      totalPlays: totalPlays,
      topTracks: topTracksData,
      topAlbums: topAlbums,
      topListeners: topListeners,
      followers: followers,
      trackLikers: trackLikers,
      genres: genres,
    };
  }

  static async getRelatedArtists(id: string) {
    const artistProfile = await prisma.artistProfile.findUnique({
      where: { id },
      select: { genres: { select: { genreId: true } } },
    });

    if (!artistProfile) {
      throw new Error('Artist not found');
    }

    const genreIds = artistProfile.genres.map((genre) => genre.genreId);
    return prisma.artistProfile.findMany({
      where: {
        genres: { some: { genreId: { in: genreIds } } },
        isVerified: true,
        id: { not: id },
      },
      select: artistProfileSelect,
      take: 10,
    });
  }
}
