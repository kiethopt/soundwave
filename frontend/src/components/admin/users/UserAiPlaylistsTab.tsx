"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Playlist, Track, ArtistProfile } from "@/types";
import { api } from "@/utils/api";
import toast from "react-hot-toast";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowUpDown, Eye, RefreshCw, Trash2 } from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaylistPreviewModal } from "./PlaylistPreviewModal";
import { DeletePlaylistModal } from "./DeletePlaylistModal";

// Define the structure of the playlist data we expect from the API
interface PlaylistWithPreview extends Omit<Playlist, "tracks"> {
  tracks: {
    track: Pick<Track, "id" | "title" | "coverUrl"> & {
      artist: Pick<ArtistProfile, "artistName"> | null;
    };
  }[];
}

interface ApiResponse {
  data: PlaylistWithPreview[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface SortConfig {
  key: keyof Playlist | null;
  direction: "asc" | "desc";
}

interface UserSystemPlaylistsTabProps {
  userId: string;
  refreshTrigger?: number;
}

export const UserSystemPlaylistsTab = ({
  userId,
  refreshTrigger,
}: UserSystemPlaylistsTabProps) => {
  const { theme } = useTheme();
  const [playlists, setPlaylists] = useState<PlaylistWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "createdAt",
    direction: "desc",
  });
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);
  const [previewingPlaylist, setPreviewingPlaylist] =
    useState<PlaylistWithPreview | null>(null);
  const [isPlaylistPreviewModalOpen, setIsPlaylistPreviewModalOpen] =
    useState(false);
  const [deletingPlaylist, setDeletingPlaylist] =
    useState<PlaylistWithPreview | null>(null);
  const [isDeletePlaylistModalOpen, setIsDeletePlaylistModalOpen] =
    useState(false);
  const [isDeletingPlaylist, setIsDeletingPlaylist] = useState(false);

  const limit = 10; // Or fetch from config/props

  const fetchPlaylists = useCallback(
    async (page: number, sort: SortConfig) => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("userToken");
        if (!token) throw new Error("No authentication token found");

        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (sort.key) {
          params.append("sortBy", sort.key);
          params.append("sortOrder", sort.direction);
        }
        // Add search param if needed later

        const response: ApiResponse = await api.admin.getUserSystemPlaylists(
          userId,
          token,
          params.toString()
        );
        console.log(
          "[UserSystemPlaylistsTab] Fetched playlists RESPONSE:",
          response
        ); // LOG RESPONSE
        
        // Add this log to debug pagination
        console.log("[UserAiPlaylistsTab] Pagination data:", response.pagination);
        
        setPlaylists(response.data || []);
        setPagination({
          currentPage: response.pagination?.currentPage ?? 1,
          totalPages: response.pagination?.totalPages ?? 1,
          totalItems: response.pagination?.totalItems ?? 0,
          hasNextPage: response.pagination?.hasNextPage ?? false,
          hasPrevPage: response.pagination?.hasPrevPage ?? false,
        });
      } catch (err: any) {
        console.error("Error fetching System Playlists:", err);
        setError(err.message || "Could not load System Playlists");
        toast.error(err.message || "Could not load System Playlists");
        setPlaylists([]);
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false,
        });
      } finally {
        setLoading(false);
      }
    },
    [userId, limit]
  );

  const refreshData = useCallback(() => {
    fetchPlaylists(pagination.currentPage, sortConfig);
  }, [fetchPlaylists, pagination.currentPage, sortConfig]);

  // Fetch data on initial load, page change, sort change, or trigger changes
  useEffect(() => {
    console.log(
      "[UserSystemPlaylistsTab] useEffect triggered. Page:",
      pagination.currentPage,
      "Sort Key:",
      sortConfig.key,
      "Sort Dir:",
      sortConfig.direction,
      "LocalRefresh:",
      localRefreshTrigger,
      "ParentRefresh:",
      refreshTrigger
    );
    fetchPlaylists(pagination.currentPage, sortConfig);
  }, [
    fetchPlaylists,
    pagination.currentPage,
    sortConfig.key, // Changed
    sortConfig.direction, // Changed
    localRefreshTrigger,
    refreshTrigger,
  ]);

  // Reset page if sort changes
  useEffect(() => {
    console.log(
      "[UserSystemPlaylistsTab] SortConfig changed, resetting page to 1. New sort:",
      sortConfig
    );
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, [sortConfig.key, sortConfig.direction]);

  const handleSort = (key: keyof Playlist | null) => {
    if (!key) return;
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleVisibilityChange = async (
    playlistId: string,
    currentVisibility: "PUBLIC" | "PRIVATE"
  ) => {
    const newVisibility = currentVisibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    setActionLoading(playlistId);
    const toastId = toast.loading(`Updating visibility to ${newVisibility}...`);
    try {
      const token = localStorage.getItem("userToken");
      if (!token) throw new Error("No authentication token found");

      await api.admin.updateSystemPlaylistVisibility(
        playlistId,
        newVisibility,
        token
      );
      toast.success("Visibility updated successfully!", { id: toastId });
      // Refresh data by incrementing local trigger
      setLocalRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      console.error("Error updating playlist visibility:", err);
      toast.error(err.message || "Failed to update visibility.", {
        id: toastId,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenPreviewModal = (playlist: PlaylistWithPreview) => {
    // Make sure playlist has required data before opening modal
    if (!playlist || !playlist.name) {
      console.error(
        "[UserSystemPlaylistsTab] Cannot preview playlist: Missing required data",
        playlist
      );
      toast.error("Cannot preview this playlist. Missing required data.");
      return;
    }

    // Ensure playlist tracks are properly formatted before opening modal
    if (!playlist.tracks || !Array.isArray(playlist.tracks)) {
      console.warn(
        "[UserSystemPlaylistsTab] Playlist has no tracks or invalid tracks format",
        playlist
      );
      // Still allow opening by providing empty tracks array
      setPreviewingPlaylist({
        ...playlist,
        tracks: [],
      });
    } else {
      // Just use the playlist as is, the modal component handles null checks
      setPreviewingPlaylist(playlist);
    }

    setIsPlaylistPreviewModalOpen(true);
  };

  const handleClosePreviewModal = () => {
    setIsPlaylistPreviewModalOpen(false);
    setPreviewingPlaylist(null);
  };

  // New function to handle both refresh and close for the preview modal
  const handleRefreshAndClosePreviewModal = () => {
    handleClosePreviewModal(); // Close the modal first
    setLocalRefreshTrigger((prev) => prev + 1); // Trigger data refresh
    // Alternatively, if refreshData was kept: refreshData();
  };

  const handleOpenDeleteModal = (playlist: PlaylistWithPreview) => {
    setDeletingPlaylist(playlist);
    setIsDeletePlaylistModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeletePlaylistModalOpen(false);
    setDeletingPlaylist(null);
  };

  const handleDeletePlaylist = async () => {
    if (!deletingPlaylist) return;

    setIsDeletingPlaylist(true);
    const toastId = toast.loading("Deleting playlist...");

    try {
      const token = localStorage.getItem("userToken");
      if (!token) throw new Error("No authentication token found");

      await api.admin.deleteSystemPlaylist(deletingPlaylist.id, token);

      toast.success("Playlist successfully deleted!", { id: toastId });
      handleCloseDeleteModal();
      // Refresh data
      setLocalRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      console.error("Error deleting playlist:", err);
      toast.error(err.message || "Could not delete playlist.", { id: toastId });
    } finally {
      setIsDeletingPlaylist(false);
    }
  };

  const renderSortIcon = (key: keyof Playlist) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === "asc" ? (
      <ArrowUpDown className="ml-2 h-4 w-4" />
    ) : (
      <ArrowUpDown className="ml-2 h-4 w-4" />
    );
    // Consider using ArrowUp/ArrowDown for clearer indication
  };

  if (loading && playlists.length === 0) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 bg-red-500/10 p-4 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (!loading && !error && playlists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            System Generated Playlists
          </CardTitle>
        </CardHeader>
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">No System Playlists Found</p>
            <p>This user doesn't have any system playlists yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl shadow-lg">
      <CardHeader className="px-6 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-xl font-bold text-foreground">
            AI Generated Playlists ({playlists.length || 0})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocalRefreshTrigger((prev) => prev + 1)}
              disabled={loading}
              className="h-9"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error && playlists.length > 0 && (
          <div className="mx-6 my-2 p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm">
            <p>
              Could not fully refresh data. Displaying last known playlists.
              Error: {error}
            </p>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px] px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">Preview</TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Name</TableHead>
                <TableHead className="w-[100px] px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">Tracks</TableHead>
                <TableHead className="w-[120px] px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">Visibility</TableHead>
                <TableHead className="w-[120px] px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && playlists.length > 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              )}
              {playlists.map((playlist) => (
                <TableRow key={playlist.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="px-6 py-4 text-center">
                    {playlist.tracks && playlist.tracks.length > 0 ? (
                      <div className="flex justify-center -space-x-2">
                        {playlist.tracks.slice(0, 3).map(({ track }) =>
                          track.coverUrl ? (
                            <img
                              key={track.id}
                              src={track.coverUrl}
                              alt={track.title}
                              title={`${track.title} by ${track.artist?.artistName || "Unknown"}`}
                              className="h-12 w-12 rounded-full object-cover border-2 border-primary/30 shadow"
                            />
                          ) : (
                            <div
                              key={track.id}
                              className="h-12 w-12 rounded-full border-2 border-primary/30 bg-muted flex items-center justify-center text-xs shadow"
                            >
                              <img
                                src="/images/default-track.jpg"
                                alt="Default cover"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No tracks
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="font-medium text-sm" title={playlist.name}>
                      {playlist.name}
                    </div>
                    {playlist.description && (
                      <p
                        className="text-sm text-muted-foreground mt-1 truncate"
                        title={playlist.description}
                      >
                        {playlist.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center text-sm">
                    {playlist.totalTracks}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <Badge
                      variant={playlist.privacy === "PUBLIC" ? "default" : "secondary"}
                      className={`
                        ${playlist.privacy === "PUBLIC"
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-gray-500 hover:bg-gray-600"}
                         text-white px-2.5 py-1 text-xs rounded-full transition-colors duration-150
                      `}
                    >
                      {actionLoading === playlist.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        playlist.privacy
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <Switch
                        id={`visibility-switch-${playlist.id}`}
                        checked={playlist.privacy === "PUBLIC"}
                        onCheckedChange={() =>
                          handleVisibilityChange(playlist.id, playlist.privacy)
                        }
                        disabled={actionLoading === playlist.id}
                        aria-label={
                          playlist.privacy === "PUBLIC"
                            ? "Unpublish Playlist"
                            : "Publish Playlist"
                        }
                        className="h-5 w-10"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        title="Preview Playlist"
                        onClick={() => handleOpenPreviewModal(playlist)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive-foreground hover:bg-destructive"
                        title="Delete Playlist"
                        onClick={() => handleOpenDeleteModal(playlist)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {!loading && pagination.totalPages > 1 && (
        <div className="px-4 py-3 sm:px-6 border-t">
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            hasNextPage={pagination.currentPage < pagination.totalPages}
            hasPrevPage={pagination.currentPage > 1}
          />
        </div>
      )}
      {previewingPlaylist && (
        <PlaylistPreviewModal
          isOpen={isPlaylistPreviewModalOpen}
          onClose={handleClosePreviewModal}
          playlist={previewingPlaylist}
          theme={theme === "dark" ? "dark" : "light"}
          onRefreshAndClose={handleRefreshAndClosePreviewModal}
        />
      )}
      {deletingPlaylist && (
        <DeletePlaylistModal
          isOpen={isDeletePlaylistModalOpen}
          onClose={handleCloseDeleteModal}
          onConfirm={handleDeletePlaylist}
          playlistName={deletingPlaylist.name}
          isDeleting={isDeletingPlaylist}
          theme={theme}
        />
      )}
    </Card>
  );
};
