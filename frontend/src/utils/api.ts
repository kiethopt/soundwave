const API_BASE = process.env.NEXT_PUBLIC_API_URL;

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
    // Public routes
    register: async (data: RegisterData) => {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },

    login: async (data: LoginData) => {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },

    requestPasswordReset: async (email: string) => {
      const response = await fetch(
        `${API_BASE}/api/auth/request-password-reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );
      return response.json();
    },

    resetPassword: async (data: ResetPasswordData) => {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },

    // Protected routes
    validateToken: async (token: string) => {
      const response = await fetch(`${API_BASE}/api/auth/validate-token`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },

    requestArtistRole: async (token: string) => {
      const response = await fetch(`${API_BASE}/api/auth/request-artist`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },

    // Admin routes
    registerAdmin: async (data: RegisterData) => {
      const response = await fetch(`${API_BASE}/api/auth/register-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
  },

  albums: {
    // Lấy danh sách tất cả albums
    getAll: async (token: string) => {
      const response = await fetch(`${API_BASE}/api/albums`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },

    // Lấy thông tin chi tiết của một album
    getById: async (id: string, token: string) => {
      const response = await fetch(`${API_BASE}/api/albums/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },

    // Tạo album mới
    create: async (data: FormData, token: string) => {
      const response = await fetch(`${API_BASE}/api/albums`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });
      return response.json();
    },

    // Cập nhật album
    update: async (id: string, data: FormData, token: string) => {
      const response = await fetch(`${API_BASE}/api/albums/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });
      return response.json();
    },

    // Xóa album
    delete: async (id: string, token: string) => {
      const response = await fetch(`${API_BASE}/api/albums/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },

    // Thêm tracks vào album
    uploadTracks: async (id: string, data: FormData, token: string) => {
      const response = await fetch(`${API_BASE}/api/albums/${id}/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });
      return response.json();
    },

    search: async (query: string, token: string) => {
      const response = await fetch(`${API_BASE}/api/albums/search?q=${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },
  },

  // artists: {
  //   getAll: async (token: string) => {
  //     const response = await fetch(`${API_BASE}/api/artists`, {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });
  //     return response.json();
  //   },
  // },

  tracks: {
    // Lấy danh sách tất cả tracks
    getAll: async (token: string) => {
      const response = await fetch(`${API_BASE}/api/tracks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },

    // Lấy danh sách tracks theo type
    getByType: async (type: string, token: string) => {
      const response = await fetch(`${API_BASE}/api/tracks/type/${type}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },

    // Lấy danh sách tracks theo genre
    getByGenre: async (genreId: string, token: string) => {
      const response = await fetch(`${API_BASE}/api/tracks/genre/${genreId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },

    // Lấy danh sách tracks theo type và genre
    getByTypeAndGenre: async (type: string, genreId: string, token: string) => {
      const response = await fetch(
        `${API_BASE}/api/tracks/type/${type}/genre/${genreId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.json();
    },

    // Tạo track mới
    create: async (data: FormData, token: string) => {
      const response = await fetch(`${API_BASE}/api/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });
      return response.json();
    },

    // Cập nhật track
    update: async (id: string, data: FormData, token: string) => {
      const response = await fetch(`${API_BASE}/api/tracks/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });
      return response.json();
    },

    // Xóa track
    delete: async (id: string, token: string) => {
      const response = await fetch(`${API_BASE}/api/tracks/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },
  },
};
