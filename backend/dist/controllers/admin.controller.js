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
exports.deleteSystemPlaylistHandler = exports.removeTrackFromSystemPlaylistHandler = exports.fixAlbumTrackTypes = exports.exportTrackAndArtistData = exports.getArtistRoleRequestsHandler = exports.rejectLabelRegistration = exports.approveLabelRegistration = exports.getLabelRegistrationById = exports.getAllLabelRegistrations = exports.reanalyzeTrackHandler = exports.getUserListeningHistoryHandler = exports.getUserAiPlaylistsHandler = exports.updateAiPlaylistVisibilityHandler = exports.generateAndAssignAiPlaylistToUserHandler = exports.bulkUploadTracks = exports.rejectArtistClaimRequest = exports.approveArtistClaimRequest = exports.getArtistClaimRequestDetail = exports.getAllArtistClaimRequests = exports.getSystemStatus = exports.handleAIModelStatus = exports.getDashboardStats = exports.deleteArtistRequest = exports.rejectArtistRequest = exports.approveArtistRequest = exports.deleteGenre = exports.updateGenre = exports.createGenre = exports.getArtistById = exports.getAllArtists = exports.deleteArtist = exports.deleteUser = exports.updateArtist = exports.updateUser = exports.getArtistRequestDetail = exports.getAllArtistRequests = exports.getUserById = exports.getAllUsers = void 0;
const handle_utils_1 = require("../utils/handle-utils");
const adminService = __importStar(require("../services/admin.service"));
const client_1 = require("@prisma/client");
const trackService = __importStar(require("../services/track.service"));
const exceljs_1 = __importDefault(require("exceljs"));
const getAllUsers = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        const { users, pagination } = await adminService.getUsers(req, req.user);
        res.json({ users, pagination });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Get all users");
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await adminService.getUserById(id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json(user);
    }
    catch (error) {
        if (error instanceof Error && error.message === "User not found") {
            res.status(404).json({ message: "User not found" });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, "Get user by id");
    }
};
exports.getUserById = getUserById;
const getAllArtistRequests = async (req, res) => {
    try {
        const { requests, pagination } = await adminService.getArtistRequests(req);
        res.json({ requests, pagination });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Get artist requests");
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
        if (error instanceof Error && error.message === "Request not found") {
            res.status(404).json({ message: "Request not found" });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, "Get artist request details");
    }
};
exports.getArtistRequestDetail = getArtistRequestDetail;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userData = { ...req.body };
        const requestingUser = req.user;
        if (!requestingUser) {
            res
                .status(401)
                .json({ message: "Unauthorized: Requesting user data missing." });
            return;
        }
        const updatedUser = await adminService.updateUserInfo(id, userData, requestingUser);
        res.json({
            message: "User updated successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.startsWith("Permission denied:")) {
                res.status(403).json({ message: error.message });
                return;
            }
            if (error.message === "User not found") {
                res.status(404).json({ message: "User not found" });
                return;
            }
            else if (error.message === "Email already exists" ||
                error.message === "Username already exists") {
                res.status(400).json({ message: error.message });
                return;
            }
            else if (error.message === "Current password is incorrect") {
                res.status(400).json({ message: error.message });
                return;
            }
            else if (error.message.includes("password change")) {
                res.status(400).json({ message: error.message });
                return;
            }
            else if (error.message === "Password must be at least 6 characters long.") {
                res.status(400).json({ message: error.message });
                return;
            }
            else if (error.message === "No valid data provided for update.") {
                res.status(400).json({ message: error.message });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, "Update user");
    }
};
exports.updateUser = updateUser;
const updateArtist = async (req, res) => {
    try {
        const { id } = req.params;
        const artistData = { ...req.body };
        if (!id) {
            res.status(400).json({ message: "Artist ID is required" });
            return;
        }
        const updatedArtist = await adminService.updateArtistInfo(id, artistData);
        res.json({
            message: "Artist updated successfully",
            artist: updatedArtist,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === "Artist not found") {
                res.status(404).json({ message: "Artist not found" });
                return;
            }
            else if (error.message === "Artist name already exists") {
                res.status(400).json({ message: "Artist name already exists" });
                return;
            }
            else if (error.message.includes("Validation failed")) {
                res.status(400).json({ message: error.message });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, "Update artist");
    }
};
exports.updateArtist = updateArtist;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const requestingUser = req.user;
        const { reason } = req.body;
        if (!requestingUser || requestingUser.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: "Forbidden: Admin access required." });
            return;
        }
        await adminService.deleteUserById(id, requestingUser, reason);
        res.json({ message: "User deleted successfully" });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message === "Permission denied: Admins cannot be deleted.") {
            res.status(403).json({ message: error.message });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, "Delete user");
    }
};
exports.deleteUser = deleteUser;
const deleteArtist = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        await adminService.deleteArtistById(id, reason);
        res.json({ message: "Artist deleted permanently" });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Delete artist");
    }
};
exports.deleteArtist = deleteArtist;
const getAllArtists = async (req, res) => {
    try {
        const result = await adminService.getArtists(req);
        res.status(200).json(result);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Get all artists");
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
        if (error instanceof Error && error.message === "Artist not found") {
            res.status(404).json({ message: "Artist not found" });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, "Get artist by id");
    }
};
exports.getArtistById = getArtistById;
const createGenre = async (req, res) => {
    try {
        const { name } = req.body;
        const validationErrors = (0, handle_utils_1.runValidations)([
            (0, handle_utils_1.validateField)(name, "Name", { required: true }),
            name && (0, handle_utils_1.validateField)(name.trim(), "Name", { minLength: 1 }),
            name && (0, handle_utils_1.validateField)(name, "Name", { maxLength: 50 }),
        ]);
        if (validationErrors.length > 0) {
            res
                .status(400)
                .json({ message: "Validation failed", errors: validationErrors });
            return;
        }
        const genre = await adminService.createNewGenre(name);
        res.status(201).json({ message: "Genre created successfully", genre });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message === "Genre name already exists") {
            res.status(400).json({ message: "Genre name already exists" });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, "Create genre");
    }
};
exports.createGenre = createGenre;
const updateGenre = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const validationErrors = (0, handle_utils_1.runValidations)([
            (0, handle_utils_1.validateField)(id, "Genre ID", { required: true }),
            (0, handle_utils_1.validateField)(name, "Name", { required: true }),
            name && (0, handle_utils_1.validateField)(name.trim(), "Name", { minLength: 1 }),
            name && (0, handle_utils_1.validateField)(name, "Name", { maxLength: 50 }),
        ]);
        if (validationErrors.length > 0) {
            res
                .status(400)
                .json({ message: "Validation failed", errors: validationErrors });
            return;
        }
        const updatedGenre = await adminService.updateGenreInfo(id, name);
        res.json({
            message: "Genre updated successfully",
            genre: updatedGenre,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === "Genre not found") {
                res.status(404).json({ message: "Genre not found" });
                return;
            }
            else if (error.message === "Genre name already exists") {
                res.status(400).json({ message: "Genre name already exists" });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, "Update genre");
    }
};
exports.updateGenre = updateGenre;
const deleteGenre = async (req, res) => {
    try {
        const { id } = req.params;
        await adminService.deleteGenreById(id);
        res.json({ message: "Genre deleted successfully" });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Delete genre");
    }
};
exports.deleteGenre = deleteGenre;
const approveArtistRequest = async (req, res) => {
    try {
        const { requestId } = req.body;
        const adminUserId = req.user?.id;
        if (!adminUserId) {
            res
                .status(401)
                .json({ message: "Admin not authenticated or user ID not found." });
            return;
        }
        if (!requestId) {
            res.status(400).json({ message: "Request ID is required." });
            return;
        }
        const result = await adminService.approveArtistRequest(adminUserId, requestId);
        res.json({
            message: result.message,
            data: result.data,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            (error.message.includes("not found") ||
                error.message.includes("cannot be approved") ||
                error.message.includes("User ID missing"))) {
            res.status(404).json({
                message: error.message,
            });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, "Approve artist request");
    }
};
exports.approveArtistRequest = approveArtistRequest;
const rejectArtistRequest = async (req, res) => {
    console.log("!!!!!!!! ORIGINAL rejectArtistRequest CONTROLLER HIT !!!!!!!!");
    try {
        const { requestId, reason } = req.body;
        if (!requestId) {
            res.status(400).json({ message: "Request ID is required." });
            return;
        }
        const result = await adminService.rejectArtistRequest(requestId, reason);
        res.json({
            message: result.message,
            request: result.request,
        });
    }
    catch (error) {
        if (error instanceof Error &&
            (error.message.includes("not found") ||
                error.message.includes("cannot be rejected"))) {
            res.status(404).json({
                message: error.message,
            });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, "Reject artist request");
    }
};
exports.rejectArtistRequest = rejectArtistRequest;
const deleteArtistRequest = async (req, res) => {
    try {
        const { id } = req.params;
        await adminService.deleteArtistRequest(id);
        res.json({ message: "Artist request deleted successfully" });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message.includes("not found or already verified/rejected")) {
            res.status(404).json({
                message: "Artist request not found or already verified/rejected",
            });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, "Delete artist request");
    }
};
exports.deleteArtistRequest = deleteArtistRequest;
const getDashboardStats = async (req, res) => {
    try {
        const statsData = await adminService.getDashboardStats();
        res.json(statsData);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Get dashboard stats");
    }
};
exports.getDashboardStats = getDashboardStats;
const handleAIModelStatus = async (req, res) => {
    try {
        if (req.method === "GET") {
            const aiStatus = await adminService.getAIModelStatus();
            res.json({ success: true, data: aiStatus });
        }
        else if (req.method === "POST") {
            const { model } = req.body;
            const result = await adminService.updateAIModel(model);
            res.status(200).json({
                success: true,
                message: "AI model settings updated successfully",
                data: result,
            });
        }
    }
    catch (error) {
        console.error("Error updating AI model settings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update AI model settings",
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
        (0, handle_utils_1.handleError)(res, error, "Get system status");
    }
};
exports.getSystemStatus = getSystemStatus;
const getAllArtistClaimRequests = async (req, res) => {
    try {
        if (!req.user || req.user.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: "Forbidden: Admin access required." });
            return;
        }
        const { claimRequests, pagination } = await adminService.getArtistClaimRequests(req);
        res.json({ claimRequests, pagination });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Get artist claim requests");
    }
};
exports.getAllArtistClaimRequests = getAllArtistClaimRequests;
const getArtistClaimRequestDetail = async (req, res) => {
    try {
        if (!req.user || req.user.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: "Forbidden: Admin access required." });
            return;
        }
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ message: "Claim Request ID is required." });
            return;
        }
        const claimRequest = await adminService.getArtistClaimRequestDetail(id);
        res.json(claimRequest);
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
            res.status(404).json({ message: error.message });
            return;
        }
        if (error instanceof Error &&
            error.message.includes("no longer available")) {
            res.status(409).json({ message: error.message });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, "Get artist claim request detail");
    }
};
exports.getArtistClaimRequestDetail = getArtistClaimRequestDetail;
const approveArtistClaimRequest = async (req, res) => {
    try {
        const adminUser = req.user;
        if (!adminUser || adminUser.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: "Forbidden: Admin access required." });
            return;
        }
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ message: "Claim Request ID is required." });
            return;
        }
        const result = await adminService.approveArtistClaim(id, adminUser.id);
        res.json(result);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("not found")) {
                res.status(404).json({ message: error.message });
                return;
            }
            if (error.message.includes("Cannot approve claim request") ||
                error.message.includes("no longer available")) {
                res.status(409).json({ message: error.message });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, "Approve artist claim request");
    }
};
exports.approveArtistClaimRequest = approveArtistClaimRequest;
const rejectArtistClaimRequest = async (req, res) => {
    try {
        const adminUser = req.user;
        if (!adminUser || adminUser.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: "Forbidden: Admin access required." });
            return;
        }
        const { id } = req.params;
        const { reason } = req.body;
        if (!id) {
            res.status(400).json({ message: "Claim Request ID is required." });
            return;
        }
        if (!reason || typeof reason !== "string" || reason.trim() === "") {
            res.status(400).json({ message: "Rejection reason is required." });
            return;
        }
        const result = await adminService.rejectArtistClaim(id, adminUser.id, reason);
        res.json(result);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("not found")) {
                res.status(404).json({ message: error.message });
                return;
            }
            if (error.message.includes("Cannot reject claim request") ||
                error.message.includes("Rejection reason is required")) {
                res.status(400).json({ message: error.message });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, "Reject artist claim request");
    }
};
exports.rejectArtistClaimRequest = rejectArtistClaimRequest;
const bulkUploadTracks = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            res.status(400).json({ message: "No files uploaded." });
            return;
        }
        const files = req.files;
        const results = await adminService.processBulkUpload(files);
        res.status(200).json({
            message: "Bulk upload process initiated.",
            createdTracks: results,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Bulk upload tracks");
    }
};
exports.bulkUploadTracks = bulkUploadTracks;
const generateAndAssignAiPlaylistToUserHandler = async (req, res) => {
    const { userId: targetUserId } = req.params;
    const adminUserId = req.user.id;
    const { customPromptKeywords, requestedTrackCount } = req.body;
    if (requestedTrackCount !== undefined &&
        (typeof requestedTrackCount !== "number" ||
            requestedTrackCount < 5 ||
            requestedTrackCount > 100)) {
        res.status(400).json({
            message: "requestedTrackCount must be a number between 5 and 100.",
        });
        return;
    }
    if (customPromptKeywords !== undefined &&
        typeof customPromptKeywords !== "string") {
        res.status(400).json({ message: "customPromptKeywords must be a string." });
        return;
    }
    try {
        const playlist = await adminService.generateAndAssignAiPlaylistToUser(adminUserId, targetUserId, { customPromptKeywords, requestedTrackCount });
        res.status(201).json({
            message: "AI-generated playlist created and assigned successfully.",
            playlist,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Generate AI Playlist for User");
    }
};
exports.generateAndAssignAiPlaylistToUserHandler = generateAndAssignAiPlaylistToUserHandler;
const updateAiPlaylistVisibilityHandler = async (req, res) => {
    try {
        const adminId = req.user?.id;
        const { playlistId } = req.params;
        const { newVisibility } = req.body;
        if (!adminId) {
            res.status(401).json({ message: "Unauthorized: Admin ID missing." });
            return;
        }
        if (!playlistId) {
            res.status(400).json({ message: "Playlist ID is required." });
            return;
        }
        if (!newVisibility ||
            (newVisibility !== "PUBLIC" && newVisibility !== "PRIVATE")) {
            res.status(400).json({
                message: "Invalid newVisibility value. Must be 'PUBLIC' or 'PRIVATE'.",
            });
            return;
        }
        const playlist = await adminService.setAiPlaylistVisibilityForUser(adminId, playlistId, newVisibility);
        res.status(200).json({
            message: `AI Playlist visibility updated to ${newVisibility}.`,
            playlist,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Update AI Playlist Visibility");
    }
};
exports.updateAiPlaylistVisibilityHandler = updateAiPlaylistVisibilityHandler;
const getUserAiPlaylistsHandler = async (req, res) => {
    try {
        const adminId = req.user?.id;
        const { userId: targetUserId } = req.params;
        if (!adminId) {
            res.status(401).json({ message: "Unauthorized: Admin ID missing." });
            return;
        }
        if (!targetUserId) {
            res.status(400).json({ message: "Target User ID is required." });
            return;
        }
        const result = await adminService.getUserAiPlaylists(adminId, targetUserId, req);
        res.status(200).json(result);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Get User AI Playlists");
    }
};
exports.getUserAiPlaylistsHandler = getUserAiPlaylistsHandler;
const getUserListeningHistoryHandler = async (req, res) => {
    try {
        const adminId = req.user?.id;
        const { userId: targetUserId } = req.params;
        if (!adminId) {
            res.status(401).json({ message: "Unauthorized: Admin ID missing." });
            return;
        }
        if (!targetUserId) {
            res.status(400).json({ message: "Target User ID is required." });
            return;
        }
        const result = await adminService.getUserListeningHistoryDetails(adminId, targetUserId, req);
        res.status(200).json(result);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Get User Listening History");
    }
};
exports.getUserListeningHistoryHandler = getUserListeningHistoryHandler;
const reanalyzeTrackHandler = async (req, res) => {
    try {
        const { trackId } = req.params;
        console.log(`[Admin Controller] Received request to re-analyze track: ${trackId}`);
        if (!trackId) {
            res.status(400).json({ message: "Track ID is required" });
            return;
        }
        const updatedTrack = await trackService.reanalyzeTrackAudioFeatures(trackId);
        res.json({
            message: "Track audio features re-analyzed and updated successfully",
            track: updatedTrack,
        });
    }
    catch (error) {
        console.error(`[Admin Controller] Error re-analyzing track ${req.params.trackId}:`, error);
        (0, handle_utils_1.handleError)(res, error, "Re-analyze track");
    }
};
exports.reanalyzeTrackHandler = reanalyzeTrackHandler;
const getAllLabelRegistrations = async (req, res) => {
    try {
        const result = await adminService.getAllLabelRegistrations(req);
        res.json({
            data: result.data,
            pagination: result.pagination,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Admin: Get all label registrations");
    }
};
exports.getAllLabelRegistrations = getAllLabelRegistrations;
const getLabelRegistrationById = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const request = await adminService.getLabelRegistrationById(registrationId);
        res.json({ data: request });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Admin: Get label registration by ID");
    }
};
exports.getLabelRegistrationById = getLabelRegistrationById;
const approveLabelRegistration = async (req, res) => {
    try {
        const adminUserId = req.user?.id;
        if (!adminUserId) {
            res
                .status(401)
                .json({ message: "Admin not authenticated or user ID not found." });
            return;
        }
        const { registrationId } = req.params;
        const result = await adminService.approveLabelRegistration(adminUserId, registrationId);
        res.json({
            message: "Label registration approved successfully.",
            data: result,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Admin: Approve label registration");
    }
};
exports.approveLabelRegistration = approveLabelRegistration;
const rejectLabelRegistration = async (req, res) => {
    try {
        const adminUserId = req.user?.id;
        if (!adminUserId) {
            res
                .status(401)
                .json({ message: "Admin not authenticated or user ID not found." });
            return;
        }
        const { registrationId } = req.params;
        const { reason } = req.body;
        if (!reason) {
            res.status(400).json({ message: "Rejection reason is required." });
            return;
        }
        const result = await adminService.rejectLabelRegistration(adminUserId, registrationId, reason);
        res.json({
            message: "Label registration rejected successfully.",
            data: result,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Admin: Reject label registration");
    }
};
exports.rejectLabelRegistration = rejectLabelRegistration;
const getArtistRoleRequestsHandler = async (req, res) => {
    try {
        const { requests, pagination } = await adminService.getPendingArtistRoleRequests(req);
        res.json({ requests, pagination });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Get artist role requests");
    }
};
exports.getArtistRoleRequestsHandler = getArtistRoleRequestsHandler;
const exportTrackAndArtistData = async (req, res) => {
    try {
        const data = await adminService.extractTrackAndArtistData();
        const workbook = new exceljs_1.default.Workbook();
        const artistsSheet = workbook.addWorksheet("Artists");
        artistsSheet.columns = [
            { header: "ID", key: "id", width: 30 },
            { header: "Name", key: "artistName", width: 30 },
            { header: "User ID", key: "userId", width: 30 },
            { header: "User Email", key: "userEmail", width: 30 },
            { header: "User Username", key: "userUsername", width: 25 },
            { header: "User Name", key: "userName", width: 25 },
            { header: "Bio", key: "bio", width: 60 },
            { header: "Avatar", key: "avatar", width: 40 },
            { header: "Social Media Links", key: "socialMediaLinks", width: 40 },
            { header: "Monthly Listeners", key: "monthlyListeners", width: 15 },
            { header: "Verified", key: "verified", width: 10 },
            { header: "Label", key: "label", width: 25 },
            { header: "Genres", key: "genres", width: 30 },
            { header: "Track Count", key: "trackCount", width: 15 },
            { header: "Created At", key: "createdAt", width: 15 },
        ];
        artistsSheet.addRows(data.artists);
        const albumsSheet = workbook.addWorksheet("Albums");
        albumsSheet.columns = [
            { header: "ID", key: "id", width: 30 },
            { header: "Title", key: "title", width: 40 },
            { header: "Artist", key: "artistName", width: 30 },
            { header: "Artist ID", key: "artistId", width: 30 },
            { header: "Album Type", key: "albumType", width: 15 },
            { header: "Release Date", key: "releaseDate", width: 15 },
            { header: "Total Tracks", key: "totalTracks", width: 15 },
            { header: "Duration (sec)", key: "duration", width: 15 },
            { header: "Label", key: "labelName", width: 25 },
            { header: "Cover URL", key: "coverUrl", width: 40 },
            { header: "Genres", key: "genres", width: 30 },
            { header: "Created At", key: "createdAt", width: 15 },
        ];
        albumsSheet.addRows(data.albums);
        const tracksSheet = workbook.addWorksheet("Tracks");
        tracksSheet.columns = [
            { header: "ID", key: "id", width: 30 },
            { header: "Title", key: "title", width: 40 },
            { header: "Artist", key: "artist", width: 30 },
            { header: "Album", key: "album", width: 30 },
            { header: "Album ID", key: "albumId", width: 30 },
            { header: "Album Type", key: "albumType", width: 15 },
            { header: "Album Release Date", key: "albumReleaseDate", width: 15 },
            { header: "Album Total Tracks", key: "albumTotalTracks", width: 15 },
            { header: "Audio URL", key: "audioUrl", width: 40 },
            { header: "Label Name", key: "labelName", width: 30 },
            {
                header: "Featured Artist Names",
                key: "featuredArtistNames",
                width: 40,
            },
            { header: "Duration (sec)", key: "duration", width: 15 },
            { header: "Release Date", key: "releaseDate", width: 15 },
            { header: "Play Count", key: "playCount", width: 15 },
            { header: "Tempo", key: "tempo", width: 10 },
            { header: "Mood", key: "mood", width: 20 },
            { header: "Key", key: "key", width: 10 },
            { header: "Scale", key: "scale", width: 10 },
            { header: "Danceability", key: "danceability", width: 15 },
            { header: "Energy", key: "energy", width: 15 },
            { header: "Genres", key: "genres", width: 30 },
            { header: "Cover URL", key: "coverUrl", width: 40 },
        ];
        tracksSheet.addRows(data.tracks);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=soundwave_data_export_${new Date()
            .toISOString()
            .slice(0, 10)}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Export track and artist data");
    }
};
exports.exportTrackAndArtistData = exportTrackAndArtistData;
const fixAlbumTrackTypes = async (req, res) => {
    try {
        if (!req.user || req.user.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: "Forbidden: Admin access required." });
            return;
        }
        const result = await adminService.fixAlbumTrackTypeConsistency();
        if (result.success) {
            res.status(200).json(result);
        }
        else {
            res.status(500).json(result);
        }
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Fix album track types");
    }
};
exports.fixAlbumTrackTypes = fixAlbumTrackTypes;
const removeTrackFromSystemPlaylistHandler = async (req, res) => {
    try {
        const adminUser = req.user;
        if (!adminUser || adminUser.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: "Forbidden: Admin access required." });
            return;
        }
        const { playlistId, trackId } = req.params;
        if (!playlistId || !trackId) {
            res
                .status(400)
                .json({ message: "Playlist ID and Track ID are required." });
            return;
        }
        const updatedPlaylist = await adminService.removeTrackFromSystemPlaylist(adminUser.id, playlistId, trackId);
        res.status(200).json({
            message: "Track removed from system playlist successfully.",
            playlist: updatedPlaylist,
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, "Remove track from system playlist");
    }
};
exports.removeTrackFromSystemPlaylistHandler = removeTrackFromSystemPlaylistHandler;
const deleteSystemPlaylistHandler = async (req, res) => {
    try {
        const adminUser = req.user;
        if (!adminUser || adminUser.role !== client_1.Role.ADMIN) {
            res.status(403).json({ message: "Forbidden: Admin access required." });
            return;
        }
        const { playlistId } = req.params;
        if (!playlistId) {
            res.status(400).json({ message: "Playlist ID is required." });
            return;
        }
        await adminService.deleteSystemPlaylist(playlistId, adminUser.id);
        res.status(200).json({ message: "System playlist deleted successfully." });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
            res.status(404).json({ message: error.message });
        }
        else if (error instanceof Error &&
            error.message.includes("not allowed")) {
            res.status(403).json({ message: error.message });
        }
        else {
            (0, handle_utils_1.handleError)(res, error, "Delete system playlist");
        }
    }
};
exports.deleteSystemPlaylistHandler = deleteSystemPlaylistHandler;
//# sourceMappingURL=admin.controller.js.map