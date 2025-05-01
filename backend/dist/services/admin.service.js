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
exports.updateAIModel = exports.updateCacheStatus = exports.getAIModelStatus = exports.getCacheStatus = exports.getSystemStatus = exports.getDashboardStats = exports.deleteArtistRequest = exports.rejectArtistRequest = exports.approveArtistRequest = exports.deleteGenreById = exports.updateGenreInfo = exports.createNewGenre = exports.getGenres = exports.getArtistById = exports.getArtists = exports.deleteArtistById = exports.deleteUserById = exports.updateArtistInfo = exports.updateUserInfo = exports.getArtistRequestDetail = exports.getArtistRequests = exports.getUserById = exports.getUsers = void 0;
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const handle_utils_1 = require("../utils/handle-utils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cache_middleware_1 = require("../middleware/cache.middleware");
const email_service_1 = require("./email.service");
const client_2 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const date_fns_1 = require("date-fns");
const emailService = __importStar(require("./email.service"));
const VALID_GEMINI_MODELS = [
    'gemini-2.5-flash-preview-04-17',
    'gemini-2.5-pro-preview-03-25',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
];
const getUsers = async (req, requestingUser) => {
    const { search, status, sortBy, sortOrder } = req.query;
    const where = {
        id: { not: requestingUser.id },
    };
    if (search && typeof search === 'string') {
        where.OR = [
            { email: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (status && typeof status === 'string' && status !== 'ALL') {
        where.isActive = status === 'true';
    }
    let orderBy = { createdAt: 'desc' };
    const validSortFields = [
        'name',
        'email',
        'username',
        'role',
        'isActive',
        'createdAt',
        'lastLoginAt',
    ];
    if (sortBy &&
        typeof sortBy === 'string' &&
        validSortFields.includes(sortBy)) {
        const direction = sortOrder === 'asc' ? 'asc' : 'desc';
        orderBy = { [sortBy]: direction };
    }
    const options = {
        where,
        select: prisma_selects_1.userSelect,
        orderBy,
    };
    const result = await (0, handle_utils_1.paginate)(db_1.default.user, req, options);
    return {
        users: result.data,
        pagination: result.pagination,
    };
};
exports.getUsers = getUsers;
const getUserById = async (id) => {
    const user = await db_1.default.user.findUnique({
        where: { id },
        select: prisma_selects_1.userSelect,
    });
    if (!user) {
        throw new Error('User not found');
    }
    return user;
};
exports.getUserById = getUserById;
const getArtistRequests = async (req) => {
    const { search, startDate, endDate } = req.query;
    const where = {
        verificationRequestedAt: { not: null },
        user: {
            isActive: true,
        },
        isVerified: false,
        AND: [],
    };
    if (typeof search === 'string' && search.trim()) {
        const trimmedSearch = search.trim();
        if (Array.isArray(where.AND)) {
            where.AND.push({
                OR: [
                    { artistName: { contains: trimmedSearch, mode: 'insensitive' } },
                    { user: { name: { contains: trimmedSearch, mode: 'insensitive' } } },
                    {
                        user: { email: { contains: trimmedSearch, mode: 'insensitive' } },
                    },
                ],
            });
        }
    }
    const dateFilter = {};
    if (typeof startDate === 'string' && startDate) {
        try {
            const startOfDay = new Date(startDate);
            startOfDay.setUTCHours(0, 0, 0, 0);
            dateFilter.gte = startOfDay;
        }
        catch (e) {
            console.error("Invalid start date format:", startDate);
        }
    }
    if (typeof endDate === 'string' && endDate) {
        try {
            const endOfDay = new Date(endDate);
            endOfDay.setUTCHours(23, 59, 59, 999);
            dateFilter.lte = endOfDay;
        }
        catch (e) {
            console.error("Invalid end date format:", endDate);
        }
    }
    if (dateFilter.gte || dateFilter.lte) {
        if (Array.isArray(where.AND)) {
            where.AND.push({ verificationRequestedAt: dateFilter });
        }
    }
    const options = {
        where,
        select: prisma_selects_1.artistRequestSelect,
        orderBy: { verificationRequestedAt: 'desc' },
    };
    const result = await (0, handle_utils_1.paginate)(db_1.default.artistProfile, req, options);
    return {
        requests: result.data,
        pagination: result.pagination,
    };
};
exports.getArtistRequests = getArtistRequests;
const getArtistRequestDetail = async (id) => {
    let request = await db_1.default.artistProfile.findUnique({
        where: { id },
        select: prisma_selects_1.artistRequestDetailsSelect,
    });
    if (!request) {
        request = await db_1.default.artistProfile.findFirst({
            where: {
                userId: id,
                verificationRequestedAt: { not: null }
            },
            select: prisma_selects_1.artistRequestDetailsSelect,
        });
    }
    if (!request) {
        throw new Error('Request not found');
    }
    return request;
};
exports.getArtistRequestDetail = getArtistRequestDetail;
const updateUserInfo = async (id, data, requestingUser) => {
    const { name, username, email, newPassword, isActive, reason } = data;
    const existingUser = await db_1.default.user.findUnique({ where: { id } });
    if (!existingUser) {
        throw new Error('User not found');
    }
    if (requestingUser.role !== client_1.Role.ADMIN && existingUser.role === client_1.Role.ADMIN) {
        throw new Error(`Permission denied: Cannot modify Admin users.`);
    }
    if (requestingUser.role === client_1.Role.ADMIN && requestingUser.id !== id && existingUser.role === client_1.Role.ADMIN) {
        throw new Error(`Permission denied: Admins cannot modify other Admin users.`);
    }
    const updateData = {};
    if (name !== undefined) {
        updateData.name = name;
    }
    if (email !== undefined && email !== existingUser.email) {
        const existingEmail = await db_1.default.user.findFirst({ where: { email, NOT: { id } } });
        if (existingEmail)
            throw new Error('Email already exists');
        updateData.email = email;
    }
    if (username !== undefined && username !== existingUser.username) {
        const existingUsername = await db_1.default.user.findFirst({ where: { username, NOT: { id } } });
        if (existingUsername)
            throw new Error('Username already exists');
        updateData.username = username;
    }
    if (isActive !== undefined) {
        const isActiveBool = (0, handle_utils_1.toBooleanValue)(isActive);
        if (isActiveBool === undefined) {
            throw new Error('Invalid value for isActive status');
        }
        if (requestingUser.id === id && !isActiveBool) {
            throw new Error("Permission denied: Cannot deactivate your own account.");
        }
        updateData.isActive = isActiveBool;
    }
    if (newPassword) {
        if (newPassword.length < 6) {
            throw new Error('Password must be at least 6 characters long.');
        }
        updateData.password = await bcrypt_1.default.hash(newPassword, 10);
    }
    if (Object.keys(updateData).length === 0) {
        throw new Error("No valid data provided for update.");
    }
    const updatedUser = await db_1.default.user.update({
        where: { id },
        data: updateData,
        select: prisma_selects_1.userSelect,
    });
    if (updateData.isActive !== undefined && updateData.isActive !== existingUser.isActive) {
        const userName = updatedUser.name || updatedUser.username || 'User';
        if (updatedUser.isActive === false) {
            db_1.default.notification.create({
                data: {
                    type: 'ACCOUNT_DEACTIVATED',
                    message: `Your account has been deactivated.${reason ? ` Reason: ${reason}` : ''}`,
                    recipientType: 'USER',
                    userId: id,
                    isRead: false,
                },
            }).catch(err => console.error('[Async Notify Error] Failed to create deactivation notification:', err));
            if (updatedUser.email) {
                try {
                    const emailOptions = emailService.createAccountDeactivatedEmail(updatedUser.email, userName, 'user', reason);
                    emailService.sendEmail(emailOptions).catch(err => console.error('[Async Email Error] Failed to send deactivation email:', err));
                }
                catch (syncError) {
                    console.error('[Email Setup Error] Failed to create deactivation email options:', syncError);
                }
            }
        }
        else if (updatedUser.isActive === true) {
            db_1.default.notification.create({
                data: {
                    type: 'ACCOUNT_ACTIVATED',
                    message: 'Your account has been reactivated.',
                    recipientType: 'USER',
                    userId: id,
                    isRead: false,
                },
            }).catch(err => console.error('[Async Notify Error] Failed to create activation notification:', err));
            if (updatedUser.email) {
                try {
                    const emailOptions = emailService.createAccountActivatedEmail(updatedUser.email, userName, 'user');
                    emailService.sendEmail(emailOptions).catch(err => console.error('[Async Email Error] Failed to send activation email:', err));
                }
                catch (syncError) {
                    console.error('[Email Setup Error] Failed to create activation email options:', syncError);
                }
            }
        }
    }
    return updatedUser;
};
exports.updateUserInfo = updateUserInfo;
const updateArtistInfo = async (id, data) => {
    const { artistName, bio, isActive, reason } = data;
    const existingArtist = await db_1.default.artistProfile.findUnique({
        where: { id },
        select: {
            id: true,
            artistName: true,
            isActive: true,
            userId: true,
            user: { select: { id: true, email: true, name: true, username: true } }
        }
    });
    if (!existingArtist) {
        throw new Error('Artist not found');
    }
    const validationErrors = [];
    if (artistName !== undefined) {
        if (artistName.length < 3) {
            validationErrors.push('Artist name must be at least 3 characters');
        }
        if (artistName.length > 100) {
            validationErrors.push('Artist name cannot exceed 100 characters');
        }
    }
    if (bio !== undefined && bio.length > 1000) {
        validationErrors.push('Biography cannot exceed 1000 characters');
    }
    if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }
    let validatedArtistName = undefined;
    if (artistName && artistName !== existingArtist.artistName) {
        const nameExists = await db_1.default.artistProfile.findFirst({
            where: {
                artistName,
                id: { not: id },
            },
        });
        if (nameExists) {
            throw new Error('Artist name already exists');
        }
        validatedArtistName = artistName;
    }
    const updateData = {};
    if (validatedArtistName !== undefined) {
        updateData.artistName = validatedArtistName;
    }
    if (bio !== undefined) {
        updateData.bio = bio;
    }
    if (isActive !== undefined) {
        const isActiveBool = (0, handle_utils_1.toBooleanValue)(isActive);
        if (isActiveBool === undefined) {
            throw new Error('Invalid value for isActive status');
        }
        updateData.isActive = isActiveBool;
    }
    if (Object.keys(updateData).length === 0) {
        throw new Error('No valid data provided for update');
    }
    const updatedArtist = await db_1.default.artistProfile.update({
        where: { id },
        data: updateData,
        select: prisma_selects_1.artistProfileSelect,
    });
    if (isActive !== undefined && existingArtist.isActive !== updatedArtist.isActive) {
        const ownerUser = existingArtist.user;
        const ownerUserName = ownerUser?.name || ownerUser?.username || 'Artist';
        if (updatedArtist.isActive === false) {
            if (ownerUser?.id) {
                db_1.default.notification.create({
                    data: {
                        type: 'ACCOUNT_DEACTIVATED',
                        message: `Your artist account has been deactivated.${reason ? ` Reason: ${reason}` : ''}`,
                        recipientType: 'USER',
                        userId: ownerUser.id,
                        isRead: false,
                    },
                }).catch(err => console.error('[Async Notify Error] Failed to create artist deactivation notification:', err));
            }
            if (ownerUser?.email) {
                try {
                    const emailOptions = emailService.createAccountDeactivatedEmail(ownerUser.email, ownerUserName, 'artist', reason);
                    emailService.sendEmail(emailOptions).catch(err => console.error('[Async Email Error] Failed to send artist deactivation email:', err));
                }
                catch (syncError) {
                    console.error('[Email Setup Error] Failed to create artist deactivation email options:', syncError);
                }
            }
        }
        else if (updatedArtist.isActive === true) {
            if (ownerUser?.id) {
                db_1.default.notification.create({
                    data: {
                        type: 'ACCOUNT_ACTIVATED',
                        message: 'Your artist account has been reactivated.',
                        recipientType: 'USER',
                        userId: ownerUser.id,
                        isRead: false,
                    },
                }).catch(err => console.error('[Async Notify Error] Failed to create artist activation notification:', err));
            }
            if (ownerUser?.email) {
                try {
                    const emailOptions = emailService.createAccountActivatedEmail(ownerUser.email, ownerUserName, 'artist');
                    emailService.sendEmail(emailOptions).catch(err => console.error('[Async Email Error] Failed to send artist activation email:', err));
                }
                catch (syncError) {
                    console.error('[Email Setup Error] Failed to create artist activation email options:', syncError);
                }
            }
        }
    }
    return updatedArtist;
};
exports.updateArtistInfo = updateArtistInfo;
const deleteUserById = async (id, requestingUser, reason) => {
    const userToDelete = await db_1.default.user.findUnique({
        where: { id },
        select: { role: true, email: true, name: true, username: true },
    });
    if (!userToDelete) {
        throw new Error('User not found');
    }
    if (!requestingUser || !requestingUser.role) {
        throw new Error('Permission denied: Invalid requesting user data.');
    }
    if (userToDelete.role === client_1.Role.ADMIN) {
        if (requestingUser.id === id) {
            throw new Error('Permission denied: Admins cannot delete themselves.');
        }
        throw new Error('Permission denied: Admins cannot delete other admins.');
    }
    if (userToDelete.email) {
        try {
            const userName = userToDelete.name || userToDelete.username || 'User';
            const emailOptions = emailService.createAccountDeletedEmail(userToDelete.email, userName, reason);
            emailService.sendEmail(emailOptions).catch(err => console.error('[Async Email Error] Failed to send account deletion email:', err));
        }
        catch (syncError) {
            console.error('[Email Setup Error] Failed to create deletion email options:', syncError);
        }
    }
    await db_1.default.user.delete({ where: { id } });
    return { message: `User ${id} deleted successfully. Reason: ${reason || 'No reason provided'}` };
};
exports.deleteUserById = deleteUserById;
const deleteArtistById = async (id, reason) => {
    const artistToDelete = await db_1.default.artistProfile.findUnique({
        where: { id },
        select: {
            id: true,
            artistName: true,
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    username: true
                }
            }
        }
    });
    if (!artistToDelete) {
        throw new Error('Artist not found');
    }
    const associatedUser = artistToDelete.user;
    if (associatedUser && associatedUser.email) {
        try {
            const nameToSend = artistToDelete.artistName || associatedUser.name || associatedUser.username || 'Artist';
            const emailOptions = emailService.createAccountDeletedEmail(associatedUser.email, nameToSend, reason);
            emailService.sendEmail(emailOptions).catch(err => console.error('[Async Email Error] Failed to send artist account deletion email:', err));
        }
        catch (syncError) {
            console.error('[Email Setup Error] Failed to create artist deletion email options:', syncError);
        }
    }
    await db_1.default.artistProfile.delete({ where: { id: artistToDelete.id } });
    return { message: `Artist ${id} deleted permanently. Reason: ${reason || 'No reason provided'}` };
};
exports.deleteArtistById = deleteArtistById;
const getArtists = async (req) => {
    const { search, status, sortBy, sortOrder } = req.query;
    const where = {
        role: client_1.Role.ARTIST,
    };
    if (search && typeof search === 'string') {
        where.OR = [
            { artistName: { contains: search, mode: 'insensitive' } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
        ];
    }
    if (status && typeof status === 'string' && status !== 'ALL') {
        where.isActive = status === 'true';
    }
    let orderBy = {
        createdAt: 'desc',
    };
    const validSortFields = [
        'artistName',
        'isActive',
        'monthlyListeners',
        'createdAt',
    ];
    if (sortBy &&
        typeof sortBy === 'string' &&
        validSortFields.includes(sortBy)) {
        const direction = sortOrder === 'asc' ? 'asc' : 'desc';
        orderBy = { [sortBy]: direction };
    }
    const options = {
        where,
        select: prisma_selects_1.artistProfileSelect,
        orderBy,
    };
    const result = await (0, handle_utils_1.paginate)(db_1.default.artistProfile, req, options);
    return {
        artists: result.data,
        pagination: result.pagination,
    };
};
exports.getArtists = getArtists;
const getArtistById = async (id) => {
    const artist = await db_1.default.artistProfile.findUnique({
        where: { id },
        select: {
            ...prisma_selects_1.artistProfileSelect,
            albums: {
                orderBy: { releaseDate: 'desc' },
                select: prisma_selects_1.artistProfileSelect.albums.select,
            },
            tracks: {
                where: {
                    type: 'SINGLE',
                    albumId: null,
                },
                orderBy: { releaseDate: 'desc' },
                select: prisma_selects_1.artistProfileSelect.tracks.select,
            },
        },
    });
    if (!artist) {
        throw new Error('Artist not found');
    }
    return artist;
};
exports.getArtistById = getArtistById;
const getGenres = async (req) => {
    const { search = '' } = req.query;
    const where = search
        ? {
            name: {
                contains: String(search),
                mode: 'insensitive',
            },
        }
        : {};
    const options = {
        where,
        select: prisma_selects_1.genreSelect,
        orderBy: { createdAt: 'desc' },
    };
    const result = await (0, handle_utils_1.paginate)(db_1.default.genre, req, options);
    return {
        genres: result.data,
        pagination: result.pagination,
    };
};
exports.getGenres = getGenres;
const createNewGenre = async (name) => {
    const existingGenre = await db_1.default.genre.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existingGenre) {
        throw new Error('Genre name already exists');
    }
    return db_1.default.genre.create({
        data: { name },
    });
};
exports.createNewGenre = createNewGenre;
const updateGenreInfo = async (id, name) => {
    const existingGenre = await db_1.default.genre.findUnique({
        where: { id },
    });
    if (!existingGenre) {
        throw new Error('Genre not found');
    }
    if (name.toLowerCase() !== existingGenre.name.toLowerCase()) {
        const existingGenreWithName = await db_1.default.genre.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                NOT: { id }
            },
        });
        if (existingGenreWithName) {
            throw new Error('Genre name already exists');
        }
    }
    return db_1.default.genre.update({
        where: { id },
        data: { name },
    });
};
exports.updateGenreInfo = updateGenreInfo;
const deleteGenreById = async (id) => {
    return db_1.default.genre.delete({ where: { id } });
};
exports.deleteGenreById = deleteGenreById;
const approveArtistRequest = async (requestId) => {
    const artistProfile = await db_1.default.artistProfile.findFirst({
        where: {
            id: requestId,
            verificationRequestedAt: { not: null },
            isVerified: false,
        },
        select: {
            id: true,
            userId: true,
            requestedLabelName: true,
            user: { select: { id: true, email: true, name: true, username: true } }
        }
    });
    if (!artistProfile) {
        throw new Error('Artist request not found, already verified, or rejected.');
    }
    const requestedLabelName = artistProfile.requestedLabelName;
    const userForNotification = artistProfile.user;
    const updatedProfile = await db_1.default.$transaction(async (tx) => {
        const verifiedProfile = await tx.artistProfile.update({
            where: { id: requestId },
            data: {
                role: client_1.Role.ARTIST,
                isVerified: true,
                verifiedAt: new Date(),
                verificationRequestedAt: null,
                requestedLabelName: null,
            },
            select: { id: true }
        });
        let finalLabelId = null;
        if (requestedLabelName) {
            const labelRecord = await tx.label.upsert({
                where: { name: requestedLabelName },
                update: {},
                create: { name: requestedLabelName },
                select: { id: true }
            });
            finalLabelId = labelRecord.id;
        }
        if (finalLabelId) {
            await tx.artistProfile.update({
                where: { id: verifiedProfile.id },
                data: {
                    labelId: finalLabelId,
                }
            });
        }
        const finalProfile = await tx.artistProfile.findUnique({
            where: { id: verifiedProfile.id },
            include: {
                user: { select: prisma_selects_1.userSelect },
                label: true
            }
        });
        if (!finalProfile) {
            throw new Error("Failed to retrieve updated profile after transaction.");
        }
        return finalProfile;
    });
    if (userForNotification) {
        db_1.default.notification.create({
            data: {
                type: 'ARTIST_REQUEST_APPROVE',
                message: 'Your request to become an Artist has been approved!',
                recipientType: 'USER',
                userId: userForNotification.id,
            },
        }).catch(err => console.error('[Async Notify Error] Failed to create approval notification:', err));
        if (userForNotification.email) {
            try {
                const emailOptions = emailService.createArtistRequestApprovedEmail(userForNotification.email, userForNotification.name || userForNotification.username || 'User');
                emailService.sendEmail(emailOptions).catch(err => console.error('[Async Email Error] Failed to send approval email:', err));
            }
            catch (syncError) {
                console.error('[Email Setup Error] Failed to create approval email options:', syncError);
            }
        }
        else {
            console.warn(`Could not send approval email: No email found for user ${userForNotification.id}`);
        }
    }
    else {
        console.error('[Approve Request] User data missing for notification/email.');
    }
    return {
        ...updatedProfile,
        hasPendingRequest: false
    };
};
exports.approveArtistRequest = approveArtistRequest;
const rejectArtistRequest = async (requestId) => {
    const artistProfile = await db_1.default.artistProfile.findFirst({
        where: {
            id: requestId,
            verificationRequestedAt: { not: null },
            isVerified: false,
        },
        include: {
            user: { select: prisma_selects_1.userSelect },
        },
    });
    if (!artistProfile) {
        throw new Error('Artist request not found, already verified, or rejected.');
    }
    await db_1.default.artistProfile.delete({
        where: { id: requestId },
    });
    return {
        user: artistProfile.user,
        hasPendingRequest: false,
    };
};
exports.rejectArtistRequest = rejectArtistRequest;
const deleteArtistRequest = async (requestId) => {
    const artistProfile = await db_1.default.artistProfile.findFirst({
        where: {
            id: requestId,
            verificationRequestedAt: { not: null },
        },
    });
    if (!artistProfile) {
        throw new Error('Artist request not found or not in a deletable state (e.g., approved).');
    }
    await db_1.default.artistProfile.delete({
        where: { id: requestId },
    });
    return { deletedRequestId: requestId };
};
exports.deleteArtistRequest = deleteArtistRequest;
const getDashboardStats = async () => {
    const coreStatsPromise = Promise.all([
        db_1.default.user.count({ where: { role: { not: client_1.Role.ADMIN } } }),
        db_1.default.artistProfile.count({ where: { role: client_1.Role.ARTIST, isVerified: true } }),
        db_1.default.artistProfile.count({ where: { verificationRequestedAt: { not: null }, isVerified: false } }),
        db_1.default.artistProfile.findMany({
            where: { role: client_1.Role.ARTIST, isVerified: true },
            orderBy: [{ monthlyListeners: 'desc' }],
            take: 4,
            select: { id: true, artistName: true, avatar: true, monthlyListeners: true },
        }),
        db_1.default.genre.count(),
        db_1.default.label.count(),
        db_1.default.album.count({ where: { isActive: true } }),
        db_1.default.track.count({ where: { isActive: true } }),
        db_1.default.playlist.count({ where: { type: client_2.PlaylistType.SYSTEM, userId: null } }),
    ]);
    const monthlyUserDataPromise = (async () => {
        const monthlyData = [];
        const allMonths = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
        ];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const monthDate = (0, date_fns_1.subMonths)(now, i);
            const endOfMonthDate = (0, date_fns_1.endOfMonth)(monthDate);
            const monthLabel = allMonths[monthDate.getMonth()];
            const userCount = await db_1.default.user.count({
                where: {
                    createdAt: { lte: endOfMonthDate },
                },
            });
            monthlyData.push({ month: monthLabel, users: userCount });
        }
        return monthlyData;
    })();
    const [coreStats, monthlyUserData] = await Promise.all([
        coreStatsPromise,
        monthlyUserDataPromise,
    ]);
    const [totalUsers, totalArtists, totalArtistRequests, topArtists, totalGenres, totalLabels, totalAlbums, totalTracks, totalSystemPlaylists,] = coreStats;
    return {
        totalUsers,
        totalArtists,
        totalArtistRequests,
        totalGenres,
        totalLabels,
        totalAlbums,
        totalTracks,
        totalSystemPlaylists,
        topArtists: topArtists.map((artist) => ({
            id: artist.id,
            artistName: artist.artistName,
            avatar: artist.avatar,
            monthlyListeners: artist.monthlyListeners,
        })),
        monthlyUserData,
        updatedAt: new Date().toISOString(),
    };
};
exports.getDashboardStats = getDashboardStats;
const getSystemStatus = async () => {
    const statuses = [];
    try {
        await db_1.default.$queryRaw `SELECT 1`;
        statuses.push({ name: 'Database (PostgreSQL)', status: 'Available' });
    }
    catch (error) {
        console.error('[System Status] Database check failed:', error);
        statuses.push({
            name: 'Database (PostgreSQL)',
            status: 'Outage',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
    const useRedis = process.env.USE_REDIS_CACHE === 'true';
    if (useRedis) {
        if (cache_middleware_1.client && typeof cache_middleware_1.client.ping === 'function') {
            try {
                if (!cache_middleware_1.client.isOpen) {
                    statuses.push({ name: 'Cache (Redis)', status: 'Outage', message: 'Client not connected' });
                }
                else {
                    await cache_middleware_1.client.ping();
                    statuses.push({ name: 'Cache (Redis)', status: 'Available' });
                }
            }
            catch (error) {
                console.error('[System Status] Redis ping failed:', error);
                statuses.push({
                    name: 'Cache (Redis)',
                    status: 'Issue',
                    message: error instanceof Error ? error.message : 'Ping failed',
                });
            }
        }
        else {
            console.warn('[System Status] Redis client seems uninitialized or mock.');
            statuses.push({
                name: 'Cache (Redis)',
                status: 'Issue',
                message: 'Redis client not properly initialized or is a mock.',
            });
        }
    }
    else {
        statuses.push({ name: 'Cache (Redis)', status: 'Disabled', message: 'USE_REDIS_CACHE is false' });
    }
    try {
        const cloudinary = (await Promise.resolve().then(() => __importStar(require('cloudinary')))).v2;
        const pingResult = await cloudinary.api.ping();
        if (pingResult?.status === 'ok') {
            statuses.push({ name: 'Cloudinary (Media Storage)', status: 'Available' });
        }
        else {
            statuses.push({ name: 'Cloudinary (Media Storage)', status: 'Issue', message: `Ping failed or unexpected status: ${pingResult?.status}` });
        }
    }
    catch (error) {
        console.error('[System Status] Cloudinary check failed:', error);
        statuses.push({
            name: 'Cloudinary (Media Storage)',
            status: 'Outage',
            message: error instanceof Error ? error.message : 'Connection or Auth failed',
        });
    }
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
        try {
            const { GoogleGenerativeAI } = await Promise.resolve().then(() => __importStar(require('@google/generative-ai')));
            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
            const model = genAI.getGenerativeModel({ model: modelName });
            await model.countTokens("test");
            statuses.push({ name: 'Gemini AI (Playlists)', status: 'Available', message: `API Key valid. Configured model: ${modelName}` });
        }
        catch (error) {
            console.error('[System Status] Gemini AI check failed:', error);
            statuses.push({
                name: 'Gemini AI (Playlists)',
                status: 'Issue',
                message: error.message || 'Failed to initialize or connect to Gemini',
            });
        }
    }
    else {
        statuses.push({ name: 'Gemini AI (Playlists)', status: 'Disabled', message: 'GEMINI_API_KEY not set' });
    }
    if (email_service_1.transporter) {
        try {
            const verified = await email_service_1.transporter.verify();
            if (verified) {
                statuses.push({ name: 'Email (Nodemailer)', status: 'Available' });
            }
            else {
                statuses.push({ name: 'Email (Nodemailer)', status: 'Issue', message: 'Verification returned false' });
            }
        }
        catch (error) {
            console.error('[System Status] Nodemailer verification failed:', error);
            statuses.push({
                name: 'Email (Nodemailer)',
                status: 'Outage',
                message: error.message || 'Verification failed',
            });
        }
    }
    else {
        statuses.push({
            name: 'Email (Nodemailer)',
            status: 'Disabled',
            message: 'SMTP configuration incomplete or transporter not initialized',
        });
    }
    return statuses;
};
exports.getSystemStatus = getSystemStatus;
const getCacheStatus = async () => {
    const useCache = process.env.USE_REDIS_CACHE === 'true';
    let redisConnected = false;
    if (cache_middleware_1.client && cache_middleware_1.client.isOpen) {
        try {
            await cache_middleware_1.client.ping();
            redisConnected = true;
        }
        catch (error) {
            console.error("Redis ping failed:", error);
            redisConnected = false;
        }
    }
    return { enabled: useCache && redisConnected };
};
exports.getCacheStatus = getCacheStatus;
const getAIModelStatus = async () => {
    const currentModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    return {
        model: currentModel,
        validModels: VALID_GEMINI_MODELS,
    };
};
exports.getAIModelStatus = getAIModelStatus;
const updateCacheStatus = async (enabled) => {
    try {
        const envPath = process.env.NODE_ENV === 'production'
            ? path.resolve(process.cwd(), '../.env')
            : path.resolve(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) {
            console.error(`.env file not found at ${envPath}`);
            throw new Error('Environment file not found.');
        }
        const currentStatus = process.env.USE_REDIS_CACHE === 'true';
        if (enabled === undefined) {
            return { enabled: currentStatus };
        }
        if (enabled === currentStatus) {
            console.log(`[Redis] Cache status already ${enabled ? 'enabled' : 'disabled'}. No change needed.`);
            return { enabled };
        }
        let envContent = fs.readFileSync(envPath, 'utf8');
        const regex = /USE_REDIS_CACHE=.*/;
        const newLine = `USE_REDIS_CACHE=${enabled}`;
        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, newLine);
        }
        else {
            envContent += `
${newLine}`;
        }
        fs.writeFileSync(envPath, envContent);
        process.env.USE_REDIS_CACHE = String(enabled);
        console.log(`[Redis] Cache ${enabled ? 'enabled' : 'disabled'}. Restart might be required for full effect.`);
        const { client: dynamicRedisClient } = require('../middleware/cache.middleware');
        if (enabled && dynamicRedisClient && !dynamicRedisClient.isOpen) {
            try {
                await dynamicRedisClient.connect();
                console.log('[Redis] Connected successfully.');
            }
            catch (connectError) {
                console.error('[Redis] Failed to connect after enabling:', connectError);
            }
        }
        else if (!enabled && dynamicRedisClient && dynamicRedisClient.isOpen) {
            try {
                await dynamicRedisClient.disconnect();
                console.log('[Redis] Disconnected successfully.');
            }
            catch (disconnectError) {
                console.error('[Redis] Failed to disconnect after disabling:', disconnectError);
            }
        }
        return { enabled };
    }
    catch (error) {
        console.error('Error updating cache status:', error);
        const currentStatusAfterError = process.env.USE_REDIS_CACHE === 'true';
        throw new Error(`Failed to update cache status. Current status: ${currentStatusAfterError}`);
    }
};
exports.updateCacheStatus = updateCacheStatus;
const updateAIModel = async (model) => {
    try {
        const validModels = [
            'gemini-2.5-flash-preview-04-17',
            'gemini-2.5-pro-preview-03-25',
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-1.5-flash',
            'gemini-1.5-flash-8b',
            'gemini-1.5-pro',
        ];
        const currentModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const isEnabled = !!process.env.GEMINI_API_KEY;
        if (model === undefined) {
            return {
                success: true,
                message: 'Current AI model settings retrieved',
                data: {
                    model: currentModel,
                    enabled: isEnabled,
                    validModels,
                },
            };
        }
        if (!validModels.includes(model)) {
            throw new Error(`Invalid model name. Valid models are: ${validModels.join(', ')}`);
        }
        const envPath = process.env.NODE_ENV === 'production'
            ? path.resolve(process.cwd(), '../.env')
            : path.resolve(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) {
            throw new Error(`.env file not found at ${envPath}`);
        }
        let envContent = fs.readFileSync(envPath, 'utf8');
        const regex = /GEMINI_MODEL=.*/;
        const newLine = `GEMINI_MODEL=${model}`;
        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, newLine);
        }
        else {
            envContent += `
${newLine}`;
        }
        fs.writeFileSync(envPath, envContent);
        process.env.GEMINI_MODEL = model;
        console.log(`[Admin] AI model changed to: ${model}`);
        return {
            success: true,
            message: `AI model settings updated to ${model}`,
            data: {
                model,
                enabled: isEnabled,
                validModels,
            },
        };
    }
    catch (error) {
        console.error('[Admin] Error updating AI model:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to update AI model',
            error: true,
        };
    }
};
exports.updateAIModel = updateAIModel;
//# sourceMappingURL=admin.service.js.map