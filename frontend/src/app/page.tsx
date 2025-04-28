'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/utils/api';
import { Album, Track, Playlist, History } from '@/types';
import { useTrack } from '@/contexts/TrackContext';
import { ChevronRight, Heart, MoreHorizontal, Share2, ListMusic } from 'lucide-react';
import { Play, Pause, AddSimple } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';
import { MusicAuthDialog } from '@/components/ui/data-table/data-table-modals';
import { useDominantColor } from '@/hooks/useDominantColor';
import { useBackground } from '@/contexts/BackgroundContext';

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
  const [aiGeneratedPlaylists, setAIGeneratedPlaylists] = useState<Playlist[]>(
    []
  );
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
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<Set<string>>(new Set());
  const filteredPlaylistNames = new Set(['Soundwave Hits: Trending Right Now', 'Discover Weekly', 'Release Radar']);

  const token = localStorage.getItem('userToken') || '';

  // Use the hook to get the dominant color from the first newest album
  const { dominantColor } = useDominantColor(
    newestAlbums.length > 0 ? newestAlbums[0].coverUrl : undefined
  );

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        setLoading(true);

        // Use the new consolidated API endpoint for home page data
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

          // Set albums data
          setNewestAlbums(newestAlbums || []);
          setHotAlbums(hotAlbums || []);
          setUserPlayHistory(userPlayHistory || []);
          setTopTracks(topTracks || []);

          // Process system playlists
          if (systemPlaylists && systemPlaylists.length > 0) {
            // Identify trending playlist
            const trendingPlaylist = systemPlaylists.find(
              (playlist: Playlist) =>
                playlist.name === 'Soundwave Hits: Trending Right Now'
            );

            // Set trending playlist (for the featured content and tracks section)
            setTrendingPlaylist(trendingPlaylist || null);
          }

          // Use the personalized system playlists directly from the API response
          if (
            isAuthenticated &&
            personalizedSystemPlaylists &&
            personalizedSystemPlaylists.length > 0
          ) {
            setPersonalizedPlaylists(personalizedSystemPlaylists);
          }

          // Process user's private playlists if authenticated
          if (isAuthenticated && userPlaylists && userPlaylists.length > 0) {
            // Filter AI-generated playlists that are NOT system playlists
            // (to avoid duplicating system playlists in both sections)
            const aiPlaylists = userPlaylists.filter(
              (playlist: Playlist) =>
                playlist.isAIGenerated && playlist.type !== 'SYSTEM'
            );

            setAIGeneratedPlaylists(aiPlaylists);
          }
        }
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [token, isAuthenticated]);

  // Effect to update background based on dominant color
  useEffect(() => {
    if (dominantColor) {
      setBackgroundStyle(
        `linear-gradient(to bottom, ${dominantColor} 0%, #111111 70%)`
      );
    } else {
      // Ensure default background if no color found initially
      setBackgroundStyle('#111111');
    }

    // Cleanup function to reset background when component unmounts
    return () => {
      setBackgroundStyle('#111111');
    };
  }, [dominantColor, setBackgroundStyle]);

  // Update playingAlbumId based on currentTrack
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

    // Dùng handleProtectedAction để kiểm tra xác thực và hiển thị dialog nếu cần
    const canProceed = handleProtectedAction();
    if (!canProceed) return;

    try {
      // Kiểm tra nếu track này là track hiện tại và đang phát
      if (isCurrentlyPlaying(track.id)) {
        pauseTrack();
        return;
      }

      playTrack(track);
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const handlePlayAlbum = async (album: Album, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Dùng handleProtectedAction để kiểm tra xác thực và hiển thị dialog nếu cần
    const canProceed = handleProtectedAction();
    if (!canProceed) return;

    try {
      // If album already has tracks with audioUrl, play directly
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

      // Otherwise, fetch the complete album data
      const token = localStorage.getItem('userToken');
      if (!token) return;

      // Fetch the complete album with track details
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
        console.error('Album has no tracks or failed to load');
      }
    } catch (error) {
      console.error('Error playing album:', error);
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

    // Dùng handleProtectedAction để kiểm tra xác thực và hiển thị dialog nếu cần
    const canProceed = handleProtectedAction();
    if (!canProceed) return;

    try {
      // Fetch the complete playlist with all track details before playing
      const token = localStorage.getItem('userToken');
      if (!token) return;

      // Show some loading indicator if needed

      // Fetch the complete playlist data with full track details
      const response = await api.playlists.getById(playlist.id, token);

      if (
        response.success &&
        response.data.tracks &&
        response.data.tracks.length > 0
      ) {
        // Now we have the complete tracks with audioUrl
        trackQueue(response.data.tracks);
        playTrack(response.data.tracks[0]);
      } else {
        console.error('Playlist has no tracks or failed to load');
      }
    } catch (error) {
      console.error('Error playing playlist:', error);
    }
  };

  const handleAddToQueue = (track: Track, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Dùng handleProtectedAction để kiểm tra xác thực và hiển thị dialog nếu cần
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
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Section component for consistent styling
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
    <div
      className="min-h-screen w-full px-6 py-8"
    >
      {/* Header Section */}
      <h1 className="text-4xl font-bold mb-6">New</h1>

      {/* Separator */}
      <div className="h-px bg-white/20 w-full mb-8"></div>

      {/* Featured Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Card 1: Trending Playlist */}
        {/* {trendingPlaylist && (
          <div
            className="cursor-pointer"
            onClick={() => router.push(`/playlists/${trendingPlaylist.id}`)}
          >
            <div className="mb-3">
              <div className="uppercase text-xs font-medium text-primary mb-1.5">
                TRENDING PLAYLIST
              </div>
              <h3 className="text-lg font-bold line-clamp-1 mb-1">
                {trendingPlaylist.name}
              </h3>
              <p className="text-sm text-muted-foreground">Soundwave</p>
            </div>
            <div className="editorial-card group">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                <Image
                  src={trendingPlaylist.coverUrl || ''}
                  alt={trendingPlaylist.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200"></div>
              </div>
            </div>
          </div>
        )} */}

        {/* Card 2: New Album */}
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
                  src={newestAlbums[0].coverUrl || '/images/default-album.jpg'}
                  alt={newestAlbums[0].title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200"></div>
              </div>
            </div>
          </div>
        )}

        {/* Card 3: Hot Album */}
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
                  src={hotAlbums[0].coverUrl || '/images/default-album.jpg'}
                  alt={hotAlbums[0].title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200"></div>
              </div>
            </div>
          </div>
        )}

        {/* Card 4: Top Track */}
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
                  src={topTracks[0].coverUrl || '/images/default-album.jpg'}
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

      

      {/* AI Generated Playlists Section - Only for authenticated users */}
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
                      src={playlist.coverUrl || '/images/default-playlist.jpg'}
                      alt={playlist.name}
                      fill
                      className="object-cover"
                    />
                    <div
                      className={`absolute inset-0 transition-all duration-150 ${
                        hoveredAlbum === `playlist-${playlist.id}`
                          ? 'bg-black/30'
                          : 'bg-black/0'
                      }`}
                    ></div>

                    {/* Gemini Icon for system playlists */}
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
                      {playlist.totalTracks || 0} tracks •{' '}
                      {playlist.name.includes('Discover Weekly')
                        ? 'Updated weekly'
                        : playlist.name.includes('Release Radar')
                        ? 'Updated on Fridays'
                        : 'For you'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* User-Created AI Playlists - Only for authenticated users */}
      {isAuthenticated && aiGeneratedPlaylists.length > 0 && (
        <Section title="Your AI-Generated Playlists">
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
            {aiGeneratedPlaylists.map((playlist) => (
              <div
                key={playlist.id}
                className="cursor-pointer flex-shrink-0 w-40"
                onClick={() => router.push(`/playlists/${playlist.id}`)}
                onMouseEnter={() =>
                  setHoveredAlbum(`aiplaylist-${playlist.id}`)
                }
                onMouseLeave={() => setHoveredAlbum(null)}
              >
                <div className="flex flex-col space-y-2">
                  <div className="relative aspect-square overflow-hidden rounded-lg">
                    <Image
                      src={playlist.coverUrl || ''}
                      alt={playlist.name}
                      fill
                      className="object-cover"
                    />
                    <div
                      className={`absolute inset-0 transition-all duration-150 ${
                        hoveredAlbum === `aiplaylist-${playlist.id}`
                          ? 'bg-black/30'
                          : 'bg-black/0'
                      }`}
                    ></div>

                    {/* Gemini Icon for AI playlists */}
                    <div className="absolute top-2 right-2 bg-black/40 rounded-full p-0.5">
                      <Image
                        src="/images/googleGemini_icon.png"
                        width={28}
                        height={28}
                        alt="Gemini"
                        className="rounded-full"
                      />
                    </div>

                    {hoveredAlbum === `aiplaylist-${playlist.id}` && (
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
                      {playlist.totalTracks} tracks • Personalized
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Trending Hits Section */}
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
                    src={track.coverUrl || '/images/default-track.jpg'}
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

      {/* New Releases Section - Horizontal scroll on mobile */}
      <Section title="New Releases" viewAllLink="/seeall?type=new-albums">
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
          {newestAlbums.slice(0, 8).map((album) => (
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
                    src={album.coverUrl || '/images/default-album.jpg'}
                    alt={album.title}
                    fill
                    className="object-cover"
                  />
                  <div
                    className={`absolute inset-0 transition-all duration-150 ${
                      hoveredAlbum === album.id || isAlbumPlaying(album.id)
                        ? 'bg-black/30'
                        : 'bg-black/0'
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

      {/* Popular Albums Section */}
      <Section title="Everyone's Listening To..." viewAllLink="/seeall?type=top-albums">
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
          {hotAlbums.slice(0, 8).map((album) => (
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
                    src={album.coverUrl || '/images/default-album.jpg'}
                    alt={album.title}
                    fill
                    className="object-cover"
                  />
                  <div
                    className={`absolute inset-0 transition-all duration-150 ${
                      hoveredAlbum === `hot-${album.id}` ||
                      isAlbumPlaying(album.id)
                        ? 'bg-black/30'
                        : 'bg-black/0'
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

      {/* Update the dropdown menu in the Recently Played section */}
      {isAuthenticated && userPlayHistory.length > 0 && (
        <Section title="Recently Played" viewAllLink="/seeall?type=recently-played">
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
            {userPlayHistory.slice(0, 8).map((track) => (
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
                        src={track.coverUrl || '/images/default-track.jpg'}
                        alt={track.title}
                        fill
                        className="object-cover"
                      />
                      <div
                        className={`absolute inset-0 transition-all duration-150 ${
                          hoveredTrack === track.id || isTrackPlaying(track.id)
                            ? 'bg-black/30'
                            : 'bg-black/0'
                        }`}
                      ></div>

                      {(hoveredTrack === track.id || isTrackPlaying(track.id)) && (
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

      {/* Authentication Dialog */}
      <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
