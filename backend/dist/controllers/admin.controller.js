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
exports.getStats = exports.rejectArtistRequest = exports.approveArtistRequest = exports.deleteGenre = exports.updateGenre = exports.createGenre = exports.getAllGenres = exports.getArtistById = exports.getAllArtists = exports.deleteArtist = exports.deleteUser = exports.updateArtist = exports.updateUser = exports.getArtistRequestDetail = exports.getAllArtistRequests = exports.getUserById = exports.getAllUsers = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../middleware/cache.middleware");
const prisma_selects_1 = require("../utils/prisma-selects");
const cloudinary_service_1 = require("../services/cloudinary.service");
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search = '', status } = req.query;
        const pageNumber = Number(page);
        const limitNumber = Number(limit);
        const offset = (pageNumber - 1) * limitNumber;
        const where = Object.assign(Object.assign({ role: 'USER' }, (search
            ? {
                OR: [
                    { email: { contains: String(search), mode: 'insensitive' } },
                    { username: { contains: String(search), mode: 'insensitive' } },
                    { name: { contains: String(search), mode: 'insensitive' } },
                ],
            }
            : {})), (status !== undefined ? { isActive: status === 'true' } : {}));
        const [users, totalUsers] = yield Promise.all([
            db_1.default.user.findMany({
                where,
                skip: offset,
                take: limitNumber,
                include: {
                    artistProfile: {
                        include: {
                            genres: {
                                include: {
                                    genre: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            db_1.default.user.count({ where }),
        ]);
        res.json({
            users: users.map((user) => (Object.assign(Object.assign({}, user), { artistProfile: user.artistProfile
                    ? Object.assign(Object.assign({}, user.artistProfile), { socialMediaLinks: user.artistProfile.socialMediaLinks || {}, verifiedAt: user.artistProfile.verifiedAt }) : null }))),
            pagination: {
                total: totalUsers,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalUsers / limitNumber),
            },
        });
    }
    catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllUsers = getAllUsers;
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const cacheKey = req.originalUrl;
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = yield cache_middleware_1.client.get(cacheKey);
            if (cachedData) {
                console.log(`[Redis] Cache hit for key: ${cacheKey}`);
                res.json(JSON.parse(cachedData));
                return;
            }
            console.log(`[Redis] Cache miss for key: ${cacheKey}`);
        }
        const user = yield db_1.default.user.findUnique({
            where: { id },
            select: prisma_selects_1.userSelect,
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (process.env.USE_REDIS_CACHE === 'true') {
            console.log(`[Redis] Caching data for key: ${cacheKey}`);
            yield cache_middleware_1.client.setEx(cacheKey, 300, JSON.stringify(user));
        }
        res.json(user);
    }
    catch (error) {
        console.error('Get user by id error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getUserById = getUserById;
const getAllArtistRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, startDate, endDate, status, search, } = req.query;
        const pageNumber = Number(page);
        const limitNumber = Number(limit);
        const offset = (pageNumber - 1) * limitNumber;
        const where = Object.assign(Object.assign(Object.assign({ verificationRequestedAt: { not: null } }, (status === 'pending' ? { isVerified: false } : {})), (startDate && endDate
            ? {
                verificationRequestedAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
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
        const [requests, totalRequests] = yield Promise.all([
            db_1.default.artistProfile.findMany({
                where,
                skip: offset,
                take: limitNumber,
                select: prisma_selects_1.artistRequestSelect,
                orderBy: {
                    verificationRequestedAt: 'desc',
                },
            }),
            db_1.default.artistProfile.count({ where }),
        ]);
        res.json({
            requests,
            pagination: {
                total: totalRequests,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalRequests / limitNumber),
            },
        });
    }
    catch (error) {
        console.error('Get artist requests error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllArtistRequests = getAllArtistRequests;
const getArtistRequestDetail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const cacheKey = req.originalUrl;
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = yield cache_middleware_1.client.get(cacheKey);
            if (cachedData) {
                console.log(`[Redis] Cache hit for key: ${cacheKey}`);
                res.json(JSON.parse(cachedData));
                return;
            }
            console.log(`[Redis] Cache miss for key: ${cacheKey}`);
        }
        const request = yield db_1.default.artistProfile.findUnique({
            where: { id },
            select: prisma_selects_1.artistRequestDetailsSelect,
        });
        if (!request) {
            res.status(404).json({ message: 'Request not found' });
            return;
        }
        if (process.env.USE_REDIS_CACHE === 'true') {
            console.log(`[Redis] Caching data for key: ${cacheKey}`);
            yield cache_middleware_1.client.setEx(cacheKey, 300, JSON.stringify(request));
        }
        res.json(request);
    }
    catch (error) {
        console.error('Get artist request details error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getArtistRequestDetail = getArtistRequestDetail;
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, email, username, isActive } = req.body;
        const avatarFile = req.file;
        const validationErrors = [];
        if (!id)
            validationErrors.push('User ID is required');
        if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            validationErrors.push('Invalid email format');
        }
        if (username && username.length < 3) {
            validationErrors.push('Username must be at least 3 characters long');
        }
        if (validationErrors.length > 0) {
            res
                .status(400)
                .json({ message: 'Validation failed', errors: validationErrors });
            return;
        }
        const currentUser = yield db_1.default.user.findUnique({
            where: { id },
            select: prisma_selects_1.userSelect,
        });
        if (!currentUser) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (email && email !== currentUser.email) {
            const existingEmail = yield db_1.default.user.findFirst({
                where: { email, NOT: { id } },
            });
            if (existingEmail) {
                res.status(400).json({ message: 'Email already exists' });
                return;
            }
        }
        if (username && username !== currentUser.username) {
            const existingUsername = yield db_1.default.user.findFirst({
                where: { username, NOT: { id } },
            });
            if (existingUsername) {
                res.status(400).json({ message: 'Username already exists' });
                return;
            }
        }
        let avatarUrl = currentUser.avatar;
        if (avatarFile) {
            const uploadResult = yield (0, cloudinary_service_1.uploadFile)(avatarFile.buffer, 'users/avatars');
            avatarUrl = uploadResult.secure_url;
        }
        const isActiveBool = isActive !== undefined
            ? isActive === 'true' || isActive === true
            : undefined;
        const updatedUser = yield db_1.default.user.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (name && { name })), (email && { email })), (username && { username })), (avatarUrl &&
                avatarUrl !== currentUser.avatar && { avatar: avatarUrl })), (isActiveBool !== undefined && { isActive: isActiveBool })),
            select: prisma_selects_1.userSelect,
        });
        res.json({
            message: isActiveBool !== undefined
                ? `User ${isActiveBool ? 'activated' : 'deactivated'} successfully`
                : 'User updated successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateUser = updateUser;
const updateArtist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { artistName, bio, socialMediaLinks, isActive } = req.body;
        const avatarFile = req.file;
        const validationErrors = [];
        if (!id)
            validationErrors.push('Artist ID is required');
        if (artistName && artistName.length < 2) {
            validationErrors.push('Artist name must be at least 2 characters long');
        }
        if (bio && bio.length > 1000) {
            validationErrors.push('Bio must not exceed 1000 characters');
        }
        if (validationErrors.length > 0) {
            res
                .status(400)
                .json({ message: 'Validation failed', errors: validationErrors });
            return;
        }
        const existingArtist = yield db_1.default.artistProfile.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!existingArtist) {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        if (artistName && artistName !== existingArtist.artistName) {
            const existingArtistName = yield db_1.default.artistProfile.findFirst({
                where: { artistName, NOT: { id } },
            });
            if (existingArtistName) {
                res.status(400).json({ message: 'Artist name already exists' });
                return;
            }
        }
        let avatarUrl = existingArtist.avatar;
        if (avatarFile) {
            const uploadResult = yield (0, cloudinary_service_1.uploadFile)(avatarFile.buffer, 'artists/avatars');
            avatarUrl = uploadResult.secure_url;
        }
        const isActiveBool = isActive !== undefined
            ? isActive === 'true' || isActive === true
            : undefined;
        const updatedArtist = yield db_1.default.artistProfile.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (artistName && { artistName })), (bio && { bio })), (socialMediaLinks && { socialMediaLinks })), (avatarUrl &&
                avatarUrl !== existingArtist.avatar && { avatar: avatarUrl })), (isActiveBool !== undefined && { isActive: isActiveBool })),
            select: prisma_selects_1.artistProfileSelect,
        });
        res.json({
            message: isActiveBool !== undefined
                ? `Artist ${isActiveBool ? 'activated' : 'deactivated'} successfully`
                : 'Artist updated successfully',
            artist: updatedArtist,
        });
    }
    catch (error) {
        console.error('Update artist error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateArtist = updateArtist;
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield db_1.default.user.delete({ where: { id } });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteUser = deleteUser;
const deleteArtist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield db_1.default.artistProfile.delete({ where: { id } });
        res.json({ message: 'Artist deleted permanently' });
    }
    catch (error) {
        console.error('Delete artist error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteArtist = deleteArtist;
const getAllArtists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search = '', status } = req.query;
        const pageNumber = Number(page);
        const limitNumber = Number(limit);
        const offset = (pageNumber - 1) * limitNumber;
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
        const [artists, totalArtists] = yield Promise.all([
            db_1.default.artistProfile.findMany({
                where,
                skip: offset,
                take: limitNumber,
                select: prisma_selects_1.artistProfileSelect,
                orderBy: { createdAt: 'desc' },
            }),
            db_1.default.artistProfile.count({ where }),
        ]);
        res.json({
            artists,
            pagination: {
                total: totalArtists,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalArtists / limitNumber),
            },
        });
    }
    catch (error) {
        console.error('Get all artists error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllArtists = getAllArtists;
const getArtistById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const cacheKey = req.originalUrl;
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedData = yield cache_middleware_1.client.get(cacheKey);
            if (cachedData) {
                console.log(`[Redis] Cache hit for key: ${cacheKey}`);
                res.json(JSON.parse(cachedData));
                return;
            }
            console.log(`[Redis] Cache miss for key: ${cacheKey}`);
        }
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
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        if (process.env.USE_REDIS_CACHE === 'true') {
            console.log(`[Redis] Caching data for key: ${cacheKey}`);
            yield cache_middleware_1.client.setEx(cacheKey, 300, JSON.stringify(artist));
        }
        res.json(artist);
    }
    catch (error) {
        console.error('Get artist by id error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getArtistById = getArtistById;
const getAllGenres = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const pageNumber = Number(page);
        const limitNumber = Number(limit);
        const offset = (pageNumber - 1) * limitNumber;
        const where = Object.assign({}, (search
            ? {
                name: {
                    contains: String(search),
                    mode: 'insensitive',
                },
            }
            : {}));
        const [genres, totalGenres] = yield Promise.all([
            db_1.default.genre.findMany({
                where,
                skip: offset,
                take: limitNumber,
                select: prisma_selects_1.genreSelect,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            db_1.default.genre.count({ where }),
        ]);
        res.json({
            genres,
            pagination: {
                total: totalGenres,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(totalGenres / limitNumber),
            },
        });
    }
    catch (error) {
        console.error('Get all genres error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllGenres = getAllGenres;
const createGenre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        const validationErrors = [];
        if (!name)
            validationErrors.push('Name is required');
        if (name && name.trim() === '')
            validationErrors.push('Name cannot be empty');
        if (name && name.length > 50) {
            validationErrors.push('Name exceeds maximum length (50 characters)');
        }
        if (validationErrors.length > 0) {
            res
                .status(400)
                .json({ message: 'Validation failed', errors: validationErrors });
            return;
        }
        const existingGenre = yield db_1.default.genre.findFirst({
            where: { name },
        });
        if (existingGenre) {
            res.status(400).json({ message: 'Genre name already exists' });
            return;
        }
        const genre = yield db_1.default.genre.create({
            data: { name },
        });
        res.status(201).json({ message: 'Genre created successfully', genre });
    }
    catch (error) {
        console.error('Create genre error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createGenre = createGenre;
const updateGenre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const validationErrors = [];
        if (!id)
            validationErrors.push('Genre ID is required');
        if (!name)
            validationErrors.push('Name is required');
        if (name && name.trim() === '')
            validationErrors.push('Name cannot be empty');
        if (name && name.length > 50) {
            validationErrors.push('Name exceeds maximum length (50 characters)');
        }
        if (validationErrors.length > 0) {
            res
                .status(400)
                .json({ message: 'Validation failed', errors: validationErrors });
            return;
        }
        const existingGenre = yield db_1.default.genre.findUnique({
            where: { id },
        });
        if (!existingGenre) {
            res.status(404).json({ message: 'Genre not found' });
            return;
        }
        if (name !== existingGenre.name) {
            const existingGenreWithName = yield db_1.default.genre.findFirst({
                where: { name, NOT: { id } },
            });
            if (existingGenreWithName) {
                res.status(400).json({ message: 'Genre name already exists' });
                return;
            }
        }
        const updatedGenre = yield db_1.default.genre.update({
            where: { id },
            data: { name },
        });
        res.json({
            message: 'Genre updated successfully',
            genre: updatedGenre,
        });
    }
    catch (error) {
        console.error('Update genre error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateGenre = updateGenre;
const deleteGenre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield db_1.default.genre.delete({ where: { id } });
        res.json({ message: 'Genre deleted successfully' });
    }
    catch (error) {
        console.error('Delete genre error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteGenre = deleteGenre;
const approveArtistRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.body;
        const artistProfile = yield db_1.default.artistProfile.findUnique({
            where: { id: requestId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        name: true,
                        role: true,
                    },
                },
            },
        });
        if (!(artistProfile === null || artistProfile === void 0 ? void 0 : artistProfile.verificationRequestedAt) || artistProfile.isVerified) {
            res
                .status(404)
                .json({ message: 'Artist request not found or already verified' });
            return;
        }
        const updatedProfile = yield db_1.default.artistProfile.update({
            where: { id: requestId },
            data: {
                role: client_1.Role.ARTIST,
                isVerified: true,
                verifiedAt: new Date(),
                verificationRequestedAt: null,
            },
            include: { user: { select: prisma_selects_1.userSelect } },
        });
        res.json({
            message: 'Artist role approved successfully',
            user: updatedProfile.user,
        });
    }
    catch (error) {
        console.error('Approve artist request error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.approveArtistRequest = approveArtistRequest;
const rejectArtistRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.body;
        const artistProfile = yield db_1.default.artistProfile.findUnique({
            where: { id: requestId },
            include: {
                user: { select: { id: true, email: true, name: true, role: true } },
            },
        });
        if (!artistProfile ||
            !artistProfile.verificationRequestedAt ||
            artistProfile.isVerified) {
            res
                .status(404)
                .json({ message: 'Artist request not found or already verified' });
            return;
        }
        yield db_1.default.artistProfile.delete({
            where: { id: requestId },
        });
        res.json({
            message: 'Artist role request rejected successfully',
            user: artistProfile.user,
            hasPendingRequest: false,
        });
    }
    catch (error) {
        console.error('Reject artist request error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.rejectArtistRequest = rejectArtistRequest;
const getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cacheKey = req.originalUrl;
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedStats = yield cache_middleware_1.client.get(cacheKey);
            if (cachedStats) {
                console.log(`[Redis] Cache hit for key: ${cacheKey}`);
                res.json(JSON.parse(cachedStats));
                return;
            }
            console.log(`[Redis] Cache miss for key: ${cacheKey}`);
        }
        const stats = yield Promise.all([
            db_1.default.user.count(),
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
            db_1.default.artistProfile.findFirst({
                where: {
                    role: client_1.Role.ARTIST,
                    isVerified: true,
                },
                orderBy: [{ monthlyListeners: 'desc' }],
                select: {
                    id: true,
                    artistName: true,
                    monthlyListeners: true,
                },
            }),
            db_1.default.genre.count(),
        ]);
        const [totalUsers, totalArtists, totalArtistRequests, mostActiveArtist, totalGenres,] = stats;
        const statsData = {
            totalUsers,
            totalArtists,
            totalArtistRequests,
            totalGenres,
            trendingArtist: {
                id: (mostActiveArtist === null || mostActiveArtist === void 0 ? void 0 : mostActiveArtist.id) || '',
                artistName: (mostActiveArtist === null || mostActiveArtist === void 0 ? void 0 : mostActiveArtist.artistName) || '',
                monthlyListeners: (mostActiveArtist === null || mostActiveArtist === void 0 ? void 0 : mostActiveArtist.monthlyListeners) || 0,
            },
            updatedAt: new Date().toISOString(),
        };
        if (process.env.USE_REDIS_CACHE === 'true') {
            console.log(`[Redis] Caching data for key: ${cacheKey}`);
            yield cache_middleware_1.client.setEx(cacheKey, 3600, JSON.stringify(statsData));
        }
        res.json(statsData);
    }
    catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getStats = getStats;
//# sourceMappingURL=admin.controller.js.map