'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Track } from '@/types';
import { api } from '@/utils/api';
import { debounce } from 'lodash';
import { Search, Music, Plus, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import AudioPlayer from '@/components/ui/AudioPlayer';

export default function AdminTracks() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

  // Fetch tracks data
  const fetchTracks = useCallback(async (query: string = '') => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('userToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(
        query ? api.tracks.search(query) : api.tracks.getAll(),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch tracks');
      }

      const data = await response.json();
      setTracks(data);
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tracks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to fetch tracks on mount
  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  // Utility functions
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handlers
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchTracks(searchInput);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handlePlayPause = (trackId: string) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null);
      setCurrentAudioUrl(null);
    } else {
      const track = tracks.find((t) => t.id === trackId);
      if (track && track.audioUrl) {
        setPlayingTrack(trackId);
        setCurrentAudioUrl(track.audioUrl);
      }
    }
  };

  const handleTrackEnded = () => {
    setPlayingTrack(null);
    setCurrentAudioUrl(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Track Management
          </h1>
          <p className="text-white/60 mt-2">
            Upload and manage individual tracks
          </p>
        </div>
        <Link
          href="/admin/tracks/new"
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-white/90"
        >
          <Plus className="w-4 h-4" />
          New Track
        </Link>
      </div>

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08]">
        <div className="p-6 border-b border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Track List</h2>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search tracks..."
                value={searchInput}
                onChange={handleSearchInputChange}
                className="pl-10 pr-4 py-2 bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent w-64"
              />
              <button
                type="submit"
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
              >
                <Search className="text-white/40 w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : tracks.length > 0 ? (
            <table className="w-full">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Artist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Album
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {tracks.map((track) => (
                  <tr
                    key={track.id}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => handlePlayPause(track.id)}
                          className="mr-3 text-white/60 hover:text-white transition-colors"
                        >
                          {playingTrack === track.id ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5" />
                          )}
                        </button>
                        {track.coverUrl ? (
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="w-10 h-10 rounded-md mr-3 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md mr-3 bg-white/[0.03] flex items-center justify-center">
                            <Music className="w-6 h-6 text-white/60" />
                          </div>
                        )}
                        <span className="font-medium">{track.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {track.artist}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDuration(track.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {track.album?.title || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
              <Music className="w-12 h-12 mb-4" />
              <p>No tracks found</p>
            </div>
          )}
        </div>
      </div>
      {playingTrack && currentAudioUrl && (
        <AudioPlayer
          src={currentAudioUrl}
          isPlaying={!!playingTrack}
          onEnded={handleTrackEnded}
        />
      )}
    </div>
  );
}
