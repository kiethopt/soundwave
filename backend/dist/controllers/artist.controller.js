"use strict";
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
exports.getRelatedArtists = exports.getArtistStats = exports.updateArtistProfile = exports.getArtistTracks = exports.getArtistAlbums = exports.getAllGenres = exports.getArtistProfile = exports.getAllArtistsProfile = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const cloudinary_service_1 = require("../services/cloudinary.service");
const cache_middleware_1 = require("../middleware/cache.middleware");
const prisma_selects_1 = require("../utils/prisma-selects");
const canViewArtistData = (user, artistProfileId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!user)
        return false;
    if (user.role === client_1.Role.ADMIN)
        return true;
    if ((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.isVerified)
        return true;
    return false;
});
const canEditArtistData = (user, artistProfileId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user) {
        return { canEdit: false, message: 'Unauthorized' };
    }
    if (user.role === client_1.Role.ADMIN) {
        return { canEdit: true };
    }
    const artistProfile = yield db_1.default.artistProfile.findUnique({
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
});
const validateUpdateArtistProfile = (data) => {
    const { bio, socialMediaLinks, genreIds } = data;
    if (bio && bio.length > 500) {
        return 'Bio must be less than 500 characters';
    }
    if (socialMediaLinks) {
        if (typeof socialMediaLinks !== 'object') {
            return 'Social media links must be an object';
        }
        const validKeys = ['facebook', 'instagram', 'twitter', 'youtube'];
        for (const key of Object.keys(socialMediaLinks)) {
            if (!validKeys.includes(key)) {
                return `Invalid social media key: ${key}`;
            }
            if (typeof socialMediaLinks[key] !== 'string') {
                return `Social media link for ${key} must be a string`;
            }
        }
    }
    if (genreIds) {
        if (!Array.isArray(genreIds)) {
            return 'Genre IDs must be an array';
        }
        if (genreIds.some((id) => typeof id !== 'string')) {
            return 'All genre IDs must be strings';
        }
    }
    return null;
};
const getAllArtistsProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { page = 1, limit = 10 } = req.query;
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const offset = (pageNumber - 1) * limitNumber;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (user.role !== client_1.Role.ADMIN &&
            (!((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.isVerified) || user.currentProfile !== 'ARTIST')) {
            res.status(403).json({
                message: 'You do not have permission to perform this action',
                code: 'SWITCH_TO_ARTIST_PROFILE',
            });
            return;
        }
        const currentArtistId = (_b = user.artistProfile) === null || _b === void 0 ? void 0 : _b.id;
        const whereCondition = {
            isVerified: true,
            role: client_1.Role.ARTIST,
            id: { not: currentArtistId },
        };
        const [artists, total] = yield Promise.all([
            db_1.default.artistProfile.findMany({
                where: whereCondition,
                skip: offset,
                take: limitNumber,
                select: prisma_selects_1.artistProfileSelect,
                orderBy: { createdAt: 'desc' },
            }),
            db_1.default.artistProfile.count({
                where: whereCondition,
            }),
        ]);
        res.json({
            artists,
            pagination: {
                total,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(total / limitNumber),
            },
        });
    }
    catch (error) {
        console.error('Get all artists profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllArtistsProfile = getAllArtistsProfile;
const getArtistProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const artist = yield db_1.default.artistProfile.findUnique({
            where: { id },
            select: prisma_selects_1.artistProfileSelect,
        });
        if (!artist) {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        res.json(artist);
    }
    catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getArtistProfile = getArtistProfile;
const getAllGenres = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 100 } = req.query;
        const genres = yield db_1.default.genre.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        res.json({
            data: genres,
            total: yield db_1.default.genre.count(),
            page: Number(page),
            limit: Number(limit),
        });
    }
    catch (error) {
        console.error('Get all genres error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllGenres = getAllGenres;
const getArtistAlbums = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const user = req.user;
    if (!user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    try {
        const artistProfile = yield db_1.default.artistProfile.findUnique({
            where: { id },
            select: { id: true, isVerified: true, userId: true },
        });
        if (!artistProfile) {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        let whereCondition = { artistId: id };
        if (user.role !== client_1.Role.ADMIN && user.id !== artistProfile.userId) {
            whereCondition.isActive = true;
            if (!artistProfile.isVerified) {
                res.status(403).json({ message: 'Artist is not verified' });
                return;
            }
        }
        if (user.id === artistProfile.userId) {
            whereCondition = { artistId: id };
        }
        const [albums, total] = yield Promise.all([
            db_1.default.album.findMany({
                where: whereCondition,
                skip: offset,
                take: Number(limit),
                select: prisma_selects_1.albumSelect,
                orderBy: { releaseDate: 'desc' },
            }),
            db_1.default.album.count({
                where: whereCondition,
            }),
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
        console.error('Error fetching artist albums:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getArtistAlbums = getArtistAlbums;
const getArtistTracks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const user = req.user;
    if (!user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    try {
        const artistProfile = yield db_1.default.artistProfile.findUnique({
            where: { id },
            select: { id: true, isVerified: true, userId: true },
        });
        if (!artistProfile) {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        let whereCondition = { artistId: id };
        if (user.role !== client_1.Role.ADMIN && user.id !== artistProfile.userId) {
            whereCondition.isActive = true;
            if (!artistProfile.isVerified) {
                res.status(403).json({ message: 'Artist is not verified' });
                return;
            }
        }
        const [tracks, total] = yield Promise.all([
            db_1.default.track.findMany({
                where: whereCondition,
                skip: offset,
                take: Number(limit),
                select: prisma_selects_1.trackSelect,
                orderBy: { releaseDate: 'desc' },
            }),
            db_1.default.track.count({
                where: whereCondition,
            }),
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
        console.error('Error fetching artist tracks:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getArtistTracks = getArtistTracks;
const updateArtistProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { bio, socialMediaLinks, genreIds, isVerified, artistName } = req.body;
    const user = req.user;
    try {
        const { canEdit, message } = yield canEditArtistData(user, id);
        if (!canEdit) {
            res.status(403).json({ success: false, message });
            return;
        }
        if (isVerified !== undefined && (user === null || user === void 0 ? void 0 : user.role) !== client_1.Role.ADMIN) {
            res.status(403).json({
                success: false,
                message: 'Only admin can change verification status',
            });
            return;
        }
        let parsedSocialMediaLinks = socialMediaLinks;
        if (typeof socialMediaLinks === 'string') {
            try {
                parsedSocialMediaLinks = JSON.parse(socialMediaLinks);
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid socialMediaLinks format',
                });
                return;
            }
        }
        let parsedGenreIds = genreIds;
        if (typeof genreIds === 'string') {
            try {
                parsedGenreIds = genreIds.split(',');
            }
            catch (error) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid genreIds format',
                });
                return;
            }
        }
        const error = validateUpdateArtistProfile({
            bio,
            socialMediaLinks: parsedSocialMediaLinks,
            genreIds: parsedGenreIds,
        });
        if (error) {
            res.status(400).json({
                success: false,
                message: error,
            });
            return;
        }
        let avatarUrl = undefined;
        if (req.file) {
            const result = yield (0, cloudinary_service_1.uploadFile)(req.file.buffer, 'artist-avatars', 'image');
            avatarUrl = result.secure_url;
        }
        if ((parsedGenreIds === null || parsedGenreIds === void 0 ? void 0 : parsedGenreIds.length) > 0) {
            const existingGenres = yield db_1.default.genre.findMany({
                where: { id: { in: parsedGenreIds } },
            });
            if (existingGenres.length !== parsedGenreIds.length) {
                res.status(400).json({
                    success: false,
                    message: 'One or more genres do not exist',
                });
                return;
            }
        }
        const updatedArtistProfile = yield db_1.default.artistProfile.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign({ artistName,
                bio }, (avatarUrl && { avatar: avatarUrl })), (parsedSocialMediaLinks && {
                socialMediaLinks: parsedSocialMediaLinks,
            })), (isVerified !== undefined && {
                isVerified,
                verifiedAt: isVerified ? new Date() : null,
            })), (parsedGenreIds && {
                genres: {
                    deleteMany: {},
                    create: parsedGenreIds.map((genreId) => ({
                        genreId,
                    })),
                },
            })),
            select: prisma_selects_1.artistProfileSelect,
        });
        yield cache_middleware_1.client.del(`/api/artists/profile/${id}`);
        yield cache_middleware_1.client.del(`/api/artists/tracks/${id}`);
        yield cache_middleware_1.client.del(`/api/artists/albums/${id}`);
        yield cache_middleware_1.client.del(`/api/artists/stats/${id}`);
        res.status(200).json({
            success: true,
            message: 'Artist profile updated successfully',
            data: updatedArtistProfile,
        });
    }
    catch (error) {
        console.error('Update artist profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});
exports.updateArtistProfile = updateArtistProfile;
const getArtistStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user || !user.artistProfile) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const artistProfileId = user.artistProfile.id;
        const artistStats = yield db_1.default.artistProfile.findUnique({
            where: { id: artistProfileId },
            select: {
                monthlyListeners: true,
                _count: {
                    select: {
                        albums: true,
                        tracks: true,
                    },
                },
            },
        });
        if (!artistStats) {
            res.status(404).json({ message: 'Artist profile not found' });
            return;
        }
        const topTracks = yield db_1.default.track.findMany({
            where: { artistId: artistProfileId },
            select: prisma_selects_1.trackSelect,
            orderBy: { playCount: 'desc' },
            take: 5,
        });
        res.json({
            monthlyListeners: artistStats.monthlyListeners,
            albumCount: artistStats._count.albums,
            trackCount: artistStats._count.tracks,
            topTracks,
        });
    }
    catch (error) {
        console.error('Get artist stats error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getArtistStats = getArtistStats;
const getRelatedArtists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const artistProfile = yield db_1.default.artistProfile.findUnique({
            where: { id },
            select: { genres: { select: { genreId: true } } },
        });
        if (!artistProfile) {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        const genreIds = artistProfile.genres.map((genre) => genre.genreId);
        const relatedArtist = yield db_1.default.artistProfile.findMany({
            where: {
                genres: {
                    some: {
                        genreId: {
                            in: genreIds,
                        },
                    },
                },
                isVerified: true,
                id: { not: id },
            },
            select: prisma_selects_1.artistProfileSelect,
            take: 10,
        });
        res.json(relatedArtist);
    }
    catch (error) {
        console.error('Get similar artists error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getRelatedArtists = getRelatedArtists;
//# sourceMappingURL=artist.controller.js.map