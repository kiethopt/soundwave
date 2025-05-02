"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/utils/api";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Trash2,
  Search,
  Edit,
  Eye,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Playlist } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { SystemPlaylistModal } from "@/components/ui/admin-modals";

interface SortConfig {
  key:
    | keyof Omit<
        Playlist,
        | "tracks"
        | "totalTracks"
        | "totalDuration"
        | "canEdit"
        | "basedOnMood"
        | "basedOnGenre"
        | "basedOnArtist"
        | "basedOnSongLength"
        | "basedOnReleaseTime"
        | "trackCount"
      >
    | "isAIGenerated"
    | "type"
    | null;
  direction: "asc" | "desc";
}

export const SystemPlaylistManagement: React.FC<{
  theme: "light" | "dark";
}> = ({ theme }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(
    new Set()
  );
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "createdAt",
    direction: "desc",
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);
  const limit = 10;

  const fetchPlaylists = useCallback(
    async (page: number, search: string, sort: SortConfig) => {
      setLoading(true);
      try {
        const token = localStorage.getItem("userToken");
        if (!token) {
          throw new Error("No authentication token found");
        }

        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (search) {
          params.append("search", search);
        }
        if (sort.key) {
          params.append("sortBy", sort.key);
          params.append("sortOrder", sort.direction);
        }

        // Use getAllBaseSystemPlaylists which fetches only the base template playlists
        const response = await api.playlists.getAllBaseSystemPlaylists(
          token,
          page,
          limit,
          params.toString()
        );

        if (response.success && response.data && response.pagination) {
          setPlaylists(response.data || []);
          setTotalPages(response.pagination?.totalPages || 1);
        } else {
          console.error(
            "Unexpected API response structure for playlists:",
            response
          );
          const message =
            response.message || "Failed to parse playlist data from API.";
          toast.error(message);
          setPlaylists([]);
          setTotalPages(1);
        }
      } catch (err: any) {
        console.error("Error fetching system playlists:", err);
        toast.error(err.message || "Could not load system playlists");
        setPlaylists([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refreshPlaylists = useCallback(() => {
    fetchPlaylists(currentPage, activeSearchTerm, sortConfig);
    setSelectedPlaylistIds(new Set());
  }, [fetchPlaylists, currentPage, activeSearchTerm, sortConfig]);

  useEffect(() => {
    fetchPlaylists(currentPage, activeSearchTerm, sortConfig);
  }, [fetchPlaylists, currentPage, activeSearchTerm, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearchTerm, sortConfig]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActiveSearchTerm(searchInput);
  };

  const formatPlaylistDate = (date: string) => {
    return format(new Date(date), "MMM d, yyyy h:mm a");
  };

  const handleSort = (key: SortConfig["key"]) => {
    if (!key) return;
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleEditPlaylist = (playlist: Playlist) => {
    setEditPlaylist(playlist);
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this playlist? This action cannot be undone."
      )
    ) {
      return;
    }

    setActionLoading(playlistId);
    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        throw new Error("No authentication token found");
      }

      await api.admin.deleteSystemPlaylist(playlistId, token);
      toast.success("Playlist deleted successfully");
      refreshPlaylists();
      setSelectedPlaylistIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(playlistId);
        return newSet;
      });
    } catch (err: any) {
      console.error("Error deleting playlist:", err);
      toast.error(err.message || "Failed to delete playlist");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedPlaylistIds.size === 0) {
      toast("No playlists selected.", { icon: "⚠️" });
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedPlaylistIds.size} selected playlist(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    const deleteMultiplePlaylists = async () => {
      setActionLoading("bulk-delete");
      try {
        const token = localStorage.getItem("userToken");
        if (!token) {
          throw new Error("No authentication token found");
        }

        await Promise.all(
          Array.from(selectedPlaylistIds).map((id) =>
            api.admin.deleteSystemPlaylist(id, token)
          )
        );

        toast.success(
          `Successfully deleted ${selectedPlaylistIds.size} playlist(s)`
        );
        refreshPlaylists();
        setSelectedPlaylistIds(new Set());
      } catch (err: any) {
        console.error("Error deleting playlists:", err);
        toast.error(err.message || "Failed to delete playlists");
      } finally {
        setActionLoading(null);
      }
    };

    deleteMultiplePlaylists();
  };

  const handleCreateSubmit = async (formData: FormData) => {
    try {
      const token = localStorage.getItem("userToken") || "";
      await api.admin.createSystemPlaylist(formData, token);
      toast.success("System playlist created successfully!");
      refreshPlaylists();
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Error creating playlist:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create system playlist"
      );
    }
  };

  const handleEditSubmit = async (formData: FormData) => {
    if (!editPlaylist?.id) return;

    try {
      const token = localStorage.getItem("userToken") || "";
      await api.admin.updateSystemPlaylist(editPlaylist.id, formData, token);
      toast.success("Playlist updated successfully!");
      setEditPlaylist(null);
      refreshPlaylists();
    } catch (error) {
      console.error("Error updating playlist:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update system playlist"
      );
    }
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked === true) {
      const allIds = new Set(playlists.map((p) => p.id));
      setSelectedPlaylistIds(allIds);
    } else {
      setSelectedPlaylistIds(new Set());
    }
  };

  const handleSelectRow = (
    playlistId: string,
    checked: boolean | "indeterminate"
  ) => {
    setSelectedPlaylistIds((prev) => {
      const newSet = new Set(prev);
      if (checked === true) {
        newSet.add(playlistId);
      } else {
        newSet.delete(playlistId);
      }
      return newSet;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleUpdatePlaylistsNow = async () => {
    const token = localStorage.getItem("userToken") || "";
    setIsUpdateLoading(true);
    toast.loading("Updating system playlists...");
    try {
      await api.admin.updateAllSystemPlaylists(token);
      toast.dismiss();
      toast.success("System playlists update started!");
      setTimeout(() => refreshPlaylists(), 3000);
    } catch (error) {
      toast.dismiss();
      console.error("Error triggering playlist update:", error);
      toast.error("Failed to start system playlist update.");
    } finally {
      setIsUpdateLoading(false);
    }
  };

  const isAllSelected =
    playlists.length > 0 && selectedPlaylistIds.size === playlists.length;
  const isIndeterminate =
    selectedPlaylistIds.size > 0 && selectedPlaylistIds.size < playlists.length;

  // Function to sort playlists based on sortConfig
  const sortedPlaylists = React.useMemo(() => {
    if (!sortConfig.key) return playlists;

    return [...playlists].sort((a, b) => {
      if (sortConfig.key === "createdAt") {
        const aValue = new Date(a.createdAt).getTime();
        const bValue = new Date(b.createdAt).getTime();
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue;
      }

      if (sortConfig.key === "isAIGenerated") {
        const aValue = a.isAIGenerated;
        const bValue = b.isAIGenerated;
        return sortConfig.direction === "asc"
          ? aValue === bValue
            ? 0
            : aValue
            ? 1
            : -1
          : aValue === bValue
          ? 0
          : aValue
          ? -1
          : 1;
      }

      if (sortConfig.key === "type") {
        const aValue = a.type || "";
        const bValue = b.type || "";
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const aValue = a[sortConfig.key as keyof typeof a] || "";
      const bValue = b[sortConfig.key as keyof typeof b] || "";

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [playlists, sortConfig]);

  return (
    <>
      <Card
        className={`${
          theme === "dark" ? "bg-[#1e1e1e] border-white/10" : "bg-white"
        }`}
      >
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
            <CardTitle
              className={`${theme === "dark" ? "text-white" : "text-gray-900"}`}
            >
              System Playlist Management
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                variant="outline"
                className={`${
                  theme === "dark"
                    ? "bg-white/10 hover:bg-white/20 text-white border-white/20"
                    : ""
                }`}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Playlist
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p
            className={`${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Manage and update system-generated playlists like "Hot Hits", "New
            Releases", etc. These playlists are automatically personalized for
            each user.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleUpdatePlaylistsNow}
              className={`${
                theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : ""
              } ${isUpdateLoading ? "opacity-80 pointer-events-none" : ""}`}
              disabled={isUpdateLoading}
            >
              {isUpdateLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update All Now
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className={`${
                theme === "dark"
                  ? "bg-white/10 hover:bg-white/20 text-white border-white/20"
                  : ""
              }`}
              disabled
            >
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Update
              <span className="ml-2 text-xs opacity-70">(Coming Soon)</span>
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 mb-4 mt-6">
            <form onSubmit={handleSearchSubmit} className="relative flex-grow">
              <Search
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              />
              <Input
                type="text"
                placeholder="Search playlists and press Enter..."
                value={searchInput}
                onChange={handleSearchChange}
                className={`pl-10 pr-4 py-2 w-full rounded-md border h-10 ${
                  theme === "dark"
                    ? "bg-[#3a3a3a] border-gray-600 text-white"
                    : "border-gray-300"
                }`}
              />
              <button type="submit" className="hidden">
                Search
              </button>
            </form>
          </div>

          {loading ? (
            <div className="text-center py-4">Loading playlists...</div>
          ) : (
            <>
              <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table
                  className={`w-full text-sm text-left ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  <thead
                    className={`text-xs uppercase ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-400"
                        : "bg-gray-50 text-gray-700"
                    }`}
                  >
                    <tr>
                      <th scope="col" className="p-4 rounded-tl-md">
                        <Checkbox
                          id="select-all-checkbox"
                          checked={
                            isAllSelected
                              ? true
                              : isIndeterminate
                              ? "indeterminate"
                              : false
                          }
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all playlists"
                          className={`${
                            theme === "dark"
                              ? "border-gray-600"
                              : "border-gray-300"
                          }`}
                          disabled={loading || actionLoading !== null}
                        />
                      </th>
                      <th
                        scope="col"
                        className={`py-3 px-6 cursor-pointer ${
                          theme === "dark"
                            ? "hover:bg-white/10"
                            : "hover:bg-gray-100"
                        }`}
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center">
                          Title
                          {sortConfig.key === "name" ? (
                            sortConfig.direction === "asc" ? (
                              <ArrowUp className="ml-2 h-3 w-3" />
                            ) : (
                              <ArrowDown className="ml-2 h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className={`py-3 px-6 cursor-pointer ${
                          theme === "dark"
                            ? "hover:bg-white/10"
                            : "hover:bg-gray-100"
                        }`}
                        onClick={() => handleSort("type")}
                      >
                        <div className="flex items-center">
                          Type
                          {sortConfig.key === "type" ? (
                            sortConfig.direction === "asc" ? (
                              <ArrowUp className="ml-2 h-3 w-3" />
                            ) : (
                              <ArrowDown className="ml-2 h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className={`py-3 px-6 cursor-pointer ${
                          theme === "dark"
                            ? "hover:bg-white/10"
                            : "hover:bg-gray-100"
                        }`}
                        onClick={() => handleSort("isAIGenerated")}
                      >
                        <div className="flex items-center">
                          AI Generated
                          {sortConfig.key === "isAIGenerated" ? (
                            sortConfig.direction === "asc" ? (
                              <ArrowUp className="ml-2 h-3 w-3" />
                            ) : (
                              <ArrowDown className="ml-2 h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th scope="col" className={`py-3 px-6`}>
                        <div className="flex items-center">
                          Track Count (Actual)
                        </div>
                      </th>
                      <th
                        scope="col"
                        className={`py-3 px-6 cursor-pointer ${
                          theme === "dark"
                            ? "hover:bg-white/10"
                            : "hover:bg-gray-100"
                        }`}
                        onClick={() => handleSort("createdAt")}
                      >
                        <div className="flex items-center">
                          Created At
                          {sortConfig.key === "createdAt" ? (
                            sortConfig.direction === "asc" ? (
                              <ArrowUp className="ml-2 h-3 w-3" />
                            ) : (
                              <ArrowDown className="ml-2 h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
                          )}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="py-3 px-6 rounded-tr-md text-center"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlaylists.length > 0 ? (
                      sortedPlaylists.map((playlist) => (
                        <tr
                          key={playlist.id}
                          className={`border-b cursor-pointer ${
                            theme === "dark"
                              ? "bg-gray-800 border-gray-700 hover:bg-gray-600"
                              : "bg-white border-gray-200 hover:bg-gray-50"
                          } ${
                            selectedPlaylistIds.has(playlist.id)
                              ? theme === "dark"
                                ? "bg-gray-700/50"
                                : "bg-blue-50"
                              : ""
                          } ${
                            actionLoading === playlist.id
                              ? "opacity-50 pointer-events-none"
                              : ""
                          }`}
                        >
                          <td className="w-4 p-4">
                            <Checkbox
                              id={`select-row-${playlist.id}`}
                              checked={selectedPlaylistIds.has(playlist.id)}
                              onCheckedChange={(checked) =>
                                handleSelectRow(playlist.id, checked)
                              }
                              aria-label={`Select row for playlist ${playlist.name}`}
                              className={`${
                                theme === "dark"
                                  ? "border-gray-600"
                                  : "border-gray-300"
                              }`}
                              disabled={loading || actionLoading !== null}
                            />
                          </td>
                          <td
                            className={`py-4 px-6 font-medium whitespace-nowrap ${
                              theme === "dark" ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {playlist.name}
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                playlist.type === "SYSTEM"
                                  ? theme === "dark"
                                    ? "bg-purple-900 text-purple-300"
                                    : "bg-purple-100 text-purple-800"
                                  : theme === "dark"
                                  ? "bg-blue-900 text-blue-300"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {playlist.type}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            {playlist.isAIGenerated ? (
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  theme === "dark"
                                    ? "bg-green-900 text-green-300"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                Yes
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  theme === "dark"
                                    ? "bg-gray-700 text-gray-300"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                No
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            {(playlist as any).trackCount ?? 0} tracks
                          </td>
                          <td className="py-4 px-6">
                            {formatPlaylistDate(playlist.createdAt)}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`text-red-600 hover:bg-red-100/10 h-8 w-8 p-0 ${
                                  theme === "dark"
                                    ? "hover:bg-red-500/20"
                                    : "hover:bg-red-100"
                                }`}
                                onClick={() =>
                                  handleDeletePlaylist(playlist.id)
                                }
                                aria-label={`Delete playlist ${playlist.name}`}
                                disabled={loading || actionLoading !== null}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    data-radix-dropdown-menu-trigger
                                    disabled={loading || actionLoading !== null}
                                  >
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className={
                                    theme === "dark"
                                      ? "bg-[#2a2a2a] border-gray-600 text-white"
                                      : ""
                                  }
                                >
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <Eye className="mr-2 h-4 w-4" /> View
                                    Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleEditPlaylist(playlist)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                    Playlist
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-4 px-6 text-center">
                          No playlists found{" "}
                          {activeSearchTerm ? "matching your search" : ""}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="min-w-[200px]">
                  {selectedPlaylistIds.size > 0 && (
                    <Button
                      onClick={handleBulkDeleteClick}
                      variant="destructive"
                      size="default"
                      disabled={loading || actionLoading !== null}
                      className={`${
                        theme === "dark" ? "bg-red-700 hover:bg-red-800" : ""
                      }`}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected ({selectedPlaylistIds.size})
                    </Button>
                  )}
                </div>
                <div className="flex justify-end">
                  {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={
                          currentPage === 1 || loading || actionLoading !== null
                        }
                        variant="outline"
                        size="sm"
                      >
                        Previous
                      </Button>
                      <span
                        className={`text-sm ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={
                          currentPage === totalPages ||
                          loading ||
                          actionLoading !== null
                        }
                        variant="outline"
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <SystemPlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        theme={theme}
        mode="create"
      />
      {editPlaylist && (
        <SystemPlaylistModal
          isOpen={!!editPlaylist}
          onClose={() => setEditPlaylist(null)}
          onSubmit={handleEditSubmit}
          initialData={{
            id: editPlaylist.id,
            name: editPlaylist.name,
            description: editPlaylist.description,
            coverUrl: editPlaylist.coverUrl,
            privacy: editPlaylist.privacy as "PUBLIC" | "PRIVATE",
            basedOnArtist: (editPlaylist as any).basedOnArtist || "",
            basedOnMood: (editPlaylist as any).basedOnMood || "",
            basedOnGenre: (editPlaylist as any).basedOnGenre || "",
            basedOnSongLength: (editPlaylist as any).basedOnSongLength || "",
            basedOnReleaseTime: (editPlaylist as any).basedOnReleaseTime || "",
            trackCount: (editPlaylist as any).trackCount || 10,
          }}
          theme={theme}
          mode="edit"
        />
      )}
    </>
  );
};
