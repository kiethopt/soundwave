'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/utils/api';
import { Album, Track, Playlist } from '@/types';
import { useTrack } from '@/contexts/TrackContext';
import { ChevronRight, Play, MoreHorizontal, Pause } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [newestAlbums, setNewestAlbums] = useState<Album[]>([]);
  const [hotAlbums, setHotAlbums] = useState<Album[]>([]);
  const [recommendedPlaylist, setRecommendedPlaylist] =
    useState<Playlist | null>(null);
  const [updatedPlaylists, setUpdatedPlaylists] = useState<Playlist[]>([]);
  const [systemPlaylists, setSystemPlaylists] = useState<Playlist[]>([]);
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

  const token = localStorage.getItem('userToken') || '';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchHomeData = async () => {
      try {
        setLoading(true);

        const [newestAlbumsRes, hotAlbumsRes, systemPlaylistsRes] =
          await Promise.all([
            api.albums.getNewestAlbums(token),
            api.albums.getHotAlbums(token),
            api.playlists.getSystemPlaylists(token),
          ]);

        setNewestAlbums(newestAlbumsRes.albums || []);
        setHotAlbums(hotAlbumsRes.albums || []);

        if (systemPlaylistsRes.success) {
          const mainPlaylist =
            systemPlaylistsRes.data.find(
              (playlist: Playlist) =>
                playlist.name === 'Soundwave Hits: Trending Right Now'
            ) || systemPlaylistsRes.data[0];

          setRecommendedPlaylist(mainPlaylist);

          setSystemPlaylists(systemPlaylistsRes.data);
          setUpdatedPlaylists(systemPlaylistsRes.data);
        } else {
          console.error(
            'Failed to load system playlists:',
            systemPlaylistsRes.message
          );
        }
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [token, router]);

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

    try {
      // Kiểm tra nếu track này là track hiện tại và đang phát
      if (isCurrentlyPlaying(track.id)) {
        pauseTrack();
        return;
      }

      // Nếu track không có audioUrl, cần tải đầy đủ thông tin track
      if (!track.audioUrl) {
        const token = localStorage.getItem('userToken');
        if (!token) {
          console.error('User token not found');
          return;
        }

        // Lấy thông tin đầy đủ của track trước khi phát
        const trackDetailResponse = await api.tracks.getById(track.id, token);
        if (trackDetailResponse) {
          playTrack(trackDetailResponse);
        }
      } else {
        // Nếu đã có audioUrl, phát ngay
        playTrack(track);
      }
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const handlePlayAlbum = (album: Album, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (album.tracks && album.tracks.length > 0) {
      if (playingAlbumId === album.id && isPlaying) {
        pauseTrack();
      } else {
        trackQueue(album.tracks);
        playTrack(album.tracks[0]);
        setPlayingAlbumId(album.id);
      }
    }
  };

  const handlePlayPlaylist = (playlist: Playlist, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (playlist.tracks && playlist.tracks.length > 0) {
      trackQueue(playlist.tracks);
      playTrack(playlist.tracks[0]);
    }
  };

  const handleAddToQueue = (track: Track, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    addToQueue(track);
  };

  const isCurrentlyPlaying = (trackId: string) => {
    return currentTrack?.id === trackId && isPlaying;
  };

  const isAlbumPlaying = (albumId: string) => {
    return playingAlbumId === albumId && isPlaying;
  };

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
        {viewAllLink && (
          <button
            onClick={() => router.push(viewAllLink)}
            className="text-sm text-primary flex items-center hover:underline"
          >
            See All <ChevronRight size={16} />
          </button>
        )}
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen w-full px-6 py-8">
      {/* Header Section */}
      <h1 className="text-4xl font-bold mb-6">New</h1>

      {/* Separator */}
      <div className="h-px bg-white/20 w-full mb-8"></div>

      {/* Featured Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Card 1: Updated Playlist */}
        {recommendedPlaylist && (
          <div
            className="cursor-pointer"
            onClick={() => router.push(`/playlists/${recommendedPlaylist.id}`)}
          >
            <div className="mb-3">
              <div className="uppercase text-xs font-medium text-primary mb-1.5">
                UPDATED PLAYLIST
              </div>
              <h3 className="text-lg font-bold line-clamp-1 mb-1">
                {recommendedPlaylist.name}
              </h3>
              <p className="text-sm text-muted-foreground">Soundwave</p>
            </div>
            <div className="editorial-card group">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                <Image
                  src={
                    recommendedPlaylist.coverUrl ||
                    '/images/default-playlist.jpg'
                  }
                  alt={recommendedPlaylist.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200"></div>
              </div>
            </div>
          </div>
        )}

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

        {/* Card 3: Featured Album/Set List */}
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
              <p className="text-sm text-muted-foreground">Soundwave</p>
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
      </div>

      {/* System Playlists Section - New Section */}
      {systemPlaylists.length > 0 && (
        <Section title="Your Recommended Playlists">
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
            {systemPlaylists.map((playlist) => (
              <div
                key={playlist.id}
                className="cursor-pointer flex-shrink-0 w-40"
                onClick={() => router.push(`/playlists/${playlist.id}`)}
                onMouseEnter={() => setHoveredAlbum(`system-${playlist.id}`)}
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
                        hoveredAlbum === `system-${playlist.id}`
                          ? 'bg-black/30'
                          : 'bg-black/0'
                      }`}
                    ></div>

                    {hoveredAlbum === `system-${playlist.id}` && (
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                        <button
                          className="bg-black/50 rounded-full p-1.5 text-white hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/playlists/${playlist.id}`);
                          }}
                        >
                          <Play size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium line-clamp-1">
                      {playlist.name}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {playlist.totalTracks} tracks • Soundwave
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Latest Songs Section (2-column layout like Apple Music) */}
      {recommendedPlaylist && recommendedPlaylist.tracks && (
        <Section title="Latest Songs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendedPlaylist.tracks.slice(0, 10).map((track, index) => (
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
                          <Pause size={16} />
                        ) : (
                          <Play size={16} />
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
      <Section title="New Releases" viewAllLink="/browse/new-releases">
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
          {newestAlbums.slice(0, 8).map((album) => (
            <div
              key={album.id}
              className="cursor-pointer flex-shrink-0 w-40"
              onClick={() => router.push(`/album/${album.id}`)}
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
                          <Pause size={18} />
                        ) : (
                          <Play size={18} />
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

      {/* Updated Playlists Section */}
      <Section title="Updated Playlists">
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
          {updatedPlaylists.map((playlist) => (
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

                  {hoveredAlbum === `playlist-${playlist.id}` && (
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                      <button
                        className="bg-black/50 rounded-full p-1.5 text-white hover:text-primary transition-colors"
                        onClick={(e) => handlePlayPlaylist(playlist, e)}
                      >
                        <Play size={18} />
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
                    {playlist.name}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    Soundwave
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Trending Songs Section */}
      {recommendedPlaylist && recommendedPlaylist.tracks && (
        <Section title="Trending Songs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendedPlaylist.tracks.slice(0, 8).map((track, index) => (
              <div
                key={track.id}
                className="flex items-center space-x-3 p-3 rounded-md hover:bg-accent/10 cursor-pointer transition-all duration-200 group relative"
                onClick={(e) => handlePlayTrack(track, e)}
                onMouseEnter={() => setHoveredTrack(`trending-${track.id}`)}
                onMouseLeave={() => setHoveredTrack(null)}
              >
                <div className="text-sm text-muted-foreground w-6 text-center">
                  {hoveredTrack === `trending-${track.id}` ? (
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
                  <div
                    className={`absolute inset-0 rounded transition-all duration-150 ${
                      hoveredTrack === `trending-${track.id}` ||
                      isCurrentlyPlaying(track.id)
                        ? 'bg-black/30'
                        : 'bg-black/0'
                    }`}
                  ></div>

                  {(hoveredTrack === `trending-${track.id}` ||
                    isCurrentlyPlaying(track.id)) && (
                    <div className="absolute inset-0 rounded flex items-center justify-center">
                      <button
                        className="bg-black/50 rounded-full p-1.5 text-white hover:text-primary transition-colors"
                        onClick={(e) => handlePlayTrack(track, e)}
                      >
                        {isCurrentlyPlaying(track.id) ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} />
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
                {hoveredTrack === `trending-${track.id}` && (
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

      {/* Everyone's Listening To... Section */}
      <Section title="Everyone's Listening To...">
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent">
          {hotAlbums.slice(2, 10).map((album) => (
            <div
              key={album.id}
              className="cursor-pointer flex-shrink-0 w-40"
              onClick={() => router.push(`/album/${album.id}`)}
              onMouseEnter={() => setHoveredAlbum(`everyone-${album.id}`)}
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
                      hoveredAlbum === `everyone-${album.id}` ||
                      isAlbumPlaying(album.id)
                        ? 'bg-black/30'
                        : 'bg-black/0'
                    }`}
                  ></div>

                  {(hoveredAlbum === `everyone-${album.id}` ||
                    isAlbumPlaying(album.id)) && (
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                      <button
                        className="bg-black/50 rounded-full p-1.5 text-white hover:text-primary transition-colors"
                        onClick={(e) => handlePlayAlbum(album, e)}
                      >
                        {isAlbumPlaying(album.id) ? (
                          <Pause size={18} />
                        ) : (
                          <Play size={18} />
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
    </div>
  );
}
