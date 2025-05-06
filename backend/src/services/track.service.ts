import prisma from '../config/db';
import { Prisma, Role, AlbumType, NotificationType, RecipientType, Track } from '@prisma/client';
import { Request } from 'express';
import { uploadFile } from './upload.service';
import { paginate } from '../utils/handle-utils';
import * as emailService from './email.service';
import { client, setCache } from '../middleware/cache.middleware';
import { trackSelect } from '../utils/prisma-selects';
import { getIO, getUserSockets } from '../config/socket';
import { getOrCreateArtistProfile } from './artist.service';
import * as mm from 'music-metadata';
import { Essentia, EssentiaWASM } from 'essentia.js';
import { MPEGDecoder, MPEGDecodedAudio } from 'mpg123-decoder';

// Helper function to convert MP3 buffer to Float32Array PCM data
async function convertMp3BufferToPcmF32(audioBuffer: Buffer): Promise<Float32Array | null> {
  try {
    const decoder = new MPEGDecoder();
    await decoder.ready; // Wait for the decoder WASM to be ready

    // Decode the entire buffer
    // Need to convert Node Buffer to Uint8Array for the decode method
    const uint8ArrayBuffer = new Uint8Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.length);
    const decoded: MPEGDecodedAudio = decoder.decode(uint8ArrayBuffer);

    decoder.free(); // Release resources

    if (decoded.errors.length > 0) {
      console.error('MP3 Decoding errors:', decoded.errors);
      // Decide if you want to throw or return null based on error severity
      // For now, let's return null if there are errors.
      return null;
    }

    // Essentia usually works best with mono audio for analysis like BPM.
    // Let's average the channels if it's stereo.
    if (decoded.channelData.length > 1) {
      const leftChannel = decoded.channelData[0];
      const rightChannel = decoded.channelData[1];
      const monoChannel = new Float32Array(leftChannel.length);
      for (let i = 0; i < leftChannel.length; i++) {
        monoChannel[i] = (leftChannel[i] + rightChannel[i]) / 2;
      }
      return monoChannel;
    } else if (decoded.channelData.length === 1) {
      // Already mono
      return decoded.channelData[0];
    } else {
      // No channel data?
      console.error('MP3 Decoding produced no channel data.');
      return null;
    }

  } catch (error) {
    console.error('Error during MP3 decoding or processing:', error);
    return null; // Return null if any error occurs
  }
}

// Simplified mood analysis function (example)
function analyzeMood(energy: number, valence: number): string {
  // This is a very basic example. Real mood analysis is complex.
  if (energy > 0.6 && valence > 0.6) return 'Energetic/Happy';
  if (energy > 0.6 && valence <= 0.4) return 'Energetic/Aggressive'; // Or Tense
  if (energy <= 0.4 && valence > 0.6) return 'Calm/Happy'; // Or Peaceful
  if (energy <= 0.4 && valence <= 0.4) return 'Sad/Calm';
  if (energy > 0.5 && valence > 0.4 && valence <= 0.6) return 'Neutral/Driving';
  return 'Neutral'; // Default
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
    throw new Error('Track not found');
  }

  // Emit WebSocket event before deletion
  const io = getIO();
  io.emit('track:deleted', { trackId: id });

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
    throw new Error('Track not found or not active');
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
    throw new Error('Track already liked');
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
      type: 'FAVORITE',
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
  io.emit('playlist-updated');
  // Also emit a personalized event for this user
  io.to(`user-${userId}`).emit('favorites-updated', { action: 'add', trackId });

  return { message: 'Track liked successfully' };
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
    throw new Error('Track not liked');
  }

  // First, find the Favorites playlist
  const favoritePlaylist = await prisma.playlist.findFirst({
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
    // Just delete the like if there's no Favorites playlist
    await prisma.userLikeTrack.delete({
      where: {
        userId_trackId: {
          userId,
          trackId,
        },
      },
    });
    
    return { message: 'Track unliked successfully' };
  }

  // Get track duration before deleting
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { duration: true }
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
        type: 'FAVORITE',
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

  // Check if this was the last track in the playlist
  // If favoritePlaylist._count.tracks is 1, that means after deletion it will be empty
  if (favoritePlaylist._count.tracks === 1) {
    // Delete the entire Favorites playlist since it's now empty
    await prisma.playlist.delete({
      where: {
        id: favoritePlaylist.id
      }
    });
    
    // Emit WebSocket event to notify clients that the Favorites playlist was deleted
    io.emit('playlist-updated');
    io.to(`user-${userId}`).emit('favorites-updated', { action: 'deleted', playlistId: favoritePlaylist.id });
    
    return { message: 'Track unliked and empty Favorites playlist removed' };
  }

  // Emit WebSocket event to notify clients that the Favorites playlist was updated
  io.emit('playlist-updated');
  io.to(`user-${userId}`).emit('favorites-updated', { action: 'remove', trackId });

  return { message: 'Track unliked successfully' };
};

// Lấy tất cả tracks
export const getTracks = async (req: Request) => {
  const { search, sortBy, sortOrder } = req.query;
  const user = req.user;

  const whereClause: Prisma.TrackWhereInput = {};

  if (user && user.role !== Role.ADMIN && user.artistProfile?.id) {
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

  const orderByClause: Prisma.TrackOrderByWithRelationInput = {};
  if (
    sortBy &&
    typeof sortBy === 'string' &&
    (sortOrder === 'asc' || sortOrder === 'desc')
  ) {
    if (
      sortBy === 'title' ||
      sortBy === 'duration' ||
      sortBy === 'releaseDate' ||
      sortBy === 'createdAt' ||
      sortBy === 'isActive'
    ) {
      orderByClause[sortBy] = sortOrder;
    } else if (sortBy === 'album') {
      orderByClause.album = { title: sortOrder };
    } else if (sortBy === 'artist') {
      orderByClause.artist = { artistName: sortOrder };
    } else {
      orderByClause.releaseDate = 'desc';
    }
  } else {
    orderByClause.releaseDate = 'desc';
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
  type: 'SINGLE';
  genreIds?: string[];
  featuredArtistIds?: string[];
  featuredArtistNames?: string[];
  labelId?: string;
}

export class TrackService {
  static async createTrack(
    artistProfileId: string,
    data: CreateTrackData,
    audioFile: Express.Multer.File,
    coverFile?: Express.Multer.File
  ): Promise<Track> {
    const { title, releaseDate, type, genreIds, featuredArtistIds = [], featuredArtistNames = [], labelId } = data;

    const mainArtist = await prisma.artistProfile.findUnique({
      where: { id: artistProfileId },
      select: { id: true, labelId: true, artistName: true, avatar: true }
    });
    if (!mainArtist) {
      throw new Error(`Artist profile with ID ${artistProfileId} not found.`);
    }
    const artistName = mainArtist.artistName;

    const finalLabelId = labelId || mainArtist.labelId;

    const [audioUploadResult, coverUploadResult] = await Promise.all([
      uploadFile(audioFile.buffer, 'tracks', 'auto'),
      coverFile ? uploadFile(coverFile.buffer, 'covers', 'image') : Promise.resolve(null),
    ]);

    let duration = 0;
    let tempo = null;
    let mood = null;
    let key: string | null = null;
    let scale: string | null = null;
    let danceability: number | null = null;
    let energy: number | null = null;
    try {
      const metadata = await mm.parseBuffer(audioFile.buffer, audioFile.mimetype);
      duration = Math.round(metadata.format.duration || 0);

      // --- Essentia analysis --- 
      tempo = null;
      mood = null;

      try {
        const pcmF32 = await convertMp3BufferToPcmF32(audioFile.buffer);

        if (pcmF32) {
          const essentia = new Essentia(EssentiaWASM);
          const audioVector = essentia.arrayToVector(pcmF32)
          
          // Tempo Estimation
          try {
            const tempoResult = essentia.PercivalBpmEstimator(audioVector);
            tempo = Math.round(tempoResult.bpm);
          } catch (tempoError) {
            console.error('Error estimating tempo:', tempoError);
            tempo = null;
          }

          // Danceability Estimation
          try {
            const danceabilityResult = essentia.Danceability(audioVector);
            danceability = danceabilityResult.danceability;
          } catch (danceabilityError) {
            console.error('Error estimating danceability:', danceabilityError);
            danceability = null;
          }
          
          // Energy Calculation (used for mood placeholder and energy field)
          try {
            const energyResult = essentia.Energy(audioVector);
            energy = energyResult.energy;
            
            // Mood Placeholder (based on energy)
            if (typeof energy === 'number') {
              if (energy > 0.6) {
                mood = 'Energetic';
              } else if (energy < 0.4) {
                mood = 'Calm';
              } else {
                mood = 'Neutral';
              }
            }
          } catch (energyError) {
            console.error('Error calculating energy/mood:', energyError);
            mood = null;
            energy = null;
          }
          
          // Key & Scale Estimation
          // KeyExtractor often works better on the full signal representation if available,
          // but let's try with the decoded PCM vector first.
          try {
             // Note: KeyExtractor might ideally take the raw signal buffer if essentia supports it directly,
             // or requires specific preprocessing not done here. This is an attempt with PCM data.
            const keyResult = essentia.KeyExtractor(audioVector);
            key = keyResult.key;
            scale = keyResult.scale;
          } catch (keyError) {
            console.error('Error estimating key/scale:', keyError);
            key = null;
            scale = null;
          }
          
        } else {
          console.warn('Audio decoding failed, skipping all audio analysis.');
        }
      } catch (analysisError) {
          console.error('Error during audio analysis pipeline:', analysisError);
          tempo = null;
          mood = null;
      }
      // --- End Essentia analysis --- 
      
    } catch (error) {
      console.error('Error parsing basic audio metadata:', error);
      tempo = null;
      mood = null;
    }

    const allFeaturedArtistIds = new Set<string>();
    if (featuredArtistIds.length > 0) {
      const existingArtists = await prisma.artistProfile.findMany({
        where: { id: { in: featuredArtistIds } },
        select: { id: true }
      });
      existingArtists.forEach(artist => allFeaturedArtistIds.add(artist.id));
    }
    if (featuredArtistNames.length > 0) {
      for (const name of featuredArtistNames) {
        try {
          const profile = await getOrCreateArtistProfile(name);
          if (profile.id !== artistProfileId) {
             allFeaturedArtistIds.add(profile.id);
          }
        } catch (error) {
          console.error(`Error finding or creating artist profile for \"${name}\":`, error);
        }
      }
    }

    const trackData: Prisma.TrackCreateInput = {
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

    const newTrack = await prisma.track.create({
      data: trackData,
      select: {
        ...trackSelect,
        albumId: true
      },
    });

    const sendNotifications = async () => {
      const followers = await prisma.userFollow.findMany({
        where: {
          followingArtistId: artistProfileId,
          followingType: 'ARTIST',
        },
        select: { followerId: true },
      });

      const followerIds = followers.map((f) => f.followerId);
      if (followerIds.length > 0) {
        const followerUsers = await prisma.user.findMany({
          where: { id: { in: followerIds }, isActive: true },
          select: { id: true, email: true },
        });

        const notificationsData: Prisma.NotificationCreateManyInput[] = followerUsers.map((follower) => ({
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
        const userSocketsMap = getUserSockets(); // Assuming getUserSockets is available

        for (const user of followerUsers) {
          const targetSocketId = userSocketsMap.get(user.id);
          if (targetSocketId) {
            io.to(targetSocketId).emit('notification', {
              type: NotificationType.NEW_TRACK,
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
            const emailOptions = emailService.createNewReleaseEmail(
              user.email,
              artistName,
              'track',
              newTrack.title,
              releaseLink,
              newTrack.coverUrl
            );
            emailService.sendEmail(emailOptions).catch(emailError => {
               console.error(`Failed to send new track email to ${user.email}:`, emailError);
            });
          }
        }
      }
    };

    // Trigger notifications without awaiting
    sendNotifications().catch(notificationError => {
      console.error("Error sending new track notifications:", notificationError);
    });

    return newTrack;
  }

  // ... (rest of TrackService class remains the same)
}

// Cập nhật track
export const updateTrack = async (req: Request, id: string) => {
  const {
    title,
    releaseDate,
    type,
    trackNumber,
    albumId,
    labelId,
  } = req.body;

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

  if (!currentTrack) throw new Error('Track not found');

  if (!canManageTrack(req.user, currentTrack.artistId)) {
    throw new Error('You can only update your own tracks');
  }

  const updateData: Prisma.TrackUpdateInput = {}; // Use Prisma type

  // Handle basic field updates
  if (title !== undefined) updateData.title = title;
  if (type !== undefined) updateData.type = type;
  if (trackNumber !== undefined) updateData.trackNumber = Number(trackNumber);

  // Handle Album update using connect/disconnect
  if (albumId !== undefined) {
    if (albumId === null || albumId === '') {
      updateData.album = { disconnect: true };
    } else if (typeof albumId === 'string') {
      // Optional: Validate album exists before connecting
      const albumExists = await prisma.album.findUnique({ where: { id: albumId }, select: { id: true } });
      if (!albumExists) throw new Error(`Invalid Album ID: ${albumId} does not exist`);
      updateData.album = { connect: { id: albumId } };
    } else {
      throw new Error(`Invalid albumId type: expected string or null, got ${typeof albumId}`);
    }
  }

  // Handle labelId update using connect/disconnect
  if (labelId !== undefined) {
    if (labelId === null || labelId === '') {
      updateData.label = { disconnect: true };
    } else if (typeof labelId === 'string') {
      const labelExists = await prisma.label.findUnique({ where: { id: labelId } });
      if (!labelExists) throw new Error(`Invalid label ID: ${labelId} does not exist`);
      updateData.label = { connect: { id: labelId } };
    } else {
      throw new Error(`Invalid labelId type: expected string or null, got ${typeof labelId}`);
    }
  }

  // Handle cover file upload
  if (req.files && (req.files as any).coverFile) {
      const coverFile = (req.files as any).coverFile[0];
      const coverUpload = await uploadFile(coverFile.buffer, 'covers', 'image');
      updateData.coverUrl = coverUpload.secure_url;
  } else if (req.body.removeCover === 'true') { // Optional: Allow removing cover
      updateData.coverUrl = null;
  }

  // Handle release date and isActive
  if (releaseDate !== undefined) {
      const newReleaseDate = new Date(releaseDate);
      if (isNaN(newReleaseDate.getTime())) {
          throw new Error('Invalid release date format');
      }
      const now = new Date();
      updateData.isActive = newReleaseDate <= now;
      updateData.releaseDate = newReleaseDate;
  }
  // Note: Add logic here if you want to update isActive independently via a separate field in req.body
  if (req.body.isActive !== undefined) {
      updateData.isActive = req.body.isActive === 'true' || req.body.isActive === true;
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
      : typeof genresInput === 'string'
      ? genresInput.split(',').map((g: string) => g.trim()).filter(Boolean)
      : [];

    if (genresArray.length > 0) {
      const existingGenres = await prisma.genre.findMany({
        where: { id: { in: genresArray } },
        select: { id: true },
      });
      const validGenreIds = existingGenres.map((genre) => genre.id);
      const invalidGenreIds = genresArray.filter((id) => !validGenreIds.includes(id));
      if (invalidGenreIds.length > 0) {
        throw new Error(`Invalid genre IDs: ${invalidGenreIds.join(', ')}`);
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
    const newAlbumId = (updateData.album as any)?.connect?.id ?? 
                       (albumId === null || albumId === '' ? null : originalAlbumId); // Determine the new album ID after update

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
    const featuredArtistIdsFromBody = req.body.featuredArtistIds as string[] | undefined;
    const featuredArtistNamesFromBody = req.body.featuredArtistNames as string[] | undefined;

    // Only update featured artists if at least one of the relevant fields is present in the request body.
    // Sending empty arrays for both means "remove all featured artists".
    // If neither key is present, featured artists are not modified.
    if (featuredArtistIdsFromBody !== undefined || featuredArtistNamesFromBody !== undefined) {
        await tx.trackArtist.deleteMany({ where: { trackId: id } });

        const resolvedFeaturedArtistIds = new Set<string>();

        // Process IDs from featuredArtistIds[]
        if (featuredArtistIdsFromBody && Array.isArray(featuredArtistIdsFromBody) && featuredArtistIdsFromBody.length > 0) {
            const existingArtists = await tx.artistProfile.findMany({
                where: { id: { in: featuredArtistIdsFromBody } },
                select: { id: true },
            });
            const validArtistIds = new Set(existingArtists.map(a => a.id));
            
            featuredArtistIdsFromBody.forEach(artistId => {
                if (validArtistIds.has(artistId) && artistId !== currentTrack.artistId) {
                    resolvedFeaturedArtistIds.add(artistId);
                } else if (!validArtistIds.has(artistId)) {
                    console.warn(`[updateTrack] Invalid featured artist ID provided and skipped: ${artistId}`);
                } else if (artistId === currentTrack.artistId) {
                    console.warn(`[updateTrack] Main artist ID (${artistId}) cannot be a featured artist on their own track.`);
                }
            });
        }

        // Process names from featuredArtistNames[]
        if (featuredArtistNamesFromBody && Array.isArray(featuredArtistNamesFromBody) && featuredArtistNamesFromBody.length > 0) {
            for (const name of featuredArtistNamesFromBody) {
                if (typeof name === 'string' && name.trim() !== '') {
                    try {
                        // Assuming getOrCreateArtistProfile can accept a transaction client (tx)
                        const profile = await getOrCreateArtistProfile(name.trim(), tx); 
                        if (profile.id !== currentTrack.artistId) {
                            resolvedFeaturedArtistIds.add(profile.id);
                        } else {
                           console.warn(`[updateTrack] Main artist (${name}) cannot be a featured artist on their own track.`);
                        }
                    } catch (error) {
                        console.error(`[updateTrack] Error processing featured artist name "${name}":`, error);
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
  io.emit('track:updated', { track: updatedTrack }); // Use the result of the transaction

  return { message: 'Track updated successfully', track: updatedTrack };
};

// Xóa track
export const deleteTrack = async (req: Request, id: string) => {
  const user = req.user;
  if (!user) throw new Error('Unauthorized: User not found');

  const track = await prisma.track.findUnique({
    where: { id },
    select: { artistId: true },
  });

  if (!track) throw new Error('Track not found');

  if (!canManageTrack(user, track.artistId)) {
    throw new Error('You can only delete your own tracks');
  }

  await deleteTrackById(id);
  return { message: 'Track deleted successfully' };
};

// Toggle visibility
export const toggleTrackVisibility = async (req: Request, id: string) => {
  const user = req.user;
  if (!user) throw new Error('Unauthorized: User not found');

  const track = await prisma.track.findUnique({
    where: { id },
    select: { artistId: true, isActive: true },
  });

  if (!track) throw new Error('Track not found');

  if (!canManageTrack(user, track.artistId)) {
    throw new Error('You can only toggle visibility of your own tracks');
  }
  const newIsActive = !track.isActive;

  const updatedTrack = await prisma.track.update({
    where: { id },
    data: { isActive: newIsActive },
    select: trackSelect,
  });
    // Emit WebSocket event
  const io = getIO();
  io.emit('track:visibilityChanged', { trackId: updatedTrack.id, isActive: newIsActive });

  return {
    message: `Track ${updatedTrack.isActive ? 'activated' : 'hidden'} successfully`,
    track: updatedTrack,
  };
};

// Tìm kiếm track
export const searchTrack = async (req: Request) => {
  const { q, page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const user = req.user;

  if (!q) throw new Error('Query is required');

  const searchQuery = String(q).trim();

  if (user) {
    const existingHistory = await prisma.history.findFirst({
      where: {
        userId: user.id,
        type: 'SEARCH',
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
          type: 'SEARCH',
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
        artistName: { contains: searchQuery, mode: Prisma.QueryMode.insensitive },
      },
    },
    {
      featuredArtists: {
        some: {
          artistProfile: {
            artistName: { contains: searchQuery, mode: Prisma.QueryMode.insensitive },
          },
        },
      },
    },
  ];

  let whereClause: any;
  if (user && user.currentProfile === 'ARTIST' && user.artistProfile?.id) {
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
      orderBy: [{ playCount: 'desc' }, { createdAt: 'desc' }],
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
  if (process.env.USE_REDIS_CACHE === 'true') {
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
    throw new Error('Invalid track type');
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
    orderBy: { createdAt: 'desc' },
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
  if (!user) throw new Error('Unauthorized');

  if (
    user.role !== Role.ADMIN &&
    (!user.artistProfile?.isVerified || user.artistProfile?.role !== 'ARTIST')
  ) {
    throw new Error('Forbidden: Only admins or verified artists can access this resource');
  }

  const { search, status, genres } = req.query;
  const whereClause: Prisma.TrackWhereInput = {};

  if (user.role !== Role.ADMIN && user.artistProfile?.id) {
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

  if (conditions.length > 0) whereClause.AND = conditions;

  // Determine sorting
  let orderBy: Prisma.TrackOrderByWithRelationInput | Prisma.TrackOrderByWithRelationInput[] = { releaseDate: 'desc' }; // Default sort
  const { sortBy, sortOrder } = req.query;
  const validSortFields = ['title', 'duration', 'playCount', 'isActive', 'releaseDate', 'trackNumber'];
  if (sortBy && validSortFields.includes(String(sortBy))) {
      const order = sortOrder === 'asc' ? 'asc' : 'desc';
      orderBy = [{ [String(sortBy)]: order }, { id: 'asc' }]; // Add secondary sort for stability
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

  if (!track) throw new Error('Track not found');

  if (user?.role === Role.ADMIN) return track;

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

// Lấy tracks theo thể loại
export const getTracksByGenre = async (req: Request, genreId: string) => {
  const cacheKey = req.originalUrl;
  if (process.env.USE_REDIS_CACHE === 'true') {
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

  if (!genre) throw new Error('Genre not found');

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
    orderBy: { createdAt: 'desc' },
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
export const getTracksByTypeAndGenre = async (req: Request, type: string, genreId: string) => {
  const cacheKey = req.originalUrl;
  if (process.env.USE_REDIS_CACHE === 'true') {
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
    throw new Error('Invalid track type');
  }

  const genre = await prisma.genre.findUnique({
    where: { id: genreId },
  });

  if (!genre) throw new Error('Genre not found');

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
    orderBy: { createdAt: 'desc' },
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
  if (!user) throw new Error('Unauthorized');

  const track = await prisma.track.findFirst({
    where: {
      id: trackId,
      isActive: true,
      OR: [{ album: null }, { album: { isActive: true } }],
    },
    select: trackSelect,
  });

  if (!track) throw new Error('Track not found');

  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const existingListen = await prisma.history.findFirst({
    where: {
      userId: user.id,
      track: { artistId: track.artistId },
      createdAt: { gte: lastMonth },
    },
  });

  if (!existingListen) {
    await prisma.artistProfile.update({
      where: { id: track.artistId },
      data: { monthlyListeners: { increment: 1 } },
    });
  }

  // Manual upsert logic for History
  const existingHistoryRecord = await prisma.history.findFirst({
    where: {
      userId: user.id,
      trackId: track.id,
      type: 'PLAY', // Assuming 'PLAY' is the correct HistoryType enum value or string
    },
    select: { id: true }, // Select only the ID for efficiency
  });

  if (existingHistoryRecord) {
    // Update existing record
    await prisma.history.update({
      where: { id: existingHistoryRecord.id },
      data: {
        playCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  } else {
    // Create new record
    await prisma.history.create({
      data: {
        type: 'PLAY',
        trackId: track.id,
        userId: user.id,
        duration: track.duration,
        completed: true, // Assuming completion on initial play record
        playCount: 1,
      },
    });
  }

  // Increment track's playCount (moved outside the history logic)
  await prisma.track.update({
    where: { id: track.id },
    data: { playCount: { increment: 1 } },
  });

  return { message: 'Track playback started', track };
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