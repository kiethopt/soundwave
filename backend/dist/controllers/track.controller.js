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
exports.checkTrackLiked = exports.unlikeTrack = exports.likeTrack = exports.playTrack = exports.getTracksByTypeAndGenre = exports.getTracksByGenre = exports.getTrackById = exports.getAllTracks = exports.getTracksByType = exports.searchTrack = exports.toggleTrackVisibility = exports.deleteTrack = exports.updateTrack = exports.createTrack = void 0;
const trackService = __importStar(require("../services/track.service"));
const createTrack = async (req, res) => {
    try {
        const result = await trackService.createTrack(req);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Create track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createTrack = createTrack;
const updateTrack = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await trackService.updateTrack(req, id);
        res.json(result);
    }
    catch (error) {
        console.error('Update track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateTrack = updateTrack;
const deleteTrack = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await trackService.deleteTrack(req, id);
        res.json(result);
    }
    catch (error) {
        console.error('Delete track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteTrack = deleteTrack;
const toggleTrackVisibility = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await trackService.toggleTrackVisibility(req, id);
        res.json(result);
    }
    catch (error) {
        console.error('Toggle track visibility error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.toggleTrackVisibility = toggleTrackVisibility;
const searchTrack = async (req, res) => {
    try {
        const result = await trackService.searchTrack(req);
        res.json(result);
    }
    catch (error) {
        console.error('Search track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.searchTrack = searchTrack;
const getTracksByType = async (req, res) => {
    try {
        const { type } = req.params;
        const result = await trackService.getTracksByType(req, type);
        res.json(result);
    }
    catch (error) {
        console.error('Get tracks by type error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTracksByType = getTracksByType;
const getAllTracks = async (req, res) => {
    try {
        const result = await trackService.getAllTracksAdminArtist(req);
        res.json(result);
    }
    catch (error) {
        console.error('Get tracks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllTracks = getAllTracks;
const getTrackById = async (req, res) => {
    try {
        const { id } = req.params;
        const track = await trackService.getTrackById(req, id);
        res.json(track);
    }
    catch (error) {
        console.error('Get track by id error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTrackById = getTrackById;
const getTracksByGenre = async (req, res) => {
    try {
        const { genreId } = req.params;
        const result = await trackService.getTracksByGenre(req, genreId);
        res.json(result);
    }
    catch (error) {
        console.error('Get tracks by genre error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTracksByGenre = getTracksByGenre;
const getTracksByTypeAndGenre = async (req, res) => {
    try {
        const { type, genreId } = req.params;
        const result = await trackService.getTracksByTypeAndGenre(req, type, genreId);
        res.json(result);
    }
    catch (error) {
        console.error('Get tracks by type and genre error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTracksByTypeAndGenre = getTracksByTypeAndGenre;
const playTrack = async (req, res) => {
    try {
        const { trackId } = req.params;
        const result = await trackService.playTrack(req, trackId);
        res.json(result);
    }
    catch (error) {
        console.error('Play track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.playTrack = playTrack;
const likeTrack = async (req, res) => {
    try {
        const { trackId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const result = await trackService.likeTrack(userId, trackId);
        res.json({ message: 'Track liked successfully', data: result });
    }
    catch (error) {
        console.error('Like track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.likeTrack = likeTrack;
const unlikeTrack = async (req, res) => {
    try {
        const { trackId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        await trackService.unlikeTrack(userId, trackId);
        res.json({ message: 'Track unliked successfully' });
    }
    catch (error) {
        console.error('Unlike track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.unlikeTrack = unlikeTrack;
const checkTrackLiked = async (req, res) => {
    try {
        const { trackId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const result = await trackService.checkTrackLiked(userId, trackId);
        res.json(result);
    }
    catch (error) {
        console.error('Check track liked error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.checkTrackLiked = checkTrackLiked;
//# sourceMappingURL=track.controller.js.map