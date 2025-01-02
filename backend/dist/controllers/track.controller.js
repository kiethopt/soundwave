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
exports.searchTrack = exports.deleteTrack = exports.updateTrack = exports.getTracksByArtist = exports.getTrackById = exports.getAllTracks = exports.createTrack = void 0;
const db_1 = __importDefault(require("../config/db"));
const discord_service_1 = require("../services/discord.service");
const trackSelect = {
    id: true,
    title: true,
    artist: true,
    featuredArtists: true,
    duration: true,
    releaseDate: true,
    trackNumber: true,
    coverUrl: true,
    audioUrl: true,
    audioMessageId: true,
    album: {
        select: {
            id: true,
            title: true,
            coverUrl: true,
        },
    },
    uploadedBy: {
        select: {
            id: true,
            username: true,
            name: true,
        },
    },
    discordMessageId: true,
    createdAt: true,
    updatedAt: true,
};
const createTrack = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { title, artist, featuredArtists, duration, releaseDate, albumId } = req.body;
        const files = req.files;
        const audioFile = (_a = files === null || files === void 0 ? void 0 : files['audio']) === null || _a === void 0 ? void 0 : _a[0];
        const coverFile = (_b = files === null || files === void 0 ? void 0 : files['cover']) === null || _b === void 0 ? void 0 : _b[0];
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!audioFile) {
            res.status(400).json({ message: 'Audio file is required' });
            return;
        }
        let albumData = null;
        if (albumId) {
            albumData = yield db_1.default.album.findUnique({
                where: { id: albumId },
                select: { coverUrl: true },
            });
        }
        const audioUpload = yield (0, discord_service_1.uploadTrack)(audioFile.buffer, audioFile.originalname, true, !!albumId);
        let coverUrl;
        if (coverFile) {
            const coverUpload = yield (0, discord_service_1.uploadTrack)(coverFile.buffer, coverFile.originalname, false, false, true);
            coverUrl = coverUpload.url;
        }
        else if (albumData === null || albumData === void 0 ? void 0 : albumData.coverUrl) {
            coverUrl = albumData.coverUrl;
        }
        const metadata = {
            title,
            artist,
            featuredArtists: featuredArtists || null,
            duration: parseInt(duration),
            releaseDate: new Date(releaseDate).toISOString().split('T')[0],
            albumId: albumId || null,
            type: 'track',
        };
        const metadataUpload = yield (0, discord_service_1.saveMetadata)(metadata);
        const track = yield db_1.default.track.create({
            data: {
                title,
                artist,
                featuredArtists: featuredArtists || null,
                duration: parseInt(duration),
                releaseDate: new Date(releaseDate),
                coverUrl,
                audioUrl: audioUpload.url,
                audioMessageId: audioUpload.messageId,
                albumId: albumId || undefined,
                uploadedBy: {
                    connect: { id: user.id },
                },
                discordMessageId: metadataUpload.messageId,
            },
            select: trackSelect,
        });
        res.status(201).json({
            message: 'Track created successfully',
            track,
        });
    }
    catch (error) {
        console.error('Create track error:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development'
                ? error instanceof Error
                    ? error.message
                    : String(error)
                : undefined,
        });
    }
});
exports.createTrack = createTrack;
const getAllTracks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tracks = yield db_1.default.track.findMany({
            where: {
                isActive: true,
                albumId: null,
            },
            select: trackSelect,
            orderBy: { createdAt: 'desc' },
        });
        const mappedTracks = tracks.map((track) => {
            var _a;
            return (Object.assign(Object.assign({}, track), { coverUrl: track.coverUrl || ((_a = track.album) === null || _a === void 0 ? void 0 : _a.coverUrl) || null }));
        });
        res.json(mappedTracks);
    }
    catch (error) {
        console.error('Get tracks error:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
        });
    }
});
exports.getAllTracks = getAllTracks;
const getTrackById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const track = yield db_1.default.track.findUnique({
            where: { id, isActive: true },
            select: trackSelect,
        });
        if (!track) {
            res.status(404).json({ message: 'Track không tồn tại' });
            return;
        }
        res.json(track);
    }
    catch (error) {
        console.error('Get track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getTrackById = getTrackById;
const getTracksByArtist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { artist } = req.params;
        const tracks = yield db_1.default.track.findMany({
            where: {
                artist: {
                    contains: artist,
                    mode: 'insensitive',
                },
                isActive: true,
            },
            select: trackSelect,
        });
        res.json(tracks);
    }
    catch (error) {
        console.error('Get tracks by artist error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getTracksByArtist = getTracksByArtist;
const updateTrack = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, artist, duration, albumId } = req.body;
        const track = yield db_1.default.track.update({
            where: { id },
            data: {
                title,
                artist,
                duration,
                albumId,
                updatedAt: new Date(),
            },
            select: trackSelect,
        });
        res.json({
            message: 'Track đã được cập nhật thành công',
            track,
        });
    }
    catch (error) {
        console.error('Update track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateTrack = updateTrack;
const deleteTrack = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield db_1.default.track.update({
            where: { id },
            data: { isActive: false },
        });
        res.json({ message: 'Track đã được xóa thành công' });
    }
    catch (error) {
        console.error('Delete track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteTrack = deleteTrack;
const searchTrack = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q } = req.query;
        const tracks = yield db_1.default.track.findMany({
            where: {
                isActive: true,
                OR: [
                    {
                        title: {
                            contains: String(q),
                            mode: 'insensitive',
                        },
                    },
                    {
                        artist: {
                            contains: String(q),
                            mode: 'insensitive',
                        },
                    },
                ],
            },
            select: Object.assign(Object.assign({}, trackSelect), { album: {
                    select: {
                        id: true,
                        title: true,
                        coverUrl: true,
                    },
                } }),
        });
        const mappedTracks = tracks.map((track) => {
            var _a;
            return (Object.assign(Object.assign({}, track), { coverUrl: track.coverUrl || ((_a = track.album) === null || _a === void 0 ? void 0 : _a.coverUrl) || null }));
        });
        res.json(mappedTracks);
    }
    catch (error) {
        console.error('Search track error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.searchTrack = searchTrack;
//# sourceMappingURL=track.controller.js.map