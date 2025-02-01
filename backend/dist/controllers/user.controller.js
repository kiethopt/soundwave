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
exports.checkArtistRequest = exports.editProfile = exports.getFollowing = exports.getFollowers = exports.unfollowUser = exports.followUser = exports.getAllGenres = exports.searchAll = exports.requestArtistRole = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../middleware/cache.middleware");
const cloudinary_service_1 = require("../services/cloudinary.service");
const prisma_selects_1 = require("../utils/prisma-selects");
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
const requestArtistRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = req.user;
        const { artistName, bio, socialMediaLinks: socialMediaLinksString, genres: genresString, } = req.body;
        const avatarFile = req.file;
        let socialMediaLinks = {};
        if (socialMediaLinksString) {
            try {
                socialMediaLinks = JSON.parse(socialMediaLinksString);
            }
            catch (error) {
                res
                    .status(400)
                    .json({ message: 'Invalid JSON format for socialMediaLinks' });
                return;
            }
        }
        let genres = [];
        if (genresString) {
            try {
                genres = genresString.split(',');
            }
            catch (error) {
                res.status(400).json({ message: 'Invalid format for genres' });
                return;
            }
        }
        const validationError = validateArtistData({
            artistName,
            bio,
            socialMediaLinks,
            genres,
        });
        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }
        if (!user ||
            user.role !== client_1.Role.USER ||
            ((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.role) === client_1.Role.ARTIST) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const existingRequest = yield db_1.default.artistProfile.findUnique({
            where: { userId: user.id },
            select: { verificationRequestedAt: true },
        });
        if (existingRequest === null || existingRequest === void 0 ? void 0 : existingRequest.verificationRequestedAt) {
            res
                .status(400)
                .json({ message: 'You have already requested to become an artist' });
            return;
        }
        let avatarUrl = null;
        if (avatarFile) {
            const uploadResult = yield (0, cloudinary_service_1.uploadFile)(avatarFile.buffer, 'artist-avatars');
            avatarUrl = uploadResult.secure_url;
        }
        yield db_1.default.artistProfile.create({
            data: {
                artistName,
                bio,
                socialMediaLinks,
                avatar: avatarUrl,
                role: client_1.Role.ARTIST,
                verificationRequestedAt: new Date(),
                user: { connect: { id: user.id } },
                genres: {
                    create: genres.map((genreId) => ({
                        genre: { connect: { id: genreId } },
                    })),
                },
            },
        });
        res.json({ message: 'Artist role request submitted successfully' });
    }
    catch (error) {
        console.error('Request artist role error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.requestArtistRole = requestArtistRole;
const searchAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q } = req.query;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!q) {
            res.status(400).json({ message: 'Query is required' });
            return;
        }
        const searchQuery = String(q).trim();
        const cacheKey = `/search-all?q=${searchQuery}`;
        const useRedisCache = process.env.USE_REDIS_CACHE === 'true';
        if (useRedisCache) {
            const cachedData = yield cache_middleware_1.client.get(cacheKey);
            if (cachedData) {
                console.log('Serving from Redis cache:', cacheKey);
                res.json(JSON.parse(cachedData));
                return;
            }
        }
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
        const [artists, albums, tracks, users] = yield Promise.all([
            db_1.default.user.findMany({
                where: {
                    isActive: true,
                    role: client_1.Role.ARTIST,
                    artistProfile: {
                        OR: [
                            {
                                artistName: { contains: searchQuery, mode: 'insensitive' },
                            },
                            {
                                genres: {
                                    some: {
                                        genre: {
                                            name: { contains: searchQuery, mode: 'insensitive' },
                                        },
                                    },
                                },
                            },
                        ],
                    },
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    name: true,
                    avatar: true,
                    role: true,
                    isActive: true,
                    artistProfile: {
                        select: {
                            id: true,
                            artistName: true,
                            bio: true,
                            isVerified: true,
                            avatar: true,
                            socialMediaLinks: true,
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
                        },
                    },
                },
            }),
            db_1.default.album.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { title: { contains: searchQuery, mode: 'insensitive' } },
                        {
                            artist: {
                                artistName: { contains: searchQuery, mode: 'insensitive' },
                            },
                        },
                        {
                            genres: {
                                some: {
                                    genre: {
                                        name: { contains: searchQuery, mode: 'insensitive' },
                                    },
                                },
                            },
                        },
                    ],
                },
                select: prisma_selects_1.searchAlbumSelect,
            }),
            db_1.default.track.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { title: { contains: searchQuery, mode: 'insensitive' } },
                        {
                            artist: {
                                artistName: { contains: searchQuery, mode: 'insensitive' },
                            },
                        },
                        {
                            featuredArtists: {
                                some: {
                                    artistProfile: {
                                        artistName: { contains: searchQuery, mode: 'insensitive' },
                                    },
                                },
                            },
                        },
                        {
                            genres: {
                                some: {
                                    genre: {
                                        name: { contains: searchQuery, mode: 'insensitive' },
                                    },
                                },
                            },
                        },
                    ],
                },
                select: prisma_selects_1.searchTrackSelect,
                orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
            }),
            db_1.default.user.findMany({
                where: {
                    id: { not: user.id },
                    role: client_1.Role.USER,
                    isActive: true,
                    OR: [
                        { name: { contains: searchQuery, mode: 'insensitive' } },
                        { username: { contains: searchQuery, mode: 'insensitive' } },
                    ],
                },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    name: true,
                    avatar: true,
                    isActive: true,
                },
            }),
        ]);
        const searchResult = {
            artists,
            albums,
            tracks,
            users,
        };
        if (useRedisCache) {
            yield (0, cache_middleware_1.setCache)(cacheKey, searchResult, 600);
        }
        res.json(searchResult);
    }
    catch (error) {
        console.error('Search all error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.searchAll = searchAll;
const getAllGenres = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const genres = yield db_1.default.genre.findMany({
            select: {
                id: true,
                name: true,
            },
        });
        res.json(genres);
    }
    catch (error) {
        console.error('Get all genres error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllGenres = getAllGenres;
const followUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { id: followingId } = req.params;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const [userExists, artistExists] = yield Promise.all([
            db_1.default.user.findUnique({ where: { id: followingId } }),
            db_1.default.artistProfile.findUnique({
                where: { id: followingId },
                select: { id: true },
            }),
        ]);
        let followingType;
        let followData = {
            followerId: user.id,
            followingType: 'USER',
        };
        if (userExists) {
            followingType = client_1.FollowingType.USER;
            followData.followingUserId = followingId;
        }
        else if (artistExists) {
            followingType = client_1.FollowingType.ARTIST;
            followData.followingArtistId = followingId;
            followData.followingType = 'ARTIST';
        }
        else {
            res.status(404).json({ message: 'Target not found' });
            return;
        }
        if (followingType === 'USER' && followingId === user.id) {
            res.status(400).json({ message: 'Cannot follow yourself' });
            return;
        }
        const existingFollow = yield db_1.default.userFollow.findFirst({
            where: {
                followerId: user.id,
                OR: [
                    {
                        followingUserId: followingId,
                        followingType: 'USER',
                    },
                    {
                        followingArtistId: followingId,
                        followingType: 'ARTIST',
                    },
                ],
            },
        });
        if (existingFollow) {
            res.status(400).json({ message: 'Already following' });
            return;
        }
        yield db_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.userFollow.create({
                data: followData,
            });
            if (followingType === 'ARTIST') {
                const currentUser = yield tx.user.findUnique({
                    where: { id: user.id },
                    select: { username: true, email: true },
                });
                yield tx.notification.create({
                    data: {
                        type: 'NEW_FOLLOW',
                        message: `New follower: ${(currentUser === null || currentUser === void 0 ? void 0 : currentUser.username) || (currentUser === null || currentUser === void 0 ? void 0 : currentUser.email)}`,
                        recipientType: 'ARTIST',
                        artistId: followingId,
                        senderId: user.id,
                    },
                });
                yield tx.artistProfile.update({
                    where: { id: followingId },
                    data: { monthlyListeners: { increment: 1 } },
                });
            }
        }));
        res.json({ message: 'Followed successfully' });
    }
    catch (error) {
        console.error('Follow error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.followUser = followUser;
const unfollowUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { id: followingId } = req.params;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const [userExists, artistExists] = yield Promise.all([
            db_1.default.user.findUnique({ where: { id: followingId } }),
            db_1.default.artistProfile.findUnique({ where: { id: followingId } }),
        ]);
        let followingType = null;
        if (userExists) {
            followingType = client_1.FollowingType.USER;
        }
        else if (artistExists) {
            followingType = client_1.FollowingType.ARTIST;
        }
        else {
            res.status(404).json({ message: 'Target not found' });
            return;
        }
        const deleteConditions = Object.assign({ followerId: user.id, followingType: followingType }, (followingType === client_1.FollowingType.USER
            ? { followingUserId: followingId }
            : { followingArtistId: followingId }));
        const result = yield db_1.default.userFollow.deleteMany({
            where: deleteConditions,
        });
        if (result.count === 0) {
            res.status(404).json({ message: 'Follow not found' });
            return;
        }
        if (followingType === client_1.FollowingType.ARTIST) {
            yield db_1.default.artistProfile.update({
                where: { id: followingId },
                data: { monthlyListeners: { decrement: 1 } },
            });
        }
        res.json({ message: 'Unfollowed successfully' });
    }
    catch (error) {
        console.error('Unfollow error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.unfollowUser = unfollowUser;
const getFollowers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { type } = req.query;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const whereConditions = {
            OR: [
                {
                    followingUserId: user.id,
                    followingType: client_1.FollowingType.USER,
                },
                {
                    followingArtistId: user.id,
                    followingType: client_1.FollowingType.ARTIST,
                },
            ],
        };
        if (type) {
            if (type === 'USER') {
                whereConditions.OR = [
                    {
                        followingUserId: user.id,
                        followingType: client_1.FollowingType.USER,
                    },
                ];
            }
            else if (type === 'ARTIST') {
                whereConditions.OR = [
                    {
                        followingArtistId: user.id,
                        followingType: client_1.FollowingType.ARTIST,
                    },
                ];
            }
        }
        const followers = yield db_1.default.userFollow.findMany({
            where: whereConditions,
            select: {
                follower: {
                    select: prisma_selects_1.userSelect,
                },
                followingType: true,
            },
        });
        const result = followers.map((f) => (Object.assign(Object.assign({}, f.follower), { followingType: f.followingType })));
        res.json(result);
    }
    catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getFollowers = getFollowers;
const getFollowing = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const following = yield db_1.default.userFollow.findMany({
            where: {
                followerId: user.id,
            },
            select: {
                followingUserId: true,
                followingArtistId: true,
                followingType: true,
                followingUser: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        role: true,
                        artistProfile: {
                            select: {
                                id: true,
                                artistName: true,
                            },
                        },
                    },
                },
                followingArtist: {
                    select: {
                        id: true,
                        artistName: true,
                        avatar: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
        });
        const formattedResults = following.map((follow) => {
            var _a;
            if (follow.followingType === 'USER') {
                return Object.assign({ type: 'USER' }, follow.followingUser);
            }
            return Object.assign(Object.assign({ type: 'ARTIST' }, follow.followingArtist), { user: (_a = follow.followingArtist) === null || _a === void 0 ? void 0 : _a.user });
        });
        res.json(formattedResults);
    }
    catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({ message: 'Internal server error' });
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
            const uploadResult = yield (0, cloudinary_service_1.uploadFile)(avatarFile.buffer, 'user-avatars');
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
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const artistProfile = yield db_1.default.artistProfile.findUnique({
            where: { userId: user.id },
            select: {
                id: true,
                isVerified: true,
                verificationRequestedAt: true,
            },
        });
        if (artistProfile) {
            res.json({
                hasPendingRequest: !!artistProfile.verificationRequestedAt,
                isVerified: artistProfile.isVerified,
            });
        }
        else {
            res.json({ hasPendingRequest: false, isVerified: false });
        }
    }
    catch (error) {
        console.error('Check artist request error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.checkArtistRequest = checkArtistRequest;
//# sourceMappingURL=user.controller.js.map