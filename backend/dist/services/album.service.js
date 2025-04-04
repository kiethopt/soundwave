"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllAlbums = exports.getHotAlbums = exports.getNewestAlbums = exports.deleteAlbumById = void 0;
const prisma_selects_1 = require("../utils/prisma-selects");
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const handle_utils_1 = require("../utils/handle-utils");
const deleteAlbumById = async (id) => {
    const album = await db_1.default.album.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!album) {
        throw new Error('Album not found');
    }
    return db_1.default.album.delete({
        where: { id },
    });
};
exports.deleteAlbumById = deleteAlbumById;
const getNewestAlbums = async (limit = 10) => {
    return db_1.default.album.findMany({
        where: {
            isActive: true,
        },
        orderBy: {
            releaseDate: 'desc',
        },
        take: limit,
        select: prisma_selects_1.albumSelect,
    });
};
exports.getNewestAlbums = getNewestAlbums;
const getHotAlbums = async (limit = 10) => {
    return db_1.default.album.findMany({
        where: {
            isActive: true,
            tracks: {
                some: {
                    isActive: true,
                },
            },
        },
        orderBy: [
            {
                tracks: {
                    _count: 'desc',
                },
            },
            {
                releaseDate: 'desc',
            },
        ],
        take: limit,
        select: prisma_selects_1.albumSelect,
    });
};
exports.getHotAlbums = getHotAlbums;
const getAllAlbums = async (req) => {
    const { search, sortBy, sortOrder } = req.query;
    const user = req.user;
    const whereClause = {};
    if (user && user.role !== client_1.Role.ADMIN && user.artistProfile?.id) {
        whereClause.artistId = user.artistProfile.id;
    }
    if (search && typeof search === 'string') {
        whereClause.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { artist: { artistName: { contains: search, mode: 'insensitive' } } },
            {
                genres: {
                    some: {
                        genre: {
                            name: { contains: search, mode: 'insensitive' },
                        },
                    },
                },
            },
        ];
    }
    const orderByClause = {};
    if (sortBy &&
        typeof sortBy === 'string' &&
        (sortOrder === 'asc' || sortOrder === 'desc')) {
        if (sortBy === 'title' || sortBy === 'type' || sortBy === 'releaseDate') {
            orderByClause[sortBy] = sortOrder;
        }
        else if (sortBy === 'totalTracks') {
            orderByClause.tracks = {
                _count: sortOrder,
            };
        }
        else {
            orderByClause.releaseDate = 'desc';
        }
    }
    else {
        orderByClause.releaseDate = 'desc';
    }
    const result = await (0, handle_utils_1.paginate)(db_1.default.album, req, {
        where: whereClause,
        include: {
            artist: { select: { id: true, artistName: true, avatar: true } },
            genres: { include: { genre: true } },
            _count: { select: { tracks: true } },
        },
        orderBy: orderByClause,
    });
    const formattedAlbums = result.data.map((album) => ({
        ...album,
        totalTracks: album._count?.tracks ?? 0,
        genres: album.genres,
    }));
    return {
        data: formattedAlbums,
        pagination: result.pagination,
    };
};
exports.getAllAlbums = getAllAlbums;
//# sourceMappingURL=album.service.js.map