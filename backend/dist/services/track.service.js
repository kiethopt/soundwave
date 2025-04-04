"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTracks = exports.unlikeTrack = exports.likeTrack = exports.deleteTrackById = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const handle_utils_1 = require("../utils/handle-utils");
const deleteTrackById = async (id) => {
    const track = await db_1.default.track.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!track) {
        throw new Error('Track not found');
    }
    return db_1.default.track.delete({
        where: { id },
    });
};
exports.deleteTrackById = deleteTrackById;
const likeTrack = async (userId, trackId) => {
    const track = await db_1.default.track.findFirst({
        where: {
            id: trackId,
            isActive: true,
        },
    });
    if (!track) {
        throw new Error('Track not found or not active');
    }
    const existingLike = await db_1.default.userLikeTrack.findUnique({
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
    await db_1.default.userLikeTrack.create({
        data: {
            userId,
            trackId,
        },
    });
    const favoritePlaylist = await db_1.default.playlist.findFirst({
        where: {
            userId,
            type: 'FAVORITE',
        },
    });
    if (!favoritePlaylist) {
        throw new Error('Favorite playlist not found');
    }
    const tracksCount = await db_1.default.playlistTrack.count({
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
};
exports.likeTrack = likeTrack;
const unlikeTrack = async (userId, trackId) => {
    const existingLike = await db_1.default.userLikeTrack.findUnique({
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
    await db_1.default.userLikeTrack.delete({
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
};
exports.unlikeTrack = unlikeTrack;
const getAllTracks = async (req) => {
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
    const result = await (0, handle_utils_1.paginate)(db_1.default.track, req, {
        where: whereClause,
        include: {
            artist: {
                select: { id: true, artistName: true, avatar: true },
            },
            album: { select: { id: true, title: true } },
            genres: { include: { genre: true } },
            featuredArtists: {
                include: { artistProfile: { select: { id: true, artistName: true } } },
            },
        },
        orderBy: orderByClause,
    });
    const formattedTracks = result.data.map((track) => ({
        ...track,
        genres: track.genres,
        featuredArtists: track.featuredArtists,
    }));
    return {
        data: formattedTracks,
        pagination: result.pagination,
    };
};
exports.getAllTracks = getAllTracks;
//# sourceMappingURL=track.service.js.map