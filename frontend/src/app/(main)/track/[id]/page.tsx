"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { Track, Playlist } from "@/types";
import { ArrowLeft, Calendar, Music } from "lucide-react";
import { useDominantColor } from "@/hooks/useDominantColor";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { MusicAuthDialog } from "@/components/ui/data-table/data-table-modals";
import { useTrack } from "@/contexts/TrackContext";
import { AlbumTracks } from "@/components/user/album/AlbumTracks";
import io, { Socket } from "socket.io-client";

export default function TrackDetailPage() {
  const params = useParams();
  const trackId = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : params.id
    : null;

  const router = useRouter();
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const { dominantColor } = useDominantColor(track?.coverUrl);
  const { theme } = useTheme();
  const { isAuthenticated, dialogOpen, setDialogOpen, handleProtectedAction } =
    useAuth();
  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    queueType,
    setQueueType,
    trackQueue,
    addToQueue,
  } = useTrack();

  const fetchTrackDetails = useCallback(async () => {
    if (!trackId) return;

    try {
      setLoading(true);
      setError(null);

      // Get token if available
      const token = localStorage.getItem("userToken");

      const trackData = await api.tracks.getById(trackId, token || "");
      console.log("Track data:", trackData);
      setTrack(trackData);
    } catch (error) {
      console.error("Error fetching track details:", error);
      setError(error instanceof Error ? error.message : "Failed to load track");
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    fetchTrackDetails();
  }, [fetchTrackDetails]);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const response = await api.playlists.getAll(token);
        const normalPlaylists = response.data.filter(
          (playlist: Playlist) => playlist.type === "NORMAL"
        );
        setPlaylists(normalPlaylists);
      } catch (error) {
        console.error('Error fetching playlists:', error);
      }
    };

    fetchPlaylists();
  }, []);

  // WebSocket listener for real-time updates
  useEffect(() => {
    if (!trackId) return; // Don't connect if trackId is not available

    let socket: Socket | null = null;
    const connectTimer = setTimeout(
      () => {
        socket = io(process.env.NEXT_PUBLIC_API_URL!);

        socket.on("connect", () => {
          console.log(`[WebSocket] Connected for Track Detail: ${trackId}`);
        });

        socket.on("disconnect", (reason: string) => {
          console.log(
            `[WebSocket] Disconnected from Track Detail ${trackId}:`,
            reason
          );
        });

        socket.on("connect_error", (error: Error) => {
          console.error(
            `[WebSocket] Connection Error for Track Detail ${trackId}:`,
            error
          );
        });

        // Listener for track updates
        socket.on("track:updated", (data: { track: Track }) => {
          if (data.track.id === trackId) {
            console.log(`[WebSocket] Track ${trackId} updated:`, data.track);
            setTrack((prevTrack) =>
              prevTrack ? { ...prevTrack, ...data.track } : data.track
            );
            setError(null); // Clear previous errors if track is updated
          }
        });

        // Listener for track deletions
        socket.on("track:deleted", (data: { trackId: string }) => {
          if (data.trackId === trackId) {
            console.log(`[WebSocket] Track ${trackId} deleted`);
            setTrack(null);
            setError("This track has been deleted.");
          }
        });

        // Listener for visibility changes
        socket.on(
          "track:visibilityChanged",
          (data: { trackId: string; isActive: boolean }) => {
            if (data.trackId === trackId) {
              console.log(
                `[WebSocket] Track ${trackId} visibility changed to ${data.isActive}`
              );
              setTrack((prevTrack) => {
                if (!prevTrack) return null; // Should not happen if track exists, but safety check

                let currentArtistId: string | null = null;
                try {
                  const userDataString = localStorage.getItem("userData");
                  if (userDataString) {
                    const userData = JSON.parse(userDataString);
                    currentArtistId = userData?.artistProfile?.id || null;
                  }
                } catch (e) {
                  console.error(
                    "Error parsing user data for visibility check:",
                    e
                  );
                }

                const isOwner = prevTrack.artistId === currentArtistId;

                if (!data.isActive && !isOwner) {
                  // Track hidden and user is not the owner
                  setError("This track is no longer available.");
                  return null; // Hide the track details
                } else {
                  // Track is now visible OR user is the owner (can see hidden tracks)
                  setError(null); // Clear error if track becomes visible/accessible again
                  return { ...prevTrack, isActive: data.isActive }; // Update isActive status
                }
              });
            }
          }
        );
      },
      process.env.NODE_ENV === "development" ? 100 : 0
    ); // Add delay

    // Cleanup function
    return () => {
      clearTimeout(connectTimer);
      if (socket) {
        console.log(
          `[WebSocket] Disconnecting from Track Detail ${trackId}...`
        );
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
        socket.off("track:updated");
        socket.off("track:deleted");
        socket.off("track:visibilityChanged");
        socket.disconnect();
      }
    };
  }, [trackId]); // Re-run effect if trackId changes

  const handleTrackPlay = (track: Track) => {
    // Check if user is authenticated before playing
    handleProtectedAction(() => {
      if (currentTrack?.id === track.id && isPlaying && queueType === "track") {
        pauseTrack();
      } else {
        setQueueType("track");
        if (track) {
          trackQueue([track]);
        }
        playTrack(track);
      }
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-500/10 text-red-500 rounded">
        Error: {error}
      </div>
    );
  }

  // Not found state
  if (!track) {
    return <div>Track not found</div>;
  }

  return (
    <div
      className="rounded-lg"
      style={{
        background: dominantColor
          ? `linear-gradient(180deg, 
            ${dominantColor} 0%, 
            ${dominantColor}99 15%,
            ${dominantColor}40 30%,
            ${theme === "light" ? "#ffffff" : "#121212"} 100%)`
          : theme === "light"
          ? "linear-gradient(180deg, #f3f4f6 0%, #ffffff 100%)"
          : "linear-gradient(180deg, #2c2c2c 0%, #121212 100%)",
      }}
    >
      <div className="max-w-8xl mx-auto px-4 md:px-6 py-6 mb-16 md:mb-0">
        {/* Header with Back button */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              theme === "light"
                ? "bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 shadow-sm hover:shadow"
                : "bg-black/20 hover:bg-black/30 text-white/80 hover:text-white"
            }`}
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span>Back</span>
          </button>
        </div>

        {/* Main Container */}
        <div className="flex flex-col items-center md:items-end md:flex-row gap-8">
          {/* Track Cover */}
          <div className="w-[280px] md:w-[220px] flex-shrink-0">
            <img
              src={track.coverUrl || "/images/default-track.jpg"}
              alt={track.title}
              className="w-full aspect-square object-cover rounded-xl shadow-2xl"
            />
          </div>

          {/* Track Info */}
          <div className="w-full flex flex-col gap-4 justify-end mb-4">
            <div className="text-center md:text-left">
              <h1
                className={`text-3xl md:text-4xl font-bold mb-2 ${
                  theme === "light" ? "text-gray-900" : "text-white"
                }`}
              >
                {track.title}
              </h1>

              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <span
                  className={`cursor-pointer hover:underline underline-offset-2 ${
                    theme === "light" ? "text-gray-900" : "text-white/90"
                  }`}
                  onClick={() =>
                    router.push(`/artist/profile/${track.artist.id}`)
                  }
                >
                  {track.artist.artistName}
                </span>

                {/* Track type badge */}
                {track.type && (
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      theme === "light"
                        ? "bg-gray-200 text-gray-800"
                        : "bg-white/20 text-white/90"
                    }`}
                  >
                    {track.type}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-base">
                {track.album && (
                  <div
                    className={`flex items-center gap-2 cursor-pointer ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                    }`}
                    onClick={() => router.push(`/album/${track.album?.id}`)}
                  >
                    <Music className="w-5 h-5" />
                    <span className="hover:underline underline-offset-2">
                      {track.album.title}
                    </span>
                  </div>
                )}

                <div
                  className={`flex items-center gap-2 ${
                    theme === "light" ? "text-gray-600" : "text-white/60"
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span>
                    {new Date(track.releaseDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>

                {track.duration && (
                  <div
                    className={`flex items-center gap-2 ${
                      theme === "light" ? "text-gray-600" : "text-white/60"
                    }`}
                  >
                    <span>
                      {Math.floor(track.duration / 60)}:
                      {String(track.duration % 60).padStart(2, "0")}
                    </span>
                  </div>
                )}
              </div>

              {track.genres && track.genres.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-center md:justify-start mt-4">
                  {track.genres.map(({ genre }) => (
                    <span
                      key={genre.id}
                      className={`px-3 py-1 rounded-full text-sm ${
                        theme === "light"
                          ? "bg-gray-200 text-gray-800"
                          : "bg-white/10 text-white/80"
                      }`}
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Track List */}
        <div className="w-full mt-8">
          <div
            className={`rounded-xl overflow-hidden border shadow-lg backdrop-blur-sm transition-all ${
              theme === "light"
                ? "bg-white/90 border-gray-200 shadow-gray-200/30"
                : "bg-black/30 border-white/10 shadow-black/20"
            }`}
          >
            {/* Header - Desktop only */}
            <div
              className={`hidden md:grid md:grid-cols-[48px_1.5fr_1fr_1fr_100px_50px] md:gap-4 px-6 py-4 border-b ${
                theme === "light" ? "border-gray-200" : "border-white/10"
              } text-sm font-medium ${
                theme === "light" ? "text-gray-500" : "text-white/60"
              }`}
            >
              <div className="text-center">#</div>
              <div>Title</div>
              <div>Artists</div>
              <div className="text-center">Play Count</div>
              <div className="text-right">Duration</div>
              <div></div>
            </div>

            <div
              className={`divide-y ${
                theme === "light" ? "divide-gray-200/70" : "divide-white/10"
              }`}
            >
              <AlbumTracks
                tracks={[track]}
                onTrackPlay={handleTrackPlay}
                currentTrack={currentTrack}
                isPlaying={isPlaying}
                requiresAuth={!isAuthenticated}
                playlists={playlists}
              />
            </div>
          </div>

          {track.label && (
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`text-xs font-medium ${
                  theme === "light" ? "text-gray-500" : "text-white/60"
                }`}
              >
                © {track.label.name}
              </span>
            </div>
          )}
        </div>

        {/* Auth Dialog */}
        <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    </div>
  );
}
