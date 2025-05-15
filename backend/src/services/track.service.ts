import prisma from "../config/db";
import {
  Prisma,
  Role,
  AlbumType,
  NotificationType,
  RecipientType,
  Track,
} from "@prisma/client";
import { Request } from "express";
import { uploadFile, analyzeAudioWithReccoBeats, AudioAnalysisResult as UploadServiceAudioAnalysisResult } from "./upload.service";
import { paginate } from "../utils/handle-utils";
import * as emailService from "./email.service";
import { client, setCache } from "../middleware/cache.middleware";
import { trackSelect } from "../utils/prisma-selects";
import { getIO, getUserSockets } from "../config/socket";
import { getOrCreateArtistProfile } from "./artist.service";
import * as mm from "music-metadata";
import { Essentia, EssentiaWASM } from "essentia.js";
import { MPEGDecoder, MPEGDecodedAudio } from "mpg123-decoder";
// import { Audd } from 'audd.io'; // Comment out or remove Audd
import * as acrcloudService from "./acrcloud.service"; // Import the new ACRCloud service
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import * as crypto from 'crypto'; // <<< Import crypto

// Comment out or remove AudD specific initialization
// const auddApiKey = process.env.AUDD_API_KEY;
// let auddInstance: Audd | null = null;

// if (auddApiKey) {
//   auddInstance = new Audd(auddApiKey);
// } else {
//   console.warn('AUDD_API_KEY not found in .env. Copyright check will be skipped.');
// }

function normalizeString(str: string): string {
  if (!str) return "";

  // Convert to lowercase
  let result = str.toLowerCase().trim();

  // Remove diacritics (accents)
  result = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Remove special characters (keep only alphanumeric)
  result = result.replace(/[^a-z0-9]/g, "");

  return result;
}

// Helper function to check copyright using AudD
async function checkCopyrightWithACRCloud( // Renamed and modified for ACRCloud
  audioBuffer: Buffer,
  originalFileName?: string,
  title?: string
): Promise<{
  isMatched: boolean;
  match?: acrcloudService.ACRCloudMusicEntry;
  error?: boolean;
  errorMessage?: string;
  errorCode?: number;
}> {
  // Using the new ACRCloud service directly
  return acrcloudService.recognizeAudioWithACRCloud(
    audioBuffer,
    originalFileName,
    title
  );
}

// Helper function to compare artist names for similarity
// A more robust implementation that handles diacritics, case, and special characters
function getArtistNameSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;

  const normalized1 = normalizeString(name1);
  const normalized2 = normalizeString(name2);

  // Exact match after normalization
  if (normalized1 === normalized2) return 1;

  // Check for containment after normalization
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return (
      Math.min(normalized1.length, normalized2.length) /
      Math.max(normalized1.length, normalized2.length)
    );
  }

  if (normalized1.length <= 3 && normalized2.length <= 3) {
    // Count shared characters
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

  // More sophisticated similarity algorithm for longer names
  let matches = 0;
  const longer =
    normalized1.length > normalized2.length ? normalized1 : normalized2;
  const shorter =
    normalized1.length > normalized2.length ? normalized2 : normalized1;

  // Check for sequential matches
  let sequentialMatches = 0;
  let maxSequence = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter.substring(i, i + 2))) {
      sequentialMatches++;
      maxSequence = Math.max(maxSequence, 2);
    }
  }

  // Check for individual character matches
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++;
    }
  }

  // Calculate final similarity based on matches and sequential matches
  const charSimilarity = matches / longer.length;
  const sequenceSimilarity =
    sequentialMatches > 0
      ? (sequentialMatches * maxSequence) / (longer.length * 2)
      : 0;

  return Math.max(charSimilarity, sequenceSimilarity);
}

// Helper function to convert MP3 buffer to Float32Array PCM data
async function convertMp3BufferToPcmF32(
  audioBuffer: Buffer
): Promise<Float32Array | null> {
  try {
    const decoder = new MPEGDecoder();
    await decoder.ready;

    const uint8ArrayBuffer = new Uint8Array(
      audioBuffer.buffer,
      audioBuffer.byteOffset,
      audioBuffer.length
    );
    const decoded: MPEGDecodedAudio = decoder.decode(uint8ArrayBuffer);

    decoder.free(); // Release resources

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
    } else if (decoded.channelData.length === 1) {
      return decoded.channelData[0];
    } else {
      console.error("MP3 Decoding produced no channel data.");
      return null;
    }
  } catch (error) {
    console.error("Error during MP3 decoding or processing:", error);
    return null;
  }
}

// Hàm kiểm tra quyền
export const canManageTrack = (user: any, trackArtistId: string): boolean => {
  if (!user) return false;
  if (user.role === Role.ADMIN) return true;
  return (
    user.artistProfile?.isVerified &&
    user.artistProfile?.isActive &&
    user.artistProfile?.role === Role.ARTIST &&
    user.artistProfile?.id === trackArtistId
  );
};

// Xóa track
export const deleteTrackById = async (id: string) => {
  const track = await prisma.track.findUnique({
    where: { id },
    select: { id: true, albumId: true },
  });

  if (!track) {
    throw new Error("Track not found");
  }

  // Emit WebSocket event before deletion
  const io = getIO();
  io.emit("track:deleted", { trackId: id });

  return prisma.$transaction(async (tx) => {
    // Delete the track itself
    await tx.track.delete({
      where: { id },
    });

    // If the track belonged to an album, decrement the album's track count
    if (track.albumId) {
      await tx.album.update({
        where: { id: track.albumId },
        data: { totalTracks: { decrement: 1 } },
      });
    }
  });
};

// Like a track
export const likeTrack = async (userId: string, trackId: string) => {
  const track = await prisma.track.findFirst({
    where: {
      id: trackId,
      isActive: true,
    },
  });

  if (!track) {
    throw new Error("Track not found or not active");
  }

  const existingLike = await prisma.userLikeTrack.findUnique({
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

  await prisma.userLikeTrack.create({
    data: {
      userId,
      trackId,
    },
  });

  // Check if the Favorites playlist exists for this user
  let favoritePlaylist = await prisma.playlist.findFirst({
    where: {
      userId,
      type: "FAVORITE",
    },
  });

  // If Favorites playlist doesn't exist, create it
  if (!favoritePlaylist) {
    favoritePlaylist = await prisma.playlist.create({
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

  // Add track to the Favorites playlist
  const tracksCount = await prisma.playlistTrack.count({
    where: {
      playlistId: favoritePlaylist.id,
    },
  });

  await prisma.playlistTrack.create({
    data: {
      playlistId: favoritePlaylist.id,
      trackId,
      trackOrder: tracksCount + 1,
    },
  });

  // Update favorite playlist's totalTracks and totalDuration
  await prisma.playlist.update({
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

  // Emit WebSocket event to notify clients that the Favorites playlist was updated
  const io = getIO();
  io.emit("playlist-updated");
  // Also emit a personalized event for this user
  io.to(`user-${userId}`).emit("favorites-updated", { action: "add", trackId });

  return { message: "Track liked successfully" };
};

// Unlike a track
export const unlikeTrack = async (userId: string, trackId: string) => {
  const existingLike = await prisma.userLikeTrack.findUnique({
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

  // First, find the Favorites playlist
  const favoritePlaylist = await prisma.playlist.findFirst({
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
    // Just delete the like if there's no Favorites playlist
    await prisma.userLikeTrack.delete({
      where: {
        userId_trackId: {
          userId,
          trackId,
        },
      },
    });

    return { message: "Track unliked successfully" };
  }

  // Get track duration before deleting
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { duration: true },
  });

  // Delete the like
  await prisma.userLikeTrack.delete({
    where: {
      userId_trackId: {
        userId,
        trackId,
      },
    },
  });

  // Remove track from the Favorites playlist
  await prisma.playlistTrack.deleteMany({
    where: {
      playlist: {
        userId,
        type: "FAVORITE",
      },
      trackId,
    },
  });

  // Update favorite playlist's totalTracks and totalDuration
  await prisma.playlist.update({
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

  // Get the IO instance for WebSocket communication
  const io = getIO();

  if (favoritePlaylist._count.tracks === 1) {
    // Delete the entire Favorites playlist since it's now empty
    await prisma.playlist.delete({
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

// Lấy tất cả tracks
export const getTracks = async (req: Request) => {
  const { search, sortBy, sortOrder } = req.query;
  const user = req.user;

  const whereClause: Prisma.TrackWhereInput = {};

  if (user && user.role !== Role.ADMIN && user.artistProfile?.id) {
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

  const orderByClause: Prisma.TrackOrderByWithRelationInput = {};
  if (
    sortBy &&
    typeof sortBy === "string" &&
    (sortOrder === "asc" || sortOrder === "desc")
  ) {
    if (
      sortBy === "title" ||
      sortBy === "duration" ||
      sortBy === "releaseDate" ||
      sortBy === "createdAt" ||
      sortBy === "isActive"
    ) {
      orderByClause[sortBy] = sortOrder;
    } else if (sortBy === "album") {
      orderByClause.album = { title: sortOrder };
    } else if (sortBy === "artist") {
      orderByClause.artist = { artistName: sortOrder };
    } else {
      orderByClause.releaseDate = "desc";
    }
  } else {
    orderByClause.releaseDate = "desc";
  }

  const result = await paginate<any>(prisma.track, req, {
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

  const formattedTracks = result.data.map((track: any) => ({
    ...track,
    genres: track.genres,
    featuredArtists: track.featuredArtists,
  }));

  return {
    data: formattedTracks,
    pagination: result.pagination,
  };
};

interface CreateTrackData {
  title: string;
  releaseDate: string;
  type: "SINGLE";
  genreIds?: string[];
  featuredArtistIds?: string[];
  featuredArtistNames?: string[];
  labelId?: string;
  localFingerprint?: string;
}

// --- START: Refactored Audio Analysis Helper ---
// Remove or comment out the local analyzeAudioFeatures and its interface if no longer needed elsewhere
/*
interface AudioAnalysisResult {
  tempo: number | null;
  mood: string | null;
  key: string | null;
  scale: string | null;
  danceability: number | null;
  energy: number | null;
}

async function analyzeAudioFeatures(
  audioBuffer: Buffer
): Promise<AudioAnalysisResult> {
  // ... implementation of the old analyzeAudioFeatures ...
}
*/
// --- END: Refactored Audio Analysis Helper ---

export class TrackService {
  static async createTrack(
    artistProfileId: string,
    data: CreateTrackData,
    audioFile: Express.Multer.File,
    coverFile?: Express.Multer.File,
    requestUser?: any
  ): Promise<Track | { status: string; message: string; track: any }> {
    const {
      title,
      releaseDate,
      type,
      genreIds,
      featuredArtistIds = [],
      featuredArtistNames = [],
      labelId,
      localFingerprint, // <<< Expect localFingerprint from data
    } = data;

    let localFingerprintToSave = localFingerprint;
    if (!localFingerprintToSave && audioFile) { // Only calculate if not provided AND audioFile exists (for safety/legacy)
        const audioBuffer = audioFile.buffer;
        const hash = crypto.createHash('sha256');
        hash.update(audioBuffer);
        localFingerprintToSave = hash.digest('hex');
        console.warn(`[CreateTrack] localFingerprint was not provided, calculated new one: ${localFingerprintToSave}. This might indicate an outdated client or flow.`);
    }

    // <<< Check for existing track by title AND same artist BEFORE creating >>>
    const existingTrackByTitle = await prisma.track.findFirst({
      where: {
        title: {
          equals: title.trim(),
          mode: 'insensitive', // Case-insensitive comparison
        },
        artistId: artistProfileId,
      },
      select: { id: true, title: true },
    });

    if (existingTrackByTitle) {
      const error: any = new Error(
        `You already have a track titled "${existingTrackByTitle.title}". Please choose a different title.`
      );
      error.status = 'duplicate_title_by_same_artist';
      error.track = existingTrackByTitle;
      throw error;
    }
    // <<< End of title check >>>

    // <<< Check for existing track by fingerprint AND same artist BEFORE creating >>>
    if (localFingerprintToSave) {
      const existingTrackByFingerprint = await prisma.track.findUnique({
        where: { localFingerprint: localFingerprintToSave },
        select: { ...trackSelect, artistId: true }, // Ensure artistId is selected
      });

      if (existingTrackByFingerprint) {
        if (existingTrackByFingerprint.artistId === artistProfileId) {
          // Track with same fingerprint by the same artist already exists
          const error: any = new Error(
            `This audio content already exists as track "${existingTrackByFingerprint.title}" by you. You cannot upload the same audio file multiple times as a new track.`
          );
          error.status = 'duplicate_by_same_artist_fingerprint';
          error.track = existingTrackByFingerprint; // Keep existing track info for context if needed
          throw error;
        } else {
          const error: any = new Error(
            `This song content (local fingerprint) already exists on the system and belongs to artist ${existingTrackByFingerprint.artist?.artistName || 'other'} (Track: ${existingTrackByFingerprint.title}).`
          );
          error.isCopyrightConflict = true;
          error.isLocalFingerprintConflict = true;
          error.copyrightDetails = {
            conflictingTrackTitle: existingTrackByFingerprint.title,
            conflictingArtistName: existingTrackByFingerprint.artist?.artistName || 'Unknown Artist',
            isLocalFingerprintConflict: true,
            localFingerprint: localFingerprintToSave,
          };
          throw error; // This will be caught by the route handler
        }
      }
    }
    // <<< End of pre-check >>>

    const mainArtist = await prisma.artistProfile.findUnique({
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
      uploadFile(audioFile.buffer, "tracks", "auto"),
      coverFile
        ? uploadFile(coverFile.buffer, "covers", "image")
        : Promise.resolve(null),
    ]);

    let duration = 0;
    let audioFeatures: UploadServiceAudioAnalysisResult = {
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
      const metadata = await mm.parseBuffer(
        audioFile.buffer,
        audioFile.mimetype
      );
      duration = Math.round(metadata.format.duration || 0);
      
      audioFeatures = await analyzeAudioWithReccoBeats(
        audioFile.buffer,
        title,
        artistName
      );

    } catch (metadataError) {
      console.error(
        "[Metadata ERROR] Error parsing basic audio metadata or calling analyzeAudioWithReccoBeats:",
        metadataError
      );
      // Keep default audioFeatures if analysis fails
    }

    const allFeaturedArtistIds = new Set<string>();
    if (featuredArtistIds.length > 0) {
      const existingArtists = await prisma.artistProfile.findMany({
        where: { id: { in: featuredArtistIds } },
        select: { id: true },
      });
      existingArtists.forEach((artist) => allFeaturedArtistIds.add(artist.id));
    }
    if (featuredArtistNames.length > 0) {
      for (const name of featuredArtistNames) {
        try {
          const profile = await getOrCreateArtistProfile(name);
          if (profile.id !== artistProfileId) {
            allFeaturedArtistIds.add(profile.id);
          }
        } catch (error) {
          console.error(
            `Error finding or creating artist profile for "${name}":`,
            error
          );
        }
      }
    }

    const trackData: Prisma.TrackCreateInput = {
      title,
      duration,
      releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
      type: type || AlbumType.SINGLE,
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

    // Use user-provided genreIds if available, otherwise, no genres initially.
    if (genreIds && genreIds.length > 0) {
      trackData.genres = {
        create: genreIds.map((genreId: string) => ({
          genre: { connect: { id: genreId } },
        })),
      };
    } else {
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

    const newTrack = await prisma.track.create({
      data: trackData,
      select: {
        ...trackSelect,
        albumId: true,
      },
    });

    const sendNotifications = async () => {
      const followers = await prisma.userFollow.findMany({
        where: {
          followingArtistId: artistProfileId,
          followingType: "ARTIST",
        },
        select: { followerId: true },
      });

      const followerIds = followers.map((f) => f.followerId);
      if (followerIds.length > 0) {
        const followerUsers = await prisma.user.findMany({
          where: { id: { in: followerIds }, isActive: true },
          select: { id: true, email: true },
        });

        const notificationsData: Prisma.NotificationCreateManyInput[] =
          followerUsers.map((follower) => ({
            type: NotificationType.NEW_TRACK,
            message: `${artistName} just released a new track: ${title}`,
            recipientType: RecipientType.USER,
            userId: follower.id,
            artistId: artistProfileId,
            senderId: artistProfileId,
            trackId: newTrack.id,
          }));

        if (notificationsData.length > 0) {
          await prisma.notification.createMany({ data: notificationsData });
        }

        const releaseLink = `${process.env.NEXT_PUBLIC_FRONTEND_URL}/track/${newTrack.id}`;
        const io = getIO();
        const userSocketsMap = getUserSockets();

        for (const user of followerUsers) {
          const targetSocketId = userSocketsMap.get(user.id);
          if (targetSocketId) {
            io.to(targetSocketId).emit("notification", {
              type: NotificationType.NEW_TRACK,
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
            const emailOptions = emailService.createNewReleaseEmail(
              user.email,
              artistName,
              "track",
              newTrack.title,
              releaseLink,
              newTrack.coverUrl
            );
            emailService.sendEmail(emailOptions).catch((emailError) => {
              console.error(
                `Failed to send new track email to ${user.email}:`,
                emailError
              );
            });
          }
        }
      }
    };

    sendNotifications().catch((notificationError) => {
      console.error(
        "Error sending new track notifications:",
        notificationError
      );
    });

    return newTrack;
  }

  static async checkTrackCopyrightOnly(
    artistProfileId: string,
    data: {
      title: string;
      releaseDate: string;
      declaredFeaturedArtistIds?: string[];
      declaredFeaturedArtistNames?: string[];
    },
    audioFile: Express.Multer.File,
    requestUser?: any
  ): Promise<{
    isSafeToUpload: boolean;
    message: string;
    copyrightDetails?: any;
  }> {
    const {
      title,
      declaredFeaturedArtistIds = [],
      declaredFeaturedArtistNames = [],
    } = data;

    const mainArtist = await prisma.artistProfile.findUnique({
      where: { id: artistProfileId },
      select: { id: true, artistName: true, isVerified: true, createdAt: true },
    });

    if (!mainArtist) {
      throw new Error(
        `Artist profile with ID ${artistProfileId} not found for copyright check.`
      );
    }
    const artistName = mainArtist.artistName;

    console.log(
      `[CopyrightCheckOnly] Checking track "${title}" for artist "${artistName}" (ID: ${artistProfileId}) with ACRCloud`
    );
    console.log(
      `[CopyrightCheckOnly] Declared featured IDs: ${
        declaredFeaturedArtistIds.join(", ") || "None"
      }, Names: ${declaredFeaturedArtistNames.join(", ") || "None"}`
    );

    // Call the new ACRCloud check function
    const copyrightCheckResult = await checkCopyrightWithACRCloud(
      audioFile.buffer,
      audioFile.originalname,
      title
    );

    // <<< Check dấu vân tay cục bộ >>>
    const audioBufferForFingerprint = audioFile.buffer;
      const hash = crypto.createHash('sha256');
    hash.update(audioBufferForFingerprint);
    const calculatedLocalFingerprint = hash.digest('hex');

    const existingTrackWithFingerprint = await prisma.track.findUnique({
      where: { localFingerprint: calculatedLocalFingerprint },
      select: { id: true, artistId: true, title: true, artist: { select: { artistName: true } } },
    });

    if (existingTrackWithFingerprint) {
      if (existingTrackWithFingerprint.artistId !== artistProfileId) {
        const error: any = new Error(
          `This song content (local fingerprint) already exists on the system and belongs to artist ${existingTrackWithFingerprint.artist?.artistName || 'other'} (Track: ${existingTrackWithFingerprint.title}).`
        );
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
      // <<< If fingerprint matches a track by THE SAME artist >>>
      console.log(`[CheckCopyrightOnly] Local fingerprint ${calculatedLocalFingerprint} matches an existing track "${existingTrackWithFingerprint.title}" by the same artist. Informing user.`);
      return {
        isSafeToUpload: false, // Or true with a strong warning, depending on desired UX flow
        message: `You have already uploaded this audio content as track "${existingTrackWithFingerprint.title}".`, 
        copyrightDetails: {
          isDuplicateBySameArtist: true,
          existingTrackTitle: existingTrackWithFingerprint.title,
          existingTrackId: existingTrackWithFingerprint.id,
          localFingerprint: calculatedLocalFingerprint,
          // No ACRCloud match details are relevant here if it's a self-duplicate
        },
      };
    }

    if (copyrightCheckResult.error) {
      console.warn(
        `[CopyrightCheckOnly] Copyright check with ACRCloud failed for track "${title}". Error: ${copyrightCheckResult.errorMessage} (Code: ${copyrightCheckResult.errorCode})`
      );
      return {
        isSafeToUpload: false, 
        message:
          copyrightCheckResult.errorMessage ||
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

      const isAdminUpload =
        requestUser &&
        requestUser.role === Role.ADMIN &&
        requestUser.id !== mainArtist.id;
      const matchedArtistNames =
        match.artists
          ?.map((a) => a.name)
          .filter(Boolean)
          .join(", ") || "Unknown Artist";
      const primaryMatchedArtist = match.artists?.[0]?.name || "Unknown Artist"; // Take the first artist as primary for comparison

      if (!primaryMatchedArtist || primaryMatchedArtist === "Unknown Artist") {
        console.warn(
          `[CopyrightCheckOnly] ACRCloud matched song "${match.title}" but did not provide a primary artist name for track "${title}".`
        );
        const error: any = new Error(
          `Copyright violation detected. The uploaded audio appears to match "${match.title}" but the original artist couldn't be determined by the check.`
        );
        error.isCopyrightConflict = true;
        error.copyrightDetails = {
          ...match,
          localFingerprint: calculatedLocalFingerprint,
        };
        throw error;
      }

      // --- Optimized Artist Comparison Logic ---
      if (mainArtist.isVerified || isAdminUpload) {
        // Compare uploader's name with the primary matched artist from ACRCloud
        const uploaderSimilarity = getArtistNameSimilarity(
          primaryMatchedArtist,
          artistName
        );
        const SIMILARITY_THRESHOLD = 0.7;

        console.log(
          `[CopyrightCheckOnly] Artist name comparison for "${title}": "${primaryMatchedArtist}" (ACRCloud) vs "${artistName}" (uploader: ${mainArtist.id})`
        );
        console.log(
          `[CopyrightCheckOnly] Normalized comparison: "${normalizeString(
            primaryMatchedArtist
          )}" vs "${normalizeString(artistName)}"`
        );
        console.log(
          `[CopyrightCheckOnly] Uploader Similarity score: ${uploaderSimilarity.toFixed(
            3
          )} (threshold: ${SIMILARITY_THRESHOLD})`
        );

        if (uploaderSimilarity >= SIMILARITY_THRESHOLD) {
          let allowUpload = true;
          let blockingReason = "";
          let canonicalArtistDisplay = primaryMatchedArtist;
          let messageSuffix = ".";

          // --- New Logic for Featuring Artists (using matchedArtistNames for context) ---
          const normalizedAcrArtistString = normalizeString(matchedArtistNames); // Use the full string of matched artists for context
          if (
            declaredFeaturedArtistNames.length > 0 ||
            declaredFeaturedArtistIds.length > 0
          ) {
            console.log(
              `[CopyrightCheckOnly] Has declared featured artists. Analyzing match "${matchedArtistNames}" further.`
            );

            // Check if the main uploader's name is part of the ACRCloud artist string
            if (
              normalizedAcrArtistString.includes(normalizeString(artistName))
            ) {
              messageSuffix =
                ", which appears to be your content or a collaboration you are part of.";
              let allDeclaredFeaturedFound =
                declaredFeaturedArtistNames.length > 0;
              for (const declaredFeatName of declaredFeaturedArtistNames) {
                if (
                  !normalizedAcrArtistString.includes(
                    normalizeString(declaredFeatName)
                  )
                ) {
                  allDeclaredFeaturedFound = false;
                  console.log(
                    `[CopyrightCheckOnly] Declared featured artist "${declaredFeatName}" NOT found in ACRCloud match "${matchedArtistNames}".`
                  );
                  break;
                }
              }
              if (
                allDeclaredFeaturedFound &&
                declaredFeaturedArtistNames.length > 0
              ) {
                console.log(
                  `[CopyrightCheckOnly] All declared featured artists found in ACRCloud match string.`
                );
              }
            } else {
              console.warn(
                `[CopyrightCheckOnly] Uploader "${artistName}" not directly in ACRCloud match "${matchedArtistNames}" despite high initial similarity and declared features.`
              );
            }
          }
          // --- End New Logic for Featuring Artists ---

          if (mainArtist.isVerified && !isAdminUpload) {
            console.log(
              `[CopyrightCheckOnly] Performing canonical check for verified artist ${mainArtist.artistName} (track: "${title}")`
            );

            const matchArtistNameLower = primaryMatchedArtist.toLowerCase();

            const potentiallySimilarArtists =
              await prisma.artistProfile.findMany({
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

            console.log(
              `[CopyrightCheckOnly] Found ${potentiallySimilarArtists.length} potentially similar verified artists for comparison with "${primaryMatchedArtist}" (track: "${title}").`
            );

            let canonicalArtist = mainArtist;
            let highestSimilarity = uploaderSimilarity;

            for (const otherArtist of potentiallySimilarArtists) {
              const otherSimilarity = getArtistNameSimilarity(
                primaryMatchedArtist,
                otherArtist.artistName
              );
              console.log(
                `[CopyrightCheckOnly] Comparing with potentially similar artist "${
                  otherArtist.artistName
                }" (ID: ${
                  otherArtist.id
                }). Similarity to ACRCloud match: ${otherSimilarity.toFixed(3)}`
              );

              if (otherSimilarity > highestSimilarity) {
                highestSimilarity = otherSimilarity;
                canonicalArtist = otherArtist;
              } else if (
                otherSimilarity === highestSimilarity &&
                otherSimilarity > 0
              ) {
                const normAcr = normalizeString(primaryMatchedArtist);
                const normUploader = normalizeString(
                  canonicalArtist.artistName
                );
                const normOther = normalizeString(otherArtist.artistName);
                if (normOther === normAcr && normUploader !== normAcr) {
                  canonicalArtist = otherArtist;
                } else if (normOther === normAcr && normUploader === normAcr) {
                  if (
                    new Date(otherArtist.createdAt) <
                    new Date(canonicalArtist.createdAt)
                  ) {
                    canonicalArtist = otherArtist;
                  }
                } else if (normOther !== normAcr && normUploader !== normAcr) {
                  if (
                    new Date(otherArtist.createdAt) <
                    new Date(canonicalArtist.createdAt)
                  ) {
                    canonicalArtist = otherArtist;
                  }
                }
              }
            }
            canonicalArtistDisplay = canonicalArtist.artistName;

            if (canonicalArtist.id !== mainArtist.id) {
              allowUpload = false;
              blockingReason = `Upload blocked. While your artist name is similar, the song appears to more closely match verified artist "${canonicalArtist.artistName}".`;
              console.warn(
                `[CopyrightCheckOnly] Potential impersonation upload by "${mainArtist.artistName}" (ID: ${mainArtist.id}). Track "${title}" by "${primaryMatchedArtist}" more closely matches "${canonicalArtist.artistName}" (ID: ${canonicalArtist.id}).`
              );
            }
          }

          if (allowUpload) {
            const uploadType = isAdminUpload
              ? "Admin checking for artist"
              : mainArtist.isVerified
              ? "Verified artist checking own content"
              : "Unverified artist (edge case)";
            // Use matchedArtistNames (full string) for display, and primaryMatchedArtist for canonical reference if different
            console.log(
              `[CopyrightCheckOnly] ${uploadType} "${artistName}" - "${title}/${
                match.title
              }". Similarity score: ${uploaderSimilarity.toFixed(3)}`
            );
            return {
              isSafeToUpload: true,
              message: `Copyright check passed. The audio matches "${match.title}" by ${canonicalArtistDisplay}${messageSuffix}`,
              copyrightDetails: {
                ...match,
                localFingerprint: calculatedLocalFingerprint,
              }
            };
          } else {
            const error: any = new Error(blockingReason);
            error.isCopyrightConflict = true;
            error.copyrightDetails = {
              ...match,
              localFingerprint: calculatedLocalFingerprint,
            };
            throw error;
          }
        } else {
          // Similarity too low
          let errorMessage = `Copyright violation detected. The uploaded audio appears to match "${match.title}" by "${matchedArtistNames}".`;
          errorMessage += ` Your artist name has a similarity score of ${(
            uploaderSimilarity * 100
          ).toFixed(
            1
          )}% with the matched primary artist (${primaryMatchedArtist}). A higher similarity is required.`;
          if (match.album?.name)
            errorMessage += ` (Album: ${match.album.name})`;
          const error: any = new Error(errorMessage);
          error.isCopyrightConflict = true;
          error.copyrightDetails = {
            ...match,
            localFingerprint: calculatedLocalFingerprint,
          };
          throw error;
        }
      } else {
        // Artist not verified (and not admin) - block based on match
        let errorMessage = `Copyright violation detected. `;
        errorMessage += `The uploaded audio appears to match "${match.title}" by ${matchedArtistNames}.`;
        if (match.album?.name) errorMessage += ` (Album: ${match.album.name})`;
        const error: any = new Error(errorMessage);
        error.isCopyrightConflict = true;
        error.copyrightDetails = {
          ...match,
          localFingerprint: calculatedLocalFingerprint,
        };
        throw error;
      }
    } else {
      // No copyright match found by ACRCloud
      console.log(
        `[CopyrightCheckOnly] No copyright match found by ACRCloud for track "${title}" by artist "${artistName}"`
      );
      return {
        isSafeToUpload: true,
        message: "No copyright match found by detection service.",
        copyrightDetails: {
          localFingerprint: calculatedLocalFingerprint
        }
      };
    }
  }

  // ... (rest of TrackService class remains the same)
}

// Cập nhật track
export const updateTrack = async (req: Request, id: string) => {
  const { title, releaseDate, type, trackNumber, albumId, labelId } = req.body;

  const currentTrack = await prisma.track.findUnique({
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

  if (!currentTrack) throw new Error("Track not found");

  if (!canManageTrack(req.user, currentTrack.artistId)) {
    throw new Error("You can only update your own tracks");
  }

  const updateData: Prisma.TrackUpdateInput = {}; // Use Prisma type

  // Handle basic field updates
  if (title !== undefined) updateData.title = title;
  if (type !== undefined) updateData.type = type;
  if (trackNumber !== undefined) updateData.trackNumber = Number(trackNumber);

  // Handle Album update using connect/disconnect
  if (albumId !== undefined) {
    if (albumId === null || albumId === "") {
      updateData.album = { disconnect: true };
    } else if (typeof albumId === "string") {
      // Optional: Validate album exists before connecting
      const albumExists = await prisma.album.findUnique({
        where: { id: albumId },
        select: { id: true },
      });
      if (!albumExists)
        throw new Error(`Invalid Album ID: ${albumId} does not exist`);
      updateData.album = { connect: { id: albumId } };
    } else {
      throw new Error(
        `Invalid albumId type: expected string or null, got ${typeof albumId}`
      );
    }
  }

  // Handle labelId update using connect/disconnect
  if (labelId !== undefined) {
    if (labelId === null || labelId === "") {
      updateData.label = { disconnect: true };
    } else if (typeof labelId === "string") {
      const labelExists = await prisma.label.findUnique({
        where: { id: labelId },
      });
      if (!labelExists)
        throw new Error(`Invalid label ID: ${labelId} does not exist`);
      updateData.label = { connect: { id: labelId } };
    } else {
      throw new Error(
        `Invalid labelId type: expected string or null, got ${typeof labelId}`
      );
    }
  }

  // Handle cover file upload
  if (req.files && (req.files as any).coverFile) {
    const coverFile = (req.files as any).coverFile[0];
    const coverUpload = await uploadFile(coverFile.buffer, "covers", "image");
    updateData.coverUrl = coverUpload.secure_url;
  } else if (req.body.removeCover === "true") {
    // Optional: Allow removing cover
    updateData.coverUrl = null;
  }

  // Handle release date and isActive
  if (releaseDate !== undefined) {
    const newReleaseDate = new Date(releaseDate);
    if (isNaN(newReleaseDate.getTime())) {
      throw new Error("Invalid release date format");
    }
    const now = new Date();
    updateData.isActive = newReleaseDate <= now;
    updateData.releaseDate = newReleaseDate;
  }
  // Note: Add logic here if you want to update isActive independently via a separate field in req.body
  if (req.body.isActive !== undefined) {
    updateData.isActive =
      req.body.isActive === "true" || req.body.isActive === true;
  }

  // Handle Genres
  if (req.body.genres !== undefined) {
    await prisma.trackGenre.deleteMany({ where: { trackId: id } });

    // Then, add the new associations if any genres are provided
    const genresInput = req.body.genres;
    const genresArray = !genresInput
      ? []
      : Array.isArray(genresInput)
      ? genresInput.map(String).filter(Boolean)
      : typeof genresInput === "string"
      ? genresInput
          .split(",")
          .map((g: string) => g.trim())
          .filter(Boolean)
      : [];

    if (genresArray.length > 0) {
      const existingGenres = await prisma.genre.findMany({
        where: { id: { in: genresArray } },
        select: { id: true },
      });
      const validGenreIds = existingGenres.map((genre) => genre.id);
      const invalidGenreIds = genresArray.filter(
        (id) => !validGenreIds.includes(id)
      );
      if (invalidGenreIds.length > 0) {
        throw new Error(`Invalid genre IDs: ${invalidGenreIds.join(", ")}`);
      }

      // Prepare data for creating new associations
      updateData.genres = {
        create: validGenreIds.map((genreId: string) => ({
          genre: { connect: { id: genreId } },
        })),
      };
    } else {
    }
  }

  const updatedTrack = await prisma.$transaction(async (tx) => {
    // Get the original album ID *before* potentially updating the track
    const originalAlbumId = currentTrack.albumId;

    // Update the track itself (this handles connect/disconnect)
    await tx.track.update({
      where: { id },
      data: updateData,
    });

    // --- Update Album Track Counts ---
    const newAlbumId =
      (updateData.album as any)?.connect?.id ??
      (albumId === null || albumId === "" ? null : originalAlbumId); // Determine the new album ID after update

    // If the album assignment changed...
    if (originalAlbumId !== newAlbumId) {
      // Decrement count of the original album if it existed
      if (originalAlbumId) {
        await tx.album.update({
          where: { id: originalAlbumId },
          data: { totalTracks: { decrement: 1 } },
        });
      }
      // Increment count of the new album if it exists
      if (newAlbumId) {
        await tx.album.update({
          where: { id: newAlbumId },
          data: { totalTracks: { increment: 1 } },
        });
      }
    }

    // --- Update Featured Artists ---
    const rawFeaturedArtistIds = req.body.featuredArtistIds as string | undefined;
    const rawFeaturedArtistNames = req.body.featuredArtistNames as string | undefined;

    // Helper to parse JSON array string
    const parseJsonStringArray = (jsonString: string | undefined): string[] => {
      if (!jsonString) return [];
      try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string');
        }
        return [];
      } catch (e) {
        console.warn(`[updateTrack] Failed to parse JSON string for featured artists: ${jsonString}`, e);
        return [];
      }
    };
    
    const intentToUpdateFeaturedArtists = rawFeaturedArtistIds !== undefined || rawFeaturedArtistNames !== undefined;

    if (intentToUpdateFeaturedArtists) {
      await tx.trackArtist.deleteMany({ where: { trackId: id } });

      const featuredArtistIdsFromBody = parseJsonStringArray(rawFeaturedArtistIds);
      const featuredArtistNamesFromBody = parseJsonStringArray(rawFeaturedArtistNames);

      const resolvedFeaturedArtistIds = new Set<string>();

      // Process IDs from featuredArtistIdsFromBody
      if (featuredArtistIdsFromBody.length > 0) {
        const existingArtists = await tx.artistProfile.findMany({
          where: { id: { in: featuredArtistIdsFromBody } },
          select: { id: true },
        });
        const validArtistIds = new Set(existingArtists.map((a) => a.id));

        featuredArtistIdsFromBody.forEach((artistId) => {
          if (
            validArtistIds.has(artistId) &&
            artistId !== currentTrack.artistId
          ) {
            resolvedFeaturedArtistIds.add(artistId);
          } else if (!validArtistIds.has(artistId)) {
            console.warn(
              `[updateTrack] Invalid featured artist ID provided and skipped: ${artistId}`
            );
          } else if (artistId === currentTrack.artistId) {
            console.warn(
              `[updateTrack] Main artist ID (${artistId}) cannot be a featured artist on their own track.`
            );
          }
        });
      }

      // Process names from featuredArtistNamesFromBody
      if (featuredArtistNamesFromBody.length > 0) {
        for (const name of featuredArtistNamesFromBody) {
          if (typeof name === "string" && name.trim() !== "") {
            try {
              // Assuming getOrCreateArtistProfile can accept a transaction client (tx)
              const profile = await getOrCreateArtistProfile(name.trim(), tx);
              if (profile.id !== currentTrack.artistId) {
                resolvedFeaturedArtistIds.add(profile.id);
              } else {
                console.warn(
                  `[updateTrack] Main artist (${name}) cannot be a featured artist on their own track.`
                );
              }
            } catch (error) {
              console.error(
                `[updateTrack] Error processing featured artist name "${name}":`,
                error
              );
              // Depending on requirements, you might want to collect these errors and report them,
              // or re-throw to fail the transaction. For now, just logging.
            }
          }
        }
      }

      const finalArtistIdsToLink = Array.from(resolvedFeaturedArtistIds);
      if (finalArtistIdsToLink.length > 0) {
        await tx.trackArtist.createMany({
          data: finalArtistIdsToLink.map((artistId: string) => ({
            trackId: id,
            artistId: artistId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Re-fetch the track within the transaction to get updated relations
    const finalUpdatedTrack = await tx.track.findUnique({
      where: { id },
      select: trackSelect,
    });
    if (!finalUpdatedTrack) {
      throw new Error("Failed to re-fetch track after updating relations.");
    }
    return finalUpdatedTrack;
  });

  const io = getIO();
  io.emit("track:updated", { track: updatedTrack }); // Use the result of the transaction

  return { message: "Track updated successfully", track: updatedTrack };
};

// Xóa track
export const deleteTrack = async (req: Request, id: string) => {
  const user = req.user;
  if (!user) throw new Error("Unauthorized: User not found");

  const track = await prisma.track.findUnique({
    where: { id },
    select: { artistId: true },
  });

  if (!track) throw new Error("Track not found");

  if (!canManageTrack(user, track.artistId)) {
    throw new Error("You can only delete your own tracks");
  }

  await deleteTrackById(id);
  return { message: "Track deleted successfully" };
};

// Toggle visibility
export const toggleTrackVisibility = async (req: Request, id: string) => {
  const user = req.user;
  if (!user) throw new Error("Unauthorized: User not found");

  const track = await prisma.track.findUnique({
    where: { id },
    select: { artistId: true, isActive: true },
  });

  if (!track) throw new Error("Track not found");

  if (!canManageTrack(user, track.artistId)) {
    throw new Error("You can only toggle visibility of your own tracks");
  }
  const newIsActive = !track.isActive;

  const updatedTrack = await prisma.track.update({
    where: { id },
    data: { isActive: newIsActive },
    select: trackSelect,
  });
  // Emit WebSocket event
  const io = getIO();
  io.emit("track:visibilityChanged", {
    trackId: updatedTrack.id,
    isActive: newIsActive,
  });

  return {
    message: `Track ${
      updatedTrack.isActive ? "activated" : "hidden"
    } successfully`,
    track: updatedTrack,
  };
};

// Tìm kiếm track
export const searchTrack = async (req: Request) => {
  const { q, page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const user = req.user;

  if (!q) throw new Error("Query is required");

  const searchQuery = String(q).trim();

  if (user) {
    const existingHistory = await prisma.history.findFirst({
      where: {
        userId: user.id,
        type: "SEARCH",
        query: { equals: searchQuery, mode: Prisma.QueryMode.insensitive },
      },
    });

    if (existingHistory) {
      await prisma.history.update({
        where: { id: existingHistory.id },
        data: { updatedAt: new Date() },
      });
    } else {
      await prisma.history.create({
        data: {
          type: "SEARCH",
          query: searchQuery,
          userId: user.id,
        },
      });
    }
  }

  const searchConditions = [
    { title: { contains: searchQuery, mode: Prisma.QueryMode.insensitive } },
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

  let whereClause: any;
  if (user && user.currentProfile === "ARTIST" && user.artistProfile?.id) {
    whereClause = {
      artistId: user.artistProfile.id,
      OR: searchConditions,
    };
  } else {
    whereClause = {
      AND: [
        { isActive: true },
        { artist: { isActive: true } },
        { OR: searchConditions },
      ],
    };
  }

  const [tracks, total] = await Promise.all([
    prisma.track.findMany({
      where: whereClause,
      skip: offset,
      take: Number(limit),
      select: trackSelect,
      orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
    }),
    prisma.track.count({ where: whereClause }),
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

// Lấy tracks theo loại
export const getTracksByType = async (req: Request, type: string) => {
  const cacheKey = req.originalUrl;
  if (process.env.USE_REDIS_CACHE === "true") {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log(`[Redis] Cache hit for key: ${cacheKey}`);
      return JSON.parse(cachedData);
    }
    console.log(`[Redis] Cache miss for key: ${cacheKey}`);
  }

  let { page = 1, limit = 10 } = req.query;
  page = Math.max(1, parseInt(page as string));
  limit = Math.min(100, Math.max(1, parseInt(limit as string)));
  const offset = (page - 1) * limit;

  if (!Object.values(AlbumType).includes(type as AlbumType)) {
    throw new Error("Invalid track type");
  }

  const whereClause: any = { type: type as AlbumType };

  if (!req.user || !req.user.artistProfile?.id) {
    whereClause.isActive = true;
  } else {
    whereClause.OR = [
      { isActive: true },
      { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
    ];
  }

  const tracks = await prisma.track.findMany({
    where: whereClause,
    select: trackSelect,
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: Number(limit),
  });

  const totalTracks = await prisma.track.count({ where: whereClause });

  const result = {
    tracks,
    pagination: {
      total: totalTracks,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalTracks / Number(limit)),
    },
  };

  await setCache(cacheKey, result);
  return result;
};

// Lấy tất cả tracks (ADMIN & ARTIST)
export const getAllTracksAdminArtist = async (req: Request) => {
  const user = req.user;
  if (!user) throw new Error("Unauthorized");

  if (
    user.role !== Role.ADMIN &&
    (!user.artistProfile?.isVerified || user.artistProfile?.role !== "ARTIST")
  ) {
    throw new Error(
      "Forbidden: Only admins or verified artists can access this resource"
    );
  }

  const { search, status, genres } = req.query;
  const whereClause: Prisma.TrackWhereInput = {};

  if (user.role !== Role.ADMIN && user.artistProfile?.id) {
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
    const genreIds: string[] = Array.isArray(genres)
      ? genres.map((g) => String(g))
      : [String(genres)];
    whereClause.genres = {
      some: {
        genreId: { in: genreIds },
      },
    };
  }

  const conditions: Prisma.TrackWhereInput[] = [];
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

  if (conditions.length > 0) whereClause.AND = conditions;

  // Determine sorting
  let orderBy:
    | Prisma.TrackOrderByWithRelationInput
    | Prisma.TrackOrderByWithRelationInput[] = { releaseDate: "desc" }; // Default sort
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
    orderBy = [{ [String(sortBy)]: order }, { id: "asc" }]; // Add secondary sort for stability
  }

  // Directly use paginate with the constructed whereClause and select
  const result = await paginate<any>(prisma.track, req, {
    where: whereClause,
    select: trackSelect, // Use the standard trackSelect
    orderBy: orderBy,
  });

  // Return the paginated result directly
  return { tracks: result.data, pagination: result.pagination };
};

// Lấy track theo ID
export const getTrackById = async (req: Request, id: string) => {
  const user = req.user;

  const track = await prisma.track.findUnique({
    where: { id },
    select: trackSelect,
  });

  if (!track) throw new Error("Track not found");

  if (user?.role === Role.ADMIN) return track;

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

// Lấy tracks theo thể loại
export const getTracksByGenre = async (req: Request, genreId: string) => {
  const cacheKey = req.originalUrl;
  if (process.env.USE_REDIS_CACHE === "true") {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log(`[Redis] Cache hit for key: ${cacheKey}`);
      return JSON.parse(cachedData);
    }
    console.log(`[Redis] Cache miss for key: ${cacheKey}`);
  }

  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const genre = await prisma.genre.findUnique({
    where: { id: genreId },
  });

  if (!genre) throw new Error("Genre not found");

  const whereClause: any = {
    genres: {
      every: {
        genreId: genreId,
      },
    },
  };

  if (!req.user || !req.user.artistProfile?.id) {
    whereClause.isActive = true;
  } else {
    whereClause.OR = [
      { isActive: true },
      { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
    ];
  }

  const tracks = await prisma.track.findMany({
    where: whereClause,
    select: {
      ...trackSelect,
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

  const totalTracks = await prisma.track.count({ where: whereClause });

  const result = {
    tracks,
    pagination: {
      total: totalTracks,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalTracks / Number(limit)),
    },
  };

  await setCache(cacheKey, result);
  return result;
};

// Lấy tracks theo type và genre
export const getTracksByTypeAndGenre = async (
  req: Request,
  type: string,
  genreId: string
) => {
  const cacheKey = req.originalUrl;
  if (process.env.USE_REDIS_CACHE === "true") {
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log(`[Redis] Cache hit for key: ${cacheKey}`);
      return JSON.parse(cachedData);
    }
    console.log(`[Redis] Cache miss for key: ${cacheKey}`);
  }

  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  if (!Object.values(AlbumType).includes(type as AlbumType)) {
    throw new Error("Invalid track type");
  }

  const genre = await prisma.genre.findUnique({
    where: { id: genreId },
  });

  if (!genre) throw new Error("Genre not found");

  const whereClause: any = {
    type: type as AlbumType,
    genres: {
      every: {
        genreId: genreId,
      },
    },
  };

  if (!req.user || !req.user.artistProfile?.id) {
    whereClause.isActive = true;
  } else {
    whereClause.OR = [
      { isActive: true },
      { AND: [{ isActive: false }, { artistId: req.user.artistProfile.id }] },
    ];
  }

  const tracks = await prisma.track.findMany({
    where: whereClause,
    select: {
      ...trackSelect,
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

  const totalTracks = await prisma.track.count({ where: whereClause });

  const result = {
    tracks,
    pagination: {
      total: totalTracks,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalTracks / Number(limit)),
    },
  };

  await setCache(cacheKey, result);
  return result;
};

// Phát track
export const playTrack = async (req: Request, trackId: string) => {
  const user = req.user;
  if (!user) throw new Error("Unauthorized");

  const trackData = await prisma.track.findFirst({
    where: {
      id: trackId,
      isActive: true,
      OR: [{ album: null }, { album: { isActive: true } }],
    },
    select: trackSelect, // Ensure trackSelect includes artistId and genres
  });

  if (!trackData) {
    throw new Error("Track not found");
  }

  // At this point, trackData is guaranteed to be non-null.
  const track = trackData;

  // Automatically re-analyze genres if missing
  if (!track.genres || track.genres.length === 0) {
    console.log(
      `[TrackService] Track ${track.id!} is missing genres. Triggering re-analysis.`
    );
    try {
      await reanalyzeTrackAudioFeatures(track.id!);
      console.log(
        `[TrackService] Successfully re-analyzed genres for track ${track.id!}.`
      );
    } catch (reanalyzeError) {
      console.error(
        `[TrackService] Error re-analyzing genres for track ${track.id!}:`,
        reanalyzeError
      );
    }
  }

  if (!track.artistId) {
    console.error(
      `[TrackService] Critical: Track ${track.id!} is missing artistId after initial fetch.`
    );
    throw new Error("Track is missing artistId");
  }

  // Logic to update monthlyListeners for the artist
  // track.artistId is now guaranteed by the check above.
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const existingListenForArtistThisMonth = await prisma.history.findFirst({
    where: {
      userId: user.id,
      track: { artistId: track.artistId },
      createdAt: { gte: oneMonthAgo },
      type: "PLAY",
    },
    select: { id: true },
  });

  if (!existingListenForArtistThisMonth) {
    await prisma.artistProfile.update({
      where: { id: track.artistId },
      data: { monthlyListeners: { increment: 1 } },
    });
    console.log(
      `[TrackService] Incremented monthlyListeners for artist ${track.artistId} by user ${user.id}`
    );
  }

  // Increment track's overall playCount
  await prisma.track.update({
    where: { id: track.id },
    data: { playCount: { increment: 1 } },
  });

  // Always create a new history record for each play event
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
  console.log(
    `[TrackService] Creating NEW History record for user ${user.id}, track ${track.id} at ${formattedTimestamp}`
  );
  await prisma.history.create({
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

// Check if track is liked
export const checkTrackLiked = async (userId: string, trackId: string) => {
  const like = await prisma.userLikeTrack.findUnique({
    where: {
      userId_trackId: {
        userId,
        trackId,
      },
    },
  });

  return { isLiked: !!like };
};

// --- START: New Re-analyze Service Function ---

// Helper to download file buffer from URL (basic example)
async function downloadAudioBuffer(url: string): Promise<Buffer> {
  const https = await import("https"); // Dynamically import https
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          return reject(
            new Error(
              `Failed to download audio: Status Code ${response.statusCode}`
            )
          );
        }
        const data: Buffer[] = [];
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

export const reanalyzeTrackAudioFeatures = async (
  trackId: string
) /* : Promise<Track> */ => {
  // Let TypeScript infer the return type or use Prisma.TrackGetPayload
  const track = await prisma.track.findUnique({
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

  // Only use analyzeAudioWithReccoBeats from upload.service.ts
  const audioAnalysis = await analyzeAudioWithReccoBeats(
    audioBuffer,
    track.title,
    track.artist.artistName
  );
  // const essentiaAnalysis = await analyzeAudioFeatures(audioBuffer); // Remove call to local essentia-only analysis

  return prisma.$transaction(async (tx) => {
    // Clear existing genres before adding new ones
    await tx.trackGenre.deleteMany({
      where: { trackId: trackId },
    });

    const dataToUpdate: Prisma.TrackUpdateInput = {
      tempo: audioAnalysis.tempo,
      mood: audioAnalysis.mood,
      key: audioAnalysis.key,
      scale: audioAnalysis.scale,
      danceability: audioAnalysis.danceability,
      energy: audioAnalysis.energy,
      // Add other fields from audioAnalysis if they exist on Track model
      // instrumentalness: audioAnalysis.instrumentalness,
      // acousticness: audioAnalysis.acousticness,
      // valence: audioAnalysis.valence,
      // loudness: audioAnalysis.loudness,
      // speechiness: audioAnalysis.speechiness,
      // Potentially update other fields like lastAnalyzedAt if you add such a field
    };

    const newGenreIds = audioAnalysis.genreIds;
    if (newGenreIds && newGenreIds.length > 0) {
      dataToUpdate.genres = {
        create: newGenreIds.map((genreId: string) => ({
          genre: { connect: { id: genreId } },
        })),
      };
    } else {
       // Fallback: if no genres from analysis, assign a default one or leave empty
      const defaultGenre = await prisma.genre.findFirst({ where: { name: "Pop" } }) || await prisma.genre.findFirst();
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
      throw new Error(
        "Failed to update or retrieve track after re-analysis in transaction."
      );
    }
    return updatedTrack; // Return the result directly, type will be inferred
  });
};
// --- END: New Re-analyze Service Function ---
