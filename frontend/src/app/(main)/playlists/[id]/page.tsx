"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TrackList } from "@/components/user/track/TrackList";
import { EditPlaylistDialog } from "@/components/user/playlist/EditPlaylistDialog";
import { DeletePlaylistDialog } from "@/components/user/playlist/DeletePlaylistDialog";
import { api } from "@/utils/api";
import { Playlist, Track } from "@/types";
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
  Sparkles,
  Flag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { useDominantColor } from "@/hooks/useDominantColor";
import { RecommendedTrackList } from "@/components/user/track/RecommendedTrackList";
import { Spinner } from "@/components/ui/Icons";
import { GenerateAIPlaylistModal } from "@/components/ui/user-modals";
import { ReportDialog } from "@/components/shared/ReportDialog";
import Link from "next/link";

// Import useSession
import { useSession } from "@/contexts/SessionContext";

// Replace with hello-pangea/dnd imports
import { DropResult } from "@hello-pangea/dnd";

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
  const [recommendations, setRecommendations] = useState<{
    tracks: Track[];
    basedOn: string;
    topGenres?: any[];
  }>();
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();
  const { dominantColor } = useDominantColor(playlist?.coverUrl);
  const { user } = useSession(); // Get the current user

  // Check if this is a special system playlist
  const isFavoritePlaylist = playlist?.type === "FAVORITE";
  const isWelcomeMixPlaylist =
    playlist?.name === "Welcome Mix" ||
    (playlist?.type === "SYSTEM" && playlist?.name === "Welcome Mix");
  const isSpecialPlaylist =
    isFavoritePlaylist || isWelcomeMixPlaylist || playlist?.type === "SYSTEM";

  // Check if this is a normal playlist (not special playlists or AI generated)
  const isNormalPlaylist =
    !playlist?.isAIGenerated &&
    playlist?.type !== "FAVORITE" &&
    playlist?.type !== "SYSTEM" &&
    playlist?.name !== "Welcome Mix";

  const canEditPlaylist = playlist?.canEdit && playlist?.type === "NORMAL";

  // Determine if the current user is the owner
  const isOwner = user?.id === playlist?.userId;

  // Determine if recommendations should be shown (Normal or AI playlists AND user is owner)
  const canShowRecommendations =
    (isNormalPlaylist || playlist?.isAIGenerated === true) &&
    playlist?.userId === user?.id;

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

  // Updated useEffect to fetch user playlists AND favorite track IDs
  useEffect(() => {
    const fetchUserPlaylistsAndFavoriteIds = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return;
      try {
        // 1. Fetch all user playlists
        const playlistsResponse = await api.playlists.getUserPlaylists(token);

        if (
          playlistsResponse.success &&
          Array.isArray(playlistsResponse.data)
        ) {
          setUserPlaylists(playlistsResponse.data); // Set user playlists

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
              setFavoriteTrackIds(new Set()); 
            }
          } else {
            // No favorite playlist found for the user
            setFavoriteTrackIds(new Set());
          }
        } else {
          console.error(
            "Failed to fetch user playlists for favorites logic:", // Clarified message
            playlistsResponse.message
          );
          setUserPlaylists([]); // Reset user playlists if fetch fails
          setFavoriteTrackIds(new Set()); // Reset if fetch fails
        }
      } catch (error) {
        console.error("Error fetching user playlists or favorite track IDs:", error); // Updated error message
        setUserPlaylists([]); // Reset user playlists on error
        setFavoriteTrackIds(new Set()); // Reset on error
      }
    };

    fetchUserPlaylistsAndFavoriteIds();

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

  // Function to refresh the playlist data
  const refreshPlaylistData = useCallback(async () => {
    if (!id) return;
    
    // Check if this playlist is being deleted
    const deletingPlaylistId = window.localStorage.getItem("deletingPlaylist");
    if (deletingPlaylistId === id) {
      // Skip refreshing - this playlist is being deleted
      window.localStorage.removeItem("deletingPlaylist"); // Clean up
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("userToken");

      const response = await api.playlists.getById(
        id as string,
        token ?? undefined
      );

      if (response.success) {
        setPlaylist(response.data);
        if (response.data.type === "FAVORITE") {
          setFavoritePlaylistTotalTracks(response.data.totalTracks);
        }
      } else {
        console.error("Failed to refresh playlist:", response.message);
      }
    } catch (error) {
      console.error("Error refreshing playlist:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Function to fetch recommendations for the playlist
  const fetchRecommendations = useCallback(async () => {
    if (!canShowRecommendations || !id || !isAuthenticated) return;

    try {
      setLoadingRecommendations(true);
      const token = localStorage.getItem("userToken");
      if (!token) return;

      const response = await api.playlists.getPlaylistSuggest(
        token,
        id as string
      );

      if (response.success && response.data) {
        setRecommendations(response.data);
      } else {
        console.error("Failed to fetch recommendations:", response.message);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoadingRecommendations(false);
    }
  }, [canShowRecommendations, id, isAuthenticated]);

  // Fetch recommendations after playlist is loaded
  useEffect(() => {
    if (canShowRecommendations && !recommendations) {
      fetchRecommendations();
    }
  }, [canShowRecommendations, recommendations, fetchRecommendations]);

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

        // Find the track being removed to get its duration
        const trackToRemove = playlist.tracks.find((t) => t.id === trackId);
        if (!trackToRemove) return;

        await api.playlists.removeTrack(id as string, trackId, token);
        setPlaylist({
          ...playlist,
          tracks: playlist.tracks.filter((t) => t.id !== trackId),
          totalTracks: playlist.totalTracks - 1,
          totalDuration: playlist.totalDuration - (trackToRemove.duration || 0),
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
        
        // Set a flag to indicate this playlist is being deleted
        // This will prevent refresh attempts during unmounting
        const playlistId = id;
        window.localStorage.setItem("deletingPlaylist", playlistId as string);

        // Delete the playlist
        await api.playlists.delete(id as string, token);

        // Show success message
        toast.success("Playlist deleted successfully");

        // Dispatch event to update Sidebar only
        window.dispatchEvent(new CustomEvent("playlist-updated"));

        // Navigate to home page
        router.push("/");
        
      } catch (error: any) {
        console.error("Error deleting playlist:", error);
        const errorMessage =
          error.message || "Could not delete playlist. Please try again.";
        toast.error(errorMessage);
        setIsDeleteOpen(false);
        // Clear the deleting flag on error
        window.localStorage.removeItem("deletingPlaylist");
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

  // Listen for the playlist-updated event
  useEffect(() => {
    const handlePlaylistUpdated = () => {
      refreshPlaylistData();
    };

    window.addEventListener("playlist-updated", handlePlaylistUpdated);

    return () => {
      window.removeEventListener("playlist-updated", handlePlaylistUpdated);
    };
  }, [refreshPlaylistData]);

  // --- DND Kit Drag End Handler ---
  const handleDragEnd = (result: DropResult) => {
    // If dropped outside the list or no destination
    if (!result.destination) {
      return;
    }

    // If position didn't change
    if (result.destination.index === result.source.index) {
      return;
    }

    setPlaylist((currentPlaylist) => {
      if (!currentPlaylist || !currentPlaylist.tracks) {
        return currentPlaylist;
      }

      const oldIndex = result.source.index;
      const newIndex = result.destination!.index;

      const reorderedTracks = Array.from(currentPlaylist.tracks);
      const [movedTrack] = reorderedTracks.splice(oldIndex, 1);
      reorderedTracks.splice(newIndex, 0, movedTrack);

      console.log(
        "Reordered Tracks (Optimistic UI):",
        reorderedTracks.map((t) => t.title)
      );
      console.log(
        `Moved track ${movedTrack.id} from index ${oldIndex} to ${newIndex}`
      );

      // Call backend API to save the new order
      const token = localStorage.getItem("userToken");
      if (token && currentPlaylist.id) {
        const newOrderTrackIds = reorderedTracks.map((t) => t.id);

        api.playlists
          .reorderTracks(currentPlaylist.id, newOrderTrackIds, token)
          .then((response) => {
            if (!response.success) {
              console.error(
                "Failed to save reordered tracks:",
                response.message
              );
              toast.error("Failed to save new track order. Reverting.");
              refreshPlaylistData();
            } else {
              console.log("Successfully saved new track order.");
            }
          })
          .catch((error) => {
            console.error("Error calling reorder API:", error);
            toast.error("Error saving new track order. Reverting.");
            refreshPlaylistData();
          });
      } else {
        console.warn("Cannot save reorder: Missing token or playlist ID.");
        toast.error("Could not save track order. Please try again.");
        refreshPlaylistData();
      }

      // Return updated playlist for optimistic UI update
      return {
        ...currentPlaylist,
        tracks: reorderedTracks,
      };
    });
  };

  useEffect(() => {
    if (!isAuthenticated && !loading && !error) {
      router.push("/");
    }
  }, [isAuthenticated, loading, error, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner className="w-12 h-12 text-[#A57865]" />
      </div>
    );
  }
  if (error) return <div className="text-red-500">{error}</div>;
  if (!playlist) return <div>Playlist not found</div>;

  const formattedDuration = formatDuration(playlist.totalDuration || 0);

  return (
    <div
      className="flex flex-col min-h-screen rounded-lg"
      style={{
        background: dominantColor
          ? `linear-gradient(180deg, ${dominantColor} 0%, ${dominantColor}99 15%, ${dominantColor}40 30%, ${
              theme === "light" ? "#ffffff" : "#121212"
            } 100%)`
          : theme === "light"
          ? "linear-gradient(180deg, #f3f4f6 0%, #ffffff 100%)"
          : "linear-gradient(180deg, #2c2c2c 0%, #121212 100%)",
      }}
    >
      {/* Header */}
      <div className={`flex items-end gap-6 p-6`}>
        <div
          className={`w-[232px] h-[232px] flex-shrink-0 relative group shadow ${
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
                className="w-full h-full object-cover rounded-md"
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
          {/* Badges Section (Moved Above Title) */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {" "}
            {/* Added mb-1 for spacing */}
            {/* Normal Privacy Badge */}
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
            {/* System Playlist Badges */}
            {isWelcomeMixPlaylist && (
              <Badge
                variant="secondary"
                className="text-xs font-medium rounded-full px-2 py-0.5 w-fit bg-neutral-700 text-neutral-300"
              >
                Private
              </Badge>
            )}
            {/* Favorite Playlist Badge */}
            {playlist.type === "FAVORITE" && (
              <Badge
                variant="secondary"
                className="text-xs font-medium rounded-full px-2 py-0.5 w-fit bg-neutral-700 text-neutral-300"
              >
                Private
              </Badge>
            )}
            {/* AI/Personalized Badges */}
            {playlist.isAIGenerated && (
              <>
                <Badge
                  variant="outline"
                  className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 border-none text-white text-xs px-2 py-0.5 font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Beta
                </Badge>
                <Badge>Personalized</Badge>
              </>
            )}
          </div>

          {/* Title Section */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className={`text-[2rem] font-bold leading-tight truncate ${
                canEditPlaylist ? "cursor-pointer" : ""
              }`}
              onClick={
                canEditPlaylist
                  ? () => handleProtectedAction(() => setIsEditOpen(true))
                  : undefined
              }
              title={canEditPlaylist ? "Edit details" : undefined}
              // Removed AI badge from here
            >
              {playlist.name}
            </h1>
            {/* Badges were previously here, now moved above */}
          </div>

          {playlist.description && (
            <p className="text-sm text-white/70 truncate">
              {playlist.description}
            </p>
          )}

          {/* Display Creator Info for NORMAL playlists  */}
          {playlist.type === "NORMAL" && playlist.user && (
            <div className="flex items-center gap-2 text-sm mt-1">
              <Image
                src={playlist.user.avatar || '/images/user-default-avatar.png'}
                alt={playlist.user.name || playlist.user.username || 'Creator'}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full object-cover aspect-square"
              />
              <Link href={`/profile/${playlist.user.id}`} className="text-white/90 hover:underline">
                {playlist.user.name || playlist.user.username || 'Unknown User'}
              </Link>
            </div>
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

          {/* Added conditional buttons */}
          <div className="flex items-center gap-2 mt-1">
            {canEditPlaylist && (
              <Button
                size="default"
                onClick={() => handleProtectedAction(() => setIsSuggestModalOpen(true))}
                disabled={isSuggestionLoading}
                className="text-sm font-medium flex items-center gap-1.5 bg-[#A57865] text-white hover:bg-[#8a6353] disabled:opacity-50 rounded-full transition-colors duration-200 ease-in-out"
              >
                <Sparkles className="h-4 w-4" />
                <span>Suggest More</span>
              </Button>
            )}

            {/* Report Button - Only shown to the owner */}
            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                className={`rounded-full text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors duration-200 ease-in-out ${
                  theme === 'light'
                    ? 'bg-white/90 border-gray-300 text-gray-800 hover:bg-gray-100 hover:text-gray-900'
                    : 'bg-neutral-700/90 border-neutral-600 text-white/90 hover:bg-neutral-600 hover:text-white'
                }`}
                onClick={() => setIsReportDialogOpen(true)}
                title="Report this playlist"
              >
                <Flag className="h-4 w-4" />
                <span>Report</span>
              </Button>
            )}

            {canEditPlaylist && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-9 w-9"
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
      </div>

      <Card
        className={`m-6 rounded-xl border ${
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
                className={`hidden md:grid grid-cols-[48px_1.5fr_1fr_1fr_1fr_40px_100px_60px] gap-4 items-center text-sm font-medium`}
              >
                <div className="flex justify-center">#</div>
                <div>Title</div>
                <div>Album</div>
                <div className="text-left">Genre(s)</div>
                <div className="flex items-center justify-start">
                  Date Added
                </div>
                <div className="w-[40px] flex justify-center"></div>
                <div className="flex items-center justify-end">
                  <Clock className="w-4 h-4 mr-1" />
                </div>
                <div className="w-[60px] flex justify-center"></div>
              </div>
            </div>

            {/* Divider and TrackList Wrapper with DND Context */}
            <div
              className={`divide-y ${
                theme === "light" ? "divide-gray-200" : "divide-white/10"
              }`}
            >
              <TrackList
                tracks={playlist.tracks}
                onRemove={handleRemoveTrack}
                allowRemove={canEditPlaylist}
                playlists={userPlaylists}
                favoriteTrackIds={favoriteTrackIds}
                theme={theme}
                isDraggable={!!canEditPlaylist}
                onDragEnd={canEditPlaylist ? handleDragEnd : undefined}
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

      {/* Recommendations Section - Use the new condition */}
      {canShowRecommendations && (
        <Card
          className={`mx-6 mb-6 rounded-xl border ${
            theme === "light"
              ? "bg-white/80 border-gray-200"
              : "bg-black/20 border-white/10"
          }`}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold">Recommended</h2>
                <p className="text-sm text-gray-400">
                  Based on your listening history
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchRecommendations}
                  disabled={loadingRecommendations}
                  className="text-sm font-medium"
                >
                  Refresh
                </Button>
              </div>
            </div>

            {loadingRecommendations ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-pulse text-sm opacity-70">
                  Loading recommendations...
                </div>
              </div>
            ) : recommendations &&
              recommendations.tracks &&
              recommendations.tracks.length > 0 ? (
              <RecommendedTrackList
                tracks={recommendations.tracks.slice(0, 10)}
                playlistId={id as string}
                playlists={userPlaylists}
                favoriteTrackIds={favoriteTrackIds}
                onRefresh={fetchRecommendations}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-sm opacity-70">
                  No recommendations available at the moment.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

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

      {/* Render the ReportDialog */}
      {playlist && (
        <ReportDialog
          open={isReportDialogOpen}
          onOpenChange={setIsReportDialogOpen}
          entityType="playlist"
          entityId={playlist.id}
          entityName={playlist.name}
        />
      )}

      <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Render the modal for suggesting tracks */}
      <GenerateAIPlaylistModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
        onPlaylistCreated={refreshPlaylistData}
        playlistId={playlist.id}
        currentPlaylistName={playlist.name}
      />
    </div>
  );
}
