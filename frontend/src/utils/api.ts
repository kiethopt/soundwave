import { ArtistRequestFilters, CreatePlaylistData } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// Helper function giúp giảm bớt lặp code
const fetchWithAuth = async (
  url: string,
  options: RequestInit = {},
  token?: string
) => {
  const sessionId = localStorage.getItem('sessionId');
  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(sessionId && { 'Session-ID': sessionId }),
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'An unexpected error occurred';
    let errorCode = '';

    try {
      const errorResponse = JSON.parse(errorText);
      errorMessage = errorResponse.message || errorMessage;
      errorCode = errorResponse.code || '';

      // Thêm xử lý error code cho tài khoản bị khóa
      if (errorCode === 'ARTIST_DEACTIVATED') {
        errorMessage = 'Your artist account has been deactivated';
      }
    } catch (e) {
      errorMessage = errorText;
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

// Interfaces
interface RegisterData {
  email: string;
  password: string;
  username: string;
  name?: string;
}

interface LoginData {
  emailOrUsername: string;
  password: string;
}

interface ResetPasswordData {
  token: string;
  newPassword: string;
}

export const api = {
  auth: {
    register: async (data: RegisterData) =>
      fetchWithAuth('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: async (data: LoginData) =>
      fetchWithAuth('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    requestPasswordReset: async (email: string) =>
      fetchWithAuth('/api/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    resetPassword: async (data: ResetPasswordData) =>
      fetchWithAuth('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    validateToken: async (token: string) =>
      fetchWithAuth('/api/auth/validate-token', { method: 'GET' }, token),

    switchProfile: async (token: string) => {
      return fetchWithAuth(
        '/api/auth/switch-profile',
        { method: 'POST' },
        token
      );
    },

    logout: async (token: string) =>
      fetchWithAuth('/api/auth/logout', { method: 'POST' }, token),
  },

  session: {
    handleAudioPlay: async (userId: string, sessionId: string, token: string) =>
      fetchWithAuth(
        `/api/session/handle-audio-play`,
        {
          method: 'POST',
          body: JSON.stringify({ userId, sessionId }),
        },
        token
      ),
  },

  admin: {
    getAIModelStatus: async (token: string) =>
      fetchWithAuth('/api/admin/system/ai-model', { method: 'GET' }, token),

    updateAIModelStatus: async (model: string, token: string) =>
      fetchWithAuth(
        '/api/admin/system/ai-model',
        {
          method: 'POST',
          body: JSON.stringify({ model }),
        },
        token
      ),

    getArtistRequests: async (
      token: string,
      page: number = 1,
      limit: number = 10,
      filters?: ArtistRequestFilters
    ) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters) {
        if (filters.startDate) {
          params.append('startDate', filters.startDate.toISOString());
        }
        if (filters.endDate) {
          params.append('endDate', filters.endDate.toISOString());
        }
        if (filters.status) {
          params.append('status', filters.status);
        }
        if (filters.search) {
          params.append('search', filters.search);
        }
      }

      return fetchWithAuth(
        `/api/admin/artist-requests?${params.toString()}`,
        { method: 'GET' },
        token
      );
    },

    getArtistRequestDetail: async (requestId: string, token: string) =>
      fetchWithAuth(
        `/api/admin/artist-requests/${requestId}`,
        { method: 'GET' },
        token
      ),

    approveArtistRequest: async (requestId: string, token: string) =>
      fetchWithAuth(
        '/api/admin/artist-requests/approve',
        {
          method: 'POST',
          body: JSON.stringify({ requestId }),
        },
        token
      ),

    rejectArtistRequest: async (
      requestId: string,
      reason: string = '',
      token: string
    ) =>
      fetchWithAuth(
        '/api/admin/artist-requests/reject',
        {
          method: 'POST',
          body: JSON.stringify({ requestId, reason }),
        },
        token
      ),

    getAllArtists: async (
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/admin/artists?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: 'GET' },
        token
      ),

    getArtistById: async (id: string, token: string) =>
      fetchWithAuth(`/api/admin/artists/${id}`, { method: 'GET' }, token),

    getAllUsers: async (
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/admin/users?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: 'GET' },
        token
      ),

    getUserById: async (id: string, token: string) =>
      fetchWithAuth(`/api/admin/users/${id}`, { method: 'GET' }, token),

    updateUser: async (
      userId: string,
      data: FormData | { isActive?: boolean; reason?: string },
      token: string
    ) => {
      if (data instanceof FormData) {
        return fetchWithAuth(
          `/api/admin/users/${userId}`,
          {
            method: 'PUT',
            body: data,
          },
          token
        );
      } else {
        const postData = {
          ...data,
          isActive: data.isActive?.toString(),
        };

        return fetchWithAuth(
          `/api/admin/users/${userId}`,
          {
            method: 'PUT',
            body: JSON.stringify(postData),
          },
          token
        );
      }
    },

    updateArtist: async (
      artistId: string,
      data: FormData | { isActive?: boolean; reason?: string } | any,
      token: string
    ) => {
      if (data instanceof FormData) {
        return fetchWithAuth(
          `/api/admin/artists/${artistId}`,
          {
            method: 'PUT',
            body: data,
          },
          token
        );
      } else {
        // Make sure we convert boolean values to strings consistently
        if (data.hasOwnProperty('isActive')) {
          data = {
            ...data,
            isActive: data.isActive?.toString(),
          };
        }

        return fetchWithAuth(
          `/api/admin/artists/${artistId}`,
          {
            method: 'PUT',
            body: JSON.stringify(data),
          },
          token
        );
      }
    },

    deleteUser: async (id: string, token: string) =>
      fetchWithAuth(`/api/admin/users/${id}`, { method: 'DELETE' }, token),

    deleteArtist: async (id: string, token: string) =>
      fetchWithAuth(`/api/admin/artists/${id}`, { method: 'DELETE' }, token),

    getAllGenres: async (
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/admin/genres?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: 'GET' },
        token
      ),

    createGenre: async (data: any, token: string) =>
      fetchWithAuth(
        '/api/admin/genres',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        token
      ),

    updateGenre: async (genreId: string, data: FormData, token: string) =>
      fetchWithAuth(
        `/api/admin/genres/${genreId}`,
        {
          method: 'PUT',
          body: data,
        },
        token
      ),

    deleteGenre: async (id: string, token: string) =>
      fetchWithAuth(`/api/admin/genres/${id}`, { method: 'DELETE' }, token),

    getCacheStatus: async (token: string) =>
      fetchWithAuth('/api/admin/system/cache', { method: 'GET' }, token),

    updateCacheStatus: async (enabled: boolean, token: string) =>
      fetchWithAuth(
        '/api/admin/system/cache',
        {
          method: 'POST',
          body: JSON.stringify({ enabled }),
        },
        token
      ),

    getRecommendationMatrix: async (limit: number, token: string) =>
      fetchWithAuth(
        `/api/admin/analytics/matrix?limit=${limit}`,
        { method: 'GET' },
        token
      ),

    updateGlobalPlaylist: async (token: string) =>
      fetchWithAuth(
        '/api/admin/playlists/global/update',
        { method: 'POST' },
        token
      ),
  },

  user: {
    getUserById: async (id: string, token: string) => {
      // Gọi API lấy thông tin user
      // Tuỳ thuộc vào backend route bạn có
      // Ví dụ: /api/admin/users/:id hoặc /api/user/profile/:id
      const response = await fetchWithAuth(
        `/api/user/profile/${id}`,
        { method: 'GET' },
        token
      );
      return response; // hoặc response.data tuỳ fetchWithAuth
    },

    searchAll: async (query: string, token: string) =>
      fetchWithAuth(
        `/api/user/search-all?q=${query}`,
        { method: 'GET' },
        token
      ),

    getAllGenres: async () =>
      fetchWithAuth('/api/user/genres', { method: 'GET' }),

    followUserOrArtist: async (followingId: string, token: string) =>
      fetchWithAuth(
        `/api/user/follow/${followingId}`,
        {
          method: 'POST',
        },
        token
      ),

    unfollowUserOrArtist: async (followingId: string, token: string) =>
      fetchWithAuth(
        `/api/user/unfollow/${followingId}`,
        {
          method: 'DELETE',
        },
        token
      ),

    getFollowers: async (token: string) =>
      fetchWithAuth('/api/user/followers', { method: 'GET' }, token),

    getFollowing: async (token: string) =>
      fetchWithAuth('/api/user/following', { method: 'GET' }, token),

    requestArtistRole: async (token: string, data: FormData) =>
      fetchWithAuth(
        '/api/user/request-artist',
        {
          method: 'POST',
          body: data,
        },
        token
      ),

    editProfile: async (token: string, data: FormData) =>
      fetchWithAuth(
        '/api/user/edit-profile',
        {
          method: 'PUT',
          body: data,
        },
        token
      ),

    checkArtistRequest: async (
      token: string
    ): Promise<{
      hasPendingRequest: boolean;
      isVerified: boolean;
    }> => {
      return fetchWithAuth(
        '/api/user/check-artist-request',
        { method: 'GET' },
        token
      );
    },

    getRecommendedArtists: async (token: string) =>
      fetchWithAuth('/api/user/recommendedArtists', { method: 'GET' }, token),

    getNewestAlbums: async (token: string) =>
      fetchWithAuth('/api/user/newestAlbums', { method: 'GET' }, token),

    getNewestTracks: async (token: string) =>
      fetchWithAuth('/api/user/newestTracks', { method: 'GET' }, token),

    getTopTracks: async (token: string) =>
      fetchWithAuth('/api/user/topTracks', { method: 'GET' }, token),

    getTopArtists: async (token: string) =>
      fetchWithAuth('/api/user/topArtists', { method: 'GET' }, token),

    getTopAlbums: async (token: string) =>
      fetchWithAuth('/api/user/topAlbums', { method: 'GET' }, token),

    // User profile API
    getUserTopAlbums: async (id: string, token: string) =>
      fetchWithAuth(`/api/user/topAlbums/${id}`, { method: 'GET' }, token),

    getUserTopTracks: async (id: string, token: string) =>
      fetchWithAuth(`/api/user/topTracks/${id}`, { method: 'GET' }, token),

    getUserTopArtists: async (id: string, token: string) =>
      fetchWithAuth(`/api/user/topArtists/${id}`, { method: 'GET' }, token),
  },

  artists: {
    getAll: async (token: string, page: number, limit: number) =>
      fetchWithAuth(
        `/api/admin/artists?page=${page}&limit=${limit}`,
        { method: 'GET' },
        token
      ),

    getRequests: async (token: string, page: number, limit: number) =>
      fetchWithAuth(
        `/api/admin/artist-requests?page=${page}&limit=${limit}`,
        { method: 'GET' },
        token
      ),

    getById: async (id: string, token: string) =>
      fetchWithAuth(`/api/admin/artists/${id}`, { method: 'GET' }, token),

    getArtistById: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/profile/${id}`, { method: 'GET' }, token),

    create: async (data: FormData, token: string) =>
      fetchWithAuth(
        '/api/admin/artists',
        { method: 'POST', body: data },
        token
      ),

    getProfile: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/profile/${id}`, { method: 'GET' }, token),

    updateProfile: async (id: string, data: FormData, token: string) =>
      fetchWithAuth(
        `/api/artist/profile/${id}`,
        {
          method: 'PUT',
          body: data,
        },
        token
      ),

    getStats: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/stats/${id}`, { method: 'GET' }, token),

    getAllGenres: async (
      token: string,
      page: number = 1,
      limit: number = 100
    ) =>
      fetchWithAuth(
        `/api/artist/genres?page=${page}&limit=${limit}`,
        { method: 'GET' },
        token
      ),

    getTrackByArtistId: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/tracks/${id}`, { method: 'GET' }, token),

    getAlbumByArtistId: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/albums/${id}`, { method: 'GET' }, token),

    getRelatedArtists: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/related/${id}`, { method: 'GET' }, token),

    getAllTracks: async (
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/tracks?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: 'GET' },
        token
      ),

    getAllAlbums: async (
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/albums?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: 'GET' },
        token
      ),

    getArtistAlbums: async (
      artistId: string,
      token: string,
      page: number,
      limit: number
    ) =>
      fetchWithAuth(
        `/api/artist/${artistId}/albums?page=${page}&limit=${limit}`,
        { method: 'GET' },
        token
      ),

    updateMonthlyListeners: async (id: string, token: string) =>
      fetchWithAuth(
        `/api/admin/artists/${id}/update-monthly-listeners`,
        {
          method: 'POST',
        },
        token
      ),

    getAllArtistsProfile: async (
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/artist/profiles?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: 'GET' },
        token
      ),
  },

  artist: {
    getStats: async (token: string) =>
      fetchWithAuth('/api/artist/stats', { method: 'GET' }, token),
  },

  tracks: {
    getAll: async (
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/tracks?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: 'GET' },
        token
      ),

    getById: async (id: string, token: string) =>
      fetchWithAuth(`/api/tracks/${id}`, { method: 'GET' }, token),

    getByType: async (type: string, token: string) =>
      fetchWithAuth(`/api/tracks/type/${type}`, { method: 'GET' }, token),

    getByGenre: async (genreId: string, token: string) =>
      fetchWithAuth(`/api/tracks/genre/${genreId}`, { method: 'GET' }, token),

    getByTypeAndGenre: async (type: string, genreId: string, token: string) =>
      fetchWithAuth(
        `/api/tracks/type/${type}/genre/${genreId}`,
        { method: 'GET' },
        token
      ),

    create: async (formData: FormData, token: string) =>
      fetchWithAuth('/api/tracks', { method: 'POST', body: formData }, token),

    update: async (trackId: string, data: FormData, token: string) =>
      fetchWithAuth(
        `/api/tracks/${trackId}`,
        {
          method: 'PUT',
          body: data,
        },
        token
      ),

    delete: async (id: string, token: string) =>
      fetchWithAuth(`/api/tracks/${id}`, { method: 'DELETE' }, token),

    toggleVisibility: async (trackId: string, token: string) =>
      fetchWithAuth(
        `/api/tracks/${trackId}/toggle-visibility`,
        { method: 'PUT' },
        token
      ),

    search: async (
      query: string,
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/tracks/search?${
          queryParams || `q=${query}&page=${page}&limit=${limit}`
        }`,
        { method: 'GET' },
        token
      ),

    like: async (trackId: string, token: string) =>
      fetchWithAuth(`/api/tracks/${trackId}/like`, { method: 'POST' }, token),

    unlikeTrack: async (trackId: string, token: string) =>
      fetchWithAuth(`/api/tracks/${trackId}/like`, { method: 'DELETE' }, token),

    checkLiked: async (trackId: string, token: string) =>
      fetchWithAuth(
        `/api/tracks/${trackId}/liked`,
        {
          method: 'GET',
        },
        token
      ),
  },

  history: {
    getPlayHistory: async (token: string) =>
      fetchWithAuth('/api/history/play', { method: 'GET' }, token),

    getSearchHistory: async (token: string) =>
      fetchWithAuth('/api/history/search', { method: 'GET' }, token),

    getAllHistory: async (token: string) =>
      fetchWithAuth('/api/history', { method: 'GET' }, token),

    savePlayHistory: async (
      data: { trackId: string; duration: number; completed: boolean },
      token: string
    ) =>
      fetchWithAuth(
        '/api/history/play',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        token
      ),

    saveSearchHistory: async (query: string, token: string) =>
      fetchWithAuth(
        '/api/history/search',
        {
          method: 'POST',
          body: JSON.stringify({ query }),
        },
        token
      ),
  },

  albums: {
    getAll: async (
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/albums?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: 'GET' },
        token
      ),

    getById: async (id: string, token?: string) => {
      try {
        return await fetchWithAuth(
          `/api/albums/${id}`,
          { method: 'GET' },
          token
        );
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    create: async (data: FormData, token: string) =>
      fetchWithAuth('/api/albums', { method: 'POST', body: data }, token),

    update: async (id: string, data: FormData, token: string) =>
      fetchWithAuth(`/api/albums/${id}`, { method: 'PUT', body: data }, token),

    delete: async (id: string, token: string) =>
      fetchWithAuth(`/api/albums/${id}`, { method: 'DELETE' }, token),

    toggleVisibility: async (albumId: string, token: string) =>
      fetchWithAuth(
        `/api/albums/${albumId}/toggle-visibility`,
        { method: 'PUT' },
        token
      ),

    uploadTracks: async (id: string, data: FormData, token: string) => {
      return fetchWithAuth(
        `/api/albums/${id}/tracks`,
        {
          method: 'POST',
          body: data,
          headers: {},
        },
        token
      );
    },

    search: async (
      query: string,
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/albums/search?${
          queryParams || `q=${query}&page=${page}&limit=${limit}`
        }`,
        { method: 'GET' },
        token
      ),

    playAlbum: async (albumId: string, token: string) =>
      fetchWithAuth(`/api/albums/${albumId}/play`, { method: 'POST' }, token),

    getNewestAlbums: async (token?: string) =>
      fetchWithAuth('/api/albums/newest', { method: 'GET' }, token),

    getHotAlbums: async (token?: string) =>
      fetchWithAuth('/api/albums/hot', { method: 'GET' }, token),
  },

  genres: {
    getAll: async (
      token: string,
      page: number = 1,
      limit: number = 10,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/genres?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: 'GET' },
        token
      ),
  },

  dashboard: {
    getStats: async (token: string) =>
      fetchWithAuth('/api/admin/stats', { method: 'GET' }, token),
  },

  notifications: {
    // Lấy danh sách notifications
    getList: async (token: string) =>
      fetchWithAuth('/api/notifications', { method: 'GET' }, token),

    // Lấy số lượng thông báo chưa đọc
    getUnreadCount: async (token: string) =>
      fetchWithAuth(
        '/api/notifications/unread-count',
        { method: 'GET' },
        token
      ),

    // Đánh dấu 1 thông báo đã đọc
    markAsRead: async (notificationId: string, token: string) =>
      fetchWithAuth(
        `/api/notifications/${notificationId}/read`,
        { method: 'PATCH' },
        token
      ),

    // Đánh dấu tất cả thông báo đã đọc
    markAllAsRead: async (token: string) =>
      fetchWithAuth('/api/notifications/read-all', { method: 'PATCH' }, token),

    // Xóa tất cả thông báo
    deleteAll: async (token: string) =>
      fetchWithAuth(
        '/api/notifications/delete-all',
        { method: 'DELETE' },
        token
      ),

    // Xóa các thông báo đã đọc
    deleteRead: async (token: string) =>
      fetchWithAuth(
        '/api/notifications/delete-read',
        { method: 'DELETE' },
        token
      ), // Thêm dòng này
  },

  playlists: {
    create: async (data: CreatePlaylistData, token: string) =>
      fetchWithAuth(
        '/api/playlists',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        token
      ),

    getAll: async (token: string) =>
      fetchWithAuth('/api/playlists', { method: 'GET' }, token),

    getById: async (id: string, token?: string) => {
      try {
        return await fetchWithAuth(
          `/api/playlists/${id}`,
          { method: 'GET' },
          token
        );
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    update: async (id: string, data: any, token: string) => {
      const response = await fetch(`${API_BASE}/api/playlists/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Không thể cập nhật playlist');
      }

      return response.json();
    },

    removeTrack: async (playlistId: string, trackId: string, token: string) => {
      try {
        return await fetchWithAuth(
          `/api/playlists/${playlistId}/tracks/${trackId}`,
          { method: 'DELETE' },
          token
        );
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    addTrack: async (playlistId: string, trackId: string, token: string) => {
      try {
        console.log(`API: Adding track ${trackId} to playlist ${playlistId}`);
        return await fetchWithAuth(
          `/api/playlists/${playlistId}/tracks`,
          {
            method: 'POST',
            body: JSON.stringify({ trackId }),
          },
          token
        );
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    createPersonalized: async (token: string, data: any) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/playlists/personalized`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create personalized playlist');
      }

      return response.json();
    },

    getSystemPlaylists: async (token?: string) => {
      try {
        // If we have a token and user is authenticated, make an authenticated request
        if (token) {
          // For authenticated users - use a dedicated endpoint with authentication
          return await fetchWithAuth(
            '/api/playlists',
            {
              method: 'GET',
              headers: {
                'X-Filter-Type': 'system',
              },
            },
            token
          );
        } else {
          // For unauthenticated users - use the public endpoint
          return await fetchWithAuth('/api/playlists/system-all', {
            method: 'GET',
          });
        }
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    getSystemPlaylist: async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('Token não encontrado');
        }

        return await fetchWithAuth(
          '/api/playlists/system',
          { method: 'GET' },
          token
        );
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },

    getPlaylists: async (token: string) =>
      fetchWithAuth('/api/playlists', { method: 'GET' }, token),

    getPlaylistById: async (playlistId: string, token?: string) =>
      fetchWithAuth(`/api/playlists/${playlistId}`, { method: 'GET' }, token),

    updateVibeRewindPlaylist: async (token: string) =>
      fetchWithAuth('/api/playlists/vibe-rewind', { method: 'POST' }, token),
  },

  upload: {
    image: async (formData: FormData, token: string) => {
      const response = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Không thể tải ảnh lên');
      }

      return response.json();
    },
  },

  follows: {
    checkFollow: async (
      userId: string,
      targetId: string,
      type: string,
      token: string
    ) =>
      fetchWithAuth(
        `/api/user/check-follow/${targetId}?type=${type}`,
        { method: 'GET' },
        token
      ),

    follow: async (targetId: string, token: string) =>
      fetchWithAuth(`/api/user/follow/${targetId}`, { method: 'POST' }, token),

    unfollow: async (targetId: string, token: string) =>
      fetchWithAuth(
        `/api/user/unfollow/${targetId}`,
        { method: 'DELETE' },
        token
      ),
  },
};
