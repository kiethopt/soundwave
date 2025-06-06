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
exports.reanalyzeTrackAudioFeatures = exports.checkTrackLiked = exports.playTrack = exports.getTracksByTypeAndGenre = exports.getTracksByGenre = exports.getTrackById = exports.getAllTracksAdminArtist = exports.getTracksByType = exports.searchTrack = exports.toggleTrackVisibility = exports.deleteTrack = exports.updateTrack = exports.TrackService = exports.getTracks = exports.unlikeTrack = exports.likeTrack = exports.deleteTrackById = exports.canManageTrack = void 0;
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
const mpg123_decoder_1 = require("mpg123-decoder");
const acrcloudService = __importStar(require("./acrcloud.service"));
const crypto = __importStar(require("crypto"));
function normalizeString(str) {
    if (!str)
        return "";
    let result = str.toLowerCase().trim();
    result = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    result = result.replace(/[^a-z0-9]/g, "");
    return result;
}
async function checkCopyrightWithACRCloud(audioBuffer, originalFileName, title) {
    return acrcloudService.recognizeAudioWithACRCloud(audioBuffer, originalFileName, title);
}
function getArtistNameSimilarity(name1, name2) {
    if (!name1 || !name2)
        return 0;
    const normalized1 = normalizeString(name1);
    const normalized2 = normalizeString(name2);
    if (normalized1 === normalized2)
        return 1;
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        return (Math.min(normalized1.length, normalized2.length) /
            Math.max(normalized1.length, normalized2.length));
    }
    if (normalized1.length <= 3 && normalized2.length <= 3) {
        let matches = 0;
        for (const char of normalized1) {
            if (normalized2.includes(char)) {
                matches++;
            }
        }
        if (matches > 0) {
            return 0.8;
        }
    }
    let matches = 0;
    const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
    const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;
    let sequentialMatches = 0;
    let maxSequence = 0;
    for (let i = 0; i < shorter.length; i++) {
        if (longer.includes(shorter.substring(i, i + 2))) {
            sequentialMatches++;
            maxSequence = Math.max(maxSequence, 2);
        }
    }
    for (let i = 0; i < shorter.length; i++) {
        if (longer.includes(shorter[i])) {
            matches++;
        }
    }
    const charSimilarity = matches / longer.length;
    const sequenceSimilarity = sequentialMatches > 0
        ? (sequentialMatches * maxSequence) / (longer.length * 2)
        : 0;
    return Math.max(charSimilarity, sequenceSimilarity);
}
async function convertMp3BufferToPcmF32(audioBuffer) {
    try {
        const decoder = new mpg123_decoder_1.MPEGDecoder();
        await decoder.ready;
        const uint8ArrayBuffer = new Uint8Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.length);
        const decoded = decoder.decode(uint8ArrayBuffer);
        decoder.free();
        if (decoded.errors.length > 0) {
            console.error("MP3 Decoding errors:", decoded.errors);
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
            console.error("MP3 Decoding produced no channel data.");
            return null;
        }
    }
    catch (error) {
        console.error("Error during MP3 decoding or processing:", error);
        return null;
    }
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
        throw new Error("Track not found");
    }
    const io = (0, socket_1.getIO)();
    io.emit("track:deleted", { trackId: id });
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
        throw new Error("Track not found or not active");
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
        throw new Error("Track already liked");
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
            type: "FAVORITE",
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
    io.emit("playlist-updated");
    io.to(`user-${userId}`).emit("favorites-updated", { action: "add", trackId });
    return { message: "Track liked successfully" };
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
        throw new Error("Track not liked");
    }
    const favoritePlaylist = await db_1.default.playlist.findFirst({
        where: {
            userId,
            type: "FAVORITE",
        },
        include: {
            _count: {
                select: {
                    tracks: true,
                },
            },
        },
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
        return { message: "Track unliked successfully" };
    }
    const track = await db_1.default.track.findUnique({
        where: { id: trackId },
        select: { duration: true },
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
                type: "FAVORITE",
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
                id: favoritePlaylist.id,
            },
        });
        io.emit("playlist-updated");
        io.to(`user-${userId}`).emit("favorites-updated", {
            action: "deleted",
            playlistId: favoritePlaylist.id,
        });
        return { message: "Track unliked and empty Favorites playlist removed" };
    }
    io.emit("playlist-updated");
    io.to(`user-${userId}`).emit("favorites-updated", {
        action: "remove",
        trackId,
    });
    return { message: "Track unliked successfully" };
};
exports.unlikeTrack = unlikeTrack;
const getTracks = async (req) => {
    const { search, sortBy, sortOrder } = req.query;
    const user = req.user;
    const whereClause = {};
    if (user && user.role !== client_1.Role.ADMIN && user.artistProfile?.id) {
        whereClause.artistId = user.artistProfile.id;
    }
    if (search && typeof search === "string") {
        whereClause.OR = [
            { title: { contains: search, mode: "insensitive" } },
            { artist: { artistName: { contains: search, mode: "insensitive" } } },
            { album: { title: { contains: search, mode: "insensitive" } } },
            {
                genres: {
                    every: {
                        genre: {
                            name: { contains: search, mode: "insensitive" },
                        },
                    },
                },
            },
            {
                featuredArtists: {
                    some: {
                        artistProfile: {
                            artistName: { contains: search, mode: "insensitive" },
                        },
                    },
                },
            },
        ];
    }
    const orderByClause = {};
    if (sortBy &&
        typeof sortBy === "string" &&
        (sortOrder === "asc" || sortOrder === "desc")) {
        if (sortBy === "title" ||
            sortBy === "duration" ||
            sortBy === "releaseDate" ||
            sortBy === "createdAt" ||
            sortBy === "isActive") {
            orderByClause[sortBy] = sortOrder;
        }
        else if (sortBy === "album") {
            orderByClause.album = { title: sortOrder };
        }
        else if (sortBy === "artist") {
            orderByClause.artist = { artistName: sortOrder };
        }
        else {
            orderByClause.releaseDate = "desc";
        }
    }
    else {
        orderByClause.releaseDate = "desc";
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
    static async createTrack(artistProfileId, data, audioFile, coverFile, requestUser) {
        const { title, releaseDate, type, genreIds, featuredArtistIds = [], featuredArtistNames = [], labelId, localFingerprint, } = data;
        let localFingerprintToSave = localFingerprint;
        if (!localFingerprintToSave && audioFile) {
            const audioBuffer = audioFile.buffer;
            const hash = crypto.createHash('sha256');
            hash.update(audioBuffer);
            localFingerprintToSave = hash.digest('hex');
            console.warn(`[CreateTrack] localFingerprint was not provided, calculated new one: ${localFingerprintToSave}. This might indicate an outdated client or flow.`);
        }
        const existingTrackByTitle = await db_1.default.track.findFirst({
            where: {
                title: {
                    equals: title.trim(),
                    mode: 'insensitive',
                },
                artistId: artistProfileId,
            },
            select: { id: true, title: true },
        });
        if (existingTrackByTitle) {
            const error = new Error(`You already have a track titled "${existingTrackByTitle.title}". Please choose a different title.`);
            error.status = 'duplicate_title_by_same_artist';
            error.track = existingTrackByTitle;
            throw error;
        }
        if (localFingerprintToSave) {
            const existingTrackByFingerprint = await db_1.default.track.findUnique({
                where: { localFingerprint: localFingerprintToSave },
                select: { ...prisma_selects_1.trackSelect, artistId: true },
            });
            if (existingTrackByFingerprint) {
                if (existingTrackByFingerprint.artistId === artistProfileId) {
                    const error = new Error(`This audio content already exists as track "${existingTrackByFingerprint.title}" by you. You cannot upload the same audio file multiple times as a new track.`);
                    error.status = 'duplicate_by_same_artist_fingerprint';
                    error.track = existingTrackByFingerprint;
                    throw error;
                }
                else {
                    const error = new Error(`This song content (local fingerprint) already exists on the system and belongs to artist ${existingTrackByFingerprint.artist?.artistName || 'other'} (Track: ${existingTrackByFingerprint.title}).`);
                    error.isCopyrightConflict = true;
                    error.isLocalFingerprintConflict = true;
                    error.copyrightDetails = {
                        conflictingTrackTitle: existingTrackByFingerprint.title,
                        conflictingArtistName: existingTrackByFingerprint.artist?.artistName || 'Unknown Artist',
                        isLocalFingerprintConflict: true,
                        localFingerprint: localFingerprintToSave,
                    };
                    throw error;
                }
            }
        }
        const mainArtist = await db_1.default.artistProfile.findUnique({
            where: { id: artistProfileId },
            select: {
                id: true,
                labelId: true,
                artistName: true,
                avatar: true,
                isVerified: true,
                createdAt: true,
            },
        });
        if (!mainArtist) {
            throw new Error(`Artist profile with ID ${artistProfileId} not found.`);
        }
        const artistName = mainArtist.artistName;
        const finalLabelId = labelId || mainArtist.labelId;
        const [audioUploadResult, coverUploadResult] = await Promise.all([
            (0, upload_service_1.uploadFile)(audioFile.buffer, "tracks", "auto"),
            coverFile
                ? (0, upload_service_1.uploadFile)(coverFile.buffer, "covers", "image")
                : Promise.resolve(null),
        ]);
        let duration = 0;
        let audioFeatures = {
            tempo: null,
            mood: null,
            key: null,
            scale: null,
            danceability: null,
            energy: null,
            instrumentalness: null,
            acousticness: null,
            valence: null,
            loudness: null,
            speechiness: null,
            genreIds: [],
        };
        try {
            const metadata = await mm.parseBuffer(audioFile.buffer, audioFile.mimetype);
            duration = Math.round(metadata.format.duration || 0);
            audioFeatures = await (0, upload_service_1.analyzeAudioWithReccoBeats)(audioFile.buffer, title, artistName);
        }
        catch (metadataError) {
            console.error("[Metadata ERROR] Error parsing basic audio metadata or calling analyzeAudioWithReccoBeats:", metadataError);
        }
        const allFeaturedArtistIds = new Set();
        if (featuredArtistIds.length > 0) {
            const existingArtists = await db_1.default.artistProfile.findMany({
                where: { id: { in: featuredArtistIds } },
                select: { id: true },
            });
            existingArtists.forEach((artist) => allFeaturedArtistIds.add(artist.id));
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
                    console.error(`Error finding or creating artist profile for "${name}":`, error);
                }
            }
        }
        const trackData = {
            title,
            duration,
            releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
            type: type || client_1.AlbumType.SINGLE,
            audioUrl: audioUploadResult.secure_url,
            coverUrl: coverUploadResult?.secure_url,
            isActive: false,
            artist: { connect: { id: artistProfileId } },
            tempo: audioFeatures.tempo,
            mood: audioFeatures.mood,
            key: audioFeatures.key,
            scale: audioFeatures.scale,
            danceability: audioFeatures.danceability,
            energy: audioFeatures.energy,
            playCount: 0,
            label: finalLabelId ? { connect: { id: finalLabelId } } : undefined,
            localFingerprint: localFingerprintToSave,
        };
        if (genreIds && genreIds.length > 0) {
            trackData.genres = {
                create: genreIds.map((genreId) => ({
                    genre: { connect: { id: genreId } },
                })),
            };
        }
        else {
            console.log(`[CreateTrack] No genres provided by user for track "${title}". Track will be created without genres.`);
        }
        const featuredArtistIdsArray = Array.from(allFeaturedArtistIds);
        if (featuredArtistIdsArray.length > 0) {
            trackData.featuredArtists = {
                create: featuredArtistIdsArray.map((artistId) => ({
                    artistProfile: { connect: { id: artistId } },
                })),
            };
        }
        const newTrack = await db_1.default.track.create({
            data: trackData,
            select: {
                ...prisma_selects_1.trackSelect,
                albumId: true,
            },
        });
        const sendNotifications = async () => {
            const followers = await db_1.default.userFollow.findMany({
                where: {
                    followingArtistId: artistProfileId,
                    followingType: "ARTIST",
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
                        io.to(targetSocketId).emit("notification", {
                            type: client_1.NotificationType.NEW_TRACK,
                            message: `${artistName} just released a new track: ${newTrack.title}`,
                            trackId: newTrack.id,
                            sender: {
                                id: artistProfileId,
                                name: artistName,
                                avatar: mainArtist.avatar,
                            },
                            track: {
                                id: newTrack.id,
                                title: newTrack.title,
                                coverUrl: newTrack.coverUrl,
                            },
                        });
                    }
                    if (user.email) {
                        const emailOptions = emailService.createNewReleaseEmail(user.email, artistName, "track", newTrack.title, releaseLink, newTrack.coverUrl);
                        emailService.sendEmail(emailOptions).catch((emailError) => {
                            console.error(`Failed to send new track email to ${user.email}:`, emailError);
                        });
                    }
                }
            }
        };
        sendNotifications().catch((notificationError) => {
            console.error("Error sending new track notifications:", notificationError);
        });
        return newTrack;
    }
    static async checkTrackCopyrightOnly(artistProfileId, data, audioFile, requestUser) {
        const { title, declaredFeaturedArtistIds = [], declaredFeaturedArtistNames = [], } = data;
        const mainArtist = await db_1.default.artistProfile.findUnique({
            where: { id: artistProfileId },
            select: { id: true, artistName: true, isVerified: true, createdAt: true },
        });
        if (!mainArtist) {
            throw new Error(`Artist profile with ID ${artistProfileId} not found for copyright check.`);
        }
        const artistName = mainArtist.artistName;
        console.log(`[CopyrightCheckOnly] Checking track "${title}" for artist "${artistName}" (ID: ${artistProfileId}) with ACRCloud`);
        console.log(`[CopyrightCheckOnly] Declared featured IDs: ${declaredFeaturedArtistIds.join(", ") || "None"}, Names: ${declaredFeaturedArtistNames.join(", ") || "None"}`);
        const copyrightCheckResult = await checkCopyrightWithACRCloud(audioFile.buffer, audioFile.originalname, title);
        const audioBufferForFingerprint = audioFile.buffer;
        const hash = crypto.createHash('sha256');
        hash.update(audioBufferForFingerprint);
        const calculatedLocalFingerprint = hash.digest('hex');
        const existingTrackWithFingerprint = await db_1.default.track.findUnique({
            where: { localFingerprint: calculatedLocalFingerprint },
            select: { id: true, artistId: true, title: true, artist: { select: { artistName: true } } },
        });
        if (existingTrackWithFingerprint) {
            if (existingTrackWithFingerprint.artistId !== artistProfileId) {
                const error = new Error(`This song content (local fingerprint) already exists on the system and belongs to artist ${existingTrackWithFingerprint.artist?.artistName || 'other'} (Track: ${existingTrackWithFingerprint.title}).`);
                error.isCopyrightConflict = true;
                error.isLocalFingerprintConflict = true;
                error.copyrightDetails = {
                    conflictingTrackTitle: existingTrackWithFingerprint.title,
                    conflictingArtistName: existingTrackWithFingerprint.artist?.artistName || 'Unknown Artist',
                    isLocalFingerprintConflict: true,
                    localFingerprint: calculatedLocalFingerprint,
                };
                throw error;
            }
            console.log(`[CheckCopyrightOnly] Local fingerprint ${calculatedLocalFingerprint} matches an existing track "${existingTrackWithFingerprint.title}" by the same artist. Informing user.`);
            return {
                isSafeToUpload: false,
                message: `You have already uploaded this audio content as track "${existingTrackWithFingerprint.title}".`,
                copyrightDetails: {
                    isDuplicateBySameArtist: true,
                    existingTrackTitle: existingTrackWithFingerprint.title,
                    existingTrackId: existingTrackWithFingerprint.id,
                    localFingerprint: calculatedLocalFingerprint,
                },
            };
        }
        if (copyrightCheckResult.error) {
            console.warn(`[CopyrightCheckOnly] Copyright check with ACRCloud failed for track "${title}". Error: ${copyrightCheckResult.errorMessage} (Code: ${copyrightCheckResult.errorCode})`);
            return {
                isSafeToUpload: false,
                message: copyrightCheckResult.errorMessage ||
                    "Copyright check service failed. Cannot confirm safety.",
                copyrightDetails: {
                    serviceError: true,
                    details: {
                        message: copyrightCheckResult.errorMessage,
                        code: copyrightCheckResult.errorCode,
                    },
                    localFingerprint: calculatedLocalFingerprint,
                },
            };
        }
        if (copyrightCheckResult.isMatched && copyrightCheckResult.match) {
            const match = copyrightCheckResult.match;
            const isAdminUpload = requestUser &&
                requestUser.role === client_1.Role.ADMIN &&
                requestUser.id !== mainArtist.id;
            const matchedArtistNames = match.artists
                ?.map((a) => a.name)
                .filter(Boolean)
                .join(", ") || "Unknown Artist";
            const primaryMatchedArtist = match.artists?.[0]?.name || "Unknown Artist";
            if (!primaryMatchedArtist || primaryMatchedArtist === "Unknown Artist") {
                console.warn(`[CopyrightCheckOnly] ACRCloud matched song "${match.title}" but did not provide a primary artist name for track "${title}".`);
                const error = new Error(`Copyright violation detected. The uploaded audio appears to match "${match.title}" but the original artist couldn't be determined by the check.`);
                error.isCopyrightConflict = true;
                error.copyrightDetails = {
                    ...match,
                    localFingerprint: calculatedLocalFingerprint,
                };
                throw error;
            }
            if (mainArtist.isVerified || isAdminUpload) {
                const uploaderSimilarity = getArtistNameSimilarity(primaryMatchedArtist, artistName);
                const SIMILARITY_THRESHOLD = 0.7;
                console.log(`[CopyrightCheckOnly] Artist name comparison for "${title}": "${primaryMatchedArtist}" (ACRCloud) vs "${artistName}" (uploader: ${mainArtist.id})`);
                console.log(`[CopyrightCheckOnly] Normalized comparison: "${normalizeString(primaryMatchedArtist)}" vs "${normalizeString(artistName)}"`);
                console.log(`[CopyrightCheckOnly] Uploader Similarity score: ${uploaderSimilarity.toFixed(3)} (threshold: ${SIMILARITY_THRESHOLD})`);
                if (uploaderSimilarity >= SIMILARITY_THRESHOLD) {
                    let allowUpload = true;
                    let blockingReason = "";
                    let canonicalArtistDisplay = primaryMatchedArtist;
                    let messageSuffix = ".";
                    const normalizedAcrArtistString = normalizeString(matchedArtistNames);
                    if (declaredFeaturedArtistNames.length > 0 ||
                        declaredFeaturedArtistIds.length > 0) {
                        console.log(`[CopyrightCheckOnly] Has declared featured artists. Analyzing match "${matchedArtistNames}" further.`);
                        if (normalizedAcrArtistString.includes(normalizeString(artistName))) {
                            messageSuffix =
                                ", which appears to be your content or a collaboration you are part of.";
                            let allDeclaredFeaturedFound = declaredFeaturedArtistNames.length > 0;
                            for (const declaredFeatName of declaredFeaturedArtistNames) {
                                if (!normalizedAcrArtistString.includes(normalizeString(declaredFeatName))) {
                                    allDeclaredFeaturedFound = false;
                                    console.log(`[CopyrightCheckOnly] Declared featured artist "${declaredFeatName}" NOT found in ACRCloud match "${matchedArtistNames}".`);
                                    break;
                                }
                            }
                            if (allDeclaredFeaturedFound &&
                                declaredFeaturedArtistNames.length > 0) {
                                console.log(`[CopyrightCheckOnly] All declared featured artists found in ACRCloud match string.`);
                            }
                        }
                        else {
                            console.warn(`[CopyrightCheckOnly] Uploader "${artistName}" not directly in ACRCloud match "${matchedArtistNames}" despite high initial similarity and declared features.`);
                        }
                    }
                    if (mainArtist.isVerified && !isAdminUpload) {
                        console.log(`[CopyrightCheckOnly] Performing canonical check for verified artist ${mainArtist.artistName} (track: "${title}")`);
                        const matchArtistNameLower = primaryMatchedArtist.toLowerCase();
                        const potentiallySimilarArtists = await db_1.default.artistProfile.findMany({
                            where: {
                                id: { not: mainArtist.id },
                                isVerified: true,
                                OR: [
                                    {
                                        artistName: {
                                            equals: primaryMatchedArtist,
                                            mode: "insensitive",
                                        },
                                    },
                                    {
                                        artistName: {
                                            startsWith: matchArtistNameLower.split(" ")[0],
                                            mode: "insensitive",
                                        },
                                    },
                                    {
                                        artistName: {
                                            contains: matchArtistNameLower,
                                            mode: "insensitive",
                                        },
                                    },
                                ],
                            },
                            select: {
                                id: true,
                                artistName: true,
                                createdAt: true,
                                isVerified: true,
                            },
                        });
                        console.log(`[CopyrightCheckOnly] Found ${potentiallySimilarArtists.length} potentially similar verified artists for comparison with "${primaryMatchedArtist}" (track: "${title}").`);
                        let canonicalArtist = mainArtist;
                        let highestSimilarity = uploaderSimilarity;
                        for (const otherArtist of potentiallySimilarArtists) {
                            const otherSimilarity = getArtistNameSimilarity(primaryMatchedArtist, otherArtist.artistName);
                            console.log(`[CopyrightCheckOnly] Comparing with potentially similar artist "${otherArtist.artistName}" (ID: ${otherArtist.id}). Similarity to ACRCloud match: ${otherSimilarity.toFixed(3)}`);
                            if (otherSimilarity > highestSimilarity) {
                                highestSimilarity = otherSimilarity;
                                canonicalArtist = otherArtist;
                            }
                            else if (otherSimilarity === highestSimilarity &&
                                otherSimilarity > 0) {
                                const normAcr = normalizeString(primaryMatchedArtist);
                                const normUploader = normalizeString(canonicalArtist.artistName);
                                const normOther = normalizeString(otherArtist.artistName);
                                if (normOther === normAcr && normUploader !== normAcr) {
                                    canonicalArtist = otherArtist;
                                }
                                else if (normOther === normAcr && normUploader === normAcr) {
                                    if (new Date(otherArtist.createdAt) <
                                        new Date(canonicalArtist.createdAt)) {
                                        canonicalArtist = otherArtist;
                                    }
                                }
                                else if (normOther !== normAcr && normUploader !== normAcr) {
                                    if (new Date(otherArtist.createdAt) <
                                        new Date(canonicalArtist.createdAt)) {
                                        canonicalArtist = otherArtist;
                                    }
                                }
                            }
                        }
                        canonicalArtistDisplay = canonicalArtist.artistName;
                        if (canonicalArtist.id !== mainArtist.id) {
                            allowUpload = false;
                            blockingReason = `Upload blocked. While your artist name is similar, the song appears to more closely match verified artist "${canonicalArtist.artistName}".`;
                            console.warn(`[CopyrightCheckOnly] Potential impersonation upload by "${mainArtist.artistName}" (ID: ${mainArtist.id}). Track "${title}" by "${primaryMatchedArtist}" more closely matches "${canonicalArtist.artistName}" (ID: ${canonicalArtist.id}).`);
                        }
                    }
                    if (allowUpload) {
                        const uploadType = isAdminUpload
                            ? "Admin checking for artist"
                            : mainArtist.isVerified
                                ? "Verified artist checking own content"
                                : "Unverified artist (edge case)";
                        console.log(`[CopyrightCheckOnly] ${uploadType} "${artistName}" - "${title}/${match.title}". Similarity score: ${uploaderSimilarity.toFixed(3)}`);
                        return {
                            isSafeToUpload: true,
                            message: `Copyright check passed. The audio matches "${match.title}" by ${canonicalArtistDisplay}${messageSuffix}`,
                            copyrightDetails: {
                                ...match,
                                localFingerprint: calculatedLocalFingerprint,
                            }
                        };
                    }
                    else {
                        const error = new Error(blockingReason);
                        error.isCopyrightConflict = true;
                        error.copyrightDetails = {
                            ...match,
                            localFingerprint: calculatedLocalFingerprint,
                        };
                        throw error;
                    }
                }
                else {
                    let errorMessage = `Copyright violation detected. The uploaded audio appears to match "${match.title}" by "${matchedArtistNames}".`;
                    errorMessage += ` Your artist name has a similarity score of ${(uploaderSimilarity * 100).toFixed(1)}% with the matched primary artist (${primaryMatchedArtist}). A higher similarity is required.`;
                    if (match.album?.name)
                        errorMessage += ` (Album: ${match.album.name})`;
                    const error = new Error(errorMessage);
                    error.isCopyrightConflict = true;
                    error.copyrightDetails = {
                        ...match,
                        localFingerprint: calculatedLocalFingerprint,
                    };
                    throw error;
                }
            }
            else {
                let errorMessage = `Copyright violation detected. `;
                errorMessage += `The uploaded audio appears to match "${match.title}" by ${matchedArtistNames}.`;
                if (match.album?.name)
                    errorMessage += ` (Album: ${match.album.name})`;
                const error = new Error(errorMessage);
                error.isCopyrightConflict = true;
                error.copyrightDetails = {
                    ...match,
                    localFingerprint: calculatedLocalFingerprint,
                };
                throw error;
            }
        }
        else {
            console.log(`[CopyrightCheckOnly] No copyright match found by ACRCloud for track "${title}" by artist "${artistName}"`);
            return {
                isSafeToUpload: true,
                message: "No copyright match found by detection service.",
                copyrightDetails: {
                    localFingerprint: calculatedLocalFingerprint
                }
            };
        }
    }
}
exports.TrackService = TrackService;
const updateTrack = async (req, id) => {
    const { title, releaseDate, type, trackNumber, albumId, labelId } = req.body;
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
        throw new Error("Track not found");
    if (!(0, exports.canManageTrack)(req.user, currentTrack.artistId)) {
        throw new Error("You can only update your own tracks");
    }
    const updateData = {};
    if (title !== undefined)
        updateData.title = title;
    if (type !== undefined)
        updateData.type = type;
    if (trackNumber !== undefined)
        updateData.trackNumber = Number(trackNumber);
    if (albumId !== undefined) {
        if (albumId === null || albumId === "") {
            updateData.album = { disconnect: true };
        }
        else if (typeof albumId === "string") {
            const albumExists = await db_1.default.album.findUnique({
                where: { id: albumId },
                select: { id: true },
            });
            if (!albumExists)
                throw new Error(`Invalid Album ID: ${albumId} does not exist`);
            updateData.album = { connect: { id: albumId } };
        }
        else {
            throw new Error(`Invalid albumId type: expected string or null, got ${typeof albumId}`);
        }
    }
    if (labelId !== undefined) {
        if (labelId === null || labelId === "") {
            updateData.label = { disconnect: true };
        }
        else if (typeof labelId === "string") {
            const labelExists = await db_1.default.label.findUnique({
                where: { id: labelId },
            });
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
        const coverUpload = await (0, upload_service_1.uploadFile)(coverFile.buffer, "covers", "image");
        updateData.coverUrl = coverUpload.secure_url;
    }
    else if (req.body.removeCover === "true") {
        updateData.coverUrl = null;
    }
    if (releaseDate !== undefined) {
        const newReleaseDate = new Date(releaseDate);
        if (isNaN(newReleaseDate.getTime())) {
            throw new Error("Invalid release date format");
        }
        const now = new Date();
        updateData.isActive = newReleaseDate <= now;
        updateData.releaseDate = newReleaseDate;
    }
    if (req.body.isActive !== undefined) {
        updateData.isActive =
            req.body.isActive === "true" || req.body.isActive === true;
    }
    if (req.body.genres !== undefined) {
        await db_1.default.trackGenre.deleteMany({ where: { trackId: id } });
        const genresInput = req.body.genres;
        const genresArray = !genresInput
            ? []
            : Array.isArray(genresInput)
                ? genresInput.map(String).filter(Boolean)
                : typeof genresInput === "string"
                    ? genresInput
                        .split(",")
                        .map((g) => g.trim())
                        .filter(Boolean)
                    : [];
        if (genresArray.length > 0) {
            const existingGenres = await db_1.default.genre.findMany({
                where: { id: { in: genresArray } },
                select: { id: true },
            });
            const validGenreIds = existingGenres.map((genre) => genre.id);
            const invalidGenreIds = genresArray.filter((id) => !validGenreIds.includes(id));
            if (invalidGenreIds.length > 0) {
                throw new Error(`Invalid genre IDs: ${invalidGenreIds.join(", ")}`);
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
            (albumId === null || albumId === "" ? null : originalAlbumId);
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
        const rawFeaturedArtistIds = req.body.featuredArtistIds;
        const rawFeaturedArtistNames = req.body.featuredArtistNames;
        const parseJsonStringArray = (jsonString) => {
            if (!jsonString)
                return [];
            try {
                const parsed = JSON.parse(jsonString);
                if (Array.isArray(parsed)) {
                    return parsed.filter((item) => typeof item === 'string');
                }
                return [];
            }
            catch (e) {
                console.warn(`[updateTrack] Failed to parse JSON string for featured artists: ${jsonString}`, e);
                return [];
            }
        };
        const intentToUpdateFeaturedArtists = rawFeaturedArtistIds !== undefined || rawFeaturedArtistNames !== undefined;
        if (intentToUpdateFeaturedArtists) {
            await tx.trackArtist.deleteMany({ where: { trackId: id } });
            const featuredArtistIdsFromBody = parseJsonStringArray(rawFeaturedArtistIds);
            const featuredArtistNamesFromBody = parseJsonStringArray(rawFeaturedArtistNames);
            const resolvedFeaturedArtistIds = new Set();
            if (featuredArtistIdsFromBody.length > 0) {
                const existingArtists = await tx.artistProfile.findMany({
                    where: { id: { in: featuredArtistIdsFromBody } },
                    select: { id: true },
                });
                const validArtistIds = new Set(existingArtists.map((a) => a.id));
                featuredArtistIdsFromBody.forEach((artistId) => {
                    if (validArtistIds.has(artistId) &&
                        artistId !== currentTrack.artistId) {
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
            if (featuredArtistNamesFromBody.length > 0) {
                for (const name of featuredArtistNamesFromBody) {
                    if (typeof name === "string" && name.trim() !== "") {
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
    io.emit("track:updated", { track: updatedTrack });
    return { message: "Track updated successfully", track: updatedTrack };
};
exports.updateTrack = updateTrack;
const deleteTrack = async (req, id) => {
    const user = req.user;
    if (!user)
        throw new Error("Unauthorized: User not found");
    const track = await db_1.default.track.findUnique({
        where: { id },
        select: { artistId: true },
    });
    if (!track)
        throw new Error("Track not found");
    if (!(0, exports.canManageTrack)(user, track.artistId)) {
        throw new Error("You can only delete your own tracks");
    }
    await (0, exports.deleteTrackById)(id);
    return { message: "Track deleted successfully" };
};
exports.deleteTrack = deleteTrack;
const toggleTrackVisibility = async (req, id) => {
    const user = req.user;
    if (!user)
        throw new Error("Unauthorized: User not found");
    const track = await db_1.default.track.findUnique({
        where: { id },
        select: { artistId: true, isActive: true },
    });
    if (!track)
        throw new Error("Track not found");
    if (!(0, exports.canManageTrack)(user, track.artistId)) {
        throw new Error("You can only toggle visibility of your own tracks");
    }
    const newIsActive = !track.isActive;
    const updatedTrack = await db_1.default.track.update({
        where: { id },
        data: { isActive: newIsActive },
        select: prisma_selects_1.trackSelect,
    });
    const io = (0, socket_1.getIO)();
    io.emit("track:visibilityChanged", {
        trackId: updatedTrack.id,
        isActive: newIsActive,
    });
    return {
        message: `Track ${updatedTrack.isActive ? "activated" : "hidden"} successfully`,
        track: updatedTrack,
    };
};
exports.toggleTrackVisibility = toggleTrackVisibility;
const searchTrack = async (req) => {
    const { q, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const user = req.user;
    if (!q)
        throw new Error("Query is required");
    const searchQuery = String(q).trim();
    if (user) {
        const existingHistory = await db_1.default.history.findFirst({
            where: {
                userId: user.id,
                type: "SEARCH",
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
                    type: "SEARCH",
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
                artistName: { contains: searchQuery, mode: "insensitive" },
            },
        },
        {
            featuredArtists: {
                some: {
                    artistProfile: {
                        artistName: { contains: searchQuery, mode: "insensitive" },
                    },
                },
            },
        },
    ];
    let whereClause;
    if (user && user.currentProfile === "ARTIST" && user.artistProfile?.id) {
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
            orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
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
    if (process.env.USE_REDIS_CACHE === "true") {
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
        throw new Error("Invalid track type");
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
        orderBy: { createdAt: "desc" },
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
        throw new Error("Unauthorized");
    if (user.role !== client_1.Role.ADMIN &&
        (!user.artistProfile?.isVerified || user.artistProfile?.role !== "ARTIST")) {
        throw new Error("Forbidden: Only admins or verified artists can access this resource");
    }
    const { search, status, genres } = req.query;
    const whereClause = {};
    if (user.role !== client_1.Role.ADMIN && user.artistProfile?.id) {
        whereClause.artistId = user.artistProfile.id;
    }
    if (search) {
        whereClause.OR = [
            { title: { contains: String(search), mode: "insensitive" } },
            {
                artist: {
                    artistName: { contains: String(search), mode: "insensitive" },
                },
            },
        ];
    }
    if (status) {
        whereClause.isActive = status === "true";
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
                { title: { contains: String(search), mode: "insensitive" } },
                {
                    artist: {
                        artistName: { contains: String(search), mode: "insensitive" },
                    },
                },
            ],
        });
    }
    if (status) {
        conditions.push({ isActive: status === "true" });
    }
    if (genres) {
        const genreIds = Array.isArray(genres)
            ? genres.map((g) => String(g))
            : [String(genres)];
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
    let orderBy = { releaseDate: "desc" };
    const { sortBy, sortOrder } = req.query;
    const validSortFields = [
        "title",
        "duration",
        "playCount",
        "isActive",
        "releaseDate",
        "trackNumber",
    ];
    if (sortBy && validSortFields.includes(String(sortBy))) {
        const order = sortOrder === "asc" ? "asc" : "desc";
        orderBy = [{ [String(sortBy)]: order }, { id: "asc" }];
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
        throw new Error("Track not found");
    if (user?.role === client_1.Role.ADMIN)
        return track;
    if (!track.isActive) {
        if (user?.artistProfile?.id === track.artistId) {
            if (!user.artistProfile.isVerified || !user.artistProfile.isActive) {
                throw new Error("Your artist profile is not verified or inactive");
            }
            return track;
        }
        throw new Error("You do not have permission to view this track");
    }
    return track;
};
exports.getTrackById = getTrackById;
const getTracksByGenre = async (req, genreId) => {
    const cacheKey = req.originalUrl;
    if (process.env.USE_REDIS_CACHE === "true") {
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
        throw new Error("Genre not found");
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
        orderBy: { createdAt: "desc" },
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
    if (process.env.USE_REDIS_CACHE === "true") {
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
        throw new Error("Invalid track type");
    }
    const genre = await db_1.default.genre.findUnique({
        where: { id: genreId },
    });
    if (!genre)
        throw new Error("Genre not found");
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
        orderBy: { createdAt: "desc" },
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
        throw new Error("Unauthorized");
    const trackData = await db_1.default.track.findFirst({
        where: {
            id: trackId,
            isActive: true,
            OR: [{ album: null }, { album: { isActive: true } }],
        },
        select: prisma_selects_1.trackSelect,
    });
    if (!trackData) {
        throw new Error("Track not found");
    }
    const track = trackData;
    if (!track.genres || track.genres.length === 0) {
        console.log(`[TrackService] Track ${track.id} is missing genres. Triggering re-analysis.`);
        try {
            await (0, exports.reanalyzeTrackAudioFeatures)(track.id);
            console.log(`[TrackService] Successfully re-analyzed genres for track ${track.id}.`);
        }
        catch (reanalyzeError) {
            console.error(`[TrackService] Error re-analyzing genres for track ${track.id}:`, reanalyzeError);
        }
    }
    if (!track.artistId) {
        console.error(`[TrackService] Critical: Track ${track.id} is missing artistId after initial fetch.`);
        throw new Error("Track is missing artistId");
    }
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const existingListenForArtistThisMonth = await db_1.default.history.findFirst({
        where: {
            userId: user.id,
            track: { artistId: track.artistId },
            createdAt: { gte: oneMonthAgo },
            type: "PLAY",
        },
        select: { id: true },
    });
    if (!existingListenForArtistThisMonth) {
        await db_1.default.artistProfile.update({
            where: { id: track.artistId },
            data: { monthlyListeners: { increment: 1 } },
        });
        console.log(`[TrackService] Incremented monthlyListeners for artist ${track.artistId} by user ${user.id}`);
    }
    await db_1.default.track.update({
        where: { id: track.id },
        data: { playCount: { increment: 1 } },
    });
    const now = new Date();
    const formattedTimestamp = now.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour12: false,
    });
    console.log(`[TrackService] Creating NEW History record for user ${user.id}, track ${track.id} at ${formattedTimestamp}`);
    await db_1.default.history.create({
        data: {
            type: "PLAY",
            trackId: track.id,
            userId: user.id,
            duration: track.duration ?? null,
            completed: true,
            playCount: 1,
        },
    });
    return { message: "Play count updated and history recorded", track };
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
async function downloadAudioBuffer(url) {
    const https = await Promise.resolve().then(() => __importStar(require("https")));
    return new Promise((resolve, reject) => {
        https
            .get(url, (response) => {
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download audio: Status Code ${response.statusCode}`));
            }
            const data = [];
            response.on("data", (chunk) => {
                data.push(chunk);
            });
            response.on("end", () => {
                resolve(Buffer.concat(data));
            });
        })
            .on("error", (err) => {
            reject(new Error(`Failed to download audio: ${err.message}`));
        });
    });
}
const reanalyzeTrackAudioFeatures = async (trackId) => {
    const track = await db_1.default.track.findUnique({
        where: { id: trackId },
        include: {
            artist: {
                select: {
                    id: true,
                    artistName: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            album: true,
        },
    });
    if (!track) {
        throw new Error("Track not found");
    }
    if (!track.artist) {
        throw new Error("Track artist information is missing");
    }
    const audioBuffer = await downloadAudioBuffer(track.audioUrl);
    const audioAnalysis = await (0, upload_service_1.analyzeAudioWithReccoBeats)(audioBuffer, track.title, track.artist.artistName);
    return db_1.default.$transaction(async (tx) => {
        await tx.trackGenre.deleteMany({
            where: { trackId: trackId },
        });
        const dataToUpdate = {
            tempo: audioAnalysis.tempo,
            mood: audioAnalysis.mood,
            key: audioAnalysis.key,
            scale: audioAnalysis.scale,
            danceability: audioAnalysis.danceability,
            energy: audioAnalysis.energy,
        };
        const newGenreIds = audioAnalysis.genreIds;
        if (newGenreIds && newGenreIds.length > 0) {
            dataToUpdate.genres = {
                create: newGenreIds.map((genreId) => ({
                    genre: { connect: { id: genreId } },
                })),
            };
        }
        else {
            const defaultGenre = await db_1.default.genre.findFirst({ where: { name: "Pop" } }) || await db_1.default.genre.findFirst();
            if (defaultGenre) {
                dataToUpdate.genres = {
                    create: [{ genre: { connect: { id: defaultGenre.id } } }],
                };
            }
        }
        const updatedTrack = await tx.track.update({
            where: { id: trackId },
            data: dataToUpdate,
            select: {
                id: true,
                title: true,
                duration: true,
                releaseDate: true,
                audioUrl: true,
                coverUrl: true,
                type: true,
                isActive: true,
                playCount: true,
                createdAt: true,
                updatedAt: true,
                trackNumber: true,
                tempo: true,
                mood: true,
                key: true,
                scale: true,
                danceability: true,
                energy: true,
                artist: {
                    select: {
                        id: true,
                        artistName: true,
                    },
                },
                album: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                genres: {
                    select: {
                        genre: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                featuredArtists: {
                    select: {
                        artistProfile: { select: { id: true, artistName: true } },
                    },
                },
                label: { select: { id: true, name: true } },
            },
        });
        if (!updatedTrack) {
            throw new Error("Failed to update or retrieve track after re-analysis in transaction.");
        }
        return updatedTrack;
    });
};
exports.reanalyzeTrackAudioFeatures = reanalyzeTrackAudioFeatures;
//# sourceMappingURL=track.service.js.map