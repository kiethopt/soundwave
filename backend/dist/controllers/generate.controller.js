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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestMoreTracks = exports.generatePlaylist = void 0;
const generateService = __importStar(require("../services/generate.service"));
const handle_utils_1 = require("../utils/handle-utils");
const db_1 = __importDefault(require("../config/db"));
const generatePlaylist = async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!prompt || typeof prompt !== 'string') {
            res.status(400).json({ message: 'Valid prompt is required' });
            return;
        }
        console.log(`[Generate Controller] Received playlist generation request from user ${req.user.id} with prompt: "${prompt}"`);
        const playlist = await generateService.generatePlaylistFromPrompt(req.user.id, prompt);
        if (!playlist) {
            res.status(404).json({ message: 'Failed to generate playlist' });
            return;
        }
        res.status(201).json({
            message: 'Playlist generated successfully',
            playlist
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('AI features are currently unavailable')) {
                res.status(503).json({ message: 'AI features are currently unavailable. Please try again later.' });
                return;
            }
            if (error.message.includes('safety reasons')) {
                res.status(400).json({ message: error.message });
                return;
            }
            if (error.message.startsWith('INVALID_PROMPT:')) {
                const cleanErrorMessage = error.message.replace('INVALID_PROMPT:', '').trim();
                res.status(400).json({ message: cleanErrorMessage });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Generate playlist');
    }
};
exports.generatePlaylist = generatePlaylist;
const suggestMoreTracks = async (req, res) => {
    try {
        const { playlistId } = req.params;
        const { prompt } = req.body;
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!prompt || typeof prompt !== 'string') {
            res.status(400).json({ message: 'Valid prompt is required for suggestions' });
            return;
        }
        if (isNaN(parseInt(playlistId)) && typeof playlistId !== 'string') {
            res.status(400).json({ message: 'Valid playlistId is required' });
            return;
        }
        console.log(`[Generate Controller] Received track suggestion request for playlist ${playlistId} from user ${req.user.id} with prompt: "${prompt}"`);
        const suggestedTrackIds = await generateService.suggestTracksForExistingPlaylist(playlistId, req.user.id, prompt);
        if (!suggestedTrackIds || suggestedTrackIds.length === 0) {
            res.status(200).json({
                message: 'AI could not find any new suitable tracks based on your prompt or the playlist is already optimal with current tracks.',
                playlistId,
                addedTracks: []
            });
            return;
        }
        const existingPlaylistTracks = await db_1.default.playlistTrack.findMany({
            where: { playlistId },
            orderBy: { trackOrder: 'desc' },
            take: 1,
        });
        let currentMaxOrder = 0;
        if (existingPlaylistTracks.length > 0) {
            currentMaxOrder = existingPlaylistTracks[0].trackOrder;
        }
        const tracksToCreate = suggestedTrackIds.map((trackId, index) => ({
            playlistId: playlistId,
            trackId: trackId,
            trackOrder: currentMaxOrder + 1 + index,
        }));
        await db_1.default.playlistTrack.createMany({
            data: tracksToCreate,
            skipDuplicates: true,
        });
        const tracksInPlaylist = await db_1.default.playlistTrack.findMany({
            where: { playlistId: playlistId },
            include: { track: { select: { duration: true } } }
        });
        const totalTracks = tracksInPlaylist.length;
        const totalDuration = tracksInPlaylist.reduce((sum, pt) => sum + (pt.track?.duration || 0), 0);
        await db_1.default.playlist.update({
            where: { id: playlistId },
            data: {
                totalTracks: totalTracks,
                totalDuration: totalDuration,
                updatedAt: new Date(),
            }
        });
        res.status(200).json({
            success: true,
            message: `Successfully added ${suggestedTrackIds.length} tracks to the playlist.`,
            playlistId,
            addedTracks: suggestedTrackIds
        });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('AI features are currently unavailable')) {
                res.status(503).json({ message: 'AI features are currently unavailable for suggestions. Please try again later.' });
                return;
            }
            if (error.message.startsWith('INVALID_PROMPT:')) {
                const cleanErrorMessage = error.message.replace('INVALID_PROMPT:', '').trim();
                res.status(400).json({ message: cleanErrorMessage });
                return;
            }
            if (error.message.includes('safety reasons') || error.message.includes('Playlist not found')) {
                res.status(400).json({ message: error.message });
                return;
            }
        }
        (0, handle_utils_1.handleError)(res, error, 'Suggest more tracks for playlist');
    }
};
exports.suggestMoreTracks = suggestMoreTracks;
//# sourceMappingURL=generate.controller.js.map