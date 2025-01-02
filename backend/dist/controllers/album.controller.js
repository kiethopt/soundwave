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
exports.searchAlbum = exports.deleteAlbum = exports.reorderAlbumTracks = exports.updateAlbum = exports.uploadAlbumTracks = exports.createAlbum = exports.getAlbumTracks = exports.getAlbumsByArtist = exports.getAlbumById = exports.getAllAlbums = void 0;
const db_1 = __importDefault(require("../config/db"));
const discord_service_1 = require("../services/discord.service");
const albumSelect = {
    id: true,
    title: true,
    artist: true,
    releaseDate: true,
    trackCount: true,
    coverUrl: true,
    uploadedBy: {
        select: {
            id: true,
            username: true,
            name: true,
        },
    },
    tracks: {
        where: { isActive: true },
        orderBy: { trackNumber: 'asc' },
        select: {
            id: true,
            title: true,
            artist: true,
            featuredArtists: true,
            duration: true,
            trackNumber: true,
            audioUrl: true,
            audioMessageId: true,
            discordMessageId: true,
        },
    },
    discordMessageId: true,
    createdAt: true,
    updatedAt: true,
};
const validateAlbumData = (title, artist, releaseDate) => {
    if (!title || title.trim().length === 0) {
        return 'Title không được để trống';
    }
    if (!artist || artist.trim().length === 0) {
        return 'Artist không được để trống';
    }
    if (!releaseDate || isNaN(Date.parse(releaseDate))) {
        return 'Release date không hợp lệ';
    }
    return null;
};
const getAllAlbums = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const albums = yield db_1.default.album.findMany({
            where: {
                isActive: true,
            },
            select: albumSelect,
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(albums);
    }
    catch (error) {
        console.error('Get all albums error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAllAlbums = getAllAlbums;
const getAlbumById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const album = yield db_1.default.album.findUnique({
            where: {
                id,
                isActive: true,
            },
            select: albumSelect,
        });
        if (!album) {
            res.status(404).json({ message: 'Album không tồn tại' });
            return;
        }
        res.json(album);
    }
    catch (error) {
        console.error('Get album by id error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAlbumById = getAlbumById;
const getAlbumsByArtist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { artist } = req.params;
        const albums = yield db_1.default.album.findMany({
            where: {
                artist: {
                    contains: artist,
                    mode: 'insensitive',
                },
                isActive: true,
            },
            select: albumSelect,
            orderBy: {
                releaseDate: 'desc',
            },
        });
        res.json(albums);
    }
    catch (error) {
        console.error('Get albums by artist error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAlbumsByArtist = getAlbumsByArtist;
const getAlbumTracks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const album = yield db_1.default.album.findUnique({
            where: {
                id,
                isActive: true,
            },
            select: {
                tracks: {
                    where: { isActive: true },
                    orderBy: { trackNumber: 'asc' },
                    select: {
                        id: true,
                        title: true,
                        artist: true,
                        featuredArtists: true,
                        duration: true,
                        trackNumber: true,
                        audioUrl: true,
                        discordMessageId: true,
                    },
                },
            },
        });
        if (!album) {
            res.status(404).json({ message: 'Album không tồn tại' });
            return;
        }
        res.json(album.tracks);
    }
    catch (error) {
        console.error('Get album tracks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getAlbumTracks = getAlbumTracks;
const createAlbum = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, artist, releaseDate } = req.body;
        const coverFile = req.file;
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const validationError = validateAlbumData(title, artist, releaseDate);
        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }
        if (!coverFile) {
            res.status(400).json({ message: 'Cover image là bắt buộc' });
            return;
        }
        const { messageId: coverMessageId, url: coverUrl } = yield (0, discord_service_1.uploadTrack)(coverFile.buffer, coverFile.originalname, false, true, true);
        const metadata = {
            title,
            artist,
            releaseDate,
            trackCount: 0,
            type: 'album',
        };
        const { messageId: metadataMessageId } = yield (0, discord_service_1.saveMetadata)(metadata);
        const album = yield db_1.default.album.create({
            data: {
                title,
                artist,
                releaseDate: new Date(releaseDate),
                trackCount: 0,
                coverUrl,
                discordMessageId: metadataMessageId,
                uploadedBy: {
                    connect: { id: user.id },
                },
            },
            select: albumSelect,
        });
        res.status(201).json({
            message: 'Album đã được tạo thành công',
            album,
        });
    }
    catch (error) {
        console.error('Create album error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createAlbum = createAlbum;
const uploadAlbumTracks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const files = req.files;
        const user = req.user;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const album = yield db_1.default.album.findUnique({
            where: { id },
            include: {
                tracks: {
                    where: { isActive: true },
                    orderBy: { trackNumber: 'asc' },
                },
            },
        });
        if (!album) {
            res.status(404).json({ message: 'Album không tồn tại' });
            return;
        }
        const uploadedTracks = yield Promise.all(files.map((file, index) => __awaiter(void 0, void 0, void 0, function* () {
            const { messageId: audioMessageId, url: audioUrl } = yield (0, discord_service_1.uploadTrack)(file.buffer, file.originalname, true, true, false);
            const title = req.body[`title_${index}`] ||
                file.originalname.replace(/\.[^/.]+$/, '');
            const artist = req.body[`artist_${index}`] || album.artist;
            const featuredArtists = req.body[`featuredArtists_${index}`] || null;
            const duration = parseInt(req.body[`duration_${index}`]) || 0;
            const trackNumber = parseInt(req.body[`trackNumber_${index}`]) ||
                album.tracks.length + index + 1;
            const metadata = {
                title,
                artist,
                featuredArtists,
                duration,
                releaseDate: album.releaseDate.toISOString().split('T')[0],
                albumId: album.id,
                type: 'track',
            };
            const { messageId: metadataMessageId } = yield (0, discord_service_1.saveMetadata)(metadata);
            return db_1.default.track.create({
                data: {
                    title,
                    artist,
                    featuredArtists,
                    duration,
                    releaseDate: album.releaseDate,
                    trackNumber,
                    audioUrl,
                    audioMessageId,
                    album: { connect: { id: album.id } },
                    uploadedBy: { connect: { id: user.id } },
                    discordMessageId: metadataMessageId,
                },
                select: {
                    id: true,
                    title: true,
                    artist: true,
                    featuredArtists: true,
                    duration: true,
                    trackNumber: true,
                    audioUrl: true,
                    audioMessageId: true,
                    discordMessageId: true,
                },
            });
        })));
        const updatedAlbum = yield db_1.default.album.update({
            where: { id },
            data: {
                trackCount: {
                    increment: files.length,
                },
            },
            select: albumSelect,
        });
        yield (0, discord_service_1.updateAlbumMetadata)(updatedAlbum.discordMessageId, {
            title: updatedAlbum.title,
            artist: updatedAlbum.artist,
            releaseDate: updatedAlbum.releaseDate.toISOString().split('T')[0],
            trackCount: updatedAlbum.trackCount,
            type: 'album',
        });
        res.status(201).json({
            message: 'Tracks uploaded successfully',
            tracks: uploadedTracks,
        });
    }
    catch (error) {
        console.error('Upload album tracks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.uploadAlbumTracks = uploadAlbumTracks;
const updateAlbum = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, artist, releaseDate } = req.body;
        const validationError = validateAlbumData(title, artist, releaseDate);
        if (validationError) {
            res.status(400).json({ message: validationError });
            return;
        }
        const album = yield db_1.default.album.update({
            where: { id },
            data: {
                title,
                artist,
                releaseDate: new Date(releaseDate),
                updatedAt: new Date(),
            },
            select: albumSelect,
        });
        yield (0, discord_service_1.updateAlbumMetadata)(album.discordMessageId, {
            title: album.title,
            artist: album.artist,
            releaseDate: album.releaseDate.toISOString().split('T')[0],
            trackCount: album.trackCount,
            type: 'album',
        });
        res.json({
            message: 'Album đã được cập nhật thành công',
            album,
        });
    }
    catch (error) {
        console.error('Update album error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateAlbum = updateAlbum;
const reorderAlbumTracks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { tracks } = req.body;
        yield db_1.default.$transaction(tracks.map((track) => db_1.default.track.update({
            where: { id: track.id },
            data: { trackNumber: track.trackNumber },
        })));
        const updatedAlbum = yield db_1.default.album.findUnique({
            where: { id },
            select: albumSelect,
        });
        res.json(updatedAlbum);
    }
    catch (error) {
        console.error('Reorder tracks error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.reorderAlbumTracks = reorderAlbumTracks;
const deleteAlbum = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield db_1.default.album.update({
            where: { id },
            data: { isActive: false },
        });
        yield db_1.default.track.updateMany({
            where: { albumId: id },
            data: { isActive: false },
        });
        res.json({ message: 'Album đã được xóa thành công' });
    }
    catch (error) {
        console.error('Delete album error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteAlbum = deleteAlbum;
const searchAlbum = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { q } = req.query;
        if (!q) {
            res.status(400).json({ message: 'Query is required' });
            return;
        }
        const albums = yield db_1.default.album.findMany({
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
            select: albumSelect,
        });
        res.json(albums);
    }
    catch (error) {
        console.error('Search album error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.searchAlbum = searchAlbum;
//# sourceMappingURL=album.controller.js.map