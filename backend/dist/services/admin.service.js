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
const getUsers = async (req) => {
    const { search = '', status } = req.query;
    const where = {
        role: 'USER',
        ...(search
            ? {
                OR: [
                    { email: { contains: String(search), mode: 'insensitive' } },
                    { username: { contains: String(search), mode: 'insensitive' } },
                    { name: { contains: String(search), mode: 'insensitive' } },
                ],
            }
            : {}),
        ...(status !== undefined ? { isActive: status === 'true' } : {}),
    };
    const options = {
        where,
        include: {
            artistProfile: true,
        },
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
    const { startDate, endDate, status, search } = req.query;
    const where = {
        verificationRequestedAt: { not: null },
        ...(status === 'pending' ? { isVerified: false } : {}),
        ...(startDate && endDate
            ? {
                verificationRequestedAt: {
                    gte: new Date(String(startDate)),
                    lte: new Date(String(endDate)),
                },
            }
            : {}),
        ...(search
            ? {
                OR: [
                    { artistName: { contains: String(search), mode: 'insensitive' } },
                    {
                        user: {
                            email: { contains: String(search), mode: 'insensitive' },
                        },
                    },
                ],
            }
            : {}),
    };
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
    const currentUser = await db_1.default.user.findUnique({
        where: { id },
        select: { ...prisma_selects_1.userSelect, password: true },
    });
    if (!currentUser) {
        throw new Error('User not found');
    }
    const { name, email, username, isActive, role, password, currentPassword } = data;
    let passwordHash;
    if (password) {
        const bcrypt = require('bcrypt');
        if (currentPassword) {
            const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);
            if (!isPasswordValid) {
                throw new Error('Current password is incorrect');
            }
            passwordHash = await bcrypt.hash(password, 10);
        }
    }
    if (email && email !== currentUser.email) {
        const existingEmail = await db_1.default.user.findFirst({
            where: { email, NOT: { id } },
        });
        if (existingEmail) {
            throw new Error('Email already exists');
        }
    }
    if (username && username !== currentUser.username) {
        const existingUsername = await db_1.default.user.findFirst({
            where: { username, NOT: { id } },
        });
        if (existingUsername) {
            throw new Error('Username already exists');
        }
    }
    let avatarUrl = currentUser.avatar;
    if (avatarFile) {
        const uploadResult = await (0, upload_service_1.uploadFile)(avatarFile.buffer, 'users/avatars');
        avatarUrl = uploadResult.secure_url;
    }
    const isActiveBool = isActive !== undefined ? (0, handle_utils_1.toBooleanValue)(isActive) : undefined;
    const updatedUser = await db_1.default.user.update({
        where: { id },
        data: {
            ...(name !== undefined && { name }),
            ...(email !== undefined && { email }),
            ...(username !== undefined && { username }),
            ...(avatarUrl !== currentUser.avatar && { avatar: avatarUrl }),
            ...(isActiveBool !== undefined && { isActive: isActiveBool }),
            ...(role !== undefined && { role }),
            ...(passwordHash && { password: passwordHash }),
        },
        select: prisma_selects_1.userSelect,
    });
    return updatedUser;
};
exports.updateUserInfo = updateUserInfo;
const updateArtistInfo = async (id, data, avatarFile) => {
    const existingArtist = await db_1.default.artistProfile.findUnique({
        where: { id },
    });
    if (!existingArtist) {
        throw new Error('Artist not found');
    }
    const { artistName, bio, isActive } = data;
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
    const updatedArtist = await db_1.default.artistProfile.update({
        where: { id },
        data: {
            ...(validatedArtistName && { artistName: validatedArtistName }),
            ...(bio !== undefined && { bio }),
            ...(isActive !== undefined && { isActive: (0, handle_utils_1.toBooleanValue)(isActive) }),
            ...(avatarUrl && { avatar: avatarUrl }),
        },
        select: prisma_selects_1.artistProfileSelect,
    });
    return updatedArtist;
};
exports.updateArtistInfo = updateArtistInfo;
const deleteUserById = async (id) => {
    return db_1.default.user.delete({ where: { id } });
};
exports.deleteUserById = deleteUserById;
const deleteArtistById = async (id) => {
    return db_1.default.artistProfile.delete({ where: { id } });
};
exports.deleteArtistById = deleteArtistById;
const getArtists = async (req) => {
    const { search = '', status } = req.query;
    const where = {
        role: client_1.Role.ARTIST,
        isVerified: true,
        ...(search
            ? {
                OR: [
                    { artistName: { contains: String(search), mode: 'insensitive' } },
                    {
                        user: {
                            email: { contains: String(search), mode: 'insensitive' },
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
        where: { name },
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
    if (name !== existingGenre.name) {
        const existingGenreWithName = await db_1.default.genre.findFirst({
            where: { name, NOT: { id } },
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
    });
    if (!artistProfile) {
        throw new Error('Artist request not found or already verified');
    }
    return db_1.default.artistProfile.update({
        where: { id: requestId },
        data: {
            role: client_1.Role.ARTIST,
            isVerified: true,
            verifiedAt: new Date(),
            verificationRequestedAt: null,
        },
        include: {
            user: { select: prisma_selects_1.userSelect },
        },
    });
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
        throw new Error('Artist request not found or already verified');
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
            isVerified: false,
        },
    });
    if (!artistProfile) {
        throw new Error('Artist request not found or already verified/rejected');
    }
    await db_1.default.artistProfile.delete({
        where: { id: requestId },
    });
    return { deletedRequestId: requestId };
};
exports.deleteArtistRequest = deleteArtistRequest;
const getDashboardStats = async () => {
    const stats = await Promise.all([
        db_1.default.user.count({ where: { role: client_1.Role.USER } }),
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
        if (typeof cache_middleware_1.client.ping !== 'function') {
            console.warn('[System Status] Redis check inconsistent: Cache enabled but using mock client (restart required).');
            statuses.push({
                name: 'Cache (Redis)',
                status: 'Issue',
                message: 'Inconsistent config: Cache enabled, but mock client active (restart needed).',
            });
        }
        else {
            if (!cache_middleware_1.client.isOpen) {
                statuses.push({ name: 'Cache (Redis)', status: 'Outage', message: 'Client not connected' });
            }
            else {
                try {
                    await cache_middleware_1.client.ping();
                    statuses.push({ name: 'Cache (Redis)', status: 'Available' });
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
            statuses.push({ name: 'Cloudinary (Media Storage)', status: 'Issue', message: 'Ping failed or unexpected status' });
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
            await model.countTokens("");
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
            await email_service_1.transporter.verify();
            statuses.push({ name: 'Email (Nodemailer)', status: 'Available' });
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
            message: 'SMTP configuration incomplete or verification failed',
        });
    }
    return statuses;
};
exports.getSystemStatus = getSystemStatus;
const updateCacheStatus = async (enabled) => {
    try {
        const envPath = path.resolve(__dirname, '../../.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        if (enabled === undefined) {
            const currentStatus = process.env.USE_REDIS_CACHE === 'true';
            return { enabled: currentStatus };
        }
        const updatedContent = envContent.replace(/USE_REDIS_CACHE=.*/, `USE_REDIS_CACHE=${enabled}`);
        fs.writeFileSync(envPath, updatedContent);
        const previousStatus = process.env.USE_REDIS_CACHE === 'true';
        process.env.USE_REDIS_CACHE = String(enabled);
        console.log(`[Redis] Cache ${enabled ? 'enabled' : 'disabled'}`);
        const { client } = require('../middleware/cache.middleware');
        if (enabled && !previousStatus && !client.isOpen) {
            await client.connect();
        }
        else if (!enabled && previousStatus && client.isOpen) {
            await client.disconnect();
        }
        return { enabled };
    }
    catch (error) {
        console.error('Error updating cache status', error);
        throw new Error('Failed to update cache status');
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
        if (!model) {
            return {
                success: true,
                message: 'Current AI model settings retrieved',
                data: {
                    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
                    enabled: !!process.env.GEMINI_API_KEY,
                    validModels,
                },
            };
        }
        if (!validModels.includes(model)) {
            throw new Error(`Invalid model name. Valid models are: ${validModels.join(', ')}`);
        }
        let envPath;
        if (process.env.NODE_ENV === 'development') {
            envPath = path.join(process.cwd(), '.env');
        }
        else {
            envPath = path.join(process.cwd(), '..', '.env');
        }
        if (!fs.existsSync(envPath)) {
            throw new Error(`.env file not found at ${envPath}`);
        }
        let envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('GEMINI_MODEL=')) {
            envContent = envContent.replace(/GEMINI_MODEL=.*/, `GEMINI_MODEL=${model}`);
        }
        else {
            envContent += `\nGEMINI_MODEL=${model}`;
        }
        fs.writeFileSync(envPath, envContent);
        process.env.GEMINI_MODEL = model;
        console.log(`[Admin] AI model changed to: ${model}`);
        return {
            success: true,
            message: `AI model settings updated to ${model}`,
            data: {
                model,
                enabled: true,
                validModels,
            },
        };
    }
    catch (error) {
        console.error('[Admin] Error updating AI model:', error);
        throw error;
    }
};
exports.updateAIModel = updateAIModel;
const updateMaintenanceMode = async (enabled) => {
    try {
        const envPath = path.resolve(__dirname, '../../.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        if (enabled === undefined) {
            const currentStatus = process.env.MAINTENANCE_MODE === 'true';
            return { enabled: currentStatus };
        }
        if (envContent.includes('MAINTENANCE_MODE=')) {
            const updatedContent = envContent.replace(/MAINTENANCE_MODE=.*/, `MAINTENANCE_MODE=${enabled}`);
            fs.writeFileSync(envPath, updatedContent);
        }
        else {
            fs.writeFileSync(envPath, `${envContent}\nMAINTENANCE_MODE=${enabled}`);
        }
        process.env.MAINTENANCE_MODE = String(enabled);
        console.log(`[System] Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
        return { enabled };
    }
    catch (error) {
        console.error('Error updating maintenance mode', error);
        throw new Error('Failed to update maintenance mode');
    }
};
exports.updateMaintenanceMode = updateMaintenanceMode;
//# sourceMappingURL=admin.service.js.map