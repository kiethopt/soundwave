"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.artistClaimRequestDetailsSelect = exports.artistClaimRequestSelect = exports.artistRequestDetailsSelect = exports.artistRequestSelect = exports.searchTrackSelect = exports.searchAlbumSelect = exports.genreSelect = exports.historySelect = exports.userSelect = exports.artistProfileForUserSelect = exports.artistProfileSelect = exports.trackSelect = exports.albumSelect = exports.labelSelect = void 0;
exports.labelSelect = {
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
            album: {
                select: {
                    id: true,
                    type: true
                }
            },
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
};
exports.artistProfileSelect = {
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
    featuredInTracks: {
        where: {
            track: { isActive: true }
        },
        select: {
            track: {
                select: exports.trackSelect
            }
        },
        orderBy: {
            track: {
                releaseDate: 'desc'
            }
        },
        take: 10
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
            role: true,
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
    requestedLabelName: true,
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
exports.artistClaimRequestSelect = {
    id: true,
    status: true,
    submittedAt: true,
    claimingUser: { select: { id: true, name: true, username: true, email: true, avatar: true } },
    artistProfile: { select: { id: true, artistName: true, avatar: true, userId: true, isVerified: true } },
};
exports.artistClaimRequestDetailsSelect = {
    id: true,
    status: true,
    submittedAt: true,
    proof: true,
    reviewedAt: true,
    rejectionReason: true,
    claimingUser: { select: exports.userSelect },
    artistProfile: {
        select: exports.artistProfileSelect
    },
    reviewedByAdmin: { select: { id: true, name: true, username: true } },
};
//# sourceMappingURL=prisma-selects.js.map