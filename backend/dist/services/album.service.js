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
exports.getHotAlbums = exports.getNewestAlbums = exports.deleteAlbumById = void 0;
const prisma_selects_1 = require("src/utils/prisma-selects");
const db_1 = __importDefault(require("../config/db"));
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
//# sourceMappingURL=album.service.js.map