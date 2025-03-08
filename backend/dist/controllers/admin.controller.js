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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = exports.rejectArtistRequest = exports.approveArtistRequest = exports.deleteGenre = exports.updateGenre = exports.createGenre = exports.getArtistById = exports.getAllArtists = exports.deleteArtist = exports.deleteUser = exports.updateArtist = exports.updateUser = exports.getArtistRequestDetail = exports.getAllArtistRequests = exports.getUserById = exports.getAllUsers = void 0;
const handle_utils_1 = require("../utils/handle-utils");
const adminService = __importStar(require("../services/admin.service"));
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { users, pagination } = yield adminService.getUsers(req);
        res.json({ users, pagination });
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
            return adminService.getUserById(id);
        }));
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'User not found') {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get user by id');
    }
});
exports.getUserById = getUserById;
const getAllArtistRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requests, pagination } = yield adminService.getArtistRequests(req);
        res.json({ requests, pagination });
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
            return adminService.getArtistRequestDetail(id);
        }));
        res.json(request);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Request not found') {
            res.status(404).json({ message: 'Request not found' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get artist request details');
    }
});
exports.getArtistRequestDetail = getArtistRequestDetail;
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedUser = yield adminService.updateUserInfo(id, req.body, req.file);
        res.json({
            message: 'User updated successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'User not found') {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            else if (error.message === 'Email already exists' ||
                error.message === 'Username already exists') {
                res.status(400).json({ message: error.message });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Update user');
    }
});
exports.updateUser = updateUser;
const updateArtist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedArtist = yield adminService.updateArtistInfo(id, req.body, req.file);
        res.json({
            message: 'Artist updated successfully',
            artist: updatedArtist,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Artist not found') {
                res.status(404).json({ message: 'Artist not found' });
                return;
            }
            else if (error.message === 'Artist name already exists') {
                res.status(400).json({ message: 'Artist name already exists' });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Update artist');
    }
});
exports.updateArtist = updateArtist;
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield adminService.deleteUserById(id);
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
        yield adminService.deleteArtistById(id);
        res.json({ message: 'Artist deleted permanently' });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Delete artist');
    }
});
exports.deleteArtist = deleteArtist;
const getAllArtists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { artists, pagination } = yield adminService.getArtists(req);
        res.json({ artists, pagination });
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
            return adminService.getArtistById(id);
        }));
        res.json(artist);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Artist not found') {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get artist by id');
    }
});
exports.getArtistById = getArtistById;
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
        const genre = yield adminService.createNewGenre(name);
        res.status(201).json({ message: 'Genre created successfully', genre });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message === 'Genre name already exists') {
            res.status(400).json({ message: 'Genre name already exists' });
            return;
        }
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
        const updatedGenre = yield adminService.updateGenreInfo(id, name);
        res.json({
            message: 'Genre updated successfully',
            genre: updatedGenre,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Genre not found') {
                res.status(404).json({ message: 'Genre not found' });
                return;
            }
            else if (error.message === 'Genre name already exists') {
                res.status(400).json({ message: 'Genre name already exists' });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Update genre');
    }
});
exports.updateGenre = updateGenre;
const deleteGenre = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield adminService.deleteGenreById(id);
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
        const updatedProfile = yield adminService.approveArtistRequest(requestId);
        res.json({
            message: 'Artist role approved successfully',
            user: updatedProfile.user,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message.includes('not found or already verified')) {
            res
                .status(404)
                .json({ message: 'Artist request not found or already verified' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Approve artist request');
    }
});
exports.approveArtistRequest = approveArtistRequest;
const rejectArtistRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.body;
        const result = yield adminService.rejectArtistRequest(requestId);
        res.json({
            message: 'Artist role request rejected successfully',
            user: result.user,
            hasPendingRequest: result.hasPendingRequest,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message.includes('not found or already verified')) {
            res
                .status(404)
                .json({ message: 'Artist request not found or already verified' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Reject artist request');
    }
});
exports.rejectArtistRequest = rejectArtistRequest;
const getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const statsData = yield (0, handle_utils_1.handleCache)(req, () => __awaiter(void 0, void 0, void 0, function* () {
            return adminService.getSystemStats();
        }), 3600);
        res.json(statsData);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get stats');
    }
});
exports.getStats = getStats;
//# sourceMappingURL=admin.controller.js.map