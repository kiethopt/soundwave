'use client';

import { Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Track, Album } from '@/types';
import { api } from '@/utils/api';
import { useState, useEffect } from 'react';
import { Pause, Play } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';

// Loading UI component
function LoadingUI() {
  return (
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

  // Nghe nhạc
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [trackCurrentTimes, setTrackCurrentTimes] = useState<{
    [key: string]: number;
  }>({});

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

      const data = await response.json();
      console.log('Search history saved:', data);
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
    try {
      if (currentlyPlaying === track.id) {
        // Nếu đang phát bài hiện tại
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
        // Cleanup bài cũ
        if (currentlyPlaying && audioRef.current) {
          savePlayHistory(
            currentlyPlaying,
            Math.floor(audioRef.current.currentTime),
            false
          );
        }
        cleanupAudio();

        // Tạo audio mới
        const audio = new Audio(track.audioUrl);

        // Add event listeners
        audio.addEventListener('timeupdate', () => {
          setTrackCurrentTimes((prev) => ({
            ...prev,
            [track.id]: audio.currentTime || 0,
          }));
        });

        audio.addEventListener('ended', () => {
          savePlayHistory(track.id, track.duration, true);
          setCurrentlyPlaying(null);
          cleanupAudio();
        });

        audioRef.current = audio;
        audio.play();
        setCurrentlyPlaying(track.id);
      }
    } catch (error) {
      console.error('Error handling play/pause:', error);
    }
  };

  // Clean up audio khi unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  // useEffect search để lưu search history
  useEffect(() => {
    async function performSearch() {
      if (!query || !token) return;
      setIsLoading(true);
      try {
        // Gọi API search tracks và albums trước
        const [trackResponse, albumResponse] = await Promise.all([
          fetch(api.tracks.search(query)),
          fetch(api.albums.search(query)),
        ]);

        if (!trackResponse.ok || !albumResponse.ok) {
          throw new Error('Search API failed');
        }

        const [trackData, albumData] = await Promise.all([
          trackResponse.json(),
          albumResponse.json(),
        ]);

        setTrackResults(trackData);
        setAlbumResults(albumData);

        // Lưu search history sau khi search thành công
        await saveSearchHistory(query);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    performSearch();
  }, [query, token]);

  if (isLoading) return <LoadingUI />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">
        Search Results for "{query}"
      </h1>

      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold text-white mt-12">Albums</h1>
        {albumResults.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {albumResults.map((album) => (
              <div
                key={album.id}
                className="bg-white/5 p-4 rounded-lg group relative"
              >
                <div className="relative">
                  <img
                    src={album.coverUrl || '/images/default-avatar.png'}
                    alt={album.title}
                    className="w-full aspect-square object-cover rounded-md mb-4"
                  />
                </div>
                <h3 className="text-white font-medium">{album.title}</h3>
                <p className="text-white/60 text-sm">{album.artist}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/60">
            No album found for "{query}". Try searching for something else.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold text-white mt-8">Tracks</h1>
        {trackResults.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {trackResults.map((track) => (
              <div
                key={track.id}
                className="bg-white/5 p-4 rounded-lg group relative"
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
                <h3 className="text-white font-medium">{track.title}</h3>
                <p className="text-white/60 text-sm">{track.artist}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/60">
            No tracks found for "{query}". Try searching for something else.
          </p>
        )}
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
