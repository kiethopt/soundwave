"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtistService = void 0;
const client_1 = require("@prisma/client");
const prisma_selects_1 = require("../utils/prisma-selects");
const cache_middleware_1 = require("../middleware/cache.middleware");
const upload_service_1 = require("./upload.service");
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
        const artistStats = await prisma.artistProfile.findUnique({
            where: { id: artistProfileId },
            select: {
                monthlyListeners: true,
                _count: { select: { albums: true, tracks: true } },
            },
        });
        if (!artistStats) {
            throw new Error('Artist profile not found');
        }
        const topTracks = await prisma.track.findMany({
            where: { artistId: artistProfileId },
            select: prisma_selects_1.trackSelect,
            orderBy: { playCount: 'desc' },
            take: 5,
        });
        return {
            monthlyListeners: artistStats.monthlyListeners,
            albumCount: artistStats._count.albums,
            trackCount: artistStats._count.tracks,
            topTracks,
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