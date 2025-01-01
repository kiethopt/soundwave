export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  avatar?: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  releaseDate: string;
  trackCount: number;
  tracks: Track[];
  uploadedBy: User;
  discordMessageId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  featuredArtists?: string | null;
  duration: number;
  releaseDate: string;
  trackNumber: number | null;
  coverUrl?: string;
  audioUrl: string;
  audioMessageId: string;
  album?: Album;
  albumId?: string;
  uploadedBy: User;
  discordMessageId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}
