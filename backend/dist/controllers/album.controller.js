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
exports.getHotAlbums = exports.getNewestAlbums = exports.playAlbum = exports.getAlbumById = exports.getAllAlbums = exports.searchAlbum = exports.toggleAlbumVisibility = exports.deleteAlbum = exports.updateAlbum = exports.addTracksToAlbum = exports.createAlbum = void 0;
const albumService = __importStar(require("../services/album.service"));
const createAlbum = async (req, res) => {
    try {
        const result = await albumService.createAlbum(req);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Create album error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ message });
    }
};
exports.createAlbum = createAlbum;
const addTracksToAlbum = async (req, res) => {
    try {
        const result = await albumService.addTracksToAlbum(req);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Add tracks to album error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(400).json({ message });
    }
};
exports.addTracksToAlbum = addTracksToAlbum;
const updateAlbum = async (req, res) => {
    try {
        const result = await albumService.updateAlbum(req);
        res.json(result);
    }
    catch (error) {
        console.error('Update album error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ message });
    }
};
exports.updateAlbum = updateAlbum;
const deleteAlbum = async (req, res) => {
    try {
        const result = await albumService.deleteAlbum(req);
        res.json(result);
    }
    catch (error) {
        console.error('Delete album error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ message });
    }
};
exports.deleteAlbum = deleteAlbum;
const toggleAlbumVisibility = async (req, res) => {
    try {
        const result = await albumService.toggleAlbumVisibility(req);
        res.json(result);
    }
    catch (error) {
        console.error('Toggle album error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ message });
    }
};
exports.toggleAlbumVisibility = toggleAlbumVisibility;
const searchAlbum = async (req, res) => {
    try {
        const result = await albumService.searchAlbum(req);
        res.json(result);
    }
    catch (error) {
        console.error('Search album error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ message });
    }
};
exports.searchAlbum = searchAlbum;
const getAllAlbums = async (req, res) => {
    try {
        const result = await albumService.getAdminAllAlbums(req);
        res.json(result);
    }
    catch (error) {
        console.error('Get albums error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ message });
    }
};
exports.getAllAlbums = getAllAlbums;
const getAlbumById = async (req, res) => {
    try {
        const result = await albumService.getAlbumById(req);
        res.json(result);
    }
    catch (error) {
        console.error('Get album error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ message });
    }
};
exports.getAlbumById = getAlbumById;
const playAlbum = async (req, res) => {
    try {
        const result = await albumService.playAlbum(req);
        res.json(result);
    }
    catch (error) {
        console.error('Play album error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ message });
    }
};
exports.playAlbum = playAlbum;
const getNewestAlbums = async (req, res) => {
    try {
        const albums = await albumService.getNewestAlbums(Number(req.query.limit) || 25);
        res.json({ albums });
    }
    catch (error) {
        console.error('Get newest albums error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ message });
    }
};
exports.getNewestAlbums = getNewestAlbums;
const getHotAlbums = async (req, res) => {
    try {
        const albums = await albumService.getHotAlbums(Number(req.query.limit) || 25);
        res.json({ albums });
    }
    catch (error) {
        console.error('Get hot albums error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ message });
    }
};
exports.getHotAlbums = getHotAlbums;
//# sourceMappingURL=album.controller.js.map