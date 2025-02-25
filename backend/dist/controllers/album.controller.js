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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.playAlbum = exports.getAlbumById = exports.getAllAlbums = exports.searchAlbum = exports.toggleAlbumVisibility = exports.deleteAlbum = exports.updateAlbum = exports.addTracksToAlbum = exports.createAlbum = void 0;
const db_1 = __importDefault(require("../config/db"));
const cloudinary_service_1 = require("../services/cloudinary.service");
const client_1 = require("@prisma/client");
const session_service_1 = require("../services/session.service");
const prisma_selects_1 = require("../utils/prisma-selects");
const client_2 = require("@prisma/client");
const pusher_1 = __importDefault(require("../config/pusher"));
const canManageAlbum = (user, albumArtistId) => {
    var _a, _b, _c;
    if (!user)
        return false;
    if (user.role === client_1.Role.ADMIN)
        return true;
    return (((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.isVerified) &&
        ((_b = user.artistProfile) === null || _b === void 0 ? void 0 : _b.role) === client_1.Role.ARTIST &&
        ((_c = user.artistProfile) === null || _c === void 0 ? void 0 : _c.id) === albumArtistId);
};
const validateAlbumData = (data) => {
    const { title, releaseDate, type } = data;
    if (!(title === null || title === void 0 ? void 0 : title.trim()))
        return 'Title is required';
    if (!releaseDate || isNaN(Date.parse(releaseDate)))
        return 'Valid release date is required';
    if (type && !Object.values(client_1.AlbumType).includes(type))
        return 'Invalid album type';
    return null;
};
const createAlbum = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = req.user;
        if (!user) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const { title, releaseDate, type = client_1.AlbumType.ALBUM, genres = [], artistId, } = req.body;
        const coverFile = req.file;
        const validationError = validateAlbumData({ title, releaseDate, type });
        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }
        let targetArtistProfileId;
        let targetArtist;
        if (user.role === client_1.Role.ADMIN && artistId) {
            targetArtist = yield db_1.default.artistProfile.findFirst({
                where: {
                    id: artistId,
                    isVerified: true,
                    role: client_1.Role.ARTIST,
                },
                include: { user: true },
            });
            if (!targetArtist) {
                res
                    .status(404)
                    .json({ message: 'Artist profile not found or not verified' });
                return;
            }
            targetArtistProfileId = targetArtist.id;
        }
        else if (((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.isVerified) &&
            user.artistProfile.role === client_1.Role.ARTIST) {
            targetArtistProfileId = user.artistProfile.id;
            targetArtist = { user };
        }
        else {
            res.status(403).json({ message: 'Not authorized to create albums' });
            return;
        }
        let coverUrl = null;
        if (coverFile) {
            const coverUpload = yield (0, cloudinary_service_1.uploadFile)(coverFile.buffer, 'covers', 'image');
            coverUrl = coverUpload.secure_url;
        }
        const releaseDateObj = new Date(releaseDate);
        const isActive = releaseDateObj <= new Date();
        const album = yield db_1.default.album.create({
            data: {
                title,
                coverUrl,
                releaseDate: releaseDateObj,
                type,
                duration: 0,
                totalTracks: 0,
                artistId: targetArtistProfileId,
                isActive,
                genres: {
                    create: genres.map((genreId) => ({
                        genre: { connect: { id: genreId } },
                    })),
                },
            },
            select: prisma_selects_1.albumSelect,
        });
        const artistProfile = yield db_1.default.artistProfile.findUnique({
            where: { id: targetArtistProfileId },
            select: { artistName: true },
        });
        const followers = yield db_1.default.userFollow.findMany({
            where: {
                followingArtistId: targetArtistProfileId,
                followingType: 'ARTIST',
            },
            select: { followerId: true },
        });
        const notificationsData = followers.map((follower) => ({
            type: client_2.NotificationType.NEW_ALBUM,
            message: `${(artistProfile === null || artistProfile === void 0 ? void 0 : artistProfile.artistName) || 'Unknown'} vừa ra album mới: ${title}`,
            recipientType: client_2.RecipientType.USER,
            userId: follower.followerId,
            artistId: targetArtistProfileId,
            senderId: targetArtistProfileId,
        }));
        yield db_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            if (notificationsData.length > 0) {
                yield tx.notification.createMany({ data: notificationsData });
            }
        }));
        for (const follower of followers) {
            yield pusher_1.default.trigger(`user-${follower.followerId}`, 'notification', {
                type: client_2.NotificationType.NEW_ALBUM,
                message: `${artistProfile === null || artistProfile === void 0 ? void 0 : artistProfile.artistName} vừa ra album mới: ${title}`,
            });
        }
        res.status(201).json({
            message: 'Album created successfully',
            album,
        });
    }
    catch (error) {
        console.error('Create album error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createAlbum = createAlbum;
const addTracksToAlbum = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = req.user;
        const { albumId } = req.params;
        if (!user) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const album = yield db_1.default.album.findUnique({
            where: { id: albumId },
            select: {
                artistId: true,
                type: true,
                coverUrl: true,
                isActive: true,
                tracks: {
                    select: { trackNumber: true },
                },
            },
        });
        if (!album) {
            res.status(404).json({ message: 'Album not found' });
            return;
        }
        if (user.role !== client_1.Role.ADMIN &&
            (!((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.isVerified) ||
                user.artistProfile.role !== client_1.Role.ARTIST ||
                user.artistProfile.id !== album.artistId)) {
            res.status(403).json({
                message: 'You can only add tracks to your own albums',
            });
            return;
        }
        if (!req.files || !Array.isArray(req.files)) {
            res.status(400).json({ message: 'No files uploaded' });
            return;
        }
        const files = req.files;
        if (!files || !files.length) {
            res.status(400).json({ message: 'No files uploaded' });
            return;
        }
        const existingTracks = yield db_1.default.track.findMany({
            where: { albumId },
            select: { trackNumber: true },
        });
        const maxTrackNumber = existingTracks.length > 0
            ? Math.max(...existingTracks.map((t) => t.trackNumber || 0))
            : 0;
        const titles = Array.isArray(req.body.title)
            ? req.body.title
            : [req.body.title];
        const releaseDates = Array.isArray(req.body.releaseDate)
            ? req.body.releaseDate
            : [req.body.releaseDate];
        const featuredArtists = Array.isArray(req.body.featuredArtists)
            ? req.body.featuredArtists.map((artists) => artists.split(','))
            : req.body.featuredArtists
                ? [req.body.featuredArtists.split(',')]
                : [];
        const mm = yield Promise.resolve().then(() => __importStar(require('music-metadata')));
        const createdTracks = yield Promise.all(files.map((file, index) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
                const metadata = yield mm.parseBuffer(file.buffer);
                const duration = Math.floor(metadata.format.duration || 0);
                const uploadResult = yield (0, cloudinary_service_1.uploadFile)(file.buffer, 'tracks', 'auto');
                const existingTrack = yield db_1.default.track.findFirst({
                    where: {
                        title: titles[index],
                        artistId: album.artistId,
                    },
                });
                if (existingTrack) {
                    throw new Error(`Track with title "${titles[index]}" already exists for this artist.`);
                }
                const newTrackNumber = maxTrackNumber + index + 1;
                const track = yield db_1.default.track.create({
                    data: Object.assign({ title: titles[index], duration, releaseDate: new Date(releaseDates[index] || Date.now()), trackNumber: newTrackNumber, coverUrl: album.coverUrl, audioUrl: uploadResult.secure_url, artistId: album.artistId, albumId, type: album.type, isActive: album.isActive }, (((_a = featuredArtists[index]) === null || _a === void 0 ? void 0 : _a.length) && {
                        featuredArtists: {
                            create: featuredArtists[index].map((artistProfileId) => ({
                                artistProfile: {
                                    connect: { id: artistProfileId.trim() },
                                },
                            })),
                        },
                    })),
                    select: prisma_selects_1.trackSelect,
                });
                return track;
            }
            catch (err) {
                console.error('Error processing track:', err);
                throw err;
            }
        })));
        const tracks = yield db_1.default.track.findMany({
            where: { albumId },
            select: { duration: true },
        });
        const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
        const updatedAlbum = yield db_1.default.album.update({
            where: { id: albumId },
            data: {
                duration: totalDuration,
                totalTracks: tracks.length,
            },
            select: prisma_selects_1.albumSelect,
        });
        res.status(201).json({
            message: 'Tracks added to album successfully',
            album: updatedAlbum,
            tracks: createdTracks,
        });
    }
    catch (error) {
        console.error('Add tracks to album error:', error);
        if (error instanceof Error) {
            res.status(400).json({ message: error.message });
        }
        else {
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});
exports.addTracksToAlbum = addTracksToAlbum;
const updateAlbum = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, releaseDate, type, genres, updateGenres } = req.body;
        const coverFile = req.file;
        const user = req.user;
        if (!user) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const album = yield db_1.default.album.findUnique({
            where: { id },
            select: { artistId: true, coverUrl: true },
        });
        if (!album) {
            res.status(404).json({ message: 'Album not found' });
            return;
        }
        if (!canManageAlbum(user, album.artistId)) {
            res.status(403).json({ message: 'You can only update your own albums' });
            return;
        }
        let coverUrl;
        if (coverFile) {
            const coverUpload = yield (0, cloudinary_service_1.uploadFile)(coverFile.buffer, 'covers', 'image');
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
        if (updateGenres === 'true') {
            yield db_1.default.albumGenre.deleteMany({ where: { albumId: id } });
            const genresArray = !genres
                ? []
                : Array.isArray(genres)
                    ? genres
                    : [genres];
            if (genresArray.length > 0) {
                updateData.genres = {
                    create: genresArray.map((genreId) => ({
                        genre: { connect: { id: genreId.trim() } },
                    })),
                };
            }
        }
        const updatedAlbum = yield db_1.default.album.update({
            where: { id },
            data: updateData,
            select: prisma_selects_1.albumSelect,
        });
        res.json({
            message: 'Album updated successfully',
            album: updatedAlbum,
        });
    }
    catch (error) {
        console.error('Update album error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateAlbum = updateAlbum;
const deleteAlbum = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = req.user;
        if (!user) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const album = yield db_1.default.album.findUnique({
            where: { id },
            select: { artistId: true },
        });
        if (!album) {
            res.status(404).json({ message: 'Album not found' });
            return;
        }
        if (!canManageAlbum(user, album.artistId)) {
            res.status(403).json({ message: 'You can only delete your own albums' });
            return;
        }
        yield db_1.default.album.delete({
            where: { id },
        });
        res.json({ message: 'Album deleted successfully' });
    }
    catch (error) {
        console.error('Delete album error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteAlbum = deleteAlbum;
const toggleAlbumVisibility = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = req.user;
        if (!user) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const album = yield db_1.default.album.findUnique({
            where: { id },
            select: { artistId: true, isActive: true },
        });
        if (!album) {
            res.status(404).json({ message: 'Album not found' });
            return;
        }
        if (!canManageAlbum(user, album.artistId)) {
            res.status(403).json({ message: 'You can only toggle your own albums' });
            return;
        }
        const updatedAlbum = yield db_1.default.album.update({
            where: { id },
            data: { isActive: !album.isActive },
            select: prisma_selects_1.albumSelect,
        });
        res.json({
            message: `Album ${updatedAlbum.isActive ? 'activated' : 'hidden'} successfully`,
            album: updatedAlbum,
        });
    }
    catch (error) {
        console.error('Toggle album error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.toggleAlbumVisibility = toggleAlbumVisibility;
const searchAlbum = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
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
            const existingHistory = yield db_1.default.history.findFirst({
                where: {
                    userId: user.id,
                    type: client_1.HistoryType.SEARCH,
                    query: {
                        equals: searchQuery,
                        mode: 'insensitive',
                    },
                },
            });
            if (existingHistory) {
                yield db_1.default.history.update({
                    where: { id: existingHistory.id },
                    data: { updatedAt: new Date() },
                });
            }
            else {
                yield db_1.default.history.create({
                    data: {
                        type: client_1.HistoryType.SEARCH,
                        query: searchQuery,
                        userId: user.id,
                    },
                });
            }
        }
        const whereClause = {
            OR: [
                { title: { contains: searchQuery, mode: 'insensitive' } },
                {
                    artist: {
                        artistName: { contains: searchQuery, mode: 'insensitive' },
                    },
                },
            ],
        };
        if ((user === null || user === void 0 ? void 0 : user.currentProfile) === 'ARTIST' && ((_a = user === null || user === void 0 ? void 0 : user.artistProfile) === null || _a === void 0 ? void 0 : _a.id)) {
            whereClause.artistId = user.artistProfile.id;
        }
        if (!user || user.role !== client_1.Role.ADMIN) {
            if (((_b = user === null || user === void 0 ? void 0 : user.artistProfile) === null || _b === void 0 ? void 0 : _b.isVerified) &&
                (user === null || user === void 0 ? void 0 : user.currentProfile) === 'ARTIST') {
                whereClause.OR = [
                    { isActive: true },
                    { AND: [{ isActive: false }, { artistId: user.artistProfile.id }] },
                ];
            }
            else {
                whereClause.isActive = true;
            }
        }
        const [albums, total] = yield Promise.all([
            db_1.default.album.findMany({
                where: whereClause,
                skip: offset,
                take: Number(limit),
                select: prisma_selects_1.albumSelect,
            }),
            db_1.default.album.count({ where: whereClause }),
        ]);
        res.json({
            albums,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Search album error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.searchAlbum = searchAlbum;
const getAllAlbums = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (user.role !== client_1.Role.ADMIN &&
            (!((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.isVerified) || ((_b = user.artistProfile) === null || _b === void 0 ? void 0 : _b.role) !== 'ARTIST')) {
            res.status(403).json({
                message: 'Forbidden: Only admins or verified artists can access this resource',
            });
            return;
        }
        const { page = 1, limit = 10, q: search, status, genres } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const whereClause = {};
        const conditions = [];
        if (search) {
            conditions.push({
                OR: [
                    { title: { contains: String(search), mode: 'insensitive' } },
                    {
                        artist: {
                            artistName: { contains: String(search), mode: 'insensitive' },
                        },
                    },
                ],
            });
        }
        if (status) {
            whereClause.isActive = status === 'true';
        }
        if (genres) {
            const genreIds = Array.isArray(genres) ? genres : [genres];
            if (genreIds.length > 0) {
                conditions.push({
                    genres: {
                        some: {
                            genreId: { in: genreIds },
                        },
                    },
                });
            }
        }
        if (user.role !== client_1.Role.ADMIN && ((_c = user.artistProfile) === null || _c === void 0 ? void 0 : _c.id)) {
            conditions.push({
                OR: [
                    { artistId: user.artistProfile.id },
                    {
                        tracks: {
                            some: {
                                featuredArtists: {
                                    some: { artistId: user.artistProfile.id },
                                },
                            },
                        },
                    },
                ],
            });
        }
        if (conditions.length > 0) {
            whereClause.AND = conditions;
        }
        const [albums, total] = yield Promise.all([
            db_1.default.album.findMany({
                where: whereClause,
                skip: offset,
                take: Number(limit),
                select: prisma_selects_1.albumSelect,
                orderBy: { createdAt: 'desc' },
            }),
            db_1.default.album.count({ where: whereClause }),
        ]);
        res.json({
            albums,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Get albums error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllAlbums = getAllAlbums;
const getAlbumById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const album = yield db_1.default.album.findUnique({
            where: { id },
            select: prisma_selects_1.albumSelect,
        });
        if (!album) {
            res.status(404).json({ message: 'Album not found' });
            return;
        }
        if (user.role === client_1.Role.ADMIN) {
            res.json(album);
            return;
        }
        if (((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.isVerified) && ((_b = user.artistProfile) === null || _b === void 0 ? void 0 : _b.isActive)) {
            if (user.currentProfile !== 'ARTIST') {
                res.status(403).json({
                    message: 'Please switch to Artist profile to access this page',
                    code: 'SWITCH_TO_ARTIST_PROFILE',
                });
                return;
            }
            const isOwner = user.artistProfile.id === album.artist.id;
            const isFeaturedArtist = album.tracks.some((track) => track.featuredArtists.some((fa) => { var _a; return fa.artistProfile.id === ((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.id); }));
            if (isOwner || isFeaturedArtist) {
                res.json(album);
                return;
            }
        }
        res.status(403).json({
            message: 'You do not have permission to access this album',
        });
    }
    catch (error) {
        console.error('Get album error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAlbumById = getAlbumById;
const playAlbum = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { albumId } = req.params;
        const user = req.user;
        const sessionId = req.header('Session-ID');
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!sessionId ||
            !(yield session_service_1.sessionService.validateSession(user.id, sessionId))) {
            res.status(401).json({ message: 'Invalid or expired session' });
            return;
        }
        yield session_service_1.sessionService.handleAudioPlay(user.id, sessionId);
        const album = yield db_1.default.album.findFirst({
            where: {
                id: albumId,
                isActive: true,
            },
            include: {
                tracks: {
                    where: { isActive: true },
                    orderBy: { trackNumber: 'asc' },
                    take: 1,
                    select: prisma_selects_1.trackSelect,
                },
            },
        });
        if (!album || album.tracks.length === 0) {
            res.status(404).json({ message: 'Album or tracks not found' });
            return;
        }
        const firstTrack = album.tracks[0];
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const existingListen = yield db_1.default.history.findFirst({
            where: {
                userId: user.id,
                track: { artistId: firstTrack.artistId },
                createdAt: { gte: lastMonth },
            },
        });
        if (!existingListen) {
            yield db_1.default.artistProfile.update({
                where: { id: firstTrack.artistId },
                data: { monthlyListeners: { increment: 1 } },
            });
        }
        yield db_1.default.history.upsert({
            where: {
                userId_trackId_type: {
                    userId: user.id,
                    trackId: firstTrack.id,
                    type: 'PLAY',
                },
            },
            update: {
                playCount: { increment: 1 },
                updatedAt: new Date(),
            },
            create: {
                type: 'PLAY',
                trackId: firstTrack.id,
                userId: user.id,
                duration: firstTrack.duration,
                completed: true,
                playCount: 1,
            },
        });
        res.json({
            message: 'Album playback started',
            track: firstTrack,
        });
    }
    catch (error) {
        console.error('Play album error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.playAlbum = playAlbum;
//# sourceMappingURL=album.controller.js.map