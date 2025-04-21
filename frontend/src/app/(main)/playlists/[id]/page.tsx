"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TrackList } from "@/components/user/track/TrackList";
import { EditPlaylistDialog } from "@/components/user/playlist/EditPlaylistDialog";
import { DeletePlaylistDialog } from "@/components/user/playlist/DeletePlaylistDialog";
import { api } from "@/utils/api";
import { Playlist, PlaylistPrivacy, Track } from "@/types";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { MusicAuthDialog } from "@/components/ui/data-table/data-table-modals";
import { toast } from "react-hot-toast";
import { PlaylistIcon } from "@/components/user/playlist/PlaylistIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Lock,
  Globe,
  Clock,
  ListMusic,
  Music2,
  User,
  Album,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/contexts/SocketContext";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { CheckCircle2 } from "lucide-react";

// Khai báo event bus đơn giản để gọi fetchPlaylists từ sidebar
const playlistUpdateEvent = new CustomEvent("playlist-updated");

// Helper function to format duration (seconds) into "X phút Y giây"
const formatDuration = (totalSeconds: number): string => {
  if (!totalSeconds || totalSeconds === 0) {
    return "0 seconds";
  }
  totalSeconds = Math.round(totalSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  }
  if (totalSeconds < 60 || seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);
  }

  return parts.join(" ");
};

export default function PlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : params.id
    : null;
  const { isAuthenticated, dialogOpen, setDialogOpen, handleProtectedAction } =
    useAuth();
  const { socket } = useSocket();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [favoritePlaylistTotalTracks, setFavoritePlaylistTotalTracks] =
    useState<number>(0);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<Set<string>>(
    new Set()
  );

  const coverInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  // Check if this is a special system playlist
  const isVibeRewindPlaylist =
    playlist?.name === "Vibe Rewind" ||
    (playlist?.type === "SYSTEM" && playlist?.name === "Vibe Rewind");
  const isFavoritePlaylist = playlist?.type === "FAVORITE";
  const isWelcomeMixPlaylist =
    playlist?.name === "Welcome Mix" ||
    (playlist?.type === "SYSTEM" && playlist?.name === "Welcome Mix");
  const isSpecialPlaylist =
    isFavoritePlaylist ||
    isVibeRewindPlaylist ||
    isWelcomeMixPlaylist ||
    playlist?.type === "SYSTEM";

  // Check if this is a normal playlist (not special playlists or AI generated)
  const isNormalPlaylist =
    !playlist?.isAIGenerated &&
    playlist?.type !== "FAVORITE" &&
    playlist?.type !== "SYSTEM" &&
    playlist?.name !== "Vibe Rewind" &&
    playlist?.name !== "Welcome Mix";

  const canEditPlaylist = playlist?.canEdit && playlist?.type === "NORMAL";

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("userToken");
    if (!token) {
      router.replace("/login");
      return;
    }

    const fetchPlaylist = async () => {
      try {
        setLoading(true);

        // Get token if available
        const token = localStorage.getItem("userToken");

        console.log("Fetching playlist with ID:", id);
        const response = await api.playlists.getById(
          id as string,
          token ?? undefined
        );
        console.log("Playlist response:", response);

        if (response.success) {
          setPlaylist(response.data);
          if (response.data.type === "FAVORITE") {
            setFavoritePlaylistTotalTracks(response.data.totalTracks);
          }
        } else {
          setError(response.message || "Could not load playlist");
        }
      } catch (error: any) {
        console.error("Error fetching playlist:", error);
        setError(error.message || "Could not load playlist");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPlaylist();
    }
  }, [id]);

  // Add socket listener for favorites updates
  useEffect(() => {
    if (!socket || !id) return;

    socket.on(
      "favorites-updated",
      (data: { action: "add" | "remove"; trackId: string }) => {
        if (playlist?.type === "FAVORITE") {
          setFavoritePlaylistTotalTracks(
            (prev) => prev + (data.action === "add" ? 1 : -1)
          );
        }
      }
    );

    return () => {
      socket.off("favorites-updated");
    };
  }, [socket, id, playlist?.type]);

  // Placeholder: Add a useEffect to fetch user playlists for the dropdown menu
  useEffect(() => {
    const fetchUserPlaylists = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return; // Need token to fetch user-specific playlists
      try {
        // Assuming an API endpoint exists to get minimal playlist info (id, name, coverUrl)
        const response = await api.playlists.getUserPlaylists(token);
        if (response.success && Array.isArray(response.data)) {
          setUserPlaylists(response.data);
        } else {
          console.error("Failed to fetch user playlists:", response.message);
        }
      } catch (error) {
        console.error("Error fetching user playlists:", error);
      }
    };
    fetchUserPlaylists();
  }, []);

  // Updated useEffect to fetch favorite track IDs via user playlists
  useEffect(() => {
    const fetchFavoriteIds = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return;
      try {
        // 1. Fetch all user playlists
        const playlistsResponse = await api.playlists.getUserPlaylists(token);

        if (
          playlistsResponse.success &&
          Array.isArray(playlistsResponse.data)
        ) {
          // 2. Find the favorite playlist
          const favoritePlaylistInfo = playlistsResponse.data.find(
            (p: Playlist) => p.type === "FAVORITE"
          );

          if (favoritePlaylistInfo && favoritePlaylistInfo.id) {
            // 3. Fetch details of the favorite playlist to get tracks
            const favoriteDetailsResponse = await api.playlists.getById(
              favoritePlaylistInfo.id,
              token
            );

            if (
              favoriteDetailsResponse.success &&
              favoriteDetailsResponse.data?.tracks
            ) {
              // 4. Extract track IDs and update state
              const trackIds = favoriteDetailsResponse.data.tracks.map(
                (t: Track) => t.id
              );
              setFavoriteTrackIds(new Set(trackIds));
            } else {
              console.error(
                "Failed to fetch favorite playlist details:",
                favoriteDetailsResponse.message
              );
              setFavoriteTrackIds(new Set()); // Reset if fetch fails
            }
          } else {
            // No favorite playlist found for the user
            setFavoriteTrackIds(new Set());
          }
        } else {
          console.error(
            "Failed to fetch user playlists:",
            playlistsResponse.message
          );
          setFavoriteTrackIds(new Set()); // Reset if fetch fails
        }
      } catch (error) {
        console.error("Error fetching favorite track IDs:", error);
        setFavoriteTrackIds(new Set()); // Reset on error
      }
    };

    fetchFavoriteIds();

    // Listener for favorite changes (remains the same)
    const handleFavoritesChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{
        action: "add" | "remove";
        trackId: string;
      }>;
      const { action, trackId } = customEvent.detail;
      setFavoriteTrackIds((prevIds) => {
        const newIds = new Set(prevIds);
        if (action === "add") {
          newIds.add(trackId);
        } else {
          newIds.delete(trackId);
        }
        return newIds;
      });
    };
    window.addEventListener("favorites-changed", handleFavoritesChanged);
    return () => {
      window.removeEventListener("favorites-changed", handleFavoritesChanged);
    };
  }, []);

  const handleCoverClick = () => {
    if (!canEditPlaylist || isUploadingCover) return;
    coverInputRef.current?.click();
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !canEditPlaylist) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("userToken");
    if (!token) {
      toast.error("Authentication required.");
      return;
    }

    setIsUploadingCover(true);
    const formData = new FormData();
    formData.append("cover", file);

    const originalCoverUrl = playlist?.coverUrl;
    const tempCoverUrl = URL.createObjectURL(file);
    setPlaylist((prev) => (prev ? { ...prev, coverUrl: tempCoverUrl } : null));

    try {
      const response = await api.playlists.updateCover(id, formData, token);
      if (response.success && response.data?.coverUrl) {
        toast.success("Playlist cover updated!");
        setPlaylist((prev) =>
          prev ? { ...prev, coverUrl: response.data.coverUrl } : null
        );
        window.dispatchEvent(new CustomEvent("playlist-updated"));
        if (tempCoverUrl) URL.revokeObjectURL(tempCoverUrl);
      } else {
        toast.error(response.message || "Failed to update cover.");
        setPlaylist((prev) =>
          prev ? { ...prev, coverUrl: originalCoverUrl } : null
        );
        if (tempCoverUrl) URL.revokeObjectURL(tempCoverUrl);
      }
    } catch (error: any) {
      console.error("Error updating cover:", error);
      toast.error("An error occurred while updating the cover.");
      setPlaylist((prev) =>
        prev ? { ...prev, coverUrl: originalCoverUrl } : null
      );
      if (tempCoverUrl) URL.revokeObjectURL(tempCoverUrl);
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    handleProtectedAction(async () => {
      try {
        const token = localStorage.getItem("userToken");
        if (!token || !playlist) return;

        await api.playlists.removeTrack(id as string, trackId, token);
        setPlaylist({
          ...playlist,
          tracks: playlist.tracks.filter((t) => t.id !== trackId),
          totalTracks: playlist.totalTracks - 1,
        });
      } catch (error) {
        console.error("Error removing track:", error);
      }
    });
  };

  const handleDeletePlaylist = async () => {
    handleProtectedAction(async () => {
      try {
        const token = localStorage.getItem("userToken");
        if (!token || !playlist) {
          toast.error("Please log in to delete this playlist");
          return;
        }

        setIsDeleteOpen(false); // Close the dialog first

        // Delete the playlist
        await api.playlists.delete(id as string, token);

        // Show success message
        toast.success("Playlist deleted successfully");

        // Dispatch event for Sidebar to update
        window.dispatchEvent(new CustomEvent("playlist-updated"));

        // Navigate to home page instead of reloading
        router.push("/");
      } catch (error: any) {
        console.error("Error deleting playlist:", error);
        const errorMessage =
          error.message || "Could not delete playlist. Please try again.";
        toast.error(errorMessage);
        setIsDeleteOpen(false);
      }
    });
  };

  // Re-implement handleUpdatePlaylist focused on privacy
  const handleUpdatePlaylist = useCallback(
    async (field: keyof Playlist, value: any) => {
      if (!id || !playlist || !canEditPlaylist) return;

      const token = localStorage.getItem("userToken");
      if (!token) {
        toast.error("Authentication required.");
        return;
      }

      const updateData = { [field]: value };
      const originalValue = playlist[field];

      // Optimistic update
      setPlaylist((prev) => (prev ? { ...prev, ...updateData } : null));

      try {
        // Use the existing api.playlists.update for PATCH
        const response = await api.playlists.update(id, updateData, token);
        if (response.success) {
          toast.success(`Playlist ${field} updated!`);
          // Update local state with potentially more complete data from backend
          setPlaylist((prev) => (prev ? { ...prev, ...response.data } : null));
          window.dispatchEvent(new CustomEvent("playlist-updated"));
        } else {
          toast.error(response.message || `Failed to update ${field}.`);
          setPlaylist((prev) =>
            prev ? { ...prev, [field]: originalValue } : null
          );
        }
      } catch (error: any) {
        console.error(`Error updating playlist ${field}:`, error);
        toast.error(`An error occurred while updating ${field}.`);
        setPlaylist((prev) =>
          prev ? { ...prev, [field]: originalValue } : null
        );
      }
    },
    [id, playlist, canEditPlaylist]
  );

  // Handler to toggle privacy
  const handleTogglePrivacy = () => {
    if (!playlist || !canEditPlaylist) return;
    const currentPrivacy = playlist.privacy;
    const newPrivacy = currentPrivacy === "PRIVATE" ? "PUBLIC" : "PRIVATE";
    handleUpdatePlaylist("privacy", newPrivacy);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!playlist) return <div>Playlist not found</div>;

  // Use the existing totalDuration field and format it
  const formattedDuration = formatDuration(playlist.totalDuration || 0);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div
        className={`flex items-end gap-6 p-6 bg-gradient-to-b from-[#A57865]/30`}
      >
        <div
          className={`w-[232px] h-[232px] flex-shrink-0 relative group ${
            canEditPlaylist ? "cursor-pointer" : ""
          }`}
          onClick={handleCoverClick}
          title={canEditPlaylist ? "Click to change cover image" : undefined}
        >
          {playlist.coverUrl ? (
            <>
              <Image
                src={playlist.coverUrl}
                alt={playlist.name}
                width={232}
                height={232}
                className="w-full h-full object-cover shadow-lg rounded-md"
              />
              {canEditPlaylist && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md">
                  <Pencil className="w-12 h-12 text-white mb-2" />
                  <span className="text-white font-semibold">Choose photo</span>
                </div>
              )}
              {playlist.isAIGenerated && (
                <div className="absolute top-3 right-3 bg-black/40 rounded-full p-1">
                  <Image
                    src="/images/googleGemini_icon.png"
                    width={36}
                    height={36}
                    alt="AI Generated"
                    className="rounded-full"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center rounded-md">
              <div className="text-white/70">
                <PlaylistIcon
                  name={playlist.name}
                  type={playlist.type}
                  isAIGenerated={playlist.isAIGenerated}
                  size={64}
                />
              </div>
              {canEditPlaylist && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-md">
                  <Pencil className="w-12 h-12 text-white mb-2" />
                  <span className="text-white font-semibold">Choose photo</span>
                </div>
              )}
            </div>
          )}
          {isUploadingCover && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-md">
              <span className="text-white">Uploading...</span>{" "}
              {/* Add a spinner later */}
            </div>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="hidden"
            disabled={isUploadingCover || !canEditPlaylist}
          />
        </div>

        <div className="flex flex-col gap-2">
          {!isSpecialPlaylist && !playlist.isAIGenerated && (
            <Badge
              variant="secondary"
              className={`text-xs font-medium rounded-full px-2 py-0.5 w-fit ${
                playlist.privacy === "PRIVATE"
                  ? "bg-neutral-700 text-neutral-300"
                  : "bg-blue-500/20 text-blue-300"
              }`}
            >
              {playlist.privacy === "PRIVATE" ? "Private" : "Public"}
            </Badge>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className={`text-[2rem] font-bold leading-tight ${
                canEditPlaylist ? "cursor-pointer" : ""
              }`}
              onClick={
                canEditPlaylist
                  ? () => handleProtectedAction(() => setIsEditOpen(true))
                  : undefined
              }
              title={canEditPlaylist ? "Edit details" : undefined}
            >
              {playlist.name}
              {playlist.isAIGenerated && (
                <Badge
                  variant="outline"
                  className="ml-2 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 border-none text-white text-xs px-1.5 py-0.5 font-bold"
                >
                  AI
                </Badge>
              )}
            </h1>

            {isVibeRewindPlaylist && <Badge>Auto-Updated</Badge>}
            {isWelcomeMixPlaylist && <Badge>Welcome Mix</Badge>}
            {playlist.isAIGenerated && <Badge>Personalized</Badge>}
          </div>

          {playlist.description && (
            <p className="text-sm text-white/70">{playlist.description}</p>
          )}

          {/* Updated Metadata Line - Only show track count and duration */}
          <div className="flex items-center gap-1.5 text-sm text-white/70 flex-wrap mt-1">
            {playlist.totalTracks > 0 && (
              <>
                <span>
                  {playlist.type === "FAVORITE"
                    ? favoritePlaylistTotalTracks
                    : playlist.totalTracks}{" "}
                  tracks,
                </span>
                <span className="ml-1 text-white/50">{formattedDuration}</span>
              </>
            )}
            {playlist.totalTracks === 0 && (
              <span className="text-white/50">0 tracks</span>
            )}
          </div>

          {canEditPlaylist && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10 mt-1 rounded-full h-8 w-8 -ml-2"
                  title="More options"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem
                  onSelect={() =>
                    handleProtectedAction(() => setIsEditOpen(true))
                  }
                  className="cursor-pointer"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => handleProtectedAction(handleTogglePrivacy)}
                  className="cursor-pointer"
                >
                  {playlist.privacy === "PRIVATE" ? (
                    <>
                      <Globe className="w-4 h-4 mr-2" />
                      Make public
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Make private
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    handleProtectedAction(() => setIsDeleteOpen(true))
                  }
                  className="text-red-500 focus:text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete playlist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <Card
        className={`m-6 rounded-xl border backdrop-blur-sm ${
          theme === "light"
            ? "bg-white/80 border-gray-200"
            : "bg-black/20 border-white/10"
        }`}
      >
        {/* Conditionally render table header and list OR empty state */}
        {playlist.tracks && playlist.tracks.length > 0 ? (
          <>
            {/* Table Header */}
            <div
              className={`mb-0 px-6 py-4 border-b ${
                theme === "light"
                  ? "border-gray-200 text-gray-500"
                  : "border-white/10 text-white/60"
              }`}
            >
              <div
                className={`grid grid-cols-[48px_1.5fr_1fr_1fr_40px_100px_50px] gap-4 items-center text-sm`}
              >
                <div className="flex justify-center">#</div>
                <div>Title</div>
                <div>Album</div>
                <div className="flex items-center justify-start">
                  Date Added
                </div>
                <div className="w-[40px] flex justify-center"></div>
                <div className="flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-1" />
                </div>
                <div className="w-[50px] flex justify-center"></div>
              </div>
            </div>

            {/* Divider and TrackList */}
            <div
              className={`divide-y ${
                theme === "light" ? "divide-gray-200" : "divide-white/10"
              }`}
            >
              <TrackList
                tracks={playlist.tracks}
                allowRemove={playlist.canEdit && playlist.type === "NORMAL"}
                onRemove={handleRemoveTrack}
                requiresAuth={!isAuthenticated}
                playlists={userPlaylists}
                favoriteTrackIds={favoriteTrackIds}
              />
            </div>
          </>
        ) : (
          // Empty State Content - Updated Icon
          <div className="p-10 flex flex-col items-center justify-center text-center">
            {/* Replaced Music2 icon with Unicode character and adjusted styling */}
            <span
              className={`text-6xl mb-4 ${
                theme === "light" ? "text-gray-400" : "text-white/30"
              }`}
              aria-hidden="true" // Hide decorative character from screen readers
            >
              ♪
            </span>
            <h3
              className={`text-xl font-semibold mb-1 ${
                theme === "light" ? "text-gray-800" : "text-white"
              }`}
            >
              Songs will appear here
            </h3>
            <p
              className={`${
                theme === "light" ? "text-gray-600" : "text-white/60"
              }`}
            >
              Add some tracks to get started!
            </p>
            {/* Optional: Add a button to find songs? */}
          </div>
        )}
      </Card>

      {playlist && (
        <EditPlaylistDialog
          playlist={playlist}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          isSpecialPlaylist={isSpecialPlaylist}
          onPlaylistUpdated={(updatedPlaylistData) => {
            setPlaylist((prev) =>
              prev ? { ...prev, ...updatedPlaylistData } : null
            );
            window.dispatchEvent(new CustomEvent("playlist-updated"));
          }}
        />
      )}

      <DeletePlaylistDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDeletePlaylist}
        playlistName={playlist.name}
      />

      <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
