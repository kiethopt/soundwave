import prisma from '../config/db';
import { labelSelect } from '../utils/prisma-selects';

export const getAllLabels = async () => {
  return prisma.label.findMany({
    orderBy: {
      name: 'asc',
    },
    select: labelSelect,
  });
};

export const getLabelById = async (id: string) => {
  // First, fetch the label with its albums and tracks
  const label = await prisma.label.findUnique({
    where: { id },
    select: {
      ...labelSelect,
      albums: {
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          coverUrl: true,
          releaseDate: true,
          type: true,
          totalTracks: true,
          artist: {
            select: {
              id: true,
              artistName: true,
              avatar: true,
              isVerified: true,
            },
          },
        },
        orderBy: { releaseDate: 'desc' },
      },
      tracks: {
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          coverUrl: true,
          releaseDate: true,
          duration: true,
          playCount: true,
          artist: {
            select: {
              id: true,
              artistName: true,
              avatar: true,
              isVerified: true,
            },
          },
          album: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { releaseDate: 'desc' },
      },
    },
  });

  if (!label) return null;

  // Extract and deduplicate artists
  const artistMap = new Map();

  // Add artists from albums
  label.albums?.forEach((album) => {
    if (album.artist) {
      const artistId = album.artist.id;

      if (!artistMap.has(artistId)) {
        artistMap.set(artistId, {
          ...album.artist,
          albumCount: 0,
          trackCount: 0,
        });
      }

      const artist = artistMap.get(artistId);
      artist.albumCount += 1;
      artistMap.set(artistId, artist);
    }
  });

  // Add artists from tracks
  label.tracks?.forEach((track) => {
    if (track.artist) {
      const artistId = track.artist.id;

      if (!artistMap.has(artistId)) {
        artistMap.set(artistId, {
          ...track.artist,
          albumCount: 0,
          trackCount: 0,
        });
      }

      const artist = artistMap.get(artistId);
      artist.trackCount += 1;
      artistMap.set(artistId, artist);
    }
  });

  // Convert map to array and sort by artist name
  const artists = Array.from(artistMap.values()).sort((a, b) =>
    a.artistName.localeCompare(b.artistName)
  );

  // Return structured response
  return {
    ...label,
    artists: artists,
  };
};

export const createLabel = async (data: any) => {
  return prisma.label.create({
    data,
    select: labelSelect,
  });
};

export const updateLabel = async (id: string, data: any) => {
  return prisma.label.update({
    where: { id },
    data,
    select: labelSelect,
  });
};

export const deleteLabel = async (id: string) => {
  return prisma.label.delete({
    where: { id },
  });
};
