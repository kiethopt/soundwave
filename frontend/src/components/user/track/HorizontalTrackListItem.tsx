import React from "react";
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
import Image from "next/image";

// Define the names of playlists to filter out
const filteredPlaylistNames = new Set([
  "Vibe Rewind",
  "Welcome Mix",
  "Favorites",
]);

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
  onAddToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  onToggleFavorite: (
    trackId: string,
    isCurrentlyFavorite: boolean
  ) => Promise<void>;
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
  favoriteTrackIds,
  onAddToPlaylist,
  onToggleFavorite,
}) => {
  const { addToQueue } = useTrack();

  return (
    <div
      className={`grid grid-cols-[32px_48px_auto_auto] sm:grid-cols-[32px_48px_2fr_3fr_auto] gap-2 md:gap-4 py-2 md:px-2 group cursor-pointer rounded-lg ${
        theme === "light" ? "hover:bg-gray-50" : "hover:bg-white/5"
      }`}
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
          {currentTrack?.id === track.id &&
          isPlaying &&
          queueType === "track" ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </div>

        {/* Show track number or pause button when not hovering */}
        <div className="group-hover:hidden cursor-pointer">
          {currentTrack?.id === track.id &&
          isPlaying &&
          queueType === "track" ? (
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
          className={`font-medium truncate w-full md:w-auto ${
            theme === "light" ? "text-neutral-800" : "text-white"
          } ${
            currentTrack?.id === track.id && queueType === "track"
              ? "text-[#A57865]"
              : theme === "light"
              ? "text-neutral-800"
              : "text-white"
          }`}
        >
          {track.title}
        </span>

        {/* Play Count */}
        {playCount && (
          <div
            className={`truncate text-sm md:text-base w-full md:w-auto text-start md:text-center justify-center ${
              theme === "light" ? "text-gray-500" : "text-white/60"
            }`}
          >
            {new Intl.NumberFormat("en-US").format(track.playCount)}
          </div>
        )}
      </div>

      {/* Track Album */}
      {albumTitle && (
        <div
          className={`hidden md:flex items-center justify-center text-center ${
            theme === "light" ? "text-gray-500" : "text-white/60"
          }`}
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

      {/* Track Duration & option */}
      <div
        className={`flex items-center justify-end space-x-2 ${
          theme === "light" ? "text-gray-500" : "text-white/60"
        }`}
      >
        <span>
          {Math.floor(track.duration / 60)}:
          {String(track.duration % 60).padStart(2, "0")}
        </span>
        {/* Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 opacity-0 group-hover:opacity-60 hover:opacity-100 cursor-pointer transition-opacity"
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
                addToQueue(track);
                toast.success("Added to queue");
              }}
            >
              <ListMusic className="w-4 h-4 mr-2" />
              Add to Queue
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                <AddSimple className="w-4 h-4 mr-2" />
                Add to Playlist
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-48 max-h-60 overflow-y-auto">
                  {playlists?.length > 0 ? (
                    playlists
                      .filter(
                        (playlist) => !filteredPlaylistNames.has(playlist.name)
                      )
                      .map((playlist) => (
                        <DropdownMenuItem
                          key={playlist.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToPlaylist(playlist.id, track.id);
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
                const isFavorite = favoriteTrackIds.has(track.id);
                onToggleFavorite(track.id, isFavorite);
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
  );
};

export default HorizontalTrackListItem;
