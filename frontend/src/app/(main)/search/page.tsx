'use client';

import { Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Track, Album } from '@/types';
import { api } from '@/utils/api';
import { useState, useEffect } from 'react';
import { Music, Pause, Play, Plus } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';
import { Ban, Heart, MoreHorizontal, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type FilterType = 'all' | 'albums' | 'tracks';

// Loading UI component
function LoadingUI() {
  return (
    <div>
      <div className="w-full border-b border-white/10">
        <div className="flex gap-8 px-6">
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
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const { token } = useAuth();
  const [trackResults, setTrackResults] = useState<Track[]>([]);
  const [albumResults, setAlbumResults] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // Audio states
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [trackCurrentTimes, setTrackCurrentTimes] = useState<{
    [key: string]: number;
  }>({});

  // Filter buttons
  const filterButtons: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Albums', value: 'albums' },
    { label: 'Tracks', value: 'tracks' },
  ];

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setTrackResults([]);
        setAlbumResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const [albumsResponse, tracksResponse] = await Promise.all([
          fetch(api.albums.search(query), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          fetch(api.tracks.search(query), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);

        const [albums, tracks] = await Promise.all([
          albumsResponse.json(),
          tracksResponse.json(),
        ]);

        setAlbumResults(albums);
        setTrackResults(tracks);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query, token]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setTrackResults([]);
        setAlbumResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const [albumsResponse, tracksResponse] = await Promise.all([
          fetch(api.albums.search(query), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          fetch(api.tracks.search(query), {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);

        const [albums, tracks] = await Promise.all([
          albumsResponse.json(),
          tracksResponse.json(),
        ]);

        console.log('Albums:', albums); // Debug log
        console.log('Tracks:', tracks); // Debug log

        setAlbumResults(albums);
        setTrackResults(tracks);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query, token]);

  const saveSearchHistory = async (query: string) => {
    try {
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(api.history.save(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'SEARCH',
          query: query,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save search history');
      }
    } catch (error) {
      console.error('Save search history error:', error);
    }
  };

  const savePlayHistory = async (
    trackId: string,
    duration: number,
    completed: boolean
  ) => {
    try {
      if (!token) {
        console.error('No token found');
        return;
      }

      await fetch(api.history.save(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'PLAY',
          trackId,
          duration,
          completed,
        }),
      });
    } catch (error) {
      console.error('Save play history error:', error);
    }
  };

  const cleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.removeEventListener('timeupdate', () => {});
      audioRef.current.removeEventListener('ended', () => {});
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const handlePlayPause = (track: Track) => {
    if (currentlyPlaying === track.id) {
      if (audioRef.current && !audioRef.current.paused) {
        // Đang phát -> Pause
        savePlayHistory(
          track.id,
          Math.floor(audioRef.current.currentTime),
          false
        );
        audioRef.current.pause();
        setCurrentlyPlaying(null);
      } else if (audioRef.current) {
        // Đang pause -> Play lại
        audioRef.current.play();
        setCurrentlyPlaying(track.id);
      }
    } else {
      // Chuyển sang bài mới
      if (currentlyPlaying && audioRef.current) {
        savePlayHistory(
          currentlyPlaying,
          Math.floor(audioRef.current.currentTime),
          false
        );
      }
      cleanupAudio();

      const audio = new Audio(track.audioUrl);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', () => {
        savePlayHistory(track.id, track.duration, true);
        setCurrentlyPlaying(null);
        cleanupAudio();
      });

      audioRef.current = audio;
      audio.play();
      setCurrentlyPlaying(track.id);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current || !currentlyPlaying) return;

    setTrackCurrentTimes({
      ...trackCurrentTimes,
      [currentlyPlaying]: audioRef.current.currentTime,
    });
  };

  const handleEnded = () => {
    setCurrentlyPlaying(null);
    setTrackCurrentTimes({});
  };

  const handleAddToPlaylist = async (trackId: string) => {
    try {
      // This would typically:
      // 1. Mở hộp thoại để chọn danh sách phát
      // 2. Thêm bài hát vào danh sách phát đã chọn
      // 3. Hiển thị thông báo thành công/lỗi
      console.log('Adding track to playlist:', trackId);
    } catch (error) {
      console.error('Failed to add to playlist:', error);
    }
  };

  const handleAddToFavorites = async (trackId: string) => {
    try {
      // This would typically:
      // 1. GET playlist YÊU THÍCH của người dùng hoặc tạo nếu playlist không tồn tại
      // 2. Thêm bài hát vào playlist YÊU THÍCH
      // 3. Hiển thị thông báo thành công/lỗi
      console.log('Adding track to favorites:', trackId);
    } catch (error) {
      console.error('Failed to add to favorites:', error);
    }
  };

  const handleShare = async (trackId: string) => {
    try {
      // This would typically:
      // 1. Tạo liên kết có thể chia sẻ
      // 2. Sao chép vào bảng tạm
      // 3. Hiển thị thông báo thành công
      console.log('Sharing track:', trackId);
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  return (
    <div>
      {/* Filter Bar - Now at the top with full width and border bottom */}
      <div className="w-full border-b border-white/10">
        <div className="flex gap-8 px-6">
          {filterButtons.map((button) => (
            <button
              key={button.value}
              onClick={() => setActiveFilter(button.value)}
              className={`py-3 text-sm font-medium transition-colors relative ${
                activeFilter === button.value
                  ? 'text-white'
                  : 'text-white/70 hover:text-white'
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
          {/* Albums Section */}
          {(activeFilter === 'all' || activeFilter === 'albums') &&
            albumResults.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Albums</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {albumResults.map((album) => (
                    <div key={album.id} className="bg-white/5 p-4 rounded-lg">
                      <img
                        src={album.coverUrl || '/images/default-album.png'}
                        alt={album.title}
                        className="w-full aspect-square object-cover rounded-md mb-4"
                      />
                      <h3 className="text-white font-medium truncate">
                        {album.title}
                      </h3>
                      <p className="text-white/60 text-sm truncate">
                        {typeof album.artist === 'string'
                          ? album.artist
                          : album.artist?.name || 'Unknown Artist'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Tracks Section */}
          {(activeFilter === 'all' || activeFilter === 'tracks') &&
            trackResults.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Tracks</h2>
                <div className="md:grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Mobile List View */}
                  <div className="block md:hidden space-y-2">
                    {trackResults.map((track) => (
                      <div
                        key={track.id}
                        className={`flex items-center gap-3 p-2 rounded-lg group
                          ${
                            currentlyPlaying === track.id
                              ? 'bg-white/5'
                              : 'hover:bg-white/5'
                          }`}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={track.coverUrl || '/images/default-avatar.png'}
                            alt={track.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <button
                            onClick={() => handlePlayPause(track)}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                          >
                            {currentlyPlaying === track.id ? (
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
                                ? 'text-[#A57865]'
                                : 'text-white'
                            }`}
                          >
                            {track.title}
                          </h3>
                          <p className="text-white/60 text-sm truncate">
                            {track.artist
                              ? typeof track.artist === 'string'
                                ? track.artist
                                : track.artist.name
                              : 'Unknown Artist'}
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
                              onClick={() => handleAddToPlaylist(track.id)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add to playlist
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAddToFavorites(track.id)}
                            >
                              <Heart className="w-4 h-4 mr-2" />
                              Add to favorites
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleShare(track.id)}
                            >
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Grid View */}
                  {trackResults.map((track) => (
                    <div
                      key={track.id}
                      className={`hidden md:block bg-white/5 p-4 rounded-lg group relative
                        ${
                          currentlyPlaying === track.id
                            ? 'bg-white/5'
                            : 'hover:bg-white/5'
                        }`}
                    >
                      <div className="relative">
                        <img
                          src={track.coverUrl || '/images/default-avatar.png'}
                          alt={track.title}
                          className="w-full aspect-square object-cover rounded-md mb-4"
                        />
                        <button
                          onClick={() => handlePlayPause(track)}
                          className="absolute bottom-6 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {currentlyPlaying === track.id ? (
                            <Pause className="w-6 h-6 text-white" />
                          ) : (
                            <Play className="w-6 h-6 text-white" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-grow min-w-0">
                          <h3
                            className={`font-medium truncate ${
                              currentlyPlaying === track.id
                                ? 'text-[#A57865]'
                                : 'text-white'
                            }`}
                          >
                            {track.title}
                          </h3>
                          <p className="text-white/60 text-sm truncate">
                            {track.artist
                              ? typeof track.artist === 'string'
                                ? track.artist
                                : track.artist.name
                              : 'Unknown Artist'}
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
                              onClick={() => handleAddToPlaylist(track.id)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add to playlist
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAddToFavorites(track.id)}
                            >
                              <Heart className="w-4 h-4 mr-2" />
                              Add to favorites
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleShare(track.id)}
                            >
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

          {/* No Results Message */}
          {!isLoading &&
            query &&
            trackResults.length === 0 &&
            albumResults.length === 0 && (
              <p className="text-white/60">
                No results found for "{query}". Try searching for something
                else.
              </p>
            )}

          {/* Audio Player */}
          <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
          />
        </div>
      </div>
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
