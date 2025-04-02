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
exports.getAllAlbums = exports.getHotAlbums = exports.getNewestAlbums = exports.deleteAlbumById = void 0;
const prisma_selects_1 = require("../utils/prisma-selects");
const db_1 = __importDefault(require("../config/db"));
const handle_utils_1 = require("../utils/handle-utils");
const deleteAlbumById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const album = yield db_1.default.album.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!album) {
        throw new Error('Album not found');
    }
    return db_1.default.album.delete({
        where: { id },
    });
});
exports.deleteAlbumById = deleteAlbumById;
const getNewestAlbums = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 10) {
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
});
exports.getNewestAlbums = getNewestAlbums;
const getHotAlbums = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 10) {
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
});
exports.getHotAlbums = getHotAlbums;
const getAllAlbums = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { search, sortBy, sortOrder } = req.query;
    const whereClause = {};
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
    const result = yield (0, handle_utils_1.paginate)(db_1.default.album, req, {
        where: whereClause,
        include: {
            artist: { select: { id: true, artistName: true, avatar: true } },
            genres: { include: { genre: true } },
            _count: { select: { tracks: true } },
        },
        orderBy: orderByClause,
    });
    const formattedAlbums = result.data.map((album) => {
        var _a, _b;
        return (Object.assign(Object.assign({}, album), { totalTracks: (_b = (_a = album._count) === null || _a === void 0 ? void 0 : _a.tracks) !== null && _b !== void 0 ? _b : 0, genres: album.genres }));
    });
    return {
        data: formattedAlbums,
        pagination: result.pagination,
    };
});
exports.getAllAlbums = getAllAlbums;
//# sourceMappingURL=album.service.js.map