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
exports.getAllTracks = exports.unlikeTrack = exports.likeTrack = exports.deleteTrackById = void 0;
const db_1 = __importDefault(require("../config/db"));
const handle_utils_1 = require("../utils/handle-utils");
const deleteTrackById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const track = yield db_1.default.track.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!track) {
        throw new Error('Track not found');
    }
    return db_1.default.track.delete({
        where: { id },
    });
});
exports.deleteTrackById = deleteTrackById;
const likeTrack = (userId, trackId) => __awaiter(void 0, void 0, void 0, function* () {
    const track = yield db_1.default.track.findFirst({
        where: {
            id: trackId,
            isActive: true,
        },
    });
    if (!track) {
        throw new Error('Track not found or not active');
    }
    const existingLike = yield db_1.default.userLikeTrack.findUnique({
        where: {
            userId_trackId: {
                userId,
                trackId,
            },
        },
    });
    if (existingLike) {
        throw new Error('Track already liked');
    }
    yield db_1.default.userLikeTrack.create({
        data: {
            userId,
            trackId,
        },
    });
    const favoritePlaylist = yield db_1.default.playlist.findFirst({
        where: {
            userId,
            type: 'FAVORITE',
        },
    });
    if (!favoritePlaylist) {
        throw new Error('Favorite playlist not found');
    }
    const tracksCount = yield db_1.default.playlistTrack.count({
        where: {
            playlistId: favoritePlaylist.id,
        },
    });
    return db_1.default.playlistTrack.create({
        data: {
            playlistId: favoritePlaylist.id,
            trackId,
            trackOrder: tracksCount + 1,
        },
    });
});
exports.likeTrack = likeTrack;
const unlikeTrack = (userId, trackId) => __awaiter(void 0, void 0, void 0, function* () {
    const existingLike = yield db_1.default.userLikeTrack.findUnique({
        where: {
            userId_trackId: {
                userId,
                trackId,
            },
        },
    });
    if (!existingLike) {
        throw new Error('Track not liked');
    }
    yield db_1.default.userLikeTrack.delete({
        where: {
            userId_trackId: {
                userId,
                trackId,
            },
        },
    });
    return db_1.default.playlistTrack.deleteMany({
        where: {
            playlist: {
                userId,
                type: 'FAVORITE',
            },
            trackId,
        },
    });
});
exports.unlikeTrack = unlikeTrack;
const getAllTracks = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { search, sortBy, sortOrder } = req.query;
    const whereClause = {};
    if (search && typeof search === 'string') {
        whereClause.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { artist: { artistName: { contains: search, mode: 'insensitive' } } },
            { album: { title: { contains: search, mode: 'insensitive' } } },
            {
                genres: {
                    some: {
                        genre: {
                            name: { contains: search, mode: 'insensitive' },
                        },
                    },
                },
            },
            {
                featuredArtists: {
                    some: {
                        artistProfile: {
                            artistName: { contains: search, mode: 'insensitive' },
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
        if (sortBy === 'title' ||
            sortBy === 'duration' ||
            sortBy === 'releaseDate' ||
            sortBy === 'createdAt' ||
            sortBy === 'isActive') {
            orderByClause[sortBy] = sortOrder;
        }
        else if (sortBy === 'album') {
            orderByClause.album = { title: sortOrder };
        }
        else if (sortBy === 'artist') {
            orderByClause.artist = { artistName: sortOrder };
        }
        else {
            orderByClause.releaseDate = 'desc';
        }
    }
    else {
        orderByClause.releaseDate = 'desc';
    }
    const result = yield (0, handle_utils_1.paginate)(db_1.default.track, req, {
        where: whereClause,
        include: {
            artist: { select: { id: true, artistName: true, avatar: true } },
            album: { select: { id: true, title: true } },
            genres: { include: { genre: true } },
            featuredArtists: {
                include: { artistProfile: { select: { id: true, artistName: true } } },
            },
        },
        orderBy: orderByClause,
    });
    const formattedTracks = result.data.map((track) => (Object.assign(Object.assign({}, track), { genres: track.genres, featuredArtists: track.featuredArtists })));
    return {
        data: formattedTracks,
        pagination: result.pagination,
    };
});
exports.getAllTracks = getAllTracks;
//# sourceMappingURL=track.service.js.map