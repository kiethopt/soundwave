import { ChangeEvent, FormEvent } from 'react';

// Form Data Types
export interface FormData {
  title: string;
  trackNumber: number;
  releaseDate: string;
  featuredArtists: string[];
}

export interface TrackUploadFormProps {
  album: Album;
  newTracks: File[];
  trackDetails: {
    [key: string]: {
      title: string;
      artist: string;
      featuredArtists: string[];
      trackNumber: number;
      releaseDate: string;
    };
  };
  isUploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTrackDetailChange: (fileName: string, field: string, value: any) => void;
  artists: ArtistProfile[];
}

// API Types
export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

// Model Types
export interface User {
  id: string;
  email: string;
  username?: string;
  password?: string;
  name?: string;
  avatar?: string;
  role: 'USER' | 'ADMIN'; // Chỉ có USER và ADMIN
  currentProfile: 'USER' | 'ARTIST';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  artistProfile?: ArtistProfile;
  history?: History[];
  playlists?: Playlist[];
  followed?: UserFollow[];
  followers?: UserFollow[];
  notifications?: Notification[];
  likedTracks?: Track[];
}

export interface ArtistProfile {
  id: string;
  artistName: string;
  bio?: string;
  avatar?: string;
  role: 'ARTIST';
  socialMediaLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  monthlyListeners: number;
  isVerified: boolean;
  isActive: boolean;
  verificationRequestedAt?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  userId: string;
  genres?: Genre[];
  albums?: {
    data: Album[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  tracks?: {
    data: Track[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  events?: Event[];
  followers?: UserFollow[];
  notifications?: Notification[];
}

export interface UserFollow {
  id: string;
  followerId: string;
  followingUserId?: string; // ID của User được follow (nếu followingType là USER)
  followingArtistId?: string; // ID của ArtistProfile được follow (nếu followingType là ARTIST)
  followingType: 'USER' | 'ARTIST';
  createdAt: string;
  follower: User;
  followingUser?: User; // User được follow (nếu followingType là USER)
  followingArtist?: ArtistProfile; // ArtistProfile được follow (nếu followingType là ARTIST)
}

export interface Artist {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  createdAt: string;
  artistProfile: ArtistProfile;
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
  isVerified: boolean;
}

export interface Album {
  id: string;
  title: string;
  coverUrl?: string;
  releaseDate: string;
  duration: number;
  totalTracks: number;
  type: 'ALBUM' | 'EP' | 'SINGLE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  artist: {
    id: string;
    artistName: string;
    avatar: string | null;
    isVerified: boolean;
  };
  tracks: Track[];
  genres: {
    genre: {
      id: string;
      name: string;
    };
  }[];
}

export interface Track {
  id: string;
  title: string;
  duration: number;
  releaseDate: string;
  trackNumber: number;
  coverUrl?: string;
  audioUrl: string;
  playCount: number;
  type: 'ALBUM' | 'EP' | 'SINGLE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  artistId: string;
  albumId?: string;
  album?: {
    id: string;
    title: string;
    coverUrl?: string;
    type: 'ALBUM' | 'EP' | 'SINGLE';
  };
  artist: {
    id: string;
    artistName: string;
    avatar: string | null;
    isVerified: boolean;
  };
  featuredArtists: {
    artistProfile: {
      id: string;
      artistName: string;
      avatar: string | null;
      isVerified: boolean;
    };
  }[];
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
  type: 'NEW_TRACK' | 'NEW_ALBUM' | 'EVENT_REMINDER' | 'NEW_FOLLOW';
  message: string;
  isRead: boolean;
  recipientType: 'USER' | 'ARTIST'; // Loại người nhận (USER hoặc ARTIST)
  recipientId: string; // ID của người nhận (User hoặc ArtistProfile)
  senderId?: string; // ID của người gửi thông báo (nếu có)
  count?: number; // Số lượng hành động trong thông báo nhóm
  createdAt: string;
  updatedAt: string;
  user?: User; // Quan hệ với User (nếu recipientType là USER)
  artist?: ArtistProfile; // Quan hệ với ArtistProfile (nếu recipientType là ARTIST)
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

export interface Stats {
  totalUsers: number;
  totalArtists: number;
  totalArtistRequests: number;
  totalGenres: number;
  trendingArtist: {
    id: string;
    artistName: string;
    monthlyListeners: number;
    trackCount: number;
  };
}

export interface TrackEditForm {
  title: string;
  releaseDate: string;
  trackNumber: number;
  featuredArtists: string[];
}
