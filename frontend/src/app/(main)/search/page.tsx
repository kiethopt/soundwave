'use client';

import { Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Track } from '@/types';
import { api } from '@/utils/api';
import { useState, useEffect } from 'react';
import { Pause, Play } from '@/components/ui/Icons';

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
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Nghe nhạc
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [trackCurrentTimes, setTrackCurrentTimes] = useState<{
    [key: string]: number;
  }>({});

  const handlePlayPause = (track: Track) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(track.audioUrl);
      audioRef.current.addEventListener('timeupdate', () => {
        setTrackCurrentTimes((prev) => ({
          ...prev,
          [track.id]: audioRef.current?.currentTime || 0,
        }));
      });
    }

    if (currentlyPlaying === track.id) {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
        setCurrentlyPlaying(null);
      } else {
        audioRef.current.currentTime = trackCurrentTimes[track.id] || 0;
        audioRef.current.play();
        setCurrentlyPlaying(track.id);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = track.audioUrl;
      }
      audioRef.current.currentTime = trackCurrentTimes[track.id] || 0;
      audioRef.current.play();
      setCurrentlyPlaying(track.id);
    }
  };

  // Clean up audio khi unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', () => {});
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    async function performSearch() {
      if (!query) return;

      setIsLoading(true);
      try {
        const response = await fetch(api.tracks.search(query));
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    performSearch();
  }, [query]);

  if (isLoading) return <LoadingUI />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">
        Search Results for "{query}"
      </h1>
      {searchResults.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {searchResults.map((track) => (
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
          No results found for "{query}". Try searching for something else.
        </p>
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
