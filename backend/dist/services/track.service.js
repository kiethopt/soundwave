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
exports.checkTrackLiked = exports.playTrack = exports.getTracksByTypeAndGenre = exports.getTracksByGenre = exports.getTrackById = exports.getAllTracksAdminArtist = exports.getTracksByType = exports.searchTrack = exports.toggleTrackVisibility = exports.deleteTrack = exports.updateTrack = exports.TrackService = exports.getTracks = exports.unlikeTrack = exports.likeTrack = exports.deleteTrackById = exports.canManageTrack = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const upload_service_1 = require("./upload.service");
const handle_utils_1 = require("../utils/handle-utils");
const emailService = __importStar(require("./email.service"));
const cache_middleware_1 = require("../middleware/cache.middleware");
const prisma_selects_1 = require("../utils/prisma-selects");
const socket_1 = require("../config/socket");
const artist_service_1 = require("./artist.service");
const mm = __importStar(require("music-metadata"));
const essentia_js_1 = require("essentia.js");
const mpg123_decoder_1 = require("mpg123-decoder");
async function convertMp3BufferToPcmF32(audioBuffer) {
    try {
        const decoder = new mpg123_decoder_1.MPEGDecoder();
        await decoder.ready;
        const uint8ArrayBuffer = new Uint8Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.length);
        const decoded = decoder.decode(uint8ArrayBuffer);
        decoder.free();
        if (decoded.errors.length > 0) {
            console.error('MP3 Decoding errors:', decoded.errors);
            return null;
        }
        if (decoded.channelData.length > 1) {
            const leftChannel = decoded.channelData[0];
            const rightChannel = decoded.channelData[1];
            const monoChannel = new Float32Array(leftChannel.length);
            for (let i = 0; i < leftChannel.length; i++) {
                monoChannel[i] = (leftChannel[i] + rightChannel[i]) / 2;
            }
            return monoChannel;
        }
        else if (decoded.channelData.length === 1) {
            return decoded.channelData[0];
        }
        else {
            console.error('MP3 Decoding produced no channel data.');
            return null;
        }
    }
    catch (error) {
        console.error('Error during MP3 decoding or processing:', error);
        return null;
    }
}
function analyzeMood(energy, valence) {
    if (energy > 0.6 && valence > 0.6)
        return 'Energetic/Happy';
    if (energy > 0.6 && valence <= 0.4)
        return 'Energetic/Aggressive';
    if (energy <= 0.4 && valence > 0.6)
        return 'Calm/Happy';
    if (energy <= 0.4 && valence <= 0.4)
        return 'Sad/Calm';
    if (energy > 0.5 && valence > 0.4 && valence <= 0.6)
        return 'Neutral/Driving';
    return 'Neutral';
}
const canManageTrack = (user, trackArtistId) => {
    if (!user)
        return false;
    if (user.role === client_1.Role.ADMIN)
        return true;
    return (user.artistProfile?.isVerified &&
        user.artistProfile?.isActive &&
        user.artistProfile?.role === client_1.Role.ARTIST &&
        user.artistProfile?.id === trackArtistId);
};
exports.canManageTrack = canManageTrack;
const deleteTrackById = async (id) => {
    const track = await db_1.default.track.findUnique({
        where: { id },
        select: { id: true, albumId: true },
    });
    if (!track) {
        throw new Error('Track not found');
    }
    const io = (0, socket_1.getIO)();
    io.emit('track:deleted', { trackId: id });
    return db_1.default.$transaction(async (tx) => {
        await tx.track.delete({
            where: { id },
        });
        if (track.albumId) {
            await tx.album.update({
                where: { id: track.albumId },
                data: { totalTracks: { decrement: 1 } },
            });
        }
    });
};
exports.deleteTrackById = deleteTrackById;
const likeTrack = async (userId, trackId) => {
    const track = await db_1.default.track.findFirst({
        where: {
            id: trackId,
            isActive: true,
        },
    });
    if (!track) {
        throw new Error('Track not found or not active');
    }
    const existingLike = await db_1.default.userLikeTrack.findUnique({
        where: {
            userId_trackId: {
                userId,
                trackId,
            },
        },
    });
    if (existingLike) {
        throw new Error('Track already liked');
    }
    await db_1.default.userLikeTrack.create({
        data: {
            userId,
            trackId,
        },
    });
    let favoritePlaylist = await db_1.default.playlist.findFirst({
        where: {
            userId,
            type: 'FAVORITE',
        },
    });
    if (!favoritePlaylist) {
        favoritePlaylist = await db_1.default.playlist.create({
            data: {
                name: "Favorites",
                description: "List of your favorite songs",
                privacy: "PRIVATE",
                type: "FAVORITE",
                userId,
                totalTracks: 0,
                totalDuration: 0,
            },
        });
    }
    const tracksCount = await db_1.default.playlistTrack.count({
        where: {
            playlistId: favoritePlaylist.id,
        },
    });
    await db_1.default.playlistTrack.create({
        data: {
            playlistId: favoritePlaylist.id,
            trackId,
            trackOrder: tracksCount + 1,
        },
    });
    await db_1.default.playlist.update({
        where: {
            id: favoritePlaylist.id,
        },
        data: {
            totalTracks: {
                increment: 1,
            },
            totalDuration: {
                increment: track.duration || 0,
            },
        },
    });
    const io = (0, socket_1.getIO)();
    io.emit('playlist-updated');
    io.to(`user-${userId}`).emit('favorites-updated', { action: 'add', trackId });
    return { message: 'Track liked successfully' };
};
exports.likeTrack = likeTrack;
const unlikeTrack = async (userId, trackId) => {
    const existingLike = await db_1.default.userLikeTrack.findUnique({
        where: {
            userId_trackId: {
                userId,
                trackId,
            },
        },
    });
    if (!existingLike) {
        throw new Error('Track not liked');
    }
    const favoritePlaylist = await db_1.default.playlist.findFirst({
        where: {
            userId,
            type: 'FAVORITE',
        },
        include: {
            _count: {
                select: {
                    tracks: true
                }
            }
        }
    });
    if (!favoritePlaylist) {
        await db_1.default.userLikeTrack.delete({
            where: {
                userId_trackId: {
                    userId,
                    trackId,
                },
            },
        });
        return { message: 'Track unliked successfully' };
    }
    const track = await db_1.default.track.findUnique({
        where: { id: trackId },
        select: { duration: true }
    });
    await db_1.default.userLikeTrack.delete({
        where: {
            userId_trackId: {
                userId,
                trackId,
            },
        },
    });
    await db_1.default.playlistTrack.deleteMany({
        where: {
            playlist: {
                userId,
                type: 'FAVORITE',
            },
            trackId,
        },
    });
    await db_1.default.playlist.update({
        where: {
            id: favoritePlaylist.id,
        },
        data: {
            totalTracks: {
                decrement: 1,
            },
            totalDuration: {
                decrement: track?.duration || 0,
            },
        },
    });
    const io = (0, socket_1.getIO)();
    if (favoritePlaylist._count.tracks === 1) {
        await db_1.default.playlist.delete({
            where: {
                id: favoritePlaylist.id
            }
        });
        io.emit('playlist-updated');
        io.to(`user-${userId}`).emit('favorites-updated', { action: 'deleted', playlistId: favoritePlaylist.id });
        return { message: 'Track unliked and empty Favorites playlist removed' };
    }
    io.emit('playlist-updated');
    io.to(`user-${userId}`).emit('favorites-updated', { action: 'remove', trackId });
    return { message: 'Track unliked successfully' };
};
exports.unlikeTrack = unlikeTrack;
const getTracks = async (req) => {
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
            { album: { title: { contains: search, mode: 'insensitive' } } },
            {
                genres: {
                    every: {
                        genre: {
                            name: { contains: search, mode: 'insensitive' },
                        },
                    },
                },
            },
            {
                featuredArtists: {
                    some: {
                        artistProfile: {
                            artistName: { contains: search, mode: 'insensitive' },
                        },
                    },
                },
            },
        ];
    }
    const orderByClause = {};
    if (sortBy &&
        typeof sortBy === 'string' &&
        (sortOrder === 'asc' || sortOrder === 'desc')) {
        if (sortBy === 'title' ||
            sortBy === 'duration' ||
            sortBy === 'releaseDate' ||
            sortBy === 'createdAt' ||
            sortBy === 'isActive') {
            orderByClause[sortBy] = sortOrder;
        }
        else if (sortBy === 'album') {
            orderByClause.album = { title: sortOrder };
        }
        else if (sortBy === 'artist') {
            orderByClause.artist = { artistName: sortOrder };
        }
        else {
            orderByClause.releaseDate = 'desc';
        }
    }
    else {
        orderByClause.releaseDate = 'desc';
    }
    const result = await (0, handle_utils_1.paginate)(db_1.default.track, req, {
        where: whereClause,
        include: {
            artist: {
                select: { id: true, artistName: true, avatar: true },
            },
            album: { select: { id: true, title: true, coverUrl: true } },
            genres: { include: { genre: true } },
            featuredArtists: {
                include: { artistProfile: { select: { id: true, artistName: true } } },
            },
        },
        orderBy: orderByClause,
    });
    const formattedTracks = result.data.map((track) => ({
        ...track,
        genres: track.genres,
        featuredArtists: track.featuredArtists,
    }));
    return {
        data: formattedTracks,
        pagination: result.pagination,
    };
};
exports.getTracks = getTracks;
class TrackService {
    static async createTrack(artistProfileId, data, audioFile, coverFile) {
        const { title, releaseDate, type, genreIds, featuredArtistIds = [], featuredArtistNames = [], labelId } = data;
        const mainArtist = await db_1.default.artistProfile.findUnique({
            where: { id: artistProfileId },
            select: { id: true, labelId: true, artistName: true, avatar: true }
        });
        if (!mainArtist) {
            throw new Error(`Artist profile with ID ${artistProfileId} not found.`);
        }
        const artistName = mainArtist.artistName;
        const finalLabelId = labelId || mainArtist.labelId;
        const [audioUploadResult, coverUploadResult] = await Promise.all([
            (0, upload_service_1.uploadFile)(audioFile.buffer, 'tracks', 'auto'),
            coverFile ? (0, upload_service_1.uploadFile)(coverFile.buffer, 'covers', 'image') : Promise.resolve(null),
        ]);
        let duration = 0;
        let tempo = null;
        let mood = null;
        let key = null;
        let scale = null;
        let danceability = null;
        let energy = null;
        try {
<<<<<<< HEAD
            const audioMetadata = await mm.parseBuffer(audioFile.buffer);
            duration = Math.round(audioMetadata.format.duration || 0);
            console.log(`[TrackService.createTrack] (${audioFile.originalname}): Parsed duration = ${audioMetadata.format.duration}, Saved duration = ${duration}`);
            if (!audioMetadata.format.duration) {
                console.warn(`[TrackService.createTrack] (${audioFile.originalname}): music-metadata could not find duration.`);
            }
        }
        catch (error) {
            console.error(`[TrackService.createTrack] (${audioFile.originalname}): Error parsing audio metadata:`, error);
=======
            const metadata = await mm.parseBuffer(audioFile.buffer, audioFile.mimetype);
            duration = Math.round(metadata.format.duration || 0);
            tempo = null;
            mood = null;
            try {
                const pcmF32 = await convertMp3BufferToPcmF32(audioFile.buffer);
                if (pcmF32) {
                    const essentia = new essentia_js_1.Essentia(essentia_js_1.EssentiaWASM);
                    const audioVector = essentia.arrayToVector(pcmF32);
                    try {
                        const tempoResult = essentia.PercivalBpmEstimator(audioVector);
                        tempo = Math.round(tempoResult.bpm);
                    }
                    catch (tempoError) {
                        console.error('Error estimating tempo:', tempoError);
                        tempo = null;
                    }
                    try {
                        const danceabilityResult = essentia.Danceability(audioVector);
                        danceability = danceabilityResult.danceability;
                    }
                    catch (danceabilityError) {
                        console.error('Error estimating danceability:', danceabilityError);
                        danceability = null;
                    }
                    try {
                        const energyResult = essentia.Energy(audioVector);
                        energy = energyResult.energy;
                        if (typeof energy === 'number') {
                            if (energy > 0.6) {
                                mood = 'Energetic';
                            }
                            else if (energy < 0.4) {
                                mood = 'Calm';
                            }
                            else {
                                mood = 'Neutral';
                            }
                        }
                    }
                    catch (energyError) {
                        console.error('Error calculating energy/mood:', energyError);
                        mood = null;
                        energy = null;
                    }
                    try {
                        const keyResult = essentia.KeyExtractor(audioVector);
                        key = keyResult.key;
                        scale = keyResult.scale;
                    }
                    catch (keyError) {
                        console.error('Error estimating key/scale:', keyError);
                        key = null;
                        scale = null;
                    }
                }
                else {
                    console.warn('Audio decoding failed, skipping all audio analysis.');
                }
            }
            catch (analysisError) {
                console.error('Error during audio analysis pipeline:', analysisError);
                tempo = null;
                mood = null;
            }
        }
        catch (error) {
            console.error('Error parsing basic audio metadata:', error);
            tempo = null;
            mood = null;
>>>>>>> dabf14e3545e792907af12c5943f7cf419bef408
        }
        const allFeaturedArtistIds = new Set();
        if (featuredArtistIds.length > 0) {
            const existingArtists = await db_1.default.artistProfile.findMany({
                where: { id: { in: featuredArtistIds } },
                select: { id: true }
            });
            existingArtists.forEach(artist => allFeaturedArtistIds.add(artist.id));
        }
        if (featuredArtistNames.length > 0) {
            for (const name of featuredArtistNames) {
                try {
                    const profile = await (0, artist_service_1.getOrCreateArtistProfile)(name);
                    if (profile.id !== artistProfileId) {
                        allFeaturedArtistIds.add(profile.id);
                    }
                }
                catch (error) {
                    console.error(`Error finding or creating artist profile for \"${name}\":`, error);
                }
            }
        }
        const trackData = {
            title,
            duration,
            releaseDate: new Date(releaseDate),
            type,
            audioUrl: audioUploadResult.secure_url,
            coverUrl: coverUploadResult?.secure_url,
            artist: { connect: { id: artistProfileId } },
            label: finalLabelId ? { connect: { id: finalLabelId } } : undefined,
            isActive: true,
            tempo: tempo,
            mood: mood,
            key: key,
            scale: scale,
            danceability: danceability,
            energy: energy,
        };
        if (genreIds && genreIds.length > 0) {
            trackData.genres = {
                create: genreIds.map((genreId) => ({ genre: { connect: { id: genreId } } })),
            };
        }
        const featuredArtistIdsArray = Array.from(allFeaturedArtistIds);
        if (featuredArtistIdsArray.length > 0) {
            trackData.featuredArtists = {
                create: featuredArtistIdsArray.map((artistId) => ({ artistProfile: { connect: { id: artistId } } })),
            };
        }
        const newTrack = await db_1.default.track.create({
            data: trackData,
            select: {
                ...prisma_selects_1.trackSelect,
                albumId: true
            },
        });
        const sendNotifications = async () => {
            const followers = await db_1.default.userFollow.findMany({
                where: {
                    followingArtistId: artistProfileId,
                    followingType: 'ARTIST',
                },
                select: { followerId: true },
            });
            const followerIds = followers.map((f) => f.followerId);
            if (followerIds.length > 0) {
                const followerUsers = await db_1.default.user.findMany({
                    where: { id: { in: followerIds }, isActive: true },
                    select: { id: true, email: true },
                });
                const notificationsData = followerUsers.map((follower) => ({
                    type: client_1.NotificationType.NEW_TRACK,
                    message: `${artistName} just released a new track: ${title}`,
                    recipientType: client_1.RecipientType.USER,
                    userId: follower.id,
                    artistId: artistProfileId,
                    senderId: artistProfileId,
                    trackId: newTrack.id,
                }));
                if (notificationsData.length > 0) {
                    await db_1.default.notification.createMany({ data: notificationsData });
                }
                const releaseLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/track/${newTrack.id}`;
                const io = (0, socket_1.getIO)();
                const userSocketsMap = (0, socket_1.getUserSockets)();
                for (const user of followerUsers) {
                    const targetSocketId = userSocketsMap.get(user.id);
                    if (targetSocketId) {
                        io.to(targetSocketId).emit('notification', {
                            type: client_1.NotificationType.NEW_TRACK,
                            message: `${artistName} just released a new track: ${newTrack.title}`,
                            trackId: newTrack.id,
                            sender: {
                                id: artistProfileId,
                                name: artistName,
                                avatar: mainArtist.avatar
                            },
                            track: {
                                id: newTrack.id,
                                title: newTrack.title,
                                coverUrl: newTrack.coverUrl
                            }
                        });
                    }
                    if (user.email) {
                        const emailOptions = emailService.createNewReleaseEmail(user.email, artistName, 'track', newTrack.title, releaseLink, newTrack.coverUrl);
                        emailService.sendEmail(emailOptions).catch(emailError => {
                            console.error(`Failed to send new track email to ${user.email}:`, emailError);
                        });
                    }
                }
            }
        };
        sendNotifications().catch(notificationError => {
            console.error("Error sending new track notifications:", notificationError);
        });
        return newTrack;
    }
}
exports.TrackService = TrackService;
const updateTrack = async (req, id) => {
    const { title, releaseDate, type, trackNumber, albumId, labelId, } = req.body;
    const currentTrack = await db_1.default.track.findUnique({
        where: { id },
        select: {
            releaseDate: true,
            isActive: true,
            artistId: true,
            coverUrl: true,
            labelId: true,
            albumId: true,
        },
    });
    if (!currentTrack)
        throw new Error('Track not found');
    if (!(0, exports.canManageTrack)(req.user, currentTrack.artistId)) {
        throw new Error('You can only update your own tracks');
    }
    const updateData = {};
    if (title !== undefined)
        updateData.title = title;
    if (type !== undefined)
        updateData.type = type;
    if (trackNumber !== undefined)
        updateData.trackNumber = Number(trackNumber);
    if (albumId !== undefined) {
        if (albumId === null || albumId === '') {
            updateData.album = { disconnect: true };
        }
        else if (typeof albumId === 'string') {
            const albumExists = await db_1.default.album.findUnique({ where: { id: albumId }, select: { id: true } });
            if (!albumExists)
                throw new Error(`Invalid Album ID: ${albumId} does not exist`);
            updateData.album = { connect: { id: albumId } };
        }
        else {
            throw new Error(`Invalid albumId type: expected string or null, got ${typeof albumId}`);
        }
    }
    if (labelId !== undefined) {
        if (labelId === null || labelId === '') {
            updateData.label = { disconnect: true };
        }
        else if (typeof labelId === 'string') {
            const labelExists = await db_1.default.label.findUnique({ where: { id: labelId } });
            if (!labelExists)
                throw new Error(`Invalid label ID: ${labelId} does not exist`);
            updateData.label = { connect: { id: labelId } };
        }
        else {
            throw new Error(`Invalid labelId type: expected string or null, got ${typeof labelId}`);
        }
    }
    if (req.files && req.files.coverFile) {
        const coverFile = req.files.coverFile[0];
        const coverUpload = await (0, upload_service_1.uploadFile)(coverFile.buffer, 'covers', 'image');
        updateData.coverUrl = coverUpload.secure_url;
    }
    else if (req.body.removeCover === 'true') {
        updateData.coverUrl = null;
    }
    if (releaseDate !== undefined) {
        const newReleaseDate = new Date(releaseDate);
        if (isNaN(newReleaseDate.getTime())) {
            throw new Error('Invalid release date format');
        }
        const now = new Date();
        updateData.isActive = newReleaseDate <= now;
        updateData.releaseDate = newReleaseDate;
    }
    if (req.body.isActive !== undefined) {
        updateData.isActive = req.body.isActive === 'true' || req.body.isActive === true;
    }
    if (req.body.genres !== undefined) {
        await db_1.default.trackGenre.deleteMany({ where: { trackId: id } });
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
        }
    }
    const updatedTrack = await db_1.default.$transaction(async (tx) => {
        const originalAlbumId = currentTrack.albumId;
        await tx.track.update({
            where: { id },
            data: updateData,
        });
        const newAlbumId = updateData.album?.connect?.id ??
            (albumId === null || albumId === '' ? null : originalAlbumId);
        if (originalAlbumId !== newAlbumId) {
            if (originalAlbumId) {
                await tx.album.update({
                    where: { id: originalAlbumId },
                    data: { totalTracks: { decrement: 1 } },
                });
            }
            if (newAlbumId) {
                await tx.album.update({
                    where: { id: newAlbumId },
                    data: { totalTracks: { increment: 1 } },
                });
            }
        }
        const featuredArtistIdsFromBody = req.body.featuredArtistIds;
        const featuredArtistNamesFromBody = req.body.featuredArtistNames;
        if (featuredArtistIdsFromBody !== undefined || featuredArtistNamesFromBody !== undefined) {
            await tx.trackArtist.deleteMany({ where: { trackId: id } });
            const resolvedFeaturedArtistIds = new Set();
            if (featuredArtistIdsFromBody && Array.isArray(featuredArtistIdsFromBody) && featuredArtistIdsFromBody.length > 0) {
                const existingArtists = await tx.artistProfile.findMany({
                    where: { id: { in: featuredArtistIdsFromBody } },
                    select: { id: true },
                });
                const validArtistIds = new Set(existingArtists.map(a => a.id));
                featuredArtistIdsFromBody.forEach(artistId => {
                    if (validArtistIds.has(artistId) && artistId !== currentTrack.artistId) {
                        resolvedFeaturedArtistIds.add(artistId);
                    }
                    else if (!validArtistIds.has(artistId)) {
                        console.warn(`[updateTrack] Invalid featured artist ID provided and skipped: ${artistId}`);
                    }
                    else if (artistId === currentTrack.artistId) {
                        console.warn(`[updateTrack] Main artist ID (${artistId}) cannot be a featured artist on their own track.`);
                    }
                });
            }
            if (featuredArtistNamesFromBody && Array.isArray(featuredArtistNamesFromBody) && featuredArtistNamesFromBody.length > 0) {
                for (const name of featuredArtistNamesFromBody) {
                    if (typeof name === 'string' && name.trim() !== '') {
                        try {
                            const profile = await (0, artist_service_1.getOrCreateArtistProfile)(name.trim(), tx);
                            if (profile.id !== currentTrack.artistId) {
                                resolvedFeaturedArtistIds.add(profile.id);
                            }
                            else {
                                console.warn(`[updateTrack] Main artist (${name}) cannot be a featured artist on their own track.`);
                            }
                        }
                        catch (error) {
                            console.error(`[updateTrack] Error processing featured artist name "${name}":`, error);
                        }
                    }
                }
            }
            const finalArtistIdsToLink = Array.from(resolvedFeaturedArtistIds);
            if (finalArtistIdsToLink.length > 0) {
                await tx.trackArtist.createMany({
                    data: finalArtistIdsToLink.map((artistId) => ({
                        trackId: id,
                        artistId: artistId,
                    })),
                    skipDuplicates: true,
                });
            }
        }
        const finalUpdatedTrack = await tx.track.findUnique({
            where: { id },
            select: prisma_selects_1.trackSelect,
        });
        if (!finalUpdatedTrack) {
            throw new Error("Failed to re-fetch track after updating relations.");
        }
        return finalUpdatedTrack;
    });
    const io = (0, socket_1.getIO)();
    io.emit('track:updated', { track: updatedTrack });
    return { message: 'Track updated successfully', track: updatedTrack };
};
exports.updateTrack = updateTrack;
const deleteTrack = async (req, id) => {
    const user = req.user;
    if (!user)
        throw new Error('Unauthorized: User not found');
    const track = await db_1.default.track.findUnique({
        where: { id },
        select: { artistId: true },
    });
    if (!track)
        throw new Error('Track not found');
    if (!(0, exports.canManageTrack)(user, track.artistId)) {
        throw new Error('You can only delete your own tracks');
    }
    await (0, exports.deleteTrackById)(id);
    return { message: 'Track deleted successfully' };
};
exports.deleteTrack = deleteTrack;
const toggleTrackVisibility = async (req, id) => {
    const user = req.user;
    if (!user)
        throw new Error('Unauthorized: User not found');
    const track = await db_1.default.track.findUnique({
        where: { id },
        select: { artistId: true, isActive: true },
    });
    if (!track)
        throw new Error('Track not found');
    if (!(0, exports.canManageTrack)(user, track.artistId)) {
        throw new Error('You can only toggle visibility of your own tracks');
    }
    const newIsActive = !track.isActive;
    const updatedTrack = await db_1.default.track.update({
        where: { id },
        data: { isActive: newIsActive },
        select: prisma_selects_1.trackSelect,
    });
    const io = (0, socket_1.getIO)();
    io.emit('track:visibilityChanged', { trackId: updatedTrack.id, isActive: newIsActive });
    return {
        message: `Track ${updatedTrack.isActive ? 'activated' : 'hidden'} successfully`,
        track: updatedTrack,
    };
};
exports.toggleTrackVisibility = toggleTrackVisibility;
const searchTrack = async (req) => {
    const { q, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const user = req.user;
    if (!q)
        throw new Error('Query is required');
    const searchQuery = String(q).trim();
    if (user) {
        const existingHistory = await db_1.default.history.findFirst({
            where: {
                userId: user.id,
                type: 'SEARCH',
                query: { equals: searchQuery, mode: client_1.Prisma.QueryMode.insensitive },
            },
        });
        if (existingHistory) {
            await db_1.default.history.update({
                where: { id: existingHistory.id },
                data: { updatedAt: new Date() },
            });
        }
        else {
            await db_1.default.history.create({
                data: {
                    type: 'SEARCH',
                    query: searchQuery,
                    userId: user.id,
                },
            });
        }
    }
    const searchConditions = [
        { title: { contains: searchQuery, mode: client_1.Prisma.QueryMode.insensitive } },
        {
            artist: {
                artistName: { contains: searchQuery, mode: client_1.Prisma.QueryMode.insensitive },
            },
        },
        {
            featuredArtists: {
                some: {
                    artistProfile: {
                        artistName: { contains: searchQuery, mode: client_1.Prisma.QueryMode.insensitive },
                    },
                },
            },
        },
    ];
    let whereClause;
    if (user && user.currentProfile === 'ARTIST' && user.artistProfile?.id) {
        whereClause = {
            artistId: user.artistProfile.id,
            OR: searchConditions,
        };
    }
    else {
        whereClause = {
            AND: [
                { isActive: true },
                { artist: { isActive: true } },
                { OR: searchConditions },
            ],
        };
    }
    const [tracks, total] = await Promise.all([
        db_1.default.track.findMany({
            where: whereClause,
            skip: offset,
            take: Number(limit),
            select: prisma_selects_1.trackSelect,
            orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
        }),
        db_1.default.track.count({ where: whereClause }),
    ]);
    return {
        tracks,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
        },
    };
};
exports.searchTrack = searchTrack;
const getTracksByType = async (req, type) => {
    const cacheKey = req.originalUrl;
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = await cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            console.log(`[Redis] Cache hit for key: ${cacheKey}`);
            return JSON.parse(cachedData);
        }
        console.log(`[Redis] Cache miss for key: ${cacheKey}`);
    }
    let { page = 1, limit = 10 } = req.query;
    page = Math.max(1, parseInt(page));
    limit = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (page - 1) * limit;
    if (!Object.values(client_1.AlbumType).includes(type)) {
        throw new Error('Invalid track type');
    }
    const whereClause = { type: type };
    if (!req.user || !req.user.artistProfile?.id) {
        whereClause.isActive = true;
    }
    else {
        whereClause.OR = [
            { isActive: true },
            { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
        ];
    }
    const tracks = await db_1.default.track.findMany({
        where: whereClause,
        select: prisma_selects_1.trackSelect,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Number(limit),
    });
    const totalTracks = await db_1.default.track.count({ where: whereClause });
    const result = {
        tracks,
        pagination: {
            total: totalTracks,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalTracks / Number(limit)),
        },
    };
    await (0, cache_middleware_1.setCache)(cacheKey, result);
    return result;
};
exports.getTracksByType = getTracksByType;
const getAllTracksAdminArtist = async (req) => {
    const user = req.user;
    if (!user)
        throw new Error('Unauthorized');
    if (user.role !== client_1.Role.ADMIN &&
        (!user.artistProfile?.isVerified || user.artistProfile?.role !== 'ARTIST')) {
        throw new Error('Forbidden: Only admins or verified artists can access this resource');
    }
    const { search, status, genres } = req.query;
    const whereClause = {};
    if (user.role !== client_1.Role.ADMIN && user.artistProfile?.id) {
        whereClause.artistId = user.artistProfile.id;
    }
    if (search) {
        whereClause.OR = [
            { title: { contains: String(search), mode: 'insensitive' } },
            {
                artist: {
                    artistName: { contains: String(search), mode: 'insensitive' },
                },
            },
        ];
    }
    if (status) {
        whereClause.isActive = status === 'true';
    }
    if (genres) {
        const genreIds = Array.isArray(genres)
            ? genres.map((g) => String(g))
            : [String(genres)];
        whereClause.genres = {
            some: {
                genreId: { in: genreIds },
            },
        };
    }
    const conditions = [];
    if (search) {
        conditions.push({
            OR: [
                { title: { contains: String(search), mode: 'insensitive' } },
                {
                    artist: {
                        artistName: { contains: String(search), mode: 'insensitive' },
                    },
                },
            ],
        });
    }
    if (status) {
        conditions.push({ isActive: status === 'true' });
    }
    if (genres) {
        const genreIds = Array.isArray(genres) ? genres.map((g) => String(g)) : [String(genres)];
        conditions.push({
            genres: {
                some: {
                    genreId: { in: genreIds },
                },
            },
        });
    }
    if (conditions.length > 0)
        whereClause.AND = conditions;
    let orderBy = { releaseDate: 'desc' };
    const { sortBy, sortOrder } = req.query;
    const validSortFields = ['title', 'duration', 'playCount', 'isActive', 'releaseDate', 'trackNumber'];
    if (sortBy && validSortFields.includes(String(sortBy))) {
        const order = sortOrder === 'asc' ? 'asc' : 'desc';
        orderBy = [{ [String(sortBy)]: order }, { id: 'asc' }];
    }
    const result = await (0, handle_utils_1.paginate)(db_1.default.track, req, {
        where: whereClause,
        select: prisma_selects_1.trackSelect,
        orderBy: orderBy,
    });
    return { tracks: result.data, pagination: result.pagination };
};
exports.getAllTracksAdminArtist = getAllTracksAdminArtist;
const getTrackById = async (req, id) => {
    const user = req.user;
    const track = await db_1.default.track.findUnique({
        where: { id },
        select: prisma_selects_1.trackSelect,
    });
    if (!track)
        throw new Error('Track not found');
    if (user?.role === client_1.Role.ADMIN)
        return track;
    if (!track.isActive) {
        if (user?.artistProfile?.id === track.artistId) {
            if (!user.artistProfile.isVerified || !user.artistProfile.isActive) {
                throw new Error('Your artist profile is not verified or inactive');
            }
            return track;
        }
        throw new Error('You do not have permission to view this track');
    }
    return track;
};
exports.getTrackById = getTrackById;
const getTracksByGenre = async (req, genreId) => {
    const cacheKey = req.originalUrl;
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = await cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            console.log(`[Redis] Cache hit for key: ${cacheKey}`);
            return JSON.parse(cachedData);
        }
        console.log(`[Redis] Cache miss for key: ${cacheKey}`);
    }
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const genre = await db_1.default.genre.findUnique({
        where: { id: genreId },
    });
    if (!genre)
        throw new Error('Genre not found');
    const whereClause = {
        genres: {
            every: {
                genreId: genreId,
            },
        },
    };
    if (!req.user || !req.user.artistProfile?.id) {
        whereClause.isActive = true;
    }
    else {
        whereClause.OR = [
            { isActive: true },
            { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
        ];
    }
    const tracks = await db_1.default.track.findMany({
        where: whereClause,
        select: {
            ...prisma_selects_1.trackSelect,
            genres: {
                where: { genreId: genreId },
                select: {
                    genre: { select: { id: true, name: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Number(limit),
    });
    const totalTracks = await db_1.default.track.count({ where: whereClause });
    const result = {
        tracks,
        pagination: {
            total: totalTracks,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalTracks / Number(limit)),
        },
    };
    await (0, cache_middleware_1.setCache)(cacheKey, result);
    return result;
};
exports.getTracksByGenre = getTracksByGenre;
const getTracksByTypeAndGenre = async (req, type, genreId) => {
    const cacheKey = req.originalUrl;
    if (process.env.USE_REDIS_CACHE === 'true') {
        const cachedData = await cache_middleware_1.client.get(cacheKey);
        if (cachedData) {
            console.log(`[Redis] Cache hit for key: ${cacheKey}`);
            return JSON.parse(cachedData);
        }
        console.log(`[Redis] Cache miss for key: ${cacheKey}`);
    }
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    if (!Object.values(client_1.AlbumType).includes(type)) {
        throw new Error('Invalid track type');
    }
    const genre = await db_1.default.genre.findUnique({
        where: { id: genreId },
    });
    if (!genre)
        throw new Error('Genre not found');
    const whereClause = {
        type: type,
        genres: {
            every: {
                genreId: genreId,
            },
        },
    };
    if (!req.user || !req.user.artistProfile?.id) {
        whereClause.isActive = true;
    }
    else {
        whereClause.OR = [
            { isActive: true },
            { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
        ];
    }
    const tracks = await db_1.default.track.findMany({
        where: whereClause,
        select: {
            ...prisma_selects_1.trackSelect,
            genres: {
                where: { genreId: genreId },
                select: {
                    genre: { select: { id: true, name: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: Number(limit),
    });
    const totalTracks = await db_1.default.track.count({ where: whereClause });
    const result = {
        tracks,
        pagination: {
            total: totalTracks,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(totalTracks / Number(limit)),
        },
    };
    await (0, cache_middleware_1.setCache)(cacheKey, result);
    return result;
};
exports.getTracksByTypeAndGenre = getTracksByTypeAndGenre;
const playTrack = async (req, trackId) => {
    const user = req.user;
    if (!user)
        throw new Error('Unauthorized');
    const track = await db_1.default.track.findFirst({
        where: {
            id: trackId,
            isActive: true,
            OR: [{ album: null }, { album: { isActive: true } }],
        },
        select: prisma_selects_1.trackSelect,
    });
    if (!track)
        throw new Error('Track not found');
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const existingListen = await db_1.default.history.findFirst({
        where: {
            userId: user.id,
            track: { artistId: track.artistId },
            createdAt: { gte: lastMonth },
        },
    });
    if (!existingListen) {
        await db_1.default.artistProfile.update({
            where: { id: track.artistId },
            data: { monthlyListeners: { increment: 1 } },
        });
    }
    const existingHistoryRecord = await db_1.default.history.findFirst({
        where: {
            userId: user.id,
            trackId: track.id,
            type: 'PLAY',
        },
        select: { id: true },
    });
    if (existingHistoryRecord) {
        await db_1.default.history.update({
            where: { id: existingHistoryRecord.id },
            data: {
                playCount: { increment: 1 },
                updatedAt: new Date(),
            },
        });
    }
    else {
        await db_1.default.history.create({
            data: {
                type: 'PLAY',
                trackId: track.id,
                userId: user.id,
                duration: track.duration,
                completed: true,
                playCount: 1,
            },
        });
    }
    await db_1.default.track.update({
        where: { id: track.id },
        data: { playCount: { increment: 1 } },
    });
    return { message: 'Track playback started', track };
};
exports.playTrack = playTrack;
const checkTrackLiked = async (userId, trackId) => {
    const like = await db_1.default.userLikeTrack.findUnique({
        where: {
            userId_trackId: {
                userId,
                trackId,
            },
        },
    });
    return { isLiked: !!like };
};
exports.checkTrackLiked = checkTrackLiked;
//# sourceMappingURL=track.service.js.map