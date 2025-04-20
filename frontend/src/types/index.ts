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
      releaseDate?: string;
    };
  };
  isUploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTrackDetailChange: (fileName: string, field: string, value: any) => void;
  artists: ArtistProfile[];
}

export interface ArtistRequestFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  search?: string;
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

// Helper type for useDataTable hook
export interface FetchDataResponse<T> {
  data: T[];
  pagination: { totalPages: number };
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
  artistBanner?: string;
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
  genres?: { genre: Genre }[];
  albums?: Album[];
  tracks?: Track[];
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
  artistName: string;
  bio?: string;
  avatar?: string;
  isVerified: boolean;
  socialMediaLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  monthlyListeners?: number;
  user?: {
    id: string;
    email: string;
    username?: string;
    name?: string;
    avatar?: string;
    role: string;
    isActive: boolean;
  };
  genres?: { genre: Genre }[];
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

export interface Label {
  id: string;
  name: string;
  logoUrl?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    tracks: number;
    albums: number;
  };
  albums?: Array<{
    id: string;
    title: string;
    coverUrl?: string | null;
    releaseDate: string;
    type: 'ALBUM' | 'EP' | 'SINGLE';
    totalTracks: number;
    artist: {
      id: string;
      artistName: string;
      avatar?: string | null;
      isVerified?: boolean;
    };
  }>;
  tracks?: Array<{
    id: string;
    title: string;
    coverUrl?: string | null;
    releaseDate: string;
    duration: number;
    playCount: number;
    artist: {
      id: string;
      artistName: string;
      avatar?: string | null;
      isVerified?: boolean;
    };
    album?: {
      id: string;
      title: string;
    } | null;
  }>;
  artists?: Array<{
    id: string;
    artistName: string;
    avatar?: string | null;
    isVerified?: boolean;
    albumCount: number;
    trackCount: number;
  }>;
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
  labelId?: string; // Thêm trường labelId để khớp với API
  label?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
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
  labelId?: string; // Thêm trường labelId để khớp với API
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
  genres: {
    genre: {
      id: string;
      name: string;
    };
  }[];
  label?: { // Giữ optional, nhưng có thể không cần nếu API không trả về
    id: string;
    name: string;
    logoUrl?: string | null;
  };
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
  privacy: 'PUBLIC' | 'PRIVATE';
  type: string;
  isAIGenerated: boolean;
  totalTracks: number;
  totalDuration: number;
  coverUrl?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  tracks: Track[];
  canEdit?: boolean;
  basedOnMood?: string;
  basedOnGenre?: string;
  basedOnArtist?: string;
  basedOnSongLength?: number;
  basedOnReleaseTime?: string;
  trackCount?: number;
}

export interface Notification {
  id: string;
  type:
  | 'NEW_TRACK'
  | 'NEW_ALBUM'
  | 'EVENT_REMINDER'
  | 'NEW_FOLLOW'
  | 'ARTIST_REQUEST_APPROVE'
  | 'ARTIST_REQUEST_REJECT'
  | 'ACCOUNT_ACTIVATED'
  | 'ACCOUNT_DEACTIVATED';
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
  topArtists: Array<{
    id: string;
    artistName: string;
    avatar?: string;
    monthlyListeners: number;
  }>;
}

export interface TrackEditForm {
  title: string;
  releaseDate: string;
  trackNumber: number;
  featuredArtists: string[];
}

export interface CreatePlaylistData {
  name: string;
  description?: string;
  privacy?: 'PUBLIC' | 'PRIVATE';
  type?: 'FAVORITE' | 'NORMAL';
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PlaylistResponse {
  id: string;
  name: string;
  description?: string;
  tracks: Track[];
}

export interface SystemSettings {
  cacheEnabled: boolean;
  maintenanceMode: boolean;
  debugMode: boolean;
  sessionTimeout: number;
  maxUploadSize: number;
  aiModel?: string; // Model hiện tại
  supportedAIModels?: string[]; // Danh sách model được hỗ trợ
}

export interface SystemComponentStatus {
  name: string;
  status: 'Available' | 'Issue' | 'Outage' | 'Disabled';
  message?: string;
}

export enum AlbumType {
  ALBUM = 'ALBUM',
  EP = 'EP',
  SINGLE = 'SINGLE',
}

export interface LabelTabsProps {
  theme: 'light' | 'dark';
  activeTab: 'artists' | 'albums' | 'tracks';
  setActiveTab: (tab: 'artists' | 'albums' | 'tracks') => void;
  displayedArtists: Label['artists'];
  displayedAlbums: Label['albums'];
  displayedTracks: Label['tracks'];
  filteredArtists: Label['artists'];
  filteredAlbums: Label['albums'];
  filteredTracks: Label['tracks'];
  handleAlbumClick: (albumId: string) => void;
  handleTrackClick: (trackId: string) => void;
  formatDate: (dateString: string) => string;
  formatDuration: (seconds: number) => string;
}

export interface LabelInfoCardProps {
  label: Label;
  theme: 'light' | 'dark';
  formatDate: (dateString: string) => string;
}

// Type for search suggestions
export interface SearchSuggestion {
  type: 'Artist' | 'Track' | 'Album';
  data: {
    id: string;
    title?: string; // For Track/Album
    artistName?: string; // For Artist
    coverUrl?: string; // For Track/Album
    avatar?: string; // For Artist
    artist?: { // Nested artist for Track/Album
      id: string;
      artistName: string;
    };
  };
}
