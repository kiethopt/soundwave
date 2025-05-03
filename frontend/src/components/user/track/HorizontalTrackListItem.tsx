import React from "react";
import { useState, useEffect } from "react";
import { Play, Pause, AddSimple } from "@/components/ui/Icons";
import { Heart, ListMusic, MoreHorizontal, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Track, Playlist } from "@/types";
import { useTrack } from "@/contexts/TrackContext";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";
import { AlreadyExistsDialog } from "@/components/ui/AlreadyExistsDialog";

interface TrackListItemProps {
  track: Track;
  index: number;
  currentTrack: {
    id: string;
  } | null;
  isPlaying: boolean;
  playCount: boolean;
  albumTitle: boolean;
  queueType: string;
  theme: string;
  onTrackClick: () => void;
  playlists: Playlist[];
  favoriteTrackIds: Set<string>;
}

const HorizontalTrackListItem: React.FC<TrackListItemProps> = ({
  track,
  index,
  currentTrack,
  isPlaying,
  playCount,
  albumTitle,
  queueType,
  theme,
  onTrackClick,
  playlists,
}) => {
  const { addToQueue } = useTrack();
  const router = useRouter();
  const { handleProtectedAction } = useAuth();
  const [duplicateInfo, setDuplicateInfo] = useState<{
    playlistName: string;
    trackTitle?: string;
  } | null>(null);
  const [isAlreadyExistsDialogOpen, setIsAlreadyExistsDialogOpen] =
    React.useState(false);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<Set<string>>(
    new Set()
  );

  const handleAddToPlaylist = async (playlistId: string, trackId: string) => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      toast.error("Please log in to add tracks to playlists.");
      router.push("/login");
      return;
    }

    const response = await api.playlists.addTrack(playlistId, trackId, token);

    if (response.success) {
      toast.success("Track added to playlist");
      window.dispatchEvent(new CustomEvent("playlist-updated"));
    } else if (response.code === "TRACK_ALREADY_IN_PLAYLIST") {
      // Handle duplicate error by showing dialog
      const playlist = playlists.find((p) => p.id === playlistId);
      setDuplicateInfo({
        playlistName: playlist?.name || "this playlist",
        trackTitle: track?.title,
      });
      setIsAlreadyExistsDialogOpen(true);
    } else {
      // Handle other errors with toast
      console.error("Error adding track:", response);
      toast.error(response.message || "Cannot add to playlist");
    }
  };

  const handleToggleFavorite = async (
    trackId: string,
    isCurrentlyFavorite: boolean
  ) => {
    handleProtectedAction(async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return;

      // Optimistic UI update
      setFavoriteTrackIds((prevIds) => {
        const newIds = new Set(prevIds);
        if (isCurrentlyFavorite) {
          newIds.delete(trackId);
        } else {
          newIds.add(trackId);
        }
        return newIds;
      });

      try {
        if (isCurrentlyFavorite) {
          await api.tracks.unlike(trackId, token);
          toast.success("Removed from Favorites");
          // Dispatch event (still useful for other components like sidebar)
          window.dispatchEvent(
            new CustomEvent("favorites-changed", {
              detail: { action: "remove", trackId },
            })
          );
        } else {
          await api.tracks.like(trackId, token);
          toast.success("Added to Favorites");
          // Dispatch event (still useful for other components like sidebar)
          window.dispatchEvent(
            new CustomEvent("favorites-changed", {
              detail: { action: "add", trackId },
            })
          );
        }
      } catch (error: any) {
        console.error("Error toggling favorite status:", error);
        toast.error(error.message || "Failed to update favorites");
        // Revert optimistic UI on error
        setFavoriteTrackIds((prevIds) => {
          const newIds = new Set(prevIds);
          if (isCurrentlyFavorite) {
            // If unlike failed, add it back
            newIds.add(trackId);
          } else {
            // If like failed, delete it
            newIds.delete(trackId);
          }
          return newIds;
        });
      }
    });
  };

  useEffect(() => {
    const fetchFavoriteIds = async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return;
      try {
        const playlistsResponse = await api.playlists.getUserPlaylists(token);
        if (
          playlistsResponse.success &&
          Array.isArray(playlistsResponse.data)
        ) {
          const favoritePlaylistInfo = playlistsResponse.data.find(
            (p: Playlist) => p.type === "FAVORITE"
          );
          if (favoritePlaylistInfo && favoritePlaylistInfo.id) {
            const favoriteDetailsResponse = await api.playlists.getById(
              favoritePlaylistInfo.id,
              token
            );
            if (
             favoriteDetailsResponse.success &&
              favoriteDetailsResponse.data?.tracks
            ) {
            const trackIds = favoriteDetailsResponse.data.tracks.map(
                (t: Track) => t.id
              );
              setFavoriteTrackIds(new Set(trackIds));
            } else {
              setFavoriteTrackIds(new Set());
            }
          } else {
            setFavoriteTrackIds(new Set());
          }
        } else {
          setFavoriteTrackIds(new Set());
        }
      } catch (error) {
        console.error("Error fetching favorite track IDs:", error);
        setFavoriteTrackIds(new Set());
      }
    };
    fetchFavoriteIds();

    // Listener for favorite changes
    const handleFavoritesChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{
        action: "add" | "remove";
        trackId: string;
      }>;
      if (!customEvent.detail) return;
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

  return (
    <div
      className={`
        grid grid-cols-[32px_48px_auto_auto] sm:grid-cols-[32px_48px_2fr_3fr_auto] 
        gap-2 md:gap-4 py-2 md:px-2 group cursor-pointer rounded-lg 
        ${theme === "light" ? "hover:bg-gray-50" : "hover:bg-white/5"}
      `}
      onClick={onTrackClick}
    >
      {/* Track Number or Play/Pause Button */}
      <div
        className={`flex items-center justify-center ${
          theme === "light" ? "text-gray-500" : "text-white/60"
        }`}
      >
        {/* Show play/pause button on hover */}
        <div className="hidden group-hover:block cursor-pointer">
          {currentTrack?.id === track.id && isPlaying && queueType === "track" ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </div>

        {/* Show track number or pause button when not hovering */}
        <div className="group-hover:hidden cursor-pointer">
          {currentTrack?.id === track.id && isPlaying && queueType === "track" ? (
            <Pause className="w-5 h-5" />
          ) : (
            index + 1
          )}
        </div>
      </div>

      {/* Track Cover */}
      <div className="flex items-center justify-center">
        <img
          src={track.coverUrl}
          alt={track.title}
          className="w-12 h-12 rounded-md"
        />
      </div>

      {/* Track Title and Play Count */}
      <div className="flex flex-col md:flex-row justify-center md:justify-between items-center min-w-0 w-full">
        {/* Track Title */}
        <span
          className={`
            font-medium truncate w-full md:w-auto 
            ${
              currentTrack?.id === track.id && queueType === "track"
                ? "text-[#A57865]"
                : theme === "light"
                ? "text-neutral-800"
                : "text-white"
            }
          `}
        >
          {track.title}
        </span>

        {/* Play Count */}
        {playCount && (
          <div
            className={`
              truncate text-sm md:text-base w-full md:w-auto 
              text-start md:text-center justify-center
              ${theme === "light" ? "text-gray-500" : "text-white/60"}
            `}
          >
            {new Intl.NumberFormat("en-US").format(track.playCount)}
          </div>
        )}
      </div>

      {/* Track Album */}
      {albumTitle && (
        <div
          className={`
            hidden md:flex items-center justify-center text-center
            ${theme === "light" ? "text-gray-500" : "text-white/60"}
          `}
        >
          {track.album ? (
            <div className="flex items-center gap-1 truncate">
              <span className="truncate">{track.album.title}</span>
            </div>
          ) : (
            <span>-</span>
          )}
        </div>
      )}

      {/* Track Duration & Options */}
      <div
        className={`
          flex items-center justify-end space-x-2
          ${theme === "light" ? "text-gray-500" : "text-white/60"}
        `}
      >
        <span>
          {Math.floor(track.duration / 60)}:
          {String(track.duration % 60).padStart(2, "0")}
        </span>
        
        {/* Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 opacity-60 hover:opacity-100">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                addToQueue(track);
              }}
            >
              <ListMusic className="w-4 h-4 mr-2" />
              Add to Queue
            </DropdownMenuItem>
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <AddSimple className="w-4 h-4 mr-2" />
                Add to Playlist
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent 
                  className="w-52 py-1.5 bg-zinc-900/95 backdrop-blur-md 
                  border border-white/10 shadow-xl rounded-lg max-h-60 overflow-y-auto"
                >
                  {playlists.length === 0 ? (
                    <DropdownMenuItem disabled>
                      No playlists found
                    </DropdownMenuItem>
                  ) : (
                    playlists
                      .filter((playlist) => playlist.type === 'NORMAL')
                      .map((playlist) => (
                        <DropdownMenuItem
                          key={playlist.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToPlaylist(playlist.id, track.id);
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <div className="w-6 h-6 relative flex-shrink-0">
                              {playlist.coverUrl ? (
                                <img
                                  src={playlist.coverUrl}
                                  alt={playlist.name}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <div className="w-full h-full bg-white/10 rounded flex items-center justify-center">
                                  <svg
                                    className="w-4 h-4 text-white/70"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <span className="truncate">{playlist.name}</span>
                          </div>
                        </DropdownMenuItem>
                      ))
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const isFavorite = favoriteTrackIds.has(track.id);
                handleToggleFavorite(track.id, isFavorite);
              }}
            >
              <Heart
                className="w-4 h-4 mr-2"
                fill={favoriteTrackIds.has(track.id) ? "currentColor" : "none"}
              />
              {favoriteTrackIds.has(track.id)
                ? "Remove from Favorites"
                : "Add to Favorites"}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Render the dialog */}
      {duplicateInfo && (
        <AlreadyExistsDialog
          open={isAlreadyExistsDialogOpen}
          onOpenChange={setIsAlreadyExistsDialogOpen}
          playlistName={duplicateInfo.playlistName}
          trackTitle={duplicateInfo.trackTitle}
        />
      )}
    </div>
  );
};

export default HorizontalTrackListItem;