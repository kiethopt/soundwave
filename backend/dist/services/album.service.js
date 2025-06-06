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
exports.getAlbumById = exports.getAdminAllAlbums = exports.searchAlbum = exports.toggleAlbumVisibility = exports.deleteAlbum = exports.updateAlbum = exports.addTracksToAlbum = exports.createAlbum = exports.getAlbums = exports.getHotAlbums = exports.getNewestAlbums = exports.deleteAlbumById = void 0;
const db_1 = __importDefault(require("../config/db"));
const upload_service_1 = require("./upload.service");
const client_1 = require("@prisma/client");
const prisma_selects_1 = require("../utils/prisma-selects");
const emailService = __importStar(require("./email.service"));
const handle_utils_1 = require("src/utils/handle-utils");
const socket_1 = require("../config/socket");
const artist_service_1 = require("./artist.service");
const mm = __importStar(require("music-metadata"));
const crypto = __importStar(require("crypto"));
const canManageAlbum = (user, albumArtistId) => {
    if (!user)
        return false;
    if (user.role === client_1.Role.ADMIN)
        return true;
    return (user.artistProfile?.isVerified &&
        user.artistProfile?.role === client_1.Role.ARTIST &&
        user.artistProfile?.id === albumArtistId);
};
const validateAlbumData = (data) => {
    const { title, releaseDate, type } = data;
    if (!title?.trim())
        return 'Title is required';
    if (!releaseDate || isNaN(Date.parse(releaseDate)))
        return 'Valid release date is required';
    if (type && !Object.values(client_1.AlbumType).includes(type))
        return 'Invalid album type';
    return null;
};
const deleteAlbumById = async (id) => {
    const album = await db_1.default.album.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!album) {
        throw new Error('Album not found');
    }
    const io = (0, socket_1.getIO)();
    io.emit('album:deleted', { albumId: id });
    return db_1.default.album.delete({
        where: { id },
    });
};
exports.deleteAlbumById = deleteAlbumById;
const getNewestAlbums = async (limit = 20) => {
    return db_1.default.album.findMany({
        where: { isActive: true },
        orderBy: { releaseDate: 'desc' },
        take: limit,
        select: prisma_selects_1.albumSelect,
    });
};
exports.getNewestAlbums = getNewestAlbums;
const getHotAlbums = async (limit = 20) => {
    return db_1.default.album.findMany({
        where: {
            isActive: true,
            tracks: { some: { isActive: true } },
        },
        orderBy: [
            { tracks: { _count: 'desc' } },
            { releaseDate: 'desc' },
        ],
        take: limit,
        select: prisma_selects_1.albumSelect,
    });
};
exports.getHotAlbums = getHotAlbums;
const getAlbums = async (req) => {
    const { search, sortBy, sortOrder } = req.query;
    const user = req.user;
    const whereClause = {};
    if (user && user.role !== client_1.Role.ADMIN && user.artistProfile?.id) {
        whereClause.artistId = user.artistProfile.id;
    }
    if (search && typeof search === 'string') {
        whereClause.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { artist: { artistName: { contains: search, mode: 'insensitive' } } },
            { genres: { every: { genre: { name: { contains: search, mode: 'insensitive' } } } } },
        ];
    }
    const orderByClause = {};
    if (sortBy && typeof sortBy === 'string' && (sortOrder === 'asc' || sortOrder === 'desc')) {
        if (sortBy === 'title' || sortBy === 'type' || sortBy === 'releaseDate') {
            orderByClause[sortBy] = sortOrder;
        }
        else if (sortBy === 'totalTracks') {
            orderByClause.tracks = { _count: sortOrder };
        }
        else {
            orderByClause.releaseDate = 'desc';
        }
    }
    else {
        orderByClause.releaseDate = 'desc';
    }
    const result = await (0, handle_utils_1.paginate)(db_1.default.album, req, {
        where: whereClause,
        include: {
            artist: { select: { id: true, artistName: true, avatar: true } },
            genres: { include: { genre: true } },
            tracks: {
                select: prisma_selects_1.trackSelect,
                orderBy: { trackNumber: 'asc' },
            },
            label: { select: { id: true, name: true, logoUrl: true } },
        },
        orderBy: orderByClause,
    });
    const formattedAlbums = result.data.map((album) => ({
        ...album,
        totalTracks: album.tracks?.length ?? 0,
        genres: album.genres,
        tracks: album.tracks,
    }));
    return {
        data: formattedAlbums,
        pagination: result.pagination,
    };
};
exports.getAlbums = getAlbums;
const createAlbum = async (req) => {
    const user = req.user;
    if (!user)
        throw new Error('Forbidden');
    const { title, releaseDate, type = client_1.AlbumType.ALBUM, genres = [], artistId } = req.body;
    const coverFile = req.file;
    const genreArray = Array.isArray(genres) ? genres : genres ? [genres] : [];
    const validationError = validateAlbumData({ title, releaseDate, type });
    if (validationError)
        throw new Error(validationError);
    let targetArtistProfileId;
    let fetchedArtistProfile = null;
    if (user.role === client_1.Role.ADMIN && artistId) {
        const targetArtist = await db_1.default.artistProfile.findFirst({
            where: { id: artistId, isVerified: true, role: client_1.Role.ARTIST },
            select: { id: true, artistName: true, labelId: true },
        });
        if (!targetArtist)
            throw new Error('Artist profile not found or not verified');
        targetArtistProfileId = targetArtist.id;
        fetchedArtistProfile = targetArtist;
    }
    else if (user.artistProfile?.isVerified && user.artistProfile.role === client_1.Role.ARTIST) {
        targetArtistProfileId = user.artistProfile.id;
        fetchedArtistProfile = await db_1.default.artistProfile.findUnique({
            where: { id: targetArtistProfileId },
            select: { id: true, artistName: true, labelId: true },
        });
    }
    else {
        throw new Error('Not authorized to create albums');
    }
    if (!fetchedArtistProfile) {
        throw new Error('Could not retrieve artist profile information.');
    }
    const artistName = fetchedArtistProfile.artistName || 'Nghệ sĩ';
    const artistLabelId = fetchedArtistProfile.labelId;
    let coverUrl = null;
    if (coverFile) {
        const coverUpload = await (0, upload_service_1.uploadFile)(coverFile.buffer, 'covers', 'image');
        coverUrl = coverUpload.secure_url;
    }
    const releaseDateObj = new Date(releaseDate);
    const isActive = releaseDateObj <= new Date();
    const albumData = {
        title,
        coverUrl,
        releaseDate: releaseDateObj,
        type,
        duration: 0,
        totalTracks: 0,
        artist: { connect: { id: targetArtistProfileId } },
        isActive,
        genres: { create: genreArray.map((genreId) => ({ genre: { connect: { id: genreId } } })) },
    };
    if (artistLabelId) {
        albumData.label = { connect: { id: artistLabelId } };
    }
    const album = await db_1.default.album.create({
        data: albumData,
        select: prisma_selects_1.albumSelect,
    });
    const io = (0, socket_1.getIO)();
    io.emit('album:created', { album });
    const sendNotifications = async () => {
        const followers = await db_1.default.userFollow.findMany({
            where: { followingArtistId: targetArtistProfileId, followingType: 'ARTIST' },
            select: { followerId: true },
        });
        const followerIds = followers.map((f) => f.followerId);
        if (followerIds.length === 0)
            return;
        const followerUsers = await db_1.default.user.findMany({
            where: { id: { in: followerIds }, isActive: true },
            select: { id: true, email: true },
        });
        const notificationsData = followerUsers.map((follower) => ({
            type: client_1.NotificationType.NEW_ALBUM,
            message: `${artistName} just released a new album: ${title}`,
            recipientType: client_1.RecipientType.USER,
            userId: follower.id,
            artistId: targetArtistProfileId,
            senderId: targetArtistProfileId,
            albumId: album.id,
        }));
        await db_1.default.notification.createMany({ data: notificationsData });
        const releaseLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/album/${album.id}`;
        const io = (0, socket_1.getIO)();
        const userSocketsMap = (0, socket_1.getUserSockets)();
        for (const follower of followerUsers) {
            const targetSocketId = userSocketsMap.get(follower.id);
            if (targetSocketId) {
                io.to(targetSocketId).emit('notification', {
                    type: client_1.NotificationType.NEW_ALBUM,
                    message: `${artistName} just released a new album: ${album.title}`,
                    albumId: album.id,
                });
            }
            if (follower.email) {
                const emailOptions = emailService.createNewReleaseEmail(follower.email, artistName, 'album', album.title, releaseLink, album.coverUrl);
                await emailService.sendEmail(emailOptions);
            }
        }
    };
    sendNotifications().catch(notificationError => {
        console.error("Error sending new album notifications:", notificationError);
    });
    return { message: 'Album created successfully', album };
};
exports.createAlbum = createAlbum;
const addTracksToAlbum = async (req) => {
    const user = req.user;
    const { albumId } = req.params;
    if (!user)
        throw new Error('Forbidden');
    const albumWithLabel = await db_1.default.album.findUnique({
        where: { id: albumId },
        select: {
            artistId: true,
            type: true,
            coverUrl: true,
            isActive: true,
            releaseDate: true,
            labelId: true,
            artist: { select: { artistName: true } },
            tracks: { select: { trackNumber: true } }
        }
    });
    if (!albumWithLabel)
        throw new Error('Album not found');
    if (!canManageAlbum(user, albumWithLabel.artistId))
        throw new Error('You can only add tracks to your own albums');
    const mainArtistId = albumWithLabel.artistId;
    const albumArtistName = albumWithLabel.artist?.artistName || 'Unknown Artist';
    const albumLabelId = albumWithLabel.labelId;
    const files = req.files;
    if (!files || !files.length)
        throw new Error('No files uploaded');
    const existingTracks = await db_1.default.track.findMany({
        where: { albumId },
        select: { trackNumber: true },
    });
    const maxTrackNumber = existingTracks.length > 0 ? Math.max(...existingTracks.map((t) => t.trackNumber || 0)) : 0;
    const titles = Array.isArray(req.body.titles) ? req.body.titles : [];
    const trackNumbers = Array.isArray(req.body.trackNumbers) ? req.body.trackNumbers : [];
    const featuredArtistIdsJson = Array.isArray(req.body.featuredArtistIds) ? req.body.featuredArtistIds : [];
    const featuredArtistNamesJson = Array.isArray(req.body.featuredArtistNames) ? req.body.featuredArtistNames : [];
    const genreIdsJson = Array.isArray(req.body.genreIds) ? req.body.genreIds : [];
    if (files.length !== titles.length) {
        throw new Error(`Mismatch between uploaded files (${files.length}) and titles (${titles.length}).`);
    }
    const trackProcessingResults = await Promise.all(files.map(async (file, index) => {
        const titleForTrack = titles[index];
        const featuredArtistIdsForTrack = JSON.parse(featuredArtistIdsJson[index] || '[]');
        const featuredArtistNamesForTrack = JSON.parse(featuredArtistNamesJson[index] || '[]');
        const genreIdsForTrack = JSON.parse(genreIdsJson[index] || '[]');
        const newTrackNumber = maxTrackNumber + index + 1;
        if (!titleForTrack) {
            console.error(`Missing title for track at index ${index}`);
            throw new Error(`Missing title or metadata for track at index ${index} (file: ${file.originalname})`);
        }
        let duration = 0;
        try {
            const metadata = await mm.parseBuffer(file.buffer);
            duration = Math.floor(metadata.format.duration || 0);
            if (!metadata.format.duration) {
                console.warn(`[addTracksToAlbum] Track ${index} (${file.originalname}): music-metadata could not find duration.`);
            }
        }
        catch (parseError) {
            console.error(`[addTracksToAlbum] Track ${index} (${file.originalname}): Error parsing metadata:`, parseError);
        }
        const uploadResult = await (0, upload_service_1.uploadFile)(file.buffer, 'tracks', 'auto');
        let audioFeatures = {
            tempo: null, mood: null, key: null, scale: null, danceability: null, energy: null,
            instrumentalness: null, acousticness: null, valence: null, loudness: null, speechiness: null,
            genreIds: []
        };
        try {
            audioFeatures = await (0, upload_service_1.analyzeAudioWithReccoBeats)(file.buffer, titleForTrack, albumArtistName);
        }
        catch (analysisError) {
            console.error(`[addTracksToAlbum] Audio analysis failed for track ${index} (${file.originalname}):`, analysisError);
        }
        const audioBufferForFingerprint = file.buffer;
        const hash = crypto.createHash('sha256');
        hash.update(audioBufferForFingerprint);
        const calculatedLocalFingerprint = hash.digest('hex');
        const existingTrackWithFingerprint = await db_1.default.track.findUnique({
            where: { localFingerprint: calculatedLocalFingerprint },
            select: { ...prisma_selects_1.trackSelect, id: true, artistId: true, title: true, albumId: true, labelId: true },
        });
        if (existingTrackWithFingerprint) {
            if (existingTrackWithFingerprint.artistId !== mainArtistId) {
                const error = new Error(`Nội dung bài hát "${file.originalname}" (dấu vân tay cục bộ) đã tồn tại trên hệ thống và thuộc về nghệ sĩ ${existingTrackWithFingerprint.artist?.artistName || 'khác'} (Track: ${existingTrackWithFingerprint.title}).`);
                error.isCopyrightConflict = true;
                error.isLocalFingerprintConflict = true;
                error.conflictingFile = file.originalname;
                error.copyrightDetails = {
                    conflictingTrackTitle: existingTrackWithFingerprint.title,
                    conflictingArtistName: existingTrackWithFingerprint.artist?.artistName || 'Unknown Artist',
                    isLocalFingerprintConflict: true,
                    localFingerprint: calculatedLocalFingerprint,
                };
                throw error;
            }
            else {
                console.log(`[addTracksToAlbum] File ${file.originalname} (fingerprint ${calculatedLocalFingerprint}) matches existing track (ID: ${existingTrackWithFingerprint.id}, Title: "${existingTrackWithFingerprint.title}") by the same artist (ID: ${mainArtistId}).`);
                const oldAlbumIdOfExistingTrack = existingTrackWithFingerprint.albumId;
                if (oldAlbumIdOfExistingTrack === albumId) {
                    const err = new Error(`The audio content of the file "${file.originalname}" (local fingerprint) has already been used for the track "${existingTrackWithFingerprint.title}" (ID: ${existingTrackWithFingerprint.id}) which is already in this album. It cannot be added again.`);
                    err.status = 'DUPLICATE_TRACK_ALREADY_IN_ALBUM';
                    err.conflictingTrack = {
                        id: existingTrackWithFingerprint.id,
                        title: existingTrackWithFingerprint.title,
                    };
                    err.uploadedFileName = file.originalname;
                    err.isDuplicateInAlbum = true;
                    throw err;
                }
                const featuredArtistIdsForThisFile = new Set();
                if (featuredArtistIdsForTrack.length > 0) {
                    const existingArtists = await db_1.default.artistProfile.findMany({ where: { id: { in: featuredArtistIdsForTrack } }, select: { id: true } });
                    existingArtists.forEach(artist => { if (artist.id !== mainArtistId)
                        featuredArtistIdsForThisFile.add(artist.id); });
                }
                if (featuredArtistNamesForTrack.length > 0) {
                    for (const name of featuredArtistNamesForTrack) {
                        try {
                            const profile = await (0, artist_service_1.getOrCreateArtistProfile)(name);
                            if (profile.id !== mainArtistId)
                                featuredArtistIdsForThisFile.add(profile.id);
                        }
                        catch (error) {
                            console.error(`Error resolving artist name "${name}" for track ${index}:`, error);
                        }
                    }
                }
                const updatesForExistingTrack = {
                    title: titleForTrack,
                    album: { connect: { id: albumId } },
                    trackNumber: newTrackNumber,
                    coverUrl: albumWithLabel.coverUrl,
                    type: albumWithLabel.type,
                    releaseDate: new Date(albumWithLabel?.releaseDate || Date.now()),
                    label: albumLabelId ? { connect: { id: albumLabelId } } : (existingTrackWithFingerprint.labelId ? { disconnect: true } : undefined),
                    artist: { connect: { id: mainArtistId } },
                    genres: {
                        deleteMany: {},
                        create: genreIdsForTrack && genreIdsForTrack.length > 0
                            ? genreIdsForTrack.map((genreId) => ({ genre: { connect: { id: genreId } } }))
                            : undefined,
                    },
                    featuredArtists: {
                        deleteMany: {},
                        create: Array.from(featuredArtistIdsForThisFile).map(artistId => ({ artistProfile: { connect: { id: artistId } } }))
                    }
                };
                const updatedTrack = await db_1.default.track.update({
                    where: { id: existingTrackWithFingerprint.id },
                    data: updatesForExistingTrack,
                    select: prisma_selects_1.trackSelect,
                });
                let statusMsg;
                if (oldAlbumIdOfExistingTrack && oldAlbumIdOfExistingTrack !== albumId) {
                    statusMsg = 'skipped_duplicate_self_moved_album';
                }
                else {
                    statusMsg = 'skipped_duplicate_self_updated_metadata';
                }
                return {
                    status: statusMsg,
                    fileName: file.originalname,
                    track: updatedTrack,
                    oldAlbumId: oldAlbumIdOfExistingTrack,
                    localFingerprint: calculatedLocalFingerprint,
                };
            }
        }
        const existingTrackCheck = await db_1.default.track.findFirst({
            where: { title: titleForTrack, artistId: mainArtistId, albumId: albumId },
        });
        if (existingTrackCheck) {
            console.warn(`Track with title "${titleForTrack}" already exists in this album for this artist. Skipping.`);
        }
        const allFeaturedArtistIds = new Set();
        if (featuredArtistIdsForTrack.length > 0) {
            const existingArtists = await db_1.default.artistProfile.findMany({ where: { id: { in: featuredArtistIdsForTrack } }, select: { id: true } });
            existingArtists.forEach(artist => { if (artist.id !== mainArtistId)
                allFeaturedArtistIds.add(artist.id); });
        }
        if (featuredArtistNamesForTrack.length > 0) {
            for (const name of featuredArtistNamesForTrack) {
                try {
                    const profile = await (0, artist_service_1.getOrCreateArtistProfile)(name);
                    if (profile.id !== mainArtistId)
                        allFeaturedArtistIds.add(profile.id);
                }
                catch (error) {
                    console.error(`Error resolving artist name "${name}" for track ${index}:`, error);
                }
            }
        }
        const trackData = {
            title: titleForTrack,
            duration,
            releaseDate: new Date(albumWithLabel?.releaseDate || Date.now()),
            trackNumber: newTrackNumber,
            coverUrl: albumWithLabel.coverUrl,
            audioUrl: uploadResult.secure_url,
            artist: { connect: { id: mainArtistId } },
            album: { connect: { id: albumId } },
            type: albumWithLabel.type,
            isActive: albumWithLabel.isActive,
            tempo: audioFeatures.tempo,
            mood: audioFeatures.mood,
            key: audioFeatures.key,
            scale: audioFeatures.scale,
            danceability: audioFeatures.danceability,
            energy: audioFeatures.energy,
            localFingerprint: calculatedLocalFingerprint,
            featuredArtists: allFeaturedArtistIds.size > 0
                ? { create: Array.from(allFeaturedArtistIds).map(artistId => ({ artistProfile: { connect: { id: artistId } } })) }
                : undefined,
            genres: genreIdsForTrack && genreIdsForTrack.length > 0
                ? { create: genreIdsForTrack.map((genreId) => ({ genre: { connect: { id: genreId } } })) }
                : undefined,
        };
        if (albumLabelId) {
            trackData.label = { connect: { id: albumLabelId } };
        }
        const track = await db_1.default.track.create({
            data: trackData,
            select: prisma_selects_1.trackSelect,
        });
        return track;
    }));
    const successfullyAddedTracks = trackProcessingResults.filter((result) => result && !('status' in result));
    const skippedTracks = trackProcessingResults.filter((result) => result && 'status' in result);
    const tracksForAlbumUpdate = await db_1.default.track.findMany({
        where: { albumId },
        select: { duration: true, id: true, title: true }
    });
    const totalDuration = tracksForAlbumUpdate.reduce((sum, track) => sum + (track.duration || 0), 0);
    const updatedAlbum = await db_1.default.album.update({
        where: { id: albumId },
        data: { duration: totalDuration, totalTracks: tracksForAlbumUpdate.length },
        select: prisma_selects_1.albumSelect,
    });
    const io = (0, socket_1.getIO)();
    io.emit('album:updated', { album: updatedAlbum });
    const movedTracksInfo = skippedTracks.filter((item) => item.status === 'skipped_duplicate_self_moved_album' && !!item.oldAlbumId && item.oldAlbumId !== albumId && !!item.track);
    for (const movedTrack of movedTracksInfo) {
        if (movedTrack.oldAlbumId) {
            try {
                await db_1.default.album.update({
                    where: { id: movedTrack.oldAlbumId },
                    data: { totalTracks: { decrement: 1 } },
                });
                console.log(`[addTracksToAlbum] Decremented track count for old album ${movedTrack.oldAlbumId} due to track ${movedTrack.track?.id} moving.`);
            }
            catch (error) {
                console.error(`[addTracksToAlbum] Failed to decrement track count for old album ${movedTrack.oldAlbumId}:`, error);
            }
        }
    }
    return {
        message: 'Tracks processing complete.',
        album: updatedAlbum,
        successfullyAddedTracks,
        skippedTracks
    };
};
exports.addTracksToAlbum = addTracksToAlbum;
const updateAlbum = async (req) => {
    const { id } = req.params;
    const { title, releaseDate, type, labelId } = req.body;
    const coverFile = req.file;
    const user = req.user;
    if (!user)
        throw new Error('Forbidden');
    const album = await db_1.default.album.findUnique({
        where: { id },
        select: { artistId: true, coverUrl: true, labelId: true },
    });
    if (!album)
        throw new Error('Album not found');
    if (!canManageAlbum(user, album.artistId))
        throw new Error('You can only update your own albums');
    let coverUrl;
    if (coverFile) {
        const coverUpload = await (0, upload_service_1.uploadFile)(coverFile.buffer, 'covers', 'image');
        coverUrl = coverUpload.secure_url;
    }
    const updateData = {};
    if (title)
        updateData.title = title;
    if (releaseDate) {
        const newReleaseDate = new Date(releaseDate);
        updateData.releaseDate = newReleaseDate;
        updateData.isActive = newReleaseDate <= new Date();
    }
    if (type)
        updateData.type = type;
    if (coverUrl)
        updateData.coverUrl = coverUrl;
    if (labelId !== undefined) {
        if (typeof labelId !== 'string' && labelId !== null) {
            throw new Error(`Invalid labelId type: expected string or null, got ${typeof labelId}`);
        }
        if (labelId === null || labelId === '') {
            updateData.labelId = null;
        }
        else {
            const labelExists = await db_1.default.label.findUnique({ where: { id: labelId } });
            if (!labelExists)
                throw new Error(`Invalid label ID: ${labelId} does not exist`);
            updateData.labelId = labelId;
        }
    }
    if (req.body.genres !== undefined) {
        await db_1.default.albumGenre.deleteMany({ where: { albumId: id } });
        const genresInput = req.body.genres;
        const genresArray = !genresInput
            ? []
            : Array.isArray(genresInput)
                ? genresInput.map(String).filter(Boolean)
                : typeof genresInput === 'string'
                    ? genresInput.split(',').map((g) => g.trim()).filter(Boolean)
                    : [];
        if (genresArray.length > 0) {
            const existingGenres = await db_1.default.genre.findMany({
                where: { id: { in: genresArray } },
                select: { id: true },
            });
            const validGenreIds = existingGenres.map((genre) => genre.id);
            const invalidGenreIds = genresArray.filter((id) => !validGenreIds.includes(id));
            if (invalidGenreIds.length > 0) {
                throw new Error(`Invalid genre IDs: ${invalidGenreIds.join(', ')}`);
            }
            updateData.genres = {
                create: validGenreIds.map((genreId) => ({
                    genre: { connect: { id: genreId } },
                })),
            };
        }
        else {
            delete updateData.genres;
        }
    }
    if (req.body.isActive !== undefined) {
        updateData.isActive = req.body.isActive === 'true' || req.body.isActive === true;
    }
    const updatedAlbum = await db_1.default.album.update({
        where: { id },
        data: updateData,
        select: prisma_selects_1.albumSelect,
    });
    const io = (0, socket_1.getIO)();
    io.emit('album:updated', { album: updatedAlbum });
    return { message: 'Album updated successfully', album: updatedAlbum };
};
exports.updateAlbum = updateAlbum;
const deleteAlbum = async (req) => {
    const { id } = req.params;
    const user = req.user;
    if (!user)
        throw new Error('Forbidden');
    const album = await db_1.default.album.findUnique({
        where: { id },
        select: { artistId: true },
    });
    if (!album)
        throw new Error('Album not found');
    if (!canManageAlbum(user, album.artistId))
        throw new Error('You can only delete your own albums');
    await (0, exports.deleteAlbumById)(id);
    return { message: 'Album deleted successfully' };
};
exports.deleteAlbum = deleteAlbum;
const toggleAlbumVisibility = async (req) => {
    const { id } = req.params;
    const user = req.user;
    if (!user)
        throw new Error('Forbidden');
    const album = await db_1.default.album.findUnique({
        where: { id },
        select: { artistId: true, isActive: true },
    });
    if (!album)
        throw new Error('Album not found');
    const newIsActive = !album.isActive;
    if (!canManageAlbum(user, album.artistId))
        throw new Error('You can only toggle your own albums');
    const updatedAlbum = await db_1.default.album.update({
        where: { id },
        data: { isActive: newIsActive },
        select: prisma_selects_1.albumSelect,
    });
    const io = (0, socket_1.getIO)();
    io.emit('album:visibilityChanged', { albumId: updatedAlbum.id, isActive: newIsActive });
    return {
        message: `Album ${newIsActive ? 'activated' : 'hidden'} successfully`,
        album: updatedAlbum,
    };
};
exports.toggleAlbumVisibility = toggleAlbumVisibility;
const searchAlbum = async (req) => {
    const { q, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const user = req.user;
    if (!q)
        throw new Error('Query is required');
    const searchQuery = String(q).trim();
    if (user) {
        const existingHistory = await db_1.default.history.findFirst({
            where: { userId: user.id, type: client_1.HistoryType.SEARCH, query: { equals: searchQuery, mode: 'insensitive' } },
        });
        if (existingHistory) {
            await db_1.default.history.update({ where: { id: existingHistory.id }, data: { updatedAt: new Date() } });
        }
        else {
            await db_1.default.history.create({ data: { type: client_1.HistoryType.SEARCH, query: searchQuery, userId: user.id } });
        }
    }
    const whereClause = {
        OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { artist: { artistName: { contains: searchQuery, mode: 'insensitive' } } },
        ],
    };
    if (user?.currentProfile === 'ARTIST' && user?.artistProfile?.id) {
        whereClause.artistId = user.artistProfile.id;
    }
    if (!user || user.role !== client_1.Role.ADMIN) {
        if (user?.artistProfile?.isVerified && user?.currentProfile === 'ARTIST') {
            whereClause.OR = [
                { isActive: true },
                { AND: [{ isActive: false }, { artistId: user.artistProfile.id }] },
            ];
        }
        else {
            whereClause.isActive = true;
        }
    }
    const [albums, total] = await Promise.all([
        db_1.default.album.findMany({
            where: whereClause,
            skip: offset,
            take: Number(limit),
            select: prisma_selects_1.albumSelect,
        }),
        db_1.default.album.count({ where: whereClause }),
    ]);
    return {
        albums,
        pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    };
};
exports.searchAlbum = searchAlbum;
const getAdminAllAlbums = async (req) => {
    const user = req.user;
    if (!user)
        throw new Error('Unauthorized');
    if (user.role !== client_1.Role.ADMIN && (!user.artistProfile?.isVerified || user.artistProfile?.role !== 'ARTIST')) {
        throw new Error('Forbidden: Only admins or verified artists can access this resource');
    }
    const { search, status, genres } = req.query;
    const whereClause = {};
    if (user.role !== client_1.Role.ADMIN && user.artistProfile?.id) {
        whereClause.artistId = user.artistProfile.id;
    }
    const conditions = [];
    if (search) {
        conditions.push({
            OR: [
                { title: { contains: String(search), mode: 'insensitive' } },
                { artist: { artistName: { contains: String(search), mode: 'insensitive' } } },
            ],
        });
    }
    if (status)
        whereClause.isActive = status === 'true';
    if (genres) {
        const genreIds = Array.isArray(genres) ? genres : [genres];
        if (genreIds.length > 0) {
            conditions.push({ genres: { some: { genreId: { in: genreIds } } } });
        }
    }
    if (conditions.length > 0)
        whereClause.AND = conditions;
    let orderBy = { releaseDate: 'desc' };
    const { sortBy, sortOrder } = req.query;
    const validSortFields = ['title', 'type', 'totalTracks', 'isActive', 'releaseDate'];
    if (sortBy && validSortFields.includes(String(sortBy))) {
        const order = sortOrder === 'asc' ? 'asc' : 'desc';
        if (sortBy === 'totalTracks') {
            orderBy = [{ tracks: { _count: order } }, { id: 'asc' }];
        }
        else {
            orderBy = [{ [String(sortBy)]: order }, { id: 'asc' }];
        }
    }
    else {
        orderBy = [{ releaseDate: 'desc' }, { id: 'asc' }];
    }
    const result = await (0, handle_utils_1.paginate)(db_1.default.album, req, {
        where: whereClause,
        include: {
            artist: { select: { id: true, artistName: true, avatar: true, isVerified: true } },
            genres: { include: { genre: true } },
            tracks: {
                select: prisma_selects_1.trackSelect,
                orderBy: { trackNumber: 'asc' },
            },
            label: { select: { id: true, name: true, logoUrl: true } },
        },
        orderBy: orderBy,
    });
    const formattedAlbums = result.data.map((album) => ({
        ...album,
        totalTracks: album.tracks?.length ?? 0,
    }));
    return { albums: formattedAlbums, pagination: result.pagination };
};
exports.getAdminAllAlbums = getAdminAllAlbums;
const getAlbumById = async (req) => {
    const { id } = req.params;
    const user = req.user;
    const isAuthenticated = !!user;
    const album = await db_1.default.album.findUnique({
        where: { id },
        select: prisma_selects_1.albumSelect,
    });
    if (!album)
        throw new Error('Album not found');
    if (album.isActive) {
        return { ...album, requiresAuth: !isAuthenticated };
    }
    const isOwnerOrAdmin = user && (user.role === client_1.Role.ADMIN ||
        (user.artistProfile?.id === album.artist?.id));
    if (isOwnerOrAdmin) {
        return { ...album, requiresAuth: !isAuthenticated };
    }
    else {
        throw new Error('Album not found or access denied');
    }
};
exports.getAlbumById = getAlbumById;
//# sourceMappingURL=album.service.js.map