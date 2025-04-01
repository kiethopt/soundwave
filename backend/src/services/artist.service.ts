// artist.service.ts
import { PrismaClient, Role } from '@prisma/client';
import { artistProfileSelect, albumSelect, trackSelect } from '../utils/prisma-selects';
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
    static async canViewArtistData(user: any, artistProfileId: string): Promise<boolean> {
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

    static async getArtistAlbums(user: any, id: string, page: number, limit: number) {
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

    static async getArtistTracks(user: any, id: string, page: number, limit: number) {
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
            const result = await uploadFile(files.avatar[0].buffer, 'avatar', 'image');
            avatarUrl = result.secure_url;
        }

        let bannerUrl: string | undefined;
        if (files?.artistBanner?.[0]) {
            const result = await uploadFile(files.artistBanner[0].buffer, 'artistBanner', 'image');
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
                ...(data.socialMediaLinks && { socialMediaLinks: data.socialMediaLinks }),
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
            select: trackSelect,
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