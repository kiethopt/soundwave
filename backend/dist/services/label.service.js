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
exports.deleteLabel = exports.updateLabel = exports.createLabel = exports.getLabelById = exports.getAllLabels = void 0;
const db_1 = __importDefault(require("../config/db"));
const prisma_selects_1 = require("../utils/prisma-selects");
const getAllLabels = () => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.label.findMany({
        orderBy: {
            name: 'asc',
        },
        select: prisma_selects_1.labelSelect,
    });
});
exports.getAllLabels = getAllLabels;
const getLabelById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const label = yield db_1.default.label.findUnique({
        where: { id },
        select: Object.assign(Object.assign({}, prisma_selects_1.labelSelect), { albums: {
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
            }, tracks: {
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
            } }),
    });
    if (!label)
        return null;
    const artistMap = new Map();
    (_a = label.albums) === null || _a === void 0 ? void 0 : _a.forEach((album) => {
        if (album.artist) {
            const artistId = album.artist.id;
            if (!artistMap.has(artistId)) {
                artistMap.set(artistId, Object.assign(Object.assign({}, album.artist), { albumCount: 0, trackCount: 0 }));
            }
            const artist = artistMap.get(artistId);
            artist.albumCount += 1;
            artistMap.set(artistId, artist);
        }
    });
    (_b = label.tracks) === null || _b === void 0 ? void 0 : _b.forEach((track) => {
        if (track.artist) {
            const artistId = track.artist.id;
            if (!artistMap.has(artistId)) {
                artistMap.set(artistId, Object.assign(Object.assign({}, track.artist), { albumCount: 0, trackCount: 0 }));
            }
            const artist = artistMap.get(artistId);
            artist.trackCount += 1;
            artistMap.set(artistId, artist);
        }
    });
    const artists = Array.from(artistMap.values()).sort((a, b) => a.artistName.localeCompare(b.artistName));
    return Object.assign(Object.assign({}, label), { artists: artists });
});
exports.getLabelById = getLabelById;
const createLabel = (data) => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.label.create({
        data,
        select: prisma_selects_1.labelSelect,
    });
});
exports.createLabel = createLabel;
const updateLabel = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.label.update({
        where: { id },
        data,
        select: prisma_selects_1.labelSelect,
    });
});
exports.updateLabel = updateLabel;
const deleteLabel = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return db_1.default.label.delete({
        where: { id },
    });
});
exports.deleteLabel = deleteLabel;
//# sourceMappingURL=label.service.js.map