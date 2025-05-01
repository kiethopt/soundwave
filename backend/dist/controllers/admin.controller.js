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
exports.getSystemStatus = exports.handleAIModelStatus = exports.handleCacheStatus = exports.getDashboardStats = exports.deleteArtistRequest = exports.rejectArtistRequest = exports.approveArtistRequest = exports.deleteGenre = exports.updateGenre = exports.createGenre = exports.getArtistById = exports.getAllArtists = exports.deleteArtist = exports.deleteUser = exports.updateArtist = exports.updateUser = exports.getArtistRequestDetail = exports.getAllArtistRequests = exports.getUserById = exports.getAllUsers = void 0;
const handle_utils_1 = require("../utils/handle-utils");
const db_1 = __importDefault(require("../config/db"));
const adminService = __importStar(require("../services/admin.service"));
const emailService = __importStar(require("../services/email.service"));
const client_1 = require("@prisma/client");
const getAllUsers = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { users, pagination } = await adminService.getUsers(req, req.user);
        res.json({ users, pagination });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get all users');
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await adminService.getUserById(id);
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
};
exports.getUserById = getUserById;
const getAllArtistRequests = async (req, res) => {
    try {
        const { requests, pagination } = await adminService.getArtistRequests(req);
        res.json({ requests, pagination });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get artist requests');
    }
};
exports.getAllArtistRequests = getAllArtistRequests;
const getArtistRequestDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await adminService.getArtistRequestDetail(id);
        res.json(request);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Request not found') {
            res.status(404).json({ message: 'Request not found' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get artist request details');
    }
};
exports.getArtistRequestDetail = getArtistRequestDetail;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userData = { ...req.body };
        const requestingUser = req.user;
        if (!requestingUser) {
            res.status(401).json({ message: "Unauthorized: Requesting user data missing." });
            return;
        }
        const updatedUser = await adminService.updateUserInfo(id, userData, requestingUser);
        res.json({
            message: 'User updated successfully',
            user: updatedUser,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.startsWith('Permission denied:')) {
                res.status(403).json({ message: error.message });
                return;
            }
            if (error.message === 'User not found') {
                res.status(404).json({ message: 'User not found' });
                return;
            }
            else if (error.message === 'Email already exists' ||
                error.message === 'Username already exists') {
                res.status(400).json({ message: error.message });
                return;
            }
            else if (error.message === 'Current password is incorrect') {
                res.status(400).json({ message: error.message });
                return;
            }
            else if (error.message.includes('password change')) {
                res.status(400).json({ message: error.message });
                return;
            }
            else if (error.message === 'Password must be at least 6 characters long.') {
                res.status(400).json({ message: error.message });
                return;
            }
            else if (error.message === "No valid data provided for update.") {
                res.status(400).json({ message: error.message });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Update user');
    }
};
exports.updateUser = updateUser;
const updateArtist = async (req, res) => {
    try {
        const { id } = req.params;
        const artistData = { ...req.body };
        if (!id) {
            res.status(400).json({ message: 'Artist ID is required' });
            return;
        }
        const updatedArtist = await adminService.updateArtistInfo(id, artistData);
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
            else if (error.message.includes('Validation failed')) {
                res.status(400).json({ message: error.message });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Update artist');
    }
};
exports.updateArtist = updateArtist;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const requestingUser = req.user;
        const { reason } = req.body;
        if (!requestingUser || requestingUser.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: 'Forbidden: Admin access required.' });
            return;
        }
        await adminService.deleteUserById(id, requestingUser, reason);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Permission denied: Admins cannot be deleted.') {
            res.status(403).json({ message: error.message });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Delete user');
    }
};
exports.deleteUser = deleteUser;
const deleteArtist = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        await adminService.deleteArtistById(id, reason);
        res.json({ message: 'Artist deleted permanently' });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Delete artist');
    }
};
exports.deleteArtist = deleteArtist;
const getAllArtists = async (req, res) => {
    try {
        const result = await adminService.getArtists(req);
        res.status(200).json(result);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get all artists');
    }
};
exports.getAllArtists = getAllArtists;
const getArtistById = async (req, res) => {
    try {
        const { id } = req.params;
        const artist = await adminService.getArtistById(id);
        res.json(artist);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Artist not found') {
            res.status(404).json({ message: 'Artist not found' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get artist by id');
    }
};
exports.getArtistById = getArtistById;
const createGenre = async (req, res) => {
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
        const genre = await adminService.createNewGenre(name);
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
};
exports.createGenre = createGenre;
const updateGenre = async (req, res) => {
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
        const updatedGenre = await adminService.updateGenreInfo(id, name);
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
};
exports.updateGenre = updateGenre;
const deleteGenre = async (req, res) => {
    try {
        const { id } = req.params;
        await adminService.deleteGenreById(id);
        res.json({ message: 'Genre deleted successfully' });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Delete genre');
    }
};
exports.deleteGenre = deleteGenre;
const approveArtistRequest = async (req, res) => {
    try {
        const { requestId } = req.body;
        const updatedProfile = await adminService.approveArtistRequest(requestId);
        await db_1.default.notification.create({
            data: {
                type: 'ARTIST_REQUEST_APPROVE',
                message: 'Your request to become an Artist has been approved!',
                recipientType: 'USER',
                userId: updatedProfile.user.id,
                isRead: false,
            },
        });
        if (updatedProfile.user.email) {
            try {
                const emailOptions = emailService.createArtistRequestApprovedEmail(updatedProfile.user.email, updatedProfile.user.name || updatedProfile.user.username || 'User');
                await emailService.sendEmail(emailOptions);
                console.log(`Artist approval email sent to ${updatedProfile.user.email}`);
            }
            catch (emailError) {
                console.error('Failed to send artist approval email:', emailError);
            }
        }
        else {
            console.warn(`Could not send approval email: No email found for user ${updatedProfile.user.id}`);
        }
        res.json({
            message: 'Artist role approved successfully',
            user: updatedProfile.user,
            hasPendingRequest: false
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message.includes('not found, already verified, or rejected')) {
            res
                .status(404)
                .json({ message: 'Artist request not found, already verified, or rejected' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Approve artist request');
    }
};
exports.approveArtistRequest = approveArtistRequest;
const rejectArtistRequest = async (req, res) => {
    try {
        const { requestId, reason } = req.body;
        const result = await adminService.rejectArtistRequest(requestId);
        let notificationMessage = 'Your request to become an Artist has been rejected.';
        if (reason && reason.trim() !== '') {
            notificationMessage += ` Reason: ${reason.trim()}`;
        }
        await db_1.default.notification.create({
            data: {
                type: 'ARTIST_REQUEST_REJECT',
                message: notificationMessage,
                recipientType: 'USER',
                userId: result.user.id,
                isRead: false,
            },
        });
        if (result.user.email) {
            try {
                const emailOptions = emailService.createArtistRequestRejectedEmail(result.user.email, result.user.name || result.user.username || 'User', reason);
                await emailService.sendEmail(emailOptions);
                console.log(`Artist rejection email sent to ${result.user.email}`);
            }
            catch (emailError) {
                console.error('Failed to send artist rejection email:', emailError);
            }
        }
        else {
            console.warn(`Could not send rejection email: No email found for user ${result.user.id}`);
        }
        res.json({
            message: 'Artist role request rejected successfully',
            user: result.user,
            hasPendingRequest: result.hasPendingRequest
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message.includes('not found, already verified, or rejected')) {
            res
                .status(404)
                .json({ message: 'Artist request not found, already verified, or rejected' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Reject artist request');
    }
};
exports.rejectArtistRequest = rejectArtistRequest;
const deleteArtistRequest = async (req, res) => {
    try {
        const { id } = req.params;
        await adminService.deleteArtistRequest(id);
        res.json({ message: 'Artist request deleted successfully' });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message.includes('not found or already verified/rejected')) {
            res
                .status(404)
                .json({ message: 'Artist request not found or already verified/rejected' });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Delete artist request');
    }
};
exports.deleteArtistRequest = deleteArtistRequest;
const getDashboardStats = async (req, res) => {
    try {
        const statsData = await adminService.getDashboardStats();
        res.json(statsData);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get dashboard stats');
    }
};
exports.getDashboardStats = getDashboardStats;
const handleCacheStatus = async (req, res) => {
    try {
        const { enabled } = req.method === 'POST' ? req.body : {};
        const result = await adminService.updateCacheStatus(enabled);
        res.json(result);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Manage cache status');
    }
};
exports.handleCacheStatus = handleCacheStatus;
const handleAIModelStatus = async (req, res) => {
    try {
        if (req.method === 'GET') {
            const aiStatus = await adminService.getAIModelStatus();
            res.json({ success: true, data: aiStatus });
        }
        else if (req.method === 'POST') {
            const { model } = req.body;
            const result = await adminService.updateAIModel(model);
            res.status(200).json({
                success: true,
                message: 'AI model settings updated successfully',
                data: result,
            });
        }
    }
    catch (error) {
        console.error('Error updating AI model settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update AI model settings',
            error: error instanceof Error ? error.message : String(error),
        });
    }
};
exports.handleAIModelStatus = handleAIModelStatus;
const getSystemStatus = async (req, res) => {
    try {
        const statuses = await adminService.getSystemStatus();
        res.json({ success: true, data: statuses });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get system status');
    }
};
exports.getSystemStatus = getSystemStatus;
//# sourceMappingURL=admin.controller.js.map