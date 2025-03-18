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
exports.getNewestAlbums = exports.getNewestTracks = exports.getTopTracks = exports.getTopArtists = exports.getTopAlbums = exports.getRecommendedArtists = exports.getUserProfile = exports.checkArtistRequest = exports.editProfile = exports.getFollowing = exports.getFollowers = exports.unfollowUser = exports.followUser = exports.getAllGenres = exports.searchAll = exports.requestToBecomeArtist = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../middleware/cache.middleware");
const upload_service_1 = require("../services/upload.service");
const prisma_selects_1 = require("../utils/prisma-selects");
const userService = __importStar(require("../services/user.service"));
const handle_utils_1 = require("src/utils/handle-utils");
const getMonthStartDate = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
};
const validateArtistData = (data) => {
    const { artistName, bio, socialMediaLinks, genres } = data;
    if (!(artistName === null || artistName === void 0 ? void 0 : artistName.trim()))
        return 'Artist name is required';
    if (artistName.length < 3)
        return 'Artist name must be at least 3 characters';
    if (bio && bio.length > 500)
        return 'Bio must be less than 500 characters';
    if (socialMediaLinks) {
        if (typeof socialMediaLinks !== 'object' ||
            Array.isArray(socialMediaLinks)) {
            return 'socialMediaLinks must be an object';
        }
        const allowedPlatforms = ['facebook', 'instagram'];
        for (const key in socialMediaLinks) {
            if (!allowedPlatforms.includes(key)) {
                return `Invalid social media platform: ${key}`;
            }
            if (typeof socialMediaLinks[key] !== 'string') {
                return `socialMediaLinks.${key} must be a string`;
            }
        }
    }
    if (!genres || !Array.isArray(genres) || genres.length === 0) {
        return 'At least one genre is required';
    }
    return null;
};
const requestToBecomeArtist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield userService.requestArtistRole(req.user, req.body, req.file);
        res.json({ message: 'Artist role request submitted successfully' });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Forbidden') {
                res.status(403).json({ message: 'Forbidden' });
                return;
            }
            else if (error.message.includes('already requested')) {
                res.status(400).json({ message: error.message });
                return;
            }
            else if (error.message.includes('Invalid JSON format')) {
                res.status(400).json({ message: error.message });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Request artist role');
    }
});
exports.requestToBecomeArtist = requestToBecomeArtist;
const searchAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q } = req.query;
        if (!q) {
            res.status(400).json({ message: 'Query is required' });
            return;
        }
        const searchQuery = String(q).trim();
        const results = yield userService.search(req.user, searchQuery);
        res.json(results);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Search');
    }
});
exports.searchAll = searchAll;
const getAllGenres = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const genres = yield userService.getAllGenres();
        res.json(genres);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get all genres');
    }
});
exports.getAllGenres = getAllGenres;
const followUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: followingId } = req.params;
        const result = yield userService.followTarget(req.user, followingId);
        res.json(result);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Target not found') {
                res.status(404).json({ message: 'Target not found' });
                return;
            }
            else if (error.message === 'Cannot follow yourself') {
                res.status(400).json({ message: 'Cannot follow yourself' });
                return;
            }
            else if (error.message === 'Already following') {
                res.status(400).json({ message: 'Already following' });
                return;
            }
            else if (error.message === 'Unauthorized') {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Follow user');
    }
});
exports.followUser = followUser;
const unfollowUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: followingId } = req.params;
        const result = yield userService.unfollowTarget(req.user, followingId);
        res.json(result);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Target not found') {
                res.status(404).json({ message: 'Target not found' });
                return;
            }
            else if (error.message === 'Not following this target') {
                res.status(400).json({ message: 'Not following this target' });
                return;
            }
            else if (error.message === 'Unauthorized') {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Unfollow user');
    }
});
exports.unfollowUser = unfollowUser;
const getFollowers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const followers = yield userService.getUserFollowers(req);
        res.json(followers);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get followers');
    }
});
exports.getFollowers = getFollowers;
const getFollowing = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const following = yield userService.getUserFollowing(req);
        res.json(following);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get following');
    }
});
exports.getFollowing = getFollowing;
const editProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { email, username, name, avatar } = req.body;
        const avatarFile = req.file;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (email) {
            const existingUser = yield db_1.default.user.findUnique({
                where: { email },
            });
            if (existingUser && existingUser.id !== user.id) {
                res.status(400).json({ message: 'Email already in use' });
                return;
            }
        }
        if (username) {
            const existingUsername = yield db_1.default.user.findUnique({
                where: { username },
            });
            if (existingUsername && existingUsername.id !== user.id) {
                res.status(400).json({ message: 'Username already in use' });
                return;
            }
        }
        let avatarUrl = null;
        if (avatarFile) {
            const uploadResult = yield (0, upload_service_1.uploadFile)(avatarFile.buffer, 'user-avatars');
            avatarUrl = uploadResult.secure_url;
        }
        const updateData = {};
        if (email)
            updateData.email = email;
        if (username)
            updateData.username = username;
        if (name)
            updateData.name = name;
        if (avatarFile)
            updateData.avatar = avatarUrl;
        else if (avatar)
            updateData.avatar = avatar;
        if (Object.keys(updateData).length === 0) {
            res.status(400).json({ message: 'No data provided for update' });
            return;
        }
        const updatedUser = yield db_1.default.user.update({
            where: { id: user.id },
            data: updateData,
            select: prisma_selects_1.userSelect,
        });
        res.json(updatedUser);
    }
    catch (error) {
        console.error('Edit profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.editProfile = editProfile;
const checkArtistRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const request = yield userService.getArtistRequest(req.user.id);
        res.json(request);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Check artist request');
    }
});
exports.checkArtistRequest = checkArtistRequest;
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield db_1.default.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                username: true,
                avatar: true,
                role: true,
                isActive: true,
            },
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getUserProfile = getUserProfile;
const getRecommendedArtists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const cacheKey = `/api/user/${user.id}/recommended-artists`;
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = yield cache_middleware_1.client.get(cacheKey);
            if (cachedData) {
                res.json(JSON.parse(cachedData));
                return;
            }
        }
        const history = yield db_1.default.history.findMany({
            where: {
                userId: user.id,
                type: client_1.HistoryType.PLAY,
                playCount: { gt: 0 },
            },
            select: {
                track: {
                    select: {
                        artist: {
                            select: {
                                id: true,
                                artistName: true,
                                avatar: true,
                                genres: {
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
                        },
                    },
                },
            },
            take: 3,
        });
        const genreIds = history
            .flatMap((h) => { var _a; return ((_a = h.track) === null || _a === void 0 ? void 0 : _a.artist.genres.map((g) => g.genre.id)) || []; })
            .filter((id) => id !== null);
        const recommendedArtists = yield db_1.default.artistProfile.findMany({
            where: {
                isVerified: true,
                genres: {
                    some: {
                        genreId: {
                            in: genreIds,
                        },
                    },
                },
            },
            select: {
                id: true,
                artistName: true,
                bio: true,
                avatar: true,
                role: true,
                socialMediaLinks: true,
                monthlyListeners: true,
                isVerified: true,
                isActive: true,
                verificationRequestedAt: true,
                verifiedAt: true,
                genres: {
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
        });
        if (process.env.USE_REDIS_CACHE === 'true') {
            yield (0, cache_middleware_1.setCache)(cacheKey, recommendedArtists, 1800);
        }
        res.json(recommendedArtists);
    }
    catch (error) {
        console.error('Get recommended artists error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getRecommendedArtists = getRecommendedArtists;
const getTopAlbums = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cacheKey = '/api/top-albums';
        const monthStart = getMonthStartDate();
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = yield cache_middleware_1.client.get(cacheKey);
            if (cachedData) {
                res.json(JSON.parse(cachedData));
                return;
            }
        }
        const albums = yield db_1.default.album.findMany({
            where: {
                isActive: true,
                tracks: {
                    some: {
                        isActive: true,
                        history: {
                            some: {
                                type: 'PLAY',
                                createdAt: { gte: monthStart },
                            },
                        },
                    },
                },
            },
            select: {
                id: true,
                title: true,
                coverUrl: true,
                type: true,
                artist: {
                    select: {
                        id: true,
                        artistName: true,
                        avatar: true,
                    },
                },
                tracks: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        title: true,
                        coverUrl: true,
                        duration: true,
                        audioUrl: true,
                        playCount: true,
                        history: {
                            where: {
                                type: 'PLAY',
                                createdAt: { gte: monthStart },
                            },
                            select: {
                                playCount: true,
                            },
                        },
                    },
                    orderBy: { trackNumber: 'asc' },
                },
                _count: {
                    select: {
                        tracks: {
                            where: {
                                isActive: true,
                                history: {
                                    some: {
                                        type: 'PLAY',
                                        createdAt: { gte: monthStart },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                tracks: {
                    _count: 'desc',
                },
            },
            take: 20,
        });
        const albumsWithMonthlyPlays = albums.map((album) => (Object.assign(Object.assign({}, album), { monthlyPlays: album.tracks.reduce((sum, track) => sum +
                track.history.reduce((plays, h) => plays + (h.playCount || 0), 0), 0) })));
        if (process.env.USE_REDIS_CACHE === 'true') {
            yield (0, cache_middleware_1.setCache)(cacheKey, albumsWithMonthlyPlays, 1800);
        }
        res.json(albumsWithMonthlyPlays);
    }
    catch (error) {
        console.error('Get top albums error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getTopAlbums = getTopAlbums;
const getTopArtists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cacheKey = '/api/top-artists';
        const monthStart = getMonthStartDate();
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = yield cache_middleware_1.client.get(cacheKey);
            if (cachedData) {
                res.json(JSON.parse(cachedData));
                return;
            }
        }
        const artists = yield db_1.default.artistProfile.findMany({
            where: {
                isVerified: true,
                tracks: {
                    some: {
                        isActive: true,
                        history: {
                            some: {
                                type: 'PLAY',
                                createdAt: { gte: monthStart },
                            },
                        },
                    },
                },
            },
            select: {
                id: true,
                artistName: true,
                avatar: true,
                monthlyListeners: true,
                genres: {
                    select: {
                        genre: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                tracks: {
                    where: { isActive: true },
                    select: {
                        history: {
                            where: {
                                type: 'PLAY',
                                createdAt: { gte: monthStart },
                            },
                            select: {
                                userId: true,
                                playCount: true,
                            },
                        },
                    },
                },
            },
        });
        const artistsWithMonthlyMetrics = artists.map((artist) => {
            const uniqueListeners = new Set();
            let monthlyPlays = 0;
            artist.tracks.forEach((track) => {
                track.history.forEach((h) => {
                    uniqueListeners.add(h.userId);
                    monthlyPlays += h.playCount || 0;
                });
            });
            return Object.assign(Object.assign({}, artist), { monthlyListeners: uniqueListeners.size, monthlyPlays });
        });
        const topArtists = artistsWithMonthlyMetrics
            .sort((a, b) => b.monthlyListeners - a.monthlyListeners)
            .slice(0, 20);
        if (process.env.USE_REDIS_CACHE === 'true') {
            yield (0, cache_middleware_1.setCache)(cacheKey, topArtists, 1800);
        }
        res.json(topArtists);
    }
    catch (error) {
        console.error('Get top artists error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getTopArtists = getTopArtists;
const getTopTracks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cacheKey = '/api/top-tracks';
        const monthStart = getMonthStartDate();
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = yield cache_middleware_1.client.get(cacheKey);
            if (cachedData) {
                res.json(JSON.parse(cachedData));
                return;
            }
        }
        const tracks = yield db_1.default.track.findMany({
            where: {
                isActive: true,
                history: {
                    some: {
                        type: 'PLAY',
                        createdAt: { gte: monthStart },
                    },
                },
            },
            select: {
                id: true,
                title: true,
                coverUrl: true,
                duration: true,
                audioUrl: true,
                playCount: true,
                artist: {
                    select: {
                        id: true,
                        artistName: true,
                        avatar: true,
                    },
                },
                album: {
                    select: {
                        id: true,
                        title: true,
                        coverUrl: true,
                    },
                },
                featuredArtists: {
                    select: {
                        artistProfile: {
                            select: {
                                id: true,
                                artistName: true,
                            },
                        },
                    },
                },
                history: {
                    where: {
                        type: 'PLAY',
                        createdAt: { gte: monthStart },
                    },
                    select: {
                        playCount: true,
                    },
                },
            },
            orderBy: {
                playCount: 'desc',
            },
            take: 20,
        });
        const tracksWithMonthlyPlays = tracks.map((track) => (Object.assign(Object.assign({}, track), { monthlyPlays: track.history.reduce((sum, h) => sum + (h.playCount || 0), 0) })));
        if (process.env.USE_REDIS_CACHE === 'true') {
            yield (0, cache_middleware_1.setCache)(cacheKey, tracksWithMonthlyPlays, 1800);
        }
        res.json(tracksWithMonthlyPlays);
    }
    catch (error) {
        console.error('Get top tracks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getTopTracks = getTopTracks;
const getNewestTracks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tracks = yield db_1.default.track.findMany({
            where: { isActive: true },
            select: prisma_selects_1.searchTrackSelect,
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        res.json(tracks);
    }
    catch (error) {
        console.error('Get newest tracks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getNewestTracks = getNewestTracks;
const getNewestAlbums = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const albums = yield db_1.default.album.findMany({
            where: { isActive: true },
            select: prisma_selects_1.searchAlbumSelect,
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        res.json(albums);
    }
    catch (error) {
        console.error('Get newest albums error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getNewestAlbums = getNewestAlbums;
//# sourceMappingURL=user.controller.js.map