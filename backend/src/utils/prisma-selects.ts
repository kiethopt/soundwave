import { Prisma } from '@prisma/client';

export const albumSelect = {
  id: true,
  title: true,
  coverUrl: true,
  releaseDate: true,
  trackCount: true,
  duration: true,
  type: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  artist: {
    select: {
      id: true,
      artistName: true,
      avatar: true,
      isVerified: true,
    },
  },
  tracks: {
    where: { isActive: true },
    orderBy: { trackNumber: 'asc' },
    select: {
      id: true,
      title: true,
      duration: true,
      releaseDate: true,
      trackNumber: true,
      coverUrl: true,
      audioUrl: true,
      playCount: true,
      type: true,
      artist: {
        select: {
          id: true,
          artistName: true,
          isVerified: true,
        },
      },
      featuredArtists: {
        select: {
          artistProfile: {
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
        },
      },
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
} satisfies Prisma.AlbumSelect;

export const trackSelect = {
  id: true,
  title: true,
  duration: true,
  releaseDate: true,
  trackNumber: true,
  coverUrl: true,
  audioUrl: true,
  playCount: true,
  type: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  artistId: true,
  artist: {
    select: {
      id: true,
      artistName: true,
      avatar: true,
      isVerified: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  featuredArtists: {
    select: {
      artistProfile: {
        select: {
          id: true,
          artistName: true,
          avatar: true,
          isVerified: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
  album: {
    select: {
      id: true,
      title: true,
      coverUrl: true,
      type: true,
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
} satisfies Prisma.TrackSelect;

export const artistProfileSelect = {
  id: true,
  artistName: true,
  bio: true,
  avatar: true,
  socialMediaLinks: true,
  monthlyListeners: true,
  isVerified: true,
  verificationRequestedAt: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
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
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  },
} satisfies Prisma.ArtistProfileSelect;

export const artistProfileForUserSelect = {
  artistProfile: {
    select: {
      id: true,
      artistName: true,
      bio: true,
      avatar: true,
      socialMediaLinks: true,
      monthlyListeners: true,
      isVerified: true,
      verificationRequestedAt: true,
      verifiedAt: true,
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
    },
  },
} satisfies Prisma.UserSelect;

export const userSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  avatar: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  passwordResetToken: true,
  passwordResetExpires: true,
  artistProfile: {
    select: {
      id: true,
      artistName: true,
      isVerified: true,
      verificationRequestedAt: true,
    },
  },
} satisfies Prisma.UserSelect;

export const historySelect = {
  id: true,
  type: true,
  query: true,
  duration: true,
  completed: true,
  playCount: true,
  createdAt: true,
  updatedAt: true,
  track: {
    select: {
      id: true,
      title: true,
      duration: true,
      coverUrl: true,
      audioUrl: true,
      artist: {
        select: {
          id: true,
          artistName: true,
          avatar: true,
        },
      },
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  },
} satisfies Prisma.HistorySelect;

export const genreSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  albums: {
    select: {
      album: {
        select: {
          id: true,
          title: true,
          coverUrl: true,
          releaseDate: true,
          trackCount: true,
          duration: true,
          type: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  },
  tracks: {
    select: {
      track: {
        select: {
          id: true,
          title: true,
          duration: true,
          releaseDate: true,
          trackNumber: true,
          coverUrl: true,
          audioUrl: true,
          playCount: true,
          type: true,
          isActive: true,
        },
      },
    },
  },
  artistProfiles: {
    select: {
      artistProfile: {
        select: {
          id: true,
          artistName: true,
          avatar: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.GenreSelect;
