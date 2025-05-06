import { Track, Playlist } from "@/types";
import { useTrack } from "@/contexts/TrackContext";
import { useAuth } from "@/hooks/useAuth";
import { MusicAuthDialog } from "@/components/ui/data-table/data-table-modals";
import { useTheme } from "@/contexts/ThemeContext";
import {
  MoreHorizontal,
  Heart,
  Share2,
  ListMusic,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Play, Pause, AddSimple } from "@/components/ui/Icons";
import { toast } from "react-hot-toast";
import { api } from "@/utils/api";
import Image from "next/image";
import { AlreadyExistsDialog } from "@/components/ui/AlreadyExistsDialog";
import { useState } from "react";

// Import DND Kit hook
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Define the names of playlists to filter out
const filteredPlaylistNames = new Set([
  "Welcome Mix",
  "Favorites",
]);

interface TrackListProps {
  tracks: Track[];
  onRemove?: (trackId: string) => void;
  allowRemove?: boolean;
  requiresAuth?: boolean;
  playlists: Playlist[];
  favoriteTrackIds: Set<string>;
  theme: "light" | "dark";
  isDraggable: boolean;
}

// New component for a single draggable track row
const SortableTrackRow = ({
  track,
  index,
  theme,
  isCurrentTrack,
  isCurrentlyPlaying,
  isFavorite,
  handleTrackPlay,
  handleAddToQueue,
  handleAddToPlaylist,
  handleRemoveFromPlaylist,
  handleToggleFavorite,
  formatDateAdded,
  playlists,
  allowRemove,
  onRemove,
  filteredPlaylistNames,
  router,
  isDraggable,
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        {...(isDraggable ? listeners : {})}
        className={`hidden md:grid grid-cols-[48px_1.5fr_1fr_1fr_40px_100px_60px] gap-4 px-6 py-4 group ${
          theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/10"
        } ${isDraggable ? "cursor-grab" : "cursor-pointer"} ${
          isDragging ? "shadow-lg" : ""
        } transition-colors duration-150 ease-in-out items-center`}
      >
        <div
          className={`flex items-center justify-center ${
            theme === "light" ? "text-gray-500" : "text-white/60"
          }`}
          onClick={(e) => {
            if (!isDragging) {
              e.stopPropagation();
              handleTrackPlay(track);
            }
          }}
        >
          <div className="hidden group-hover:block cursor-pointer">
            {isCurrentlyPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </div>
          <div className="group-hover:hidden cursor-pointer">
            {isCurrentlyPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <span
                className={`font-medium ${
                  isCurrentTrack ? "text-[#A57865]" : ""
                }`}
              >
                {index + 1}
              </span>
            )}
          </div>
        </div>

        <div
          className="flex items-center gap-3 min-w-0"
          onClick={(e) => !isDragging && handleTrackPlay(track)}
        >
          <div className="w-10 h-10 flex-shrink-0">
            <Image
              src={track.coverUrl || "/images/default-cover.png"}
              alt={track.title}
              width={40}
              height={40}
              className="w-full h-full object-cover rounded"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className={`font-medium truncate hover:underline cursor-pointer underline-offset-2 ${
                isCurrentTrack
                  ? "text-[#A57865]"
                  : theme === "light"
                  ? "text-gray-900"
                  : "text-white"
              }`}
              title={track.title}
              onClick={(e) => {
                if (!isDragging) {
                  e.stopPropagation();
                  if (track.album) {
                    router.push(`/album/${track.album.id}`);
                  } else {
                    router.push(`/track/${track.id}`);
                  }
                }
              }}
            >
              {track.title}
            </span>
            <span
              className={`text-sm truncate cursor-pointer hover:underline underline-offset-2 ${
                theme === "light" ? "text-gray-500" : "text-white/60"
              }`}
              onClick={(event) => {
                if (!isDragging) {
                  event.stopPropagation();
                  router.push(`/artist/profile/${track.artist.id}`);
                }
              }}
              title={track.artist.artistName}
            >
              {track.artist.artistName}
            </span>
          </div>
        </div>

        <div
          className="flex items-center min-w-0"
          onClick={(e) => !isDragging && handleTrackPlay(track)}
        >
          <span
            className={`truncate text-sm hover:underline cursor-pointer underline-offset-2 ${
              theme === "light" ? "text-gray-500" : "text-white/60"
            }`}
            title={track.album?.title || "Unknown Album"}
            onClick={(e) => {
              if (!isDragging) {
                e.stopPropagation();
                if (track.album) {
                  router.push(`/album/${track.album.id}`);
                } else {
                  router.push(`/track/${track.id}`);
                }
              }
            }}
          >
            {track.album?.title || track.title}
          </span>
        </div>

        <div
          className="flex items-center justify-start"
          onClick={(e) => !isDragging && handleTrackPlay(track)}
        >
          <span
            className={`text-sm ${
              theme === "light" ? "text-gray-500" : "text-white/60"
            }`}
          >
            {formatDateAdded(track.createdAt)}
          </span>
        </div>

        <div className="flex items-center justify-center">
          {isFavorite ? (
            <button
              className={`flex items-center justify-center p-1 rounded-full text-[#A57865] hover:text-[#A57865]/80 transition-colors duration-150 ease-in-out`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite(track.id, isFavorite);
              }}
              aria-label={"Remove from favorites"}
              disabled={isDragging}
            >
              <Heart className="w-4 h-4" fill="currentColor" />
            </button>
          ) : (
            <button
              className={`flex items-center justify-center p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out ${
                theme === "light"
                  ? "text-gray-400 hover:text-gray-600"
                  : "text-white/50 hover:text-white/80"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite(track.id, isFavorite);
              }}
              aria-label={"Add to favorites"}
              disabled={isDragging}
            >
              <Heart className="w-4 h-4" fill="none" />
            </button>
          )}
        </div>

        <div
          className="flex items-center justify-end"
          onClick={(e) => !isDragging && handleTrackPlay(track)}
        >
          <span
            className={`text-sm ${
              theme === "light" ? "text-gray-500" : "text-white/60"
            }`}
          >
            {Math.floor(track.duration / 60)}:
            {String(track.duration % 60).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 opacity-0 group-hover:opacity-60 hover:opacity-100 cursor-pointer transition-opacity"
                onClick={(e) => e.stopPropagation()}
                aria-label="Track options"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToQueue(track);
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
                  <DropdownMenuSubContent className="w-48 max-h-60 overflow-y-auto">
                    {playlists?.length > 0 ? (
                      playlists
                        .filter(
                          (playlist: Playlist) =>
                            !filteredPlaylistNames.has(playlist.name)
                        )
                        .map((playlist: Playlist) => (
                          <DropdownMenuItem
                            key={playlist.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToPlaylist(playlist.id, track.id);
                            }}
                            className="flex items-center gap-2"
                          >
                            <div className="w-6 h-6 relative flex-shrink-0">
                              {playlist.coverUrl ? (
                                <Image
                                  src={playlist.coverUrl}
                                  alt={playlist.name}
                                  width={24}
                                  height={24}
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
                          </DropdownMenuItem>
                        ))
                    ) : (
                      <DropdownMenuItem disabled>
                        No playlists available
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuItem
                className={`cursor-pointer`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(track.id, isFavorite);
                }}
              >
                <Heart
                  className="w-4 h-4 mr-2"
                  fill={isFavorite ? "currentColor" : "none"}
                />
                {isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              </DropdownMenuItem>

              {allowRemove && onRemove && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromPlaylist(track.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove from this playlist
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  toast("Share functionality not implemented yet.");
                }}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        className={`md:hidden p-4 group ${
          theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/10"
        } cursor-pointer transition-colors duration-150 ease-in-out`}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleTrackPlay(track);
            }}
          >
            <Image
              src={track.coverUrl || "/images/default-cover.png"}
              alt={track.title}
              width={40}
              height={40}
              className="w-full h-full object-cover rounded"
            />
          </div>

          <div
            className="flex-1 min-w-0"
            onClick={(e) => {
              e.stopPropagation();
              handleTrackPlay(track);
            }}
          >
            <div
              className={`font-medium truncate ${
                isCurrentTrack
                  ? "text-[#A57865]"
                  : theme === "light"
                  ? "text-gray-900"
                  : "text-white"
              }`}
              title={track.title}
            >
              {track.title}
            </div>
            <div
              className={`text-sm flex items-center gap-1 flex-wrap ${
                theme === "light" ? "text-gray-500" : "text-white/60"
              }`}
            >
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  router.push(`/artist/profile/${track.artist.id}`);
                }}
                className="cursor-pointer hover:underline underline-offset-2 truncate"
                title={track.artist.artistName}
              >
                {track.artist.artistName}
              </span>
              <span
                className={`mx-1 ${
                  theme === "light" ? "text-gray-400" : "text-white/50"
                }`}
              >
                •
              </span>
              <span
                className="truncate"
                title={`Added on ${formatDateAdded(track.createdAt)}`}
              >
                {formatDateAdded(track.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isFavorite && (
              <button
                className={`flex items-center justify-center p-1 rounded-full text-[#A57865] hover:text-[#A57865]/80 transition-colors duration-150 ease-in-out`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(track.id, isFavorite);
                }}
                aria-label={"Remove from favorites"}
              >
                <Heart className="w-4 h-4" fill={"currentColor"} />
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 opacity-60 hover:opacity-100 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Track options"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToQueue(track);
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
                    <DropdownMenuSubContent className="w-48 max-h-60 overflow-y-auto">
                      {playlists?.length > 0 ? (
                        playlists
                          .filter(
                            (playlist: Playlist) =>
                              !filteredPlaylistNames.has(playlist.name)
                          )
                          .map((playlist: Playlist) => (
                            <DropdownMenuItem
                              key={playlist.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToPlaylist(playlist.id, track.id);
                              }}
                              className="flex items-center gap-2"
                            >
                              <div className="w-6 h-6 relative flex-shrink-0">
                                {playlist.coverUrl ? (
                                  <Image
                                    src={playlist.coverUrl}
                                    alt={playlist.name}
                                    width={24}
                                    height={24}
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
                            </DropdownMenuItem>
                          ))
                      ) : (
                        <DropdownMenuItem disabled>
                          No playlists available
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(track.id, isFavorite);
                  }}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Add to Favorites
                </DropdownMenuItem>
                {allowRemove && onRemove && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromPlaylist(track.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove from this playlist
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast("Share functionality not implemented yet.");
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

export function TrackList({
  tracks,
  onRemove,
  allowRemove = false,
  requiresAuth = false,
  playlists,
  favoriteTrackIds,
  theme,
  isDraggable,
}: TrackListProps) {
  const {
    playTrack,
    currentTrack,
    trackQueue,
    isPlaying,
    pauseTrack,
    addToQueue,
  } = useTrack();
  const { dialogOpen, setDialogOpen, handleProtectedAction } = useAuth();
  const [isAlreadyExistsDialogOpen, setIsAlreadyExistsDialogOpen] =
    useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    playlistName: string;
    trackTitle?: string;
  } | null>(null);
  const router = useRouter();

  const handleTrackPlay = (track: Track) => {
    handleProtectedAction(() => {
      if (currentTrack?.id === track.id && isPlaying) {
        pauseTrack();
      } else {
        trackQueue(tracks);
        playTrack(track);
      }
    });
  };

  const handleAddToQueue = (track: Track) => {
    addToQueue(track);
    toast.success("Added to queue");
  };

  const handleAddToPlaylist = async (playlistId: string, trackId: string) => {
    handleProtectedAction(async () => {
      const token = localStorage.getItem("userToken");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await api.playlists.addTrack(playlistId, trackId, token);

      if (response.success) {
        toast.success("Added to playlist");
        window.dispatchEvent(new CustomEvent("playlist-updated"));
      } else if (response.code === "TRACK_ALREADY_IN_PLAYLIST") {
        const playlist = playlists.find((p) => p.id === playlistId);
        const track = tracks.find((t) => t.id === trackId);
        setDuplicateInfo({
          playlistName: playlist?.name || "this playlist",
          trackTitle: track?.title,
        });
        setIsAlreadyExistsDialogOpen(true);
      } else {
        console.error("Error adding to playlist:", response);
        toast.error(response.message || "Cannot add to playlist");
      }
    });
  };

  const handleRemoveFromPlaylist = (trackId: string) => {
    if (allowRemove && onRemove) {
      handleProtectedAction(() => {
        onRemove(trackId);
      });
    }
  };

  const handleToggleFavorite = async (
    trackId: string,
    isCurrentlyFavorite: boolean
  ) => {
    handleProtectedAction(async () => {
      const token = localStorage.getItem("userToken");
      if (!token) return;

      console.log(
        "Toggling favorite for:",
        trackId,
        "Currently:",
        isCurrentlyFavorite
      );
      if (isCurrentlyFavorite) {
        try {
          await api.tracks.unlike(trackId, token);
          toast.success("Removed from Favorites");
          window.dispatchEvent(
            new CustomEvent("favorites-changed", {
              detail: { action: "remove", trackId },
            })
          );
        } catch (error: any) {
          toast.error(error.message || "Failed to remove favorite");
        }
      } else {
        try {
          await api.tracks.like(trackId, token);
          toast.success("Added to Favorites");
          window.dispatchEvent(
            new CustomEvent("favorites-changed", {
              detail: { action: "add", trackId },
            })
          );
        } catch (error: any) {
          toast.error(error.message || "Failed to add favorite");
        }
      }
    });
  };

  const formatDateAdded = (dateString: string | undefined): string => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return "-";
    }
  };

  return (
    <>
      <div className="rounded-b-xl overflow-hidden">
        {tracks?.map((track, index) => {
          const isCurrentTrack = currentTrack?.id === track.id;
          const isCurrentlyPlaying = isCurrentTrack && isPlaying;
          const isFavorite = favoriteTrackIds.has(track.id);

          return (
            <SortableTrackRow
              key={track.id}
              track={track}
              index={index}
              theme={theme}
              isCurrentTrack={isCurrentTrack}
              isCurrentlyPlaying={isCurrentlyPlaying}
              isFavorite={isFavorite}
              handleTrackPlay={handleTrackPlay}
              handleAddToQueue={handleAddToQueue}
              handleAddToPlaylist={handleAddToPlaylist}
              handleRemoveFromPlaylist={handleRemoveFromPlaylist}
              handleToggleFavorite={handleToggleFavorite}
              formatDateAdded={formatDateAdded}
              playlists={playlists}
              allowRemove={allowRemove}
              onRemove={onRemove}
              filteredPlaylistNames={filteredPlaylistNames}
              router={router}
              isDraggable={isDraggable}
            />
          );
        })}
      </div>
      {duplicateInfo && (
        <AlreadyExistsDialog
          open={isAlreadyExistsDialogOpen}
          onOpenChange={setIsAlreadyExistsDialogOpen}
          playlistName={duplicateInfo.playlistName}
          trackTitle={duplicateInfo.trackTitle}
        />
      )}
      <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
