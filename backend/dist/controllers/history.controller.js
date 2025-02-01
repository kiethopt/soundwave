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
exports.getAllHistory = exports.getSearchHistory = exports.getPlayHistory = exports.saveSearchHistory = exports.savePlayHistory = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const prisma_selects_1 = require("../utils/prisma-selects");
const savePlayHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const track = yield db_1.default.track.findUnique({
            where: { id: trackId },
        });
        if (!track) {
            res.status(404).json({ message: 'Track not found' });
            return;
        }
        const history = yield db_1.default.history.create({
            data: {
                type: client_1.HistoryType.PLAY,
                duration,
                completed,
                trackId,
                userId: user.id,
                playCount: 1,
            },
            select: prisma_selects_1.historySelect,
        });
        yield db_1.default.track.update({
            where: { id: trackId },
            data: {
                playCount: { increment: 1 },
            },
        });
        res.status(201).json({
            message: 'Play history saved successfully',
            history,
        });
    }
    catch (error) {
        console.error('Save play history error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.savePlayHistory = savePlayHistory;
const saveSearchHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { query } = req.body;
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!(query === null || query === void 0 ? void 0 : query.trim())) {
            res.status(400).json({ message: 'Search query is required' });
            return;
        }
        const history = yield db_1.default.history.create({
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
});
exports.saveSearchHistory = saveSearchHistory;
const getPlayHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { page = 1, limit = 10 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const histories = yield db_1.default.history.findMany({
            where: {
                userId: user.id,
                type: client_1.HistoryType.PLAY,
            },
            select: prisma_selects_1.historySelect,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: Number(limit),
        });
        const totalHistories = yield db_1.default.history.count({
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
});
exports.getPlayHistory = getPlayHistory;
const getSearchHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { page = 1, limit = 10 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const histories = yield db_1.default.history.findMany({
            where: {
                userId: user.id,
                type: client_1.HistoryType.SEARCH,
            },
            select: prisma_selects_1.historySelect,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: Number(limit),
        });
        const totalHistories = yield db_1.default.history.count({
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
});
exports.getSearchHistory = getSearchHistory;
const getAllHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { page = 1, limit = 10 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const histories = yield db_1.default.history.findMany({
            where: {
                userId: user.id,
            },
            select: prisma_selects_1.historySelect,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: Number(limit),
        });
        const totalHistories = yield db_1.default.history.count({
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
});
exports.getAllHistory = getAllHistory;
//# sourceMappingURL=history.controller.js.map