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
exports.getAllArtistsProfile = exports.getUserClaims = exports.submitArtistClaim = exports.getPlayHistory = exports.setFollowVisibility = exports.getGenreTopArtists = exports.getGenreNewestTracks = exports.getGenreTopTracks = exports.getGenreTopAlbums = exports.getUserTopAlbums = exports.getUserTopArtists = exports.getUserTopTracks = exports.getNewestAlbums = exports.getNewestTracks = exports.getTopTracks = exports.getTopArtists = exports.getTopAlbums = exports.getRecommendedArtists = exports.getUserProfile = exports.editProfile = exports.getDiscoverGenres = exports.getAllGenres = exports.getPendingUserActionsStatus = exports.getArtistRequest = exports.requestArtistRole = exports.getUserFollowing = exports.getUserFollowers = exports.unfollowTarget = exports.followTarget = exports.search = exports.validateArtistData = void 0;
exports.removeVietnameseTones = removeVietnameseTones;
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
            if (key === '_requestedLabel') {
                continue;
            }
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
function removeVietnameseTones(str) {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}
function normalizeStringForSearch(str) {
    return removeVietnameseTones(str)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function collectAndNormalizeFields(fields) {
    return normalizeStringForSearch(fields.filter(Boolean).join(' '));
}
function removeSpaces(str) {
    return str.replace(/\s+/g, '');
}
const search = async (user, query) => {
    if (!user) {
        throw new Error('Unauthorized');
    }
    const searchQuery = query.trim();
    const normalizedQuery = normalizeStringForSearch(searchQuery);
    const queryTokens = normalizedQuery.split(' ').filter(Boolean);
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
    const RETURN_LIMIT = 15;
    const [artists, albums, tracks, users] = await Promise.all([
        db_1.default.artistProfile.findMany({
            where: {
                isActive: true,
                isVerified: true,
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
        }),
        db_1.default.album.findMany({
            where: {
                isActive: true,
            },
            select: prisma_selects_1.searchAlbumSelect,
        }),
        db_1.default.track.findMany({
            where: {
                isActive: true,
            },
            select: prisma_selects_1.searchTrackSelect,
            orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
        }),
        db_1.default.user.findMany({
            where: {
                id: { not: user.id },
                role: 'USER',
                isActive: true,
            },
            select: prisma_selects_1.userSelect,
        }),
    ]);
    const filteredArtists = artists.filter(artist => {
        const normalized = collectAndNormalizeFields([
            artist.artistName,
            ...(artist.genres ? artist.genres.map(g => g.genre.name) : [])
        ]);
        return (queryTokens.every(token => normalized.includes(token)) ||
            removeSpaces(normalized).includes(removeSpaces(normalizedQuery)));
    }).slice(0, RETURN_LIMIT);
    const filteredAlbums = albums.filter(album => {
        const normalized = collectAndNormalizeFields([
            album.title,
            album.artist?.artistName,
            ...(album.genres ? album.genres.map(g => g.genre.name) : [])
        ]);
        return (queryTokens.every(token => normalized.includes(token)) ||
            removeSpaces(normalized).includes(removeSpaces(normalizedQuery)));
    }).slice(0, RETURN_LIMIT);
    const filteredTracks = tracks.filter(track => {
        const featuredArtistNames = track.featuredArtists ? track.featuredArtists.map(fa => fa.artistProfile?.artistName).filter(Boolean) : [];
        const genreNames = track.genres ? track.genres.map(g => g.genre.name) : [];
        const normalized = collectAndNormalizeFields([
            track.title,
            track.artist?.artistName,
            ...featuredArtistNames,
            ...genreNames
        ]);
        return (queryTokens.every(token => normalized.includes(token)) ||
            removeSpaces(normalized).includes(removeSpaces(normalizedQuery)));
    }).slice(0, RETURN_LIMIT);
    const filteredUsers = users.filter(u => {
        const normalized = collectAndNormalizeFields([
            u.username,
            u.name
        ]);
        return (queryTokens.every(token => normalized.includes(token)) ||
            removeSpaces(normalized).includes(removeSpaces(normalizedQuery)));
    }).slice(0, RETURN_LIMIT);
    const searchResult = { artists: filteredArtists, albums: filteredAlbums, tracks: filteredTracks, users: filteredUsers };
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
        let artistOwner = null;
        if (targetArtistProfile.userId) {
            artistOwner = await db_1.default.user.findUnique({
                where: { id: targetArtistProfile.userId },
                select: { email: true, name: true, username: true, currentProfile: true },
            });
        }
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
                const userSocketsMap = (0, socket_1.getUserSockets)();
                const targetSocketId = userSocketsMap.get(followedUserIdForPusher);
                if (targetSocketId) {
                    console.log(`[Socket Emit] Sending NEW_FOLLOW notification to user ${followedUserIdForPusher} via socket ${targetSocketId}`);
                    io.to(targetSocketId).emit('notification', {
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
                else {
                    console.log(`[Socket Emit] User ${followedUserIdForPusher} not connected, skipping NEW_FOLLOW socket event.`);
                }
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
const requestArtistRole = async (user, data, avatarFileDirect, idVerificationDocumentFileDirect) => {
    const { artistName, bio, socialMediaLinks: socialMediaLinksString, requestedLabelName, genres: genresString, } = data;
    const existingPendingClaimRequest = await db_1.default.artistClaimRequest.findFirst({
        where: {
            claimingUserId: user.id,
            status: client_1.ClaimStatus.PENDING,
        },
    });
    if (existingPendingClaimRequest) {
        throw { status: 400, message: 'You have a pending artist claim request. Please wait for it to be processed before requesting a new artist profile.' };
    }
    if (!artistName?.trim()) {
        throw { status: 400, message: 'Artist name is required.' };
    }
    if (artistName.trim().length < 2) {
        throw { status: 400, message: 'Artist name must be at least 2 characters.' };
    }
    if (bio && bio.length > 1000) {
        throw { status: 400, message: 'Bio must be less than 1000 characters.' };
    }
    if (requestedLabelName && requestedLabelName.length > 100) {
        throw { status: 400, message: 'Requested label name cannot exceed 100 characters.' };
    }
    if (!user || user.role !== client_1.Role.USER) {
        throw { status: 403, message: 'Only users can request to become an artist.' };
    }
    const existingPendingRequest = await db_1.default.artistRequest.findFirst({
        where: {
            userId: user.id,
            status: client_1.RequestStatus.PENDING,
        },
    });
    if (existingPendingRequest) {
        throw { status: 400, message: 'You already have a pending request to become an artist. Please wait for it to be processed.' };
    }
    let socialMediaLinksJson = undefined;
    if (socialMediaLinksString) {
        try {
            socialMediaLinksJson = JSON.parse(socialMediaLinksString);
        }
        catch (e) {
            console.error("Error parsing socialMediaLinksString:", e);
            throw { status: 400, message: 'Invalid format for social media links.' };
        }
    }
    let avatarUrl = null;
    if (avatarFileDirect) {
        try {
            const uploadResult = await (0, upload_service_1.uploadFile)(avatarFileDirect.buffer, 'artist-request-avatars');
            avatarUrl = uploadResult.secure_url;
        }
        catch (uploadError) {
            console.error("Error uploading avatar for artist request:", uploadError);
            throw { status: 500, message: "Failed to upload avatar. Please try again." };
        }
    }
    let idVerificationDocumentUrl = null;
    if (idVerificationDocumentFileDirect) {
        try {
            const uploadResult = await (0, upload_service_1.uploadFile)(idVerificationDocumentFileDirect.buffer, 'artist-request-id-docs');
            idVerificationDocumentUrl = uploadResult.secure_url;
        }
        catch (uploadError) {
            console.error("Error uploading ID verification document for artist request:", uploadError);
            throw { status: 500, message: "Failed to upload ID verification document. Please try again." };
        }
    }
    const requestedGenresArray = genresString?.split(',').map(g => g.trim()).filter(g => g) || [];
    const newArtistRequest = await db_1.default.artistRequest.create({
        data: {
            userId: user.id,
            artistName: artistName.trim(),
            bio: bio?.trim(),
            avatarUrl: avatarUrl,
            socialMediaLinks: socialMediaLinksJson || client_1.Prisma.JsonNull,
            requestedGenres: requestedGenresArray,
            requestedLabelName: requestedLabelName?.trim() || null,
            status: client_1.RequestStatus.PENDING,
        },
        select: {
            id: true,
            artistName: true,
            status: true,
            avatarUrl: true,
            requestedGenres: true,
            user: { select: { id: true, name: true, username: true, avatar: true } },
        }
    });
    try {
        const admins = await db_1.default.user.findMany({ where: { role: client_1.Role.ADMIN } });
        const requestingUserName = newArtistRequest.user.name || newArtistRequest.user.username || 'A user';
        const notificationMessage = `User '${requestingUserName}' has submitted a request to become artist '${newArtistRequest.artistName}'.`;
        const notificationPromises = admins.map(admin => db_1.default.notification.create({
            data: {
                type: client_1.NotificationType.ARTIST_REQUEST_SUBMITTED,
                message: notificationMessage,
                recipientType: client_1.RecipientType.USER,
                userId: admin.id,
                senderId: user.id,
                artistRequestId: newArtistRequest.id,
            },
            select: {
                id: true, type: true, message: true, recipientType: true, userId: true,
                senderId: true, artistRequestId: true, createdAt: true, isRead: true
            }
        }));
        const createdNotifications = await Promise.all(notificationPromises);
        const io = (0, socket_1.getIO)();
        const userSocketsMap = (0, socket_1.getUserSockets)();
        createdNotifications.forEach(notification => {
            const adminSocketId = userSocketsMap.get(notification.userId);
            if (adminSocketId) {
                console.log(`[Socket Emit] Sending ARTIST_REQUEST_SUBMITTED notification to admin ${notification.userId} via socket ${adminSocketId}`);
                io.to(adminSocketId).emit('notification', {
                    id: notification.id,
                    type: notification.type,
                    message: notification.message,
                    recipientType: notification.recipientType,
                    isRead: notification.isRead,
                    createdAt: notification.createdAt.toISOString(),
                    artistRequestId: notification.artistRequestId,
                    senderId: notification.senderId,
                    requestingUser: {
                        id: newArtistRequest.user.id,
                        name: newArtistRequest.user.name,
                        username: newArtistRequest.user.username,
                        avatar: newArtistRequest.user.avatar,
                    },
                    artistRequestDetails: {
                        id: newArtistRequest.id,
                        artistName: newArtistRequest.artistName,
                        avatarUrl: newArtistRequest.avatarUrl,
                    }
                });
            }
            else {
                console.log(`[Socket Emit] Admin ${notification.userId} not connected, skipping ARTIST_REQUEST_SUBMITTED socket event.`);
            }
        });
    }
    catch (notificationError) {
        console.error("[Notify Error] Failed to create admin notifications for new artist request:", notificationError);
    }
    return {
        message: 'Artist request submitted successfully. It will be reviewed by an administrator.',
        request: newArtistRequest,
    };
};
exports.requestArtistRole = requestArtistRole;
const getArtistRequest = async (userId) => {
    if (!userId) {
        return { hasPendingRequest: false, isVerified: false, profileData: null };
    }
    const pendingArtistRoleRequest = await db_1.default.artistRequest.findFirst({
        where: {
            userId: userId,
            status: client_1.RequestStatus.PENDING,
        },
        select: {
            id: true,
        },
    });
    if (pendingArtistRoleRequest) {
        return { hasPendingRequest: true, isVerified: false, profileData: null };
    }
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
    if (artistProfile) {
        return {
            hasPendingRequest: !!artistProfile.verificationRequestedAt && !artistProfile.isVerified,
            isVerified: artistProfile.isVerified,
            profileData: artistProfile,
        };
    }
    return { hasPendingRequest: false, isVerified: false, profileData: null };
};
exports.getArtistRequest = getArtistRequest;
const getPendingUserActionsStatus = async (userId) => {
    if (!userId) {
        throw { status: 400, message: "User ID is required." };
    }
    const pendingArtistRequest = await db_1.default.artistRequest.findFirst({
        where: {
            userId: userId,
            status: client_1.RequestStatus.PENDING,
        },
        select: { id: true },
    });
    const pendingClaimRequest = await db_1.default.artistClaimRequest.findFirst({
        where: {
            claimingUserId: userId,
            status: client_1.ClaimStatus.PENDING,
        },
        select: { id: true },
    });
    return {
        hasPendingArtistRequest: !!pendingArtistRequest,
        hasPendingClaimRequest: !!pendingClaimRequest,
    };
};
exports.getPendingUserActionsStatus = getPendingUserActionsStatus;
const getAllGenres = async () => {
    const genres = await db_1.default.genre.findMany({
        orderBy: {
            name: 'asc',
        },
    });
    return genres;
};
exports.getAllGenres = getAllGenres;
const getDiscoverGenres = async () => {
    const genres = await db_1.default.genre.findMany({
        where: {
            OR: [
                { tracks: { some: { track: { isActive: true } } } },
                { albums: { some: { album: { isActive: true } } } },
                { artistProfiles: { some: { artistProfile: { isActive: true, isVerified: true } } } }
            ],
        },
        select: {
            id: true,
            name: true,
        },
        orderBy: {
            name: 'asc',
        },
    });
    return genres;
};
exports.getDiscoverGenres = getDiscoverGenres;
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
            playlists: {
                where: {
                    privacy: 'PUBLIC',
                },
                select: {
                    id: true,
                    name: true,
                    coverUrl: true,
                    type: true,
                    totalTracks: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: 20,
            },
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
        .filter((id) => typeof id === 'string');
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
        take: 15
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
const getPlayHistory = async (user) => {
    if (!user)
        throw new Error('Unauthorized');
    const history = await db_1.default.history.findMany({
        where: {
            userId: user.id,
            type: client_1.HistoryType.PLAY,
        },
        select: {
            id: true,
            trackId: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });
    const trackIds = history
        .map(h => h.trackId)
        .filter((id) => typeof id === 'string');
    if (trackIds.length === 0) {
        return [];
    }
    const tracks = await db_1.default.track.findMany({
        where: {
            id: { in: trackIds },
            isActive: true
        },
        select: prisma_selects_1.searchTrackSelect,
    });
    return tracks;
};
exports.getPlayHistory = getPlayHistory;
const submitArtistClaim = async (userId, artistProfileId, proof) => {
    if (!userId) {
        throw new Error('Unauthorized: User must be logged in to submit a claim.');
    }
    const existingPendingArtistRequest = await db_1.default.artistRequest.findFirst({
        where: {
            userId: userId,
            status: client_1.RequestStatus.PENDING,
        },
    });
    if (existingPendingArtistRequest) {
        throw { status: 400, message: 'You have a pending request to become an artist. Please wait for it to be processed before claiming an existing profile.' };
    }
    if (!artistProfileId) {
        throw new Error('Artist profile ID is required.');
    }
    if (!proof || !Array.isArray(proof) || proof.length === 0) {
        throw new Error('Proof is required to submit a claim.');
    }
    const targetProfile = await db_1.default.artistProfile.findUnique({
        where: { id: artistProfileId },
        select: { id: true, userId: true, isVerified: true, artistName: true }
    });
    if (!targetProfile) {
        throw new Error('Artist profile not found.');
    }
    if (targetProfile.userId) {
        throw new Error('This artist profile is already associated with a user.');
    }
    const existingClaim = await db_1.default.artistClaimRequest.findFirst({
        where: {
            claimingUserId: userId,
            artistProfileId: artistProfileId,
        },
        select: { id: true, status: true },
    });
    if (existingClaim) {
        if (existingClaim.status === 'PENDING') {
            throw new Error('You already have a pending claim for this artist profile.');
        }
        else if (existingClaim.status === 'APPROVED') {
            throw new Error('Your claim for this artist profile has already been approved.');
        }
        else {
            throw new Error('Your previous claim for this profile was rejected.');
        }
    }
    const newClaim = await db_1.default.artistClaimRequest.create({
        data: {
            claimingUserId: userId,
            artistProfileId: artistProfileId,
            proof: proof,
            status: client_1.ClaimStatus.PENDING,
        },
        select: {
            id: true,
            status: true,
            submittedAt: true,
            claimingUser: { select: { id: true, name: true, username: true, avatar: true } },
            artistProfile: { select: { id: true, artistName: true, avatar: true } }
        }
    });
    try {
        const admins = await db_1.default.user.findMany({ where: { role: client_1.Role.ADMIN } });
        const userName = newClaim.claimingUser.name || newClaim.claimingUser.username || userId;
        const artistName = newClaim.artistProfile.artistName;
        const notificationPromises = admins.map(async (admin) => {
            const notificationRecord = await db_1.default.notification.create({
                data: {
                    type: client_1.NotificationType.CLAIM_REQUEST_SUBMITTED,
                    message: `User '${userName}' submitted a claim request for artist '${artistName}'.`,
                    recipientType: client_1.RecipientType.USER,
                    userId: admin.id,
                    senderId: userId,
                    artistId: artistProfileId,
                    claimId: newClaim.id,
                },
                select: { id: true, type: true, message: true, recipientType: true, userId: true, senderId: true, artistId: true, createdAt: true, isRead: true, claimId: true }
            });
            return { adminId: admin.id, notification: notificationRecord };
        });
        const createdClaimNotifications = await Promise.all(notificationPromises);
        const io = (0, socket_1.getIO)();
        const userSocketsMap = (0, socket_1.getUserSockets)();
        createdClaimNotifications.forEach(({ adminId, notification }) => {
            const adminSocketId = userSocketsMap.get(adminId);
            if (adminSocketId) {
                console.log(`[Socket Emit] Sending CLAIM_REQUEST_SUBMITTED notification to admin ${adminId} via socket ${adminSocketId}`);
                io.to(adminSocketId).emit('notification', {
                    id: notification.id,
                    type: notification.type,
                    message: notification.message,
                    recipientType: notification.recipientType,
                    isRead: notification.isRead,
                    createdAt: notification.createdAt.toISOString(),
                    artistId: notification.artistId,
                    senderId: notification.senderId,
                    claimId: notification.claimId,
                    sender: { id: userId, name: userName, avatar: newClaim.claimingUser.avatar },
                    artistProfile: { id: newClaim.artistProfile.id, artistName: artistName, avatar: newClaim.artistProfile.avatar }
                });
            }
        });
    }
    catch (notificationError) {
        console.error("[Notify Error] Failed to create admin notifications for claim request:", notificationError);
    }
    return newClaim;
};
exports.submitArtistClaim = submitArtistClaim;
const getUserClaims = async (userId) => {
    if (!userId) {
        throw new Error('Unauthorized');
    }
    const claims = await db_1.default.artistClaimRequest.findMany({
        where: {
            claimingUserId: userId,
        },
        select: {
            id: true,
            status: true,
            submittedAt: true,
            reviewedAt: true,
            rejectionReason: true,
            artistProfile: {
                select: {
                    id: true,
                    artistName: true,
                    avatar: true,
                }
            }
        },
        orderBy: {
            submittedAt: 'desc',
        },
    });
    return claims;
};
exports.getUserClaims = getUserClaims;
const getAllArtistsProfile = async () => {
    const artists = await db_1.default.artistProfile.findMany({
        where: {
            isActive: true,
        },
        select: {
            id: true,
            artistName: true,
            avatar: true,
            bio: true,
            userId: true,
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
        orderBy: { artistName: 'asc' },
    });
    return artists;
};
exports.getAllArtistsProfile = getAllArtistsProfile;
//# sourceMappingURL=user.service.js.map