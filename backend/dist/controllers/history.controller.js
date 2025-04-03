"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllHistory = exports.getSearchHistory = exports.getPlayHistory = exports.saveSearchHistory = exports.savePlayHistory = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const prisma_selects_1 = require("../utils/prisma-selects");
const savePlayHistory = async (req, res) => {
    try {
        const { trackId, duration, completed } = req.body;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!trackId) {
            res.status(400).json({ message: 'Track ID is required' });
            return;
        }
        const track = await db_1.default.track.findUnique({
            where: { id: trackId },
            select: { id: true, artistId: true },
        });
        if (!track) {
            res.status(404).json({ message: 'Track not found' });
            return;
        }
        const artistId = track.artistId;
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const existingListen = await db_1.default.history.findFirst({
            where: {
                userId: user.id,
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
        const history = await db_1.default.history.upsert({
            where: {
                userId_trackId_type: {
                    userId: user.id,
                    trackId: trackId,
                    type: 'PLAY',
                },
            },
            update: {
                updatedAt: new Date(),
                completed,
                ...(completed && { playCount: { increment: 1 } }),
            },
            create: {
                type: client_1.HistoryType.PLAY,
                duration,
                completed,
                trackId,
                userId: user.id,
                playCount: completed ? 1 : 0,
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
        }
        res.status(201).json({
            message: 'Play history saved successfully',
            history,
        });
    }
    catch (error) {
        console.error('Save play history error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.savePlayHistory = savePlayHistory;
const saveSearchHistory = async (req, res) => {
    try {
        const { query } = req.body;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!query?.trim()) {
            res.status(400).json({ message: 'Search query is required' });
            return;
        }
        const history = await db_1.default.history.create({
            data: {
                type: client_1.HistoryType.SEARCH,
                query,
                userId: user.id,
                duration: null,
                completed: null,
                playCount: null,
            },
            select: prisma_selects_1.historySelect,
        });
        res.status(201).json({
            message: 'Search history saved successfully',
            history,
        });
    }
    catch (error) {
        console.error('Save search history error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.saveSearchHistory = saveSearchHistory;
const getPlayHistory = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { page = 1, limit = 10 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const histories = await db_1.default.history.findMany({
            where: {
                userId: user.id,
                type: client_1.HistoryType.PLAY,
            },
            select: prisma_selects_1.historySelect,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: Number(limit),
        });
        const totalHistories = await db_1.default.history.count({
            where: {
                userId: user.id,
                type: client_1.HistoryType.PLAY,
            },
        });
        res.json({
            histories,
            pagination: {
                total: totalHistories,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalHistories / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Get play history error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getPlayHistory = getPlayHistory;
const getSearchHistory = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { page = 1, limit = 10 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const histories = await db_1.default.history.findMany({
            where: {
                userId: user.id,
                type: client_1.HistoryType.SEARCH,
            },
            select: prisma_selects_1.historySelect,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: Number(limit),
        });
        const totalHistories = await db_1.default.history.count({
            where: {
                userId: user.id,
                type: client_1.HistoryType.SEARCH,
            },
        });
        res.json({
            histories,
            pagination: {
                total: totalHistories,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalHistories / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Get search history error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getSearchHistory = getSearchHistory;
const getAllHistory = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { page = 1, limit = 10 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const histories = await db_1.default.history.findMany({
            where: {
                userId: user.id,
            },
            select: prisma_selects_1.historySelect,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: Number(limit),
        });
        const totalHistories = await db_1.default.history.count({
            where: {
                userId: user.id,
            },
        });
        res.json({
            histories,
            pagination: {
                total: totalHistories,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalHistories / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Get all history error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllHistory = getAllHistory;
//# sourceMappingURL=history.controller.js.map