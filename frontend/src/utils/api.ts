import { ArtistRequestFilters, CreatePlaylistData } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Helper function giúp giảm bớt lặp code
const fetchWithAuth = async (
  url: string,
  options: RequestInit = {},
  token?: string
) => {
  const headers: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers as Record<string, string>),
  };

  // Set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  // --- Simplified Error Handling ---
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    let errorCode = "";
    let errorData: any = null;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.message || errorMessage;
      errorCode = errorBody.code || "";
      errorData = errorBody.data || null;

      // Specific handling for TRACK_ALREADY_IN_PLAYLIST - return instead of throw
      if (errorCode === "TRACK_ALREADY_IN_PLAYLIST") {
        console.warn(`Handled duplicate track error: ${errorMessage}`);
        return {
          success: false,
          code: "TRACK_ALREADY_IN_PLAYLIST",
          message: errorMessage,
          data: errorData,
        };
      }

      // Specific handling for ACCOUNT_DEACTIVATED or ARTIST_DEACTIVATED
      if (
        errorCode === "ACCOUNT_DEACTIVATED" ||
        errorCode === "ARTIST_DEACTIVATED"
      ) {
        // Optionally re-throw a specific error type or modify message
        // For now, just ensure the message is passed
      }
    } catch (jsonError) {
      // If JSON parsing fails, try to get the raw text
      try {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage; // Use text if available
      } catch (textError) {
        // Keep the original HTTP status error if text fails
        console.error("Failed to read error response text:", textError);
      }
    }

    // Throw a standard Error object with the message from the backend
    const errorToThrow = new Error(errorMessage);
    // Optional: Attach code/data if needed elsewhere, but rely on message for display
    (errorToThrow as any).code = errorCode;
    (errorToThrow as any).data = errorData;
    throw errorToThrow;
  }
  // --- End Simplified Error Handling ---

  // Handle successful responses (2xx)
  const responseText = await response.text();
  try {
    // If responseText is empty, return a success indicator
    if (!responseText) {
      return { success: true };
    }
    // Otherwise, parse the JSON
    return JSON.parse(responseText);
  } catch (e) {
    // If parsing fails on a successful response, log and return raw text
    console.error(
      "Failed to parse successful response JSON:",
      e,
      "Response Text:",
      responseText
    );
    return { success: true, data: responseText };
  }
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
    getMe: async (token: string) => {
      const response = await fetchWithAuth(
        `/api/auth/me`,
        { method: "GET" },
        token
      );
      return response;
    },
    register: async (data: RegisterData) =>
      fetchWithAuth("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    login: async (data: LoginData) =>
      fetchWithAuth("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    requestPasswordReset: async (email: string) =>
      fetchWithAuth("/api/auth/request-password-reset", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),

    resetPassword: async (data: ResetPasswordData) =>
      fetchWithAuth("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    validateToken: async (token: string) =>
      fetchWithAuth("/api/auth/validate-token", { method: "GET" }, token),

    switchProfile: async (token: string) => {
      return fetchWithAuth(
        "/api/auth/switch-profile",
        { method: "POST" },
        token
      );
    },

    logout: async (token: string) =>
      fetchWithAuth("/api/auth/logout", { method: "POST" }, token),

    googleLogin: async (data: { token: string }) =>
      fetchWithAuth("/api/auth/google-login", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    uploadGoogleAvatar: async (googleImageUrl: string) => {
      const response = await fetch(
        `${API_BASE_URL}/auth/upload-google-avatar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ googleImageUrl }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload Google avatar");
      }

      return response.json();
    },
  },

  session: {
    handleAudioPlay: async (userId: string, sessionId: string, token: string) =>
      fetchWithAuth(
        `/api/session/handle-audio-play`,
        {
          method: "POST",
          body: JSON.stringify({ userId, sessionId }),
        },
        token
      ),
  },

  admin: {
    getAIModelStatus: async (token: string) =>
      fetchWithAuth("/api/admin/system/ai-model", { method: "GET" }, token),

    updateAIModelStatus: async (model: string, token: string) =>
      fetchWithAuth(
        "/api/admin/system/ai-model",
        {
          method: "POST",
          body: JSON.stringify({ model }),
        },
        token
      ),

    // Add a new function for bulk uploading tracks
    bulkUploadTracks: async (formData: FormData, token: string) => {
      return fetchWithAuth(
        "/api/admin/bulk-upload-tracks",
        {
          method: "POST",
          body: formData, // FormData containing multiple audio files
        },
        token
      );
    },

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
          params.append("startDate", filters.startDate);
        }
        if (filters.endDate) {
          params.append("endDate", filters.endDate);
        }
        if (filters.status) {
          params.append("status", filters.status);
        }
        if (filters.search) {
          params.append("search", filters.search);
        }
      }

      return fetchWithAuth(
        `/api/admin/artist-requests?${params.toString()}`,
        { method: "GET" },
        token
      );
    },

    getArtistRequestDetail: async (requestId: string, token: string) =>
      fetchWithAuth(
        `/api/admin/artist-requests/${requestId}`,
        { method: "GET" },
        token
      ),

    approveArtistRequest: async (requestId: string, token: string) =>
      fetchWithAuth(
        "/api/admin/artist-requests/approve",
        {
          method: "POST",
          body: JSON.stringify({ requestId }),
        },
        token
      ),

    rejectArtistRequest: async (
      requestId: string,
      reason: string = "",
      token: string
    ) =>
      fetchWithAuth(
        "/api/admin/artist-requests/reject",
        {
          method: "POST",
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
        { method: "GET" },
        token
      ),

    getArtistById: async (id: string, token: string) =>
      fetchWithAuth(`/api/admin/artists/${id}`, { method: "GET" }, token),

    getAllUsers: async (
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/admin/users?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: "GET" },
        token
      ),

    getUserById: async (id: string, token: string) =>
      fetchWithAuth(`/api/admin/users/${id}`, { method: "GET" }, token),

    updateUser: async (
      userId: string,
      data: FormData | Record<string, any>,
      token: string
    ) => {
      let body: BodyInit;
      const headers: HeadersInit = {};

      if (data instanceof FormData) {
        body = data;
      } else {
        body = JSON.stringify(data);
        headers["Content-Type"] = "application/json";
      }

      return fetchWithAuth(
        `/api/admin/users/${userId}`,
        {
          method: "PUT",
          body: body,
          headers: headers,
        },
        token
      );
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
            method: "PUT",
            body: data,
          },
          token
        );
      } else {
        // Make sure we convert boolean values to strings consistently
        if (data.hasOwnProperty("isActive")) {
          data = {
            ...data,
            isActive: data.isActive?.toString(),
          };
        }

        return fetchWithAuth(
          `/api/admin/artists/${artistId}`,
          {
            method: "PUT",
            body: JSON.stringify(data),
          },
          token
        );
      }
    },

    deleteUser: async (
      id: string,
      token: string,
      reason?: string
    ): Promise<{ message: string }> => {
      const options: RequestInit = {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      };
      if (reason) {
        options.body = JSON.stringify({ reason });
      }
      return fetchWithAuth(`/api/admin/users/${id}`, options, token);
    },

    deleteArtist: async (
      id: string,
      token: string,
      reason?: string
    ): Promise<{ message: string }> => {
      const options: RequestInit = {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      };
      if (reason) {
        options.body = JSON.stringify({ reason });
      }
      return fetchWithAuth(`/api/admin/artists/${id}`, options, token);
    },

    getAllGenres: async (
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/admin/genres?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: "GET" },
        token
      ),

    createGenre: async (data: any, token: string) =>
      fetchWithAuth(
        "/api/admin/genres",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
        token
      ),

    updateGenre: async (genreId: string, data: FormData, token: string) =>
      fetchWithAuth(
        `/api/admin/genres/${genreId}`,
        {
          method: "PUT",
          body: data,
        },
        token
      ),

    deleteGenre: async (id: string, token: string) =>
      fetchWithAuth(`/api/admin/genres/${id}`, { method: "DELETE" }, token),

    updateGlobalPlaylist: async (token: string) =>
      fetchWithAuth(
        "/api/admin/playlists/global/update",
        { method: "POST" },
        token
      ),

    // Add the correct endpoint function for updating all system playlists
    updateAllSystemPlaylists: async (token: string) =>
      fetchWithAuth(
        "/api/playlists/admin/system/update-all",
        { method: "POST" },
        token
      ),

    // System playlist management
    createSystemPlaylist: async (formData: FormData, token: string) => {
      // Handle file uploads in FormData
      return fetchWithAuth(
        "/api/playlists/admin/system/base",
        {
          method: "POST",
          body: formData,
          headers: {
            // Don't set Content-Type with FormData - browser will set it with boundary
          },
        },
        token
      );
    },

    updateSystemPlaylist: async (
      playlistId: string,
      formData: FormData,
      token: string
    ) => {
      // Handle file uploads in FormData
      return fetchWithAuth(
        `/api/playlists/admin/system/base/${playlistId}`,
        {
          method: "PUT",
          body: formData,
          headers: {
            // Don't set Content-Type with FormData - browser will set it with boundary
          },
        },
        token
      );
    },

    deleteSystemPlaylist: async (playlistId: string, token: string) => {
      return fetchWithAuth(
        `/api/playlists/admin/system/base/${playlistId}`,
        { method: "DELETE" },
        token
      );
    },

    // Schedule playlist update for a specific time
    schedulePlaylistUpdate: async (scheduledTime: Date, token: string) => {
      return fetchWithAuth(
        "/api/admin/playlists/global/schedule",
        {
          method: "POST",
          body: JSON.stringify({ scheduledTime: scheduledTime.toISOString() }),
        },
        token
      );
    },

    // Delete an artist request
    deleteArtistRequest: async (requestId: string, token: string) => {
      return fetchWithAuth(
        `/api/admin/artist-requests/${requestId}`,
        {
          method: "DELETE",
        },
        token
      );
    },

    // Get System Status - NEW
    getSystemStatus: async (token: string) => {
      return fetchWithAuth(
        `/api/admin/system-status`,
        { method: "GET" },
        token
      );
    },

    // --- Artist Claim Requests ---
    getArtistClaimRequests: async (
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
          params.append("startDate", filters.startDate);
        }
        if (filters.endDate) {
          params.append("endDate", filters.endDate);
        }
        if (filters.search) {
          params.append("search", filters.search);
        }
      }

      return fetchWithAuth(
        `/api/admin/artist-claims?${params.toString()}`,
        { method: "GET" },
        token
      );
    },

    getArtistClaimRequestDetail: async (claimId: string, token: string) =>
      fetchWithAuth(
        `/api/admin/artist-claims/${claimId}`,
        { method: "GET" },
        token
      ),

    approveArtistClaim: async (claimId: string, token: string) =>
      fetchWithAuth(
        `/api/admin/artist-claims/${claimId}/approve`,
        {
          method: "POST",
        },
        token
      ),

    rejectArtistClaim: async (claimId: string, reason: string, token: string) =>
      fetchWithAuth(
        `/api/admin/artist-claims/${claimId}/reject`,
        {
          method: "POST",
          body: JSON.stringify({ reason }),
        },
        token
      ),

    // --- User AI Playlist Management by Admin ---
    generateUserAiPlaylist: async (userId: string, token: string) => {
      return fetchWithAuth(
        `/api/admin/users/${userId}/ai-playlists`,
        { method: "POST" },
        token
      );
    },

    updateAiPlaylistVisibility: async (
      playlistId: string,
      visibility: "PUBLIC" | "PRIVATE", // Use string literal type here for simplicity if PlaylistPrivacy enum isn't easily available/imported
      token: string
    ) => {
      return fetchWithAuth(
        `/api/admin/ai-playlists/${playlistId}/visibility`,
        {
          method: "PUT",
          body: JSON.stringify({ visibility }),
        },
        token
      );
    },

    getUserAiPlaylists: async (
      userId: string,
      token: string,
      queryParams?: string // Pass URLSearchParams string e.g., "page=1&limit=10&sortBy=createdAt"
    ) => {
      const url = queryParams
        ? `/api/admin/users/${userId}/ai-playlists?${queryParams}`
        : `/api/admin/users/${userId}/ai-playlists`;
      return fetchWithAuth(url, { method: "GET" }, token);
    },

    getUserListeningHistory: async (
      userId: string,
      token: string,
      queryParams?: string // Pass URLSearchParams string e.g., "page=1&limit=10&sortBy=createdAt"
    ) => {
      const url = queryParams
        ? `/api/admin/users/${userId}/history?${queryParams}`
        : `/api/admin/users/${userId}/history`;
      return fetchWithAuth(url, { method: "GET" }, token);
    },
    // --- End User AI Playlist Management ---

    // Method to re-analyze track audio features by admin
    async reanalyzeTrack(
      trackId: string,
      token: string
    ): Promise<{ message: string; track: any }> {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/tracks/${trackId}/reanalyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status} ${
          response.statusText || ""
        }`.trim();
        const clonedResponse = response.clone(); // Clone the response

        try {
          const errorBody = await response.json(); // Attempt to parse original response as JSON
          errorMessage = errorBody.message || errorMessage;
        } catch (jsonError) {
          // If JSON parsing fails, try to get the raw text from the cloned response
          try {
            const errorText = await clonedResponse.text();
            if (errorText) errorMessage = errorText; // Use text if available and not empty
          } catch (textError) {
            // Keep the previously formed errorMessage if text fails
            console.error(
              "[api.admin.reanalyzeTrack] Failed to read error response text:",
              textError
            );
          }
        }
        throw new Error(errorMessage);
      }
      return response.json();
    },
  },

  user: {
    getUserById: async (id: string, token: string) => {
      const response = await fetchWithAuth(
        `/api/user/profile/${id}`,
        { method: "GET" },
        token
      );
      return response;
    },

    searchAll: async (query: string, token: string) =>
      fetchWithAuth(
        `/api/user/search-all?q=${query}`,
        { method: "GET" },
        token
      ),

    getAllGenres: async (token: string) =>
      fetchWithAuth(`/api/user/genres`, { method: "GET" }, token),

    followUserOrArtist: async (followingId: string, token: string) =>
      fetchWithAuth(
        `/api/user/follow/${followingId}`,
        {
          method: "POST",
        },
        token
      ),

    unfollowUserOrArtist: async (followingId: string, token: string) =>
      fetchWithAuth(
        `/api/user/unfollow/${followingId}`,
        {
          method: "DELETE",
        },
        token
      ),

    getUserFollowers: async (id: string, token: string) =>
      fetchWithAuth(`/api/user/followers/${id}`, { method: "GET" }, token),

    getUserFollowing: async (id: string, token: string) =>
      fetchWithAuth(`/api/user/following/${id}`, { method: "GET" }, token),

    requestArtistRole: async (token: string, data: FormData) =>
      fetchWithAuth(
        "/api/user/request-artist",
        {
          method: "POST",
          body: data,
        },
        token
      ),

    editProfile: async (token: string, data: FormData) =>
      fetchWithAuth(
        "/api/user/edit-profile",
        {
          method: "PUT",
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
        "/api/user/check-artist-request",
        { method: "GET" },
        token
      );
    },

    setFollowVisibility: async (
      token: string,
      data: { isVisible: boolean }
    ) => {
      return fetchWithAuth(
        "/api/user/set-follow-visibility",
        {
          method: "PUT",
          body: JSON.stringify(data),
        },
        token
      );
    },

    getRecommendedArtists: async (token: string) =>
      fetchWithAuth("/api/user/recommendedArtists", { method: "GET" }, token),

    getNewestAlbums: async (token: string) =>
      fetchWithAuth("/api/user/newestAlbums", { method: "GET" }, token),

    getNewestTracks: async (token: string) =>
      fetchWithAuth("/api/user/newestTracks", { method: "GET" }, token),

    getTopTracks: async (token: string) =>
      fetchWithAuth("/api/user/topTracks", { method: "GET" }, token),

    getTopArtists: async (token: string) =>
      fetchWithAuth("/api/user/topArtists", { method: "GET" }, token),

    getTopAlbums: async (token: string) =>
      fetchWithAuth("/api/user/topAlbums", { method: "GET" }, token),

    // User profile API
    getUserTopAlbums: async (id: string, token: string) =>
      fetchWithAuth(`/api/user/topAlbums/${id}`, { method: "GET" }, token),

    getUserTopTracks: async (id: string, token: string) =>
      fetchWithAuth(`/api/user/topTracks/${id}`, { method: "GET" }, token),

    getUserTopArtists: async (id: string, token: string) =>
      fetchWithAuth(`/api/user/topArtists/${id}`, { method: "GET" }, token),

    getGenreTopAlbums: async (id: string, token: string) =>
      fetchWithAuth(
        `/api/user/genre/topAlbums/${id}`,
        { method: "GET" },
        token
      ),

    getGenreTopTracks: async (id: string, token: string) =>
      fetchWithAuth(
        `/api/user/genre/topTracks/${id}`,
        { method: "GET" },
        token
      ),

    getGenreTopArtists: async (id: string, token: string) =>
      fetchWithAuth(
        `/api/user/genre/topArtists/${id}`,
        { method: "GET" },
        token
      ),

    getGenreNewestTracks: async (id: string, token: string) =>
      fetchWithAuth(
        `/api/user/genre/newestTracks/${id}`,
        { method: "GET" },
        token
      ),

    getPlayHistory: async (token: string) =>
      fetchWithAuth("/api/user/playHistory", { method: "GET" }, token),

    getClaimableArtists: async (token: string) =>
      fetchWithAuth("/api/user/claimable-artists", { method: "GET" }, token),

    submitArtistClaim: async (token: string, data: FormData) =>
      fetchWithAuth(
        "/api/user/artist-claims",
        {
          method: "POST",
          body: data,
        },
        token
      ),

    getUserClaims: async (token: string) =>
      fetchWithAuth("/api/user/artist-claims", { method: "GET" }, token),

    // Thêm hàm mới để lấy discover genres
    getDiscoverGenres: async (token: string) => {
      return fetchWithAuth(
        `/api/user/discover-genres`,
        { method: "GET" },
        token
      );
    },
  },

  artists: {
    getAll: async (token: string, page: number, limit: number) =>
      fetchWithAuth(
        `/api/admin/artists?page=${page}&limit=${limit}`,
        { method: "GET" },
        token
      ),

    getRequests: async (token: string, page: number, limit: number) =>
      fetchWithAuth(
        `/api/admin/artist-requests?page=${page}&limit=${limit}`,
        { method: "GET" },
        token
      ),

    getById: async (id: string, token: string) =>
      fetchWithAuth(`/api/admin/artists/${id}`, { method: "GET" }, token),

    getArtistById: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/profile/${id}`, { method: "GET" }, token),

    create: async (data: FormData, token: string) =>
      fetchWithAuth(
        "/api/admin/artists",
        { method: "POST", body: data },
        token
      ),

    getProfile: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/profile/${id}`, { method: "GET" }, token),

    updateProfile: async (id: string, data: FormData, token: string) =>
      fetchWithAuth(
        `/api/artist/profile/${id}`,
        {
          method: "PUT",
          body: data,
        },
        token
      ),

    getStats: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/stats/${id}`, { method: "GET" }, token),

    getAllGenres: async (
      token: string,
      page: number = 1,
      limit: number = 100
    ) =>
      fetchWithAuth(
        `/api/artist/genres?page=${page}&limit=${limit}`,
        { method: "GET" },
        token
      ),

    getTrackByArtistId: async (id: string, token: string, type?: string) =>
      fetchWithAuth(
        `/api/artist/tracks/${id}${type ? `?type=${type}` : ""}`,
        { method: "GET" },
        token
      ),

    getAlbumByArtistId: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/albums/${id}`, { method: "GET" }, token),

    getRelatedArtists: async (id: string, token: string) =>
      fetchWithAuth(`/api/artist/related/${id}`, { method: "GET" }, token),

    getAllTracks: async (
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/tracks?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: "GET" },
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
        { method: "GET" },
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
        { method: "GET" },
        token
      ),

    updateMonthlyListeners: async (id: string, token: string) =>
      fetchWithAuth(
        `/api/admin/artists/${id}/update-monthly-listeners`,
        {
          method: "POST",
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
        { method: "GET" },
        token
      ),
  },

  artist: {
    getStats: async (token: string) =>
      fetchWithAuth("/api/artist/stats", { method: "GET" }, token),
  },

  tracks: {
    getTracks: async (
      token: string,
      page: number = 1,
      limit: number = 10,
      queryParams?: string
    ) => {
      try {
        return await fetchWithAuth(
          `/api/tracks?${queryParams || `page=${page}&limit=${limit}`}`,
          { method: "GET" },
          token
        );
      } catch (error) {
        console.error("Error fetching tracks:", error);
        return { success: false, data: [], pagination: { totalPages: 1 } };
      }
    },

    getById: async (trackId: string, token?: string) => {
      try {
        return await fetchWithAuth(
          `/api/tracks/${trackId}`,
          { method: "GET" },
          token
        );
      } catch (error) {
        // console.error(`Error fetching track ${trackId}:`, error);
        // Still return or throw error so the calling component knows about it
        return { success: false, message: "Failed to fetch track" }; // Assuming return based on code, adjust if it should throw
      }
    },

    getByType: async (type: string, token?: string) => {
      try {
        return await fetchWithAuth(
          `/api/tracks/type/${type}`,
          { method: "GET" },
          token
        );
      } catch (error) {
        console.error(`Error fetching tracks by type ${type}:`, error);
        return { success: false, data: [], message: "Failed to fetch tracks" };
      }
    },

    getByGenre: async (genreId: string, token?: string) => {
      try {
        return await fetchWithAuth(
          `/api/tracks/genre/${genreId}`,
          { method: "GET" },
          token
        );
      } catch (error) {
        console.error(`Error fetching tracks by genre ${genreId}:`, error);
        return { success: false, data: [], message: "Failed to fetch tracks" };
      }
    },

    getByTypeAndGenre: async (
      type: string,
      genreId: string,
      token?: string
    ) => {
      try {
        return await fetchWithAuth(
          `/api/tracks/type/${type}/genre/${genreId}`,
          { method: "GET" },
          token
        );
      } catch (error) {
        console.error(
          `Error fetching tracks by type ${type} and genre ${genreId}:`,
          error
        );
        return { success: false, data: [], message: "Failed to fetch tracks" };
      }
    },

    playTrack: async (trackId: string, token: string) => {
      try {
        return await fetchWithAuth(
          `/api/tracks/${trackId}/play`,
          { method: "POST" },
          token
        );
      } catch (error) {
        console.error(`Error playing track ${trackId}:`, error);
        return { success: false };
      }
    },

    checkCopyright: async (formData: FormData, token: string) => {
      // This function specifically calls the new check-copyright endpoint
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/tracks/check-copyright`,
          {
            method: "POST",
            body: formData, // Should contain audioFile, title, releaseDate
            headers: {
              Authorization: `Bearer ${token}`,
              // Content-Type is handled automatically for FormData
            },
          }
        );

        const responseBody = await response.json();

        if (!response.ok) {
          // Throw error with response body for detailed handling
          const error: any = new Error(
            responseBody.message || `HTTP error! status: ${response.status}`
          );
          error.responseBody = responseBody;
          error.statusCode = response.status;
          throw error;
        }

        // On success, return the response which includes { isSafeToUpload, message, copyrightDetails? }
        return responseBody;
      } catch (error) {
        console.error("Error checking track copyright:", error);
        throw error; // Re-throw to be handled by the caller
      }
    },

    create: async (formData: FormData, token: string) => {
      // This calls the original /api/tracks POST endpoint for actual creation
      try {
        const response = await fetch(`${API_BASE_URL}/api/tracks`, {
          method: "POST",
          body: formData, // Contains all track details + files
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const responseBody = await response.json();

        if (!response.ok) {
          const error: any = new Error(
            responseBody.message || `HTTP error! status: ${response.status}`
          );
          error.responseBody = responseBody;
          error.statusCode = response.status;
          throw error;
        }

        return responseBody;
      } catch (error) {
        throw error;
      }
    },

    update: async (trackId: string, data: FormData, token: string) =>
      fetchWithAuth(
        `/api/tracks/${trackId}`,
        {
          method: "PUT",
          body: data,
        },
        token
      ),

    delete: async (id: string, token: string) =>
      fetchWithAuth(`/api/tracks/${id}`, { method: "DELETE" }, token),

    toggleVisibility: async (trackId: string, token: string) =>
      fetchWithAuth(
        `/api/tracks/${trackId}/toggle-visibility`,
        { method: "PUT" },
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
        { method: "GET" },
        token
      ),

    like: async (trackId: string, token: string) =>
      fetchWithAuth(`/api/tracks/${trackId}/like`, { method: "POST" }, token),

    unlike: async (trackId: string, token: string) =>
      fetchWithAuth(`/api/tracks/${trackId}/like`, { method: "DELETE" }, token),

    checkLiked: async (trackId: string, token: string) =>
      fetchWithAuth(
        `/api/tracks/${trackId}/liked`,
        {
          method: "GET",
        },
        token
      ),

    recordPlay: async (trackId: string, token: string) => {
      return fetchWithAuth(
        `/api/tracks/${trackId}/play`,
        { method: "POST" }, // Assuming POST based on controller name, adjust if needed
        token
      );
    },
  },

  history: {
    getList: (
      token: string,
      type?: "play" | "search",
      page = 1,
      limit = 10
    ) => {
      const typeParam = type ? `/${type}` : "";
      const url = `/api/history${typeParam}?page=${page}&limit=${limit}`;
      return fetchWithAuth(url, {}, token);
    },
    savePlay: (
      token: string,
      data: { trackId: string; duration?: number; completed?: boolean }
    ) => {
      return fetchWithAuth(
        "/api/history/play",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        token
      );
    },
    saveSearch: (token: string, query: string) => {
      return fetchWithAuth(
        "/api/history/search",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        },
        token
      );
    },
    getSuggestions: (token: string, limit = 5) => {
      return fetchWithAuth(
        `/api/history/suggestions?limit=${limit}`,
        {},
        token
      );
    },
    deleteSearchHistory: (token: string) => {
      return fetchWithAuth("/api/history/search", { method: "DELETE" }, token);
    },
  },

  albums: {
    // Get newest albums - works for both authenticated and non-authenticated users
    getNewestAlbums: async (token?: string) => {
      try {
        return await fetchWithAuth(
          "/api/albums/newest",
          { method: "GET" },
          token
        );
      } catch (error) {
        console.error("Error fetching newest albums:", error);
        return {
          success: false,
          albums: [],
          message: "Failed to fetch albums",
        };
      }
    },

    // Get hot albums - works for both authenticated and non-authenticated users
    getHotAlbums: async (token?: string) => {
      try {
        return await fetchWithAuth("/api/albums/hot", { method: "GET" }, token);
      } catch (error) {
        console.error("Error fetching hot albums:", error);
        return {
          success: false,
          albums: [],
          message: "Failed to fetch albums",
        };
      }
    },

    // Get album by ID - works for both authenticated and non-authenticated users
    getById: async (albumId: string, token?: string) => {
      try {
        const response = await fetchWithAuth(
          `/api/albums/${albumId}?include=tracks.genres`,
          { method: "GET" },
          token
        );
        return response;
      } catch (error) {
        // console.error(`Error fetching album ${albumId}:`, error);
        // Still return or throw error so the calling component knows about it
        return { success: false, message: "Failed to fetch album details" }; // Assuming return based on code, adjust if it should throw
      }
    },

    // Get all albums - requires authentication
    getAlbums: async (
      token: string,
      page: number = 1,
      limit: number = 10,
      queryParams?: string
    ) => {
      try {
        return await fetchWithAuth(
          `/api/albums?${queryParams || `page=${page}&limit=${limit}`}`,
          { method: "GET" },
          token
        );
      } catch (error) {
        console.error("Error fetching albums:", error);
        return { success: false, data: [], pagination: { totalPages: 1 } };
      }
    },

    create: async (data: FormData, token: string) =>
      fetchWithAuth("/api/albums", { method: "POST", body: data }, token),

    update: async (id: string, data: FormData, token: string) =>
      fetchWithAuth(`/api/albums/${id}`, { method: "PUT", body: data }, token),

    delete: async (id: string, token: string) =>
      fetchWithAuth(`/api/albums/${id}`, { method: "DELETE" }, token),

    toggleVisibility: async (albumId: string, token: string) =>
      fetchWithAuth(
        `/api/albums/${albumId}/toggle-visibility`,
        { method: "PUT" },
        token
      ),

    uploadTracks: async (id: string, data: FormData, token: string) => {
      return fetchWithAuth(
        `/api/albums/${id}/tracks`,
        {
          method: "POST",
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
        { method: "GET" },
        token
      ),

    playAlbum: async (albumId: string, token: string) =>
      fetchWithAuth(`/api/albums/${albumId}/play`, { method: "POST" }, token),
  },

  genres: {
    getAll: async (
      token: string,
      page: number = 1,
      limit: number = 500,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/genres?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: "GET" },
        token
      ),
  },

  labels: {
    getAll: async (
      token: string,
      page: number,
      limit: number,
      queryParams?: string
    ) =>
      fetchWithAuth(
        `/api/labels?${queryParams || `page=${page}&limit=${limit}`}`,
        { method: "GET" },
        token
      ),

    getById: async (id: string, token: string) =>
      fetchWithAuth(`/api/labels/${id}`, { method: "GET" }, token),

    create: async (data: FormData, token: string) =>
      fetchWithAuth(
        "/api/labels",
        {
          method: "POST",
          body: data,
        },
        token
      ),

    update: async (id: string, data: FormData, token: string) =>
      fetchWithAuth(
        `/api/labels/${id}`,
        {
          method: "PUT",
          body: data,
        },
        token
      ),

    delete: async (id: string, token: string) =>
      fetchWithAuth(`/api/labels/${id}`, { method: "DELETE" }, token),

    requestRegistration: async (formData: FormData, token: string) => {
      return fetchWithAuth(
        `/api/labels/registrations`,
        { method: 'POST', body: formData },
        token
      );
    },
  },

  dashboard: {
    getDashboardStats: async (token: string) =>
      fetchWithAuth("/api/admin/dashboard-stats", { method: "GET" }, token),
  },

  notifications: {
    // Lấy danh sách notifications
    getList: async (token: string) =>
      fetchWithAuth("/api/notifications", { method: "GET" }, token),

    // Lấy số lượng thông báo chưa đọc
    getUnreadCount: async (token: string) =>
      fetchWithAuth(
        "/api/notifications/unread-count",
        { method: "GET" },
        token
      ),

    // Đánh dấu 1 thông báo đã đọc
    markAsRead: async (notificationId: string, token: string) =>
      fetchWithAuth(
        `/api/notifications/${notificationId}/read`,
        { method: "PATCH" },
        token
      ),

    // Đánh dấu tất cả thông báo đã đọc
    markAllAsRead: async (token: string) =>
      fetchWithAuth("/api/notifications/read-all", { method: "PATCH" }, token),

    // Xóa tất cả thông báo
    deleteAll: async (token: string) =>
      fetchWithAuth(
        "/api/notifications/delete-all",
        { method: "DELETE" },
        token
      ),

    // Xóa các thông báo đã đọc
    deleteRead: async (token: string) =>
      fetchWithAuth(
        "/api/notifications/delete-read",
        { method: "DELETE" },
        token
      ), // Thêm dòng này
  },

  playlists: {
    create: async (data: CreatePlaylistData, token: string) =>
      fetchWithAuth(
        "/api/playlists",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
        token
      ),

    getAll: async (token: string) =>
      fetchWithAuth("/api/playlists", { method: "GET" }, token),

    getUserPlaylists: async (token: string) => {
      try {
        return await fetchWithAuth("/api/playlists", { method: "GET" }, token);
      } catch (error) {
        console.error("Error fetching user playlists:", error);
        return {
          success: false,
          data: [],
          message: "Failed to fetch playlists",
        };
      }
    },

    getById: async (playlistId: string, token?: string) => {
      try {
        return await fetchWithAuth(
          `/api/playlists/${playlistId}`,
          { method: "GET" },
          token
        );
      } catch (error) {
        console.error(`Error fetching playlist ${playlistId}:`, error);
        return {
          success: false,
          data: null,
          message: "Failed to fetch playlist",
        };
      }
    },

    update: async (playlistId: string, data: any, token: string) => {
      try {
        return await fetchWithAuth(
          `/api/playlists/${playlistId}`,
          {
            method: "PATCH",
            body: JSON.stringify(data),
          },
          token
        );
      } catch (error) {
        console.error(`Error updating playlist ${playlistId}:`, error);
        throw error;
      }
    },

    updateCover: async (
      playlistId: string,
      formData: FormData,
      token: string
    ) => {
      try {
        return await fetchWithAuth(
          `/api/playlists/${playlistId}`,
          {
            method: "PATCH",
            body: formData,
          },
          token
        );
      } catch (error) {
        console.error(`Error updating playlist ${playlistId} cover:`, error);
        throw error;
      }
    },

    delete: async (playlistId: string, token: string) => {
      try {
        const response = await fetchWithAuth(
          `/api/playlists/${playlistId}`,
          {
            method: "DELETE",
          },
          token
        );
        return response;
      } catch (error) {
        console.error(`Error deleting playlist ${playlistId}:`, error);
        throw error;
      }
    },

    removeTrack: async (playlistId: string, trackId: string, token: string) => {
      try {
        return await fetchWithAuth(
          `/api/playlists/${playlistId}/tracks/${trackId}`,
          { method: "DELETE" },
          token
        );
      } catch (error) {
        console.error(
          `Error removing track ${trackId} from playlist ${playlistId}:`,
          error
        );
        throw error;
      }
    },

    addTrack: async (playlistId: string, trackId: string, token: string) => {
      try {
        console.log(`API: Adding track ${trackId} to playlist ${playlistId}`);
        return await fetchWithAuth(
          `/api/playlists/${playlistId}/tracks`,
          {
            method: "POST",
            body: JSON.stringify({ trackId }),
          },
          token
        );
      } catch (error) {
        console.error("API Error:", error);
        throw error;
      }
    },

    createPersonalized: async (token: string, data: any) => {
      const response = await fetch(`${API_BASE_URL}/playlists/personalized`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create personalized playlist");
      }

      return response.json();
    },

    // This function is used by both regular users and admins (backend handles authorization)
    getSystemPlaylists: async (
      token?: string,
      page: number = 1,
      limit: number = 10,
      params: string = "" // Accept URLSearchParams string
    ) => {
      try {
        const queryParams = new URLSearchParams(params);
        queryParams.set("page", page.toString());
        queryParams.set("limit", limit.toString());
        const url = `/api/playlists/system-all?${queryParams.toString()}`;
        return await fetchWithAuth(url, { method: "GET" }, token);
      } catch (error) {
        console.error("Error fetching system playlists:", error);
        return {
          success: false,
          data: [],
          message: "Failed to fetch system playlists",
          pagination: { currentPage: 1, totalPages: 1, totalItems: 0 }, // Provide default pagination on error
        };
      }
    },

    getUserSystemPlaylist: async () => {
      try {
        const token = localStorage.getItem("userToken");
        if (!token) {
          throw new Error("Token not found");
        }

        return await fetchWithAuth(
          "/api/playlists/system/user",
          { method: "GET" },
          token
        );
      } catch (error) {
        console.error("API Error:", error);
        throw error;
      }
    },

    getHomePageData: async (token?: string) => {
      try {
        return await fetchWithAuth(
          "/api/playlists/home",
          { method: "GET" },
          token
        );
      } catch (error) {
        console.error("Error fetching homepage data:", error);
        // Return empty data on error to prevent app from crashing
        return {
          success: false,
          data: {
            systemPlaylists: [],
            newestAlbums: [],
            hotAlbums: [],
            topTracks: [],
            userPlayHistory: [],
            userPlaylists: [],
          },
          message: "Failed to fetch homepage data",
        };
      }
    },

    getPlaylists: async (token: string) =>
      fetchWithAuth("/api/playlists", { method: "GET" }, token),

    getPlaylistById: async (playlistId: string, token?: string) =>
      fetchWithAuth(`/api/playlists/${playlistId}`, { method: "GET" }, token),

    getAllBaseSystemPlaylists: async (
      token: string,
      page: number = 1,
      limit: number = 10,
      params: string = ""
    ) => {
      const queryParams = new URLSearchParams(params);
      queryParams.set("page", page.toString());
      queryParams.set("limit", limit.toString());
      const queryString = queryParams.toString();

      return fetchWithAuth(
        `/api/playlists/admin/system/base?${queryString}`,
        { method: "GET" },
        token
      );
    },

    getPlaylistSuggest: async (token: string, playlistId?: string) => {
      const queryParams = playlistId ? `?playlistId=${playlistId}` : "";
      return fetchWithAuth(
        `/api/playlists/suggest${queryParams}`,
        { method: "GET" },
        token
      );
    },

    suggestMoreTracksForPlaylist: async (
      playlistId: string,
      token: string,
      count: number = 5
    ) => {
      return fetchWithAuth(
        `/api/playlists/${playlistId}/suggest-more?count=${count}`,
        { method: "GET" },
        token
      );
    },

    reorderTracks: async (
      playlistId: string,
      trackIds: string[], // Array of track IDs in the new order
      token: string
    ) => {
      return fetchWithAuth(
        `/api/playlists/${playlistId}/reorder`,
        {
          method: "PATCH",
          body: JSON.stringify({ trackIds }), // Send the array of IDs
        },
        token
      );
    },

    // --- NEW FUNCTION for Suggesting and Adding Tracks --- 
    suggestAndAddTracksByPrompt: async (
      playlistId: string,
      prompt: string,
      token: string
    ) => {
      return fetchWithAuth(
        `/api/generate/playlist/${playlistId}/suggest-more`,
        {
          method: "POST",
          body: JSON.stringify({ prompt }),
        },
        token
      );
    },
  },

  upload: {
    image: async (formData: FormData, token: string) => {
      const response = await fetch(`${API_BASE_URL}/upload/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Không thể tải ảnh lên");
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
        { method: "GET" },
        token
      ),

    follow: async (targetId: string, token: string) =>
      fetchWithAuth(`/api/user/follow/${targetId}`, { method: "POST" }, token),

    unfollow: async (targetId: string, token: string) =>
      fetchWithAuth(
        `/api/user/unfollow/${targetId}`,
        { method: "DELETE" },
        token
      ),
  },

  reports: {
    create: async (
      data: {
        type: string;
        description: string;
        trackId?: string;
        playlistId?: string;
        albumId?: string;
      },
      token: string
    ) => {
      return fetchWithAuth(
        "/api/reports",
        {
          method: "POST",
          body: JSON.stringify(data),
        },
        token
      );
    },

    getUserReports: async (
      token: string,
      page: number = 1,
      limit: number = 10
    ) => {
      return fetchWithAuth(
        `/api/reports/my-reports?page=${page}&limit=${limit}`,
        { method: "GET" },
        token
      );
    },

    getReport: async (id: string, token: string) => {
      return fetchWithAuth(`/api/reports/${id}`, { method: "GET" }, token);
    },

    // Admin only
    getAllReports: async (
      token: string,
      page: number = 1,
      limit: number = 10,
      filters: { type?: string; status?: string } = {}
    ) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters.type) {
        params.append("type", filters.type);
      }

      if (filters.status) {
        params.append("status", filters.status);
      }

      return fetchWithAuth(
        `/api/reports?${params.toString()}`,
        { method: "GET" },
        token
      );
    },

    // Admin only
    resolveReport: async (
      id: string,
      data: { status: string; resolution: string },
      token: string
    ) => {
      return fetchWithAuth(
        `/api/reports/${id}/resolve`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
        token
      );
    },
  },

  // --- NEW SECTION for Generate API ---
  generate: {
    createPlaylistFromPrompt: async (
      data: { prompt: string },
      token: string
    ) => {
      return fetchWithAuth(
        "/api/generate/playlist", // Matches the backend route
        {
          method: "POST",
          body: JSON.stringify(data),
        },
        token
      );
    },
  },
  // --- END NEW SECTION ---
};
