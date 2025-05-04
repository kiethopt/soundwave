import { PrismaClient, Role, FollowingType, Album, Track, HistoryType, Prisma } from '@prisma/client';
import {
  artistProfileSelect,
  albumSelect,
  trackSelect,
  userSelect,
} from '../utils/prisma-selects';
import { client, setCache } from '../middleware/cache.middleware';
import { uploadFile } from './upload.service';
import { format } from 'date-fns';

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

    // --- Calculate date ranges --- 
    const endDate = new Date();
    // For 6-month trends
    const trendStartDate6M = new Date();
    trendStartDate6M.setMonth(trendStartDate6M.getMonth() - 6);
    trendStartDate6M.setDate(1);
    trendStartDate6M.setHours(0, 0, 0, 0);
    // For 12-month stream trend
    const trendStartDate12M = new Date();
    trendStartDate12M.setMonth(trendStartDate12M.getMonth() - 12);
    trendStartDate12M.setDate(1);
    trendStartDate12M.setHours(0, 0, 0, 0);
     // For 5-year stream trend
    const trendStartDate5Y = new Date();
    trendStartDate5Y.setFullYear(trendStartDate5Y.getFullYear() - 5);
    trendStartDate5Y.setMonth(0, 1); // Start of the year
    trendStartDate5Y.setHours(0, 0, 0, 0);

    // Fetch main artist stats and trend data points
    const [
        artistData,
        totalPlaysData,
        albumsData,
        topTracksData,
        listenerHistoryForTopListeners, // Renamed for clarity
        followerRecords,
        likeRecords,
        playlistAddRecords,
        playHistoryForListenerTrend // Added query for listener trend
    ] = await Promise.all([
      // Artist Profile Data
      prisma.artistProfile.findUnique({
        where: { id: artistProfileId },
        select: {
          artistName: true,
          avatar: true,
          monthlyListeners: true,
          label: true,
          _count: {
            select: {
              albums: { where: { isActive: true } },
              tracks: { where: { isActive: true } },
              followers: { where: { followingType: FollowingType.ARTIST } }, // Total follower count
            },
          },
        },
      }),
      // Total Plays
      prisma.track.aggregate({
        where: { artistId: artistProfileId, isActive: true },
        _sum: {
          playCount: true,
        },
      }),
      // Albums for top album calculation
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
      // Top Tracks
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
      // Listener History for Top Listeners
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
          },
           createdAt: { // Using 6 month window for top listeners
             gte: trendStartDate6M, 
             lte: endDate,
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
      // Follower records for trend (6 months)
      prisma.userFollow.findMany({
        where: {
          followingArtistId: artistProfileId,
          followingType: FollowingType.ARTIST,
          createdAt: {
            gte: trendStartDate6M,
            lte: endDate,
          },
        },
        select: {
          createdAt: true,
        },
      }),
      // Like records for trend (6 months)
      prisma.userLikeTrack.findMany({
        where: {
          track: {
            artistId: artistProfileId,
            isActive: true,
          },
          createdAt: {
            gte: trendStartDate6M,
            lte: endDate,
          },
        },
        select: {
          createdAt: true,
        },
      }),
      // Playlist add records for trend (6 months)
      prisma.playlistTrack.findMany({
        where: {
          track: {
            artistId: artistProfileId,
            isActive: true,
          },
          addedAt: {
            gte: trendStartDate6M,
            lte: endDate,
          },
          playlist: {
            userId: { not: null },
          }
        },
        select: {
          addedAt: true,
          playlist: {
            select: { userId: true }
          }
        },
      }),
      // History records for Monthly Listener Trend (Last 6 Months)
      prisma.history.findMany({
        where: {
          type: HistoryType.PLAY,
          track: {
            artistId: artistProfileId,
            isActive: true,
          },
          createdAt: {
            gte: trendStartDate6M,
            lte: endDate,
          },
          user: { // Ensure user is active
            isActive: true,
          }
        },
        select: {
          userId: true,
          createdAt: true,
        },
      }),
    ]);

    if (!artistData) {
      throw new Error('Artist profile not found');
    }

    // --- Fetch Stream Trends Separately (using groupBy for efficiency) ---
    const monthlyStreamDataPromise = prisma.history.groupBy({
      by: ['createdAt'], // Group by the full date initially
      where: {
        type: HistoryType.PLAY,
        track: { artistId: artistProfileId, isActive: true },
        createdAt: {
          gte: trendStartDate12M,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc', 
      }
    });

    const yearlyStreamDataPromise = prisma.history.groupBy({
      by: ['createdAt'], // Group by the full date initially
      where: {
        type: HistoryType.PLAY,
        track: { artistId: artistProfileId, isActive: true },
        createdAt: {
          gte: trendStartDate5Y,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
       orderBy: {
        createdAt: 'asc', 
      }
    });

    // --- Process Top Listeners, Albums etc. --- 
    // --- Process Top Listeners ---
    const topListenerIds = listenerHistoryForTopListeners.map(item => item.userId);
    const topListenersDetails = topListenerIds.length > 0 ? await prisma.user.findMany({
        where: { id: { in: topListenerIds } },
        select: userSelect,
    }) : [];

    const topListeners = listenerHistoryForTopListeners.map(hist => {
        const userDetail = topListenersDetails.find(u => u.id === hist.userId);
        return {
            ...(userDetail || {}),
            totalPlays: hist._sum.playCount || 0,
        };
    }).filter(listener => listener.id);

    // --- Process Top Albums ---
    const albumsWithTotalPlays = albumsData.map((album: { id: string; title: string; coverUrl: string | null; tracks: { playCount: number | null }[] }) => {
      const totalAlbumPlays = album.tracks.reduce((sum: number, track: { playCount: number | null }) => sum + (track.playCount || 0), 0);
      return {
        id: album.id,
        title: album.title,
        coverUrl: album.coverUrl,
        totalPlays: totalAlbumPlays,
      };
    });
    const topAlbums = albumsWithTotalPlays
      .sort((a, b) => b.totalPlays - a.totalPlays)
      .slice(0, 5);

    const followerCount = artistData._count.followers;
    const totalPlays = totalPlaysData._sum.playCount || 0;

    // --- Process 6-Month Trends --- 
    const processTotalCountTrend6M = (records: { createdAt?: Date, addedAt?: Date }[], dateField: 'createdAt' | 'addedAt') => {
      const monthlyCounts: { [key: string]: number } = {};
      const labels: string[] = [];
      const data: number[] = [];
      const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });

      for (let i = 5; i >= 0; i--) {
        const date = new Date(endDate);
        date.setMonth(endDate.getMonth() - i);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = monthFormatter.format(date);
        monthlyCounts[yearMonth] = 0;
        labels.push(label);
      }
      
      records.forEach(record => {
        const recordDate = record[dateField];
        if (recordDate) {
          const yearMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyCounts[yearMonth] !== undefined) {
            monthlyCounts[yearMonth] += 1; // Increment count
          }
        }
      });

      labels.forEach((_, index) => {
        const date = new Date(endDate);
        date.setMonth(endDate.getMonth() - (5 - index));
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        data.push(monthlyCounts[yearMonth] || 0);
      });

      return { labels, data };
    };
    const processUniqueUserTrend6M = (records: { addedAt?: Date; playlist?: { userId: string | null } }[]) => {
      const monthlyUserSets: { [key: string]: Set<string> } = {};
      const labels: string[] = [];
      const data: number[] = [];
      const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });

      for (let i = 5; i >= 0; i--) {
        const date = new Date(endDate);
        date.setMonth(endDate.getMonth() - i);
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = monthFormatter.format(date);
        monthlyUserSets[yearMonth] = new Set<string>();
        labels.push(label);
      }
      
      records.forEach(record => {
        const recordDate = record.addedAt;
        const userId = record.playlist?.userId;
        if (recordDate && userId) {
          const yearMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyUserSets[yearMonth]) {
            monthlyUserSets[yearMonth].add(userId);
          }
        }
      });

      labels.forEach((_, index) => {
        const date = new Date(endDate);
        date.setMonth(endDate.getMonth() - (5 - index));
        const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        data.push(monthlyUserSets[yearMonth]?.size || 0);
      });

      return { labels, data };
    };
    const followerTrend = processTotalCountTrend6M(followerRecords, 'createdAt');
    const likeTrend = processTotalCountTrend6M(likeRecords, 'createdAt');
    const playlistAddTrend = processUniqueUserTrend6M(playlistAddRecords);

    // --- Fetch and Process Genre Distribution Data (Added Separately) --- 
    type GenreCountResult = { genreId: string; _count: { trackId: number } };
    const genreCounts = await prisma.trackGenre.groupBy({
        by: ['genreId'],
        where: {
          track: {
            artistId: artistProfileId,
            isActive: true,
          }
        },
        _count: {
          trackId: true,
        },
        orderBy: {
          _count: {
            trackId: 'desc'
          }
        }
      });

    let genreDistribution: { genreName: string; trackCount: number }[] = [];
    if (genreCounts.length > 0) {
      const genreIds = genreCounts.map(gc => gc.genreId);
      const genreDetails = await prisma.genre.findMany({
        where: { id: { in: genreIds } },
        select: { id: true, name: true }
      });
      const genreMap = new Map(genreDetails.map(g => [g.id, g.name]));
      genreDistribution = genreCounts.map(gc => ({
          genreName: genreMap.get(gc.genreId) || 'Unknown',
          trackCount: gc._count.trackId,
        })).filter(g => g.genreName !== 'Unknown');
    }
    // --- End Genre Distribution ---

    // --- Process Stream Trends --- 
    const [monthlyStreamData, yearlyStreamData] = await Promise.all([
        monthlyStreamDataPromise,
        yearlyStreamDataPromise
    ]);

    // Helper to process grouped stream data (monthly or yearly)
    const processStreamTrend = (streamData: { createdAt: Date; _count: { id: number } }[], months: number, unit: 'month' | 'year') => {
      const counts: { [key: string]: number } = {};
      const labels: string[] = [];
      const data: number[] = [];
      const now = new Date();

      // Initialize counts and labels
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now);
        if (unit === 'month') {
            date.setMonth(now.getMonth() - i);
            const key = format(date, 'yyyy-MM');
            const label = format(date, 'MMM');
            counts[key] = 0;
            labels.push(label);
        } else { // year
             date.setFullYear(now.getFullYear() - i);
             const key = format(date, 'yyyy');
             const label = key;
             counts[key] = 0;
             labels.push(label);
        }
      }

      // Aggregate counts from query results
      streamData.forEach(item => {
        const playCount = item._count.id || 0; // Use the count of records
         if (unit === 'month') {
            const key = format(item.createdAt, 'yyyy-MM');
            if (counts[key] !== undefined) {
                counts[key] += playCount;
            }
         } else { // year
             const key = format(item.createdAt, 'yyyy');
             if (counts[key] !== undefined) {
                 counts[key] += playCount;
             }
         }
      });

       // Populate data array
       labels.forEach((label, index) => {
            const date = new Date(now);
            let key = '';
             if (unit === 'month') {
                date.setMonth(now.getMonth() - (months - 1 - index));
                key = format(date, 'yyyy-MM');
             } else { // year
                 date.setFullYear(now.getFullYear() - (months - 1 - index));
                 key = format(date, 'yyyy');
             }
             data.push(counts[key] || 0);
       });

      return { labels, data };
    };

    const monthlyStreamTrend = processStreamTrend(monthlyStreamData, 12, 'month');
    const yearlyStreamTrend = processStreamTrend(yearlyStreamData, 5, 'year');

    // --- Process Monthly Listener Trend (Last 6 Months) ---
    const processListenerTrend6M = (records: { userId: string; createdAt: Date }[]) => {
      const monthlyUserSets: { [key: string]: Set<string> } = {};
      const labels: string[] = [];
      const data: number[] = [];
      const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });

      // Initialize monthly sets and labels for the last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(endDate);
        date.setMonth(endDate.getMonth() - i);
        const yearMonth = format(date, 'yyyy-MM'); // Use date-fns for formatting
        const label = monthFormatter.format(date);
        monthlyUserSets[yearMonth] = new Set<string>();
        labels.push(label);
      }

      // Populate the sets with unique user IDs for each month
      records.forEach(record => {
        const yearMonth = format(record.createdAt, 'yyyy-MM');
        if (monthlyUserSets[yearMonth]) {
          monthlyUserSets[yearMonth].add(record.userId);
        }
      });

      // Extract the size (unique listener count) for each month
      labels.forEach((_, index) => {
        const date = new Date(endDate);
        date.setMonth(endDate.getMonth() - (5 - index));
        const yearMonth = format(date, 'yyyy-MM');
        data.push(monthlyUserSets[yearMonth]?.size || 0);
      });

      return { labels, data };
    };

    const listenerTrend = processListenerTrend6M(playHistoryForListenerTrend);

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
      followerTrend,
      likeTrend,
      playlistAddTrend,
      genreDistribution,
      // --- Add Stream Trends ---
      monthlyStreamTrend,
      yearlyStreamTrend,
      label: artistData.label,
      listenerTrend,
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
