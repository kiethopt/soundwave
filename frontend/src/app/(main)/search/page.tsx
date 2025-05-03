"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Track, Album, Artist, User, Playlist } from "@/types";
import { api } from "@/utils/api";
import { Pause, Play, AddSimple } from "@/components/ui/Icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Heart, ListMusic, MoreHorizontal, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTrack } from "@/contexts/TrackContext";
import { AlreadyExistsDialog } from "@/components/ui/AlreadyExistsDialog";
import { useAuth } from "@/hooks/useAuth";
import { usePlayHandler } from "@/hooks/usePlayHandler";

// Define the names of playlists to filter out (use the same set as in TrackList)
const filteredPlaylistNames = new Set([
  "Vibe Rewind",
  "Welcome Mix",
  "Favorites",
]);

type FilterType = "all" | "albums" | "tracks" | "artists" | "users";

// Loading UI component
function LoadingUI() {
  return (
    <div>
      <div className="w-full border-b border-white/10">
        <div className="flex gap-6 px-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-10 w-20 bg-white/5 animate-pulse rounded-full"
            />
          ))}
        </div>
      </div>
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/5 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white/5 p-4 rounded-lg">
                <div className="bg-white/10 aspect-square rounded-md mb-4"></div>
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Search Results Component
function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams ? searchParams.get("q") : null;
  const [results, setResults] = useState<{
    artists: Artist[];
    albums: Album[];
    tracks: Track[];
    users: User[];
  }>({ artists: [], albums: [], tracks: [], users: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const { addToQueue } = useTrack();

  // Audio states
  const {
    currentTrack,
    isPlaying,
    pauseTrack,
    queueType,
    setQueueType,
    trackQueue,
  } = useTrack();
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  // Filter buttons
  const filterButtons: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Albums", value: "albums" },
    { label: "Tracks", value: "tracks" },
    { label: "Artists", value: "artists" },
    { label: "Users", value: "users" },
  ];

  // Playlists state
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isAlreadyExistsDialogOpen, setIsAlreadyExistsDialogOpen] =
    useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    playlistName: string;
    trackTitle?: string;
  } | null>(null);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<Set<string>>(
    new Set()
  );
  const { handleProtectedAction } = useAuth();

  // Fetch search results
  useEffect(() => {
    const fetchResults = async () => {
      const storedUserData = localStorage.getItem("userData");
      if (storedUserData) {
        try {
          const user = JSON.parse(storedUserData);
          if (
            user &&
            (user.role === "ADMIN" || user.currentProfile === "ARTIST")
          ) {
            console.log(
              "Search page load detected for Admin/Artist, skipping fetch."
            );
            return;
          }
        } catch (e) {
          console.error("Error parsing user data in search page:", e);
        }
      }

      if (!query) {
        setResults({ artists: [], albums: [], tracks: [], users: [] });
        return;
      }

      setIsLoading(true);
      try {
        const token = localStorage.getItem("userToken");
        if (!token) {
          router.push("/login");
          return;
        }

        const searchResult = await api.user.searchAll(query, token);
        setResults(searchResult);
      } catch (error: any) {
        console.error("Search error:", error);
        if (
          error.message === "Unauthorized" ||
          error.message === "User not found"
        ) {
          router.push("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query, router]);

  useEffect(() => {
    if (currentTrack && queueType !== "album" && queueType !== "artist") {
      setCurrentlyPlaying(currentTrack.id);
    }
  }, [currentTrack, queueType]);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const token = localStorage.getItem("userToken");
        if (!token) return;

        const response = await api.playlists.getAll(token);
        setPlaylists(response.data);
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
    };

    fetchPlaylists();
  }, []);

  // Fetch favorite track IDs (similar to playlist page)
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
  }, []);

  const handlePlay = usePlayHandler({ tracks: results.tracks });

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
      const track = results.tracks.find((t) => t.id === trackId);
      setDuplicateInfo({
        playlistName: playlist?.name || "this playlist",
        trackTitle: track?.title,
      });
      setIsAlreadyExistsDialogOpen(true);
    } else {
      // Handle other errors with toast
      console.error("Error adding track:", response); // Log the whole response object
      toast.error(response.message || "Cannot add track to playlist");
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

  return (
    <div suppressHydrationWarning>
      {/* Filter Bar */}
      <div className="w-full border-b border-white/10">
        <div className="flex gap-8 px-6">
          {filterButtons.map((button) => (
            <button
              key={button.value}
              onClick={() => setActiveFilter(button.value)}
              className={`py-2.5 text-sm font-medium transition-colors relative ${
                activeFilter === button.value
                  ? "text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {button.label}
              {activeFilter === button.value && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        <div className="space-y-8">
          {/* Artists Section */}
          {(activeFilter === "all" || activeFilter === "artists") &&
            results.artists.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Artists</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {results.artists.map((artist) => (
                    <div
                      key={artist.id}
                      className="group relative p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/artist/profile/${artist.id}`)
                      }
                    >
                      <div className="relative">
                        <div className="aspect-square mb-4">
                          <img
                            src={artist.avatar || "/images/default-avatar.jpg"}
                            alt={artist.artistName || "Artist"}
                            className="w-full h-full object-cover rounded-full"
                          />
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handlePlay(artist);
                            }}
                            className="absolute bottom-2 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {currentTrack?.artist?.id === artist.id &&
                            queueType === "artist" &&
                            isPlaying ? (
                              <Pause className="w-5 h-5 text-white" />
                            ) : (
                              <Play className="w-5 h-5 text-white" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="text-center">
                        <h3
                          className={`font-medium truncate ${
                            currentTrack?.artist?.id === artist.id &&
                            queueType === "artist"
                              ? "text-[#A57865]"
                              : "text-white"
                          }`}
                        >
                          {artist.artistName}
                        </h3>
                        <p className="text-white/60 text-sm truncate">
                          {artist.monthlyListeners?.toLocaleString() || 0}{" "}
                          monthly listeners
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Albums Section */}
          {(activeFilter === "all" || activeFilter === "albums") &&
            results.albums.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Albums</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {results.albums.map((album) => (
                    <div
                      key={album.id}
                      className="bg-white/5 p-4 rounded-lg group relative"
                      onClick={() => router.push(`/album/${album.id}`)}
                    >
                      <div className="relative">
                        <img
                          src={album.coverUrl || "/images/default-album.png"}
                          alt={album.title}
                          className="w-full aspect-square object-cover rounded-md mb-4"
                        />
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handlePlay(album);
                          }}
                          className="absolute bottom-2 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {currentTrack &&
                          album.tracks.some(
                            (track) => track.id === currentTrack.id
                          ) &&
                          isPlaying &&
                          queueType === "album" ? (
                            <Pause className="w-5 h-5 text-white" />
                          ) : (
                            <Play className="w-5 h-5 text-white" />
                          )}
                        </button>
                      </div>
                      <h3
                        className={`font-medium truncate ${
                          currentlyPlaying === album.id
                            ? "text-[#A57865]"
                            : "text-white"
                        }`}
                      >
                        {album.title}
                      </h3>
                      <p
                        className="text-white/60 text-sm truncate hover:text-white hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            typeof album.artist !== "string" &&
                            album.artist?.id
                          ) {
                            router.push(`/artist/profile/${album.artist.id}`);
                          }
                        }}
                      >
                        {typeof album.artist === "string"
                          ? album.artist
                          : album.artist?.artistName || "Unknown Artist"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Tracks Section */}
          {(activeFilter === "all" || activeFilter === "tracks") &&
            results.tracks.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Tracks</h2>
                <div className="md:grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Mobile List View */}
                  <div className="block md:hidden space-y-2 mb-10">
                    {results.tracks.map((track) => (
                      <div
                        key={track.id}
                        className={`flex items-center gap-3 p-2 rounded-lg group
                        ${
                          currentlyPlaying === track.id
                            ? "bg-white/5"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={track.coverUrl || "/images/default-avatar.jpg"}
                            alt={track.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <button
                            onClick={() => handlePlay(track)}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                          >
                            {currentTrack &&
                            track.id === currentTrack.id &&
                            isPlaying &&
                            queueType === "track" ? (
                              <Pause className="w-5 h-5 text-white" />
                            ) : (
                              <Play className="w-5 h-5 text-white" />
                            )}
                          </button>
                        </div>
                        <div className="flex-grow min-w-0">
                          <h3
                            className={`font-medium truncate ${
                              currentlyPlaying === track.id
                                ? "text-[#A57865]"
                                : "text-white"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (track.album?.id) {
                                router.push(`/album/${track.album.id}`);
                              } else {
                                router.push(`/track/${track.id}`);
                              }
                            }}
                          >
                            {track.title}
                          </h3>
                          <p className="text-white/60 text-sm truncate">
                            {track.artist && (
                              <span
                                className="hover:text-white hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    typeof track.artist !== "string" &&
                                    track.artist?.id
                                  ) {
                                    router.push(
                                      `/artist/profile/${track.artist.id}`
                                    );
                                  }
                                }}
                              >
                                {typeof track.artist === "string"
                                  ? track.artist
                                  : track.artist.artistName || "Unknown Artist"}
                              </span>
                            )}
                            {track.featuredArtists &&
                              track.featuredArtists.length > 0 && (
                                <>
                                  {track.artist ? ", " : ""}
                                  {track.featuredArtists.map((fa, index) => (
                                    <span key={fa.artistProfile.id}>
                                      {index > 0 && ", "}
                                      <span
                                        className="hover:text-white hover:underline cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          router.push(
                                            `/artist/profile/${fa.artistProfile.id}`
                                          );
                                        }}
                                      >
                                        {fa.artistProfile.artistName}
                                      </span>
                                    </span>
                                  ))}
                                </>
                              )}
                          </p>
                        </div>
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
                                <DropdownMenuSubContent className="w-52 py-1.5 bg-zinc-900/95 backdrop-blur-md border border-white/10 shadow-xl rounded-lg max-h-60 overflow-y-auto">
                                  {playlists.length === 0 ? (
                                    <DropdownMenuItem disabled>
                                      No playlists found
                                    </DropdownMenuItem>
                                  ) : (
                                    playlists
                                      .filter(
                                        (playlist) =>
                                          playlist.type === 'NORMAL'
                                      ) // Filter out specific playlists
                                      .map((playlist) => (
                                        <DropdownMenuItem
                                          key={playlist.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddToPlaylist(
                                              playlist.id,
                                              track.id
                                            );
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
                                            <span className="truncate">
                                              {playlist.name}
                                            </span>
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
                                const isFavorite = favoriteTrackIds.has(
                                  track.id
                                );
                                handleToggleFavorite(track.id, isFavorite);
                              }}
                            >
                              <Heart
                                className="w-4 h-4 mr-2"
                                fill={
                                  favoriteTrackIds.has(track.id)
                                    ? "currentColor"
                                    : "none"
                                }
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
                    ))}
                  </div>

                  {/* Desktop Grid View */}
                  {results.tracks.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => {
                        if (track.album?.id) {
                          router.push(`/album/${track.album.id}`);
                        } else {
                          router.push(`/track/${track.id}`);
                        }
                      }}
                      className={`hidden md:block bg-white/5 p-4 rounded-lg group relative cursor-pointer
                      ${
                        currentlyPlaying === track.id
                          ? "bg-white/5"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={track.coverUrl || "/images/default-avatar.jpg"}
                          alt={track.title}
                          className="w-full aspect-square object-cover rounded-md mb-4"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlay(track);
                          }}
                          className="absolute bottom-2 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {currentTrack &&
                          track.id === currentTrack.id &&
                          isPlaying &&
                          queueType === "track" ? (
                            <Pause className="w-5 h-5 text-white" />
                          ) : (
                            <Play className="w-5 h-5 text-white" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-grow min-w-0">
                          <h3
                            className={`font-medium truncate ${
                              currentlyPlaying === track.id
                                ? "text-[#A57865]"
                                : "text-white"
                            }`}
                          >
                            {track.title}
                          </h3>
                          <p className="text-white/60 text-sm truncate">
                            {track.artist && (
                              <span
                                className="hover:text-white hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    typeof track.artist !== "string" &&
                                    track.artist?.id
                                  ) {
                                    router.push(
                                      `/artist/profile/${track.artist.id}`
                                    );
                                  }
                                }}
                              >
                                {typeof track.artist === "string"
                                  ? track.artist
                                  : track.artist.artistName || "Unknown Artist"}
                              </span>
                            )}
                            {track.featuredArtists &&
                              track.featuredArtists.length > 0 && (
                                <>
                                  {track.artist ? ", " : ""}
                                  {track.featuredArtists.map((fa, index) => (
                                    <span key={fa.artistProfile.id}>
                                      {index > 0 && ", "}
                                      <span
                                        className="hover:text-white hover:underline cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          router.push(
                                            `/artist/profile/${fa.artistProfile.id}`
                                          );
                                        }}
                                      >
                                        {fa.artistProfile.artistName}
                                      </span>
                                    </span>
                                  ))}
                                </>
                              )}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                <DropdownMenuSubContent className="w-52 py-1.5 bg-zinc-900/95 backdrop-blur-md border border-white/10 shadow-xl rounded-lg max-h-60 overflow-y-auto">
                                  {playlists.length === 0 ? (
                                    <DropdownMenuItem disabled>
                                      No playlists found
                                    </DropdownMenuItem>
                                  ) : (
                                    playlists
                                      .filter(
                                        (playlist) =>
                                          playlist.type === 'NORMAL'
                                      ) // Filter out specific playlists
                                      .map((playlist) => (
                                        <DropdownMenuItem
                                          key={playlist.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddToPlaylist(
                                              playlist.id,
                                              track.id
                                            );
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
                                            <span className="truncate">
                                              {playlist.name}
                                            </span>
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
                                const isFavorite = favoriteTrackIds.has(
                                  track.id
                                );
                                handleToggleFavorite(track.id, isFavorite);
                              }}
                            >
                              <Heart
                                className="w-4 h-4 mr-2"
                                fill={
                                  favoriteTrackIds.has(track.id)
                                    ? "currentColor"
                                    : "none"
                                }
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
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Users Section */}
          {(activeFilter === "all" || activeFilter === "users") &&
            results.users.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Users</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {results.users.map((user) => (
                    <div
                      key={user.id}
                      className="group relative p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => router.push(`/profile/${user.id}`)}
                    >
                      <div className="relative">
                        <div className="aspect-square mb-4">
                          <img
                            src={user.avatar || "/images/default-avatar.jpg"}
                            alt={user.name || "User"}
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                      </div>
                      <div className="text-center">
                        <h3 className="text-white font-medium truncate hover:underline">
                          {user.name || user.username || "User"}
                        </h3>
                        <p className="text-white/60 text-sm truncate">
                          {user.username || "No username"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* No Results Message */}
          {!isLoading &&
            query &&
            results.tracks.length === 0 &&
            results.albums.length === 0 &&
            results.artists.length === 0 &&
            results.users.length === 0 && (
              <p className="text-white/60">
                No results found for "{query}". Try searching for something
                else.
              </p>
            )}
        </div>
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
}

// Main Page Component
export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <SearchContent />
    </Suspense>
  );
}
