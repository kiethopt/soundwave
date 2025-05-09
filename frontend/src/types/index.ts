export interface FormData {
  title: string;
  trackNumber: number;
  releaseDate: string;
  featuredArtists: string[];
}

export interface TrackUploadFormProps {
  album: Album | null;
  newTracks: File[];
  trackDetails: {
    [key: string]: {
      title: string;
      artist: string;
      featuredArtists: SelectedArtist[];
      trackNumber: number;
      releaseDate: string;
      genres: string[];
    };
  };
  isUploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTrackDetailChange: (fileName: string, field: string, value: any) => void;
  artists?: ArtistProfile[];
  availableGenres?: Genre[];
}

export interface SelectedArtist {
  id: string;
  name: string;
}

export interface ArtistRequestFilters {
  startDate?: string;
  endDate?: string;
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
  role: "USER" | "ADMIN"; // Chỉ có USER và ADMIN
  adminLevel?: number;
  currentProfile: "USER" | "ARTIST";
  isActive: boolean;
  followVisibility: boolean;
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
  hasPendingArtistRequest?: boolean;
}

export interface ArtistProfile {
  id: string;
  artistName: string;
  bio?: string;
  avatar?: string;
  artistBanner?: string;
  role: "ARTIST";
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
  featuredInTracks?: { track: Track }[];
  events?: Event[];
  followers?: UserFollow[];
  notifications?: Notification[];
  labelId?: string;
  label?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
}

export interface UserFollow {
  id: string;
  followerId: string;
  followingUserId?: string;
  followingArtistId?: string;
  followingType: "USER" | "ARTIST";
  createdAt: string;
  follower: User;
  followingUser?: User;
  followingArtist?: ArtistProfile;
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
  labelId?: string;
  label?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
}

export interface ArtistRequest {
  id: string;
  artistName: string;
  bio?: string | null;
  socialMediaLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  } | null;
  status: RequestStatus;
  requestedLabelName?: string | null;
  rejectionReason?: string | null;
  user: {
    id: string;
    name?: string | null;
    email: string;
    avatar?: string | null;
  };
  avatarUrl?: string | null;
  idVerificationDocumentUrl?: string | null;
  portfolioLinks?: any | null;
  requestedGenres?: string[];
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
    type: "ALBUM" | "EP" | "SINGLE";
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
  type: "ALBUM" | "EP" | "SINGLE";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  artist: {
    id: string;
    artistName: string;
    avatar?: string | null;
    isVerified?: boolean;
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
  type: "ALBUM" | "EP" | "SINGLE";
  isActive: boolean;
  tempo?: number | null;
  mood?: string | null;
  key?: string | null;
  scale?: string | null;
  danceability?: number | null;
  energy?: number | null;
  createdAt: string;
  updatedAt: string;
  artistId: string;
  albumId?: string;
  labelId?: string;
  album?: {
    id: string;
    title: string;
    coverUrl?: string;
    type: "ALBUM" | "EP" | "SINGLE";
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
  label?: {
    // Giữ optional, nhưng có thể không cần nếu API không trả về
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
  type: "SEARCH" | "PLAY";
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

// Define and export PlaylistPrivacy type
export enum PlaylistPrivacy {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  privacy: PlaylistPrivacy; // Use the exported type
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
    | "NEW_TRACK"
    | "NEW_ALBUM"
    | "NEW_FOLLOW"
    | "ARTIST_REQUEST_APPROVE"
    | "ARTIST_REQUEST_REJECT"
    | "ACCOUNT_ACTIVATED"
    | "ACCOUNT_DEACTIVATED"
    | "ARTIST_REQUEST_SUBMITTED"
    | "CLAIM_REQUEST_SUBMITTED"
    | "CLAIM_REQUEST_APPROVED"
    | "CLAIM_REQUEST_REJECTED"
    | "NEW_REPORT_SUBMITTED"
    | "REPORT_RESOLVED"
    | "LABEL_REGISTRATION_SUBMITTED"
    | "LABEL_REGISTRATION_APPROVED"
    | "LABEL_REGISTRATION_REJECTED";
  message: string;
  isRead: boolean;
  recipientType: "USER" | "ARTIST";
  userId?: string | null;
  artistId?: string | null;
  senderId?: string | null;
  trackId?: string | null;
  albumId?: string | null;
  claimId?: string | null;
  reportId?: string | null;
  labelId?: string | null;
  labelName?: string | null;
  rejectionReason?: string | null;
  count?: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
  artist?: ArtistProfile;
  sender?: Partial<User> | Partial<ArtistProfile> | { name?: string, id?: string };
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
  totalLabels: number;
  totalAlbums: number;
  totalTracks: number;
  totalSystemPlaylists: number;
  topArtists: Array<{
    id: string;
    artistName: string;
    avatar?: string;
    monthlyListeners: number;
  }>;
  monthlyUserData: Array<{ month: string; users: number }>;
}

export interface TrackEditForm {
  title: string;
  releaseDate: string;
  trackNumber: number;
  featuredArtists: string[];
  genres: string[];
}

export interface CreatePlaylistData {
  name: string;
  description?: string;
  privacy?: "PUBLIC" | "PRIVATE";
  type?: "FAVORITE" | "NORMAL";
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
  debugMode: boolean;
  sessionTimeout: number;
  maxUploadSize: number;
  aiModel?: string; // Model hiện tại
  supportedAIModels?: string[]; // Danh sách model được hỗ trợ
}

export interface SystemComponentStatus {
  name: string;
  status: "Available" | "Issue" | "Outage" | "Disabled";
  message?: string;
}

export enum AlbumType {
  ALBUM = "ALBUM",
  EP = "EP",
  SINGLE = "SINGLE",
}

export interface LabelTabsProps {
  theme: "light" | "dark";
  activeTab: "artists" | "albums" | "tracks";
  setActiveTab: (tab: "artists" | "albums" | "tracks") => void;
  displayedArtists: Label["artists"];
  displayedAlbums: Label["albums"];
  displayedTracks: Label["tracks"];
  filteredArtists: Label["artists"];
  filteredAlbums: Label["albums"];
  filteredTracks: Label["tracks"];
  handleAlbumClick: (albumId: string) => void;
  handleTrackClick: (trackId: string) => void;
  formatDate: (dateString: string) => string;
  formatDuration: (seconds: number) => string;
}

export interface LabelInfoCardProps {
  label: Label;
  theme: "light" | "dark";
  formatDate: (dateString: string) => string;
}

// Type for search suggestions
export interface SearchSuggestion {
  type: "Artist" | "Track" | "Album";
  data: {
    id: string;
    title?: string; // For Track/Album
    artistName?: string; // For Artist
    coverUrl?: string; // For Track/Album
    avatar?: string; // For Artist
    artist?: {
      // Nested artist for Track/Album
      id: string;
      artistName: string;
    };
  };
}

export type ReportType =
  | "COPYRIGHT_VIOLATION"
  | "INAPPROPRIATE_CONTENT"
  | "AI_GENERATION_ISSUE"
  | "OTHER";
export type ReportStatus = "PENDING" | "RESOLVED" | "REJECTED";

export interface Report {
  id: string;
  type: ReportType;
  description: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;

  reporter: {
    id: string;
    name?: string;
    email: string;
    username?: string;
    avatar?: string;
  };

  resolver?: {
    id: string;
    name?: string;
    username?: string;
    avatar?: string;
  };

  track?: {
    id: string;
    title: string;
    artist: {
      id: string;
      artistName: string;
      avatar?: string;
      isVerified: boolean;
    };
    album?: {
      id: string;
      title: string;
      coverUrl?: string;
    };
    coverUrl?: string;
    isActive: boolean;
  };

  playlist?: {
    id: string;
    name: string;
    coverUrl?: string;
    privacy: PlaylistPrivacy;
    isAIGenerated: boolean;
    user: {
      id: string;
      name?: string;
      username?: string;
      avatar?: string;
    };
  };

  album?: {
    id: string;
    title: string;
    coverUrl?: string;
    artist: {
      id: string;
      artistName: string;
      avatar?: string;
      isVerified: boolean;
    };
  };
}

export interface ReportFormData {
  type: ReportType;
  description: string;
  trackId?: string;
  playlistId?: string;
  albumId?: string;
}

export enum RequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface LabelRegistrationRequest {
  id: string;
  requestedLabelName: string;
  requestedLabelDescription?: string | null;
  requestedLabelLogoUrl?: string | null;
  requestingArtistId: string;
  requestingArtist: {
    id: string;
    artistName: string;
    avatar?: string | null;
    user?: { 
      email?: string | null;
      name?: string | null;
    }
  };
  status: RequestStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedByAdminId?: string | null;
  reviewedByAdmin?: {
    id: string;
    name?: string | null;
  };
  rejectionReason?: string | null;
  createdLabelId?: string | null;
  createdLabel?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;
}

export interface ArtistClaimRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED"; 
  submittedAt: string;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  proof: string[]; 
  claimingUser: User; 
  artistProfile: {
    id: string;
    artistName: string;
    avatar?: string | null;
    userId?: string | null; 
    isVerified: boolean; 
  };
  reviewedByAdmin?: {
    id: string;
    name?: string | null;
    username?: string | null;
  } | null;
}
