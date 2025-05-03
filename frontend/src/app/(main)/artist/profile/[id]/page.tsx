"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import { useTheme } from "@/contexts/ThemeContext";
import { Album, AlbumType, ArtistProfile, Track, Playlist, Genre } from "@/types";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { useDominantColor } from "@/hooks/useDominantColor";
import { Verified, Play, Pause, Edit, Up, Down } from "@/components/ui/Icons";
import { ArrowLeft, Tag } from "lucide-react";
import { useTrack } from "@/contexts/TrackContext";
import HorizontalTrackListItem from "@/components/user/track/HorizontalTrackListItem";
import { EditArtistProfileModal } from "@/components/ui/data-table/data-table-modals";
import { EditArtistGenresModal } from "@/components/ui/artist-modals";
import Image from "next/image";
import io, { Socket } from "socket.io-client";
import { AlreadyExistsDialog } from "@/components/ui/AlreadyExistsDialog";
import { useAuth } from "@/hooks/useAuth";

function getBrightness(hexColor: string) {
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export default function ArtistProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { theme } = useTheme();
  const { id } = use(params);
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [standaloneReleases, setStandaloneReleases] = useState<Track[]>([]);
  const [artistTracksMap, setArtistTracksMap] = useState<
    Record<string, Track[]>
  >({});
  const [relatedArtists, setRelatedArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [follow, setFollow] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const { dominantColor } = useDominantColor(
    artist?.artistBanner || artist?.avatar || ""
  );
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<Set<string>>(
    new Set()
  );
  const [isAlreadyExistsDialogOpen, setIsAlreadyExistsDialogOpen] =
    useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    playlistName: string;
    trackTitle?: string;
  } | null>(null);
  const { handleProtectedAction } = useAuth();
  const [activeTab, setActiveTab] = useState<"popular" | "albums" | "singles">(
    "popular"
  );
  const [isGenresModalOpen, setIsGenresModalOpen] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);

  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    queueType,
    setQueueType,
    trackQueue,
  } = useTrack();

  const token = localStorage.getItem("userToken") || "";
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const displayedTracks = showAllTracks ? tracks : tracks.slice(0, 5);

  const fetchData = useCallback(async () => {
    if (!token || !id) return;

    setLoading(true);
    try {
      const [
        artistData,
        followingResponse,
        albumsResponse,
        tracksResponse,
        singlesResponse,
        relatedArtistsResponse,
      ] = await Promise.all([
        api.artists.getProfile(id, token),
        api.user.getUserFollowing(userData.id, token),
        api.artists.getAlbumByArtistId(id, token),
        api.artists.getTrackByArtistId(id, token),
        api.artists.getTrackByArtistId(id, token, "SINGLE"),
        api.artists.getRelatedArtists(id, token),
      ]);

      setArtist(artistData);
      setFollowerCount(artistData.monthlyListeners || 0);

      if (followingResponse) {
        const isFollowing = followingResponse.some(
          (following: any) => 
            (following.type === 'ARTIST' && following.id === id) || 
            (following.followingArtistId === id)
        );

        console.log('Is following:', isFollowing);
        const isOwner = userData.artistProfile?.id === id;
        setFollow(isFollowing);
        setIsOwner(isOwner);

        // Only fetch genres if the user is the profile owner
        if (isOwner) {
          try {
            const genresResponse = await api.genres.getAll(token);
            setAvailableGenres(genresResponse.genres || []);
          } catch (error) {
            console.error("Error fetching genres:", error);
            setAvailableGenres([]);
          }
        }
      }

      setAlbums(albumsResponse.albums);

      // Sort tracks by play count
      const sortedTracks = tracksResponse.tracks.sort(
        (a: any, b: any) => b.playCount - a.playCount
      );
      setTracks(sortedTracks);

      // Find standalone tracks (singles or EPs not in albums)
      const singleAndEPs = singlesResponse.tracks.filter(
        (track: Track) => !track.album
      );
      setStandaloneReleases(singleAndEPs);

      setRelatedArtists(relatedArtistsResponse);

      if (relatedArtistsResponse?.length > 0) {
        const tracksMap = await fetchRelatedArtistTracks(
          relatedArtistsResponse
        );
        setArtistTracksMap(tracksMap);
      }

      // Fetch playlists
      const fetchPlaylists = async () => {
        if (!token) return;
        try {
          const response = await api.playlists.getUserPlaylists(token);
          if (response.success && Array.isArray(response.data)) {
            setPlaylists(response.data);
          } else {
            setPlaylists([]);
          }
        } catch (error) {
          console.error("Error fetching playlists:", error);
          setPlaylists([]);
        }
      };

      // Fetch favorite IDs
      const fetchFavoriteIds = async () => {
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

      fetchPlaylists();
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
    } catch (error) {
      console.error("Error fetching artist data:", error);
      toast.error("Failed to load artist data");
    } finally {
      setLoading(false);
    }
  }, [id, token, userData.artistProfile?.id]);

  const fetchRelatedArtistTracks = async (artists: ArtistProfile[]) => {
    const tracksMap: Record<string, Track[]> = {};
    if (!token) {
      return tracksMap;
    }

    await Promise.all(
      artists.map(async (artist) => {
        try {
          const data = await api.artists.getTrackByArtistId(artist.id, token);
          tracksMap[artist.id] = data.tracks.sort(
            (a: any, b: any) => b.playCount - a.playCount
          );
        } catch (error) {
          console.error(
            `Error fetching tracks for artist ${artist.id}:`,
            error
          );
          tracksMap[artist.id] = [];
        }
      })
    );

    return tracksMap;
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    fetchData(); // Call the fetchData function
  }, [token, router, fetchData]);

  useEffect(() => {
    if (!id) return; // Don't connect if artist id is not available

    let socket: Socket | null = null;
    const connectTimer = setTimeout(
      () => {
        socket = io(process.env.NEXT_PUBLIC_API_URL!);

        console.log(
          `[WebSocket] Attempting to connect for Artist Profile: ${id}`
        );

        socket.on('connect', () => {
            console.log(`[WebSocket] Connected for Artist Profile ${id}`);
        });

        socket.on("disconnect", (reason: string) => {
          console.log(
            `[WebSocket] Disconnected from Artist Profile ${id}:`,
            reason
          );
        });

        socket.on("connect_error", (error: Error) => {
          console.error(
            `[WebSocket] Connection Error for Artist Profile ${id}:`,
            error
          );
        });

        // Update track in list
        socket.on("track:updated", (data: { track: Track }) => {
          // Check if the updated track belongs to the current artist profile
          if (data.track.artistId === id) {
            console.log(
              `[WebSocket] Track updated on Artist Profile ${id}:`,
              data.track
            );
            setTracks((currentTracks) =>
              currentTracks.map((track) =>
                track.id === data.track.id ? { ...track, ...data.track } : track
              )
            );
            // Also update standaloneReleases if the track exists there
            setStandaloneReleases((currentReleases) =>
              currentReleases.map((track) =>
                track.id === data.track.id ? { ...track, ...data.track } : track
              )
            );
          }
        });

        // Remove track from list if deleted
        socket.on("track:deleted", (data: { trackId: string }) => {
          // We need to check if the deleted track *was* part of this artist's list
          setTracks((currentTracks) => {
            const trackExists = currentTracks.some(
              (t) => t.id === data.trackId
            );
            if (trackExists) {
              console.log(
                `[WebSocket] Track deleted from Artist Profile ${id}:`,
                data.trackId
              );
              return currentTracks.filter((track) => track.id !== data.trackId);
            }
            return currentTracks;
          });
          setStandaloneReleases((currentReleases) => {
            const trackExists = currentReleases.some(
              (t) => t.id === data.trackId
            );
            if (trackExists) {
              console.log(
                `[WebSocket] Track deleted from Standalone Releases ${id}:`,
                data.trackId
              );
              return currentReleases.filter(
                (track) => track.id !== data.trackId
              );
            }
            return currentReleases;
          });
        });

        // Remove track from list if hidden (profile pages shouldn't show hidden tracks)
        socket.on(
          "track:visibilityChanged",
          (data: { trackId: string; isActive: boolean }) => {
            if (!data.isActive) {
              // Only act if track becomes hidden
              setTracks((currentTracks) => {
                const trackExists = currentTracks.some(
                  (t) => t.id === data.trackId
                );
                if (trackExists) {
                  console.log(
                    `[WebSocket] Track hidden on Artist Profile ${id}:`,
                    data.trackId
                  );
                  return currentTracks.filter(
                    (track) => track.id !== data.trackId
                  );
                }
                return currentTracks;
              });
              setStandaloneReleases((currentReleases) => {
                const trackExists = currentReleases.some(
                  (t) => t.id === data.trackId
                );
                if (trackExists) {
                  console.log(
                    `[WebSocket] Track hidden from Standalone Releases ${id}:`,
                    data.trackId
                  );
                  return currentReleases.filter(
                    (track) => track.id !== data.trackId
                  );
                }
                return currentReleases;
              });
            }
            // No need to add back if it becomes visible, fetchData handles initial load
          }
        );

        // ---- Album Event Handling for Artist Profile ----

        // Add newly created album to the list
        socket.on("album:created", (data: { album: Album }) => {
          if (data.album.artist?.id === id) {
            console.log(
              `[WebSocket] Album created on Artist Profile ${id}:`,
              data.album
            );
            setAlbums((prevAlbums) => [data.album, ...prevAlbums]);
            // Check if it's a single/EP based on type
            if (data.album.type === "SINGLE" || data.album.type === "EP") {
              setStandaloneReleases((prevReleases) => [
                data.album as unknown as Track,
                ...prevReleases,
              ]);
            }
          }
        });

        // Update album in the list
        socket.on("album:updated", (data: { album: Album }) => {
          if (data.album.artist?.id === id) {
            console.log(
              `[WebSocket] Album updated on Artist Profile ${id}:`,
              data.album
            );
            setAlbums((prevAlbums) =>
              prevAlbums.map((album) =>
                album.id === data.album.id ? { ...album, ...data.album } : album
              )
            );
            // Update in standalone releases as well if applicable (check type)
            if (data.album.type === "SINGLE" || data.album.type === "EP") {
              setStandaloneReleases((prevReleases) =>
                prevReleases.map((release) =>
                  release.id === data.album.id
                    ? { ...release, ...(data.album as unknown as Track) }
                    : release
                )
              );
            }
          }
        });

        // Remove album from the list if deleted
        socket.on("album:deleted", (data: { albumId: string }) => {
          setAlbums((prevAlbums) => {
            const albumExists = prevAlbums.some(
              (a) => a.id === data.albumId && a.artist?.id === id
            );
            if (albumExists) {
              console.log(
                `[WebSocket] Album deleted from Artist Profile ${id}:`,
                data.albumId
              );
              return prevAlbums.filter((album) => album.id !== data.albumId);
            }
            return prevAlbums;
          });
          setStandaloneReleases((prevReleases) => {
            const releaseExists = prevReleases.some(
              (r) => r.id === data.albumId
            );
            if (releaseExists) {
              console.log(
                `[WebSocket] Standalone release deleted from Artist Profile ${id}:`,
                data.albumId
              );
              return prevReleases.filter(
                (release) => release.id !== data.albumId
              );
            }
            return prevReleases;
          });
        });

        // Remove album from the list if hidden
        socket.on(
          "album:visibilityChanged",
          (data: { albumId: string; isActive: boolean }) => {
            if (!data.isActive) {
              // Only remove if hidden
              setAlbums((prevAlbums) => {
                const albumExists = prevAlbums.some(
                  (a) => a.id === data.albumId && a.artist?.id === id
                );
                if (albumExists) {
                  console.log(
                    `[WebSocket] Album hidden on Artist Profile ${id}:`,
                    data.albumId
                  );
                  return prevAlbums.filter(
                    (album) => album.id !== data.albumId
                  );
                }
                return prevAlbums;
              });
              setStandaloneReleases((prevReleases) => {
                const releaseExists = prevReleases.some(
                  (r) => r.id === data.albumId
                );
                if (releaseExists) {
                  console.log(
                    `[WebSocket] Standalone release hidden on Artist Profile ${id}:`,
                    data.albumId
                  );
                  return prevReleases.filter(
                    (release) => release.id !== data.albumId
                  );
                }
                return prevReleases;
              });
            }
            // If it becomes active again, it will be re-fetched on next load or could be added back here if needed
          }
        );
      },
      process.env.NODE_ENV === "development" ? 100 : 0
    ); // Add delay

    // Cleanup
    return () => {
      clearTimeout(connectTimer);
      if (socket) {
        console.log(`[WebSocket] Disconnecting from Artist Profile ${id}...`);
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
        socket.off("track:updated");
        socket.off("track:deleted");
        socket.off("track:visibilityChanged");
        socket.off("album:created");
        socket.off("album:updated");
        socket.off("album:deleted");
        socket.off("album:visibilityChanged");
        socket.disconnect();
      }
    };
  }, [id, setTracks, setStandaloneReleases, setAlbums]);

  // Add event listener for follower-count-changed events
  useEffect(() => {
    const handleFollowerCountChange = (e: CustomEvent) => {
      const { artistId, isFollowing } = (e as any).detail;
      
      if (artistId === id) {
        return;
      }
      
      // Update follower counts for related artists when they're followed elsewhere
      setRelatedArtists(prevArtists => {
        return prevArtists.map(artist => {
          if (artist.id === artistId) {
            return {
              ...artist,
              monthlyListeners: isFollowing
                ? (artist.monthlyListeners || 0) + 1
                : Math.max(0, (artist.monthlyListeners || 0) - 1)
            };
          }
          return artist;
        });
      });
    };
    
    window.addEventListener("follower-count-changed", handleFollowerCountChange as EventListener);
    
    return () => {
      window.removeEventListener("follower-count-changed", handleFollowerCountChange as EventListener);
    };
  }, [id]);
  
  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    fetchData();
  }, [token, router, fetchData]);

  const handleFollow = async () => {
    if (!token) {
      router.push("/login");
    } else {
      try {
        if (follow) {
          await api.user.unfollowUserOrArtist(id, token);
          toast.success("Unfollowed artist!");
          setFollow(false);
          // Decrement follower count
          setFollowerCount(prevCount => Math.max(0, prevCount - 1));
          
          // Dispatch event for other components to know about the follow change
          window.dispatchEvent(new CustomEvent("follower-count-changed", { 
            detail: { artistId: id, isFollowing: false }
          }));
        } else {
          await api.user.followUserOrArtist(id, token);
          toast.success("Followed artist!");
          setFollow(true);
          // Increment follower count
          setFollowerCount(prevCount => prevCount + 1);
          
          // Dispatch event for other components to know about the follow change
          window.dispatchEvent(new CustomEvent("follower-count-changed", { 
            detail: { artistId: id, isFollowing: true }
          }));
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to follow artist!");
      }
    }
  };

  const handleTopTrackPlay = (track: Track) => {
    if (currentTrack?.id === track.id && isPlaying && queueType === "track") {
      pauseTrack();
    } else {
      setQueueType("track");
      trackQueue(tracks);
      playTrack(track);
    }
  };

  const handleArtistPlay = async (
    artist: ArtistProfile,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      let artistTracks = artistTracksMap[artist.id] || [];

      if (!artistTracks.length) {
        artistTracks = await getArtistTracks(artist.id);

        setArtistTracksMap((prev) => ({
          ...prev,
          [artist.id]: artistTracks,
        }));
      }

      if (artistTracks.length > 0) {
        if (isArtistPlaying(artist.id)) {
          pauseTrack();
        } else {
          setQueueType("artist");
          trackQueue(artistTracks);
          playTrack(artistTracks[0]);
        }
      } else {
        toast.error("No tracks available for this artist");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load artist tracks");
    }
  };

  const handleAlbumPlay = async (album: Album, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Kiểm tra nếu album có tracks
      if (album.tracks?.length > 0) {
        // Nếu đang phát album này thì pause
        const isCurrentAlbumPlaying =
          isPlaying &&
          currentTrack &&
          album.tracks.some((track) => track.id === currentTrack.id) &&
          queueType === "album";

        if (isCurrentAlbumPlaying) {
          pauseTrack();
        } else {
          // Nếu không thì phát track đầu tiên và set queue là toàn bộ tracks của album
          setQueueType("album");
          trackQueue(album.tracks);
          playTrack(album.tracks[0]);
        }
      } else {
        toast.error("No tracks available for this album");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load album tracks");
    }
  };

  // Sửa lại hàm getArtistTracks để sử dụng cache từ state
  const getArtistTracks = async (artistId: string) => {
    // Nếu đã có trong cache, trả về luôn
    if (artistTracksMap[artistId]?.length > 0) {
      return artistTracksMap[artistId];
    }

    // Nếu chưa có, fetch mới
    try {
      const data = await api.artists.getTrackByArtistId(artistId, token);
      const sortedTracks = data.tracks.sort(
        (a: any, b: any) => b.playCount - a.playCount
      );

      // Cập nhật cache
      setArtistTracksMap((prev) => ({
        ...prev,
        [artistId]: sortedTracks,
      }));

      return sortedTracks;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const isArtistPlaying = (artistId: string) => {
    const artistTracks = artistTracksMap[artistId] || [];
    return (
      currentTrack &&
      artistTracks.some((track) => track.id === currentTrack.id) &&
      isPlaying &&
      queueType === "artist"
    );
  };

  const textColor =
    dominantColor && getBrightness(dominantColor) > 200 ? "#3c3c3c" : "#fff";

  // Filter albums based on the active tab
  const filteredReleases = albums.filter((item) => {
    if (activeTab === "albums") {
      return item.type === AlbumType.ALBUM;
    } else if (activeTab === "singles") {
      return item.type === AlbumType.SINGLE || item.type === AlbumType.EP;
    }
    return true; // 'popular' shows all
  });

  // Get content based on active tab
  const displayTabContent = () => {
    if (activeTab === "singles" && standaloneReleases.length > 0) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
          {standaloneReleases.map((track) => (
            <div
              key={track.id}
              className="bg-white/5 p-4 rounded-lg group relative w-full"
              onClick={() => router.push(`/track/${track.id}`)}
            >
              <div className="relative">
                <img
                  src={track.coverUrl || "/images/default-track.png"}
                  alt={track.title}
                  className="w-full aspect-square object-cover rounded-md mb-4"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTopTrackPlay(track);
                  }}
                  className="absolute bottom-6 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {currentTrack?.id === track.id && isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
              <h3
                className={`font-medium truncate ${
                  theme === "light" ? "text-neutral-800" : "text-white"
                } ${
                  currentTrack?.id === track.id
                    ? "text-[#A57865]"
                    : theme === "light"
                    ? "text-neutral-800"
                    : "text-white"
                }`}
              >
                {track.title}
              </h3>
              <p
                className={`text-sm truncate ${
                  theme === "light" ? "text-neutral-600" : "text-white/60"
                }`}
              >
                {track.releaseDate.substring(0, 4)} •{" "}
                {track.type.charAt(0).toUpperCase() +
                  track.type.slice(1).toLowerCase()}
              </p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
        {filteredReleases.map((item) => (
          <div
            key={item.id}
            className="bg-white/5 p-4 rounded-lg group relative w-full"
            onClick={() => router.push(`/album/${item.id}`)}
          >
            <div className="relative">
              <img
                src={item.coverUrl || "/images/default-album.png"}
                alt={item.title}
                className="w-full aspect-square object-cover rounded-md mb-4"
              />
              <button
                onClick={(e) => {
                  handleAlbumPlay(item, e);
                }}
                className="absolute bottom-6 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {item.tracks &&
                item.tracks.some(
                  (track) =>
                    track.id === currentTrack?.id &&
                    isPlaying &&
                    queueType === "album"
                ) ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </button>
            </div>
            <h3
              className={`font-medium truncate ${
                theme === "light" ? "text-neutral-800" : "text-white"
              } ${
                currentTrack &&
                item.tracks &&
                item.tracks.some(
                  (track) =>
                    track.id === currentTrack.id && queueType === "album"
                )
                  ? "text-[#A57865]"
                  : theme === "light"
                  ? "text-neutral-800"
                  : "text-white"
              }`}
            >
              {item.title}
            </h3>
            <p
              className={`text-sm truncate ${
                theme === "light" ? "text-neutral-600" : "text-white/60"
              }`}
            >
              {item.releaseDate.substring(0, 4)} •{" "}
              {item.type.charAt(0).toUpperCase() +
                item.type.slice(1).toLowerCase()}
            </p>
          </div>
        ))}
      </div>
    );
  };

  // Function to handle Add/Remove Favorites
  const handleToggleFavorite = async (
    trackId: string,
    isCurrentlyFavorite: boolean
  ) => {
    handleProtectedAction(async () => {
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
          window.dispatchEvent(
            new CustomEvent("favorites-changed", {
              detail: { action: "remove", trackId },
            })
          );
        } else {
          await api.tracks.like(trackId, token);
          toast.success("Added to Favorites");
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
            newIds.add(trackId);
          } else {
            newIds.delete(trackId);
          }
          return newIds;
        });
      }
    });
  };

  // Function to handle Add to Playlist
  const handleAddToPlaylist = async (playlistId: string, trackId: string) => {
    handleProtectedAction(async () => {
      if (!token) return;

      try {
        const response = await api.playlists.addTrack(
          playlistId,
          trackId,
          token
        );

        if (response.success) {
          toast.success("Added to playlist");
          window.dispatchEvent(new CustomEvent("playlist-updated"));
        } else if (response.code === "TRACK_ALREADY_IN_PLAYLIST") {
          const playlist = playlists.find((p) => p.id === playlistId);
          const track = tracks.find((t) => t.id === trackId); // Check popular tracks
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
        console.error("Error adding to playlist:", error);
        toast.error(error.message || "Cannot add to playlist");
      }
    });
  };

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'userData') {
        // Nếu userData có artistProfile, cập nhật lại artist
        const updatedUser = JSON.parse(localStorage.getItem('userData') || '{}');
        if (updatedUser.artistProfile && artist && updatedUser.artistProfile.id === artist.id) {
          setArtist((prev) => ({ ...prev!, ...updatedUser.artistProfile }));
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [artist]);

  // Add handler for updating genres
  const handleGenresUpdate = async (artistId: string, formData: FormData) => {
    try {
      await api.artists.updateProfile(artistId, formData, token);
      toast.success("Genres updated successfully");
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error updating genres:", error);
      toast.error("Failed to update genres");
    }
  };

  if (!artist) return null;

  return (
    <div
      className="min-h-screen w-full rounded-lg"
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
      {artist && (
        <div>
          {/* Artist Banner */}
          <div className="relative w-full h-[370px] rounded-t-lg overflow-hidden">
            {artist.artistBanner ? (
              <Image
                src={artist.artistBanner}
                alt={`${artist.artistName} banner`}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: dominantColor || "#121212" }}
              />
            )}

            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-between px-4 md:px-6 py-6 z-10">
              <div className="flex items-center justify-between w-full">
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

                {isOwner && (
                  <div className="flex items-center gap-3">
                    <Button
                      variant={theme === "dark" ? "outline" : "outline"}
                      size="sm"
                      onClick={() => setIsEditOpen(true)}
                      className="flex-shrink-0 gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </Button>
                    <Button
                      variant={theme === "dark" ? "outline" : "outline"}
                      size="sm"
                      onClick={() => setIsGenresModalOpen(true)}
                      className="flex-shrink-0 gap-2"
                    >
                      <Tag className="w-4 h-4" />
                      Edit Genres
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  {artist.isVerified && <Verified className="w-6 h-6" />}
                  {artist.isVerified && (
                    <span
                      className="text-sm font-semibold"
                      style={{ lineHeight: "1.1", color: textColor }}
                    >
                      Verified Artist
                    </span>
                  )}
                </div>
                <h1
                  className={`text-6xl w-fit font-bold uppercase py-4 ${isOwner ? 'cursor-pointer' : ''}`}
                  style={{ lineHeight: '1.1', color: textColor }}
                  onClick={isOwner ? () => setIsEditOpen(true) : undefined}
                >
                  {artist.artistName}
                </h1>
                <span
                  className="text-base font-semibold py-6"
                  style={{ lineHeight: "1.1", color: textColor }}
                >
                  {new Intl.NumberFormat('en-US').format(
                    followerCount
                  )}{' '}
                  monthly listeners
                </span>
              </div>
            </div>
          </div>

          {/* Artist Controls */}
          <div className="px-4 md:px-6 py-6">
            <div className="flex items-center gap-5">
              {/* Play/Pause Button */}
              <button
                onClick={(e) => {
                  if (tracks.length > 0) {
                    if (
                      isPlaying &&
                      queueType === "track" &&
                      currentTrack?.artistId === artist?.id
                    ) {
                      pauseTrack();
                    } else {
                      playTrack(tracks[0]);
                      setQueueType("track");
                      trackQueue(tracks);
                    }
                  }
                }}
                className="p-3 rounded-full bg-[#A57865] hover:bg-[#8a5f4d] transition-colors duration-200"
              >
                {isPlaying &&
                queueType === "track" &&
                currentTrack?.artistId === artist?.id ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </button>

              {/* Follow Button (Can't self follow) */}
              {!isOwner && (
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={handleFollow}
                  className="flex-shrink-0 justify-center min-w-[80px]"
                >
                  {follow ? "Unfollow" : "Follow"}
                </Button>
              )}
            </div>
          </div>

          {/* Genres Display - show current genres */}
          {artist.genres && artist.genres.length > 0 && (
            <div className="px-4 md:px-6 py-2">
              <div className="flex flex-wrap gap-2">
                {artist.genres.map((genreItem) => (
                  <span
                    key={genreItem.genre.id}
                    className={`px-3 py-1 text-sm rounded-full ${
                      theme === 'light'
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-gray-800 text-gray-200'
                    }`}
                  >
                    {genreItem.genre.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Track Section */}
          <div className="px-4 md:px-6 py-6 flex flex-col-reverse lg:flex-row gap-4 lg:gap-12">
            {tracks.length > 0 && (
              <div className="flex-grow mt-4 md:mt-0">
                <h2 className="text-2xl font-bold">Popular Tracks</h2>
                <div className="grid grid-cols-1 gap-4 mt-4">
                  {displayedTracks.map((track, index) => (
                    <HorizontalTrackListItem
                      key={track.id}
                      track={track}
                      index={index}
                      currentTrack={currentTrack}
                      isPlaying={isPlaying}
                      playCount
                      albumTitle={false}
                      queueType={queueType}
                      theme={theme}
                      onTrackClick={() => handleTopTrackPlay(track)}
                      playlists={playlists}
                      favoriteTrackIds={favoriteTrackIds}
                    />
                  ))}
                </div>

                {/* "See More" Button */}
                {tracks.length > 5 && (
                  <Button
                    variant="link"
                    className="flex items-center gap-2 mt-4"
                    onClick={() => setShowAllTracks((prev) => !prev)}
                  >
                    {showAllTracks ? (
                      <Up className="w-4 h-4" />
                    ) : (
                      <Down className="w-4 h-4" />
                    )}
                    {showAllTracks ? "See less" : "See all"}
                  </Button>
                )}
              </div>
            )}

            {/* About Section */}
            <div className="flex-grow md:max-w-lg">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">About</h2>
              </div>
              <p
                className={`mt-2 ${
                  theme === "light" ? "text-neutral-700" : "text-white/60"
                }`}
              >
                {artist.bio || "No biography available"}
              </p>
            </div>
          </div>

          {/* Discography Section */}
          {(albums.length > 0 || standaloneReleases.length > 0) && (
            <div className="px-4 md:px-6 py-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Discography</h2>
                {/* Add "Show all" text - no functionality for now */}
                
              </div>

              {/* Tab Buttons */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={activeTab === "popular" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setActiveTab("popular")}
                >
                  Popular releases
                </Button>
                <Button
                  variant={activeTab === "albums" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setActiveTab("albums")}
                >
                  Albums
                </Button>
                <Button
                  variant={activeTab === "singles" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setActiveTab("singles")}
                >
                  Singles and EPs
                </Button>
              </div>

              {displayTabContent()}
            </div>
          )}

          {/* Related Artists Section */}
          {relatedArtists.length > 0 && (
            <div className="px-4 md:px-6 py-6">
              <h2 className="text-2xl font-bold">Related Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                {relatedArtists.map((relatedArtist) => (
                  <div
                    key={relatedArtist.id}
                    className="hover:bg-white/5 p-4 rounded-lg group relative w-full "
                    onClick={() =>
                      router.push(`/artist/profile/${relatedArtist.id}`)
                    }
                  >
                    <div className="relative">
                      <img
                        src={
                          relatedArtist.avatar || "/images/default-avatar.jpg"
                        }
                        alt={relatedArtist.artistName}
                        className="w-full aspect-square object-cover rounded-full mb-4"
                      />
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          handleArtistPlay(relatedArtist, e);
                        }}
                        className="absolute bottom-6 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isArtistPlaying(relatedArtist.id) ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white" />
                        )}
                      </button>
                    </div>
                    <h3
                      className={`font-medium truncate ${
                        theme === "light" ? "text-neutral-800" : "text-white"
                      } ${
                        artistTracksMap[relatedArtist.id]?.some(
                          (track) => track.id === currentTrack?.id
                        ) && queueType === "artist"
                          ? "text-[#A57865]"
                          : "text-black/60"
                      }`}
                    >
                      {relatedArtist.artistName}
                    </h3>
                    <p
                      className={`text-sm truncate ${
                        theme === "light" ? "text-neutral-600" : "text-white/60"
                      }`}
                    >
                      {new Intl.NumberFormat("en-US").format(
                        relatedArtist.monthlyListeners
                      )}{" "}
                      monthly listeners
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <EditArtistProfileModal
            artistProfile={artist}
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            theme={theme}
            onUpdateSuccess={() => {
              toast.success("Profile updated! Refreshing data...");
              fetchData();
            }}
          />

          <EditArtistGenresModal
            artistProfile={artist}
            isOpen={isGenresModalOpen}
            onClose={() => setIsGenresModalOpen(false)}
            onSubmit={handleGenresUpdate}
            theme={theme}
            availableGenres={availableGenres}
          />
        </div>
      )}
      {/* Render the Already Exists Dialog */}
      <AlreadyExistsDialog
        open={isAlreadyExistsDialogOpen}
        onOpenChange={setIsAlreadyExistsDialogOpen}
        playlistName={duplicateInfo?.playlistName || "this playlist"}
        trackTitle={duplicateInfo?.trackTitle}
      />
    </div>
  );
}
