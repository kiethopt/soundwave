"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSearchHistoryService = exports.getSearchSuggestionsService = exports.getAllHistoryService = exports.getSearchHistoryService = exports.getPlayHistoryService = exports.saveSearchHistoryService = exports.savePlayHistoryService = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const prisma_selects_1 = require("../utils/prisma-selects");
const handle_utils_1 = require("src/utils/handle-utils");
const playlist_service_1 = require("./playlist.service");
const savePlayHistoryService = async (userId, trackId, duration, completed) => {
    const track = await db_1.default.track.findUnique({
        where: { id: trackId },
        select: { id: true, artistId: true },
    });
    if (!track) {
        throw new Error('Track not found');
    }
    const artistId = track.artistId;
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const existingListen = await db_1.default.history.findFirst({
        where: {
            userId: userId,
            track: { artistId: artistId },
            createdAt: { gte: lastMonth },
        },
    });
    if (!existingListen) {
        await db_1.default.artistProfile.update({
            where: { id: artistId },
            data: { monthlyListeners: { increment: 1 } },
        });
    }
    const history = await db_1.default.history.create({
        data: {
            type: client_1.HistoryType.PLAY,
            duration,
            completed,
            trackId,
            userId: userId,
            playCount: 1,
        },
        select: prisma_selects_1.historySelect,
    });
    if (completed) {
        await db_1.default.track.update({
            where: { id: trackId },
            data: {
                playCount: { increment: 1 },
            },
        });
        try {
            await (0, playlist_service_1.updateVibeRewindPlaylist)(userId);
        }
        catch (error) {
            console.error(`[HistoryService] Error updating Vibe Rewind for user ${userId}:`, error);
        }
    }
    return history;
};
exports.savePlayHistoryService = savePlayHistoryService;
const saveSearchHistoryService = async (userId, query) => {
    if (!query?.trim()) {
        throw new Error('Search query is required');
    }
    const recentSearch = await db_1.default.history.findFirst({
        where: {
            userId: userId,
            type: client_1.HistoryType.SEARCH,
            query: query,
            createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) }
        }
    });
    if (recentSearch) {
        return db_1.default.history.update({
            where: { id: recentSearch.id },
            data: { updatedAt: new Date() },
            select: prisma_selects_1.historySelect,
        });
    }
    return db_1.default.history.create({
        data: {
            type: client_1.HistoryType.SEARCH,
            query,
            userId: userId,
            duration: null,
            completed: null,
            playCount: null,
        },
        select: prisma_selects_1.historySelect,
    });
};
exports.saveSearchHistoryService = saveSearchHistoryService;
const getPlayHistoryService = async (req) => {
    const user = req.user;
    if (!user) {
        throw new Error('Unauthorized');
    }
    return (0, handle_utils_1.paginate)(db_1.default.history, req, {
        where: {
            userId: user.id,
            type: client_1.HistoryType.PLAY,
        },
        select: prisma_selects_1.historySelect,
        orderBy: { updatedAt: 'desc' },
    });
};
exports.getPlayHistoryService = getPlayHistoryService;
const getSearchHistoryService = async (req) => {
    const user = req.user;
    if (!user) {
        throw new Error('Unauthorized');
    }
    const distinctSearches = await db_1.default.history.findMany({
        where: {
            userId: user.id,
            type: client_1.HistoryType.SEARCH,
        },
        distinct: ['query'],
        orderBy: { updatedAt: 'desc' },
        take: Number(req.query.limit) || 10,
        select: { query: true, updatedAt: true }
    });
    const histories = await db_1.default.history.findMany({
        where: {
            userId: user.id,
            type: client_1.HistoryType.SEARCH,
            query: { in: distinctSearches.map(s => s.query) }
        },
        orderBy: { updatedAt: 'desc' },
        select: prisma_selects_1.historySelect,
        take: Number(req.query.limit) || 10,
    });
    const latestHistoriesMap = new Map();
    histories.forEach(h => {
        if (h.query && (!latestHistoriesMap.has(h.query) || h.updatedAt > latestHistoriesMap.get(h.query).updatedAt)) {
            latestHistoriesMap.set(h.query, h);
        }
    });
    const latestHistories = Array.from(latestHistoriesMap.values())
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const totalDistinctHistories = await db_1.default.history.findMany({
        where: {
            userId: user.id,
            type: client_1.HistoryType.SEARCH,
        },
        distinct: ['query'],
        select: { query: true }
    });
    const totalHistories = totalDistinctHistories.length;
    return {
        histories: latestHistories,
        pagination: {
            total: totalHistories,
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 10,
            totalPages: Math.ceil(totalHistories / (Number(req.query.limit) || 10)),
        },
    };
};
exports.getSearchHistoryService = getSearchHistoryService;
const getAllHistoryService = async (req) => {
    const user = req.user;
    if (!user) {
        throw new Error('Unauthorized');
    }
    return (0, handle_utils_1.paginate)(db_1.default.history, req, {
        where: {
            userId: user.id,
        },
        select: prisma_selects_1.historySelect,
        orderBy: { updatedAt: 'desc' },
    });
};
exports.getAllHistoryService = getAllHistoryService;
const suggestionTrackSelect = {
    id: true,
    title: true,
    coverUrl: true,
    artist: { select: { id: true, artistName: true } },
};
const suggestionAlbumSelect = {
    id: true,
    title: true,
    coverUrl: true,
    artist: { select: { id: true, artistName: true } },
};
const suggestionArtistSelect = {
    id: true,
    artistName: true,
    avatar: true,
};
const getSearchSuggestionsService = async (userId, limit = 5) => {
    const recentSearches = await db_1.default.history.findMany({
        where: {
            userId: userId,
            type: client_1.HistoryType.SEARCH,
            query: { not: null },
        },
        distinct: ['query'],
        orderBy: { updatedAt: 'desc' },
        take: limit * 2,
        select: { query: true },
    });
    const suggestions = [];
    const addedIds = new Set();
    for (const search of recentSearches) {
        if (suggestions.length >= limit)
            break;
        if (!search.query)
            continue;
        const query = search.query.trim();
        if (!query)
            continue;
        const tracks = await db_1.default.track.findMany({
            where: {
                title: { contains: query, mode: 'insensitive' },
                isActive: true,
            },
            select: suggestionTrackSelect,
            take: 1,
        });
        if (tracks.length > 0 && !addedIds.has(tracks[0].id)) {
            suggestions.push({ type: 'Track', data: tracks[0] });
            addedIds.add(tracks[0].id);
            if (suggestions.length >= limit)
                break;
        }
        const albums = await db_1.default.album.findMany({
            where: {
                title: { contains: query, mode: 'insensitive' },
                isActive: true,
            },
            select: suggestionAlbumSelect,
            take: 1,
        });
        if (albums.length > 0 && !addedIds.has(albums[0].id)) {
            suggestions.push({ type: 'Album', data: albums[0] });
            addedIds.add(albums[0].id);
            if (suggestions.length >= limit)
                break;
        }
        const artists = await db_1.default.artistProfile.findMany({
            where: {
                artistName: { contains: query, mode: 'insensitive' },
                isVerified: true,
                isActive: true,
            },
            select: suggestionArtistSelect,
            take: 1,
        });
        if (artists.length > 0 && !addedIds.has(artists[0].id)) {
            suggestions.push({ type: 'Artist', data: artists[0] });
            addedIds.add(artists[0].id);
            if (suggestions.length >= limit)
                break;
        }
    }
    return suggestions.slice(0, limit);
};
exports.getSearchSuggestionsService = getSearchSuggestionsService;
const deleteSearchHistoryService = async (userId) => {
    return db_1.default.history.deleteMany({
        where: {
            userId: userId,
            type: client_1.HistoryType.SEARCH,
        },
    });
};
exports.deleteSearchHistoryService = deleteSearchHistoryService;
//# sourceMappingURL=history.service.js.map