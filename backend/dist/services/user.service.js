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
exports.setFollowVisibility = exports.getGenreTopArtists = exports.getGenreNewestTracks = exports.getGenreTopTracks = exports.getGenreTopAlbums = exports.getUserTopAlbums = exports.getUserTopArtists = exports.getUserTopTracks = exports.getNewestAlbums = exports.getNewestTracks = exports.getTopTracks = exports.getTopArtists = exports.getTopAlbums = exports.getRecommendedArtists = exports.getUserProfile = exports.editProfile = exports.getAllGenres = exports.getArtistRequest = exports.requestArtistRole = exports.getUserFollowing = exports.getUserFollowers = exports.unfollowTarget = exports.followTarget = exports.search = exports.validateArtistData = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const upload_service_1 = require("./upload.service");
const prisma_selects_1 = require("../utils/prisma-selects");
const cache_middleware_1 = require("../middleware/cache.middleware");
const emailService = __importStar(require("./email.service"));
const socket_1 = require("../config/socket");
const getMonthStartDate = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
};
const validateArtistData = (data) => {
    const { artistName, bio, socialMediaLinks, genres } = data;
    if (!artistName?.trim())
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
const search = async (user, query) => {
    if (!user) {
        throw new Error('Unauthorized');
    }
    const searchQuery = query.trim();
    const cacheKey = `/search-all?q=${searchQuery}`;
    const useRedisCache = process.env.USE_REDIS_CACHE === 'true';
    if (useRedisCache) {
        const cachedData = await cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            console.log('Serving from Redis cache:', cacheKey);
            return JSON.parse(cachedData);
        }
    }
    await saveSearchHistory(user.id, searchQuery);
    const [artists, albums, tracks, users] = await Promise.all([
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
            take: 15,
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
            take: 15,
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
            take: 15,
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
            take: 15,
        }),
    ]);
    const searchResult = { artists, albums, tracks, users };
    if (useRedisCache) {
        await (0, cache_middleware_1.setCache)(cacheKey, searchResult, 600);
    }
    return searchResult;
};
exports.search = search;
const saveSearchHistory = async (userId, searchQuery) => {
    const existingHistory = await db_1.default.history.findFirst({
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
                userId,
            },
        });
    }
};
const followTarget = async (follower, followingId) => {
    if (!follower) {
        throw new Error('Unauthorized');
    }
    const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    let followingType;
    let followedUserEmail = null;
    let followedEntityName = 'Người dùng';
    let followedUserIdForPusher = null;
    let isSelfFollow = false;
    let recipientCurrentProfile = null;
    const targetUser = await db_1.default.user.findUnique({
        where: { id: followingId },
        select: { id: true, email: true, name: true, username: true, currentProfile: true },
    });
    const targetArtistProfile = await db_1.default.artistProfile.findUnique({
        where: { id: followingId },
        select: { id: true, artistName: true, userId: true },
    });
    if (targetUser) {
        followingType = client_1.FollowingType.USER;
        followedUserEmail = targetUser.email;
        followedEntityName = targetUser.name || targetUser.username || 'Người dùng';
        followedUserIdForPusher = targetUser.id;
        isSelfFollow = targetUser.id === follower.id;
        recipientCurrentProfile = targetUser.currentProfile;
    }
    else if (targetArtistProfile) {
        followingType = client_1.FollowingType.ARTIST;
        const artistOwner = await db_1.default.user.findUnique({
            where: { id: targetArtistProfile.userId },
            select: { email: true, name: true, username: true, currentProfile: true },
        });
        followedUserEmail = artistOwner?.email || null;
        followedEntityName = targetArtistProfile.artistName || 'Nghệ sĩ';
        followedUserIdForPusher = targetArtistProfile.userId;
        isSelfFollow = targetArtistProfile.userId === follower.id;
        recipientCurrentProfile = artistOwner?.currentProfile || null;
    }
    else {
        throw new Error('Target not found');
    }
    if (isSelfFollow) {
        throw new Error('Cannot follow yourself');
    }
    const existingFollow = await db_1.default.userFollow.findFirst({
        where: {
            followerId: follower.id,
            followingType: followingType,
            ...(followingType === 'USER' && { followingUserId: followingId }),
            ...(followingType === 'ARTIST' && { followingArtistId: followingId }),
        },
    });
    if (existingFollow) {
        throw new Error('Already following');
    }
    const followData = {
        followerId: follower.id,
        followingType: followingType,
        ...(followingType === 'USER' && { followingUserId: followingId }),
        ...(followingType === 'ARTIST' && { followingArtistId: followingId }),
    };
    return db_1.default.$transaction(async (tx) => {
        await tx.userFollow.create({ data: followData });
        const followerName = follower.name || follower.username || 'A user';
        const followerProfileLink = `${FRONTEND_URL}/user/${follower.id}`;
        let notificationMessage = null;
        let notificationRecipientType = null;
        if (followingType === client_1.FollowingType.USER) {
            notificationMessage = `${followerName} started following your profile.`;
            notificationRecipientType = client_1.FollowingType.USER;
        }
        else if (followingType === client_1.FollowingType.ARTIST) {
            notificationMessage = `You have a new follower on your artist profile.`;
            notificationRecipientType = client_1.FollowingType.ARTIST;
        }
        if (followedUserEmail && notificationMessage) {
            try {
                const emailOptions = emailService.createNewFollowerEmail(followedUserEmail, followerName, followedEntityName, followerProfileLink);
                await emailService.sendEmail(emailOptions);
            }
            catch (error) {
                console.error('Failed to send email:', error);
            }
        }
        if (followedUserIdForPusher && notificationMessage && notificationRecipientType) {
            try {
                const notification = await tx.notification.create({
                    data: {
                        type: 'NEW_FOLLOW',
                        message: notificationMessage,
                        recipientType: notificationRecipientType,
                        ...(notificationRecipientType === 'USER' && { userId: followingId }),
                        ...(notificationRecipientType === 'ARTIST' && { artistId: followingId }),
                        senderId: follower.id,
                    },
                });
                const io = (0, socket_1.getIO)();
                const room = `user-${followedUserIdForPusher}`;
                io.to(room).emit('notification', {
                    id: notification.id,
                    type: 'NEW_FOLLOW',
                    message: notificationMessage,
                    recipientType: notificationRecipientType,
                    isRead: false,
                    createdAt: notification.createdAt.toISOString(),
                    sender: {
                        id: follower.id,
                        name: follower.name || follower.username,
                        avatar: follower.avatar
                    }
                });
            }
            catch (error) {
                console.error('Error creating or sending notification:', error);
            }
        }
        if (followingType === client_1.FollowingType.ARTIST) {
            await tx.artistProfile.update({
                where: { id: followingId },
                data: { monthlyListeners: { increment: 1 } },
            });
        }
        return { message: 'Followed successfully' };
    });
};
exports.followTarget = followTarget;
const unfollowTarget = async (follower, followingId) => {
    if (!follower) {
        throw new Error('Unauthorized');
    }
    const [userExists, artistExists] = await Promise.all([
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
    const follow = await db_1.default.userFollow.findFirst({
        where: whereConditions,
    });
    if (!follow) {
        throw new Error('Not following this target');
    }
    await db_1.default.$transaction(async (tx) => {
        await tx.userFollow.delete({
            where: { id: follow.id },
        });
        if (followingType === client_1.FollowingType.ARTIST) {
            await tx.artistProfile.update({
                where: { id: followingId },
                data: {
                    monthlyListeners: {
                        decrement: 1,
                    },
                },
            });
        }
    });
    return { message: 'Unfollowed successfully' };
};
exports.unfollowTarget = unfollowTarget;
const getUserFollowers = async (userId) => {
    if (!userId) {
        throw new Error('User ID is required');
    }
    const user = await db_1.default.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            followVisibility: true,
            artistProfile: {
                select: {
                    id: true
                }
            }
        }
    });
    if (!user) {
        throw new Error('User not found');
    }
    const options = {
        where: {
            OR: [
                { followingUserId: userId, followingType: 'USER' },
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
    const followers = await db_1.default.userFollow.findMany(options);
    return {
        followers: followers.map((follow) => follow.follower),
        canView: true
    };
};
exports.getUserFollowers = getUserFollowers;
const getUserFollowing = async (userId) => {
    if (!userId) {
        throw new Error('User ID is required');
    }
    const user = await db_1.default.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            followVisibility: true
        }
    });
    if (!user) {
        throw new Error('User not found');
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
    const following = await db_1.default.userFollow.findMany(options);
    return following.map((follow) => {
        if (follow.followingType === 'USER') {
            return {
                type: 'USER',
                ...follow.followingUser,
            };
        }
        else {
            return {
                type: 'ARTIST',
                ...follow.followingArtist,
                user: follow.followingArtist?.user,
            };
        }
    });
};
exports.getUserFollowing = getUserFollowing;
const requestArtistRole = async (user, data, avatarFile) => {
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
        user.artistProfile?.role === client_1.Role.ARTIST) {
        throw new Error('Forbidden');
    }
    const existingRequest = await db_1.default.artistProfile.findUnique({
        where: { userId: user.id },
        select: { verificationRequestedAt: true },
    });
    if (existingRequest?.verificationRequestedAt) {
        throw new Error('You have already requested to become an artist');
    }
    let avatarUrl = null;
    if (avatarFile) {
        const uploadResult = await (0, upload_service_1.uploadFile)(avatarFile.buffer, 'artist-avatars');
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
};
exports.requestArtistRole = requestArtistRole;
const getArtistRequest = async (userId) => {
    const artistProfile = await db_1.default.artistProfile.findUnique({
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
    const { verificationRequestedAt, isVerified, ...profileData } = artistProfile;
    return {
        hasPendingRequest: !!verificationRequestedAt && !isVerified,
        profileData,
    };
};
exports.getArtistRequest = getArtistRequest;
const getAllGenres = async () => {
    const genres = await db_1.default.genre.findMany({
        orderBy: {
            name: 'asc',
        },
    });
    return genres;
};
exports.getAllGenres = getAllGenres;
const editProfile = async (user, profileData, avatarFile) => {
    if (!user) {
        throw new Error('Unauthorized');
    }
    const { email, username, name, avatar, password, currentPassword, newPassword, newEmail } = profileData;
    if (newEmail) {
        const existingUser = await db_1.default.user.findUnique({
            where: { email: newEmail },
        });
        if (existingUser && existingUser.id !== user.id) {
            throw new Error('Email already in use');
        }
        if (currentPassword) {
            const userWithPassword = await db_1.default.user.findUnique({
                where: { id: user.id },
                select: { password: true }
            });
            const bcrypt = require('bcrypt');
            const isPasswordValid = await bcrypt.compare(currentPassword, userWithPassword?.password);
            if (!isPasswordValid) {
                throw new Error('Incorrect password');
            }
        }
        else {
            throw new Error('Current password is required to change email');
        }
    }
    if (username) {
        const existingUsername = await db_1.default.user.findUnique({
            where: { username },
        });
        if (existingUsername && existingUsername.id !== user.id) {
            throw new Error('Username already in use');
        }
    }
    if (newPassword && currentPassword) {
        const userWithPassword = await db_1.default.user.findUnique({
            where: { id: user.id },
            select: { password: true }
        });
        const bcrypt = require('bcrypt');
        const isPasswordValid = await bcrypt.compare(currentPassword, userWithPassword?.password);
        if (!isPasswordValid) {
            throw new Error('Incorrect password');
        }
    }
    else if (newPassword && !currentPassword) {
        throw new Error('Current password is required to change password');
    }
    let avatarUrl = null;
    if (avatarFile) {
        const uploadResult = await (0, upload_service_1.uploadFile)(avatarFile.buffer, 'user-avatars');
        avatarUrl = uploadResult.secure_url;
    }
    const updateData = {};
    if (email)
        updateData.email = email;
    if (newEmail)
        updateData.email = newEmail;
    if (username)
        updateData.username = username;
    if (name)
        updateData.name = name;
    if (avatarFile)
        updateData.avatar = avatarUrl;
    else if (avatar)
        updateData.avatar = avatar;
    if (newPassword) {
        const bcrypt = require('bcrypt');
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        updateData.password = hashedPassword;
    }
    else if (password) {
        const bcrypt = require('bcrypt');
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        updateData.password = hashedPassword;
    }
    if (Object.keys(updateData).length === 0) {
        throw new Error('No data provided for update');
    }
    return db_1.default.user.update({
        where: { id: user.id },
        data: updateData,
        select: prisma_selects_1.userSelect,
    });
};
exports.editProfile = editProfile;
const getUserProfile = async (id) => {
    const user = await db_1.default.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            followVisibility: true,
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
};
exports.getUserProfile = getUserProfile;
const getRecommendedArtists = async (user) => {
    if (!user) {
        throw new Error('Unauthorized');
    }
    const cacheKey = `/api/user/${user.id}/recommended-artists`;
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = await cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    }
    const history = await db_1.default.history.findMany({
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
        .flatMap((h) => h.track?.artist.genres.map((g) => g.genre.id) || [])
        .filter((id) => id !== null);
    const recommendedArtists = await db_1.default.artistProfile.findMany({
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
        await (0, cache_middleware_1.setCache)(cacheKey, recommendedArtists, 1800);
    }
    return recommendedArtists;
};
exports.getRecommendedArtists = getRecommendedArtists;
const getTopAlbums = async () => {
    const cacheKey = '/api/top-albums';
    const monthStart = getMonthStartDate();
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = await cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    }
    const albums = await db_1.default.album.findMany({
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
        await (0, cache_middleware_1.setCache)(cacheKey, albums, 1800);
    }
    return albums;
};
exports.getTopAlbums = getTopAlbums;
const getTopArtists = async () => {
    const cacheKey = '/api/top-artists';
    const monthStart = getMonthStartDate();
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = await cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    }
    const artists = await db_1.default.artistProfile.findMany({
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
        return {
            ...artist,
            monthlyListeners: uniqueListeners.size,
            monthlyPlays,
        };
    });
    const topArtists = artistsWithMonthlyMetrics
        .sort((a, b) => b.monthlyListeners - a.monthlyListeners)
        .slice(0, 20);
    if (process.env.USE_REDIS_CACHE === 'true') {
        await (0, cache_middleware_1.setCache)(cacheKey, topArtists, 1800);
    }
    return topArtists;
};
exports.getTopArtists = getTopArtists;
const getTopTracks = async () => {
    const cacheKey = '/api/top-tracks';
    const monthStart = getMonthStartDate();
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = await cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    }
    const tracks = await db_1.default.track.findMany({
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
    const tracksWithMonthlyPlays = tracks.map((track) => ({
        ...track,
        monthlyPlays: track.history.reduce((sum, h) => sum + (h.playCount || 0), 0),
    }));
    if (process.env.USE_REDIS_CACHE === 'true') {
        await (0, cache_middleware_1.setCache)(cacheKey, tracksWithMonthlyPlays, 1800);
    }
    return tracksWithMonthlyPlays;
};
exports.getTopTracks = getTopTracks;
const getNewestTracks = async () => {
    return db_1.default.track.findMany({
        where: { isActive: true },
        select: prisma_selects_1.searchTrackSelect,
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
};
exports.getNewestTracks = getNewestTracks;
const getNewestAlbums = async () => {
    return db_1.default.album.findMany({
        where: { isActive: true },
        select: prisma_selects_1.searchAlbumSelect,
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
};
exports.getNewestAlbums = getNewestAlbums;
const getUserTopTracks = async (user) => {
    if (!user) {
        throw new Error('Unauthorized');
    }
    const monthStart = getMonthStartDate();
    const history = await db_1.default.history.findMany({
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
    const tracks = await db_1.default.track.findMany({
        where: {
            id: { in: sortedTrackIds },
            isActive: true,
        },
        select: prisma_selects_1.searchTrackSelect,
    });
    const trackOrder = new Map(sortedTrackIds.map((id, index) => [id, index]));
    return tracks.sort((a, b) => (trackOrder.get(a.id) || 0) - (trackOrder.get(b.id) || 0));
};
exports.getUserTopTracks = getUserTopTracks;
const getUserTopArtists = async (user) => {
    if (!user) {
        throw new Error('Unauthorized');
    }
    const monthStart = getMonthStartDate();
    const history = await db_1.default.history.findMany({
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
        if (!curr.track?.artistId)
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
    const artists = await db_1.default.artistProfile.findMany({
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
};
exports.getUserTopArtists = getUserTopArtists;
const getUserTopAlbums = async (user) => {
    if (!user) {
        throw new Error('Unauthorized');
    }
    const monthStart = getMonthStartDate();
    const history = await db_1.default.history.findMany({
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
        if (!curr.track?.albumId)
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
    const albums = await db_1.default.album.findMany({
        where: {
            id: { in: sortedAlbumIds },
            isActive: true,
        },
        select: prisma_selects_1.searchAlbumSelect,
    });
    const albumOrder = new Map(sortedAlbumIds.map((id, index) => [id, index]));
    return albums.sort((a, b) => (albumOrder.get(a.id) || 0) - (albumOrder.get(b.id) || 0));
};
exports.getUserTopAlbums = getUserTopAlbums;
const getGenreTopAlbums = async (genreId) => {
    const cacheKey = `/api/genres/${genreId}/top-albums`;
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = await cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    }
    const albums = await db_1.default.album.findMany({
        where: {
            isActive: true,
            genres: {
                some: {
                    genreId,
                },
            },
        },
        select: prisma_selects_1.searchAlbumSelect,
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
    if (process.env.USE_REDIS_CACHE === 'true') {
        await (0, cache_middleware_1.setCache)(cacheKey, albums, 1800);
    }
    return albums;
};
exports.getGenreTopAlbums = getGenreTopAlbums;
const getGenreTopTracks = async (genreId) => {
    const cacheKey = `/api/genres/${genreId}/top-tracks`;
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = await cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    }
    const tracks = await db_1.default.track.findMany({
        where: {
            isActive: true,
            genres: {
                some: {
                    genreId,
                },
            },
        },
        select: prisma_selects_1.searchTrackSelect,
        orderBy: { playCount: 'desc' },
        take: 20,
    });
    if (process.env.USE_REDIS_CACHE === 'true') {
        await (0, cache_middleware_1.setCache)(cacheKey, tracks, 1800);
    }
    return tracks;
};
exports.getGenreTopTracks = getGenreTopTracks;
const getGenreNewestTracks = async (genreId) => {
    const cacheKey = `/api/genres/${genreId}/newest-tracks`;
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = await cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    }
    const tracks = await db_1.default.track.findMany({
        where: {
            isActive: true,
            genres: {
                some: {
                    genreId,
                },
            },
        },
        select: prisma_selects_1.searchTrackSelect,
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
    if (process.env.USE_REDIS_CACHE === 'true') {
        await (0, cache_middleware_1.setCache)(cacheKey, tracks, 1800);
    }
    return tracks;
};
exports.getGenreNewestTracks = getGenreNewestTracks;
const getGenreTopArtists = async (genreId) => {
    const cacheKey = `/api/genres/${genreId}/top-artists`;
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = await cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    }
    const artists = await db_1.default.artistProfile.findMany({
        where: {
            isVerified: true,
            genres: {
                some: {
                    genreId,
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
        },
    });
    if (process.env.USE_REDIS_CACHE === 'true') {
        await (0, cache_middleware_1.setCache)(cacheKey, artists, 1800);
    }
    return artists;
};
exports.getGenreTopArtists = getGenreTopArtists;
const setFollowVisibility = async (user, isPublic) => {
    if (!user) {
        throw new Error('Unauthorized');
    }
    return db_1.default.user.update({
        where: { id: user.id },
        data: { followVisibility: isPublic },
    });
};
exports.setFollowVisibility = setFollowVisibility;
//# sourceMappingURL=user.service.js.map