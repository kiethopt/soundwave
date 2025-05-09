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
exports.fixAlbumTrackTypeConsistency = exports.extractTrackAndArtistData = exports.getPendingArtistRoleRequests = exports.rejectLabelRegistration = exports.approveLabelRegistration = exports.getLabelRegistrationById = exports.getAllLabelRegistrations = exports.getUserListeningHistoryDetails = exports.getUserAiPlaylists = exports.setAiPlaylistVisibilityForUser = exports.generateAndAssignAiPlaylistToUser = exports.processBulkUpload = exports.rejectArtistClaim = exports.approveArtistClaim = exports.getArtistClaimRequestDetail = exports.getArtistClaimRequests = exports.updateAIModel = exports.getAIModelStatus = exports.getSystemStatus = exports.getDashboardStats = exports.deleteArtistRequest = exports.rejectArtistRequest = exports.approveArtistRequest = exports.deleteGenreById = exports.updateGenreInfo = exports.createNewGenre = exports.getGenres = exports.getArtistById = exports.getArtists = exports.deleteArtistById = exports.deleteUserById = exports.updateArtistInfo = exports.updateUserInfo = exports.getArtistRequestDetail = exports.getArtistRequests = exports.getUserById = exports.getUsers = void 0;
exports.getOrCreateVerifiedArtistProfile = getOrCreateVerifiedArtistProfile;
const client_1 = require("@prisma/client");
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const handle_utils_1 = require("../utils/handle-utils");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cache_middleware_1 = require("../middleware/cache.middleware");
const email_service_1 = require("./email.service");
const bcrypt_1 = __importDefault(require("bcrypt"));
const date_fns_1 = require("date-fns");
const emailService = __importStar(require("./email.service"));
const socket_1 = require("../config/socket");
const socket_2 = require("../config/socket");
const upload_service_1 = require("./upload.service");
const mm = __importStar(require("music-metadata"));
const essentia_js_1 = require("essentia.js");
const mpg123_decoder_1 = require("mpg123-decoder");
const aiService = __importStar(require("./ai.service"));
const errors_1 = require("../utils/errors");
const VALID_GEMINI_MODELS = [
    "gemini-2.5-flash-preview-04-17",
    "gemini-2.5-pro-preview-03-25",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
];
const getUsers = async (req, requestingUser) => {
    const { search, status, sortBy, sortOrder } = req.query;
    const where = {
        id: { not: requestingUser.id },
    };
    if (search && typeof search === "string") {
        where.OR = [
            { email: { contains: search, mode: "insensitive" } },
            { username: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
        ];
    }
    if (status && typeof status === "string" && status !== "ALL") {
        where.isActive = status === "true";
    }
    let orderBy = { createdAt: "desc" };
    const validSortFields = [
        "name",
        "email",
        "username",
        "role",
        "isActive",
        "createdAt",
        "lastLoginAt",
    ];
    if (sortBy &&
        typeof sortBy === "string" &&
        validSortFields.includes(sortBy)) {
        const direction = sortOrder === "asc" ? "asc" : "desc";
        orderBy = { [sortBy]: direction };
    }
    const options = {
        where,
        select: prisma_selects_1.userSelect,
        orderBy,
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
        throw new Error("User not found");
    }
    return user;
};
exports.getUserById = getUserById;
const getArtistRequests = async (req) => {
    const { search, startDate, endDate } = req.query;
    const where = {
        verificationRequestedAt: { not: null },
        user: {
            isActive: true,
        },
        isVerified: false,
        AND: [],
    };
    if (typeof search === "string" && search.trim()) {
        const trimmedSearch = search.trim();
        if (Array.isArray(where.AND)) {
            where.AND.push({
                OR: [
                    { artistName: { contains: trimmedSearch, mode: "insensitive" } },
                    { user: { name: { contains: trimmedSearch, mode: "insensitive" } } },
                    {
                        user: { email: { contains: trimmedSearch, mode: "insensitive" } },
                    },
                ],
            });
        }
    }
    const dateFilter = {};
    if (typeof startDate === "string" && startDate) {
        try {
            const startOfDay = new Date(startDate);
            startOfDay.setUTCHours(0, 0, 0, 0);
            dateFilter.gte = startOfDay;
        }
        catch (e) {
            console.error("Invalid start date format:", startDate);
        }
    }
    if (typeof endDate === "string" && endDate) {
        try {
            const endOfDay = new Date(endDate);
            endOfDay.setUTCHours(23, 59, 59, 999);
            dateFilter.lte = endOfDay;
        }
        catch (e) {
            console.error("Invalid end date format:", endDate);
        }
    }
    if (dateFilter.gte || dateFilter.lte) {
        if (Array.isArray(where.AND)) {
            where.AND.push({ verificationRequestedAt: dateFilter });
        }
    }
    const options = {
        where,
        select: prisma_selects_1.artistRequestSelect,
        orderBy: { verificationRequestedAt: "desc" },
    };
    const result = await (0, handle_utils_1.paginate)(db_1.default.artistProfile, req, options);
    return {
        requests: result.data,
        pagination: result.pagination,
    };
};
exports.getArtistRequests = getArtistRequests;
const getArtistRequestDetail = async (id) => {
    let requestData = await db_1.default.artistProfile.findUnique({
        where: { id },
        select: prisma_selects_1.artistRequestDetailsSelect,
    });
    if (!requestData) {
        requestData = await db_1.default.artistProfile.findFirst({
            where: {
                userId: id,
                verificationRequestedAt: { not: null },
            },
            select: prisma_selects_1.artistRequestDetailsSelect,
        });
    }
    if (!requestData) {
        const artistRoleRequest = await db_1.default.artistRequest.findUnique({
            where: { id },
            select: {
                id: true,
                artistName: true,
                bio: true,
                status: true,
                requestedLabelName: true,
                rejectionReason: true,
                socialMediaLinks: true,
                avatarUrl: true,
                requestedGenres: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        });
        if (artistRoleRequest) {
            return { ...artistRoleRequest, _sourceTable: 'ArtistRequest' };
        }
    }
    if (!requestData) {
        throw new Error("Request not found");
    }
    return { ...requestData, _sourceTable: 'ArtistProfile' };
};
exports.getArtistRequestDetail = getArtistRequestDetail;
const updateUserInfo = async (id, data, requestingUser) => {
    const { name, username, email, newPassword, isActive, reason } = data;
    const existingUser = await db_1.default.user.findUnique({ where: { id } });
    if (!existingUser) {
        throw new Error("User not found");
    }
    if (requestingUser.role !== client_1.Role.ADMIN && existingUser.role === client_1.Role.ADMIN) {
        throw new Error(`Permission denied: Cannot modify Admin users.`);
    }
    if (requestingUser.role === client_1.Role.ADMIN &&
        requestingUser.id !== id &&
        existingUser.role === client_1.Role.ADMIN) {
        throw new Error(`Permission denied: Admins cannot modify other Admin users.`);
    }
    const updateData = {};
    if (name !== undefined) {
        updateData.name = name;
    }
    if (email !== undefined && email !== existingUser.email) {
        const existingEmail = await db_1.default.user.findFirst({
            where: { email, NOT: { id } },
        });
        if (existingEmail)
            throw new Error("Email already exists");
        updateData.email = email;
    }
    if (username !== undefined && username !== existingUser.username) {
        const existingUsername = await db_1.default.user.findFirst({
            where: { username, NOT: { id } },
        });
        if (existingUsername)
            throw new Error("Username already exists");
        updateData.username = username;
    }
    if (isActive !== undefined) {
        const isActiveBool = (0, handle_utils_1.toBooleanValue)(isActive);
        if (isActiveBool === undefined) {
            throw new Error("Invalid value for isActive status");
        }
        if (requestingUser.id === id && !isActiveBool) {
            throw new Error("Permission denied: Cannot deactivate your own account.");
        }
        updateData.isActive = isActiveBool;
    }
    if (newPassword) {
        if (newPassword.length < 6) {
            throw new Error("Password must be at least 6 characters long.");
        }
        updateData.password = await bcrypt_1.default.hash(newPassword, 10);
    }
    if (Object.keys(updateData).length === 0) {
        throw new Error("No valid data provided for update.");
    }
    const updatedUser = await db_1.default.user.update({
        where: { id },
        data: updateData,
        select: prisma_selects_1.userSelect,
    });
    if (updateData.isActive !== undefined &&
        updateData.isActive !== existingUser.isActive) {
        const userName = updatedUser.name || updatedUser.username || "User";
        if (updatedUser.isActive === false) {
            db_1.default.notification
                .create({
                data: {
                    type: "ACCOUNT_DEACTIVATED",
                    message: `Your account has been deactivated.${reason ? ` Reason: ${reason}` : ""}`,
                    recipientType: "USER",
                    userId: id,
                    isRead: false,
                },
            })
                .catch((err) => console.error("[Async Notify Error] Failed to create deactivation notification:", err));
            if (updatedUser.email) {
                try {
                    const emailOptions = emailService.createAccountDeactivatedEmail(updatedUser.email, userName, "user", reason);
                    emailService
                        .sendEmail(emailOptions)
                        .catch((err) => console.error("[Async Email Error] Failed to send deactivation email:", err));
                }
                catch (syncError) {
                    console.error("[Email Setup Error] Failed to create deactivation email options:", syncError);
                }
            }
        }
        else if (updatedUser.isActive === true) {
            db_1.default.notification
                .create({
                data: {
                    type: "ACCOUNT_ACTIVATED",
                    message: "Your account has been reactivated.",
                    recipientType: "USER",
                    userId: id,
                    isRead: false,
                },
            })
                .catch((err) => console.error("[Async Notify Error] Failed to create activation notification:", err));
            if (updatedUser.email) {
                try {
                    const emailOptions = emailService.createAccountActivatedEmail(updatedUser.email, userName, "user");
                    emailService
                        .sendEmail(emailOptions)
                        .catch((err) => console.error("[Async Email Error] Failed to send activation email:", err));
                }
                catch (syncError) {
                    console.error("[Email Setup Error] Failed to create activation email options:", syncError);
                }
            }
        }
    }
    return updatedUser;
};
exports.updateUserInfo = updateUserInfo;
const updateArtistInfo = async (id, data) => {
    const { artistName, bio, isActive, reason } = data;
    const existingArtist = await db_1.default.artistProfile.findUnique({
        where: { id },
        select: {
            id: true,
            artistName: true,
            isActive: true,
            userId: true,
            user: { select: { id: true, email: true, name: true, username: true } },
        },
    });
    if (!existingArtist) {
        throw new Error("Artist not found");
    }
    const validationErrors = [];
    if (artistName !== undefined) {
        if (artistName.length < 3) {
            validationErrors.push("Artist name must be at least 3 characters");
        }
        if (artistName.length > 100) {
            validationErrors.push("Artist name cannot exceed 100 characters");
        }
    }
    if (bio !== undefined && bio.length > 1000) {
        validationErrors.push("Biography cannot exceed 1000 characters");
    }
    if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
    }
    let validatedArtistName = undefined;
    if (artistName && artistName !== existingArtist.artistName) {
        const nameExists = await db_1.default.artistProfile.findFirst({
            where: {
                artistName,
                id: { not: id },
            },
        });
        if (nameExists) {
            throw new Error("Artist name already exists");
        }
        validatedArtistName = artistName;
    }
    const updateData = {};
    if (validatedArtistName !== undefined) {
        updateData.artistName = validatedArtistName;
    }
    if (bio !== undefined) {
        updateData.bio = bio;
    }
    if (isActive !== undefined) {
        const isActiveBool = (0, handle_utils_1.toBooleanValue)(isActive);
        if (isActiveBool === undefined) {
            throw new Error("Invalid value for isActive status");
        }
        updateData.isActive = isActiveBool;
    }
    if (Object.keys(updateData).length === 0) {
        throw new Error("No valid data provided for update");
    }
    const updatedArtist = await db_1.default.artistProfile.update({
        where: { id },
        data: updateData,
        select: prisma_selects_1.artistProfileSelect,
    });
    if (isActive !== undefined &&
        existingArtist.isActive !== updatedArtist.isActive) {
        const ownerUser = existingArtist.user;
        const ownerUserName = ownerUser?.name || ownerUser?.username || "Artist";
        if (updatedArtist.isActive === false) {
            if (ownerUser?.id) {
                db_1.default.notification
                    .create({
                    data: {
                        type: "ACCOUNT_DEACTIVATED",
                        message: `Your artist account has been deactivated.${reason ? ` Reason: ${reason}` : ""}`,
                        recipientType: "USER",
                        userId: ownerUser.id,
                        isRead: false,
                    },
                })
                    .catch((err) => console.error("[Async Notify Error] Failed to create artist deactivation notification:", err));
            }
            if (ownerUser?.email) {
                try {
                    const emailOptions = emailService.createAccountDeactivatedEmail(ownerUser.email, ownerUserName, "artist", reason);
                    emailService
                        .sendEmail(emailOptions)
                        .catch((err) => console.error("[Async Email Error] Failed to send artist deactivation email:", err));
                }
                catch (syncError) {
                    console.error("[Email Setup Error] Failed to create artist deactivation email options:", syncError);
                }
            }
        }
        else if (updatedArtist.isActive === true) {
            if (ownerUser?.id) {
                db_1.default.notification
                    .create({
                    data: {
                        type: "ACCOUNT_ACTIVATED",
                        message: "Your artist account has been reactivated.",
                        recipientType: "USER",
                        userId: ownerUser.id,
                        isRead: false,
                    },
                })
                    .catch((err) => console.error("[Async Notify Error] Failed to create artist activation notification:", err));
            }
            if (ownerUser?.email) {
                try {
                    const emailOptions = emailService.createAccountActivatedEmail(ownerUser.email, ownerUserName, "artist");
                    emailService
                        .sendEmail(emailOptions)
                        .catch((err) => console.error("[Async Email Error] Failed to send artist activation email:", err));
                }
                catch (syncError) {
                    console.error("[Email Setup Error] Failed to create artist activation email options:", syncError);
                }
            }
        }
    }
    return updatedArtist;
};
exports.updateArtistInfo = updateArtistInfo;
const deleteUserById = async (id, requestingUser, reason) => {
    const userToDelete = await db_1.default.user.findUnique({
        where: { id },
        select: { role: true, email: true, name: true, username: true },
    });
    if (!userToDelete) {
        throw new Error("User not found");
    }
    if (!requestingUser || !requestingUser.role) {
        throw new Error("Permission denied: Invalid requesting user data.");
    }
    if (userToDelete.role === client_1.Role.ADMIN) {
        if (requestingUser.id === id) {
            throw new Error("Permission denied: Admins cannot delete themselves.");
        }
        throw new Error("Permission denied: Admins cannot delete other admins.");
    }
    await db_1.default.user.delete({ where: { id } });
    return {
        message: `User ${id} deleted successfully. Reason: ${reason || "No reason provided"}`,
    };
};
exports.deleteUserById = deleteUserById;
const deleteArtistById = async (id, reason) => {
    const artistToDelete = await db_1.default.artistProfile.findUnique({
        where: { id },
        select: {
            id: true,
            artistName: true,
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    username: true,
                },
            },
        },
    });
    if (!artistToDelete) {
        throw new Error("Artist not found");
    }
    const associatedUser = artistToDelete.user;
    if (associatedUser && associatedUser.email) {
        try {
            const nameToSend = artistToDelete.artistName ||
                associatedUser.name ||
                associatedUser.username ||
                "Artist";
            const emailOptions = emailService.createAccountDeletedEmail(associatedUser.email, nameToSend, reason);
            emailService
                .sendEmail(emailOptions)
                .catch((err) => console.error("[Async Email Error] Failed to send artist account deletion email:", err));
        }
        catch (syncError) {
            console.error("[Email Setup Error] Failed to create artist deletion email options:", syncError);
        }
    }
    await db_1.default.artistProfile.delete({ where: { id: artistToDelete.id } });
    return {
        message: `Artist ${id} deleted permanently. Reason: ${reason || "No reason provided"}`,
    };
};
exports.deleteArtistById = deleteArtistById;
const getArtists = async (req) => {
    const { search, status, sortBy, sortOrder } = req.query;
    const where = {
        role: client_1.Role.ARTIST,
    };
    if (search && typeof search === "string") {
        where.OR = [
            { artistName: { contains: search, mode: "insensitive" } },
            { user: { email: { contains: search, mode: "insensitive" } } },
            { user: { name: { contains: search, mode: "insensitive" } } },
        ];
    }
    if (status && typeof status === "string" && status !== "ALL") {
        where.isActive = status === "true";
    }
    let orderBy = {
        createdAt: "desc",
    };
    const validSortFields = [
        "artistName",
        "isActive",
        "monthlyListeners",
        "createdAt",
    ];
    if (sortBy &&
        typeof sortBy === "string" &&
        validSortFields.includes(sortBy)) {
        const direction = sortOrder === "asc" ? "asc" : "desc";
        orderBy = { [sortBy]: direction };
    }
    const options = {
        where,
        select: prisma_selects_1.artistProfileSelect,
        orderBy,
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
                orderBy: { releaseDate: "desc" },
                select: prisma_selects_1.artistProfileSelect.albums.select,
            },
            tracks: {
                where: {
                    type: "SINGLE",
                    albumId: null,
                },
                orderBy: { releaseDate: "desc" },
                select: prisma_selects_1.artistProfileSelect.tracks.select,
            },
        },
    });
    if (!artist) {
        throw new Error("Artist not found");
    }
    return artist;
};
exports.getArtistById = getArtistById;
const getGenres = async (req) => {
    const { search = "" } = req.query;
    const where = search
        ? {
            name: {
                contains: String(search),
                mode: "insensitive",
            },
        }
        : {};
    const options = {
        where,
        select: prisma_selects_1.genreSelect,
        orderBy: { createdAt: "desc" },
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
        where: { name: { equals: name, mode: "insensitive" } },
    });
    if (existingGenre) {
        throw new Error("Genre name already exists");
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
        throw new Error("Genre not found");
    }
    if (name.toLowerCase() !== existingGenre.name.toLowerCase()) {
        const existingGenreWithName = await db_1.default.genre.findFirst({
            where: {
                name: { equals: name, mode: "insensitive" },
                NOT: { id },
            },
        });
        if (existingGenreWithName) {
            throw new Error("Genre name already exists");
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
const approveArtistRequest = async (adminUserId, artistRequestId) => {
    const artistRequest = await db_1.default.artistRequest.findUnique({
        where: { id: artistRequestId },
        select: {
            id: true,
            userId: true,
            artistName: true,
            bio: true,
            avatarUrl: true,
            socialMediaLinks: true,
            requestedGenres: true,
            requestedLabelName: true,
            status: true,
            user: { select: { id: true, email: true, name: true, username: true } },
        },
    });
    if (!artistRequest) {
        throw new Error("Artist request not found.");
    }
    if (artistRequest.status !== client_1.RequestStatus.PENDING) {
        throw new Error(`Artist request cannot be approved as it is already in '${artistRequest.status}' status.`);
    }
    if (!artistRequest.userId) {
        throw new Error("User ID missing from artist request, cannot create artist profile.");
    }
    const updatedData = await db_1.default.$transaction(async (tx) => {
        const userArtistProfile = await tx.artistProfile.upsert({
            where: { userId: artistRequest.userId },
            update: {
                artistName: artistRequest.artistName,
                bio: artistRequest.bio,
                avatar: artistRequest.avatarUrl,
                socialMediaLinks: artistRequest.socialMediaLinks || client_1.Prisma.JsonNull,
                isVerified: true,
                verifiedAt: new Date(),
                role: client_1.Role.ARTIST,
                isActive: true,
                verificationRequestedAt: null,
            },
            create: {
                userId: artistRequest.userId,
                artistName: artistRequest.artistName,
                bio: artistRequest.bio,
                avatar: artistRequest.avatarUrl,
                socialMediaLinks: artistRequest.socialMediaLinks || client_1.Prisma.JsonNull,
                role: client_1.Role.ARTIST,
                isVerified: true,
                verifiedAt: new Date(),
                isActive: true,
                monthlyListeners: 0,
            },
            select: { id: true, userId: true, artistName: true, labelId: true, user: { select: prisma_selects_1.userSelect }, label: true },
        });
        let finalLabelId = userArtistProfile.labelId;
        let createdLabelViaRequest = false;
        if (artistRequest.requestedLabelName) {
            const labelRecord = await tx.label.upsert({
                where: { name: artistRequest.requestedLabelName },
                update: {},
                create: { name: artistRequest.requestedLabelName, description: "Created via artist request" },
                select: { id: true },
            });
            finalLabelId = labelRecord.id;
            createdLabelViaRequest = true;
            await tx.artistProfile.update({
                where: { id: userArtistProfile.id },
                data: { labelId: finalLabelId },
            });
        }
        if (createdLabelViaRequest && finalLabelId && artistRequest.requestedLabelName) {
            await tx.labelRegistrationRequest.create({
                data: {
                    requestedLabelName: artistRequest.requestedLabelName,
                    requestingArtistId: userArtistProfile.id,
                    status: client_1.RequestStatus.APPROVED,
                    submittedAt: new Date(),
                    reviewedAt: new Date(),
                    reviewedByAdminId: adminUserId,
                    createdLabelId: finalLabelId,
                }
            });
        }
        const finalArtistRequest = await tx.artistRequest.update({
            where: { id: artistRequestId },
            data: {
                status: client_1.RequestStatus.APPROVED,
            },
            select: { id: true, status: true, userId: true, artistName: true }
        });
        const finalPopulatedProfile = await tx.artistProfile.findUnique({
            where: { id: userArtistProfile.id },
            include: { user: { select: prisma_selects_1.userSelect }, label: true }
        });
        if (!finalPopulatedProfile) {
            throw new Error("Failed to retrieve final populated artist profile after transaction.");
        }
        return { artistRequest: finalArtistRequest, artistProfile: finalPopulatedProfile };
    });
    const userForNotification = artistRequest.user;
    if (userForNotification) {
        db_1.default.notification.create({
            data: {
                type: "ARTIST_REQUEST_APPROVE",
                message: `Congratulations! Your request to become artist '${artistRequest.artistName}' has been approved. Your artist profile is now active.`,
                recipientType: "USER",
                userId: userForNotification.id,
                artistId: updatedData.artistProfile.id,
                isRead: false,
            },
        }).catch((err) => console.error("[Service Notify Error] Failed to create approval notification:", err));
        if (userForNotification.email) {
            try {
                const emailOptions = emailService.createArtistRequestApprovedEmail(userForNotification.email, userForNotification.name || userForNotification.username || "User");
                emailService.sendEmail(emailOptions).catch((err) => console.error("[Service Email Error] Failed to send approval email:", err));
            }
            catch (syncError) {
                console.error("[Email Setup Error] Failed to create approval email options:", syncError);
            }
        }
        else {
            console.warn(`Could not send approval email: No email found for user ${userForNotification.id}`);
        }
    }
    else {
        console.error("[Approve Request Service] User data missing on ArtistRequest for notification/email.");
    }
    return {
        message: "Artist request approved successfully.",
        data: updatedData,
    };
};
exports.approveArtistRequest = approveArtistRequest;
const rejectArtistRequest = async (artistRequestId, rejectionReason) => {
    const artistRequest = await db_1.default.artistRequest.findUnique({
        where: {
            id: artistRequestId,
        },
        select: {
            id: true,
            status: true,
            userId: true,
            artistName: true,
            user: { select: { id: true, email: true, name: true, username: true } }
        },
    });
    if (!artistRequest) {
        throw new Error("Artist request not found.");
    }
    if (artistRequest.status !== client_1.RequestStatus.PENDING) {
        throw new Error(`Artist request cannot be rejected as it is already in '${artistRequest.status}' status.`);
    }
    const updatedRequest = await db_1.default.artistRequest.update({
        where: { id: artistRequestId },
        data: {
            status: client_1.RequestStatus.REJECTED,
            rejectionReason: rejectionReason || "No reason provided",
        },
        select: {
            id: true,
            userId: true,
            status: true,
            user: { select: { id: true, email: true, name: true, username: true } },
            artistName: true,
            rejectionReason: true
        }
    });
    if (updatedRequest.user) {
        let notificationMessage = `Your request to become artist '${updatedRequest.artistName}' has been rejected.`;
        if (updatedRequest.rejectionReason && updatedRequest.rejectionReason !== "No reason provided") {
            notificationMessage += ` Reason: ${updatedRequest.rejectionReason}`;
        }
        db_1.default.notification.create({
            data: {
                type: "ARTIST_REQUEST_REJECT",
                message: notificationMessage,
                recipientType: "USER",
                userId: updatedRequest.user.id,
                isRead: false,
            },
            select: {
                id: true, type: true, message: true, recipientType: true, isRead: true, createdAt: true,
                userId: true,
            }
        }).catch(err => console.error("[Service Notify Error] Failed to create rejection notification:", err));
        if (updatedRequest.user.email) {
            try {
                const emailOptions = emailService.createArtistRequestRejectedEmail(updatedRequest.user.email, updatedRequest.user.name || updatedRequest.user.username || "User", updatedRequest.rejectionReason || undefined);
                emailService.sendEmail(emailOptions).catch(err => console.error("[Service Email Error] Failed to send rejection email:", err));
                console.log(`Artist rejection email sent to ${updatedRequest.user.email}`);
            }
            catch (emailError) {
                console.error("Failed to setup artist rejection email:", emailError);
            }
        }
        else {
            console.warn(`Could not send rejection email: No email found for user ${updatedRequest.user.id}`);
        }
    }
    return {
        message: "Artist request rejected successfully.",
        request: updatedRequest,
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
        throw new Error("Artist request not found or not in a deletable state (e.g., approved).");
    }
    await db_1.default.artistProfile.delete({
        where: { id: requestId },
    });
    return { deletedRequestId: requestId };
};
exports.deleteArtistRequest = deleteArtistRequest;
const getDashboardStats = async () => {
    const coreStatsPromise = Promise.all([
        db_1.default.user.count({ where: { role: { not: client_1.Role.ADMIN } } }),
        db_1.default.artistProfile.count({
            where: { role: client_1.Role.ARTIST, isVerified: true },
        }),
        db_1.default.artistRequest.count({ where: { status: client_1.RequestStatus.PENDING } }),
        db_1.default.artistProfile.findMany({
            where: { role: client_1.Role.ARTIST, isVerified: true },
            orderBy: [{ monthlyListeners: "desc" }],
            take: 4,
            select: {
                id: true,
                artistName: true,
                avatar: true,
                monthlyListeners: true,
            },
        }),
        db_1.default.genre.count(),
        db_1.default.label.count(),
        db_1.default.album.count({ where: { isActive: true } }),
        db_1.default.track.count({ where: { isActive: true } }),
        db_1.default.playlist.count({
            where: { type: client_1.PlaylistType.SYSTEM, userId: null },
        }),
    ]);
    const monthlyUserDataPromise = (async () => {
        const monthlyData = [];
        const allMonths = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const monthDate = (0, date_fns_1.subMonths)(now, i);
            const endOfMonthDate = (0, date_fns_1.endOfMonth)(monthDate);
            const monthLabel = allMonths[monthDate.getMonth()];
            const userCount = await db_1.default.user.count({
                where: {
                    createdAt: { lte: endOfMonthDate },
                },
            });
            monthlyData.push({ month: monthLabel, users: userCount });
        }
        return monthlyData;
    })();
    const [coreStats, monthlyUserData] = await Promise.all([
        coreStatsPromise,
        monthlyUserDataPromise,
    ]);
    const [totalUsers, totalArtists, totalArtistRequests, topArtists, totalGenres, totalLabels, totalAlbums, totalTracks, totalSystemPlaylists,] = coreStats;
    return {
        totalUsers,
        totalArtists,
        totalArtistRequests,
        totalGenres,
        totalLabels,
        totalAlbums,
        totalTracks,
        totalSystemPlaylists,
        topArtists: topArtists.map((artist) => ({
            id: artist.id,
            artistName: artist.artistName,
            avatar: artist.avatar,
            monthlyListeners: artist.monthlyListeners,
        })),
        monthlyUserData,
        updatedAt: new Date().toISOString(),
    };
};
exports.getDashboardStats = getDashboardStats;
const getSystemStatus = async () => {
    const statuses = [];
    try {
        await db_1.default.$queryRaw `SELECT 1`;
        statuses.push({ name: "Database (PostgreSQL)", status: "Available" });
    }
    catch (error) {
        console.error("[System Status] Database check failed:", error);
        statuses.push({
            name: "Database (PostgreSQL)",
            status: "Outage",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
    const useRedis = process.env.USE_REDIS_CACHE === "true";
    if (useRedis) {
        if (cache_middleware_1.client && typeof cache_middleware_1.client.ping === "function") {
            try {
                if (!cache_middleware_1.client.isOpen) {
                    statuses.push({
                        name: "Cache (Redis)",
                        status: "Outage",
                        message: "Client not connected",
                    });
                }
                else {
                    await cache_middleware_1.client.ping();
                    statuses.push({ name: "Cache (Redis)", status: "Available" });
                }
            }
            catch (error) {
                console.error("[System Status] Redis ping failed:", error);
                statuses.push({
                    name: "Cache (Redis)",
                    status: "Issue",
                    message: error instanceof Error ? error.message : "Ping failed",
                });
            }
        }
        else {
            console.warn("[System Status] Redis client seems uninitialized or mock.");
            statuses.push({
                name: "Cache (Redis)",
                status: "Issue",
                message: "Redis client not properly initialized or is a mock.",
            });
        }
    }
    else {
        statuses.push({
            name: "Cache (Redis)",
            status: "Disabled",
            message: "USE_REDIS_CACHE is false",
        });
    }
    try {
        const cloudinary = (await Promise.resolve().then(() => __importStar(require("cloudinary")))).v2;
        const pingResult = await cloudinary.api.ping();
        if (pingResult?.status === "ok") {
            statuses.push({
                name: "Cloudinary (Media Storage)",
                status: "Available",
            });
        }
        else {
            statuses.push({
                name: "Cloudinary (Media Storage)",
                status: "Issue",
                message: `Ping failed or unexpected status: ${pingResult?.status}`,
            });
        }
    }
    catch (error) {
        console.error("[System Status] Cloudinary check failed:", error);
        statuses.push({
            name: "Cloudinary (Media Storage)",
            status: "Outage",
            message: error instanceof Error ? error.message : "Connection or Auth failed",
        });
    }
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
        try {
            const { GoogleGenerativeAI } = await Promise.resolve().then(() => __importStar(require("@google/generative-ai")));
            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
            const model = genAI.getGenerativeModel({ model: modelName });
            await model.countTokens("test");
            statuses.push({
                name: "Gemini SDK",
                status: "Available",
                message: `API Key valid. Configured model: ${modelName}`,
            });
        }
        catch (error) {
            console.error("[System Status] Gemini AI check failed:", error);
            statuses.push({
                name: "Gemini SDK",
                status: "Issue",
                message: error.message || "Failed to initialize or connect to Gemini",
            });
        }
    }
    else {
        statuses.push({
            name: "Gemini SDK",
            status: "Disabled",
            message: "GEMINI_API_KEY not set",
        });
    }
    const acrHost = process.env.ACRCLOUD_HOST;
    const acrKey = process.env.ACRCLOUD_ACCESS_KEY;
    const acrSecret = process.env.ACRCLOUD_ACCESS_SECRET;
    if (acrHost && acrKey && acrSecret) {
        statuses.push({ name: "ACRCloud (Copyright Check)", status: "Available", message: "SDK configured with credentials." });
    }
    else {
        statuses.push({
            name: "ACRCloud (Copyright Check)",
            status: "Disabled",
            message: "ACRCloud credentials not set in .env",
        });
    }
    if (email_service_1.transporter) {
        try {
            const verified = await email_service_1.transporter.verify();
            if (verified) {
                statuses.push({ name: "Email (Nodemailer)", status: "Available" });
            }
            else {
                statuses.push({
                    name: "Email (Nodemailer)",
                    status: "Issue",
                    message: "Verification returned false",
                });
            }
        }
        catch (error) {
            console.error("[System Status] Nodemailer verification failed:", error);
            statuses.push({
                name: "Email (Nodemailer)",
                status: "Outage",
                message: error.message || "Verification failed",
            });
        }
    }
    else {
        statuses.push({
            name: "Email (Nodemailer)",
            status: "Disabled",
            message: "SMTP configuration incomplete or transporter not initialized",
        });
    }
    return statuses;
};
exports.getSystemStatus = getSystemStatus;
const getAIModelStatus = async () => {
    const currentModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    return {
        model: currentModel,
        validModels: VALID_GEMINI_MODELS,
    };
};
exports.getAIModelStatus = getAIModelStatus;
const updateAIModel = async (model) => {
    try {
        const validModels = [
            "gemini-2.5-flash-preview-04-17",
            "gemini-2.5-pro-preview-05-06",
            "gemini-2.0-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
        ];
        const currentModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
        const isEnabled = !!process.env.GEMINI_API_KEY;
        if (model === undefined) {
            return {
                success: true,
                message: "Current AI model settings retrieved",
                data: {
                    model: currentModel,
                    enabled: isEnabled,
                    validModels,
                },
            };
        }
        if (!validModels.includes(model)) {
            throw new Error(`Invalid model name. Valid models are: ${validModels.join(", ")}`);
        }
        const envPath = process.env.NODE_ENV === "production"
            ? path.resolve(process.cwd(), "../.env")
            : path.resolve(process.cwd(), ".env");
        if (!fs.existsSync(envPath)) {
            throw new Error(`.env file not found at ${envPath}`);
        }
        let envContent = fs.readFileSync(envPath, "utf8");
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
        console.error("[Admin] Error updating AI model:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to update AI model",
            error: true,
        };
    }
};
exports.updateAIModel = updateAIModel;
const getArtistClaimRequests = async (req) => {
    const { search, startDate, endDate } = req.query;
    const where = {
        status: client_1.ClaimStatus.PENDING,
        AND: [],
    };
    if (typeof search === "string" && search.trim()) {
        const trimmedSearch = search.trim();
        if (Array.isArray(where.AND)) {
            where.AND.push({
                OR: [
                    {
                        claimingUser: {
                            name: { contains: trimmedSearch, mode: "insensitive" },
                        },
                    },
                    {
                        claimingUser: {
                            email: { contains: trimmedSearch, mode: "insensitive" }
                        },
                    },
                    {
                        claimingUser: {
                            username: { contains: trimmedSearch, mode: "insensitive" }
                        },
                    },
                    {
                        artistProfile: {
                            artistName: { contains: trimmedSearch, mode: "insensitive" },
                        },
                    },
                ],
            });
        }
    }
    const dateFilter = {};
    if (typeof startDate === "string" && startDate) {
        try {
            const startOfDay = new Date(startDate);
            startOfDay.setUTCHours(0, 0, 0, 0);
            dateFilter.gte = startOfDay;
        }
        catch (e) {
            console.error("Invalid start date format:", startDate);
        }
    }
    if (typeof endDate === "string" && endDate) {
        try {
            const endOfDay = new Date(endDate);
            endOfDay.setUTCHours(23, 59, 59, 999);
            dateFilter.lte = endOfDay;
        }
        catch (e) {
            console.error("Invalid end date format:", endDate);
        }
    }
    if (dateFilter.gte || dateFilter.lte) {
        if (Array.isArray(where.AND)) {
            where.AND.push({ submittedAt: dateFilter });
        }
    }
    const options = {
        where,
        select: prisma_selects_1.artistClaimRequestSelect,
        orderBy: { submittedAt: "desc" },
    };
    const result = await (0, handle_utils_1.paginate)(db_1.default.artistClaimRequest, req, options);
    return {
        claimRequests: result.data,
        pagination: result.pagination,
    };
};
exports.getArtistClaimRequests = getArtistClaimRequests;
const getArtistClaimRequestDetail = async (claimId) => {
    const claimRequest = await db_1.default.artistClaimRequest.findUnique({
        where: { id: claimId },
        select: prisma_selects_1.artistClaimRequestDetailsSelect,
    });
    if (!claimRequest) {
        throw new Error("Artist claim request not found.");
    }
    if (claimRequest.artistProfile.user?.id ||
        claimRequest.artistProfile.isVerified) {
        if (claimRequest.status === client_1.ClaimStatus.PENDING) {
            console.warn(`Claim request ${claimId} is pending but target profile ${claimRequest.artistProfile.id} seems already claimed/verified.`);
        }
    }
    return claimRequest;
};
exports.getArtistClaimRequestDetail = getArtistClaimRequestDetail;
const approveArtistClaim = async (claimId, adminUserId) => {
    const claimRequest = await db_1.default.artistClaimRequest.findUnique({
        where: { id: claimId },
        select: {
            id: true,
            status: true,
            claimingUserId: true,
            artistProfileId: true,
            artistProfile: {
                select: { userId: true, isVerified: true, artistName: true },
            },
        },
    });
    if (!claimRequest) {
        throw new Error("Artist claim request not found.");
    }
    if (claimRequest.status !== client_1.ClaimStatus.PENDING) {
        throw new Error(`Cannot approve claim request with status: ${claimRequest.status}`);
    }
    if (claimRequest.artistProfile.userId) {
        await db_1.default.artistClaimRequest.update({
            where: { id: claimId },
            data: {
                status: client_1.ClaimStatus.REJECTED,
                rejectionReason: "Profile became unavailable before approval.",
                reviewedAt: new Date(),
                reviewedByAdminId: adminUserId,
            },
        });
        throw new Error("Target artist profile is no longer available for claiming.");
    }
    return db_1.default.$transaction(async (tx) => {
        const updatedClaim = await tx.artistClaimRequest.update({
            where: { id: claimId },
            data: {
                status: client_1.ClaimStatus.APPROVED,
                reviewedAt: new Date(),
                reviewedByAdminId: adminUserId,
                rejectionReason: null,
            },
            select: { id: true, claimingUserId: true, artistProfileId: true },
        });
        const updatedProfile = await tx.artistProfile.update({
            where: { id: updatedClaim.artistProfileId },
            data: {
                userId: updatedClaim.claimingUserId,
                isVerified: true,
                verifiedAt: new Date(),
                role: client_1.Role.ARTIST,
                verificationRequestedAt: null,
                requestedLabelName: null,
            },
            select: { id: true, artistName: true },
        });
        await tx.artistClaimRequest.updateMany({
            where: {
                artistProfileId: updatedClaim.artistProfileId,
                id: { not: claimId },
                status: client_1.ClaimStatus.PENDING,
            },
            data: {
                status: client_1.ClaimStatus.REJECTED,
                rejectionReason: "Another claim for this artist was approved.",
                reviewedAt: new Date(),
                reviewedByAdminId: adminUserId,
            },
        });
        await tx.artistClaimRequest.updateMany({
            where: {
                claimingUserId: updatedClaim.claimingUserId,
                artistProfileId: { not: updatedClaim.artistProfileId },
                status: { in: [client_1.ClaimStatus.PENDING, client_1.ClaimStatus.REJECTED] },
            },
            data: {
                status: client_1.ClaimStatus.REJECTED,
                rejectionReason: "You have been approved for another artist claim.",
                reviewedAt: new Date(),
                reviewedByAdminId: adminUserId,
            },
        });
        try {
            const notificationData = {
                data: {
                    type: client_1.NotificationType.CLAIM_REQUEST_APPROVED,
                    message: `Your claim request for artist '${claimRequest.artistProfile.artistName}' has been approved.`,
                    recipientType: client_1.RecipientType.USER,
                    userId: updatedClaim.claimingUserId,
                    artistId: updatedClaim.artistProfileId,
                    senderId: adminUserId,
                    isRead: false,
                },
                select: {
                    id: true,
                    type: true,
                    message: true,
                    recipientType: true,
                    isRead: true,
                    createdAt: true,
                    artistId: true,
                    senderId: true,
                },
            };
            const notification = await tx.notification.create(notificationData);
            const io = (0, socket_1.getIO)();
            const targetSocketId = (0, socket_2.getUserSockets)().get(updatedClaim.claimingUserId);
            if (targetSocketId) {
                console.log(`[Socket Emit] Sending CLAIM_REQUEST_APPROVED notification to user ${updatedClaim.claimingUserId} via socket ${targetSocketId}`);
                io.to(targetSocketId).emit("notification", {
                    id: notification.id,
                    type: notification.type,
                    message: notification.message,
                    recipientType: notification.recipientType,
                    isRead: notification.isRead,
                    createdAt: notification.createdAt.toISOString(),
                    artistId: notification.artistId,
                    senderId: notification.senderId,
                });
            }
            else {
                console.log(`[Socket Emit] User ${updatedClaim.claimingUserId} not connected, skipping CLAIM_REQUEST_APPROVED socket event.`);
            }
        }
        catch (notificationError) {
            console.error("[Notify/Socket Error] Failed processing claim approval notification/socket:", notificationError);
        }
        return {
            message: `Claim approved. Profile '${updatedProfile.artistName}' is now linked to user ${updatedClaim.claimingUserId}.`,
            claimId: updatedClaim.id,
            artistProfileId: updatedProfile.id,
            userId: updatedClaim.claimingUserId,
        };
    });
};
exports.approveArtistClaim = approveArtistClaim;
const rejectArtistClaim = async (claimId, adminUserId, reason) => {
    const claimRequest = await db_1.default.artistClaimRequest.findUnique({
        where: { id: claimId },
        select: {
            id: true,
            status: true,
            claimingUserId: true,
            artistProfile: { select: { id: true, artistName: true } },
        },
    });
    if (!claimRequest) {
        throw new Error("Artist claim request not found.");
    }
    if (claimRequest.status !== client_1.ClaimStatus.PENDING) {
        throw new Error(`Cannot reject claim request with status: ${claimRequest.status}`);
    }
    if (!reason || reason.trim() === "") {
        throw new Error("Rejection reason is required.");
    }
    const rejectedClaim = await db_1.default.artistClaimRequest.update({
        where: { id: claimId },
        data: {
            status: client_1.ClaimStatus.REJECTED,
            rejectionReason: reason.trim(),
            reviewedAt: new Date(),
            reviewedByAdminId: adminUserId,
        },
        select: { id: true, claimingUserId: true, artistProfileId: true },
    });
    if (rejectedClaim && claimRequest) {
        try {
            const notification = await db_1.default.notification.create({
                data: {
                    type: client_1.NotificationType.CLAIM_REQUEST_REJECTED,
                    message: `Your claim request for artist '${claimRequest.artistProfile.artistName}' was rejected. Reason: ${reason.trim()}`,
                    recipientType: client_1.RecipientType.USER,
                    userId: rejectedClaim.claimingUserId,
                    artistId: rejectedClaim.artistProfileId,
                    senderId: adminUserId,
                    isRead: false,
                },
                select: {
                    id: true,
                    type: true,
                    message: true,
                    recipientType: true,
                    isRead: true,
                    createdAt: true,
                    artistId: true,
                    senderId: true,
                },
            });
            const io = (0, socket_1.getIO)();
            const targetSocketId = (0, socket_2.getUserSockets)().get(rejectedClaim.claimingUserId);
            if (targetSocketId) {
                console.log(`[Socket Emit] Sending CLAIM_REQUEST_REJECTED notification to user ${rejectedClaim.claimingUserId} via socket ${targetSocketId}`);
                io.to(targetSocketId).emit("notification", {
                    id: notification.id,
                    type: notification.type,
                    message: notification.message,
                    recipientType: notification.recipientType,
                    isRead: notification.isRead,
                    createdAt: notification.createdAt.toISOString(),
                    artistId: notification.artistId,
                    senderId: notification.senderId,
                    rejectionReason: reason.trim(),
                });
            }
            else {
                console.log(`[Socket Emit] User ${rejectedClaim.claimingUserId} not connected, skipping CLAIM_REQUEST_REJECTED socket event.`);
            }
        }
        catch (notificationError) {
            console.error("[Notify/Socket Error] Failed processing claim rejection notification/socket:", notificationError);
        }
    }
    return {
        message: "Artist claim request rejected successfully.",
        claimId: rejectedClaim.id,
        userId: rejectedClaim.claimingUserId,
    };
};
exports.rejectArtistClaim = rejectArtistClaim;
async function convertMp3BufferToPcmF32(audioBuffer) {
    try {
        const decoder = new mpg123_decoder_1.MPEGDecoder();
        await decoder.ready;
        const uint8ArrayBuffer = new Uint8Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.length);
        const decoded = decoder.decode(uint8ArrayBuffer);
        decoder.free();
        if (decoded.errors.length > 0) {
            console.error("MP3 Decoding errors:", decoded.errors);
            return null;
        }
        if (!decoded.channelData || decoded.channelData.length === 0) {
            console.error("MP3 Decoding produced no channel data.");
            return null;
        }
        const originalSampleRate = decoded.sampleRate;
        console.log(`Original audio sample rate: ${originalSampleRate} Hz`);
        let monoChannel;
        if (decoded.channelData.length > 1) {
            const leftChannel = decoded.channelData[0];
            const rightChannel = decoded.channelData[1];
            monoChannel = new Float32Array(leftChannel.length);
            for (let i = 0; i < leftChannel.length; i++) {
                monoChannel[i] = (leftChannel[i] + rightChannel[i]) / 2;
            }
        }
        else {
            monoChannel = decoded.channelData[0];
        }
        if (originalSampleRate === 44100) {
            console.log("Audio already at 44100 Hz, no resampling needed");
            return monoChannel;
        }
        console.log(`Resampling audio from ${originalSampleRate} Hz to 44100 Hz for RhythmExtractor2013`);
        const targetSampleRate = 44100;
        const resampleRatio = targetSampleRate / originalSampleRate;
        const resampledLength = Math.floor(monoChannel.length * resampleRatio);
        const resampledBuffer = new Float32Array(resampledLength);
        for (let i = 0; i < resampledLength; i++) {
            const originalPos = i / resampleRatio;
            const originalPosFloor = Math.floor(originalPos);
            const originalPosCeil = Math.min(originalPosFloor + 1, monoChannel.length - 1);
            const fraction = originalPos - originalPosFloor;
            resampledBuffer[i] =
                monoChannel[originalPosFloor] * (1 - fraction) +
                    monoChannel[originalPosCeil] * fraction;
        }
        console.log(`Resampled audio to ${resampledBuffer.length} samples at 44100 Hz`);
        return resampledBuffer;
    }
    catch (error) {
        console.error("Error during MP3 decoding or processing:", error);
        return null;
    }
}
async function generateCoverArtwork(trackTitle, artistName, mood) {
    try {
        const seed = encodeURIComponent(`${artistName}-${trackTitle}`);
        const imageUrl = `https://api.dicebear.com/8.x/shapes/svg?seed=${seed}&radius=0&backgroundType=gradientLinear&backgroundRotation=0,360`;
        console.log(`Generated cover artwork for "${trackTitle}" using DiceBear: ${imageUrl}`);
        return imageUrl;
    }
    catch (error) {
        console.error("Error generating cover artwork with DiceBear:", error);
        return `https://placehold.co/500x500/EEE/31343C?text=${encodeURIComponent(trackTitle.substring(0, 15))}`;
    }
}
async function getOrCreateVerifiedArtistProfile(artistNameOrId) {
    const isLikelyId = /^[a-z0-9]{25}$/.test(artistNameOrId);
    if (isLikelyId) {
        const existingProfile = await db_1.default.artistProfile.findUnique({
            where: { id: artistNameOrId },
        });
        if (existingProfile) {
            if (!existingProfile.isVerified) {
                return await db_1.default.artistProfile.update({
                    where: { id: existingProfile.id },
                    data: { isVerified: true },
                });
            }
            return existingProfile;
        }
    }
    const nameToSearch = artistNameOrId;
    let artistProfile = await db_1.default.artistProfile.findFirst({
        where: {
            artistName: {
                equals: nameToSearch,
                mode: "insensitive",
            },
        },
    });
    if (artistProfile) {
        if (!artistProfile.isVerified) {
            artistProfile = await db_1.default.artistProfile.update({
                where: { id: artistProfile.id },
                data: { isVerified: true },
            });
        }
        return artistProfile;
    }
    console.log(`Creating verified artist profile for: ${nameToSearch}`);
    artistProfile = await db_1.default.artistProfile.create({
        data: {
            artistName: nameToSearch,
            role: client_1.Role.ARTIST,
            isVerified: true,
            isActive: true,
            userId: null,
            monthlyListeners: 0,
        },
    });
    return artistProfile;
}
const processBulkUpload = async (files) => {
    const results = [];
    const albumTracks = {};
    for (const file of files) {
        let coverUrl = null;
        let title = file.originalname.replace(/\.[^/.]+$/, "");
        let derivedArtistName = "Unknown Artist";
        let duration = 0;
        let albumName = null;
        try {
            console.log(`Processing file: ${file.originalname}`);
            const audioUploadResult = await (0, upload_service_1.uploadFile)(file.buffer, "tracks", "auto");
            const audioUrl = audioUploadResult.secure_url;
            try {
                const metadata = await mm.parseBuffer(file.buffer, file.mimetype);
                duration = Math.round(metadata.format.duration || 0);
                if (metadata.common?.artist)
                    derivedArtistName = metadata.common.artist;
                if (metadata.common?.title)
                    title = metadata.common.title;
                if (metadata.common?.album) {
                    albumName = metadata.common.album;
                }
                if (metadata.common?.picture && metadata.common.picture.length > 0) {
                    const picture = metadata.common.picture[0];
                    try {
                        console.log(`Found embedded cover art for "${title}". Uploading...`);
                        const coverUploadResult = await (0, upload_service_1.uploadFile)(Buffer.from(picture.data), 'covers', 'image');
                        coverUrl = coverUploadResult.secure_url;
                        console.log(`Uploaded embedded cover art for "${title}" to: ${coverUrl}`);
                    }
                    catch (coverUploadError) {
                        console.error(`Error uploading embedded cover art for "${title}":`, coverUploadError);
                        coverUrl = null;
                    }
                }
                else {
                    console.log(`No embedded cover art found for "${title}". Will generate fallback.`);
                }
            }
            catch (metadataError) {
                console.error("Error parsing basic audio metadata:", metadataError);
            }
            const audioAnalysis = await (0, upload_service_1.analyzeAudioWithReccoBeats)(file.buffer, title, derivedArtistName);
            console.log(`Audio analysis result for "${title}":`, JSON.stringify(audioAnalysis, null, 2));
            let { tempo, mood, key, scale, danceability, energy, genreIds } = audioAnalysis;
            let confidence = null;
            try {
                const pcmF32 = await convertMp3BufferToPcmF32(file.buffer);
                if (pcmF32) {
                    const essentia = new essentia_js_1.Essentia(essentia_js_1.EssentiaWASM);
                    const audioVector = essentia.arrayToVector(pcmF32);
                    const targetSampleRate = 44000;
                    try {
                        const rhythmResult = essentia.RhythmExtractor2013(audioVector, targetSampleRate);
                        let rawTempo = rhythmResult.bpm;
                        confidence = rhythmResult.confidence || null;
                        tempo = Math.round(rawTempo);
                        console.log("Tempo calculated from Essentia:", tempo, "BPM");
                    }
                    catch (tempoError) {
                        console.error("Error estimating tempo with RhythmExtractor2013:", tempoError);
                        try {
                            const tempoResult = essentia.PercivalBpmEstimator(audioVector);
                            tempo = Math.round(tempoResult.bpm);
                            console.log("Tempo calculated from PercivalBpmEstimator fallback:", tempo, "BPM");
                        }
                        catch (fallbackError) {
                            console.error("Error estimating tempo with PercivalBpmEstimator fallback:", fallbackError);
                            tempo = null;
                        }
                    }
                    try {
                        const keyResult = essentia.KeyExtractor(audioVector);
                        key = keyResult.key;
                        scale = keyResult.scale;
                        console.log("Key estimation from Essentia:", key, scale);
                    }
                    catch (keyError) {
                        console.error("Error estimating key/scale with Essentia:", keyError);
                    }
                }
            }
            catch (analysisError) {
                console.error("Error during audio analysis pipeline:", analysisError);
            }
            const artistProfile = await getOrCreateVerifiedArtistProfile(derivedArtistName);
            const artistId = artistProfile.id;
            const existingTrack = await db_1.default.track.findUnique({
                where: { title_artistId: { title: title, artistId: artistId } },
                select: { id: true, title: true, artist: { select: { artistName: true } } },
            });
            if (existingTrack) {
                console.log(`Duplicate track found: "${existingTrack.title}" by ${existingTrack.artist?.artistName} (ID: ${existingTrack.id}). Skipping creation for file: ${file.originalname}`);
                results.push({
                    fileName: file.originalname,
                    title: title,
                    artistName: derivedArtistName,
                    error: `Duplicate: This track already exists (ID: ${existingTrack.id})`,
                    success: false,
                    trackId: existingTrack.id,
                    artistId: artistId,
                    duration: 0,
                    audioUrl: '',
                    coverUrl: undefined,
                    tempo: null,
                    mood: null,
                    key: null,
                    scale: null,
                    danceability: null,
                    energy: null,
                    genreIds: [],
                    genres: [],
                    albumName: albumName,
                    albumId: undefined,
                    albumType: albumName ? 'ALBUM' : 'SINGLE'
                });
                continue;
            }
            let finalGenreIds = [...genreIds];
            if (finalGenreIds.length === 0) {
                try {
                    const popGenre = await db_1.default.genre.findFirst({ where: { name: { equals: "Pop", mode: "insensitive" } } });
                    if (popGenre) {
                        finalGenreIds = [popGenre.id];
                    }
                    else {
                        const anyGenre = await db_1.default.genre.findFirst({ orderBy: { createdAt: "asc" } });
                        if (anyGenre)
                            finalGenreIds = [anyGenre.id];
                    }
                }
                catch (fallbackGenreError) {
                    console.error("Error finding fallback genre:", fallbackGenreError);
                }
            }
            let albumTypeName = 'SINGLE';
            let shouldAddToAlbum = false;
            if (albumName && albumName !== title) {
                shouldAddToAlbum = true;
                albumTypeName = 'ALBUM';
            }
            else {
                albumTypeName = 'SINGLE';
                albumName = null;
            }
            if (!coverUrl) {
                if (!shouldAddToAlbum) {
                    try {
                        coverUrl = await generateCoverArtwork(title, derivedArtistName, mood);
                        console.log(`Generated cover artwork for single "${title}"`);
                    }
                    catch (coverError) {
                        console.error("Error generating cover artwork for single:", coverError);
                    }
                }
                else if (albumName && (!albumTracks[albumName] || albumTracks[albumName].tracks.length === 0)) {
                    try {
                        coverUrl = await generateCoverArtwork(albumName, derivedArtistName, mood);
                        console.log(`Generated cover artwork for album "${albumName}"`);
                    }
                    catch (coverError) {
                        console.error(`Error generating cover artwork for album "${albumName}":`, coverError);
                    }
                }
                else {
                    console.log(`Skipping cover generation for "${title}" as it will use album cover`);
                }
            }
            const releaseDate = new Date();
            const trackData = {
                title,
                duration,
                releaseDate,
                audioUrl,
                coverUrl: coverUrl || undefined,
                type: albumTypeName === 'ALBUM' ? client_1.AlbumType.ALBUM :
                    albumTypeName === 'SINGLE' ? client_1.AlbumType.SINGLE :
                        client_1.AlbumType.EP,
                isActive: true,
                tempo,
                mood,
                key,
                scale,
                danceability,
                energy,
                artist: { connect: { id: artistId } },
            };
            if (finalGenreIds.length > 0) {
                trackData.genres = { create: finalGenreIds.map((genreId) => ({ genre: { connect: { id: genreId } } })) };
            }
            if (shouldAddToAlbum && albumName) {
                if (!albumTracks[albumName]) {
                    albumTracks[albumName] = {
                        tracks: [],
                        artistId,
                        coverUrl: undefined
                    };
                }
                if (coverUrl && !albumTracks[albumName].coverUrl) {
                    console.log(`Using embedded cover from "${title}" for album "${albumName}"`);
                    albumTracks[albumName].coverUrl = coverUrl;
                }
                albumTracks[albumName].tracks.push({
                    trackData,
                    title,
                    duration,
                    fileName: file.originalname,
                    artistName: derivedArtistName,
                    artistId,
                    audioUrl,
                    coverUrl,
                    tempo,
                    mood,
                    key,
                    scale,
                    genreIds: finalGenreIds,
                    genres: finalGenreIds.length > 0 ? await getGenreNamesFromIds(finalGenreIds) : []
                });
                results.push({
                    fileName: file.originalname,
                    title,
                    artistName: derivedArtistName,
                    artistId,
                    duration,
                    audioUrl,
                    coverUrl: coverUrl || undefined,
                    tempo,
                    mood,
                    key,
                    scale,
                    danceability,
                    energy,
                    genreIds: finalGenreIds,
                    genres: finalGenreIds.length > 0 ? await getGenreNamesFromIds(finalGenreIds) : [],
                    success: true,
                    albumName,
                    albumId: undefined,
                    albumType: albumTypeName
                });
            }
            else {
                const newTrack = await db_1.default.track.create({
                    data: trackData,
                    select: prisma_selects_1.trackSelect,
                });
                results.push({
                    trackId: newTrack.id,
                    title: newTrack.title,
                    artistName: derivedArtistName,
                    artistId,
                    duration: newTrack.duration,
                    audioUrl: newTrack.audioUrl,
                    coverUrl: newTrack.coverUrl || undefined,
                    tempo: newTrack.tempo,
                    mood: newTrack.mood,
                    key: newTrack.key,
                    scale: newTrack.scale,
                    danceability: newTrack.danceability,
                    energy: newTrack.energy,
                    genreIds: finalGenreIds,
                    genres: newTrack.genres?.map((g) => g.genre.name),
                    fileName: file.originalname,
                    success: true,
                    albumName: null,
                    albumId: undefined,
                    albumType: 'SINGLE'
                });
            }
        }
        catch (error) {
            console.error(`Error processing file ${file.originalname}:`, error);
            results.push({
                fileName: file.originalname,
                title,
                artistName: derivedArtistName,
                error: error instanceof Error ? error.message : "Unknown error",
                success: false,
                albumName: albumName,
                albumId: undefined,
                albumType: albumName ? 'ALBUM' : 'SINGLE',
                artistId: '',
                trackId: '',
                duration: 0,
                audioUrl: '',
                coverUrl: undefined,
                tempo: null,
                mood: null,
                key: null,
                scale: null,
                danceability: null,
                energy: null,
                genreIds: [],
                genres: []
            });
        }
    }
    for (const [albumName, albumData] of Object.entries(albumTracks)) {
        try {
            const { tracks, artistId, coverUrl } = albumData;
            if (tracks.length === 0)
                continue;
            const totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
            const existingAlbum = await db_1.default.album.findFirst({
                where: {
                    title: albumName,
                    artistId: artistId
                },
                include: {
                    tracks: {
                        select: {
                            duration: true
                        }
                    }
                }
            });
            let album;
            let albumTypeName = 'EP';
            let albumType = client_1.AlbumType.EP;
            if (existingAlbum) {
                console.log(`Album "${albumName}" already exists for this artist. Adding tracks to existing album.`);
                albumType = existingAlbum.type;
                albumTypeName = existingAlbum.type === client_1.AlbumType.ALBUM ? 'ALBUM' :
                    existingAlbum.type === client_1.AlbumType.SINGLE ? 'SINGLE' : 'EP';
                const existingDuration = existingAlbum.tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
                const newTotalDuration = existingDuration + totalDuration;
                const newTotalTracks = existingAlbum.totalTracks + tracks.length;
                if (newTotalDuration >= 600 && existingAlbum.type === client_1.AlbumType.EP) {
                    albumType = client_1.AlbumType.ALBUM;
                    albumTypeName = 'ALBUM';
                    await db_1.default.album.update({
                        where: { id: existingAlbum.id },
                        data: {
                            type: client_1.AlbumType.ALBUM,
                            duration: newTotalDuration,
                            totalTracks: newTotalTracks,
                            ...(albumData.coverUrl && !existingAlbum.coverUrl ? { coverUrl: albumData.coverUrl } : {})
                        }
                    });
                    await db_1.default.track.updateMany({
                        where: { albumId: existingAlbum.id },
                        data: { type: client_1.AlbumType.ALBUM }
                    });
                    console.log(`Album "${albumName}" type changed from EP to ALBUM as duration now exceeds 10 minutes. Updated type for all ${existingAlbum.totalTracks} existing tracks.`);
                }
                else {
                    await db_1.default.album.update({
                        where: { id: existingAlbum.id },
                        data: {
                            duration: newTotalDuration,
                            totalTracks: newTotalTracks,
                            ...(albumData.coverUrl && !existingAlbum.coverUrl ? { coverUrl: albumData.coverUrl } : {})
                        }
                    });
                }
                album = await db_1.default.album.findUnique({
                    where: { id: existingAlbum.id }
                });
            }
            else {
                albumTypeName = totalDuration < 600 ? 'EP' : 'ALBUM';
                albumType = albumTypeName === 'EP' ? client_1.AlbumType.EP : client_1.AlbumType.ALBUM;
                album = await db_1.default.album.create({
                    data: {
                        title: albumName,
                        coverUrl: albumData.coverUrl,
                        releaseDate: new Date(),
                        duration: totalDuration,
                        totalTracks: tracks.length,
                        type: albumType,
                        isActive: true,
                        artist: { connect: { id: artistId } }
                    }
                });
                console.log(`Created new album "${albumName}" with ${tracks.length} tracks. Type: ${albumTypeName}`);
            }
            for (let i = 0; i < tracks.length; i++) {
                const trackInfo = tracks[i];
                const trackNumber = existingAlbum
                    ? existingAlbum.totalTracks + 1 + i
                    : i + 1;
                if (!album) {
                    console.error(`Album object is null when trying to create track "${trackInfo.title}"`);
                    continue;
                }
                await db_1.default.track.create({
                    data: {
                        ...trackInfo.trackData,
                        coverUrl: album.coverUrl || trackInfo.trackData.coverUrl,
                        album: { connect: { id: album.id } },
                        trackNumber: trackNumber,
                        type: albumType
                    }
                });
                const resultIndex = results.findIndex(r => r.fileName === trackInfo.fileName && r.title === trackInfo.title);
                if (resultIndex !== -1 && album) {
                    results[resultIndex].albumId = album.id;
                    results[resultIndex].albumType = albumTypeName;
                    results[resultIndex].coverUrl = album.coverUrl || results[resultIndex].coverUrl;
                }
            }
        }
        catch (albumError) {
            console.error(`Error creating/updating album "${albumName}":`, albumError);
        }
    }
    return results;
};
exports.processBulkUpload = processBulkUpload;
async function getGenreNamesFromIds(genreIds) {
    try {
        const genres = await db_1.default.genre.findMany({
            where: {
                id: { in: genreIds }
            },
            select: {
                name: true
            }
        });
        return genres.map(g => g.name);
    }
    catch (error) {
        console.error("Error getting genre names:", error);
        return [];
    }
}
const generateAndAssignAiPlaylistToUser = async (adminExecutingId, targetUserId) => {
    const adminUser = await db_1.default.user.findUnique({
        where: { id: adminExecutingId },
    });
    if (!adminUser) {
        throw new errors_1.HttpError(404, "Admin user not found");
    }
    if (adminUser.role !== client_1.Role.ADMIN) {
        throw new errors_1.HttpError(403, "Forbidden: Insufficient privileges");
    }
    const targetUser = await db_1.default.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, username: true, name: true },
    });
    if (!targetUser) {
        throw new errors_1.HttpError(404, "Target user not found");
    }
    const targetUserDisplayName = targetUser.username || targetUser.name || targetUserId;
    const listeningHistory = await db_1.default.history.findMany({
        where: {
            userId: targetUserId,
            type: "PLAY",
            trackId: { not: null },
        },
        take: 10,
        select: { trackId: true },
    });
    const uniqueTracksInHistory = new Set(listeningHistory.map((h) => h.trackId))
        .size;
    const hasSufficientHistory = uniqueTracksInHistory > 3;
    let playlistOptions = {};
    let trackIdsToUse = undefined;
    if (!hasSufficientHistory) {
        console.log(`[AdminService] User ${targetUserId} has no/insufficient history. Generating from top tracks.`);
        trackIdsToUse = await aiService.getTopPlayedTrackIds(10);
        if (!trackIdsToUse || trackIdsToUse.length === 0) {
            console.warn("[AdminService] No top tracks found to generate default playlist.");
        }
        playlistOptions = {
            name: `Popular Mix for ${targetUserDisplayName}`,
            description: "Discover popular tracks! An AI-curated playlist based on trending songs.",
        };
    }
    else {
        console.log(`[AdminService] User ${targetUserId} has history. Generating personalized AI mix.`);
        playlistOptions = {
            name: `Your AI Mix, ${targetUserDisplayName}`,
            description: `A personalized playlist crafted by AI, just for you, ${targetUserDisplayName}! Based on your listening taste.`,
            trackCount: 10,
        };
    }
    try {
        console.log(`[AdminService] Attempting to generate AI playlist for user ${targetUserId}`);
        const newPlaylist = await aiService.createAIGeneratedPlaylist(targetUserId, {}, trackIdsToUse);
        console.log(`[AdminService] Successfully generated AI playlist ${newPlaylist.id} for user ${targetUserId}`);
        return newPlaylist;
    }
    catch (error) {
        console.error(`[AdminService] Error generating AI playlist for user ${targetUserId}:`, error);
        if (error instanceof Error) {
            throw new errors_1.HttpError(500, `Failed to generate AI playlist: ${error.message}`);
        }
        throw new errors_1.HttpError(500, "An unexpected error occurred while generating the AI playlist.");
    }
};
exports.generateAndAssignAiPlaylistToUser = generateAndAssignAiPlaylistToUser;
const setAiPlaylistVisibilityForUser = async (adminExecutingId, playlistId, newVisibility) => {
    const adminUser = await db_1.default.user.findUnique({
        where: { id: adminExecutingId },
    });
    if (!adminUser) {
        throw new errors_1.HttpError(404, "Admin user not found");
    }
    if (adminUser.role !== client_1.Role.ADMIN) {
        throw new errors_1.HttpError(403, "Forbidden: Insufficient privileges");
    }
    if (newVisibility !== client_1.PlaylistPrivacy.PUBLIC &&
        newVisibility !== client_1.PlaylistPrivacy.PRIVATE) {
        throw new errors_1.HttpError(400, "Invalid visibility value. Must be PUBLIC or PRIVATE.");
    }
    const playlist = await db_1.default.playlist.findUnique({
        where: { id: playlistId },
    });
    if (!playlist) {
        throw new errors_1.HttpError(404, "Playlist not found");
    }
    if (!playlist.isAIGenerated) {
        throw new errors_1.HttpError(403, "Forbidden: Cannot change visibility for non-AI generated playlists.");
    }
    if (!playlist.userId) {
        throw new errors_1.HttpError(400, "Cannot change visibility for system-wide AI playlists not assigned to a specific user.");
    }
    const updatedPlaylist = await db_1.default.playlist.update({
        where: { id: playlistId },
        data: { privacy: newVisibility },
    });
    console.log(`[AdminService] Updated AI playlist ${playlistId} visibility to ${newVisibility} for user ${playlist.userId}`);
    return updatedPlaylist;
};
exports.setAiPlaylistVisibilityForUser = setAiPlaylistVisibilityForUser;
const getUserAiPlaylists = async (adminExecutingId, targetUserId, req) => {
    const adminUser = await db_1.default.user.findUnique({
        where: { id: adminExecutingId },
    });
    if (!adminUser) {
        throw new errors_1.HttpError(404, "Admin user not found");
    }
    if (adminUser.role !== client_1.Role.ADMIN) {
        throw new errors_1.HttpError(403, "Forbidden: Insufficient privileges");
    }
    const targetUser = await db_1.default.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
    });
    if (!targetUser) {
        throw new errors_1.HttpError(404, "Target user not found");
    }
    const where = {
        userId: targetUserId,
        isAIGenerated: true,
    };
    const { search, sortBy, sortOrder } = req.query;
    if (search && typeof search === "string") {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
        ];
    }
    let orderBy = { createdAt: "desc" };
    const validSortFields = [
        "name",
        "createdAt",
        "updatedAt",
        "totalTracks",
        "privacy",
    ];
    if (sortBy &&
        typeof sortBy === "string" &&
        validSortFields.includes(sortBy)) {
        orderBy = { [sortBy]: sortOrder === "asc" ? "asc" : "desc" };
    }
    const playlistSelect = {
        id: true,
        name: true,
        description: true,
        coverUrl: true,
        privacy: true,
        type: true,
        isAIGenerated: true,
        totalTracks: true,
        totalDuration: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        lastGeneratedAt: true,
        tracks: {
            take: 3,
            orderBy: { trackOrder: "asc" },
            select: {
                track: {
                    select: {
                        id: true,
                        title: true,
                        coverUrl: true,
                        artist: { select: { artistName: true } },
                    },
                },
            },
        },
    };
    const options = {
        where,
        select: playlistSelect,
        orderBy,
    };
    const result = await (0, handle_utils_1.paginate)(db_1.default.playlist, req, options);
    if (result.data.length > 0) {
        console.log(`[AdminService] Fetched ${result.data.length} AI playlists for user ${targetUserId}`);
    }
    return {
        data: result.data,
        pagination: result.pagination,
    };
};
exports.getUserAiPlaylists = getUserAiPlaylists;
const getUserListeningHistoryDetails = async (adminExecutingId, targetUserId, req) => {
    const adminUser = await db_1.default.user.findUnique({
        where: { id: adminExecutingId },
    });
    if (!adminUser) {
        throw new errors_1.HttpError(404, "Admin user not found");
    }
    if (adminUser.role !== client_1.Role.ADMIN) {
        throw new errors_1.HttpError(403, "Forbidden: Insufficient privileges");
    }
    const targetUser = await db_1.default.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
    });
    if (!targetUser) {
        throw new errors_1.HttpError(404, "Target user not found");
    }
    const { search, startDate, endDate, sortBy = "createdAt", sortOrder = "desc", } = req.query;
    const whereClause = {
        userId: targetUserId,
        type: "PLAY",
    };
    if (search && typeof search === "string") {
        whereClause.track = {
            OR: [
                { title: { contains: search, mode: "insensitive" } },
                { artist: { artistName: { contains: search, mode: "insensitive" } } },
                { album: { title: { contains: search, mode: "insensitive" } } },
            ],
        };
    }
    const dateFilter = {};
    if (typeof startDate === "string" && startDate) {
        try {
            const startOfDay = new Date(startDate);
            startOfDay.setUTCHours(0, 0, 0, 0);
            dateFilter.gte = startOfDay;
        }
        catch (e) {
            console.error("Invalid start date format:", startDate);
        }
    }
    if (typeof endDate === "string" && endDate) {
        try {
            const endOfDay = new Date(endDate);
            endOfDay.setUTCHours(23, 59, 59, 999);
            dateFilter.lte = endOfDay;
        }
        catch (e) {
            console.error("Invalid end date format:", endDate);
        }
    }
    if (dateFilter.gte || dateFilter.lte) {
        whereClause.createdAt = dateFilter;
    }
    let orderBy = {
        [sortBy]: sortOrder,
    };
    const historyQueryOptions = {
        where: whereClause,
        include: {
            track: {
                select: {
                    id: true,
                    title: true,
                    coverUrl: true,
                    duration: true,
                    artist: { select: { artistName: true, id: true } },
                    album: { select: { title: true, id: true } },
                    tempo: true,
                    mood: true,
                    key: true,
                    scale: true,
                    danceability: true,
                    energy: true,
                },
            },
        },
        orderBy,
    };
    const historyRecords = await db_1.default.history.findMany(historyQueryOptions);
    console.log(`[AdminService DEBUG] getUserListeningHistoryDetails: Fetched ${historyRecords.length} history records for user ${targetUserId}.`);
    historyRecords.forEach((record, index) => {
        if (record.track) {
            console.log(`[AdminService DEBUG] getUserListeningHistoryDetails: Record ${index + 1} - Track ID: ${record.track.id} - Audio Features from DB:`, {
                title: record.track.title,
                tempo: record.track.tempo,
                mood: record.track.mood,
                key: record.track.key,
                scale: record.track.scale,
                danceability: record.track.danceability,
                energy: record.track.energy,
            });
        }
        else {
            console.log(`[AdminService DEBUG] getUserListeningHistoryDetails: Record ${index + 1} has no associated track.`);
        }
    });
    const totalRecords = await db_1.default.history.count({
        where: historyQueryOptions.where,
    });
    return {
        data: historyRecords,
        pagination: {
            total: totalRecords,
            pageSize: Object.keys(historyQueryOptions.include.track).length,
            currentPage: 1,
        },
    };
};
exports.getUserListeningHistoryDetails = getUserListeningHistoryDetails;
const getAllLabelRegistrations = async (req) => {
    const { search, status, sortBy, sortOrder } = req.query;
    const whereClause = {};
    if (search && typeof search === 'string') {
        whereClause.OR = [
            { requestedLabelName: { contains: search, mode: 'insensitive' } },
            { requestingArtist: { artistName: { contains: search, mode: 'insensitive' } } },
        ];
    }
    if (status && typeof status === 'string' && Object.values(client_1.RequestStatus).includes(status)) {
        whereClause.status = status;
    }
    else {
        if (status && status !== 'ALL') {
            whereClause.status = status;
        }
        else if (!status) {
            whereClause.status = client_1.RequestStatus.PENDING;
        }
    }
    const orderByClause = {};
    const validSortKeys = ['submittedAt', 'requestedLabelName', 'status'];
    const key = sortBy;
    const order = sortOrder === 'desc' ? 'desc' : 'asc';
    if (sortBy && typeof sortBy === 'string' && validSortKeys.includes(key)) {
        orderByClause[key] = order;
    }
    else {
        orderByClause.submittedAt = 'desc';
    }
    const result = await (0, handle_utils_1.paginate)(db_1.default.labelRegistrationRequest, req, {
        where: whereClause,
        include: {
            requestingArtist: {
                select: {
                    id: true,
                    artistName: true,
                    avatar: true,
                },
            },
            reviewedByAdmin: {
                select: {
                    id: true,
                    name: true,
                },
            },
            createdLabel: {
                select: {
                    id: true,
                    name: true,
                }
            }
        },
        orderBy: orderByClause,
    });
    return {
        data: result.data,
        pagination: result.pagination,
    };
};
exports.getAllLabelRegistrations = getAllLabelRegistrations;
const getLabelRegistrationById = async (registrationId) => {
    const request = await db_1.default.labelRegistrationRequest.findUnique({
        where: { id: registrationId },
        include: {
            requestingArtist: {
                select: {
                    id: true,
                    artistName: true,
                    avatar: true,
                    user: { select: { email: true, name: true } },
                },
            },
            reviewedByAdmin: {
                select: {
                    id: true,
                    name: true,
                },
            },
            createdLabel: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                }
            }
        },
    });
    if (!request) {
        throw { status: 404, message: 'Label registration request not found.' };
    }
    return request;
};
exports.getLabelRegistrationById = getLabelRegistrationById;
const approveLabelRegistration = async (adminUserId, registrationId) => {
    const registrationRequest = await db_1.default.labelRegistrationRequest.findUnique({
        where: { id: registrationId },
        include: { requestingArtist: true },
    });
    if (!registrationRequest) {
        throw { status: 404, message: 'Label registration request not found.' };
    }
    if (registrationRequest.status !== client_1.RequestStatus.PENDING) {
        throw { status: 400, message: `Request is already ${registrationRequest.status.toLowerCase()}.` };
    }
    return db_1.default.$transaction(async (tx) => {
        const newLabel = await tx.label.create({
            data: {
                name: registrationRequest.requestedLabelName,
                description: registrationRequest.requestedLabelDescription,
                logoUrl: registrationRequest.requestedLabelLogoUrl,
            },
            select: prisma_selects_1.labelSelect,
        });
        await tx.artistProfile.update({
            where: { id: registrationRequest.requestingArtistId },
            data: { labelId: newLabel.id },
        });
        const updatedRequest = await tx.labelRegistrationRequest.update({
            where: { id: registrationId },
            data: {
                status: client_1.RequestStatus.APPROVED,
                reviewedAt: new Date(),
                reviewedByAdminId: adminUserId,
                createdLabelId: newLabel.id,
            },
        });
        if (registrationRequest.requestingArtist.userId) {
            const notificationData = {
                data: {
                    recipientType: client_1.RecipientType.ARTIST,
                    artistId: registrationRequest.requestingArtistId,
                    type: client_1.NotificationType.LABEL_REGISTRATION_APPROVED,
                    message: `Congratulations! Your request to register the label "${newLabel.name}" has been approved.`,
                    isRead: false,
                },
                select: {
                    id: true, type: true, message: true, recipientType: true, isRead: true, createdAt: true,
                    artistId: true,
                }
            };
            const notification = await tx.notification.create(notificationData);
            const io = (0, socket_1.getIO)();
            const targetUserSocketId = (0, socket_2.getUserSockets)().get(registrationRequest.requestingArtist.userId);
            if (targetUserSocketId) {
                io.to(targetUserSocketId).emit('notification', {
                    ...notification,
                    createdAt: notification.createdAt.toISOString(),
                    labelName: newLabel.name,
                    labelId: newLabel.id,
                });
                console.log(`[Socket Emit] Sent LABEL_REGISTRATION_APPROVED (to ArtistProfile ${notification.artistId}) to user ${registrationRequest.requestingArtist.userId} via socket ${targetUserSocketId}`);
            }
            else {
                console.log(`[Socket Emit] User ${registrationRequest.requestingArtist.userId} (for ArtistProfile ${notification.artistId}) not connected for LABEL_REGISTRATION_APPROVED.`);
            }
        }
        return { updatedRequest, newLabel };
    });
};
exports.approveLabelRegistration = approveLabelRegistration;
const rejectLabelRegistration = async (adminUserId, registrationId, rejectionReason) => {
    const errors = (0, handle_utils_1.runValidations)([
        (0, handle_utils_1.validateField)(rejectionReason, 'rejectionReason', { required: true, minLength: 5, maxLength: 500 }),
    ]);
    if (errors.length > 0) {
        console.warn(`[AdminService] Validation failed for rejection reason for request ${registrationId}, but proceeding with rejection.`);
    }
    const registrationRequest = await db_1.default.labelRegistrationRequest.findUnique({
        where: { id: registrationId },
    });
    if (!registrationRequest) {
        throw { status: 404, message: 'Label registration request not found.' };
    }
    if (registrationRequest.status !== client_1.RequestStatus.PENDING) {
        console.warn(`[AdminService] Attempting to reject a request that is already ${registrationRequest.status.toLowerCase()}. ID: ${registrationId}`);
    }
    const updatedRequest = await db_1.default.labelRegistrationRequest.update({
        where: { id: registrationId },
        data: {
            status: client_1.RequestStatus.REJECTED,
            rejectionReason: rejectionReason,
            reviewedAt: new Date(),
            reviewedByAdminId: adminUserId,
        },
        select: {
            id: true,
            requestedLabelName: true,
            requestingArtistId: true,
            requestingArtist: { select: { userId: true } }
        }
    });
    console.log(`[AdminService] Updated LabelRegistrationRequest ID: ${updatedRequest.id} to REJECTED`);
    if (updatedRequest.requestingArtist?.userId) {
        const artistUserIdForSocketTargeting = updatedRequest.requestingArtist.userId;
        const notificationData = {
            data: {
                recipientType: client_1.RecipientType.ARTIST,
                artistId: updatedRequest.requestingArtistId,
                type: client_1.NotificationType.LABEL_REGISTRATION_REJECTED,
                message: `We regret to inform you that your request to register the label "${updatedRequest.requestedLabelName}" has been rejected. Reason: ${rejectionReason}`,
                isRead: false,
            },
            select: {
                id: true, type: true, message: true, recipientType: true, isRead: true, createdAt: true,
                artistId: true,
            }
        };
        db_1.default.notification.create(notificationData)
            .then(createdNotification => {
            const io = (0, socket_1.getIO)();
            const targetSocketId = (0, socket_2.getUserSockets)().get(artistUserIdForSocketTargeting);
            if (targetSocketId) {
                io.to(targetSocketId).emit('notification', {
                    ...createdNotification,
                    createdAt: createdNotification.createdAt.toISOString(),
                    rejectionReason: rejectionReason,
                    labelName: updatedRequest.requestedLabelName,
                });
                console.log(`[Socket Emit] Sent LABEL_REGISTRATION_REJECTED (to ArtistProfile ${createdNotification.artistId}) to user ${artistUserIdForSocketTargeting} via socket ${targetSocketId}`);
            }
            else {
                console.log(`[Socket Emit] User ${artistUserIdForSocketTargeting} (for ArtistProfile ${createdNotification.artistId}) not connected for LABEL_REGISTRATION_REJECTED.`);
            }
        })
            .catch(err => {
            console.error(`[AdminService] Failed to create or emit rejection notification for user ${artistUserIdForSocketTargeting} (Request ID: ${updatedRequest.id}):`, err);
        });
    }
    else {
        console.warn(`[AdminService] Cannot send rejection notification for request ${updatedRequest.id} - requesting artist has no associated user ID for socket targeting.`);
    }
    return {
        message: `Label registration request ${updatedRequest.id} rejected successfully.`,
        rejectedRequestId: updatedRequest.id
    };
};
exports.rejectLabelRegistration = rejectLabelRegistration;
const getPendingArtistRoleRequests = async (req) => {
    const { search, startDate, endDate, status } = req.query;
    const where = {
        status: client_1.RequestStatus.PENDING,
    };
    if (status && typeof status === 'string' && status !== 'ALL' && Object.values(client_1.RequestStatus).includes(status)) {
        where.status = status;
    }
    else if (status === 'ALL') {
        delete where.status;
    }
    const andConditions = [];
    if (search && typeof search === 'string' && search.trim()) {
        const trimmedSearch = search.trim();
        andConditions.push({
            OR: [
                { artistName: { contains: trimmedSearch, mode: 'insensitive' } },
                { user: { name: { contains: trimmedSearch, mode: 'insensitive' } } },
                { user: { email: { contains: trimmedSearch, mode: 'insensitive' } } },
                { requestedLabelName: { contains: trimmedSearch, mode: 'insensitive' } },
            ],
        });
    }
    const dateFilter = {};
    if (andConditions.length > 0) {
        if (where.AND) {
            if (Array.isArray(where.AND)) {
                where.AND.push(...andConditions);
            }
            else {
                where.AND = [where.AND, ...andConditions];
            }
        }
        else {
            where.AND = andConditions;
        }
    }
    const artistRoleRequestSelect = {
        id: true,
        artistName: true,
        bio: true,
        status: true,
        requestedLabelName: true,
        user: {
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
            },
        },
    };
    const options = {
        where,
        select: artistRoleRequestSelect,
        orderBy: { id: 'desc' },
    };
    const result = await (0, handle_utils_1.paginate)(db_1.default.artistRequest, req, options);
    return {
        requests: result.data,
        pagination: result.pagination,
    };
};
exports.getPendingArtistRoleRequests = getPendingArtistRoleRequests;
const extractTrackAndArtistData = async () => {
    try {
        const artists = await db_1.default.artistProfile.findMany({
            where: {
                isActive: true,
                isVerified: true
            },
            select: {
                id: true,
                artistName: true,
                bio: true,
                monthlyListeners: true,
                createdAt: true,
                isVerified: true,
                userId: true,
                label: {
                    select: {
                        name: true
                    }
                },
                genres: {
                    select: {
                        genre: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                tracks: {
                    select: {
                        id: true
                    }
                }
            },
            orderBy: {
                artistName: 'asc'
            }
        });
        const albums = await db_1.default.album.findMany({
            where: {
                isActive: true
            },
            select: {
                id: true,
                title: true,
                coverUrl: true,
                releaseDate: true,
                duration: true,
                totalTracks: true,
                type: true,
                createdAt: true,
                artist: {
                    select: {
                        id: true,
                        artistName: true
                    }
                },
                label: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                genres: {
                    select: {
                        genre: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
            },
            orderBy: [
                {
                    artist: {
                        artistName: 'asc'
                    }
                },
                {
                    releaseDate: 'desc'
                }
            ]
        });
        const tracks = await db_1.default.track.findMany({
            where: {
                isActive: true
            },
            select: {
                id: true,
                title: true,
                duration: true,
                releaseDate: true,
                coverUrl: true,
                audioUrl: true,
                label: {
                    select: {
                        name: true
                    }
                },
                playCount: true,
                tempo: true,
                mood: true,
                key: true,
                scale: true,
                danceability: true,
                energy: true,
                artist: {
                    select: {
                        artistName: true
                    }
                },
                album: {
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        releaseDate: true,
                        coverUrl: true,
                        totalTracks: true,
                        duration: true
                    }
                },
                genres: {
                    select: {
                        genre: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                featuredArtists: {
                    select: {
                        artistProfile: {
                            select: {
                                artistName: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                {
                    artist: {
                        artistName: 'asc'
                    }
                },
                {
                    releaseDate: 'desc'
                }
            ]
        });
        const artistsForExport = artists.map(artist => ({
            id: artist.id,
            artistName: artist.artistName,
            bio: artist.bio || '',
            userId: artist.userId || '',
            monthlyListeners: artist.monthlyListeners,
            verified: artist.isVerified,
            label: artist.label?.name || '',
            genres: artist.genres.map(g => g.genre.name).join(', '),
            trackCount: artist.tracks.length,
            createdAt: artist.createdAt.toISOString().split('T')[0]
        }));
        const albumsForExport = albums.map(album => ({
            id: album.id,
            title: album.title,
            artistName: album.artist.artistName,
            artistId: album.artist.id,
            releaseDate: album.releaseDate.toISOString().split('T')[0],
            albumType: album.type,
            totalTracks: album.totalTracks,
            duration: album.duration,
            labelName: album.label?.name || '',
            coverUrl: album.coverUrl || '',
            genres: album.genres.map(g => g.genre.name).join(', '),
            createdAt: album.createdAt.toISOString().split('T')[0]
        }));
        const tracksForExport = tracks.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.artist.artistName,
            album: track.album?.title || '(Single)',
            albumId: track.album?.id || '',
            albumType: track.album?.type || 'SINGLE',
            albumReleaseDate: track.album?.releaseDate ? track.album.releaseDate.toISOString().split('T')[0] : '',
            albumTotalTracks: track.album?.totalTracks || 1,
            albumDuration: track.album?.duration || track.duration,
            coverUrl: track.coverUrl || track.album?.coverUrl || '',
            audioUrl: track.audioUrl,
            labelName: track.label?.name || '',
            featuredArtistNames: track.featuredArtists?.map(fa => fa.artistProfile.artistName).join(', ') || '',
            duration: track.duration,
            releaseDate: track.releaseDate.toISOString().split('T')[0],
            playCount: track.playCount,
            tempo: track.tempo || null,
            mood: track.mood || '',
            key: track.key || '',
            scale: track.scale || '',
            danceability: track.danceability || null,
            energy: track.energy || null,
            genres: track.genres.map(g => g.genre.name).join(', ')
        }));
        return {
            artists: artistsForExport,
            albums: albumsForExport,
            tracks: tracksForExport,
            exportDate: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error extracting track and artist data:', error);
        throw error;
    }
};
exports.extractTrackAndArtistData = extractTrackAndArtistData;
const fixAlbumTrackTypeConsistency = async () => {
    try {
        console.log('[Admin Service] Starting album track type consistency fix...');
        const albums = await db_1.default.album.findMany({
            select: {
                id: true,
                title: true,
                type: true,
                tracks: {
                    select: {
                        id: true,
                        type: true
                    }
                }
            }
        });
        console.log(`[Admin Service] Found ${albums.length} albums to check for track type consistency`);
        let fixedAlbums = 0;
        let fixedTracks = 0;
        for (const album of albums) {
            const inconsistentTracks = album.tracks.filter(track => track.type !== album.type);
            if (inconsistentTracks.length > 0) {
                await db_1.default.track.updateMany({
                    where: {
                        albumId: album.id,
                        type: { not: album.type }
                    },
                    data: { type: album.type }
                });
                fixedAlbums++;
                fixedTracks += inconsistentTracks.length;
                console.log(`[Admin Service] Fixed ${inconsistentTracks.length} tracks in album "${album.title}" (ID: ${album.id})`);
            }
        }
        return {
            success: true,
            message: `Fixed track types in ${fixedAlbums} albums, updating ${fixedTracks} tracks to match their album types.`,
            fixedAlbums,
            fixedTracks
        };
    }
    catch (error) {
        console.error('[Admin Service] Error fixing album track type consistency:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            error: true
        };
    }
};
exports.fixAlbumTrackTypeConsistency = fixAlbumTrackTypeConsistency;
//# sourceMappingURL=admin.service.js.map