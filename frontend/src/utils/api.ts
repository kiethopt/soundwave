const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const api = {
  tracks: {
    getAll: () => `${API_BASE}/api/tracks`,
    getById: (id: string) => `${API_BASE}/api/tracks/${id}`,
    create: () => `${API_BASE}/api/tracks`,
    update: (id: string) => `${API_BASE}/api/tracks/${id}`,
    delete: (id: string) => `${API_BASE}/api/tracks/${id}`,
    search: (query: string) => `${API_BASE}/api/tracks/search?q=${query}`,
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
  },
};
