"use client";

import React, { useState, useEffect, useCallback } from "react";
import type {
  Playlist,
  Track,
  ArtistProfile,
  Genre as PrismaGenre,
} from "@/types"; // Assuming Genre might be a Prisma type
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
// import { ConfirmDeletePlaylistModal } from "./ConfirmDeletePlaylistModal"; // Sẽ thêm sau

// Interface cho track trong PlaylistPreviewModal mong đợi
interface PreviewModalTrackData
  extends Pick<Track, "id" | "title" | "coverUrl" | "duration"> {
  artist: Pick<ArtistProfile, "artistName"> | null;
  album?: { title?: string } | null;
  genres?: { genre: { name: string } }[]; // Đã sửa: Cập nhật cấu trúc genres
  addedAt?: string;
}

// Interface cho playlist mà PlaylistPreviewModal mong đợi
interface PreviewModalPlaylistData extends Omit<Playlist, "tracks"> {
  id: string;
  name: string;
  description?: string; // Đã sửa: description là string | undefined để khớp với Omit<Playlist, "tracks">
  tracks: { track: PreviewModalTrackData; addedAt?: string }[];
}

// Interface cho dữ liệu track nhận từ API (có thể phức tạp hơn)
interface ApiTrackData
  extends Pick<Track, "id" | "title" | "coverUrl" | "duration"> {
  artist: Pick<ArtistProfile, "artistName"> | null;
  album?: { title?: string } | null;
  // Giả sử API trả về cấu trúc genres lồng nhau từ Prisma
  genres?: { genre: Pick<PrismaGenre, "name"> }[];
  // Thêm các trường khác mà API có thể trả về cho track
}

// Interface cho playlist nhận từ API, chứa ApiTrackData
interface PlaylistFromApi extends Omit<Playlist, "tracks"> {
  tracks: {
    track: ApiTrackData;
    addedAt?: string; // Ngày track được thêm vào playlist này
  }[];
}

interface ApiResponse {
  data: PlaylistFromApi[];
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

export const UserSystemPlaylistsTab: React.FC<UserSystemPlaylistsTabProps> = ({
  userId,
  refreshTrigger,
}) => {
  const { theme } = useTheme();
  // State sẽ lưu trữ dữ liệu đã được chuyển đổi, sẵn sàng cho PlaylistPreviewModal
  const [playlistsForModal, setPlaylistsForModal] = useState<
    PreviewModalPlaylistData[]
  >([]);
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
    useState<PreviewModalPlaylistData | null>(null);
  const [isPlaylistPreviewModalOpen, setIsPlaylistPreviewModalOpen] =
    useState(false);

  const limit = 10;

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

        // Sử dụng API call thật sự
        const response: ApiResponse = await api.admin.getUserSystemPlaylists(
          userId,
          token,
          params.toString()
        );

        const transformedPlaylists = response.data.map((p) => ({
          ...p,
          tracks: p.tracks.map((pt) => ({
            track: {
              id: pt.track.id,
              title: pt.track.title,
              coverUrl: pt.track.coverUrl,
              duration:
                typeof pt.track.duration === "number"
                  ? pt.track.duration
                  : 0,
              artist: pt.track.artist,
              album:
                pt.track.album && pt.track.album.title
                  ? { title: pt.track.album.title }
                  : { title: "N/A" },
              genres:
                Array.isArray(pt.track.genres) && pt.track.genres.length > 0
                  ? pt.track.genres
                      .filter((g) => g && g.genre && g.genre.name)
                      .map((g) => ({ genre: { name: g.genre.name } }))
                  : [],
            },
            addedAt: pt.addedAt,
          })),
        }));

        console.log(
          "[UserSystemPlaylistsTab] Transformed Playlists for Modal:",
          transformedPlaylists
        );
        setPlaylistsForModal(transformedPlaylists);

        setPagination((prev) => ({
          currentPage: response.pagination?.currentPage ?? 1,
          totalPages: response.pagination?.totalPages ?? 1,
          totalItems: response.pagination?.totalItems ?? 0,
          hasNextPage: response.pagination?.hasNextPage ?? false,
          hasPrevPage: response.pagination?.hasPrevPage ?? false,
        }));
      } catch (err: any) {
        console.error("Error fetching System Playlists:", err);
        setError(err.message || "Could not load System Playlists");
        toast.error(err.message || "Could not load System Playlists");
        setPlaylistsForModal([]);
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

  useEffect(() => {
    fetchPlaylists(pagination.currentPage, sortConfig);
  }, [
    fetchPlaylists,
    pagination.currentPage,
    sortConfig.key,
    sortConfig.direction,
    localRefreshTrigger,
    refreshTrigger,
  ]);

  useEffect(() => {
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

  const handleOpenPreviewModal = (playlist: PreviewModalPlaylistData) => {
    setPreviewingPlaylist(playlist);
    setIsPlaylistPreviewModalOpen(true);
  };

  const handleClosePreviewModal = () => {
    setIsPlaylistPreviewModalOpen(false);
    setPreviewingPlaylist(null);
  };

  const handleRefreshAndCloseModal = () => {
    handleClosePreviewModal();
    refreshData(); // Hoặc setLocalRefreshTrigger((prev) => prev + 1);
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
  };

  if (loading && playlistsForModal.length === 0) {
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

  if (!loading && !error && playlistsForModal.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            System Generated Playlists
          </CardTitle>
        </CardHeader>
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">Không tìm thấy System Playlist được tạo</p>
            <p>Người dùng này hiện chưa có system playlist nào.</p>
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
            System Generated Playlists ({pagination.totalItems} playlists)
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
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
        {error && playlistsForModal.length > 0 && (
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
              {loading && playlistsForModal.length > 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </TableCell>
                </TableRow>
              )}
              {playlistsForModal.map((playlist) => (
                <TableRow key={playlist.id} className="hover:bg-muted/50">
                  <TableCell className="pl-4 sm:pl-6 py-2 align-middle">
                    {playlist.tracks && playlist.tracks.length > 0 ? (
                      <div className="flex -space-x-2 overflow-hidden">
                        {playlist.tracks.slice(0, 3).map(({ track }) => {
                          const isValidUrl =
                            track.coverUrl &&
                            typeof track.coverUrl === "string" &&
                            (track.coverUrl.startsWith("http") ||
                              track.coverUrl.startsWith("/"));
                          if (!isValidUrl && track.coverUrl) {
                            console.warn(
                              "[UserSystemPlaylistsTab] Invalid track.coverUrl detected:",
                              track.coverUrl,
                              "for track:",
                              track.id
                            );
                          }
                          const imageUrl = isValidUrl
                            ? track.coverUrl
                            : "/images/default-track.jpg";

                          return imageUrl ? (
                            <img
                              key={track.id}
                              src={imageUrl}
                              alt={track.title || "Track cover"}
                              title={`${track.title || "N/A"} by ${
                                track.artist?.artistName || "Unknown"
                              }`}
                              className="inline-block h-8 w-8 rounded-full ring-2 ring-background object-cover"
                              onError={(e) => {
                                console.error(
                                  "[UserSystemPlaylistsTab] Image onError for src:",
                                  imageUrl,
                                  e
                                );
                                (e.target as HTMLImageElement).src =
                                  "/images/default-track.jpg";
                              }}
                            />
                          ) : (
                            <div
                              key={track.id}
                              className="h-8 w-8 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-xs overflow-hidden"
                              title="Default track cover"
                            >
                              <img
                                src="/images/default-track.jpg"
                                alt="Default track cover"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          );
                        })}
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
                    {/* Sử dụng playlist.tracks.length vì totalTracks từ API có thể chưa khớp nếu có lỗi */}
                    {playlist.tracks.length}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell py-2 align-middle text-center">
                    <Badge
                      variant={
                        playlist.privacy === "PUBLIC" ? "default" : "secondary"
                      }
                      className={`${
                        playlist.privacy === "PUBLIC"
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-gray-500 hover:bg-gray-600"
                      } text-white px-2 py-0.5 text-xs rounded-full transition-colors duration-150`}
                    >
                      {actionLoading === playlist.id &&
                      playlist.privacy !==
                        (actionLoading === playlist.id
                          ? "PRIVATE"
                          : "PUBLIC") ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        playlist.privacy
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-4 sm:pr-6 py-2 align-middle">
                    <div className="flex items-center justify-end gap-1">
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
                        onClick={() => handleOpenPreviewModal(playlist)}
                      >
                        <Eye className="h-4 w-4" />
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
          theme={theme}
          onRefreshAndClose={handleRefreshAndCloseModal}
        />
      )}
    </Card>
  );
};
