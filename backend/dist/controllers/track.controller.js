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
exports.playTrack = exports.getTracksByTypeAndGenre = exports.getTracksByGenre = exports.getTrackById = exports.getAllTracks = exports.getTracksByType = exports.searchTrack = exports.toggleTrackVisibility = exports.deleteTrack = exports.updateTrack = exports.createTrack = void 0;
const db_1 = __importDefault(require("../config/db"));
const cloudinary_service_1 = require("../services/cloudinary.service");
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../middleware/cache.middleware");
const session_service_1 = require("../services/session.service");
const prisma_selects_1 = require("../utils/prisma-selects");
const validateTrackData = (data, isSingleTrack = true, validateRequired = true) => {
    const { title, duration, releaseDate, trackNumber, coverUrl, audioUrl, type, featuredArtists, } = data;
    if (validateRequired) {
        if (!(title === null || title === void 0 ? void 0 : title.trim()))
            return 'Title is required';
        if (duration === undefined || duration < 0)
            return 'Duration must be a non-negative number';
        if (!releaseDate || isNaN(Date.parse(releaseDate)))
            return 'Valid release date is required';
        if (!(coverUrl === null || coverUrl === void 0 ? void 0 : coverUrl.trim()))
            return 'Cover URL is required';
        if (!(audioUrl === null || audioUrl === void 0 ? void 0 : audioUrl.trim()))
            return 'Audio URL is required';
    }
    else {
        if (title !== undefined && !title.trim())
            return 'Title cannot be empty';
        if (duration !== undefined && duration < 0)
            return 'Duration must be a non-negative number';
        if (releaseDate !== undefined && isNaN(Date.parse(releaseDate)))
            return 'Invalid release date format';
    }
    if (type && !Object.values(client_1.AlbumType).includes(type))
        return 'Invalid track type';
    if (!isSingleTrack && trackNumber !== undefined && trackNumber <= 0) {
        return 'Track number must be a positive integer';
    }
    if (featuredArtists) {
        if (!Array.isArray(featuredArtists)) {
            return 'Featured artists must be an array';
        }
        for (const artistProfileId of featuredArtists) {
            if (typeof artistProfileId !== 'string' || !artistProfileId.trim()) {
                return 'Each featured artist ID must be a non-empty string';
            }
        }
    }
    return null;
};
const canManageTrack = (user, trackArtistId) => {
    var _a, _b, _c, _d;
    if (!user)
        return false;
    if (user.role === client_1.Role.ADMIN)
        return true;
    return (((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.isVerified) &&
        ((_b = user.artistProfile) === null || _b === void 0 ? void 0 : _b.isActive) &&
        ((_c = user.artistProfile) === null || _c === void 0 ? void 0 : _c.role) === client_1.Role.ARTIST &&
        ((_d = user.artistProfile) === null || _d === void 0 ? void 0 : _d.id) === trackArtistId);
};
const validateFile = (file, isAudio = false) => {
    const maxSize = 5 * 1024 * 1024;
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3'];
    const maxFileNameLength = 100;
    if (file.size > maxSize) {
        return 'File size too large. Maximum allowed size is 5MB.';
    }
    if (isAudio) {
        if (!allowedAudioTypes.includes(file.mimetype)) {
            return `Invalid audio file type. Only ${allowedAudioTypes.join(', ')} are allowed.`;
        }
    }
    else {
        if (!allowedImageTypes.includes(file.mimetype)) {
            return `Invalid image file type. Only ${allowedImageTypes.join(', ')} are allowed.`;
        }
    }
    if (file.originalname.length > maxFileNameLength) {
        return `File name too long. Maximum allowed length is ${maxFileNameLength} characters.`;
    }
    const invalidChars = /[<>:"/\\|?*]/g;
    if (invalidChars.test(file.originalname)) {
        return 'File name contains invalid characters.';
    }
    return null;
};
const createTrack = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { title, releaseDate, trackNumber, albumId, featuredArtists, genreIds, artistId, } = req.body;
        const finalArtistId = user.role === 'ADMIN' ? artistId : (_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.id;
        if (!finalArtistId) {
            res.status(400).json({
                message: user.role === 'ADMIN'
                    ? 'Artist ID is required'
                    : 'Only verified artists can create tracks',
            });
            return;
        }
        if (user.role !== 'ADMIN' && !((_b = user.artistProfile) === null || _b === void 0 ? void 0 : _b.isVerified)) {
            res.status(403).json({
                message: 'Only verified artists can create tracks',
            });
            return;
        }
        if (!req.files) {
            res.status(400).json({ message: 'No files uploaded' });
            return;
        }
        const files = req.files;
        const audioFile = (_c = files.audioFile) === null || _c === void 0 ? void 0 : _c[0];
        const coverFile = (_d = files.coverFile) === null || _d === void 0 ? void 0 : _d[0];
        if (!audioFile) {
            res.status(400).json({ message: 'Audio file is required' });
            return;
        }
        if (audioFile) {
            const audioValidationError = validateFile(audioFile, true);
            if (audioValidationError) {
                res.status(400).json({ message: audioValidationError });
                return;
            }
        }
        if (coverFile) {
            const coverValidationError = validateFile(coverFile, false);
            if (coverValidationError) {
                res.status(400).json({ message: coverValidationError });
                return;
            }
        }
        const audioUpload = yield (0, cloudinary_service_1.uploadFile)(audioFile.buffer, 'tracks', 'auto');
        const coverUrl = coverFile
            ? (yield (0, cloudinary_service_1.uploadFile)(coverFile.buffer, 'covers', 'image')).secure_url
            : null;
        const mm = yield Promise.resolve().then(() => __importStar(require('music-metadata')));
        const metadata = yield mm.parseBuffer(audioFile.buffer);
        const duration = Math.floor(metadata.format.duration || 0);
        const featuredArtistsArray = featuredArtists
            ? featuredArtists.split(',').map((id) => id.trim())
            : [];
        const genreIdsArray = genreIds
            ? genreIds.split(',').map((id) => id.trim())
            : [];
        const track = yield db_1.default.track.create({
            data: {
                title,
                duration,
                releaseDate: new Date(releaseDate),
                trackNumber: trackNumber ? Number(trackNumber) : null,
                coverUrl,
                audioUrl: audioUpload.secure_url,
                artistId: finalArtistId,
                albumId: albumId || null,
                type: albumId ? undefined : 'SINGLE',
                featuredArtists: featuredArtistsArray.length > 0
                    ? {
                        create: featuredArtistsArray.map((artistId) => ({
                            artistId,
                        })),
                    }
                    : undefined,
                genres: genreIdsArray.length > 0
                    ? {
                        create: genreIdsArray.map((genreId) => ({
                            genreId,
                        })),
                    }
                    : undefined,
            },
            select: prisma_selects_1.trackSelect,
        });
        res.status(201).json({
            message: 'Track created successfully',
            track,
        });
    }
    catch (error) {
        console.error('Create track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createTrack = createTrack;
const updateTrack = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, releaseDate, type, trackNumber, albumId, featuredArtists, genreIds, } = req.body;
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (releaseDate !== undefined)
            updateData.releaseDate = new Date(releaseDate);
        if (type !== undefined)
            updateData.type = type;
        if (trackNumber !== undefined)
            updateData.trackNumber = Number(trackNumber);
        if (albumId !== undefined)
            updateData.albumId = albumId || null;
        if (featuredArtists) {
            const featuredArtistsArray = Array.isArray(featuredArtists)
                ? featuredArtists
                : featuredArtists.split(',').map((id) => id.trim());
            updateData.featuredArtists = {
                deleteMany: {},
                create: featuredArtistsArray.map((artistId) => ({
                    artistId,
                })),
            };
        }
        if (genreIds) {
            const genreIdsArray = Array.isArray(genreIds)
                ? genreIds
                : genreIds.split(',').map((id) => id.trim());
            updateData.genres = {
                deleteMany: {},
                create: genreIdsArray.map((genreId) => ({
                    genreId,
                })),
            };
        }
        const updatedTrack = yield db_1.default.track.update({
            where: { id },
            data: updateData,
            select: prisma_selects_1.trackSelect,
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
});
exports.updateTrack = updateTrack;
const deleteTrack = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { id } = req.params;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized: User not found' });
            return;
        }
        const track = yield db_1.default.track.findUnique({
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
        yield db_1.default.track.delete({
            where: { id },
        });
        res.json({ message: 'Track deleted successfully' });
    }
    catch (error) {
        console.error('Delete track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteTrack = deleteTrack;
const toggleTrackVisibility = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized: User not found' });
            return;
        }
        const track = yield db_1.default.track.findUnique({
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
        const updatedTrack = yield db_1.default.track.update({
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
});
exports.toggleTrackVisibility = toggleTrackVisibility;
const searchTrack = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
                    type: 'SEARCH',
                    query: { equals: searchQuery, mode: client_1.Prisma.QueryMode.insensitive },
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
        if (user && user.currentProfile === 'ARTIST' && ((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.id)) {
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
        const [tracks, total] = yield Promise.all([
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
});
exports.searchTrack = searchTrack;
const getTracksByType = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const cacheKey = req.originalUrl;
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = yield cache_middleware_1.client.get(cacheKey);
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
        if (!req.user || !((_a = req.user.artistProfile) === null || _a === void 0 ? void 0 : _a.id)) {
            whereClause.isActive = true;
        }
        else {
            whereClause.OR = [
                { isActive: true },
                { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
            ];
        }
        const tracks = yield db_1.default.track.findMany({
            where: whereClause,
            select: prisma_selects_1.trackSelect,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: Number(limit),
        });
        const totalTracks = yield db_1.default.track.count({ where: whereClause });
        const result = {
            tracks,
            pagination: {
                total: totalTracks,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalTracks / Number(limit)),
            },
        };
        yield (0, cache_middleware_1.setCache)(cacheKey, result);
        res.json(result);
    }
    catch (error) {
        console.error('Get tracks by type error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getTracksByType = getTracksByType;
const getAllTracks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { page = 1, limit = 10, q: search, status } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const whereClause = {};
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
        if (user.role !== client_1.Role.ADMIN && ((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.id)) {
            whereClause.artistId = user.artistProfile.id;
        }
        const [tracks, total] = yield Promise.all([
            db_1.default.track.findMany({
                where: whereClause,
                skip: offset,
                take: Number(limit),
                select: prisma_selects_1.trackSelect,
                orderBy: { createdAt: 'desc' },
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
        console.error('Get tracks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllTracks = getAllTracks;
const getTrackById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const user = req.user;
        const track = yield db_1.default.track.findUnique({
            where: { id },
            select: prisma_selects_1.trackSelect,
        });
        if (!track) {
            res.status(404).json({ message: 'Track not found' });
            return;
        }
        if ((user === null || user === void 0 ? void 0 : user.role) === client_1.Role.ADMIN) {
            res.json(track);
            return;
        }
        if (!track.isActive) {
            if (((_a = user === null || user === void 0 ? void 0 : user.artistProfile) === null || _a === void 0 ? void 0 : _a.id) === track.artistId) {
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
});
exports.getTrackById = getTrackById;
const getTracksByGenre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const cacheKey = req.originalUrl;
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = yield cache_middleware_1.client.get(cacheKey);
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
        const genre = yield db_1.default.genre.findUnique({
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
        if (!req.user || !((_a = req.user.artistProfile) === null || _a === void 0 ? void 0 : _a.id)) {
            whereClause.isActive = true;
        }
        else {
            whereClause.OR = [
                { isActive: true },
                { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
            ];
        }
        const tracks = yield db_1.default.track.findMany({
            where: whereClause,
            select: Object.assign(Object.assign({}, prisma_selects_1.trackSelect), { genres: {
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
                } }),
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: Number(limit),
        });
        const totalTracks = yield db_1.default.track.count({
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
        yield (0, cache_middleware_1.setCache)(cacheKey, result);
        res.json(result);
    }
    catch (error) {
        console.error('Get tracks by genre error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getTracksByGenre = getTracksByGenre;
const getTracksByTypeAndGenre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const cacheKey = req.originalUrl;
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = yield cache_middleware_1.client.get(cacheKey);
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
        const genre = yield db_1.default.genre.findUnique({
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
        if (!req.user || !((_a = req.user.artistProfile) === null || _a === void 0 ? void 0 : _a.id)) {
            whereClause.isActive = true;
        }
        else {
            whereClause.OR = [
                { isActive: true },
                { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
            ];
        }
        const tracks = yield db_1.default.track.findMany({
            where: whereClause,
            select: Object.assign(Object.assign({}, prisma_selects_1.trackSelect), { genres: {
                    where: {
                        genreId: genreId,
                    },
                    select: {
                        genre: {
                            select: { id: true, name: true },
                        },
                    },
                } }),
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: Number(limit),
        });
        const totalTracks = yield db_1.default.track.count({
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
        yield (0, cache_middleware_1.setCache)(cacheKey, result);
        res.json(result);
    }
    catch (error) {
        console.error('Get tracks by type and genre error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getTracksByTypeAndGenre = getTracksByTypeAndGenre;
const playTrack = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { trackId } = req.params;
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
        const track = yield db_1.default.track.findFirst({
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
        const existingListen = yield db_1.default.history.findFirst({
            where: {
                userId: user.id,
                track: { artistId: track.artistId },
                createdAt: { gte: lastMonth },
            },
        });
        if (!existingListen) {
            yield db_1.default.artistProfile.update({
                where: { id: track.artistId },
                data: { monthlyListeners: { increment: 1 } },
            });
        }
        yield db_1.default.history.upsert({
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
        yield db_1.default.track.update({
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
});
exports.playTrack = playTrack;
//# sourceMappingURL=track.controller.js.map