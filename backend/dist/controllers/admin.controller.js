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
const prisma_selects_1 = require("../utils/prisma-selects");
const cloudinary_service_1 = require("../services/cloudinary.service");
const handle_utils_1 = require("src/utils/handle-utils");
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
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
        const result = yield (0, handle_utils_1.paginate)(db_1.default.user, req, {
            where,
            include: {
                artistProfile: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({
            users: result.data,
            pagination: result.pagination,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get all users');
    }
});
exports.getAllUsers = getAllUsers;
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield (0, handle_utils_1.handleCache)(req, () => __awaiter(void 0, void 0, void 0, function* () {
            return db_1.default.user.findUnique({
                where: { id },
                select: prisma_selects_1.userSelect,
            });
        }));
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get user by id');
    }
});
exports.getUserById = getUserById;
const getAllArtistRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
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
        const result = yield (0, handle_utils_1.paginate)(db_1.default.artistProfile, req, {
            where,
            select: prisma_selects_1.artistRequestSelect,
            orderBy: { verificationRequestedAt: 'desc' },
        });
        res.json({
            requests: result.data,
            pagination: result.pagination,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get artist requests');
    }
});
exports.getAllArtistRequests = getAllArtistRequests;
const getArtistRequestDetail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const request = yield (0, handle_utils_1.handleCache)(req, () => __awaiter(void 0, void 0, void 0, function* () {
            return db_1.default.artistProfile.findUnique({
                where: { id },
                select: prisma_selects_1.artistRequestDetailsSelect,
            });
        }));
        if (!request) {
            res.status(404).json({ message: 'Request not found' });
            return;
        }
        res.json(request);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get artist request details');
    }
});
exports.getArtistRequestDetail = getArtistRequestDetail;
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, email, username, isActive, role } = req.body;
        const avatarFile = req.file;
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
        const isActiveBool = isActive !== undefined ? (0, handle_utils_1.toBooleanValue)(isActive) : undefined;
        const updatedUser = yield db_1.default.user.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (name !== undefined && { name })), (email !== undefined && { email })), (username !== undefined && { username })), (avatarUrl !== currentUser.avatar && { avatar: avatarUrl })), (isActiveBool !== undefined && { isActive: isActiveBool })), (role !== undefined && { role })),
            select: prisma_selects_1.userSelect,
        });
        res.json({
            message: 'User updated successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Update user');
    }
});
exports.updateUser = updateUser;
const updateArtist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { artistName, bio, isActive } = req.body;
        const existingArtist = yield db_1.default.artistProfile.findUnique({
            where: { id },
        });
        if (!existingArtist) {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        let validatedArtistName = undefined;
        if (artistName && artistName !== existingArtist.artistName) {
            const nameExists = yield db_1.default.artistProfile.findFirst({
                where: {
                    artistName,
                    id: { not: id },
                },
            });
            if (nameExists) {
                res.status(400).json({
                    message: 'Artist name already exists',
                });
                return;
            }
            validatedArtistName = artistName;
        }
        let avatarUrl = undefined;
        if (req.file) {
            const result = yield (0, cloudinary_service_1.uploadFile)(req.file.buffer, 'artists/avatars', 'image');
            avatarUrl = result.secure_url;
        }
        const updatedArtist = yield db_1.default.artistProfile.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign(Object.assign({}, (validatedArtistName && { artistName: validatedArtistName })), (bio !== undefined && { bio })), (isActive !== undefined && { isActive: (0, handle_utils_1.toBooleanValue)(isActive) })), (avatarUrl && { avatar: avatarUrl })),
            select: prisma_selects_1.artistProfileSelect,
        });
        res.json({
            message: 'Artist updated successfully',
            artist: updatedArtist,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Update artist');
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
        (0, handle_utils_1.handleError)(res, error, 'Delete user');
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
        (0, handle_utils_1.handleError)(res, error, 'Delete artist');
    }
});
exports.deleteArtist = deleteArtist;
const getAllArtists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
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
        const result = yield (0, handle_utils_1.paginate)(db_1.default.artistProfile, req, {
            where,
            select: prisma_selects_1.artistProfileSelect,
            orderBy: { createdAt: 'desc' },
        });
        res.json({
            artists: result.data,
            pagination: result.pagination,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get all artists');
    }
});
exports.getAllArtists = getAllArtists;
const getArtistById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const artist = yield (0, handle_utils_1.handleCache)(req, () => __awaiter(void 0, void 0, void 0, function* () {
            return db_1.default.artistProfile.findUnique({
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
        }));
        if (!artist) {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        res.json(artist);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get artist by id');
    }
});
exports.getArtistById = getArtistById;
const getAllGenres = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search = '' } = req.query;
        const where = search
            ? {
                name: {
                    contains: String(search),
                    mode: 'insensitive',
                },
            }
            : {};
        const result = yield (0, handle_utils_1.paginate)(db_1.default.genre, req, {
            where,
            select: prisma_selects_1.genreSelect,
            orderBy: { createdAt: 'desc' },
        });
        res.json({
            genres: result.data,
            pagination: result.pagination,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get all genres');
    }
});
exports.getAllGenres = getAllGenres;
const createGenre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        const validationErrors = (0, handle_utils_1.runValidations)([
            (0, handle_utils_1.validateField)(name, 'Name', { required: true }),
            name && (0, handle_utils_1.validateField)(name.trim(), 'Name', { minLength: 1 }),
            name && (0, handle_utils_1.validateField)(name, 'Name', { maxLength: 50 }),
        ]);
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
        (0, handle_utils_1.handleError)(res, error, 'Create genre');
    }
});
exports.createGenre = createGenre;
const updateGenre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const validationErrors = (0, handle_utils_1.runValidations)([
            (0, handle_utils_1.validateField)(id, 'Genre ID', { required: true }),
            (0, handle_utils_1.validateField)(name, 'Name', { required: true }),
            name && (0, handle_utils_1.validateField)(name.trim(), 'Name', { minLength: 1 }),
            name && (0, handle_utils_1.validateField)(name, 'Name', { maxLength: 50 }),
        ]);
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
        (0, handle_utils_1.handleError)(res, error, 'Update genre');
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
        (0, handle_utils_1.handleError)(res, error, 'Delete genre');
    }
});
exports.deleteGenre = deleteGenre;
const approveArtistRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.body;
        const artistProfile = yield db_1.default.artistProfile.findFirst({
            where: {
                id: requestId,
                verificationRequestedAt: { not: null },
                isVerified: false,
            },
        });
        if (!artistProfile) {
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
        (0, handle_utils_1.handleError)(res, error, 'Approve artist request');
    }
});
exports.approveArtistRequest = approveArtistRequest;
const rejectArtistRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.body;
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
        (0, handle_utils_1.handleError)(res, error, 'Reject artist request');
    }
});
exports.rejectArtistRequest = rejectArtistRequest;
const getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const statsData = yield (0, handle_utils_1.handleCache)(req, () => __awaiter(void 0, void 0, void 0, function* () {
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
        }), 3600);
        res.json(statsData);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get stats');
    }
});
exports.getStats = getStats;
//# sourceMappingURL=admin.controller.js.map