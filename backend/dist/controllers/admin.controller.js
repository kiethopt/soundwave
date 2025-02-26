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
exports.getStats = exports.updateMonthlyListeners = exports.verifyArtist = exports.rejectArtistRequest = exports.approveArtistRequest = exports.deleteGenre = exports.updateGenre = exports.createGenre = exports.getAllGenres = exports.getArtistById = exports.getAllArtists = exports.deactivateArtist = exports.deactivateUser = exports.deleteArtist = exports.deleteUser = exports.updateArtist = exports.updateUser = exports.getArtistRequestDetails = exports.getAllArtistRequests = exports.getUserById = exports.getAllUsers = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const cache_middleware_1 = require("../middleware/cache.middleware");
const session_service_1 = require("../services/session.service");
const prisma_selects_1 = require("../utils/prisma-selects");
const cloudinary_service_1 = require("src/services/cloudinary.service");
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
const getArtistRequestDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!token) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
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
exports.getArtistRequestDetails = getArtistRequestDetails;
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        const { role, isVerified, name, email, username } = req.body;
        if (!id) {
            res.status(400).json({ message: 'User ID is required' });
            return;
        }
        if (role && !Object.values(client_1.Role).includes(role)) {
            res.status(400).json({ message: 'Invalid role' });
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
            const existingUserWithEmail = yield db_1.default.user.findUnique({
                where: { email },
            });
            if (existingUserWithEmail) {
                res.status(400).json({ message: 'Email already exists' });
                return;
            }
        }
        if (username && username !== currentUser.username) {
            const existingUserWithUsername = yield db_1.default.user.findUnique({
                where: { username },
            });
            if (existingUserWithUsername) {
                res.status(400).json({ message: 'Username already exists' });
                return;
            }
        }
        if (currentUser.role === client_1.Role.ADMIN) {
            res.status(403).json({ message: 'Cannot modify ADMIN role' });
            return;
        }
        if (role === client_1.Role.ARTIST && currentUser.role === client_1.Role.USER) {
            if (!((_a = currentUser.artistProfile) === null || _a === void 0 ? void 0 : _a.verificationRequestedAt)) {
                res.status(400).json({
                    message: 'User has not requested to become an artist',
                });
                return;
            }
        }
        if (currentUser.role === client_1.Role.ARTIST &&
            ((_b = currentUser.artistProfile) === null || _b === void 0 ? void 0 : _b.isVerified)) {
            if (role === client_1.Role.USER) {
                res.status(400).json({
                    message: 'Cannot change role from ARTIST to USER once verified',
                });
                return;
            }
            if (isVerified === false) {
                res.status(400).json({
                    message: 'Cannot unverify a verified artist',
                });
                return;
            }
        }
        if (isVerified === true) {
            if (!((_c = currentUser.artistProfile) === null || _c === void 0 ? void 0 : _c.verificationRequestedAt)) {
                res.status(400).json({
                    message: 'User has not requested to become an artist',
                });
                return;
            }
        }
        const isVerifyingArtistRequest = isVerified === true &&
            ((_d = currentUser.artistProfile) === null || _d === void 0 ? void 0 : _d.verificationRequestedAt) &&
            !currentUser.artistProfile.isVerified;
        const updateData = Object.assign(Object.assign(Object.assign({}, (name && { name })), (email && { email })), (username && { username }));
        const updatedUser = yield db_1.default.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            yield prisma.user.update({
                where: { id },
                data: updateData,
            });
            if (isVerifyingArtistRequest) {
                yield prisma.artistProfile.update({
                    where: { userId: id },
                    data: {
                        isVerified: true,
                        verifiedAt: new Date(),
                        verificationRequestedAt: null,
                        role: client_1.Role.ARTIST,
                    },
                });
            }
            return yield prisma.user.findUnique({
                where: { id },
                select: prisma_selects_1.userSelect,
            });
        }));
        res.json({
            message: 'User updated successfully',
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
    var _a;
    try {
        const { id } = req.params;
        const { artistName, bio, socialMediaLinks } = req.body;
        const avatarFile = req.file;
        const admin = req.user;
        if (!admin ||
            (admin.role !== client_1.Role.ADMIN && ((_a = admin.artistProfile) === null || _a === void 0 ? void 0 : _a.id) !== id)) {
            res.status(403).json({ message: 'Forbidden' });
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
        const updatedArtist = yield db_1.default.artistProfile.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign({}, (artistName && { artistName })), (bio && { bio })), (socialMediaLinks && { socialMediaLinks })), (avatarUrl &&
                avatarUrl !== existingArtist.avatar && { avatar: avatarUrl })),
            select: prisma_selects_1.artistProfileSelect,
        });
        if (process.env.USE_REDIS_CACHE === 'true') {
            yield (0, cache_middleware_1.clearCacheForEntity)('artist', { entityId: id, clearSearch: true });
        }
        res.json({
            message: 'Artist updated successfully',
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
        yield db_1.default.artistProfile.deleteMany({
            where: { userId: id },
        });
        yield db_1.default.user.delete({
            where: { id },
        });
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
        yield db_1.default.$transaction([
            db_1.default.track.deleteMany({ where: { artistId: id } }),
            db_1.default.album.deleteMany({ where: { artistId: id } }),
            db_1.default.artistProfile.delete({ where: { id } }),
        ]);
        res.json({ message: 'Artist deleted permanently' });
    }
    catch (error) {
        console.error('Delete artist error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteArtist = deleteArtist;
const deactivateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const admin = req.user;
        if (!admin || admin.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const user = yield db_1.default.user.findUnique({
            where: { id },
            select: {
                id: true,
                role: true,
                isActive: true,
                email: true,
            },
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (user.role === client_1.Role.ADMIN) {
            res.status(403).json({ message: 'Cannot deactivate admin users' });
            return;
        }
        const updatedUser = yield db_1.default.user.update({
            where: { id },
            data: {
                isActive: isActive,
            },
            select: prisma_selects_1.userSelect,
        });
        const keys = yield cache_middleware_1.client.keys('users:list:*');
        if (keys.length) {
            yield Promise.all(keys.map((key) => cache_middleware_1.client.del(key)));
        }
        if (!isActive) {
            yield session_service_1.sessionService.handleUserDeactivation(user.id);
        }
        res.json({
            message: isActive
                ? 'User activated successfully'
                : 'User deactivated successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        console.error('Deactivate user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deactivateUser = deactivateUser;
const deactivateArtist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const artist = yield db_1.default.artistProfile.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!artist) {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        const [updatedUser] = yield db_1.default.$transaction([
            db_1.default.user.update({
                where: { id: artist.userId },
                data: Object.assign({ isActive }, (!isActive ? { currentProfile: 'USER' } : {})),
                select: prisma_selects_1.userSelect,
            }),
            db_1.default.artistProfile.update({
                where: { id },
                data: { isActive },
            }),
        ]);
        res.json({
            message: `Artist ${isActive ? 'activated' : 'deactivated'} successfully`,
            user: updatedUser,
        });
    }
    catch (error) {
        console.error('Deactivate artist error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deactivateArtist = deactivateArtist;
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
        const { albumPage = 1, albumLimit = 6, trackPage = 1, trackLimit = 10, } = req.query;
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
                    skip: (Number(albumPage) - 1) * Number(albumLimit),
                    take: Number(albumLimit),
                    orderBy: { releaseDate: 'desc' },
                    select: prisma_selects_1.artistProfileSelect.albums.select,
                }, tracks: {
                    skip: (Number(trackPage) - 1) * Number(trackLimit),
                    take: Number(trackLimit),
                    orderBy: { releaseDate: 'desc' },
                    select: prisma_selects_1.artistProfileSelect.tracks.select,
                }, _count: {
                    select: {
                        albums: true,
                        tracks: true,
                    },
                } }),
        });
        if (!artist) {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        const { _count } = artist, artistData = __rest(artist, ["_count"]);
        const response = Object.assign(Object.assign({}, artistData), { albums: {
                data: artist.albums,
                total: _count.albums,
                page: Number(albumPage),
                limit: Number(albumLimit),
                totalPages: Math.ceil(_count.albums / Number(albumLimit)),
            }, tracks: {
                data: artist.tracks,
                total: _count.tracks,
                page: Number(trackPage),
                limit: Number(trackLimit),
                totalPages: Math.ceil(_count.tracks / Number(trackLimit)),
            } });
        if (process.env.USE_REDIS_CACHE === 'true') {
            console.log(`[Redis] Caching data for key: ${cacheKey}`);
            yield cache_middleware_1.client.setEx(cacheKey, 300, JSON.stringify(response));
        }
        res.json(response);
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
        const genre = yield db_1.default.genre.create({
            data: { name },
        });
        yield Promise.all([
            (0, cache_middleware_1.clearCacheForEntity)('genre', { clearSearch: true }),
            (0, cache_middleware_1.clearCacheForEntity)('track', { clearSearch: true }),
            (0, cache_middleware_1.clearCacheForEntity)('stats', {}),
        ]);
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
        if (!name) {
            res.status(400).json({ message: 'Name is required' });
            return;
        }
        if (name.trim() === '') {
            res.status(400).json({ message: 'Name cannot be empty' });
            return;
        }
        if (name.length > 50) {
            res.status(400).json({
                message: 'Name exceeds maximum length (50 characters)',
                maxLength: 50,
                currentLength: name.length,
            });
            return;
        }
        const existingGenre = yield db_1.default.genre.findUnique({
            where: { id },
        });
        if (!existingGenre) {
            res.status(404).json({ message: 'Genre not found' });
            return;
        }
        const existingGenreWithName = yield db_1.default.genre.findFirst({
            where: {
                name,
                NOT: {
                    id,
                },
            },
        });
        if (existingGenreWithName) {
            res.status(400).json({ message: 'Genre name already exists' });
            return;
        }
        const updatedGenre = yield db_1.default.genre.update({
            where: { id },
            data: { name },
        });
        yield (0, cache_middleware_1.clearCacheForEntity)('genre', { entityId: id, clearSearch: true });
        yield (0, cache_middleware_1.clearCacheForEntity)('track', { clearSearch: true });
        res.json({
            message: 'Genre updated successfully',
            genre: updatedGenre,
        });
    }
    catch (error) {
        console.error('Update genre error:', error);
        if (error instanceof Error && 'code' in error) {
            switch (error.code) {
                case 'P2002':
                    res.status(400).json({ message: 'Genre name already exists' });
                    return;
                case 'P2025':
                    res.status(404).json({ message: 'Genre not found' });
                    return;
                default:
                    console.error('Prisma error:', error);
                    res.status(500).json({ message: 'Internal server error' });
                    return;
            }
        }
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateGenre = updateGenre;
const deleteGenre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield db_1.default.genre.delete({
            where: { id },
        });
        yield (0, cache_middleware_1.clearCacheForEntity)('genre', { entityId: id, clearSearch: true });
        yield (0, cache_middleware_1.clearCacheForEntity)('track', { clearSearch: true });
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
        const admin = req.user;
        if (!admin || admin.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
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
        if (!artistProfile ||
            !artistProfile.verificationRequestedAt ||
            artistProfile.isVerified) {
            res
                .status(404)
                .json({ message: 'Artist request not found or already verified' });
            return;
        }
        yield db_1.default.$transaction([
            db_1.default.artistProfile.update({
                where: { id: requestId },
                data: {
                    role: client_1.Role.ARTIST,
                    isVerified: true,
                    verifiedAt: new Date(),
                    verificationRequestedAt: null,
                },
            }),
        ]);
        const updatedUser = yield db_1.default.user.findUnique({
            where: { id: artistProfile.userId },
            select: prisma_selects_1.userSelect,
        });
        yield session_service_1.sessionService.handleArtistRequestApproval(artistProfile.user.id);
        res.json({
            message: 'Artist role approved successfully',
            user: updatedUser,
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
        console.log('[Admin] Starting reject artist request process');
        const { requestId } = req.body;
        const admin = req.user;
        if (!admin || admin.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const artistProfile = yield db_1.default.artistProfile.findUnique({
            where: { id: requestId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                    },
                },
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
        yield session_service_1.sessionService.handleArtistRequestRejection(artistProfile.user.id);
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
const verifyArtist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;
        const admin = req.user;
        if (!admin || admin.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const artistProfile = yield db_1.default.artistProfile.findUnique({
            where: { id: userId },
            include: {
                user: true,
            },
        });
        if (!artistProfile || artistProfile.isVerified) {
            res.status(404).json({ message: 'Artist not found or already verified' });
            return;
        }
        yield db_1.default.artistProfile.update({
            where: { id: userId },
            data: {
                isVerified: true,
                verifiedAt: new Date(),
            },
        });
        const updatedUser = yield db_1.default.user.findUnique({
            where: { id: artistProfile.userId },
            include: {
                artistProfile: true,
            },
        });
        res.json({
            message: 'Artist verified successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        console.error('Verify artist error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.verifyArtist = verifyArtist;
const updateMonthlyListeners = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const user = req.user;
        if (!user || (user.role !== client_1.Role.ADMIN && ((_a = user.artistProfile) === null || _a === void 0 ? void 0 : _a.id) !== id)) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const artistProfile = yield db_1.default.artistProfile.findUnique({
            where: { id },
            include: {
                tracks: {
                    select: {
                        id: true,
                    },
                },
            },
        });
        if (!artistProfile) {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        const trackIds = artistProfile.tracks.map((track) => track.id);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const uniqueListeners = yield db_1.default.history.findMany({
            where: {
                trackId: {
                    in: trackIds,
                },
                type: 'PLAY',
                createdAt: {
                    gte: thirtyDaysAgo,
                },
            },
            distinct: ['userId'],
        });
        const updatedArtistProfile = yield db_1.default.artistProfile.update({
            where: { id },
            data: {
                monthlyListeners: uniqueListeners.length,
            },
        });
        res.json({
            message: 'Monthly listeners updated successfully',
            artistProfile: updatedArtistProfile,
        });
    }
    catch (error) {
        console.error('Update monthly listeners error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateMonthlyListeners = updateMonthlyListeners;
const getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cacheKey = '/api/admin/stats';
        const user = req.user;
        if (!user || user.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        if (process.env.USE_REDIS_CACHE === 'true') {
            const cachedStats = yield cache_middleware_1.client.get(cacheKey);
            if (cachedStats) {
                console.log(`[Redis] Cache hit for key: ${cacheKey}`);
                res.json(JSON.parse(cachedStats));
                return;
            }
            console.log(`[Redis] Cache miss for key: ${cacheKey}`);
        }
        const [totalUsers, totalArtists, totalArtistRequests, mostActiveArtist, totalGenres,] = yield Promise.all([
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
                orderBy: [{ monthlyListeners: 'desc' }, { tracks: { _count: 'desc' } }],
                select: {
                    id: true,
                    artistName: true,
                    monthlyListeners: true,
                    _count: {
                        select: {
                            tracks: true,
                        },
                    },
                },
            }),
            db_1.default.genre.count(),
        ]);
        const statsData = {
            totalUsers,
            totalArtists,
            totalArtistRequests,
            totalGenres,
            trendingArtist: {
                id: (mostActiveArtist === null || mostActiveArtist === void 0 ? void 0 : mostActiveArtist.id) || '',
                artistName: (mostActiveArtist === null || mostActiveArtist === void 0 ? void 0 : mostActiveArtist.artistName) || '',
                monthlyListeners: (mostActiveArtist === null || mostActiveArtist === void 0 ? void 0 : mostActiveArtist.monthlyListeners) || 0,
                trackCount: (mostActiveArtist === null || mostActiveArtist === void 0 ? void 0 : mostActiveArtist._count.tracks) || 0,
            },
            updatedAt: new Date().toISOString(),
        };
        if (process.env.USE_REDIS_CACHE === 'true') {
            console.log(`[Redis] Caching data for key: ${cacheKey}`);
            yield cache_middleware_1.client.setEx(cacheKey, 300, JSON.stringify(statsData));
        }
        res.json(statsData);
    }
    catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.getStats = getStats;
//# sourceMappingURL=admin.controller.js.map