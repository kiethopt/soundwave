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
exports.updateCacheStatus = exports.getSystemStats = exports.rejectArtistRequest = exports.approveArtistRequest = exports.deleteGenreById = exports.updateGenreInfo = exports.createNewGenre = exports.getGenres = exports.getArtistById = exports.getArtists = exports.deleteArtistById = exports.deleteUserById = exports.updateArtistInfo = exports.updateUserInfo = exports.getArtistRequestDetail = exports.getArtistRequests = exports.getUserById = exports.getUsers = void 0;
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const upload_service_1 = require("./upload.service");
const handle_utils_1 = require("../utils/handle-utils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
//# sourceMappingURL=admin.service.js.map