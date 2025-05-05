import prisma from '../config/db';
import { HistoryType } from '@prisma/client';
import { historySelect } from '../utils/prisma-selects';
import { paginate } from 'src/utils/handle-utils';
import { Request } from 'express';

export const savePlayHistoryService = async (
  userId: string,
  trackId: string,
  duration: number | undefined,
  completed: boolean | undefined
) => {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { id: true, artistId: true },
  });

  if (!track) {
    throw new Error('Track not found');
  }

  const artistId = track.artistId;
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const existingListen = await prisma.history.findFirst({
    where: {
      userId: userId,
      track: { artistId: artistId },
      createdAt: { gte: lastMonth },
    },
  });

  if (!existingListen) {
    await prisma.artistProfile.update({
      where: { id: artistId },
      data: { monthlyListeners: { increment: 1 } },
    });
  }

  // Always create a new history record for each play event
  const history = await prisma.history.create({
    data: {
      type: HistoryType.PLAY,
      duration,
      completed,
      trackId,
      userId: userId,
      playCount: 1, // Set playCount to 1 for each new record
    },
    select: historySelect,
  });

  if (completed) {
    await prisma.track.update({
      where: { id: trackId },
      data: {
        playCount: { increment: 1 },
      },
    });
  }

  return history;
};

export const saveSearchHistoryService = async (userId: string, query: string) => {
  if (!query?.trim()) {
    throw new Error('Search query is required');
  }

  // Check if a similar search exists recently to avoid spamming
  const recentSearch = await prisma.history.findFirst({
    where: {
      userId: userId,
      type: HistoryType.SEARCH,
      query: query,
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes ago
    }
  });

  if(recentSearch) {
    // Update timestamp of the existing recent search instead of creating a new one
    return prisma.history.update({
      where: { id: recentSearch.id },
      data: { updatedAt: new Date() },
      select: historySelect,
    });
  }

  return prisma.history.create({
    data: {
      type: HistoryType.SEARCH,
      query,
      userId: userId,
      duration: null,
      completed: null,
      playCount: null,
    },
    select: historySelect,
  });
};

export const getPlayHistoryService = async (req: Request) => {
  const user = req.user;
  if (!user) {
    throw new Error('Unauthorized');
  }

  return paginate(prisma.history, req, {
    where: {
      userId: user.id,
      type: HistoryType.PLAY,
    },
    select: historySelect,
    orderBy: { updatedAt: 'desc' }, // Order by updated time to show most recent listens first
  });
};

export const getSearchHistoryService = async (req: Request) => {
  const user = req.user;
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Fetch distinct search queries ordered by the most recent update time
  const distinctSearches = await prisma.history.findMany({
    where: {
      userId: user.id,
      type: HistoryType.SEARCH,
    },
    distinct: ['query'],
    orderBy: { updatedAt: 'desc' },
    take: Number(req.query.limit) || 10, // Use limit from query or default
    select: { query: true, updatedAt: true }
  });

  // Fetch the full history entries for these distinct queries
  const histories = await prisma.history.findMany({
    where: {
      userId: user.id,
      type: HistoryType.SEARCH,
      query: { in: distinctSearches.map(s => s.query!) }
    },
    orderBy: { updatedAt: 'desc' },
    select: historySelect,
    take: Number(req.query.limit) || 10, // Apply limit again
  });

  // Group by query and pick the most recent one
  const latestHistoriesMap = new Map<string, any>();
  histories.forEach(h => {
    if (h.query && (!latestHistoriesMap.has(h.query) || h.updatedAt > latestHistoriesMap.get(h.query).updatedAt)) {
      latestHistoriesMap.set(h.query, h);
    }
  });

  const latestHistories = Array.from(latestHistoriesMap.values()) // Get the latest entry for each query
                             .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); // Sort again by updatedAt desc

  // Fix: Count distinct queries separately
  const totalDistinctHistories = await prisma.history.findMany({
    where: {
        userId: user.id,
        type: HistoryType.SEARCH,
    },
    distinct: ['query'],
    select: { query: true } // Select only the distinct field
  });
  const totalHistories = totalDistinctHistories.length;

  return {
    histories: latestHistories,
    pagination: {
      total: totalHistories,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      totalPages: Math.ceil(totalHistories / (Number(req.query.limit) || 10)),
    },
  };
};

export const getAllHistoryService = async (req: Request) => {
  const user = req.user;
  if (!user) {
    throw new Error('Unauthorized');
  }

  return paginate(prisma.history, req, {
    where: {
      userId: user.id,
    },
    select: historySelect,
    orderBy: { updatedAt: 'desc' },
  });
};

// Define simple selects for suggestions
const suggestionTrackSelect = {
  id: true,
  title: true,
  coverUrl: true,
  artist: { select: { id: true, artistName: true } },
};
const suggestionAlbumSelect = {
  id: true,
  title: true,
  coverUrl: true,
  artist: { select: { id: true, artistName: true } },
};
const suggestionArtistSelect = {
  id: true,
  artistName: true,
  avatar: true,
};

export const getSearchSuggestionsService = async (userId: string, limit = 5) => {
  const recentSearches = await prisma.history.findMany({
    where: {
      userId: userId,
      type: HistoryType.SEARCH,
      query: { not: null }, // Ensure query is not null
    },
    distinct: ['query'],
    orderBy: { updatedAt: 'desc' },
    take: limit * 2, // Fetch more initially to increase chances of finding results
    select: { query: true },
  });

  const suggestions: any[] = [];
  const addedIds = new Set<string>(); // To avoid duplicates across types

  for (const search of recentSearches) {
    if (suggestions.length >= limit) break; // Stop if we have enough suggestions
    if (!search.query) continue; // Skip if query is somehow null

    const query = search.query.trim();
    if (!query) continue;

    // Search for tracks
    const tracks = await prisma.track.findMany({
      where: {
        title: { contains: query, mode: 'insensitive' },
        isActive: true,
      },
      select: suggestionTrackSelect,
      take: 1, // Find one match is enough for suggestion
    });

    if (tracks.length > 0 && !addedIds.has(tracks[0].id)) {
        suggestions.push({ type: 'Track', data: tracks[0] });
        addedIds.add(tracks[0].id);
        if (suggestions.length >= limit) break;
    }

    // Search for albums
    const albums = await prisma.album.findMany({
      where: {
        title: { contains: query, mode: 'insensitive' },
        isActive: true,
      },
      select: suggestionAlbumSelect,
      take: 1,
    });

    if (albums.length > 0 && !addedIds.has(albums[0].id)) {
        suggestions.push({ type: 'Album', data: albums[0] });
        addedIds.add(albums[0].id);
        if (suggestions.length >= limit) break;
    }

    // Search for artists
    const artists = await prisma.artistProfile.findMany({
      where: {
        artistName: { contains: query, mode: 'insensitive' },
        isVerified: true,
        isActive: true,
      },
      select: suggestionArtistSelect,
      take: 1,
    });

     if (artists.length > 0 && !addedIds.has(artists[0].id)) {
        suggestions.push({ type: 'Artist', data: artists[0] });
        addedIds.add(artists[0].id);
        if (suggestions.length >= limit) break;
    }
  }

  return suggestions.slice(0, limit); // Ensure we return exactly the limit number
};

export const deleteSearchHistoryService = async (userId: string) => {
  return prisma.history.deleteMany({
    where: {
      userId: userId,
      type: HistoryType.SEARCH,
    },
  });
}; 