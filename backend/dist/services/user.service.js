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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserTopAlbums = exports.getUserTopArtists = exports.getUserTopTracks = exports.getNewestAlbums = exports.getNewestTracks = exports.getTopTracks = exports.getTopArtists = exports.getTopAlbums = exports.getRecommendedArtists = exports.getUserProfile = exports.editProfile = exports.getAllGenres = exports.getArtistRequest = exports.requestArtistRole = exports.getUserFollowing = exports.getUserFollowers = exports.unfollowTarget = exports.followTarget = exports.search = exports.validateArtistData = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const upload_service_1 = require("./upload.service");
const prisma_selects_1 = require("../utils/prisma-selects");
const handle_utils_1 = require("../utils/handle-utils");
const cache_middleware_1 = require("../middleware/cache.middleware");
const pusher_1 = __importDefault(require("../config/pusher"));
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
exports.validateArtistData = validateArtistData;
const search = (user, query) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user) {
        throw new Error('Unauthorized');
    }
    const searchQuery = query.trim();
    const cacheKey = `/search-all?q=${searchQuery}`;
    const useRedisCache = process.env.USE_REDIS_CACHE === 'true';
    if (useRedisCache) {
        const cachedData = yield cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            console.log('Serving from Redis cache:', cacheKey);
            return JSON.parse(cachedData);
        }
    }
    yield saveSearchHistory(user.id, searchQuery);
    const [artists, albums, tracks, users] = yield Promise.all([
        db_1.default.artistProfile.findMany({
            where: {
                isActive: true,
                isVerified: true,
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
            select: {
                id: true,
                artistName: true,
                bio: true,
                isVerified: true,
                avatar: true,
                socialMediaLinks: true,
                monthlyListeners: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        name: true,
                        avatar: true,
                        role: true,
                        isActive: true,
                    },
                },
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
            take: 5,
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
            take: 5,
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
            take: 5,
        }),
        db_1.default.user.findMany({
            where: {
                id: { not: user.id },
                role: 'USER',
                isActive: true,
                OR: [
                    { username: { contains: searchQuery, mode: 'insensitive' } },
                    { name: { contains: searchQuery, mode: 'insensitive' } },
                ],
            },
            select: prisma_selects_1.userSelect,
            take: 5,
        }),
    ]);
    const searchResult = { artists, albums, tracks, users };
    if (useRedisCache) {
        yield (0, cache_middleware_1.setCache)(cacheKey, searchResult, 600);
    }
    return searchResult;
});
exports.search = search;
const saveSearchHistory = (userId, searchQuery) => __awaiter(void 0, void 0, void 0, function* () {
    const existingHistory = yield db_1.default.history.findFirst({
        where: {
            userId,
            type: 'SEARCH',
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
                type: 'SEARCH',
                query: searchQuery,
                userId,
            },
        });
    }
});
const followTarget = (follower, followingId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!follower) {
        throw new Error('Unauthorized');
    }
    console.log('=== DEBUG: followUser => route called');
    console.log('=== DEBUG: user =', follower.id);
    console.log('=== DEBUG: followingId =', followingId);
    const [userExists, artistExists] = yield Promise.all([
        db_1.default.user.findUnique({ where: { id: followingId } }),
        db_1.default.artistProfile.findUnique({
            where: { id: followingId },
            select: { id: true },
        }),
    ]);
    let followingType;
    const followData = {
        followerId: follower.id,
        followingType: 'USER',
    };
    if (userExists) {
        followingType = client_1.FollowingType.USER;
        followData.followingUserId = followingId;
    }
    else if (artistExists) {
        followingType = client_1.FollowingType.ARTIST;
        followData.followingArtistId = followingId;
        followData.followingType = client_1.FollowingType.ARTIST;
    }
    else {
        throw new Error('Target not found');
    }
    if (((followingType === 'USER' || followingType === 'ARTIST') &&
        followingId === follower.id) ||
        followingId === ((_a = follower.artistProfile) === null || _a === void 0 ? void 0 : _a.id)) {
        throw new Error('Cannot follow yourself');
    }
    const existingFollow = yield db_1.default.userFollow.findFirst({
        where: {
            followerId: follower.id,
            OR: [
                {
                    followingUserId: followingId,
                    followingType: client_1.FollowingType.USER,
                },
                {
                    followingArtistId: followingId,
                    followingType: client_1.FollowingType.ARTIST,
                },
            ],
        },
    });
    if (existingFollow) {
        throw new Error('Already following');
    }
    return db_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        yield tx.userFollow.create({ data: followData });
        const currentUser = yield tx.user.findUnique({
            where: { id: follower.id },
            select: { username: true, email: true },
        });
        const followerName = (currentUser === null || currentUser === void 0 ? void 0 : currentUser.username) || (currentUser === null || currentUser === void 0 ? void 0 : currentUser.email) || 'Unknown';
        if (followingType === 'ARTIST') {
            console.log('=== DEBUG: followUser => about to create notification for ARTIST');
            const notification = yield tx.notification.create({
                data: {
                    type: 'NEW_FOLLOW',
                    message: `New follower: ${followerName}`,
                    recipientType: 'ARTIST',
                    artistId: followingId,
                    senderId: follower.id,
                },
            });
            yield tx.artistProfile.update({
                where: { id: followingId },
                data: { monthlyListeners: { increment: 1 } },
            });
            yield pusher_1.default.trigger(`user-${followingId}`, 'notification', {
                type: 'NEW_FOLLOW',
                message: `New follower: ${followerName}`,
                notificationId: notification.id,
            });
        }
        else {
            console.log('=== DEBUG: followUser => about to create notification for USER->USER follow');
            const notification = yield tx.notification.create({
                data: {
                    type: 'NEW_FOLLOW',
                    message: `New follower: ${followerName}`,
                    recipientType: 'USER',
                    userId: followingId,
                    senderId: follower.id,
                },
            });
            console.log('=== DEBUG: followUser => notification for followed USER created!');
            yield pusher_1.default.trigger(`user-${followingId}`, 'notification', {
                type: 'NEW_FOLLOW',
                message: `New follower: ${followerName}`,
                notificationId: notification.id,
            });
        }
        return { message: 'Followed successfully' };
    }));
});
exports.followTarget = followTarget;
const unfollowTarget = (follower, followingId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!follower) {
        throw new Error('Unauthorized');
    }
    const [userExists, artistExists] = yield Promise.all([
        db_1.default.user.findUnique({ where: { id: followingId } }),
        db_1.default.artistProfile.findUnique({
            where: { id: followingId },
            select: { id: true },
        }),
    ]);
    let followingType;
    const whereConditions = {
        followerId: follower.id,
        followingType: 'USER',
    };
    if (userExists) {
        followingType = client_1.FollowingType.USER;
        whereConditions.followingUserId = followingId;
    }
    else if (artistExists) {
        followingType = client_1.FollowingType.ARTIST;
        whereConditions.followingArtistId = followingId;
        whereConditions.followingType = client_1.FollowingType.ARTIST;
    }
    else {
        throw new Error('Target not found');
    }
    const follow = yield db_1.default.userFollow.findFirst({
        where: whereConditions,
    });
    if (!follow) {
        throw new Error('Not following this target');
    }
    yield db_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        yield tx.userFollow.delete({
            where: { id: follow.id },
        });
        if (followingType === client_1.FollowingType.ARTIST) {
            yield tx.artistProfile.update({
                where: { id: followingId },
                data: {
                    monthlyListeners: {
                        decrement: 1,
                    },
                },
            });
        }
    }));
    return { message: 'Unfollowed successfully' };
});
exports.unfollowTarget = unfollowTarget;
const getUserFollowers = (req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new Error('Unauthorized');
    }
    const options = {
        where: {
            OR: [
                { followingUserId: userId, followingType: 'USER' },
                {
                    followingArtistId: (_c = (_b = req.user) === null || _b === void 0 ? void 0 : _b.artistProfile) === null || _c === void 0 ? void 0 : _c.id,
                    followingType: 'ARTIST',
                },
            ],
        },
        select: {
            id: true,
            follower: {
                select: prisma_selects_1.userSelect,
            },
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    };
    const result = yield (0, handle_utils_1.paginate)(db_1.default.userFollow, req, options);
    return {
        followers: result.data.map((follow) => follow.follower),
        pagination: result.pagination,
    };
});
exports.getUserFollowers = getUserFollowers;
const getUserFollowing = (req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        throw new Error('Unauthorized');
    }
    const options = {
        where: {
            followerId: userId,
        },
        select: {
            id: true,
            followingType: true,
            followingUser: {
                select: prisma_selects_1.userSelect,
            },
            followingArtist: {
                select: {
                    id: true,
                    artistName: true,
                    avatar: true,
                    bio: true,
                    monthlyListeners: true,
                    socialMediaLinks: true,
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
                    user: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true,
                        },
                    },
                },
            },
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    };
    const result = yield (0, handle_utils_1.paginate)(db_1.default.userFollow, req, options);
    const following = result.data.map((follow) => {
        var _a;
        if (follow.followingType === 'USER') {
            return Object.assign({ type: 'USER' }, follow.followingUser);
        }
        else {
            return Object.assign(Object.assign({ type: 'ARTIST' }, follow.followingArtist), { user: (_a = follow.followingArtist) === null || _a === void 0 ? void 0 : _a.user });
        }
    });
    return following;
});
exports.getUserFollowing = getUserFollowing;
const requestArtistRole = (user, data, avatarFile) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { artistName, bio, socialMediaLinks: socialMediaLinksString, genres: genresString, } = data;
    let socialMediaLinks = {};
    if (socialMediaLinksString) {
        socialMediaLinks = JSON.parse(socialMediaLinksString);
    }
    let genres = [];
    if (genresString) {
        genres = genresString.split(',');
    }
    const validationError = (0, exports.validateArtistData)({
        artistName,
        bio,
        socialMediaLinks,
        genres,
    });
    if (validationError) {
        throw new Error(validationError);
    }
    if (!user ||
        user.role !== client_1.Role.USER ||
        ((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.role) === client_1.Role.ARTIST) {
        throw new Error('Forbidden');
    }
    const existingRequest = yield db_1.default.artistProfile.findUnique({
        where: { userId: user.id },
        select: { verificationRequestedAt: true },
    });
    if (existingRequest === null || existingRequest === void 0 ? void 0 : existingRequest.verificationRequestedAt) {
        throw new Error('You have already requested to become an artist');
    }
    let avatarUrl = null;
    if (avatarFile) {
        const uploadResult = yield (0, upload_service_1.uploadFile)(avatarFile.buffer, 'artist-avatars');
        avatarUrl = uploadResult.secure_url;
    }
    return db_1.default.artistProfile.create({
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
});
exports.requestArtistRole = requestArtistRole;
const getArtistRequest = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const artistProfile = yield db_1.default.artistProfile.findUnique({
        where: { userId },
        select: {
            id: true,
            artistName: true,
            avatar: true,
            bio: true,
            isVerified: true,
            verificationRequestedAt: true,
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
    if (!artistProfile) {
        return { hasPendingRequest: false };
    }
    const { verificationRequestedAt, isVerified } = artistProfile, profileData = __rest(artistProfile, ["verificationRequestedAt", "isVerified"]);
    return {
        hasPendingRequest: !!verificationRequestedAt && !isVerified,
        profileData,
    };
});
exports.getArtistRequest = getArtistRequest;
const getAllGenres = () => __awaiter(void 0, void 0, void 0, function* () {
    const genres = yield db_1.default.genre.findMany({
        orderBy: {
            name: 'asc',
        },
    });
    return genres;
});
exports.getAllGenres = getAllGenres;
const editProfile = (user, profileData, avatarFile) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user) {
        throw new Error('Unauthorized');
    }
    const { email, username, name, avatar } = profileData;
    if (email) {
        const existingUser = yield db_1.default.user.findUnique({
            where: { email },
        });
        if (existingUser && existingUser.id !== user.id) {
            throw new Error('Email already in use');
        }
    }
    if (username) {
        const existingUsername = yield db_1.default.user.findUnique({
            where: { username },
        });
        if (existingUsername && existingUsername.id !== user.id) {
            throw new Error('Username already in use');
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
        throw new Error('No data provided for update');
    }
    return db_1.default.user.update({
        where: { id: user.id },
        data: updateData,
        select: prisma_selects_1.userSelect,
    });
});
exports.editProfile = editProfile;
const getUserProfile = (id) => __awaiter(void 0, void 0, void 0, function* () {
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
        throw new Error('User not found');
    }
    return user;
});
exports.getUserProfile = getUserProfile;
const getRecommendedArtists = (user) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user) {
        throw new Error('Unauthorized');
    }
    const cacheKey = `/api/user/${user.id}/recommended-artists`;
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = yield cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
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
    return recommendedArtists;
});
exports.getRecommendedArtists = getRecommendedArtists;
const getTopAlbums = () => __awaiter(void 0, void 0, void 0, function* () {
    const cacheKey = '/api/top-albums';
    const monthStart = getMonthStartDate();
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = yield cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
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
        select: prisma_selects_1.searchAlbumSelect,
        orderBy: { createdAt: 'desc' },
        take: 10,
    });
    if (process.env.USE_REDIS_CACHE === 'true') {
        yield (0, cache_middleware_1.setCache)(cacheKey, albums, 1800);
    }
    return albums;
});
exports.getTopAlbums = getTopAlbums;
const getTopArtists = () => __awaiter(void 0, void 0, void 0, function* () {
    const cacheKey = '/api/top-artists';
    const monthStart = getMonthStartDate();
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = yield cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
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
    return topArtists;
});
exports.getTopArtists = getTopArtists;
const getTopTracks = () => __awaiter(void 0, void 0, void 0, function* () {
    const cacheKey = '/api/top-tracks';
    const monthStart = getMonthStartDate();
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = yield cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
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
    return tracksWithMonthlyPlays;
});
exports.getTopTracks = getTopTracks;
const getNewestTracks = () => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.track.findMany({
        where: { isActive: true },
        select: prisma_selects_1.searchTrackSelect,
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
});
exports.getNewestTracks = getNewestTracks;
const getNewestAlbums = () => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.album.findMany({
        where: { isActive: true },
        select: prisma_selects_1.searchAlbumSelect,
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
});
exports.getNewestAlbums = getNewestAlbums;
const getUserTopTracks = (user) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user) {
        throw new Error('Unauthorized');
    }
    const monthStart = getMonthStartDate();
    const history = yield db_1.default.history.findMany({
        where: {
            userId: user.id,
            type: 'PLAY',
            createdAt: { gte: monthStart },
            track: {
                isActive: true,
            },
        },
        select: {
            trackId: true,
            playCount: true,
        },
    });
    const trackPlayCounts = history.reduce((acc, curr) => {
        if (!curr.trackId)
            return acc;
        acc[curr.trackId] = (acc[curr.trackId] || 0) + (curr.playCount || 0);
        return acc;
    }, {});
    const sortedTrackIds = Object.entries(trackPlayCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .map(([id]) => id)
        .slice(0, 10);
    if (sortedTrackIds.length === 0) {
        return [];
    }
    const tracks = yield db_1.default.track.findMany({
        where: {
            id: { in: sortedTrackIds },
            isActive: true,
        },
        select: prisma_selects_1.searchTrackSelect,
    });
    const trackOrder = new Map(sortedTrackIds.map((id, index) => [id, index]));
    return tracks.sort((a, b) => (trackOrder.get(a.id) || 0) - (trackOrder.get(b.id) || 0));
});
exports.getUserTopTracks = getUserTopTracks;
const getUserTopArtists = (user) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user) {
        throw new Error('Unauthorized');
    }
    const monthStart = getMonthStartDate();
    const history = yield db_1.default.history.findMany({
        where: {
            userId: user.id,
            type: 'PLAY',
            createdAt: { gte: monthStart },
            track: {
                isActive: true,
                artist: {
                    isActive: true,
                },
            },
        },
        select: {
            track: {
                select: {
                    artistId: true,
                },
            },
        },
    });
    const artistPlayCounts = history.reduce((acc, curr) => {
        var _a;
        if (!((_a = curr.track) === null || _a === void 0 ? void 0 : _a.artistId))
            return acc;
        acc[curr.track.artistId] = (acc[curr.track.artistId] || 0) + 1;
        return acc;
    }, {});
    const sortedArtistIds = Object.entries(artistPlayCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .map(([id]) => id)
        .slice(0, 10);
    if (sortedArtistIds.length === 0) {
        return [];
    }
    const artists = yield db_1.default.artistProfile.findMany({
        where: {
            id: { in: sortedArtistIds },
            isActive: true,
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
        },
    });
    const artistOrder = new Map(sortedArtistIds.map((id, index) => [id, index]));
    return artists.sort((a, b) => (artistOrder.get(a.id) || 0) - (artistOrder.get(b.id) || 0));
});
exports.getUserTopArtists = getUserTopArtists;
const getUserTopAlbums = (user) => __awaiter(void 0, void 0, void 0, function* () {
    if (!user) {
        throw new Error('Unauthorized');
    }
    const monthStart = getMonthStartDate();
    const history = yield db_1.default.history.findMany({
        where: {
            userId: user.id,
            type: 'PLAY',
            createdAt: { gte: monthStart },
            track: {
                isActive: true,
                album: {
                    isActive: true,
                },
            },
        },
        select: {
            track: {
                select: {
                    albumId: true,
                },
            },
        },
    });
    const albumPlayCounts = history.reduce((acc, curr) => {
        var _a;
        if (!((_a = curr.track) === null || _a === void 0 ? void 0 : _a.albumId))
            return acc;
        acc[curr.track.albumId] = (acc[curr.track.albumId] || 0) + 1;
        return acc;
    }, {});
    const sortedAlbumIds = Object.entries(albumPlayCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .map(([id]) => id)
        .slice(0, 10);
    if (sortedAlbumIds.length === 0) {
        return [];
    }
    const albums = yield db_1.default.album.findMany({
        where: {
            id: { in: sortedAlbumIds },
            isActive: true,
        },
        select: prisma_selects_1.searchAlbumSelect,
    });
    const albumOrder = new Map(sortedAlbumIds.map((id, index) => [id, index]));
    return albums.sort((a, b) => (albumOrder.get(a.id) || 0) - (albumOrder.get(b.id) || 0));
});
exports.getUserTopAlbums = getUserTopAlbums;
//# sourceMappingURL=user.service.js.map