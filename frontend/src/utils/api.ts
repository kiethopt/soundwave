const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const api = {
  artists: {
    getAllActive: () => `${API_BASE}/api/artists?active=true`,
    getAll: () => `${API_BASE}/api/artists`,
    getById: (id: string) => `${API_BASE}/api/artists/${id}`,
    create: () => `${API_BASE}/api/artists`,
    update: (id: string) => `${API_BASE}/api/artists/${id}`,
    delete: (id: string) => `${API_BASE}/api/artists/${id}`,
    search: (query: string) => `${API_BASE}/api/artists/search?q=${query}`,
    verify: (id: string) => `${API_BASE}/api/artists/${id}/verify`,
    updateMonthlyListeners: () =>
      `${API_BASE}/api/artists/update-monthly-listeners`,
  },
  tracks: {
    getAll: () => `${API_BASE}/api/tracks`,
    getById: (id: string) => `${API_BASE}/api/tracks/${id}`,
    create: () => `${API_BASE}/api/tracks`,
    update: (id: string) => `${API_BASE}/api/tracks/${id}`,
    delete: (id: string) => `${API_BASE}/api/tracks/${id}`,
    search: (query: string) => `${API_BASE}/api/tracks/search?q=${query}`,
    getByArtistId: (artistId: string) =>
      `${API_BASE}/api/tracks/artist/${artistId}`,
  },
  albums: {
    getAll: () => `${API_BASE}/api/albums`,
    getById: (id: string) => `${API_BASE}/api/albums/${id}`,
    create: () => `${API_BASE}/api/albums`,
    update: (id: string) => `${API_BASE}/api/albums/${id}`,
    delete: (id: string) => `${API_BASE}/api/albums/${id}`,
    uploadTracks: (id: string) => `${API_BASE}/api/albums/${id}/tracks`,
    reorderTracks: (id: string) =>
      `${API_BASE}/api/albums/${id}/tracks/reorder`,
    search: (query: string) => `${API_BASE}/api/albums/search?q=${query}`,
    getByArtistId: (artistId: string) =>
      `${API_BASE}/api/albums/artist/${artistId}`,
  },
  users: {
    getAll: () => `${API_BASE}/api/auth/users`,
    getById: (id: string) => `${API_BASE}/api/auth/users/id/${id}`,
    getByUsername: (username: string) =>
      `${API_BASE}/api/auth/users/username/${username}`,
    update: (username: string) => `${API_BASE}/api/auth/users/${username}`,
    deactivate: (username: string) =>
      `${API_BASE}/api/auth/users/${username}/deactivate`,
    activate: (username: string) =>
      `${API_BASE}/api/auth/users/${username}/activate`,
    delete: (username: string) => `${API_BASE}/api/auth/users/${username}`,
    resetPassword: (username: string) =>
      `${API_BASE}/api/auth/users/${username}/reset-password`,
  },
  history: {
    save: () => `${API_BASE}/api/history`,
    get: (type: string, page: number = 1, limit: number = 10) =>
      `${API_BASE}/api/history?type=${type}&page=${page}&limit=${limit}`,
    delete: (id: string) => `${API_BASE}/api/history/${id}`,
    clear: (type: string) => `${API_BASE}/api/history?type=${type}`,
  },
  dashboard: {
    getStats: () => `${API_BASE}/api/dashboard/stats`,
  },
  sse: {
    url: `${API_BASE}/api/auth/sse`,
  },
};
