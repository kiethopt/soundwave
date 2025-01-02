"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const album_controller_1 = require("../controllers/album.controller");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const trackStorage = multer_1.default.memoryStorage();
const uploadTracks = (0, multer_1.default)({
    storage: trackStorage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Chỉ chấp nhận file audio'));
        }
    },
});
const coverStorage = multer_1.default.memoryStorage();
const uploadCover = (0, multer_1.default)({
    storage: coverStorage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Chỉ chấp nhận file ảnh'));
        }
    },
});
router.get('/albums', album_controller_1.getAllAlbums);
router.get('/albums/search', album_controller_1.searchAlbum);
router.get('/albums/:id', album_controller_1.getAlbumById);
router.get('/albums/artist/:artist', album_controller_1.getAlbumsByArtist);
router.get('/albums/:id/tracks', album_controller_1.getAlbumTracks);
router.post('/albums', auth_1.isAuthenticated, auth_1.isAdmin, uploadCover.single('cover'), album_controller_1.createAlbum);
router.post('/albums/:id/tracks', auth_1.isAuthenticated, auth_1.isAdmin, uploadTracks.array('tracks', 1000), album_controller_1.uploadAlbumTracks);
router.put('/albums/:id', auth_1.isAuthenticated, auth_1.isAdmin, album_controller_1.updateAlbum);
router.put('/albums/:id/tracks/reorder', auth_1.isAuthenticated, auth_1.isAdmin, album_controller_1.reorderAlbumTracks);
router.delete('/albums/:id', auth_1.isAuthenticated, auth_1.isAdmin, album_controller_1.deleteAlbum);
exports.default = router;
//# sourceMappingURL=album.routes.js.map