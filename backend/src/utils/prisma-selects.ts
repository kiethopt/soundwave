import { Prisma } from '@prisma/client';

export const labelSelect = {
  id: true,
  name: true,
  logoUrl: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      tracks: true,
      albums: true,
    },
  },
};

export const albumSelect = {
  id: true,
  title: true,
  coverUrl: true,
  releaseDate: true,
  duration: true,
  totalTracks: true,
  type: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  label: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  },
  artist: {
    select: {
      id: true,
      artistName: true,
      avatar: true,
      isVerified: true,
      role: true,
    },
  },
  tracks: {
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
      isActive: true,
      createdAt: true,
      updatedAt: true,
      artistId: true,
      albumId: true,
      label: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      artist: {
        select: {
          id: true,
          artistName: true,
          avatar: true,
          isVerified: true,
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
  labelId: true,
  label: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  },
  artist: {
    select: {
      id: true,
      artistName: true,
      avatar: true,
      isVerified: true,
      role: true,
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
  artistBanner: true,
  role: true,
  socialMediaLinks: true,
  monthlyListeners: true,
  isVerified: true,
  isActive: true,
  verificationRequestedAt: true,
  verifiedAt: true,
  createdAt: true,
  updatedAt: true,
  label: {
    select: {
      id: true,
      name: true,
      logoUrl: true,
    }
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
  albums: {
    select: {
      id: true,
      title: true,
      coverUrl: true,
      releaseDate: true,
      duration: true,
      totalTracks: true,
      type: true,
      isActive: true,
      label: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      tracks: {
        select: {
          id: true,
          title: true,
          duration: true,
          playCount: true,
          trackNumber: true,
          audioUrl: true,
          coverUrl: true,
          isActive: true,
          label: {
            select: {
              id: true,
              name: true,
            },
          },
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
                  isVerified: true,
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
        },
      },
      artist: {
        select: {
          id: true,
          artistName: true,
          isVerified: true,
        },
      },
    },
  },
  tracks: {
    select: {
      id: true,
      title: true,
      duration: true,
      releaseDate: true,
      coverUrl: true,
      audioUrl: true,
      playCount: true,
      type: true,
      trackNumber: true,
      label: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      artist: {
        select: {
          id: true,
          artistName: true,
          isVerified: true,
        },
      },
      album: {
        select: {
          id: true,
          title: true,
        },
      },
      featuredArtists: {
        select: {
          artistProfile: {
            select: {
              id: true,
              artistName: true,
              isVerified: true,
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
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      username: true,
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
      role: true,
      socialMediaLinks: true,
      monthlyListeners: true,
      isVerified: true,
      isActive: true,
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
  role: true, // USER hoặc ADMIN
  isActive: true,
  followVisibility: true,
  currentProfile: true,
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
      isActive: true,
      avatar: true,
      verificationRequestedAt: true,
      role: true, // Role ARTIST
      socialMediaLinks: true,
      verifiedAt: true,
      label: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        }
      },
      albums: {
        select: {
          id: true,
          title: true,
          coverUrl: true,
          releaseDate: true,
          duration: true,
          type: true,
          isActive: true,
          tracks: {
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
        },
      },
      tracks: {
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

// Các hàm khác
export const searchAlbumSelect = {
  id: true,
  title: true,
  coverUrl: true,
  releaseDate: true,
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
        },
      },
      featuredArtists: {
        select: {
          artistProfile: {
            select: {
              id: true,
              artistName: true,
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

export const searchTrackSelect = {
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
  artist: {
    select: {
      id: true,
      artistName: true,
      avatar: true,
      isVerified: true,
    },
  },
  featuredArtists: {
    select: {
      artistProfile: {
        select: {
          id: true,
          artistName: true,
        },
      },
    },
  },
  album: {
    select: {
      id: true,
      title: true,
      coverUrl: true,
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

export const artistRequestSelect = {
  id: true,
  artistName: true,
  avatar: true,
  socialMediaLinks: true,
  verificationRequestedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

export const artistRequestDetailsSelect = {
  id: true,
  artistName: true,
  bio: true,
  avatar: true,
  socialMediaLinks: true,
  verificationRequestedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  albums: {
    select: albumSelect,
  },
  tracks: {
    select: trackSelect,
  },
};
