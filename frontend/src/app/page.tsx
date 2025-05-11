"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/utils/api";
import { Album, Track, Playlist, History, PlaylistPrivacy } from "@/types";
import { useTrack } from "@/contexts/TrackContext";
import {
  ChevronRight,
  Heart,
  MoreHorizontal,
  Share2,
  ListMusic,
} from "lucide-react";
import { Play, Pause, AddSimple } from "@/components/ui/Icons";
import { useAuth } from "@/hooks/useAuth";
import { MusicAuthDialog } from "@/components/ui/data-table/data-table-modals";
import { useDominantColor } from "@/hooks/useDominantColor";
import { useBackground } from "@/contexts/BackgroundContext";

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
  const { dialogOpen, setDialogOpen, handleProtectedAction, isAuthenticated } =
    useAuth();
  const { setBackgroundStyle } = useBackground();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<Set<string>>(
    new Set()
  );
  const filteredPlaylistNames = new Set([
    "Soundwave Hits: Trending Right Now",
    "Discover Weekly",
    "Release Radar",
  ]);

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

      {isAuthenticated && personalizedPlaylists.length > 0 && (
        <Section title="Your Personalized Playlists">
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
            {personalizedPlaylists.map((playlist) => (
              <div
                key={playlist.id}
                className="cursor-pointer flex-shrink-0 w-40"
                onClick={() => router.push(`/playlists/${playlist.id}`)}
                onMouseEnter={() => setHoveredAlbum(`playlist-${playlist.id}`)}
                onMouseLeave={() => setHoveredAlbum(null)}
              >
                <div className="flex flex-col space-y-2">
                  <div className="relative aspect-square overflow-hidden rounded-lg">
                    <Image
                      src={playlist.coverUrl || "/images/default-playlist.jpg"}
                      alt={playlist.name}
                      fill
                      className="object-cover"
                    />
                    <div
                      className={`absolute inset-0 transition-all duration-150 ${
                        hoveredAlbum === `playlist-${playlist.id}`
                          ? "bg-black/30"
                          : "bg-black/0"
                      }`}
                    ></div>

                    <div className="absolute top-2 right-2 bg-black/40 rounded-full p-0.5">
                      <Image
                        src="/images/googleGemini_icon.png"
                        width={28}
                        height={28}
                        alt="Gemini"
                        className="rounded-full"
                      />
                    </div>

                    {hoveredAlbum === `playlist-${playlist.id}` && (
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                        <button
                          className="bg-black/50 rounded-full p-1.5 text-white hover:text-primary transition-colors"
                          onClick={(e) => handlePlayPlaylist(playlist, e)}
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium line-clamp-1">
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
