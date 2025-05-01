import { Track, Playlist } from "@/types";
import { useTrack } from "@/contexts/TrackContext";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Play, Pause } from "@/components/ui/Icons";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { api } from "@/utils/api";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MusicAuthDialog } from "@/components/ui/data-table/data-table-modals";
import { useState } from "react";
import { AlreadyExistsDialog } from "@/components/ui/AlreadyExistsDialog";

const filteredPlaylistNames = new Set([
  "Vibe Rewind",
  "Welcome Mix",
  "Favorites",
]);

interface RecommendedTrackListProps {
  tracks: Track[];
  playlistId?: string;
  favoriteTrackIds: Set<string>;
  playlists: Playlist[];
  onRefresh?: () => void;
}

export function RecommendedTrackList({
  tracks,
  playlistId,
  favoriteTrackIds,
  playlists,
  onRefresh
}: RecommendedTrackListProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const { dialogOpen, setDialogOpen, handleProtectedAction } = useAuth();
  const { playTrack, currentTrack, trackQueue, isPlaying, pauseTrack } = useTrack();
  const [isAlreadyExistsDialogOpen, setIsAlreadyExistsDialogOpen] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    playlistName: string;
    trackTitle?: string;
  } | null>(null);
  const [tracksInPlaylist, setTracksInPlaylist] = useState<Set<string>>(new Set());

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

  const handleAddToPlaylist = async (trackId: string) => {
    handleProtectedAction(async () => {
      if (!playlistId) {
        // If no specific playlist provided, add to first available playlist
        const availablePlaylists = playlists.filter(
          (p) => !filteredPlaylistNames.has(p.name)
        );
        
        if (availablePlaylists.length === 0) {
          toast.error("No playlists available to add track to");
          return;
        }
        
        // Use first available playlist
        const firstPlaylist = availablePlaylists[0];
        await addTrackToPlaylist(firstPlaylist.id, trackId);
      } else {
        // Add to the specified playlist
        await addTrackToPlaylist(playlistId, trackId);
      }
    });
  };

  const addTrackToPlaylist = async (targetPlaylistId: string, trackId: string) => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await api.playlists.addTrack(targetPlaylistId, trackId, token);

      if (response.success) {
        toast.success("Added to playlist");
        
        // Update the local tracksInPlaylist state to reflect the change
        setTracksInPlaylist(prev => {
          const newSet = new Set(prev);
          newSet.add(trackId);
          return newSet;
        });
        
        // Dispatch playlist-updated event to refresh the playlist display
        window.dispatchEvent(new CustomEvent("playlist-updated"));
        
        // Trigger recommendations refresh if callback exists
        if (onRefresh) {
          onRefresh();
        }
      } else if (response.code === "TRACK_ALREADY_IN_PLAYLIST") {
        const playlist = playlists.find((p) => p.id === targetPlaylistId);
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
    } catch (error: any) {
      console.error("Error adding track to playlist:", error);
      toast.error(error.message || "Failed to add track to playlist");
    }
  };

  return (
    <>
      <div className="w-full space-y-2">
        {tracks.map((track) => {
          const albumDisplay = track.album 
            ? `${track.album.title}` 
            : (track.type === "SINGLE" ? `${track.title}` : "");
          
          const isCurrentTrack = currentTrack?.id === track.id;
          const isCurrentlyPlaying = isCurrentTrack && isPlaying;
            
          return (
            <div 
              key={track.id} 
              className={`flex items-center p-2 rounded-lg group ${
                theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/5"
              } cursor-pointer`}
              onClick={() => handleTrackPlay(track)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Track image */}
                <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 relative">
                  <Image
                    src={track.coverUrl || "/images/default-track.jpg"}
                    alt={track.title}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Play/Pause Overlay */}
                  <div 
                    className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}
                  >
                    {isCurrentlyPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white" />
                    )}
                  </div>
                </div>
                
                {/* Track title */}
                <div className="flex flex-col min-w-0">
                  <div 
                    className={`font-medium text-sm truncate hover:underline cursor-pointer underline-offset-2${
                      isCurrentTrack ? "text-[#A57865]" : 
                      theme === "light" ? "text-gray-900" : "text-white"
                    }`}
                    title={track.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (track.album) {
                        router.push(`/album/${track.album.id}`);
                      }
                      else {
                        router.push(`/track/${track.id}`);
                      }
                    }}
                  >
                    {track.title}
                  </div>
                  <div 
                    className={`text-xs truncate cursor-pointer hover:underline underline-offset-2 ${
                      theme === "light" ? "text-gray-600" : "text-white/70"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/artist/profile/${track.artist.id}`);
                    }}
                    title={track.artist.artistName}
                  >
                    {track.artist.artistName}
                  </div>
                </div>
              </div>
              
              {/* Middle: Album name */}
              <div className="hidden md:flex flex-1 text-center mx-4 hover:underline cursor-pointer underline-offset-2"
                onClick={(e) => {
                  e.stopPropagation();
                  if (track.album) {
                    router.push(`/album/${track.album.id}`);
                  } else {
                    router.push(`/track/${track.id}`);
                  }
                }}
              >
                {albumDisplay && (
                  <div 
                    className={`text-xs truncate ${
                      theme === "light" ? "text-gray-500" : "text-white/60"
                    }`}
                    title={albumDisplay}
                  >
                    {albumDisplay}
                  </div>
                )}
              </div>
              
              {/* Right side: Add button */}
              <div className="flex items-center">
                {/* Add button */}
                <Button
                  size="sm"
                  variant="default" 
                  className="flex items-center justify-center gap-1 text-xs h-8 px-3 rounded-full font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToPlaylist(track.id);
                  }}
                >
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            </div>
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

export default RecommendedTrackList;