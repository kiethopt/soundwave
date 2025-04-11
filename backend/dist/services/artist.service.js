"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtistService = void 0;
const client_1 = require("@prisma/client");
const prisma_selects_1 = require("../utils/prisma-selects");
const cache_middleware_1 = require("../middleware/cache.middleware");
const upload_service_1 = require("./upload.service");
const date_fns_1 = require("date-fns");
const prisma = new client_1.PrismaClient();
class ArtistService {
    static async canViewArtistData(user, artistProfileId) {
        if (!user)
            return false;
        if (user.role === client_1.Role.ADMIN)
            return true;
        if (user.artistProfile?.isVerified)
            return true;
        return false;
    }
    static async canEditArtistData(user, artistProfileId) {
        if (!user) {
            return { canEdit: false, message: 'Unauthorized' };
        }
        if (user.role === client_1.Role.ADMIN) {
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
    static async getAllArtistsProfile(user, page, limit) {
        const offset = (page - 1) * limit;
        const currentArtistId = user.artistProfile?.id;
        const whereCondition = {
            isVerified: true,
            role: client_1.Role.ARTIST,
            id: { not: currentArtistId },
        };
        const [artists, total] = await Promise.all([
            prisma.artistProfile.findMany({
                where: whereCondition,
                skip: offset,
                take: limit,
                select: prisma_selects_1.artistProfileSelect,
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
    static async getArtistProfile(id) {
        const cacheKey = `/api/artist/profile/${id}`;
        const cachedData = await cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            console.log(`[Redis] Serving artist profile from cache: ${id}`);
            return JSON.parse(cachedData);
        }
        const artist = await prisma.artistProfile.findUnique({
            where: { id },
            select: prisma_selects_1.artistProfileSelect,
        });
        if (artist) {
            await cache_middleware_1.client.set(cacheKey, JSON.stringify(artist), { EX: 600 });
            console.log(`[Redis] Cached artist profile: ${id}`);
        }
        return artist;
    }
    static async getArtistAlbums(user, id, page, limit) {
        const offset = (page - 1) * limit;
        const cacheKey = `/api/artists/${id}/albums?page=${page}&limit=${limit}`;
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = await cache_middleware_1.client.get(cacheKey);
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
        let whereCondition = { artistId: id };
        if (user.role !== client_1.Role.ADMIN && user.id !== artistProfile.userId) {
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
                select: prisma_selects_1.albumSelect,
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
            await (0, cache_middleware_1.setCache)(cacheKey, response, 1800);
        }
        return response;
    }
    static async getArtistTracks(user, id, page, limit) {
        const offset = (page - 1) * limit;
        const cacheKey = `/api/artists/${id}/tracks?page=${page}&limit=${limit}`;
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = await cache_middleware_1.client.get(cacheKey);
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
        let whereCondition = { artistId: id };
        if (user.role !== client_1.Role.ADMIN && user.id !== artistProfile.userId) {
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
                select: prisma_selects_1.trackSelect,
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
            await (0, cache_middleware_1.setCache)(cacheKey, response, 1800);
        }
        return response;
    }
    static async updateArtistProfile(user, id, data, files) {
        const { canEdit, message } = await this.canEditArtistData(user, id);
        if (!canEdit) {
            throw new Error(message);
        }
        if (data.isVerified !== undefined && user?.role !== client_1.Role.ADMIN) {
            throw new Error('Only admin can change verification status');
        }
        let avatarUrl;
        if (files?.avatar?.[0]) {
            const result = await (0, upload_service_1.uploadFile)(files.avatar[0].buffer, 'avatar', 'image');
            avatarUrl = result.secure_url;
        }
        let bannerUrl;
        if (files?.artistBanner?.[0]) {
            const result = await (0, upload_service_1.uploadFile)(files.artistBanner[0].buffer, 'artistBanner', 'image');
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
            select: prisma_selects_1.artistProfileSelect,
        });
        await Promise.all([
            cache_middleware_1.client.del(`/api/artists/profile/${id}`),
            cache_middleware_1.client.del(`/api/artists/tracks/${id}`),
            cache_middleware_1.client.del(`/api/artists/albums/${id}`),
            cache_middleware_1.client.del(`/api/artists/stats/${id}`),
        ]);
        return updatedArtistProfile;
    }
    static async getArtistStats(user) {
        if (!user || !user.artistProfile) {
            throw new Error('Forbidden');
        }
        const artistProfileId = user.artistProfile.id;
        const endDate = new Date();
        const trendStartDate6M = new Date();
        trendStartDate6M.setMonth(trendStartDate6M.getMonth() - 6);
        trendStartDate6M.setDate(1);
        trendStartDate6M.setHours(0, 0, 0, 0);
        const trendStartDate12M = new Date();
        trendStartDate12M.setMonth(trendStartDate12M.getMonth() - 12);
        trendStartDate12M.setDate(1);
        trendStartDate12M.setHours(0, 0, 0, 0);
        const trendStartDate5Y = new Date();
        trendStartDate5Y.setFullYear(trendStartDate5Y.getFullYear() - 5);
        trendStartDate5Y.setMonth(0, 1);
        trendStartDate5Y.setHours(0, 0, 0, 0);
        const [artistData, totalPlaysData, albumsData, topTracksData, listenerHistory, followerRecords, likeRecords, playlistAddRecords] = await Promise.all([
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
                            followers: { where: { followingType: client_1.FollowingType.ARTIST } },
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
                    type: client_1.HistoryType.PLAY,
                    track: {
                        artistId: artistProfileId,
                        isActive: true,
                    },
                    user: {
                        isActive: true,
                    },
                    createdAt: {
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
            prisma.userFollow.findMany({
                where: {
                    followingArtistId: artistProfileId,
                    followingType: client_1.FollowingType.ARTIST,
                    createdAt: {
                        gte: trendStartDate6M,
                        lte: endDate,
                    },
                },
                select: {
                    createdAt: true,
                },
            }),
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
        ]);
        if (!artistData) {
            throw new Error('Artist profile not found');
        }
        const monthlyStreamDataPromise = prisma.history.groupBy({
            by: ['createdAt'],
            where: {
                type: client_1.HistoryType.PLAY,
                track: { artistId: artistProfileId, isActive: true },
                createdAt: {
                    gte: trendStartDate12M,
                    lte: endDate,
                },
            },
            _sum: {
                playCount: true,
            },
            orderBy: {
                createdAt: 'asc',
            }
        });
        const yearlyStreamDataPromise = prisma.history.groupBy({
            by: ['createdAt'],
            where: {
                type: client_1.HistoryType.PLAY,
                track: { artistId: artistProfileId, isActive: true },
                createdAt: {
                    gte: trendStartDate5Y,
                    lte: endDate,
                },
            },
            _sum: {
                playCount: true,
            },
            orderBy: {
                createdAt: 'asc',
            }
        });
        const topListenerIds = listenerHistory.map(item => item.userId);
        const topListenersDetails = topListenerIds.length > 0 ? await prisma.user.findMany({
            where: { id: { in: topListenerIds } },
            select: prisma_selects_1.userSelect,
        }) : [];
        const topListeners = listenerHistory.map(hist => {
            const userDetail = topListenersDetails.find(u => u.id === hist.userId);
            return {
                ...(userDetail || {}),
                totalPlays: hist._sum.playCount || 0,
            };
        }).filter(listener => listener.id);
        const albumsWithTotalPlays = albumsData.map((album) => {
            const totalAlbumPlays = album.tracks.reduce((sum, track) => sum + (track.playCount || 0), 0);
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
        const processTotalCountTrend6M = (records, dateField) => {
            const monthlyCounts = {};
            const labels = [];
            const data = [];
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
                        monthlyCounts[yearMonth] += 1;
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
        const processUniqueUserTrend6M = (records) => {
            const monthlyUserSets = {};
            const labels = [];
            const data = [];
            const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });
            for (let i = 5; i >= 0; i--) {
                const date = new Date(endDate);
                date.setMonth(endDate.getMonth() - i);
                const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const label = monthFormatter.format(date);
                monthlyUserSets[yearMonth] = new Set();
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
        let genreDistribution = [];
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
        const [monthlyStreamData, yearlyStreamData] = await Promise.all([
            monthlyStreamDataPromise,
            yearlyStreamDataPromise
        ]);
        const processStreamTrend = (streamData, months, unit) => {
            const counts = {};
            const labels = [];
            const data = [];
            const now = new Date();
            for (let i = months - 1; i >= 0; i--) {
                const date = new Date(now);
                if (unit === 'month') {
                    date.setMonth(now.getMonth() - i);
                    const key = (0, date_fns_1.format)(date, 'yyyy-MM');
                    const label = (0, date_fns_1.format)(date, 'MMM');
                    counts[key] = 0;
                    labels.push(label);
                }
                else {
                    date.setFullYear(now.getFullYear() - i);
                    const key = (0, date_fns_1.format)(date, 'yyyy');
                    const label = key;
                    counts[key] = 0;
                    labels.push(label);
                }
            }
            streamData.forEach(item => {
                const playCount = item._sum.playCount || 0;
                if (unit === 'month') {
                    const key = (0, date_fns_1.format)(item.createdAt, 'yyyy-MM');
                    if (counts[key] !== undefined) {
                        counts[key] += playCount;
                    }
                }
                else {
                    const key = (0, date_fns_1.format)(item.createdAt, 'yyyy');
                    if (counts[key] !== undefined) {
                        counts[key] += playCount;
                    }
                }
            });
            labels.forEach((label, index) => {
                const date = new Date(now);
                let key = '';
                if (unit === 'month') {
                    date.setMonth(now.getMonth() - (months - 1 - index));
                    key = (0, date_fns_1.format)(date, 'yyyy-MM');
                }
                else {
                    date.setFullYear(now.getFullYear() - (months - 1 - index));
                    key = (0, date_fns_1.format)(date, 'yyyy');
                }
                data.push(counts[key] || 0);
            });
            return { labels, data };
        };
        const monthlyStreamTrend = processStreamTrend(monthlyStreamData, 12, 'month');
        const yearlyStreamTrend = processStreamTrend(yearlyStreamData, 5, 'year');
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
            monthlyStreamTrend,
            yearlyStreamTrend,
        };
    }
    static async getRelatedArtists(id) {
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
            select: prisma_selects_1.artistProfileSelect,
            take: 10,
        });
    }
}
exports.ArtistService = ArtistService;
//# sourceMappingURL=artist.service.js.map