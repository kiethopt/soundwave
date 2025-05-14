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
exports.checkTrackCopyright = exports.checkTrackLiked = exports.unlikeTrack = exports.likeTrack = exports.playTrack = exports.getTracksByTypeAndGenre = exports.getTracksByGenre = exports.getTrackById = exports.getAllTracks = exports.getTracksByType = exports.searchTrack = exports.toggleTrackVisibility = exports.deleteTrack = exports.updateTrack = exports.createTrack = void 0;
const trackService = __importStar(require("../services/track.service"));
const handle_utils_1 = require("../utils/handle-utils");
const track_service_1 = require("../services/track.service");
const createTrack = async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.artistProfile) {
            res.status(403).json({ message: 'Forbidden: Only verified artists can upload tracks.' });
            return;
        }
        const files = req.files;
        if (!files || !files.audioFile || files.audioFile.length === 0) {
            res.status(400).json({ message: 'Audio file is required.' });
            return;
        }
        const audioFile = files.audioFile[0];
        const coverFile = files.coverFile?.[0];
        const { title, releaseDate, genreIds, featuredArtistIds, featuredArtistNames, labelId, localFingerprint, } = req.body;
        if (!title || !releaseDate) {
            res.status(400).json({ message: 'Title and release date are required.' });
            return;
        }
        if (!Array.isArray(genreIds || [])) {
            res.status(400).json({ message: 'Genres must be an array.' });
            return;
        }
        if (!Array.isArray(featuredArtistIds || [])) {
            res.status(400).json({ message: 'Featured artist IDs must be an array.' });
            return;
        }
        if (!Array.isArray(featuredArtistNames || [])) {
            res.status(400).json({ message: 'Featured artist names must be an array.' });
            return;
        }
        const createData = {
            title,
            releaseDate,
            type: 'SINGLE',
            genreIds: genreIds || [],
            featuredArtistIds: featuredArtistIds || [],
            featuredArtistNames: featuredArtistNames || [],
            labelId: labelId || undefined,
            localFingerprint: localFingerprint || undefined,
        };
        const newTrack = await track_service_1.TrackService.createTrack(user.artistProfile.id, createData, audioFile, coverFile, user);
        res.status(201).json({ message: 'Track created successfully', track: newTrack });
    }
    catch (error) {
        if (error.isFingerprintConflict) {
            res.status(409).json({
                message: error.message,
                isFingerprintConflict: true,
                conflictingTrackTitle: error.conflictingTrackTitle,
                conflictingArtistName: error.conflictingArtistName,
            });
        }
        else if (error.isDuplicateFingerprintBySameArtist) {
            res.status(409).json({
                message: error.message,
                isDuplicateFingerprintBySameArtist: true,
            });
        }
        else if (error.code === 'P2002') {
            let specificMessage = `A track with this title likely already exists for this artist.`;
            if (error.meta?.target?.includes('localFingerprint')) {
                specificMessage = `A different track with the exact same audio content already exists.`;
            }
            else if (error.meta?.target?.includes('title') && error.meta?.target?.includes('artistId')) {
                specificMessage = `You already have a track with the title: "${req.body.title}".`;
            }
            res.status(409).json({ message: specificMessage, code: error.code });
        }
        else {
            (0, handle_utils_1.handleError)(res, error, 'Create track');
        }
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
const checkTrackCopyright = async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.artistProfile) {
            res.status(403).json({ message: 'Forbidden: Only verified artists can check copyright.' });
            return;
        }
        const files = req.files;
        if (!files || !files.audioFile || files.audioFile.length === 0) {
            res.status(400).json({ message: 'Audio file is required.' });
            return;
        }
        const audioFile = files.audioFile[0];
        const { title, releaseDate } = req.body;
        if (!title || !releaseDate) {
            res.status(400).json({ message: 'Title and release date are required for context during copyright check.' });
            return;
        }
        const featuredArtistIds = (req.body.featuredArtistIds || []);
        const featuredArtistNames = (req.body.featuredArtistNames || []);
        const checkData = {
            title,
            releaseDate,
            declaredFeaturedArtistIds: Array.isArray(featuredArtistIds) ? featuredArtistIds : [],
            declaredFeaturedArtistNames: Array.isArray(featuredArtistNames) ? featuredArtistNames : [],
        };
        const result = await track_service_1.TrackService.checkTrackCopyrightOnly(user.artistProfile.id, checkData, audioFile, user);
        res.status(200).json(result);
    }
    catch (error) {
        if (error.isCopyrightConflict && error.copyrightDetails) {
            res.status(409).json({
                message: error.message,
                isCopyrightConflict: true,
                copyrightDetails: error.copyrightDetails,
                isSafeToUpload: false,
            });
        }
        else {
            (0, handle_utils_1.handleError)(res, error, 'Check track copyright');
        }
    }
};
exports.checkTrackCopyright = checkTrackCopyright;
//# sourceMappingURL=track.controller.js.map