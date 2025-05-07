"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { Playlist, PlaylistTrack, Track, ArtistProfile } from "@/types"; // Assuming Playlist type is defined in @/types
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
import { Loader2, ArrowUpDown, Eye, RefreshCw } from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls"; // Assuming a Pagination component exists
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define the structure of the playlist data we expect from the API
interface PlaylistWithPreview extends Playlist {
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

interface UserAiPlaylistsTabProps {
  userId: string;
  refreshTrigger?: number; // Optional trigger from parent to force refresh
}

export const UserAiPlaylistsTab = ({
  userId,
  refreshTrigger,
}: UserAiPlaylistsTabProps) => {
  const { theme } = useTheme();
  const [playlists, setPlaylists] = useState<PlaylistWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // For toggle visibility action
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "createdAt",
    direction: "desc",
  });
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);

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

        const response: ApiResponse = await api.admin.getUserAiPlaylists(
          userId,
          token,
          params.toString()
        );
        console.log(
          "[UserAiPlaylistsTab] Fetched playlists RESPONSE:",
          response
        ); // LOG RESPONSE
        setPlaylists(response.data || []);
        setPagination((prev) => ({
          currentPage: response.pagination?.currentPage ?? 1,
          totalPages: response.pagination?.totalPages ?? 1,
          totalItems: response.pagination?.totalItems ?? 0,
          hasNextPage: response.pagination?.hasNextPage ?? false,
          hasPrevPage: response.pagination?.hasPrevPage ?? false,
        }));
      } catch (err: any) {
        console.error("Error fetching AI playlists:", err);
        setError(err.message || "Could not load AI playlists");
        toast.error(err.message || "Could not load AI playlists");
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
      "[UserAiPlaylistsTab] useEffect triggered. Page:",
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
      "[UserAiPlaylistsTab] SortConfig changed, resetting page to 1. New sort:",
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

      await api.admin.updateAiPlaylistVisibility(
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
            AI Generated Playlists
          </CardTitle>
        </CardHeader>
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">Không tìm thấy Playlist AI được tạo</p>
            <p>Người dùng này hiện chưa có playlist nào do AI tạo.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <CardTitle className="text-xl sm:text-2xl">
            AI Generated Playlists ({pagination.totalItems} playlists)
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* <Input placeholder="Search AI playlists..." className="sm:w-[250px]" /> */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocalRefreshTrigger((prev) => prev + 1)}
              disabled={loading}
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
          <div className="mx-4 my-2 p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm sm:mx-6">
            <p>
              Could not fully refresh data. Displaying last known playlists.
              Error: {error}
            </p>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table className="min-w-full table-fixed">
            <colgroup>
              <col className="w-[60px] sm:w-[70px]" />
              <col className="w-[40%] sm:w-[35%]" />
              <col className="w-[15%] hidden md:table-column" />
              <col className="w-[20%] hidden sm:table-column" />
              <col className="w-[15%] sm:w-[20%]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4 sm:pl-6">Preview</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell text-center">
                  Tracks
                </TableHead>
                <TableHead className="hidden sm:table-cell text-center">
                  Visibility
                </TableHead>
                <TableHead className="text-right pr-4 sm:pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && playlists.length > 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              )}
              {playlists.map((playlist) => (
                <TableRow key={playlist.id} className="hover:bg-muted/50">
                  <TableCell className="pl-4 sm:pl-6 py-2 align-middle">
                    {playlist.tracks && playlist.tracks.length > 0 ? (
                      <div className="flex -space-x-2 overflow-hidden">
                        {playlist.tracks.slice(0, 3).map(({ track }) =>
                          track.coverUrl ? (
                            <img
                              key={track.id}
                              src={track.coverUrl}
                              alt={track.title}
                              title={`${track.title} by ${
                                track.artist?.artistName || "Unknown"
                              }`}
                              className="inline-block h-8 w-8 rounded-full ring-2 ring-background"
                            />
                          ) : (
                            <div
                              key={track.id}
                              className="h-8 w-8 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-xs"
                            >
                              ?
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No tracks
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 align-middle">
                    <div className="font-medium truncate" title={playlist.name}>
                      {playlist.name}
                    </div>
                    {playlist.description && (
                      <p
                        className="text-xs text-muted-foreground mt-1 truncate"
                        title={playlist.description}
                      >
                        {playlist.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-2 align-middle text-center">
                    {playlist.totalTracks}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell py-2 align-middle text-center">
                    <Badge
                      variant={
                        playlist.privacy === "PUBLIC" ? "default" : "secondary"
                      }
                      className={`
                        ${
                          playlist.privacy === "PUBLIC"
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-gray-500 hover:bg-gray-600"
                        }
                         text-white px-2 py-0.5 text-xs rounded-full transition-colors duration-150
                      `}
                    >
                      {actionLoading === playlist.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        playlist.privacy
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4 sm:pr-6 py-2 align-middle">
                    <div className="flex items-center justify-center gap-2">
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
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        title="Preview Playlist"
                        onClick={() =>
                          toast("Preview functionality not yet implemented.")
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {/* Add Delete button if needed */}
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
    </Card>
  );
};
