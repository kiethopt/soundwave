"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/utils/api";
import { Album, Track, Playlist, PlaylistPrivacy } from "@/types";
import { useTrack } from "@/contexts/TrackContext";
import {
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { Play, Pause } from "@/components/ui/Icons";
import { useAuth } from "@/hooks/useAuth";
import { MusicAuthDialog } from "@/components/ui/data-table/data-table-modals";
import { useDominantColor } from "@/hooks/useDominantColor";
import { useBackground } from "@/contexts/BackgroundContext";
import { useSession } from "@/contexts/SessionContext";

export default function Home() {
  const router = useRouter();
  const [newestAlbums, setNewestAlbums] = useState<Album[]>([]);
  const [hotAlbums, setHotAlbums] = useState<Album[]>([]);
  const [trendingPlaylist, setTrendingPlaylist] = useState<Playlist | null>(
    null
  );
  const [personalizedPlaylists, setPersonalizedPlaylists] = useState<
    Playlist[]
  >([]);
  const [detailedPersonalizedPlaylists, setDetailedPersonalizedPlaylists] = useState<Playlist[]>([]);
  const [fetchingPlaylistDetails, setFetchingPlaylistDetails] = useState(false);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [userPlayHistory, setUserPlayHistory] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    playTrack,
    trackQueue,
    addToQueue,
    currentTrack,
    isPlaying,
    pauseTrack,
  } = useTrack();
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);
  const [hoveredAlbum, setHoveredAlbum] = useState<string | null>(null);
  const [playingAlbumId, setPlayingAlbumId] = useState<string | null>(null);
  const { dialogOpen, setDialogOpen, handleProtectedAction } =
    useAuth();
  const { user, isAuthenticated, loading: sessionLoading } = useSession();
  const { setBackgroundStyle } = useBackground();

  const token = localStorage.getItem("userToken") || "";

  const { dominantColor } = useDominantColor(
    newestAlbums.length > 0 ? newestAlbums[0].coverUrl : undefined
  );

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);

        const response = await api.playlists.getHomePageData(
          token || undefined
        );

        if (response.success) {
          const {
            systemPlaylists,
            newestAlbums,
            hotAlbums,
            userPlaylists,
            personalizedSystemPlaylists,
            topTracks,
            userPlayHistory,
          } = response.data;

          setNewestAlbums(newestAlbums || []);
          setHotAlbums(hotAlbums || []);
          setUserPlayHistory(userPlayHistory || []);
          setTopTracks(topTracks || []);

          if (systemPlaylists && systemPlaylists.length > 0) {
            const trending = systemPlaylists.find(
              (playlist: Playlist) =>
                playlist.name === "Soundwave Hits: Trending Right Now"
            );
            setTrendingPlaylist(trending || null);
          }

          if (isAuthenticated) {
            let processedPlaylists = personalizedSystemPlaylists || [];
            processedPlaylists = processedPlaylists.filter((p: Playlist) => {
              if (p.type === "SYSTEM" && p.isAIGenerated) {
                return p.privacy === "PUBLIC";
              }
              return true;
            });
            const welcomeMixIndex = processedPlaylists.findIndex(
              (p: Playlist) => p.name === "Welcome Mix"
            );
            if (welcomeMixIndex > -1) {
              const welcomeMixItem = processedPlaylists.splice(
                welcomeMixIndex,
                1
              )[0];
              processedPlaylists = [welcomeMixItem, ...processedPlaylists];
            }
            setPersonalizedPlaylists(processedPlaylists);
          } else {
            setPersonalizedPlaylists([]);
          }
        }
      } catch (error) {
        console.error("Error fetching home data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [token, isAuthenticated]);

  useEffect(() => {
    const fetchAllPlaylistDetails = async () => {
      if (personalizedPlaylists.length === 0 || !isAuthenticated) {
        setDetailedPersonalizedPlaylists([]);
        return;
      }

      setFetchingPlaylistDetails(true);
      const currentToken = localStorage.getItem("userToken");
      if (!currentToken) {
        console.error("No token for fetching playlist details");
        // Fallback: use personalizedPlaylists as is, tracks won't have covers for composite.
        setDetailedPersonalizedPlaylists(personalizedPlaylists.map(p => ({...p, tracks: p.tracks || []})));
        setFetchingPlaylistDetails(false);
        return;
      }

      const promises = personalizedPlaylists.map(async (p) => {
        // Only fetch if tracks are not already sufficiently detailed (e.g., missing or just IDs)
        // A simple check: if tracks array is missing or empty.
        if (!p.tracks || p.tracks.length === 0) {
          try {
            const response = await api.playlists.getById(p.id, currentToken);
            if (response.success && response.data) {
              return { ...response.data, tracks: response.data.tracks || [] }; // Ensure tracks is an array
            }
            return { ...p, tracks: [] }; // Return original with empty tracks if fetch fails
          } catch (error) {
            console.error(`Failed to fetch details for playlist ${p.id}:`, error);
            return { ...p, tracks: [] }; // Return original with empty tracks on error
          }
        }
        return { ...p, tracks: p.tracks || [] }; // Already has tracks or no need to fetch, ensure tracks array
      });

      const results = await Promise.all(promises);
      setDetailedPersonalizedPlaylists(results);
      setFetchingPlaylistDetails(false);
    };

    if (isAuthenticated) {
      fetchAllPlaylistDetails();
    } else {
      setDetailedPersonalizedPlaylists([]);
    }
  }, [personalizedPlaylists, isAuthenticated]);

  useEffect(() => {
    if (dominantColor) {
      setBackgroundStyle(
        `linear-gradient(to bottom, ${dominantColor} 0%, #111111 70%)`
      );
    } else {
      setBackgroundStyle("#111111");
    }

    return () => {
      setBackgroundStyle("#111111");
    };
  }, [dominantColor, setBackgroundStyle]);

  useEffect(() => {
    if (currentTrack && isPlaying) {
      setPlayingAlbumId(currentTrack.albumId || null);
    } else if (!isPlaying) {
      setPlayingAlbumId(null);
    }
  }, [currentTrack, isPlaying]);

  const handlePlayTrack = async (track: Track, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const canProceed = handleProtectedAction();
    if (!canProceed) return;

    try {
      if (isCurrentlyPlaying(track.id)) {
        pauseTrack();
        return;
      }

      playTrack(track);
    } catch (error) {
      console.error("Error playing track:", error);
    }
  };

  const handlePlayAlbum = async (album: Album, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const canProceed = handleProtectedAction();
    if (!canProceed) return;

    try {
      if (album.tracks && album.tracks.length > 0 && album.tracks[0].audioUrl) {
        if (playingAlbumId === album.id && isPlaying) {
          pauseTrack();
        } else {
          trackQueue(album.tracks);
          playTrack(album.tracks[0]);
          setPlayingAlbumId(album.id);
        }
        return;
      }

      const token = localStorage.getItem("userToken");
      if (!token) return;

      const albumData = await api.albums.getById(album.id, token);

      if (albumData && albumData.tracks && albumData.tracks.length > 0) {
        if (playingAlbumId === album.id && isPlaying) {
          pauseTrack();
        } else {
          trackQueue(albumData.tracks);
          playTrack(albumData.tracks[0]);
          setPlayingAlbumId(album.id);
        }
      } else {
        console.error("Album has no tracks or failed to load");
      }
    } catch (error) {
      console.error("Error playing album:", error);
    }
  };

  const handlePlayPlaylist = async (
    playlist: Playlist,
    e?: React.MouseEvent
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const canProceed = handleProtectedAction();
    if (!canProceed) return;

    try {
      const token = localStorage.getItem("userToken");
      if (!token) return;

      const response = await api.playlists.getById(playlist.id, token);

      if (
        response.success &&
        response.data.tracks &&
        response.data.tracks.length > 0
      ) {
        trackQueue(response.data.tracks);
        playTrack(response.data.tracks[0]);
      } else {
        console.error("Playlist has no tracks or failed to load");
      }
    } catch (error) {
      console.error("Error playing playlist:", error);
    }
  };

  const handleAddToQueue = (track: Track, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const canProceed = handleProtectedAction();
    if (!canProceed) return;

    addToQueue(track);
  };

  const isCurrentlyPlaying = (trackId: string) => {
    return currentTrack?.id === trackId && isPlaying;
  };

  const isAlbumPlaying = (albumId: string) => {
    return playingAlbumId === albumId && isPlaying;
  };

  const isTrackPlaying = (trackId: string) => {
    return currentTrack?.id === trackId && isPlaying;
  };

  const uniqueUserPlayHistory = Array.from(
    new Map(userPlayHistory.map((track) => [track.id, track])).values()
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const Section = ({
    title,
    viewAllLink,
    children,
  }: {
    title: string;
    viewAllLink?: string;
    children: React.ReactNode;
  }) => (
    <div className="mb-10">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div className="flex items-center gap-4">
          {viewAllLink && (
            <button
              onClick={() => router.push(viewAllLink)}
              className="text-sm text-primary flex items-center hover:underline"
            >
              See All <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen w-full px-6 py-8">
      <h1 className="text-4xl font-bold mb-6">New</h1>

      <div className="h-px bg-white/20 w-full mb-8"></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {newestAlbums.length > 0 && (
          <div
            className="cursor-pointer"
            onClick={() => router.push(`/album/${newestAlbums[0].id}`)}
          >
            <div className="mb-3">
              <div className="uppercase text-xs font-medium text-primary mb-1.5">
                NEW ALBUM
              </div>
              <h3 className="text-lg font-bold line-clamp-1 mb-1">
                {newestAlbums[0].title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {newestAlbums[0].artist.artistName}
              </p>
            </div>
            <div className="editorial-card group">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                <Image
                  src={newestAlbums[0].coverUrl || "/images/default-album.jpg"}
                  alt={newestAlbums[0].title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200"></div>
              </div>
            </div>
          </div>
        )}

        {hotAlbums.length > 0 && (
          <div
            className="cursor-pointer"
            onClick={() => router.push(`/album/${hotAlbums[0].id}`)}
          >
            <div className="mb-3">
              <div className="uppercase text-xs font-medium text-primary mb-1.5">
                TELL THEM HOW THE CROWDS WENT WILD
              </div>
              <h3 className="text-lg font-bold line-clamp-1 mb-1">
                {hotAlbums[0].title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hotAlbums[0].artist.artistName}
              </p>
            </div>
            <div className="editorial-card group">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                <Image
                  src={hotAlbums[0].coverUrl || "/images/default-album.jpg"}
                  alt={hotAlbums[0].title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200"></div>
              </div>
            </div>
          </div>
        )}

        {topTracks.length > 0 && (
          <div
            className="cursor-pointer"
            onClick={() => router.push(`/track/${topTracks[0].id}`)}
          >
            <div className="mb-3">
              <div className="uppercase text-xs font-medium text-primary mb-1.5">
                MOST LISTENED TRACK
              </div>
              <h3 className="text-lg font-bold line-clamp-1 mb-1">
                {topTracks[0].title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {topTracks[0].artist.artistName}
              </p>
            </div>
            <div className="editorial-card group">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                <Image
                  src={topTracks[0].coverUrl || "/images/default-album.jpg"}
                  alt={topTracks[0].title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isAuthenticated && user && detailedPersonalizedPlaylists.length > 0 && (
        <Section title={`Suggest for ${user.name || user.username || 'You'}`}>
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
            {detailedPersonalizedPlaylists.map((playlist) => (
              <div
                key={playlist.id}
                className="cursor-pointer flex-shrink-0 w-40"
                onClick={() => router.push(`/playlists/${playlist.id}`)}
                onMouseEnter={() => setHoveredAlbum(`playlist-${playlist.id}`)}
                onMouseLeave={() => setHoveredAlbum(null)}
              >
                <div className="flex flex-col space-y-2">
                  <div className="relative aspect-square overflow-hidden rounded-lg group bg-neutral-800/50">
                    {(playlist.coverUrl || (playlist.tracks && playlist.tracks.length === 0)) && (
                      <Image
                        src={playlist.coverUrl || "/images/default-playlist.jpg"}
                        alt=""
                        fill
                        className={`object-cover transition-all duration-300 ${hoveredAlbum === `playlist-${playlist.id}` ? 'scale-110 blur-[1px] brightness-75' : ''}`}
                      />
                    )}
                    {!playlist.coverUrl && playlist.tracks && playlist.tracks.length > 0 && (
                      <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-neutral-800"></div>
                    )}

                    {playlist.tracks && playlist.tracks.length > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center z-10 p-1">
                        <div className="flex items-center justify-center w-full h-full relative">
                          {playlist.tracks[1] && (
                            <div className="absolute left-[-5%] top-[25%] w-[45%] h-[45%] transform -rotate-[15deg] origin-center">
                              <Image
                                src={playlist.tracks[1].coverUrl || '/images/default-track-small.jpg'}
                                alt=""
                                layout="fill"
                                className="object-cover rounded-full border-2 border-black/50 shadow-md"
                              />
                            </div>
                          )}
                          {playlist.tracks[0] && (
                            <div className="relative w-[55%] h-[55%] z-20">
                              <Image
                                src={playlist.tracks[0].coverUrl || '/images/default-track-large.jpg'}
                                alt=""
                                layout="fill"
                                className="object-cover rounded-full border-2 border-black/70 shadow-lg"
                              />
                            </div>
                          )}
                          {playlist.tracks[2] && (
                            <div className="absolute right-[-5%] top-[25%] w-[45%] h-[45%] transform rotate-[15deg] origin-center">
                              <Image
                                src={playlist.tracks[2].coverUrl || '/images/default-track-small.jpg'}
                                alt=""
                                layout="fill"
                                className="object-cover rounded-full border-2 border-black/50 shadow-md"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {!playlist.coverUrl && (!playlist.tracks || playlist.tracks.length === 0) && (
                      <Image
                        src={"/images/default-playlist.jpg"}
                        alt={playlist.name}
                        fill
                        className="object-cover rounded-lg opacity-50"
                      />
                    )}

                    

                    {hoveredAlbum === `playlist-${playlist.id}` && (
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center z-30">
                        <button
                          className="bg-black/50 rounded-full p-1.5 text-white hover:text-primary transition-colors"
                          onClick={(e) => handlePlayPlaylist(playlist, e)}
                          aria-label={`Play ${playlist.name}`}
                        >
                          <Play className="w-4 h-4" /> 
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium line-clamp-1 pt-2">
                      {playlist.name}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {playlist.totalTracks || 0} tracks •{" "}
                      {playlist.name.includes("Discover Weekly")
                        ? "Updated weekly"
                        : playlist.name.includes("Release Radar")
                        ? "Updated on Fridays"
                        : "For you"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {trendingPlaylist && trendingPlaylist.tracks && (
        <Section
          title="Trending Hits"
          viewAllLink={`/seeall/?type=trending-playlists`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {trendingPlaylist.tracks.slice(0, 10).map((track, index) => (
              <div
                key={track.id}
                className="flex items-center space-x-3 p-3 rounded-md hover:bg-accent/10 cursor-pointer transition-all duration-200 group relative"
                onClick={(e) => handlePlayTrack(track, e)}
                onMouseEnter={() => setHoveredTrack(track.id)}
                onMouseLeave={() => setHoveredTrack(null)}
              >
                <div className="text-sm text-muted-foreground w-6 text-center">
                  {hoveredTrack === track.id ? (
                    <span className="opacity-0">{index + 1}</span>
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="relative w-12 h-12 flex-shrink-0">
                  <Image
                    src={track.coverUrl || "/images/default-track.jpg"}
                    alt={track.title}
                    fill
                    className="rounded object-cover"
                  />
                  {(hoveredTrack === track.id ||
                    isCurrentlyPlaying(track.id)) && (
                    <div className="absolute inset-0 bg-black/30 rounded flex items-center justify-center">
                      <button
                        className="bg-black/50 rounded-full p-1.5 text-white hover:text-primary transition-colors"
                        onClick={(e) => handlePlayTrack(track, e)}
                      >
                        {isCurrentlyPlaying(track.id) ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-medium line-clamp-1">
                    {track.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {track.artist.artistName}
                  </p>
                </div>
                {hoveredTrack === track.id && (
                  <button
                    className="text-white hover:text-primary"
                    onClick={(e) => handleAddToQueue(track, e)}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="New Releases" viewAllLink="/seeall?type=new-albums">
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
          {newestAlbums.slice(0, 10).map((album) => (
            <div
              key={album.id}
              className="cursor-pointer flex-shrink-0 w-40"
              onClick={() => {
                router.push(`/album/${album.id}`);
              }}
              onMouseEnter={() => setHoveredAlbum(album.id)}
              onMouseLeave={() => setHoveredAlbum(null)}
            >
              <div className="flex flex-col space-y-2">
                <div className="relative aspect-square overflow-hidden rounded-lg">
                  <Image
                    src={album.coverUrl || "/images/default-album.jpg"}
                    alt={album.title}
                    fill
                    className="object-cover"
                  />
                  <div
                    className={`absolute inset-0 transition-all duration-150 ${
                      hoveredAlbum === album.id || isAlbumPlaying(album.id)
                        ? "bg-black/30"
                        : "bg-black/0"
                    }`}
                  ></div>

                  {(hoveredAlbum === album.id || isAlbumPlaying(album.id)) && (
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                      <button
                        className="bg-black/50 rounded-full p-1.5 text-white hover:text-primary transition-colors"
                        onClick={(e) => handlePlayAlbum(album, e)}
                      >
                        {isAlbumPlaying(album.id) ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        className="bg-black/50 rounded-full p-1.5 text-white hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium line-clamp-1">
                    {album.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {album.artist.artistName}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Everyone's Listening To..."
        viewAllLink="/seeall?type=top-albums"
      >
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
          {hotAlbums.slice(0, 10).map((album) => (
            <div
              key={album.id}
              className="cursor-pointer flex-shrink-0 w-40"
              onClick={() => {
                router.push(`/album/${album.id}`);
              }}
              onMouseEnter={() => setHoveredAlbum(`hot-${album.id}`)}
              onMouseLeave={() => setHoveredAlbum(null)}
            >
              <div className="flex flex-col space-y-2">
                <div className="relative aspect-square overflow-hidden rounded-lg">
                  <Image
                    src={album.coverUrl || "/images/default-album.jpg"}
                    alt={album.title}
                    fill
                    className="object-cover"
                  />
                  <div
                    className={`absolute inset-0 transition-all duration-150 ${
                      hoveredAlbum === `hot-${album.id}` ||
                      isAlbumPlaying(album.id)
                        ? "bg-black/30"
                        : "bg-black/0"
                    }`}
                  ></div>

                  {(hoveredAlbum === `hot-${album.id}` ||
                    isAlbumPlaying(album.id)) && (
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                      <button
                        className="bg-black/50 rounded-full p-1.5 text-white hover:text-primary transition-colors"
                        onClick={(e) => handlePlayAlbum(album, e)}
                      >
                        {isAlbumPlaying(album.id) ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        className="bg-black/50 rounded-full p-1.5 text-white hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium line-clamp-1">
                    {album.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {album.artist.artistName}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {isAuthenticated && uniqueUserPlayHistory.length > 0 && (
        <Section
          title="Recently Played"
          viewAllLink="/seeall?type=recently-played"
        >
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
            {uniqueUserPlayHistory.slice(0, 10).map((track) => (
              <div
                key={track.id}
                className="cursor-pointer flex-shrink-0 w-40"
                onClick={() => {
                  if (track.album?.id) {
                    router.push(`/album/${track.album.id}`);
                  } else {
                    router.push(`/track/${track.id}`);
                  }
                }}
                onMouseEnter={() => setHoveredTrack(track.id)}
                onMouseLeave={() => setHoveredTrack(null)}
              >
                <div className="flex flex-col space-y-2">
                  <div className="relative aspect-square overflow-hidden rounded-lg">
                    <Image
                      src={track.coverUrl || "/images/default-track.jpg"}
                      alt={track.title}
                      fill
                      className="object-cover"
                    />
                    <div
                      className={`absolute inset-0 transition-all duration-150 ${
                        hoveredTrack === track.id || isTrackPlaying(track.id)
                          ? "bg-black/30"
                          : "bg-black/0"
                      }`}
                    ></div>

                    {(hoveredTrack === track.id ||
                      isTrackPlaying(track.id)) && (
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                        <button
                          className="bg-black/50 rounded-full p-1.5 text-white hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTrack(track, e);
                          }}
                        >
                          {isTrackPlaying(track.id) ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium line-clamp-1">
                      {track.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {track.artist.artistName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
