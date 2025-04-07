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
exports.playAlbum = exports.getAlbumById = exports.getAdminAllAlbums = exports.searchAlbum = exports.toggleAlbumVisibility = exports.deleteAlbum = exports.updateAlbum = exports.addTracksToAlbum = exports.createAlbum = exports.getAllAlbums = exports.getHotAlbums = exports.getNewestAlbums = exports.deleteAlbumById = void 0;
const db_1 = __importDefault(require("../config/db"));
const upload_service_1 = require("./upload.service");
const client_1 = require("@prisma/client");
const prisma_selects_1 = require("../utils/prisma-selects");
const pusher_1 = __importDefault(require("../config/pusher"));
const emailService = __importStar(require("./email.service"));
const handle_utils_1 = require("src/utils/handle-utils");
const canManageAlbum = (user, albumArtistId) => {
    if (!user)
        return false;
    if (user.role === client_1.Role.ADMIN)
        return true;
    return (user.artistProfile?.isVerified &&
        user.artistProfile?.role === client_1.Role.ARTIST &&
        user.artistProfile?.id === albumArtistId);
};
const validateAlbumData = (data) => {
    const { title, releaseDate, type } = data;
    if (!title?.trim())
        return 'Title is required';
    if (!releaseDate || isNaN(Date.parse(releaseDate)))
        return 'Valid release date is required';
    if (type && !Object.values(client_1.AlbumType).includes(type))
        return 'Invalid album type';
    return null;
};
const deleteAlbumById = async (id) => {
    const album = await db_1.default.album.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!album) {
        throw new Error('Album not found');
    }
    return db_1.default.album.delete({
        where: { id },
    });
};
exports.deleteAlbumById = deleteAlbumById;
const getNewestAlbums = async (limit = 10) => {
    return db_1.default.album.findMany({
        where: { isActive: true },
        orderBy: { releaseDate: 'desc' },
        take: limit,
        select: prisma_selects_1.albumSelect,
    });
};
exports.getNewestAlbums = getNewestAlbums;
const getHotAlbums = async (limit = 10) => {
    return db_1.default.album.findMany({
        where: {
            isActive: true,
            tracks: { some: { isActive: true } },
        },
        orderBy: [
            { tracks: { _count: 'desc' } },
            { releaseDate: 'desc' },
        ],
        take: limit,
        select: prisma_selects_1.albumSelect,
    });
};
exports.getHotAlbums = getHotAlbums;
const getAllAlbums = async (req) => {
    const { search, sortBy, sortOrder } = req.query;
    const user = req.user;
    const whereClause = {};
    if (user && user.role !== client_1.Role.ADMIN && user.artistProfile?.id) {
        whereClause.artistId = user.artistProfile.id;
    }
    if (search && typeof search === 'string') {
        whereClause.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { artist: { artistName: { contains: search, mode: 'insensitive' } } },
            { genres: { some: { genre: { name: { contains: search, mode: 'insensitive' } } } } },
        ];
    }
    const orderByClause = {};
    if (sortBy && typeof sortBy === 'string' && (sortOrder === 'asc' || sortOrder === 'desc')) {
        if (sortBy === 'title' || sortBy === 'type' || sortBy === 'releaseDate') {
            orderByClause[sortBy] = sortOrder;
        }
        else if (sortBy === 'totalTracks') {
            orderByClause.tracks = { _count: sortOrder };
        }
        else {
            orderByClause.releaseDate = 'desc';
        }
    }
    else {
        orderByClause.releaseDate = 'desc';
    }
    const result = await (0, handle_utils_1.paginate)(db_1.default.album, req, {
        where: whereClause,
        include: {
            artist: { select: { id: true, artistName: true, avatar: true } },
            genres: { include: { genre: true } },
            _count: { select: { tracks: true } },
        },
        orderBy: orderByClause,
    });
    const formattedAlbums = result.data.map((album) => ({
        ...album,
        totalTracks: album._count?.tracks ?? 0,
        genres: album.genres,
    }));
    return {
        data: formattedAlbums,
        pagination: result.pagination,
    };
};
exports.getAllAlbums = getAllAlbums;
const createAlbum = async (req) => {
    const user = req.user;
    if (!user)
        throw new Error('Forbidden');
    const { title, releaseDate, type = client_1.AlbumType.ALBUM, genres = [], artistId, labelId } = req.body;
    const coverFile = req.file;
    const genreArray = Array.isArray(genres) ? genres : genres ? [genres] : [];
    const validationError = validateAlbumData({ title, releaseDate, type });
    if (validationError)
        throw new Error(validationError);
    let targetArtistProfileId;
    let fetchedArtistProfile = null;
    if (user.role === client_1.Role.ADMIN && artistId) {
        const targetArtist = await db_1.default.artistProfile.findFirst({
            where: { id: artistId, isVerified: true, role: client_1.Role.ARTIST },
            select: { id: true, artistName: true },
        });
        if (!targetArtist)
            throw new Error('Artist profile not found or not verified');
        targetArtistProfileId = targetArtist.id;
        fetchedArtistProfile = targetArtist;
    }
    else if (user.artistProfile?.isVerified && user.artistProfile.role === client_1.Role.ARTIST) {
        targetArtistProfileId = user.artistProfile.id;
        fetchedArtistProfile = await db_1.default.artistProfile.findUnique({
            where: { id: targetArtistProfileId },
            select: { artistName: true },
        });
    }
    else {
        throw new Error('Not authorized to create albums');
    }
    const artistName = fetchedArtistProfile?.artistName || 'Nghệ sĩ';
    let coverUrl = null;
    if (coverFile) {
        const coverUpload = await (0, upload_service_1.uploadFile)(coverFile.buffer, 'covers', 'image');
        coverUrl = coverUpload.secure_url;
    }
    const releaseDateObj = new Date(releaseDate);
    const isActive = releaseDateObj <= new Date();
    let finalLabelId = null;
    if (labelId !== undefined) {
        if (typeof labelId !== 'string' && labelId !== null) {
            throw new Error(`Invalid labelId type: expected string or null, got ${typeof labelId}`);
        }
        if (labelId === null || labelId === '') {
            finalLabelId = null;
        }
        else {
            const labelExists = await db_1.default.label.findUnique({ where: { id: labelId } });
            if (!labelExists)
                throw new Error(`Invalid label ID: ${labelId} does not exist`);
            finalLabelId = labelId;
        }
    }
    const album = await db_1.default.album.create({
        data: {
            title,
            coverUrl,
            releaseDate: releaseDateObj,
            type,
            duration: 0,
            totalTracks: 0,
            artistId: targetArtistProfileId,
            isActive,
            labelId: finalLabelId,
            genres: { create: genreArray.map((genreId) => ({ genre: { connect: { id: genreId } } })) },
        },
        select: prisma_selects_1.albumSelect,
    });
    const followers = await db_1.default.userFollow.findMany({
        where: { followingArtistId: targetArtistProfileId, followingType: 'ARTIST' },
        select: { followerId: true },
    });
    const followerIds = followers.map((f) => f.followerId);
    const followerUsers = await db_1.default.user.findMany({
        where: { id: { in: followerIds } },
        select: { id: true, email: true },
    });
    const notificationsData = followers.map((follower) => ({
        type: client_1.NotificationType.NEW_ALBUM,
        message: `${artistName} vừa ra album mới: ${title}`,
        recipientType: client_1.RecipientType.USER,
        userId: follower.followerId,
        artistId: targetArtistProfileId,
        senderId: targetArtistProfileId,
    }));
    if (notificationsData.length > 0) {
        await db_1.default.notification.createMany({ data: notificationsData });
    }
    const releaseLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/album/${album.id}`;
    for (const user of followerUsers) {
        await pusher_1.default.trigger(`user-${user.id}`, 'notification', {
            type: client_1.NotificationType.NEW_ALBUM,
            message: `${artistName} vừa ra album mới: ${album.title}`,
        });
        if (user.email) {
            const emailOptions = emailService.createNewReleaseEmail(user.email, artistName, 'album', album.title, releaseLink);
            await emailService.sendEmail(emailOptions);
        }
    }
    return { message: 'Album created successfully', album };
};
exports.createAlbum = createAlbum;
const addTracksToAlbum = async (req) => {
    const user = req.user;
    const { albumId } = req.params;
    if (!user)
        throw new Error('Forbidden');
    const album = await db_1.default.album.findUnique({
        where: { id: albumId },
        select: { artistId: true, type: true, coverUrl: true, isActive: true, tracks: { select: { trackNumber: true } } },
    });
    if (!album)
        throw new Error('Album not found');
    if (!canManageAlbum(user, album.artistId))
        throw new Error('You can only add tracks to your own albums');
    const files = req.files;
    if (!files || !files.length)
        throw new Error('No files uploaded');
    const existingTracks = await db_1.default.track.findMany({
        where: { albumId },
        select: { trackNumber: true },
    });
    const maxTrackNumber = existingTracks.length > 0 ? Math.max(...existingTracks.map((t) => t.trackNumber || 0)) : 0;
    const titles = Array.isArray(req.body.title) ? req.body.title : [req.body.title];
    const releaseDates = Array.isArray(req.body.releaseDate) ? req.body.releaseDate : [req.body.releaseDate];
    const featuredArtists = Array.isArray(req.body.featuredArtists)
        ? req.body.featuredArtists.map((artists) => artists.split(','))
        : req.body.featuredArtists ? [req.body.featuredArtists.split(',')] : [];
    const mm = await Promise.resolve().then(() => __importStar(require('music-metadata')));
    const createdTracks = await Promise.all(files.map(async (file, index) => {
        const metadata = await mm.parseBuffer(file.buffer);
        const duration = Math.floor(metadata.format.duration || 0);
        const uploadResult = await (0, upload_service_1.uploadFile)(file.buffer, 'tracks', 'auto');
        const existingTrack = await db_1.default.track.findFirst({
            where: { title: titles[index], artistId: album.artistId },
        });
        if (existingTrack)
            throw new Error(`Track with title "${titles[index]}" already exists for this artist.`);
        const newTrackNumber = maxTrackNumber + index + 1;
        const track = await db_1.default.track.create({
            data: {
                title: titles[index],
                duration,
                releaseDate: new Date(releaseDates[index] || Date.now()),
                trackNumber: newTrackNumber,
                coverUrl: album.coverUrl,
                audioUrl: uploadResult.secure_url,
                artistId: album.artistId,
                albumId,
                type: album.type,
                isActive: album.isActive,
                ...(featuredArtists[index]?.length && {
                    featuredArtists: {
                        create: featuredArtists[index].map((artistProfileId) => ({
                            artistProfile: { connect: { id: artistProfileId.trim() } },
                        })),
                    },
                }),
            },
            select: prisma_selects_1.trackSelect,
        });
        return track;
    }));
    const tracks = await db_1.default.track.findMany({ where: { albumId }, select: { duration: true } });
    const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
    const updatedAlbum = await db_1.default.album.update({
        where: { id: albumId },
        data: { duration: totalDuration, totalTracks: tracks.length },
        select: prisma_selects_1.albumSelect,
    });
    return { message: 'Tracks added to album successfully', album: updatedAlbum, tracks: createdTracks };
};
exports.addTracksToAlbum = addTracksToAlbum;
const updateAlbum = async (req) => {
    const { id } = req.params;
    const { title, releaseDate, type, genres, labelId } = req.body;
    const coverFile = req.file;
    const user = req.user;
    if (!user)
        throw new Error('Forbidden');
    const album = await db_1.default.album.findUnique({
        where: { id },
        select: { artistId: true, coverUrl: true, labelId: true },
    });
    if (!album)
        throw new Error('Album not found');
    if (!canManageAlbum(user, album.artistId))
        throw new Error('You can only update your own albums');
    let coverUrl;
    if (coverFile) {
        const coverUpload = await (0, upload_service_1.uploadFile)(coverFile.buffer, 'covers', 'image');
        coverUrl = coverUpload.secure_url;
    }
    const updateData = {};
    if (title)
        updateData.title = title;
    if (releaseDate) {
        const newReleaseDate = new Date(releaseDate);
        updateData.releaseDate = newReleaseDate;
        updateData.isActive = newReleaseDate <= new Date();
    }
    if (type)
        updateData.type = type;
    if (coverUrl)
        updateData.coverUrl = coverUrl;
    if (labelId !== undefined) {
        if (typeof labelId !== 'string' && labelId !== null) {
            throw new Error(`Invalid labelId type: expected string or null, got ${typeof labelId}`);
        }
        if (labelId === null || labelId === '') {
            updateData.labelId = null;
        }
        else {
            const labelExists = await db_1.default.label.findUnique({ where: { id: labelId } });
            if (!labelExists)
                throw new Error(`Invalid label ID: ${labelId} does not exist`);
            updateData.labelId = labelId;
        }
    }
    if (genres !== undefined) {
        await db_1.default.albumGenre.deleteMany({ where: { albumId: id } });
        const genresArray = !genres
            ? []
            : Array.isArray(genres)
                ? genres
                : typeof genres === 'string'
                    ? genres.split(',').map((g) => g.trim())
                    : [genres];
        if (genresArray.length > 0) {
            const existingGenres = await db_1.default.genre.findMany({
                where: { id: { in: genresArray } },
                select: { id: true },
            });
            const validGenreIds = existingGenres.map((genre) => genre.id);
            const invalidGenreIds = genresArray.filter((id) => !validGenreIds.includes(id));
            if (invalidGenreIds.length > 0) {
                throw new Error(`Invalid genre IDs: ${invalidGenreIds.join(', ')}`);
            }
            updateData.genres = {
                create: genresArray.map((genreId) => ({
                    genre: { connect: { id: genreId.trim() } },
                })),
            };
        }
    }
    const updatedAlbum = await db_1.default.album.update({
        where: { id },
        data: updateData,
        select: prisma_selects_1.albumSelect,
    });
    return { message: 'Album updated successfully', album: updatedAlbum };
};
exports.updateAlbum = updateAlbum;
const deleteAlbum = async (req) => {
    const { id } = req.params;
    const user = req.user;
    if (!user)
        throw new Error('Forbidden');
    const album = await db_1.default.album.findUnique({
        where: { id },
        select: { artistId: true },
    });
    if (!album)
        throw new Error('Album not found');
    if (!canManageAlbum(user, album.artistId))
        throw new Error('You can only delete your own albums');
    await (0, exports.deleteAlbumById)(id);
    return { message: 'Album deleted successfully' };
};
exports.deleteAlbum = deleteAlbum;
const toggleAlbumVisibility = async (req) => {
    const { id } = req.params;
    const user = req.user;
    if (!user)
        throw new Error('Forbidden');
    const album = await db_1.default.album.findUnique({
        where: { id },
        select: { artistId: true, isActive: true },
    });
    if (!album)
        throw new Error('Album not found');
    if (!canManageAlbum(user, album.artistId))
        throw new Error('You can only toggle your own albums');
    const updatedAlbum = await db_1.default.album.update({
        where: { id },
        data: { isActive: !album.isActive },
        select: prisma_selects_1.albumSelect,
    });
    return {
        message: `Album ${updatedAlbum.isActive ? 'activated' : 'hidden'} successfully`,
        album: updatedAlbum,
    };
};
exports.toggleAlbumVisibility = toggleAlbumVisibility;
const searchAlbum = async (req) => {
    const { q, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const user = req.user;
    if (!q)
        throw new Error('Query is required');
    const searchQuery = String(q).trim();
    if (user) {
        const existingHistory = await db_1.default.history.findFirst({
            where: { userId: user.id, type: client_1.HistoryType.SEARCH, query: { equals: searchQuery, mode: 'insensitive' } },
        });
        if (existingHistory) {
            await db_1.default.history.update({ where: { id: existingHistory.id }, data: { updatedAt: new Date() } });
        }
        else {
            await db_1.default.history.create({ data: { type: client_1.HistoryType.SEARCH, query: searchQuery, userId: user.id } });
        }
    }
    const whereClause = {
        OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { artist: { artistName: { contains: searchQuery, mode: 'insensitive' } } },
        ],
    };
    if (user?.currentProfile === 'ARTIST' && user?.artistProfile?.id) {
        whereClause.artistId = user.artistProfile.id;
    }
    if (!user || user.role !== client_1.Role.ADMIN) {
        if (user?.artistProfile?.isVerified && user?.currentProfile === 'ARTIST') {
            whereClause.OR = [
                { isActive: true },
                { AND: [{ isActive: false }, { artistId: user.artistProfile.id }] },
            ];
        }
        else {
            whereClause.isActive = true;
        }
    }
    const [albums, total] = await Promise.all([
        db_1.default.album.findMany({
            where: whereClause,
            skip: offset,
            take: Number(limit),
            select: prisma_selects_1.albumSelect,
        }),
        db_1.default.album.count({ where: whereClause }),
    ]);
    return {
        albums,
        pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
};
exports.searchAlbum = searchAlbum;
const getAdminAllAlbums = async (req) => {
    const user = req.user;
    if (!user)
        throw new Error('Unauthorized');
    if (user.role !== client_1.Role.ADMIN && (!user.artistProfile?.isVerified || user.artistProfile?.role !== 'ARTIST')) {
        throw new Error('Forbidden: Only admins or verified artists can access this resource');
    }
    const { search, status, genres } = req.query;
    const whereClause = {};
    if (user.role !== client_1.Role.ADMIN && user.artistProfile?.id) {
        whereClause.artistId = user.artistProfile.id;
    }
    const conditions = [];
    if (search) {
        conditions.push({
            OR: [
                { title: { contains: String(search), mode: 'insensitive' } },
                { artist: { artistName: { contains: String(search), mode: 'insensitive' } } },
            ],
        });
    }
    if (status)
        whereClause.isActive = status === 'true';
    if (genres) {
        const genreIds = Array.isArray(genres) ? genres : [genres];
        if (genreIds.length > 0) {
            conditions.push({ genres: { some: { genreId: { in: genreIds } } } });
        }
    }
    if (conditions.length > 0)
        whereClause.AND = conditions;
    const result = await (0, exports.getAllAlbums)(req);
    return { albums: result.data, pagination: result.pagination };
};
exports.getAdminAllAlbums = getAdminAllAlbums;
const getAlbumById = async (req) => {
    const { id } = req.params;
    const user = req.user;
    const isAuthenticated = !!user;
    const album = await db_1.default.album.findUnique({
        where: { id, isActive: true },
        select: prisma_selects_1.albumSelect,
    });
    if (!album)
        throw new Error('Album not found');
    return { ...album, requiresAuth: !isAuthenticated };
};
exports.getAlbumById = getAlbumById;
const playAlbum = async (req) => {
    const { albumId } = req.params;
    const user = req.user;
    if (!user)
        throw new Error('Unauthorized');
    const album = await db_1.default.album.findFirst({
        where: { id: albumId, isActive: true },
        include: { tracks: { where: { isActive: true }, orderBy: { trackNumber: 'asc' }, take: 1, select: prisma_selects_1.trackSelect } },
    });
    if (!album || album.tracks.length === 0)
        throw new Error('Album or tracks not found');
    const firstTrack = album.tracks[0];
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const existingListen = await db_1.default.history.findFirst({
        where: { userId: user.id, track: { artistId: firstTrack.artistId }, createdAt: { gte: lastMonth } },
    });
    if (!existingListen) {
        await db_1.default.artistProfile.update({
            where: { id: firstTrack.artistId },
            data: { monthlyListeners: { increment: 1 } },
        });
    }
    await db_1.default.history.upsert({
        where: { userId_trackId_type: { userId: user.id, trackId: firstTrack.id, type: 'PLAY' } },
        update: { playCount: { increment: 1 }, updatedAt: new Date() },
        create: {
            type: 'PLAY',
            trackId: firstTrack.id,
            userId: user.id,
            duration: firstTrack.duration,
            completed: true,
            playCount: 1,
        },
    });
    return { message: 'Album playback started', track: firstTrack };
};
exports.playAlbum = playAlbum;
//# sourceMappingURL=album.service.js.map