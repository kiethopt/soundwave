"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const track_controller_1 = require("../controllers/track.controller");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});
router.get('/tracks', track_controller_1.getAllTracks);
router.get('/tracks/search', track_controller_1.searchTrack);
router.get('/tracks/:id', track_controller_1.getTrackById);
router.get('/tracks/artist/:artist', track_controller_1.getTracksByArtist);
router.post('/tracks', auth_1.isAuthenticated, auth_1.isAdmin, upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
]), track_controller_1.createTrack);
router.put('/tracks/:id', auth_1.isAuthenticated, auth_1.isAdmin, track_controller_1.updateTrack);
router.delete('/tracks/:id', auth_1.isAuthenticated, auth_1.isAdmin, track_controller_1.deleteTrack);
exports.default = router;
//# sourceMappingURL=track.routes.js.map