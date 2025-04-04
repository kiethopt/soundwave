"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTrackLiked = exports.unlikeTrack = exports.likeTrack = exports.playTrack = exports.getTracksByTypeAndGenre = exports.getTracksByGenre = exports.getTrackById = exports.getAllTracks = exports.getTracksByType = exports.searchTrack = exports.toggleTrackVisibility = exports.deleteTrack = exports.updateTrack = exports.createTrack = void 0;
const db_1 = __importDefault(require("../config/db"));
const upload_service_1 = require("../services/upload.service");
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../middleware/cache.middleware");
const trackService = __importStar(require("../services/track.service"));
const prisma_selects_1 = require("../utils/prisma-selects");
const client_2 = require("@prisma/client");
const pusher_1 = __importDefault(require("../config/pusher"));
const emailService = __importStar(require("../services/email.service"));
const canManageTrack = (user, trackArtistId) => {
    if (!user)
        return false;
    if (user.role === client_1.Role.ADMIN)
        return true;
    return (user.artistProfile?.isVerified &&
        user.artistProfile?.isActive &&
        user.artistProfile?.role === client_1.Role.ARTIST &&
        user.artistProfile?.id === trackArtistId);
};
const createTrack = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { title, releaseDate, trackNumber, albumId, featuredArtists, artistId, genreIds, } = req.body;
        const finalArtistId = user.role === 'ADMIN' && artistId ? artistId : user.artistProfile?.id;
        if (!finalArtistId) {
            res.status(400).json({
                message: user.role === 'ADMIN'
                    ? 'Artist ID is required'
                    : 'Only verified artists can create tracks',
            });
            return;
        }
        const artistProfile = await db_1.default.artistProfile.findUnique({
            where: { id: finalArtistId },
            select: { artistName: true },
        });
        const artistName = artistProfile?.artistName || 'Nghệ sĩ';
        if (!req.files) {
            res.status(400).json({ message: 'No files uploaded' });
            return;
        }
        const files = req.files;
        const audioFile = files.audioFile?.[0];
        const coverFile = files.coverFile?.[0];
        if (!audioFile) {
            res.status(400).json({ message: 'Audio file is required' });
            return;
        }
        const audioUpload = await (0, upload_service_1.uploadFile)(audioFile.buffer, 'tracks', 'auto');
        const coverUrl = coverFile
            ? (await (0, upload_service_1.uploadFile)(coverFile.buffer, 'covers', 'image')).secure_url
            : null;
        const mm = await Promise.resolve().then(() => __importStar(require('music-metadata')));
        const metadata = await mm.parseBuffer(audioFile.buffer);
        const duration = Math.floor(metadata.format.duration || 0);
        let isActive = false;
        let trackReleaseDate = releaseDate ? new Date(releaseDate) : new Date();
        if (albumId) {
            const album = await db_1.default.album.findUnique({
                where: { id: albumId },
                select: { isActive: true, releaseDate: true, coverUrl: true },
            });
            if (album) {
                isActive = album.isActive;
                trackReleaseDate = album.releaseDate;
                if (!coverUrl && album.coverUrl) {
                }
            }
        }
        else {
            const now = new Date();
            isActive = trackReleaseDate <= now;
        }
        const featuredArtistsArray = Array.isArray(featuredArtists)
            ? featuredArtists
            : featuredArtists
                ? featuredArtists.split(',').map((id) => id.trim())
                : [];
        const genreIdsArray = Array.isArray(genreIds)
            ? genreIds
            : genreIds
                ? genreIds.split(',').map((id) => id.trim())
                : [];
        const track = await db_1.default.track.create({
            data: {
                title,
                duration,
                releaseDate: trackReleaseDate,
                trackNumber: trackNumber ? Number(trackNumber) : null,
                coverUrl,
                audioUrl: audioUpload.secure_url,
                artistId: finalArtistId,
                albumId: albumId || null,
                type: albumId ? undefined : 'SINGLE',
                isActive,
                featuredArtists: featuredArtistsArray.length > 0
                    ? {
                        create: featuredArtistsArray.map((featArtistId) => ({
                            artistId: featArtistId,
                        })),
                    }
                    : undefined,
                genres: genreIdsArray.length > 0
                    ? {
                        create: genreIdsArray.map((genreId) => ({
                            genre: {
                                connect: { id: genreId },
                            },
                        })),
                    }
                    : undefined,
            },
            select: prisma_selects_1.trackSelect,
        });
        const followers = await db_1.default.userFollow.findMany({
            where: {
                followingArtistId: finalArtistId,
                followingType: 'ARTIST',
            },
            select: { followerId: true },
        });
        const followerIds = followers.map((f) => f.followerId);
        if (followerIds.length > 0) {
            const followerUsers = await db_1.default.user.findMany({
                where: { id: { in: followerIds } },
                select: { id: true, email: true },
            });
            const notificationsData = followers.map((follower) => ({
                type: client_2.NotificationType.NEW_TRACK,
                message: `${artistName} vừa ra track mới: ${title}`,
                recipientType: client_2.RecipientType.USER,
                userId: follower.followerId,
                artistId: finalArtistId,
                senderId: finalArtistId,
            }));
            try {
                await db_1.default.notification.createMany({ data: notificationsData });
            }
            catch (notiError) {
                console.error('Failed to create in-app notifications for new track:', notiError);
            }
            const releaseLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/track/${track.id}`;
            for (const user of followerUsers) {
                pusher_1.default
                    .trigger(`user-${user.id}`, 'notification', {
                    type: client_2.NotificationType.NEW_TRACK,
                    message: `${artistName} vừa ra track mới: ${track.title}`,
                })
                    .catch((err) => console.error(`Failed to trigger Pusher for user ${user.id}:`, err));
                if (user.email) {
                    try {
                        const emailOptions = emailService.createNewReleaseEmail(user.email, artistName, 'track', track.title, releaseLink, track.coverUrl);
                        await emailService.sendEmail(emailOptions);
                    }
                    catch (err) {
                        console.error(`Failed to send new track email to ${user.email}:`, err);
                    }
                }
                else {
                    console.warn(`Follower ${user.id} has no email for new track notification.`);
                }
            }
        }
        res.status(201).json({
            message: 'Track created successfully',
            track,
        });
    }
    catch (error) {
        console.error('Create track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createTrack = createTrack;
const updateTrack = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, releaseDate, type, trackNumber, albumId, featuredArtists, genreIds, updateFeaturedArtists, updateGenres, } = req.body;
        const currentTrack = await db_1.default.track.findUnique({
            where: { id },
            select: {
                releaseDate: true,
                isActive: true,
                artistId: true,
                featuredArtists: true,
                genres: true,
                coverUrl: true,
            },
        });
        if (!currentTrack) {
            res.status(404).json({ message: 'Track not found' });
            return;
        }
        if (!canManageTrack(req.user, currentTrack.artistId)) {
            res.status(403).json({
                message: 'You can only update your own tracks',
                code: 'NOT_TRACK_OWNER',
            });
            return;
        }
        const updateData = {};
        if (title)
            updateData.title = title;
        if (type)
            updateData.type = type;
        if (trackNumber)
            updateData.trackNumber = Number(trackNumber);
        if (albumId !== undefined)
            updateData.albumId = albumId || null;
        if (req.files && req.files.coverFile) {
            const coverFile = req.files.coverFile[0];
            const coverUpload = await (0, upload_service_1.uploadFile)(coverFile.buffer, 'covers', 'image');
            updateData.coverUrl = coverUpload.secure_url;
        }
        if (releaseDate) {
            const newReleaseDate = new Date(releaseDate);
            const now = new Date();
            if (newReleaseDate > now) {
                updateData.isActive = false;
            }
            else {
                updateData.isActive = true;
            }
            updateData.releaseDate = newReleaseDate;
        }
        const updatedTrack = await db_1.default.$transaction(async (tx) => {
            const updated = await tx.track.update({
                where: { id },
                data: updateData,
                select: prisma_selects_1.trackSelect,
            });
            if (updateFeaturedArtists === 'true') {
                await tx.trackArtist.deleteMany({
                    where: { trackId: id },
                });
                const artistsArray = !featuredArtists
                    ? []
                    : Array.isArray(featuredArtists)
                        ? featuredArtists
                        : [featuredArtists];
                if (artistsArray.length > 0) {
                    await tx.trackArtist.createMany({
                        data: artistsArray.map((artistId) => ({
                            trackId: id,
                            artistId: artistId.trim(),
                        })),
                        skipDuplicates: true,
                    });
                }
            }
            if (updateGenres === 'true') {
                await tx.trackGenre.deleteMany({
                    where: { trackId: id },
                });
                const genresArray = !genreIds
                    ? []
                    : Array.isArray(genreIds)
                        ? genreIds
                        : [genreIds];
                if (genresArray.length > 0) {
                    await tx.trackGenre.createMany({
                        data: genresArray.map((genreId) => ({
                            trackId: id,
                            genreId: genreId.trim(),
                        })),
                        skipDuplicates: true,
                    });
                }
            }
            return updated;
        });
        res.json({
            message: 'Track updated successfully',
            track: updatedTrack,
        });
    }
    catch (error) {
        console.error('Update track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateTrack = updateTrack;
const deleteTrack = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized: User not found' });
            return;
        }
        const track = await db_1.default.track.findUnique({
            where: { id },
            select: { artistId: true },
        });
        if (!track) {
            res.status(404).json({ message: 'Track not found' });
            return;
        }
        if (!canManageTrack(user, track.artistId)) {
            res.status(403).json({
                message: 'You can only delete your own tracks',
                code: 'NOT_TRACK_OWNER',
            });
            return;
        }
        await trackService.deleteTrackById(id);
        res.json({ message: 'Track deleted successfully' });
    }
    catch (error) {
        console.error('Delete track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteTrack = deleteTrack;
const toggleTrackVisibility = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized: User not found' });
            return;
        }
        const track = await db_1.default.track.findUnique({
            where: { id },
            select: { artistId: true, isActive: true },
        });
        if (!track) {
            res.status(404).json({ message: 'Track not found' });
            return;
        }
        if (!canManageTrack(user, track.artistId)) {
            res.status(403).json({
                message: 'You can only toggle visibility of your own tracks',
                code: 'NOT_TRACK_OWNER',
            });
            return;
        }
        const updatedTrack = await db_1.default.track.update({
            where: { id },
            data: { isActive: !track.isActive },
            select: prisma_selects_1.trackSelect,
        });
        res.json({
            message: `Track ${updatedTrack.isActive ? 'activated' : 'hidden'} successfully`,
            track: updatedTrack,
        });
    }
    catch (error) {
        console.error('Toggle track visibility error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.toggleTrackVisibility = toggleTrackVisibility;
const searchTrack = async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const user = req.user;
        if (!q) {
            res.status(400).json({ message: 'Query is required' });
            return;
        }
        const searchQuery = String(q).trim();
        if (user) {
            const existingHistory = await db_1.default.history.findFirst({
                where: {
                    userId: user.id,
                    type: 'SEARCH',
                    query: { equals: searchQuery, mode: client_1.Prisma.QueryMode.insensitive },
                },
            });
            if (existingHistory) {
                await db_1.default.history.update({
                    where: { id: existingHistory.id },
                    data: { updatedAt: new Date() },
                });
            }
            else {
                await db_1.default.history.create({
                    data: {
                        type: 'SEARCH',
                        query: searchQuery,
                        userId: user.id,
                    },
                });
            }
        }
        const searchConditions = [
            { title: { contains: searchQuery, mode: client_1.Prisma.QueryMode.insensitive } },
            {
                artist: {
                    artistName: {
                        contains: searchQuery,
                        mode: client_1.Prisma.QueryMode.insensitive,
                    },
                },
            },
            {
                featuredArtists: {
                    some: {
                        artistProfile: {
                            artistName: {
                                contains: searchQuery,
                                mode: client_1.Prisma.QueryMode.insensitive,
                            },
                        },
                    },
                },
            },
        ];
        let whereClause;
        if (user && user.currentProfile === 'ARTIST' && user.artistProfile?.id) {
            whereClause = {
                artistId: user.artistProfile.id,
                OR: searchConditions,
            };
        }
        else {
            whereClause = {
                AND: [
                    { isActive: true },
                    { artist: { isActive: true } },
                    { OR: searchConditions },
                ],
            };
        }
        const [tracks, total] = await Promise.all([
            db_1.default.track.findMany({
                where: whereClause,
                skip: offset,
                take: Number(limit),
                select: prisma_selects_1.trackSelect,
                orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
            }),
            db_1.default.track.count({ where: whereClause }),
        ]);
        res.json({
            tracks,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Search track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.searchTrack = searchTrack;
const getTracksByType = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = await cache_middleware_1.client.get(cacheKey);
            if (cachedData) {
                console.log(`[Redis] Cache hit for key: ${cacheKey}`);
                res.json(JSON.parse(cachedData));
                return;
            }
            console.log(`[Redis] Cache miss for key: ${cacheKey}`);
        }
        const { type } = req.params;
        let { page = 1, limit = 10 } = req.query;
        page = Math.max(1, parseInt(page));
        limit = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (page - 1) * limit;
        if (!Object.values(client_1.AlbumType).includes(type)) {
            res.status(400).json({ message: 'Invalid track type' });
            return;
        }
        const whereClause = { type: type };
        if (!req.user || !req.user.artistProfile?.id) {
            whereClause.isActive = true;
        }
        else {
            whereClause.OR = [
                { isActive: true },
                { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
            ];
        }
        const tracks = await db_1.default.track.findMany({
            where: whereClause,
            select: prisma_selects_1.trackSelect,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: Number(limit),
        });
        const totalTracks = await db_1.default.track.count({ where: whereClause });
        const result = {
            tracks,
            pagination: {
                total: totalTracks,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalTracks / Number(limit)),
            },
        };
        await (0, cache_middleware_1.setCache)(cacheKey, result);
        res.json(result);
    }
    catch (error) {
        console.error('Get tracks by type error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTracksByType = getTracksByType;
const getAllTracks = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (user.role !== client_1.Role.ADMIN &&
            (!user.artistProfile?.isVerified || user.artistProfile?.role !== 'ARTIST')) {
            res.status(403).json({
                message: 'Forbidden: Only admins or verified artists can access this resource',
            });
            return;
        }
        const { search, status, genres } = req.query;
        const whereClause = {};
        if (user.role !== client_1.Role.ADMIN && user.artistProfile?.id) {
            whereClause.artistId = user.artistProfile.id;
        }
        if (search) {
            whereClause.OR = [
                { title: { contains: String(search), mode: 'insensitive' } },
                {
                    artist: {
                        artistName: { contains: String(search), mode: 'insensitive' },
                    },
                },
            ];
        }
        if (status) {
            whereClause.isActive = status === 'true';
        }
        if (genres) {
            const genreIds = Array.isArray(genres)
                ? genres.map((g) => String(g))
                : [String(genres)];
            whereClause.genres = {
                some: {
                    genreId: {
                        in: genreIds,
                    },
                },
            };
        }
        const result = await trackService.getAllTracks(req);
        res.json({
            tracks: result.data,
            pagination: result.pagination,
        });
    }
    catch (error) {
        console.error('Get tracks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllTracks = getAllTracks;
const getTrackById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const track = await db_1.default.track.findUnique({
            where: { id },
            select: prisma_selects_1.trackSelect,
        });
        if (!track) {
            res.status(404).json({ message: 'Track not found' });
            return;
        }
        if (user?.role === client_1.Role.ADMIN) {
            res.json(track);
            return;
        }
        if (!track.isActive) {
            if (user?.artistProfile?.id === track.artistId) {
                if (!user.artistProfile.isVerified || !user.artistProfile.isActive) {
                    res.status(403).json({
                        message: 'Your artist profile is not verified or inactive',
                        code: 'INVALID_ARTIST_PROFILE',
                    });
                    return;
                }
                res.json(track);
                return;
            }
            res.status(403).json({
                message: 'You do not have permission to view this track',
                code: 'TRACK_NOT_ACCESSIBLE',
            });
            return;
        }
        res.json(track);
    }
    catch (error) {
        console.error('Get track by id error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTrackById = getTrackById;
const getTracksByGenre = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = await cache_middleware_1.client.get(cacheKey);
            if (cachedData) {
                console.log(`[Redis] Cache hit for key: ${cacheKey}`);
                res.json(JSON.parse(cachedData));
                return;
            }
            console.log(`[Redis] Cache miss for key: ${cacheKey}`);
        }
        const { genreId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const genre = await db_1.default.genre.findUnique({
            where: { id: genreId },
        });
        if (!genre) {
            res.status(404).json({ message: 'Genre not found' });
            return;
        }
        const whereClause = {
            genres: {
                some: {
                    genreId: genreId,
                },
            },
        };
        if (!req.user || !req.user.artistProfile?.id) {
            whereClause.isActive = true;
        }
        else {
            whereClause.OR = [
                { isActive: true },
                { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
            ];
        }
        const tracks = await db_1.default.track.findMany({
            where: whereClause,
            select: {
                ...prisma_selects_1.trackSelect,
                genres: {
                    where: {
                        genreId: genreId,
                    },
                    select: {
                        genre: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: Number(limit),
        });
        const totalTracks = await db_1.default.track.count({
            where: whereClause,
        });
        const result = {
            tracks,
            pagination: {
                total: totalTracks,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalTracks / Number(limit)),
            },
        };
        await (0, cache_middleware_1.setCache)(cacheKey, result);
        res.json(result);
    }
    catch (error) {
        console.error('Get tracks by genre error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTracksByGenre = getTracksByGenre;
const getTracksByTypeAndGenre = async (req, res) => {
    try {
        const cacheKey = req.originalUrl;
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = await cache_middleware_1.client.get(cacheKey);
            if (cachedData) {
                console.log(`[Redis] Cache hit for key: ${cacheKey}`);
                res.json(JSON.parse(cachedData));
                return;
            }
            console.log(`[Redis] Cache miss for key: ${cacheKey}`);
        }
        const { type, genreId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        if (!Object.values(client_1.AlbumType).includes(type)) {
            res.status(400).json({ message: 'Invalid track type' });
            return;
        }
        const genre = await db_1.default.genre.findUnique({
            where: { id: genreId },
        });
        if (!genre) {
            res.status(404).json({ message: 'Genre not found' });
            return;
        }
        const whereClause = {
            type: type,
            genres: {
                some: {
                    genreId: genreId,
                },
            },
        };
        if (!req.user || !req.user.artistProfile?.id) {
            whereClause.isActive = true;
        }
        else {
            whereClause.OR = [
                { isActive: true },
                { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
            ];
        }
        const tracks = await db_1.default.track.findMany({
            where: whereClause,
            select: {
                ...prisma_selects_1.trackSelect,
                genres: {
                    where: {
                        genreId: genreId,
                    },
                    select: {
                        genre: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: Number(limit),
        });
        const totalTracks = await db_1.default.track.count({
            where: whereClause,
        });
        const result = {
            tracks,
            pagination: {
                total: totalTracks,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalTracks / Number(limit)),
            },
        };
        await (0, cache_middleware_1.setCache)(cacheKey, result);
        res.json(result);
    }
    catch (error) {
        console.error('Get tracks by type and genre error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTracksByTypeAndGenre = getTracksByTypeAndGenre;
const playTrack = async (req, res) => {
    try {
        const { trackId } = req.params;
        const user = req.user;
        const sessionId = req.header('Session-ID');
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const track = await db_1.default.track.findFirst({
            where: {
                id: trackId,
                isActive: true,
                OR: [{ album: null }, { album: { isActive: true } }],
            },
            select: prisma_selects_1.trackSelect,
        });
        if (!track) {
            res.status(404).json({ message: 'Track not found' });
            return;
        }
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const existingListen = await db_1.default.history.findFirst({
            where: {
                userId: user.id,
                track: { artistId: track.artistId },
                createdAt: { gte: lastMonth },
            },
        });
        if (!existingListen) {
            await db_1.default.artistProfile.update({
                where: { id: track.artistId },
                data: { monthlyListeners: { increment: 1 } },
            });
        }
        await db_1.default.history.upsert({
            where: {
                userId_trackId_type: {
                    userId: user.id,
                    trackId: track.id,
                    type: 'PLAY',
                },
            },
            update: {
                playCount: { increment: 1 },
                updatedAt: new Date(),
            },
            create: {
                type: 'PLAY',
                trackId: track.id,
                userId: user.id,
                duration: track.duration,
                completed: true,
                playCount: 1,
            },
        });
        await db_1.default.track.update({
            where: { id: track.id },
            data: { playCount: { increment: 1 } },
        });
        res.json({
            message: 'Track playback started',
            track: track,
        });
    }
    catch (error) {
        console.error('Play track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.playTrack = playTrack;
const likeTrack = async (req, res) => {
    try {
        const { trackId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const result = await trackService.likeTrack(userId, trackId);
        res.json({
            message: 'Track liked successfully',
            data: result,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Track already liked') {
                res.status(400).json({ message: error.message });
                return;
            }
            if (error.message === 'Track not found or not active') {
                res.status(404).json({ message: error.message });
                return;
            }
        }
        console.error('Like track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.likeTrack = likeTrack;
const unlikeTrack = async (req, res) => {
    try {
        const { trackId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        await trackService.unlikeTrack(userId, trackId);
        res.json({
            message: 'Track unliked successfully',
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Track not liked') {
                res.status(400).json({ message: error.message });
                return;
            }
        }
        console.error('Unlike track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.unlikeTrack = unlikeTrack;
const checkTrackLiked = async (req, res) => {
    try {
        const { trackId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const like = await db_1.default.userLikeTrack.findUnique({
            where: {
                userId_trackId: {
                    userId,
                    trackId,
                },
            },
        });
        res.json({
            isLiked: !!like,
        });
    }
    catch (error) {
        console.error('Check track liked error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.checkTrackLiked = checkTrackLiked;
//# sourceMappingURL=track.controller.js.map