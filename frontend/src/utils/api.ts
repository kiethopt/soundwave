const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// Helper function giúp giảm bớt lặp code
const fetchWithAuth = async (
  url: string,
  options: RequestInit = {},
  token?: string
) => {
  // Định nghĩa kiểu dữ liệu cho headers
  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers as Record<string, string>),
  };

  // Nếu body là FormData, không đặt Content-Type
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Parse error response từ backend
    const errorResponse = await response.json();
    throw new Error(errorResponse.message || 'An unexpected error occurred');
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
  email: string;
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

    requestArtistRole: async (token: string) =>
      fetchWithAuth('/api/auth/request-artist', { method: 'POST' }, token),
  },

  admin: {
    approveArtistRequest: async (userId: string, token: string) =>
      fetchWithAuth(
        '/api/admin/artist-requests/approve',
        {
          method: 'POST',
          body: JSON.stringify({ userId }),
        },
        token
      ),

    rejectArtistRequest: async (userId: string, token: string) =>
      fetchWithAuth(
        '/api/admin/artist-requests/reject',
        {
          method: 'POST',
          body: JSON.stringify({ userId }),
        },
        token
      ),

    verifyArtist: async (data: { userId: string }, token: string) =>
      fetchWithAuth(
        '/api/admin/artists/verify',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        token
      ),
  },

  albums: {
    getAll: async (token: string) =>
      fetchWithAuth('/api/albums', { method: 'GET' }, token),

    getById: async (id: string, token: string) =>
      fetchWithAuth(`/api/albums/${id}`, { method: 'GET' }, token),

    create: async (data: FormData, token: string) =>
      fetchWithAuth('/api/albums', { method: 'POST', body: data }, token),

    update: async (id: string, data: FormData, token: string) =>
      fetchWithAuth(`/api/albums/${id}`, { method: 'PUT', body: data }, token),

    delete: async (id: string, token: string) =>
      fetchWithAuth(`/api/albums/${id}`, { method: 'DELETE' }, token),

    uploadTracks: async (id: string, data: FormData, token: string) =>
      fetchWithAuth(
        `/api/albums/${id}/tracks`,
        { method: 'POST', body: data },
        token
      ),

    search: async (query: string, token: string) =>
      fetchWithAuth(`/api/albums/search?q=${query}`, { method: 'GET' }, token),
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

    create: async (data: FormData, token: string) =>
      fetchWithAuth(
        '/api/admin/artists',
        { method: 'POST', body: data },
        token
      ),

    getProfile: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/profile/${id}`, { method: 'GET' }, token),

    updateProfile: async (id: string, data: any, token: string) =>
      fetchWithAuth(
        `/api/artist/profile/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(data),
        },
        token
      ),

    getStats: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/stats/${id}`, { method: 'GET' }, token),

    getTracks: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/tracks/${id}`, { method: 'GET' }, token),

    getAlbums: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/albums/${id}`, { method: 'GET' }, token),

    updateMonthlyListeners: async (id: string, token: string) =>
      fetchWithAuth(
        `/api/admin/artists/${id}/update-monthly-listeners`,
        {
          method: 'POST',
        },
        token
      ),
  },

  tracks: {
    getAll: async (token: string) =>
      fetchWithAuth('/api/tracks', { method: 'GET' }, token),

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

    create: async (data: FormData, token: string) =>
      fetchWithAuth('/api/tracks', { method: 'POST', body: data }, token),

    update: async (id: string, data: FormData, token: string) =>
      fetchWithAuth(`/api/tracks/${id}`, { method: 'PUT', body: data }, token),

    delete: async (id: string, token: string) =>
      fetchWithAuth(`/api/tracks/${id}`, { method: 'DELETE' }, token),

    search: async (query: string, token: string) =>
      fetchWithAuth(`/api/tracks/search?q=${query}`, { method: 'GET' }, token),

    play: async (trackId: string, token: string) =>
      fetchWithAuth(`/api/tracks/${trackId}/play`, { method: 'POST' }, token),
  },

  history: {
    getPlayHistory: async (token: string) =>
      fetchWithAuth('/api/history/play', { method: 'GET' }, token),

    getSearchHistory: async (token: string) =>
      fetchWithAuth('/api/history/search', { method: 'GET' }, token),

    getAllHistory: async (token: string) =>
      fetchWithAuth('/api/history', { method: 'GET' }, token),
  },

  dashboard: {
    getStats: async (token: string) =>
      fetchWithAuth('/api/admin/stats', { method: 'GET' }, token),
  },
};
