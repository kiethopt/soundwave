"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSelectableLabelsForArtist = exports.rejectLabelRegistration = exports.approveLabelRegistration = exports.getLabelRegistrationById = exports.getAllLabelRegistrations = exports.requestNewLabelRegistration = exports.deleteLabel = exports.updateLabel = exports.createLabel = exports.getLabelById = exports.getAllLabels = void 0;
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const upload_service_1 = require("./upload.service");
const handle_utils_1 = require("../utils/handle-utils");
const client_1 = require("@prisma/client");
const getAllLabels = async (req) => {
    const { search, sortBy, sortOrder } = req.query;
    const whereClause = {};
    if (search && typeof search === 'string') {
        whereClause.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }
    const orderByClause = {};
    const validSortKeys = ['name', 'tracks', 'albums'];
    const key = sortBy;
    const order = sortOrder === 'desc' ? 'desc' : 'asc';
    if (sortBy && typeof sortBy === 'string' && validSortKeys.includes(key)) {
        if (key === 'name') {
            orderByClause.name = order;
        }
        else if (key === 'tracks') {
            orderByClause.tracks = { _count: order };
        }
        else if (key === 'albums') {
            orderByClause.albums = { _count: order };
        }
    }
    else {
        orderByClause.name = 'asc';
    }
    const result = await (0, handle_utils_1.paginate)(db_1.default.label, req, {
        where: whereClause,
        include: {
            _count: {
                select: {
                    tracks: true,
                    albums: true,
                },
            },
        },
        orderBy: orderByClause,
    });
    return {
        data: result.data,
        pagination: result.pagination,
    };
};
exports.getAllLabels = getAllLabels;
const getLabelById = async (id) => {
    const label = await db_1.default.label.findUnique({
        where: { id },
        select: {
            ...prisma_selects_1.labelSelect,
            artists: {
                select: {
                    id: true,
                    artistName: true,
                    avatar: true,
                    isVerified: true,
                    _count: {
                        select: {
                            albums: { where: { isActive: true } },
                            tracks: { where: { isActive: true } },
                        },
                    },
                },
                orderBy: { artistName: 'asc' },
            },
            albums: {
                where: { isActive: true },
                select: {
                    id: true,
                    title: true,
                    coverUrl: true,
                    releaseDate: true,
                    type: true,
                    totalTracks: true,
                    artist: {
                        select: {
                            id: true,
                            artistName: true,
                            avatar: true,
                            isVerified: true,
                        },
                    },
                },
                orderBy: { releaseDate: 'desc' },
            },
            tracks: {
                where: { isActive: true },
                select: {
                    id: true,
                    title: true,
                    coverUrl: true,
                    releaseDate: true,
                    duration: true,
                    playCount: true,
                    artist: {
                        select: {
                            id: true,
                            artistName: true,
                            avatar: true,
                            isVerified: true,
                        },
                    },
                    album: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
                orderBy: { releaseDate: 'desc' },
            },
        },
    });
    if (!label)
        return null;
    const artistsWithCounts = label.artists.map(artist => ({
        ...artist,
        albumCount: artist._count.albums,
        trackCount: artist._count.tracks,
    }));
    return {
        ...label,
        artists: artistsWithCounts,
    };
};
exports.getLabelById = getLabelById;
const createLabel = async (req) => {
    const { name, description } = req.body;
    const logoFile = req.file;
    const errors = (0, handle_utils_1.runValidations)([
        (0, handle_utils_1.validateField)(name, 'name', { required: true }),
    ]);
    if (errors.length > 0) {
        throw { status: 400, message: 'Validation failed', errors };
    }
    const existingLabel = await db_1.default.label.findUnique({
        where: { name },
    });
    if (existingLabel) {
        throw { status: 400, message: 'A label with this name already exists' };
    }
    let logoUrl;
    if (logoFile) {
        const uploadResult = await (0, upload_service_1.uploadFile)(logoFile.buffer, 'labels', 'image');
        logoUrl = uploadResult.secure_url;
    }
    return db_1.default.label.create({
        data: {
            name,
            description,
            logoUrl,
        },
        select: prisma_selects_1.labelSelect,
    });
};
exports.createLabel = createLabel;
const updateLabel = async (req) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const logoFile = req.file;
    const existingLabel = await db_1.default.label.findUnique({
        where: { id },
    });
    if (!existingLabel) {
        throw { status: 404, message: 'Label not found' };
    }
    if (name && name !== existingLabel.name) {
        const nameConflict = await db_1.default.label.findUnique({
            where: { name },
        });
        if (nameConflict) {
            throw { status: 400, message: 'A label with this name already exists' };
        }
    }
    let updateData = {};
    if (name)
        updateData.name = name;
    if (description !== undefined)
        updateData.description = description;
    if (logoFile) {
        const uploadResult = await (0, upload_service_1.uploadFile)(logoFile.buffer, 'labels', 'image');
        updateData.logoUrl = uploadResult.secure_url;
    }
    return db_1.default.label.update({
        where: { id },
        data: updateData,
        select: prisma_selects_1.labelSelect,
    });
};
exports.updateLabel = updateLabel;
const deleteLabel = async (id) => {
    const existingLabel = await db_1.default.label.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    albums: true,
                    tracks: true,
                },
            },
        },
    });
    if (!existingLabel) {
        throw { status: 404, message: 'Label not found' };
    }
    if (existingLabel._count.albums > 0 || existingLabel._count.tracks > 0) {
        throw {
            status: 400,
            message: 'Cannot delete label with associated albums or tracks. Remove the associations first.',
            data: {
                albums: existingLabel._count.albums,
                tracks: existingLabel._count.tracks,
            },
        };
    }
    return db_1.default.label.delete({
        where: { id },
    });
};
exports.deleteLabel = deleteLabel;
const requestNewLabelRegistration = async (userId, data, logoFile) => {
    const errors = (0, handle_utils_1.runValidations)([
        (0, handle_utils_1.validateField)(data.name, 'name', { required: true, minLength: 3, maxLength: 100 }),
        (0, handle_utils_1.validateField)(data.description, 'description', { maxLength: 500 }),
    ]);
    if (errors.length > 0) {
        throw { status: 400, message: 'Validation failed', errors };
    }
    const artistProfile = await db_1.default.artistProfile.findUnique({
        where: { userId },
    });
    if (!artistProfile) {
        throw { status: 403, message: 'User does not have an artist profile or is not an artist.' };
    }
    const existingPendingRequest = await db_1.default.labelRegistrationRequest.findFirst({
        where: {
            requestingArtistId: artistProfile.id,
            requestedLabelName: data.name,
            status: client_1.RequestStatus.PENDING,
        },
    });
    if (existingPendingRequest) {
        throw { status: 400, message: `You already have a pending registration request for the label "${data.name}".` };
    }
    let logoUrl;
    if (logoFile) {
        try {
            const uploadResult = await (0, upload_service_1.uploadFile)(logoFile.buffer, 'label_logos', 'image');
            logoUrl = uploadResult.secure_url;
        }
        catch (uploadError) {
            console.error("Error uploading label logo:", uploadError);
            throw { status: 500, message: 'Failed to upload label logo.' };
        }
    }
    const registrationRequest = await db_1.default.labelRegistrationRequest.create({
        data: {
            requestedLabelName: data.name,
            requestedLabelDescription: data.description,
            requestedLabelLogoUrl: logoUrl,
            requestingArtistId: artistProfile.id,
            status: client_1.RequestStatus.PENDING,
        },
        include: {
            requestingArtist: {
                select: {
                    artistName: true,
                },
            },
        },
    });
    const admins = await db_1.default.user.findMany({ where: { role: 'ADMIN' } });
    if (admins.length > 0) {
        const notifications = admins.map(admin => ({
            userId: admin.id,
            recipientType: client_1.RecipientType.USER,
            type: client_1.NotificationType.LABEL_REGISTRATION_SUBMITTED,
            message: `Artist ${artistProfile.artistName} has requested to register a new label: "${data.name}".`,
        }));
        await db_1.default.notification.createMany({ data: notifications });
    }
    return registrationRequest;
};
exports.requestNewLabelRegistration = requestNewLabelRegistration;
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
        let targetLabelId;
        let newLabelWasActuallyCreated = false;
        let finalLabelName = registrationRequest.requestedLabelName;
        const existingLabel = await tx.label.findUnique({
            where: { name: registrationRequest.requestedLabelName },
            select: { id: true, name: true },
        });
        if (existingLabel) {
            targetLabelId = existingLabel.id;
            finalLabelName = existingLabel.name;
        }
        else {
            const newLabel = await tx.label.create({
                data: {
                    name: registrationRequest.requestedLabelName,
                    description: registrationRequest.requestedLabelDescription,
                    logoUrl: registrationRequest.requestedLabelLogoUrl,
                },
                select: { id: true, name: true },
            });
            targetLabelId = newLabel.id;
            finalLabelName = newLabel.name;
            newLabelWasActuallyCreated = true;
        }
        await tx.artistProfile.update({
            where: { id: registrationRequest.requestingArtistId },
            data: { labelId: targetLabelId },
        });
        const labelRegistrationUpdateData = {
            status: client_1.RequestStatus.APPROVED,
            reviewedAt: new Date(),
            reviewedByAdmin: { connect: { id: adminUserId } },
        };
        if (newLabelWasActuallyCreated) {
            labelRegistrationUpdateData.createdLabel = { connect: { id: targetLabelId } };
        }
        const updatedRequest = await tx.labelRegistrationRequest.update({
            where: { id: registrationId },
            data: labelRegistrationUpdateData,
        });
        let approvalMessage;
        if (newLabelWasActuallyCreated) {
            approvalMessage = `Congratulations! Your request to register the label "${finalLabelName}" has been approved, and the label has been created.`;
        }
        else {
            approvalMessage = `Congratulations! Your request concerning the label "${finalLabelName}" has been approved. You are now associated with this existing label.`;
        }
        if (registrationRequest.requestingArtist.userId) {
            await tx.notification.create({
                data: {
                    userId: registrationRequest.requestingArtist.userId,
                    recipientType: client_1.RecipientType.ARTIST,
                    type: client_1.NotificationType.LABEL_REGISTRATION_APPROVED,
                    message: approvalMessage,
                    artistId: registrationRequest.requestingArtistId,
                },
            });
        }
        const finalLabelDetails = await tx.label.findUnique({
            where: { id: targetLabelId },
            select: prisma_selects_1.labelSelect
        });
        return { updatedRequest, label: finalLabelDetails };
    });
};
exports.approveLabelRegistration = approveLabelRegistration;
const rejectLabelRegistration = async (adminUserId, registrationId, rejectionReason) => {
    const errors = (0, handle_utils_1.runValidations)([
        (0, handle_utils_1.validateField)(rejectionReason, 'rejectionReason', { required: true, minLength: 10, maxLength: 500 }),
    ]);
    if (errors.length > 0) {
        throw { status: 400, message: 'Validation failed for rejection reason', errors };
    }
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
    const updatedRequest = await db_1.default.labelRegistrationRequest.update({
        where: { id: registrationId },
        data: {
            status: client_1.RequestStatus.REJECTED,
            reviewedAt: new Date(),
            reviewedByAdminId: adminUserId,
            rejectionReason: rejectionReason,
        },
    });
    if (registrationRequest.requestingArtist.userId) {
        await db_1.default.notification.create({
            data: {
                userId: registrationRequest.requestingArtist.userId,
                recipientType: client_1.RecipientType.ARTIST,
                type: client_1.NotificationType.LABEL_REGISTRATION_REJECTED,
                message: `We regret to inform you that your request to register the label "${registrationRequest.requestedLabelName}" has been rejected. Reason: ${rejectionReason}`,
                artistId: registrationRequest.requestingArtistId,
            },
        });
    }
    return updatedRequest;
};
exports.rejectLabelRegistration = rejectLabelRegistration;
const getSelectableLabelsForArtist = async (artistProfileId) => {
    if (!artistProfileId) {
        throw new Error('Artist profile ID is required to fetch selectable labels.');
    }
    let selectableLabels = [];
    const artistProfile = await db_1.default.artistProfile.findUnique({
        where: { id: artistProfileId },
        select: {
            labelId: true,
            label: { select: prisma_selects_1.labelSelect },
        },
    });
    if (artistProfile?.label) {
        selectableLabels.push(artistProfile.label);
    }
    const approvedRequestsCreatingLabels = await db_1.default.labelRegistrationRequest.findMany({
        where: {
            requestingArtistId: artistProfileId,
            status: client_1.RequestStatus.APPROVED,
            createdLabelId: {
                not: null,
            },
        },
        select: {
            createdLabel: {
                select: prisma_selects_1.labelSelect,
            },
        },
    });
    const createdLabels = approvedRequestsCreatingLabels
        .map(req => req.createdLabel)
        .filter(label => label !== null && label !== undefined);
    createdLabels.forEach(createdLabel => {
        if (createdLabel && !selectableLabels.some(sl => sl.id === createdLabel.id)) {
            selectableLabels.push(createdLabel);
        }
    });
    selectableLabels.sort((a, b) => a.name.localeCompare(b.name));
    return selectableLabels;
};
exports.getSelectableLabelsForArtist = getSelectableLabelsForArtist;
//# sourceMappingURL=label.service.js.map