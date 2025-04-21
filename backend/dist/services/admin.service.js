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
exports.updateMaintenanceMode = exports.updateAIModel = exports.updateCacheStatus = exports.getSystemStatus = exports.getDashboardStats = exports.deleteArtistRequest = exports.rejectArtistRequest = exports.approveArtistRequest = exports.deleteGenreById = exports.updateGenreInfo = exports.createNewGenre = exports.getGenres = exports.getArtistById = exports.getArtists = exports.deleteArtistById = exports.deleteUserById = exports.updateArtistInfo = exports.updateUserInfo = exports.getArtistRequestDetail = exports.getArtistRequests = exports.getUserById = exports.getUsers = void 0;
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const upload_service_1 = require("./upload.service");
const handle_utils_1 = require("../utils/handle-utils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cache_middleware_1 = require("../middleware/cache.middleware");
const email_service_1 = require("./email.service");
const bcrypt_1 = __importDefault(require("bcrypt"));
const getUsers = async (req, requestingUser) => {
    const { search = '', status, role } = req.query;
    const where = {
        ...(requestingUser.adminLevel !== 1
            ? { role: client_1.Role.USER }
            : role && typeof role === 'string' && Object.values(client_1.Role).includes(role.toUpperCase())
                ? { role: role.toUpperCase() }
                : {}),
        ...(search
            ? {
                OR: [
                    { email: { contains: String(search), mode: 'insensitive' } },
                    { username: { contains: String(search), mode: 'insensitive' } },
                    { name: { contains: String(search), mode: 'insensitive' } },
                ],
            }
            : {}),
        ...(status !== undefined ? { isActive: (0, handle_utils_1.toBooleanValue)(status) } : {}),
    };
    const options = {
        where,
        select: prisma_selects_1.userSelect,
        orderBy: { createdAt: 'desc' },
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
    const { search, status, startDate, endDate } = req.query;
    const where = {
        verificationRequestedAt: { not: null },
        user: {
            isActive: true,
        },
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
    const isVerifiedFilter = (0, handle_utils_1.toBooleanValue)(status);
    if (isVerifiedFilter !== undefined && Array.isArray(where.AND)) {
        where.AND.push({ isVerified: isVerifiedFilter });
    }
    const dateFilter = {};
    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;
    if (parsedStartDate && !isNaN(parsedStartDate.getTime())) {
        if (parsedEndDate && !isNaN(parsedEndDate.getTime())) {
            const endOfDay = new Date(parsedEndDate);
            endOfDay.setHours(23, 59, 59, 999);
            dateFilter.verificationRequestedAt = {
                gte: parsedStartDate,
                lte: endOfDay,
            };
        }
        else {
            dateFilter.verificationRequestedAt = { gte: parsedStartDate };
        }
        if (Array.isArray(where.AND)) {
            where.AND.push(dateFilter);
        }
    }
    const paginationResult = await (0, handle_utils_1.paginate)(db_1.default.artistProfile, req, {
        where,
        select: prisma_selects_1.artistRequestSelect,
        orderBy: { verificationRequestedAt: 'desc' },
    });
    return {
        requests: paginationResult.data,
        pagination: paginationResult.pagination,
    };
};
exports.getArtistRequests = getArtistRequests;
const getArtistRequestDetail = async (id) => {
    const request = await db_1.default.artistProfile.findUnique({
        where: { id },
        select: prisma_selects_1.artistRequestDetailsSelect,
    });
    if (!request) {
        throw new Error('Request not found');
    }
    return request;
};
exports.getArtistRequestDetail = getArtistRequestDetail;
const updateUserInfo = async (id, data, avatarFile) => {
    const targetUser = await db_1.default.user.findUnique({
        where: { id },
        select: { id: true, email: true, username: true, password: true, avatar: true, role: true, adminLevel: true }
    });
    if (!targetUser) {
        throw new Error('User not found');
    }
    const { name, email, username, isActive, password, role, adminLevel } = data;
    const updateData = {};
    if (role && Object.values(client_1.Role).includes(role)) {
        updateData.role = role;
    }
    if (adminLevel !== undefined && adminLevel !== null && !isNaN(Number(adminLevel))) {
        if (updateData.role === client_1.Role.ADMIN || (targetUser.role === client_1.Role.ADMIN && !updateData.role)) {
            updateData.adminLevel = Number(adminLevel);
        }
        else if (role === client_1.Role.ADMIN) {
            updateData.adminLevel = Number(adminLevel);
        }
        else {
            updateData.adminLevel = null;
        }
    }
    else if (updateData.role && updateData.role !== client_1.Role.ADMIN) {
        updateData.adminLevel = null;
    }
    if (name !== undefined)
        updateData.name = name;
    if (email !== undefined && email !== targetUser.email) {
        const existingEmail = await db_1.default.user.findFirst({ where: { email, NOT: { id } } });
        if (existingEmail)
            throw new Error('Email already exists');
        updateData.email = email;
    }
    if (username !== undefined && username !== targetUser.username) {
        const existingUsername = await db_1.default.user.findFirst({ where: { username, NOT: { id } } });
        if (existingUsername)
            throw new Error('Username already exists');
        updateData.username = username;
    }
    if (isActive !== undefined) {
        updateData.isActive = (0, handle_utils_1.toBooleanValue)(isActive);
    }
    if (password) {
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long.');
        }
        updateData.password = await bcrypt_1.default.hash(password, 10);
    }
    if (avatarFile) {
        const uploadResult = await (0, upload_service_1.uploadFile)(avatarFile.buffer, 'users/avatars');
        updateData.avatar = uploadResult.secure_url;
    }
    else if (data.avatar === null && targetUser.avatar) {
        updateData.avatar = null;
    }
    if (Object.keys(updateData).length === 0 && !avatarFile && !(data.avatar === null && targetUser.avatar)) {
        throw new Error("No valid data provided for update.");
    }
    const updatedUser = await db_1.default.user.update({
        where: { id },
        data: updateData,
        select: prisma_selects_1.userSelect,
    });
    return updatedUser;
};
exports.updateUserInfo = updateUserInfo;
const updateArtistInfo = async (id, data, avatarFile) => {
    const existingArtist = await db_1.default.artistProfile.findUnique({
        where: { id },
        select: {
            id: true,
            artistName: true,
            isActive: true,
            isVerified: true,
            socialMediaLinks: true,
            userId: true,
            user: { select: { email: true, name: true, username: true } }
        }
    });
    if (!existingArtist) {
        throw new Error('Artist not found');
    }
    const { artistName, bio, isActive, isVerified, socialMediaLinks } = data;
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
    let avatarUrl = undefined;
    if (avatarFile) {
        const result = await (0, upload_service_1.uploadFile)(avatarFile.buffer, 'artists/avatars', 'image');
        avatarUrl = result.secure_url;
    }
    let socialMediaLinksUpdate = existingArtist.socialMediaLinks;
    if (socialMediaLinks !== undefined) {
        try {
            if (socialMediaLinks === '' || socialMediaLinks === null) {
                socialMediaLinksUpdate = null;
            }
            else {
                const parsedLinks = typeof socialMediaLinks === 'string' ? JSON.parse(socialMediaLinks) : socialMediaLinks;
                if (typeof parsedLinks === 'object' && parsedLinks !== null) {
                    socialMediaLinksUpdate = parsedLinks;
                }
                else {
                    console.warn('Invalid socialMediaLinks format received:', socialMediaLinks);
                }
            }
        }
        catch (error) {
            console.error('Error processing socialMediaLinks JSON:', error);
        }
    }
    const updatedArtist = await db_1.default.artistProfile.update({
        where: { id },
        data: {
            ...(validatedArtistName && { artistName: validatedArtistName }),
            ...(bio !== undefined && { bio }),
            ...(isActive !== undefined && { isActive: (0, handle_utils_1.toBooleanValue)(isActive) }),
            ...(isVerified !== undefined && {
                isVerified: (0, handle_utils_1.toBooleanValue)(isVerified),
                verifiedAt: (0, handle_utils_1.toBooleanValue)(isVerified) ? new Date() : null,
            }),
            ...(avatarUrl && { avatar: avatarUrl }),
            ...(socialMediaLinks !== undefined && { socialMediaLinks: socialMediaLinksUpdate }),
        },
        select: prisma_selects_1.artistProfileSelect,
    });
    return updatedArtist;
};
exports.updateArtistInfo = updateArtistInfo;
const deleteUserById = async (id, requestingUser) => {
    const userToDelete = await db_1.default.user.findUnique({
        where: { id },
        select: { role: true, adminLevel: true },
    });
    if (!userToDelete) {
        console.log(`User with ID ${id} not found for deletion.`);
        return { message: `User ${id} not found.` };
    }
    if (userToDelete.role === client_1.Role.ADMIN && userToDelete.adminLevel === 1) {
        throw new Error('Permission denied: Level 1 Admins cannot be deleted.');
    }
    if (userToDelete.role === client_1.Role.ADMIN && (!requestingUser || requestingUser.role !== client_1.Role.ADMIN || requestingUser.adminLevel !== 1)) {
        throw new Error('Permission denied: Only Level 1 Admins can delete other Admins.');
    }
    await db_1.default.user.delete({ where: { id } });
    return { message: `User ${id} deleted successfully.` };
};
exports.deleteUserById = deleteUserById;
const deleteArtistById = async (id) => {
    return db_1.default.artistProfile.delete({ where: { id } });
};
exports.deleteArtistById = deleteArtistById;
const getArtists = async (req) => {
    const { search = '', status, isVerified } = req.query;
    const where = {
        role: client_1.Role.ARTIST,
        verificationRequestedAt: null,
        ...(isVerified !== undefined && { isVerified: isVerified === 'true' }),
        ...(search
            ? {
                OR: [
                    { artistName: { contains: String(search), mode: 'insensitive' } },
                    {
                        user: {
                            email: { contains: String(search), mode: 'insensitive' },
                        },
                    },
                    {
                        user: {
                            name: { contains: String(search), mode: 'insensitive' },
                        },
                    },
                ],
            }
            : {}),
        ...(status !== undefined ? { isActive: status === 'true' } : {}),
    };
    const options = {
        where,
        select: prisma_selects_1.artistProfileSelect,
        orderBy: { createdAt: 'desc' },
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
        include: {
            user: { select: { id: true, email: true, name: true, username: true } }
        }
    });
    if (!artistProfile) {
        throw new Error('Artist request not found, already verified, or rejected.');
    }
    const updatedProfile = await db_1.default.$transaction(async (tx) => {
        const profile = await tx.artistProfile.update({
            where: { id: requestId },
            data: {
                role: client_1.Role.ARTIST,
                isVerified: true,
                verifiedAt: new Date(),
                verificationRequestedAt: null,
            },
            include: { user: { select: prisma_selects_1.userSelect } }
        });
        await tx.user.update({
            where: { id: profile.userId },
            data: { role: client_1.Role.ARTIST }
        });
        return profile;
    });
    return updatedProfile;
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
    const stats = await Promise.all([
        db_1.default.user.count({ where: { role: { not: client_1.Role.ADMIN } } }),
        db_1.default.artistProfile.count({
            where: {
                role: client_1.Role.ARTIST,
                isVerified: true,
            },
        }),
        db_1.default.artistProfile.count({
            where: {
                verificationRequestedAt: { not: null },
                isVerified: false,
            },
        }),
        db_1.default.artistProfile.findMany({
            where: {
                role: client_1.Role.ARTIST,
                isVerified: true,
            },
            orderBy: [{ monthlyListeners: 'desc' }],
            take: 4,
            select: {
                id: true,
                artistName: true,
                avatar: true,
                monthlyListeners: true,
            },
        }),
        db_1.default.genre.count(),
    ]);
    const [totalUsers, totalArtists, totalArtistRequests, topArtists, totalGenres,] = stats;
    return {
        totalUsers,
        totalArtists,
        totalArtistRequests,
        totalGenres,
        topArtists: topArtists.map((artist) => ({
            id: artist.id,
            artistName: artist.artistName,
            avatar: artist.avatar,
            monthlyListeners: artist.monthlyListeners,
        })),
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
            'gemini-2.5-pro-exp-03-25',
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
const updateMaintenanceMode = async (enabled) => {
    try {
        const envPath = process.env.NODE_ENV === 'production'
            ? path.resolve(process.cwd(), '../.env')
            : path.resolve(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) {
            throw new Error(`.env file not found at ${envPath}`);
        }
        const currentStatus = process.env.MAINTENANCE_MODE === 'true';
        if (enabled === undefined) {
            return { enabled: currentStatus };
        }
        if (enabled === currentStatus) {
            console.log(`[System] Maintenance mode already ${enabled ? 'enabled' : 'disabled'}.`);
            return { enabled };
        }
        let envContent = fs.readFileSync(envPath, 'utf8');
        const regex = /MAINTENANCE_MODE=.*/;
        const newLine = `MAINTENANCE_MODE=${enabled}`;
        if (envContent.match(regex)) {
            envContent = envContent.replace(regex, newLine);
        }
        else {
            envContent += `
${newLine}`;
        }
        fs.writeFileSync(envPath, envContent);
        process.env.MAINTENANCE_MODE = String(enabled);
        console.log(`[System] Maintenance mode ${enabled ? 'enabled' : 'disabled'}.`);
        return { enabled };
    }
    catch (error) {
        console.error('Error updating maintenance mode:', error);
        const currentStatusAfterError = process.env.MAINTENANCE_MODE === 'true';
        throw new Error(`Failed to update maintenance mode. Current status: ${currentStatusAfterError}`);
    }
};
exports.updateMaintenanceMode = updateMaintenanceMode;
//# sourceMappingURL=admin.service.js.map