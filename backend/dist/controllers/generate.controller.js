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
exports.generatePlaylist = void 0;
const generateService = __importStar(require("../services/generate.service"));
const handle_utils_1 = require("../utils/handle-utils");
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
        }
        (0, handle_utils_1.handleError)(res, error, 'Generate playlist');
    }
};
exports.generatePlaylist = generatePlaylist;
//# sourceMappingURL=generate.controller.js.map