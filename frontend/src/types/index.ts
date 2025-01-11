export interface User {
  id: string;
  email: string;
  username?: string;
  password?: string;
  name?: string;
  avatar?: string;
  role: 'USER' | 'ADMIN' | 'ARTIST';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  bio?: string;
  isVerified: boolean;
  verificationRequestedAt?: string;
  verifiedAt?: string;
  monthlyListeners: number;
  artistProfile?: ArtistProfile;
  albums?: Album[];
  tracks?: Track[];
  history?: History[];
  playlists?: Playlist[];
  followedArtists?: User[];
  followers?: User[];
  notifications?: Notification[];
  events?: Event[];
  likedTracks?: Track[];
}

export interface ArtistProfile {
  id: string;
  artistName: string;
  bio?: string;
  socialMediaLinks?: any;
  monthlyListeners: number;
  createdAt: string;
  updatedAt: string;
  user: User;
  userId: string;
  genres?: Genre[];
  tracks?: Track[];
}

export interface Artist {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  createdAt: string;
  artistProfile: {
    id: string;
    artistName: string;
    bio: string | null;
    avatar: string | null;
    socialMediaLinks?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
    monthlyListeners: number;
    isVerified: boolean;
    verificationRequestedAt: string | null;
    verifiedAt: string | null;
    createdAt: string;
    genres?: {
      genre: {
        id: string;
        name: string;
      };
    }[];
  };
  albums?: {
    id: string;
    title: string;
    coverUrl?: string;
    releaseDate: string;
    trackCount: number;
    duration: number;
    type: 'ALBUM' | 'EP' | 'SINGLE';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
  tracks?: {
    id: string;
    title: string;
    duration: number;
    releaseDate: string;
    trackNumber?: number;
    coverUrl?: string;
    audioUrl: string;
    playCount: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }[];
}

export interface ArtistRequest {
  id: string;
  artistName: string;
  bio?: string;
  socialMediaLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  verificationRequestedAt: string;
  avatar?: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Album {
  id: string;
  title: string;
  coverUrl?: string;
  releaseDate: string;
  trackCount: number;
  duration: number;
  type: 'ALBUM' | 'EP' | 'SINGLE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  artist: User;
  artistId: string;
  tracks?: Track[];
  genres?: Genre[];
}

export interface Track {
  id: string;
  title: string;
  duration: number;
  releaseDate: string;
  trackNumber?: number;
  coverUrl?: string;
  audioUrl: string;
  playCount: number;
  type: 'ALBUM' | 'EP' | 'SINGLE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  artist: User;
  artistId: string;
  featuredArtists?: ArtistProfile[];
  album?: Album;
  albumId?: string;
  genres?: Genre[];
}

export interface Genre {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  albums?: Album[];
  tracks?: Track[];
  artistProfiles?: ArtistProfile[];
}

export interface History {
  id: string;
  type: 'SEARCH' | 'PLAY';
  query?: string;
  duration?: number;
  completed?: boolean;
  playCount: number;
  createdAt: string;
  updatedAt: string;
  track?: Track;
  trackId?: string;
  user: User;
  userId: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  privacy: 'PUBLIC' | 'PRIVATE';
  type: 'FAVORITE' | 'NORMAL';
  isAIGenerated: boolean;
  totalTracks: number;
  totalDuration: number;
  createdAt: string;
  updatedAt: string;
  user: User;
  userId: string;
  tracks?: Track[];
}

export interface Notification {
  id: string;
  type: 'NEW_TRACK' | 'NEW_ALBUM' | 'EVENT' | 'FOLLOW';
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  user: User;
  userId: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  artist: User;
  artistId: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}
