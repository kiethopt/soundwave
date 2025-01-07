export interface User {
  id: string;
  email: string;
  username: string;
  password?: string;
  name?: string;
  avatar?: string;
  role: 'USER' | 'ADMIN' | 'ARTIST';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Artist {
  id: string;
  name: string;
  bio?: string;
  avatar?: string;
  isVerified: boolean;
  monthlyListeners: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tracks: number;
    albums: number;
  };
}

export interface Album {
  id: string;
  title: string;
  coverUrl?: string;
  releaseDate: string;
  trackCount: number;
  isActive: boolean;
  discordMessageId: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  artist: string | Artist;
  artistId: string;
  uploadedBy: User;
  userId: string;
  tracks?: Track[];
}

export interface Track {
  id: string;
  title: string;
  duration: number;
  releaseDate: string;
  trackNumber?: number;
  coverUrl?: string;
  audioUrl: string;
  audioMessageId: string;
  discordMessageId: string;
  playCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Relations
  artist: string | Artist;
  artistId: string;
  featuredArtists: Artist[];
  album?: Album;
  albumId?: string;
  uploadedBy: User;
  userId: string;
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

  // Relations
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
  createdAt: string;
  updatedAt: string;

  // Relations
  user: User;
  userId: string;
  tracks: Track[];
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}
