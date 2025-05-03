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
      } else if ("tracks" in item) {
        // Album
        if (item.tracks.length > 0) {
          const isCurrentAlbumPlaying =
            currentTrack &&
            item.tracks.some((track: any) => track.id === currentTrack.id) &&
            queueType === "album" &&
            isPlaying;
          if (isCurrentAlbumPlaying) {
            pauseTrack();
          } else {
            setQueueType("album");
            trackQueue(item.tracks);
            playTrack(item.tracks[0]);
          }
        } else {
          toast.error("No tracks available for this album");
        }
      } else {
        // Artist
        const isCurrentArtistPlaying =
          currentTrack &&
          currentTrack.artist.id === item.id &&
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
            playTrack(sortedTracks[0]);
          } else {
            toast.error("No tracks available for this artist");
          }
        }
      }
    } catch (error) {
      console.error("Error playing:", error);
      toast.error("An error occurred while playing");
    }
  };

  return handlePlay;
}
