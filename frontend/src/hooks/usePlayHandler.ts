import { useTrack } from "@/contexts/TrackContext";
import { api } from "@/utils/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function usePlayHandler(results?: {
  tracks?: any[];
  albums?: any[];
  artists?: any[];
}) {
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    queueType,
    setQueueType,
    trackQueue,
    setQueueSourceId,
  } = useTrack();

  /**
   * Handles play/pause for track, album, or artist.
   */
  const handlePlay = async (item: any) => {
    try {
      const token = localStorage.getItem("userToken");
      if (!token) {
        router.push("/login");
        return;
      }
      if ("audioUrl" in item) {
        // Track
        if (currentTrack?.id === item.id && queueType === "track") {
          if (isPlaying) {
            pauseTrack();
          } else {
            playTrack(item);
          }
        } else {
          setQueueType("track");
          trackQueue(results?.tracks || []);
          playTrack(item);
        }
      } else if (item.tracks && item.tracks.length > 0) { 
        // Existing logic for Album or Playlist that already has tracks loaded
        const itemType = item.artist ? 'album' : 'playlist'; // Simple check: albums have artists, playlists don't directly
        const isCurrentItemPlaying =
          currentTrack &&
          item.tracks.some((track: any) => track.id === currentTrack.id) &&
          queueType === itemType &&
          isPlaying;

        if (isCurrentItemPlaying) {
          pauseTrack();
        } else {
          setQueueType(itemType);
          trackQueue(item.tracks);
          setQueueSourceId(item.id);
          playTrack(item.tracks[0]);
        }
        
      // --- NEW CHECK FOR PLAYLIST OBJECT (without preloaded tracks) ---
      } else if (item.id && (item.type === 'NORMAL' || item.type === 'SYSTEM' || item.type === 'FAVORITE') && !item.artistName) {
        // Playlist - Fetch tracks if not present (e.g., from profile page)
        console.log(`[PlayHandler] Detected playlist without tracks, fetching ID: ${item.id}`);
        try {
          const playlistDetails = await api.playlists.getById(item.id, token);
          if (playlistDetails.success && playlistDetails.data?.tracks && playlistDetails.data.tracks.length > 0) {
            const fetchedTracks = playlistDetails.data.tracks;
            setQueueType("playlist"); // Set type correctly
            trackQueue(fetchedTracks);
            setQueueSourceId(item.id);
            playTrack(fetchedTracks[0]);
          } else {
            toast.error("Could not load tracks for this playlist or it's empty.");
          }
        } catch (fetchError) {
          console.error(`Error fetching playlist ${item.id}:`, fetchError);
          toast.error("Failed to load playlist tracks.");
        }
      // --- END NEW PLAYLIST CHECK ---

      } else if (item.artistName) { // Check for artistName to identify Artist
        // Artist logic (should remain the same)
        const isCurrentArtistPlaying =
          currentTrack &&
          currentTrack.artist?.id === item.id && // Ensure artist object exists on currentTrack
          queueType === "artist" &&
          isPlaying;
        if (isCurrentArtistPlaying) {
          pauseTrack();
        } else {
          const response = await api.artists.getTrackByArtistId(item.id, token);
          const artistTracks = response?.tracks || [];
          if (artistTracks.length > 0) {
            const sortedTracks = artistTracks.sort(
              (a: any, b: any) => b.playCount - a.playCount
            );
            setQueueType("artist");
            trackQueue(sortedTracks);
            setQueueSourceId(item.id);
            playTrack(sortedTracks[0]);
          } else {
            toast.error("No tracks available for this artist");
          }
        }
      } else {
        // Fallback if type cannot be determined
        console.warn("[PlayHandler] Could not determine item type:", item);
        toast.error("Cannot play this item.");
      }
    } catch (error) {
      console.error("Error playing:", error);
      toast.error("An error occurred while playing");
    }
  };

  return handlePlay;
}
