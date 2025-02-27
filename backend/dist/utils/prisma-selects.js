"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.artistRequestDetailsSelect = exports.artistRequestSelect = exports.searchTrackSelect = exports.searchAlbumSelect = exports.genreSelect = exports.historySelect = exports.userSelect = exports.artistProfileForUserSelect = exports.artistProfileSelect = exports.trackSelect = exports.albumSelect = void 0;
exports.albumSelect = {
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
};
exports.trackSelect = {
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
};
exports.artistProfileSelect = {
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
            tracks: {
                select: {
                    id: true,
                    title: true,
                    duration: true,
                    playCount: true,
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
            album: {
                select: {
                    id: true,
                    title: true,
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
};
exports.artistProfileForUserSelect = {
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
};
exports.userSelect = {
    id: true,
    email: true,
    username: true,
    name: true,
    avatar: true,
    role: true,
    isActive: true,
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
            verificationRequestedAt: true,
            role: true,
            socialMediaLinks: true,
            verifiedAt: true,
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
                },
            },
        },
    },
};
exports.historySelect = {
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
};
exports.genreSelect = {
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
};
exports.searchAlbumSelect = {
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
};
exports.searchTrackSelect = {
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
};
exports.artistRequestSelect = {
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
exports.artistRequestDetailsSelect = {
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
        select: exports.albumSelect,
    },
    tracks: {
        select: exports.trackSelect,
    },
};
//# sourceMappingURL=prisma-selects.js.map