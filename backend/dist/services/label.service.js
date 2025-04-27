"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLabel = exports.updateLabel = exports.createLabel = exports.getLabelById = exports.getAllLabels = void 0;
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const upload_service_1 = require("./upload.service");
const handle_utils_1 = require("../utils/handle-utils");
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
    const artistMap = new Map();
    label.albums?.forEach((album) => {
        if (album.artist) {
            const artistId = album.artist.id;
            if (!artistMap.has(artistId)) {
                artistMap.set(artistId, {
                    ...album.artist,
                    albumCount: 0,
                    trackCount: 0,
                });
            }
            const artist = artistMap.get(artistId);
            artist.albumCount += 1;
            artistMap.set(artistId, artist);
        }
    });
    label.tracks?.forEach((track) => {
        if (track.artist) {
            const artistId = track.artist.id;
            if (!artistMap.has(artistId)) {
                artistMap.set(artistId, {
                    ...track.artist,
                    albumCount: 0,
                    trackCount: 0,
                });
            }
            const artist = artistMap.get(artistId);
            artist.trackCount += 1;
            artistMap.set(artistId, artist);
        }
    });
    const artists = Array.from(artistMap.values()).sort((a, b) => a.artistName.localeCompare(b.artistName));
    return {
        ...label,
        artists,
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
//# sourceMappingURL=label.service.js.map