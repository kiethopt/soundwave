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
exports.updateMaintenanceMode = exports.getRecommendationMatrix = exports.updateAIModel = exports.updateCacheStatus = exports.getSystemStats = exports.rejectArtistRequest = exports.approveArtistRequest = exports.deleteGenreById = exports.updateGenreInfo = exports.createNewGenre = exports.getGenres = exports.getArtistById = exports.getArtists = exports.deleteArtistById = exports.deleteUserById = exports.updateArtistInfo = exports.updateUserInfo = exports.getArtistRequestDetail = exports.getArtistRequests = exports.getUserById = exports.getUsers = void 0;
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const upload_service_1 = require("./upload.service");
const handle_utils_1 = require("../utils/handle-utils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ml_matrix_1 = __importDefault(require("ml-matrix"));
const getUsers = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { search = '', status } = req.query;
    const where = Object.assign(Object.assign({ role: 'USER' }, (search
        ? {
            OR: [
                { email: { contains: String(search), mode: 'insensitive' } },
                { username: { contains: String(search), mode: 'insensitive' } },
                { name: { contains: String(search), mode: 'insensitive' } },
            ],
        }
        : {})), (status !== undefined ? { isActive: status === 'true' } : {}));
    const options = {
        where,
        include: {
            artistProfile: true,
        },
        orderBy: { createdAt: 'desc' },
    };
    const result = yield (0, handle_utils_1.paginate)(db_1.default.user, req, options);
    return {
        users: result.data,
        pagination: result.pagination,
    };
});
exports.getUsers = getUsers;
const getUserById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield db_1.default.user.findUnique({
        where: { id },
        select: prisma_selects_1.userSelect,
    });
    if (!user) {
        throw new Error('User not found');
    }
    return user;
});
exports.getUserById = getUserById;
const getArtistRequests = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { startDate, endDate, status, search } = req.query;
    const where = Object.assign(Object.assign(Object.assign({ verificationRequestedAt: { not: null } }, (status === 'pending' ? { isVerified: false } : {})), (startDate && endDate
        ? {
            verificationRequestedAt: {
                gte: new Date(String(startDate)),
                lte: new Date(String(endDate)),
            },
        }
        : {})), (search
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
        : {}));
    const options = {
        where,
        select: prisma_selects_1.artistRequestSelect,
        orderBy: { verificationRequestedAt: 'desc' },
    };
    const result = yield (0, handle_utils_1.paginate)(db_1.default.artistProfile, req, options);
    return {
        requests: result.data,
        pagination: result.pagination,
    };
});
exports.getArtistRequests = getArtistRequests;
const getArtistRequestDetail = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const request = yield db_1.default.artistProfile.findUnique({
        where: { id },
        select: prisma_selects_1.artistRequestDetailsSelect,
    });
    if (!request) {
        throw new Error('Request not found');
    }
    return request;
});
exports.getArtistRequestDetail = getArtistRequestDetail;
const updateUserInfo = (id, data, avatarFile) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUser = yield db_1.default.user.findUnique({
        where: { id },
        select: Object.assign(Object.assign({}, prisma_selects_1.userSelect), { password: true }),
    });
    if (!currentUser) {
        throw new Error('User not found');
    }
    const { name, email, username, isActive, role, password, currentPassword } = data;
    let passwordHash;
    if (password) {
        const bcrypt = require('bcrypt');
        if (currentPassword) {
            const isPasswordValid = yield bcrypt.compare(currentPassword, currentUser.password);
            if (!isPasswordValid) {
                throw new Error('Current password is incorrect');
            }
            passwordHash = yield bcrypt.hash(password, 10);
        }
    }
    if (email && email !== currentUser.email) {
        const existingEmail = yield db_1.default.user.findFirst({
            where: { email, NOT: { id } },
        });
        if (existingEmail) {
            throw new Error('Email already exists');
        }
    }
    if (username && username !== currentUser.username) {
        const existingUsername = yield db_1.default.user.findFirst({
            where: { username, NOT: { id } },
        });
        if (existingUsername) {
            throw new Error('Username already exists');
        }
    }
    let avatarUrl = currentUser.avatar;
    if (avatarFile) {
        const uploadResult = yield (0, upload_service_1.uploadFile)(avatarFile.buffer, 'users/avatars');
        avatarUrl = uploadResult.secure_url;
    }
    const isActiveBool = isActive !== undefined ? (0, handle_utils_1.toBooleanValue)(isActive) : undefined;
    const updatedUser = yield db_1.default.user.update({
        where: { id },
        data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (name !== undefined && { name })), (email !== undefined && { email })), (username !== undefined && { username })), (avatarUrl !== currentUser.avatar && { avatar: avatarUrl })), (isActiveBool !== undefined && { isActive: isActiveBool })), (role !== undefined && { role })), (passwordHash && { password: passwordHash })),
        select: prisma_selects_1.userSelect,
    });
    return updatedUser;
});
exports.updateUserInfo = updateUserInfo;
const updateArtistInfo = (id, data, avatarFile) => __awaiter(void 0, void 0, void 0, function* () {
    const existingArtist = yield db_1.default.artistProfile.findUnique({
        where: { id },
    });
    if (!existingArtist) {
        throw new Error('Artist not found');
    }
    const { artistName, bio, isActive } = data;
    let validatedArtistName = undefined;
    if (artistName && artistName !== existingArtist.artistName) {
        const nameExists = yield db_1.default.artistProfile.findFirst({
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
        const result = yield (0, upload_service_1.uploadFile)(avatarFile.buffer, 'artists/avatars', 'image');
        avatarUrl = result.secure_url;
    }
    const updatedArtist = yield db_1.default.artistProfile.update({
        where: { id },
        data: Object.assign(Object.assign(Object.assign(Object.assign({}, (validatedArtistName && { artistName: validatedArtistName })), (bio !== undefined && { bio })), (isActive !== undefined && { isActive: (0, handle_utils_1.toBooleanValue)(isActive) })), (avatarUrl && { avatar: avatarUrl })),
        select: prisma_selects_1.artistProfileSelect,
    });
    return updatedArtist;
});
exports.updateArtistInfo = updateArtistInfo;
const deleteUserById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.user.delete({ where: { id } });
});
exports.deleteUserById = deleteUserById;
const deleteArtistById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.artistProfile.delete({ where: { id } });
});
exports.deleteArtistById = deleteArtistById;
const getArtists = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { search = '', status } = req.query;
    const where = Object.assign(Object.assign({ role: client_1.Role.ARTIST, isVerified: true }, (search
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
        : {})), (status !== undefined ? { isActive: status === 'true' } : {}));
    const options = {
        where,
        select: prisma_selects_1.artistProfileSelect,
        orderBy: { createdAt: 'desc' },
    };
    const result = yield (0, handle_utils_1.paginate)(db_1.default.artistProfile, req, options);
    return {
        artists: result.data,
        pagination: result.pagination,
    };
});
exports.getArtists = getArtists;
const getArtistById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const artist = yield db_1.default.artistProfile.findUnique({
        where: { id },
        select: Object.assign(Object.assign({}, prisma_selects_1.artistProfileSelect), { albums: {
                orderBy: { releaseDate: 'desc' },
                select: prisma_selects_1.artistProfileSelect.albums.select,
            }, tracks: {
                where: {
                    type: 'SINGLE',
                    albumId: null,
                },
                orderBy: { releaseDate: 'desc' },
                select: prisma_selects_1.artistProfileSelect.tracks.select,
            } }),
    });
    if (!artist) {
        throw new Error('Artist not found');
    }
    return artist;
});
exports.getArtistById = getArtistById;
const getGenres = (req) => __awaiter(void 0, void 0, void 0, function* () {
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
    const result = yield (0, handle_utils_1.paginate)(db_1.default.genre, req, options);
    return {
        genres: result.data,
        pagination: result.pagination,
    };
});
exports.getGenres = getGenres;
const createNewGenre = (name) => __awaiter(void 0, void 0, void 0, function* () {
    const existingGenre = yield db_1.default.genre.findFirst({
        where: { name },
    });
    if (existingGenre) {
        throw new Error('Genre name already exists');
    }
    return db_1.default.genre.create({
        data: { name },
    });
});
exports.createNewGenre = createNewGenre;
const updateGenreInfo = (id, name) => __awaiter(void 0, void 0, void 0, function* () {
    const existingGenre = yield db_1.default.genre.findUnique({
        where: { id },
    });
    if (!existingGenre) {
        throw new Error('Genre not found');
    }
    if (name !== existingGenre.name) {
        const existingGenreWithName = yield db_1.default.genre.findFirst({
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
});
exports.updateGenreInfo = updateGenreInfo;
const deleteGenreById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.genre.delete({ where: { id } });
});
exports.deleteGenreById = deleteGenreById;
const approveArtistRequest = (requestId) => __awaiter(void 0, void 0, void 0, function* () {
    const artistProfile = yield db_1.default.artistProfile.findFirst({
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
        include: { user: { select: prisma_selects_1.userSelect } },
    });
});
exports.approveArtistRequest = approveArtistRequest;
const rejectArtistRequest = (requestId) => __awaiter(void 0, void 0, void 0, function* () {
    const artistProfile = yield db_1.default.artistProfile.findFirst({
        where: {
            id: requestId,
            verificationRequestedAt: { not: null },
            isVerified: false,
        },
        include: {
            user: { select: { id: true, email: true, name: true, role: true } },
        },
    });
    if (!artistProfile) {
        throw new Error('Artist request not found or already verified');
    }
    yield db_1.default.artistProfile.delete({
        where: { id: requestId },
    });
    return {
        user: artistProfile.user,
        hasPendingRequest: false,
    };
});
exports.rejectArtistRequest = rejectArtistRequest;
const getSystemStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const stats = yield Promise.all([
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
});
exports.getSystemStats = getSystemStats;
const updateCacheStatus = (enabled) => __awaiter(void 0, void 0, void 0, function* () {
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
            yield client.connect();
        }
        else if (!enabled && previousStatus && client.isOpen) {
            yield client.disconnect();
        }
        return { enabled };
    }
    catch (error) {
        console.error('Error updating cache status', error);
        throw new Error('Failed to update cache status');
    }
});
exports.updateCacheStatus = updateCacheStatus;
const updateAIModel = (model) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const envPath = path.resolve(__dirname, '../../.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const supportedModels = [
            'gemini-2.0-flash',
            'gemini-2.0-flash-thinking-exp-01-21',
            'gemini-2.0-flash-lite',
            'gemini-2.0-pro-exp-02-05',
            'gemini-1.5-flash',
        ];
        if (model === undefined) {
            const currentModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
            return {
                model: currentModel,
                supportedModels,
            };
        }
        if (!supportedModels.includes(model)) {
            throw new Error('Unsupported AI model');
        }
        if (envContent.includes('GEMINI_MODEL=')) {
            const updatedContent = envContent.replace(/GEMINI_MODEL=.*/, `GEMINI_MODEL=${model}`);
            fs.writeFileSync(envPath, updatedContent);
        }
        else {
            fs.writeFileSync(envPath, `${envContent}\nGEMINI_MODEL=${model}`);
        }
        process.env.GEMINI_MODEL = model;
        console.log(`[AI] Model set to: ${model}`);
        return {
            model,
            supportedModels,
        };
    }
    catch (error) {
        console.error('Error updating AI model', error);
        throw new Error('Failed to update AI model');
    }
});
exports.updateAIModel = updateAIModel;
const getRecommendationMatrix = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 100) {
    try {
        const activeUsers = yield db_1.default.user.findMany({
            where: {
                history: {
                    some: {
                        type: 'PLAY',
                        playCount: { gt: 2 },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                avatar: true,
            },
            take: limit,
        });
        if (activeUsers.length < 2) {
            return {
                success: false,
                message: 'Not enough user data for matrix analysis',
                data: null,
            };
        }
        const userIds = activeUsers.map((u) => u.id);
        const popularTracks = yield db_1.default.track.findMany({
            where: {
                history: {
                    some: {
                        userId: { in: userIds },
                    },
                },
            },
            orderBy: { playCount: 'desc' },
            select: {
                id: true,
                title: true,
                artistId: true,
                artist: {
                    select: {
                        artistName: true,
                    },
                },
                playCount: true,
                coverUrl: true,
            },
            take: limit,
        });
        const trackIds = popularTracks.map((t) => t.id);
        const userHistory = yield db_1.default.history.findMany({
            where: {
                userId: { in: userIds },
                trackId: { in: trackIds },
                type: 'PLAY',
            },
            select: {
                userId: true,
                trackId: true,
                playCount: true,
            },
        });
        const userLikes = yield db_1.default.userLikeTrack.findMany({
            where: {
                userId: { in: userIds },
                trackId: { in: trackIds },
            },
            select: {
                userId: true,
                trackId: true,
            },
        });
        const userIdToIndex = new Map();
        const trackIdToIndex = new Map();
        activeUsers.forEach((user, index) => {
            userIdToIndex.set(user.id, index);
        });
        popularTracks.forEach((track, index) => {
            trackIdToIndex.set(track.id, index);
        });
        const matrix = new ml_matrix_1.default(userIds.length, trackIds.length);
        userHistory.forEach((history) => {
            const userIndex = userIdToIndex.get(history.userId);
            const trackIndex = trackIdToIndex.get(history.trackId);
            if (userIndex !== undefined && trackIndex !== undefined) {
                matrix.set(userIndex, trackIndex, history.playCount || 1);
            }
        });
        userLikes.forEach((like) => {
            const userIndex = userIdToIndex.get(like.userId);
            const trackIndex = trackIdToIndex.get(like.trackId);
            if (userIndex !== undefined && trackIndex !== undefined) {
                const currentValue = matrix.get(userIndex, trackIndex);
                matrix.set(userIndex, trackIndex, currentValue + 3);
            }
        });
        const normalizedMatrix = normalizeMatrix(matrix);
        const itemSimilarityMatrix = calculateItemSimilarity(normalizedMatrix);
        return {
            success: true,
            data: {
                users: activeUsers,
                tracks: popularTracks,
                matrix: matrix.to2DArray(),
                normalizedMatrix: normalizedMatrix.to2DArray(),
                itemSimilarityMatrix: itemSimilarityMatrix.to2DArray(),
                stats: {
                    userCount: activeUsers.length,
                    trackCount: popularTracks.length,
                    totalInteractions: userHistory.length + userLikes.length,
                    sparsity: calculateSparsity(matrix),
                },
            },
        };
    }
    catch (error) {
        console.error('Error fetching recommendation matrix:', error);
        return {
            success: false,
            message: 'Failed to retrieve recommendation matrix',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
});
exports.getRecommendationMatrix = getRecommendationMatrix;
const calculateSparsity = (matrix) => {
    const rows = matrix.rows;
    const cols = matrix.columns;
    let nonZeroCount = 0;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (matrix.get(i, j) !== 0) {
                nonZeroCount++;
            }
        }
    }
    return 1 - nonZeroCount / (rows * cols);
};
const normalizeMatrix = (matrix) => {
    const normalizedMatrix = matrix.clone();
    const rows = normalizedMatrix.rows;
    const columns = normalizedMatrix.columns;
    for (let i = 0; i < rows; i++) {
        const rowValues = normalizedMatrix.getRow(i);
        const sum = rowValues.reduce((acc, val) => acc + val, 0);
        if (sum > 0) {
            for (let j = 0; j < columns; j++) {
                const currentValue = normalizedMatrix.get(i, j);
                const normalizedValue = currentValue / sum;
                normalizedMatrix.set(i, j, normalizedValue);
            }
        }
    }
    return normalizedMatrix;
};
const calculateItemSimilarity = (matrix) => {
    const transposedMatrix = matrix.transpose();
    const itemCount = transposedMatrix.rows;
    const similarityMatrix = new ml_matrix_1.default(itemCount, itemCount);
    for (let i = 0; i < itemCount; i++) {
        for (let j = 0; j < itemCount; j++) {
            if (i === j) {
                similarityMatrix.set(i, j, 1);
            }
            else {
                const itemVectorI = transposedMatrix.getRow(i);
                const itemVectorJ = transposedMatrix.getRow(j);
                const similarity = cosineSimilarity(itemVectorI, itemVectorJ);
                similarityMatrix.set(i, j, similarity);
            }
        }
    }
    return similarityMatrix;
};
const cosineSimilarity = (vectorA, vectorB) => {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
        magnitudeA += vectorA[i] * vectorA[i];
        magnitudeB += vectorB[i] * vectorB[i];
    }
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    if (magnitudeA === 0 || magnitudeB === 0) {
        return 0;
    }
    return dotProduct / (magnitudeA * magnitudeB);
};
const updateMaintenanceMode = (enabled) => __awaiter(void 0, void 0, void 0, function* () {
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
});
exports.updateMaintenanceMode = updateMaintenanceMode;
//# sourceMappingURL=admin.service.js.map