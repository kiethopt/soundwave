"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSearchHistory = exports.getSearchSuggestions = exports.getAllHistory = exports.getSearchHistory = exports.getPlayHistory = exports.saveSearchHistory = exports.savePlayHistory = void 0;
const historyService = __importStar(require("../services/history.service"));
const handle_utils_1 = require("../utils/handle-utils");
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
        const history = await historyService.savePlayHistoryService(user.id, trackId, duration, completed);
        res.status(201).json({
            message: 'Play history saved successfully',
            history,
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Track not found') {
                res.status(404).json({ message: error.message });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Save play history');
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
        const history = await historyService.saveSearchHistoryService(user.id, query);
        res.status(201).json({
            message: 'Search history saved successfully',
            history,
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Search query is required') {
            res.status(400).json({ message: error.message });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Save search history');
    }
};
exports.saveSearchHistory = saveSearchHistory;
const getPlayHistory = async (req, res) => {
    try {
        const result = await historyService.getPlayHistoryService(req);
        res.json({
            histories: result.data,
            pagination: result.pagination,
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            res.status(401).json({ message: error.message });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get play history');
    }
};
exports.getPlayHistory = getPlayHistory;
const getSearchHistory = async (req, res) => {
    try {
        const result = await historyService.getSearchHistoryService(req);
        res.json(result);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            res.status(401).json({ message: error.message });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get search history');
    }
};
exports.getSearchHistory = getSearchHistory;
const getAllHistory = async (req, res) => {
    try {
        const result = await historyService.getAllHistoryService(req);
        res.json({
            histories: result.data,
            pagination: result.pagination,
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            res.status(401).json({ message: error.message });
            return;
        }
        (0, handle_utils_1.handleError)(res, error, 'Get all history');
    }
};
exports.getAllHistory = getAllHistory;
const getSearchSuggestions = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const limit = req.query.limit ? parseInt(String(req.query.limit)) : 5;
        const suggestions = await historyService.getSearchSuggestionsService(user.id, limit);
        res.json(suggestions);
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Get search suggestions');
    }
};
exports.getSearchSuggestions = getSearchSuggestions;
const deleteSearchHistory = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const result = await historyService.deleteSearchHistoryService(user.id);
        res.status(200).json({
            message: `Successfully deleted ${result.count} search history entries.`,
            count: result.count
        });
    }
    catch (error) {
        (0, handle_utils_1.handleError)(res, error, 'Delete search history');
    }
};
exports.deleteSearchHistory = deleteSearchHistory;
//# sourceMappingURL=history.controller.js.map