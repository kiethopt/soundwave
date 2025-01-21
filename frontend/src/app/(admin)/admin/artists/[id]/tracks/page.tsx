'use client';

import { useState, useEffect, useCallback } from 'react';
import { Track } from '@/types';
import { api } from '@/utils/api';
import { Music, Plus, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AudioPlayer from '@/components/ui/AudioPlayer';

export default function ArtistTracks() {
  const { id } = useParams();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

  // Fetch tracks data
  const fetchTracks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.artists.getTracks(id as string, token);
      setTracks(response);
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tracks');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const handlePlayPause = (track: Track) => {
    if (playingTrackId === track.id) {
      setPlayingTrackId(null);
      setCurrentAudioUrl(null);
    } else {
      setPlayingTrackId(track.id);
      setCurrentAudioUrl(track.audioUrl);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artist Tracks</h1>
          <p className="text-white/60 mt-2">Manage artist's tracks</p>
        </div>
        <Link
          href={`/admin/artists/${id}/tracks/new`}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-white/90"
        >
          <Plus className="w-4 h-4" />
          New Track
        </Link>
      </div>

      {/* Track List */}
      <div className="space-y-2">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="bg-white/[0.03] rounded-lg p-4 hover:bg-white/[0.05] transition-colors"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => handlePlayPause(track)}
                className="text-white/60 hover:text-white"
              >
                {playingTrackId === track.id ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </button>
              {track.coverUrl ? (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-12 h-12 rounded-md object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-white/[0.03] flex items-center justify-center">
                  <Music className="w-6 h-6 text-white/60" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-white">{track.title}</h3>
                <p className="text-sm text-white/60">
                  {track.album?.title || 'Single'} ·{' '}
                  {formatDuration(track.duration)}
                </p>
              </div>
              <div className="text-sm text-white/60">
                {track.playCount.toLocaleString()} plays
              </div>
            </div>
          </div>
        ))}
      </div>

      {playingTrackId && currentAudioUrl && (
        <AudioPlayer
          src={currentAudioUrl}
          isPlaying={!!playingTrackId}
          onEnded={() => {
            setPlayingTrackId(null);
            setCurrentAudioUrl(null);
          }}
        />
      )}
    </div>
  );
}
