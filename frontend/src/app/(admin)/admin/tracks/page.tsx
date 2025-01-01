'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '@/utils/config';
import { Track } from '@/types';
import { api } from '@/utils/api';

export default function AdminTracks() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTrack, setNewTrack] = useState({
    title: '',
    artist: '',
    duration: '0:00',
    releaseDate: '',
    audioFile: null as File | null,
    coverFile: null as File | null,
  });

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('userToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/api/tracks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
  };

  useEffect(() => {
    fetchTracks();
  }, []);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const parseDuration = (timeString: string): number => {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return (minutes || 0) * 60 + (seconds || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('userToken');
      const formData = new FormData();

      formData.append('title', newTrack.title);
      formData.append('artist', newTrack.artist);
      formData.append('duration', String(parseDuration(newTrack.duration)));
      formData.append('releaseDate', newTrack.releaseDate);

      if (newTrack.audioFile) {
        formData.append('audio', newTrack.audioFile);
      }

      if (newTrack.coverFile) {
        formData.append('cover', newTrack.coverFile);
      }

      const response = await fetch(api.tracks.create(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create track');
      }

      await fetchTracks();
      setNewTrack({
        title: '',
        artist: '',
        duration: '0:00',
        releaseDate: '',
        audioFile: null,
        coverFile: null,
      });
    } catch (error) {
      console.error('Error creating track:', error);
      alert(error instanceof Error ? error.message : 'Failed to create track');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manage Single Tracks</h2>
        <p className="text-white/60">
          Upload and manage individual tracks that are not part of any album
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <input
          type="text"
          placeholder="Title"
          value={newTrack.title}
          onChange={(e) => setNewTrack({ ...newTrack, title: e.target.value })}
          className="w-full px-3 py-2 bg-white/5 rounded border border-white/10"
          required
          lang="vi"
        />
        <input
          type="text"
          placeholder="Artist"
          value={newTrack.artist}
          onChange={(e) => setNewTrack({ ...newTrack, artist: e.target.value })}
          className="w-full px-3 py-2 bg-white/5 rounded border border-white/10"
          required
          lang="vi"
        />
        <input
          type="text"
          placeholder="Duration (mm:ss)"
          pattern="[0-9]+:[0-5][0-9]"
          value={newTrack.duration}
          onChange={(e) => {
            const durationInSeconds = parseDuration(e.target.value);
            setNewTrack({
              ...newTrack,
              duration: formatDuration(durationInSeconds),
            });
          }}
          className="w-full px-3 py-2 bg-white/5 rounded border border-white/10"
          required
        />
        <input
          type="date"
          value={newTrack.releaseDate}
          onChange={(e) =>
            setNewTrack({ ...newTrack, releaseDate: e.target.value })
          }
          className="w-full px-3 py-2 bg-white/5 rounded border border-white/10"
          required
        />

        {/* Cover upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/70">
            Cover Image (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setNewTrack({
                ...newTrack,
                coverFile: e.target.files?.[0] || null,
              })
            }
            className="w-full px-3 py-2 bg-white/5 rounded border border-white/10"
          />
        </div>

        {/* Audio upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/70">
            Audio File
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) =>
              setNewTrack({
                ...newTrack,
                audioFile: e.target.files?.[0] || null,
              })
            }
            className="w-full px-3 py-2 bg-white/5 rounded border border-white/10"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full p-2 bg-white text-black rounded hover:bg-white/90"
        >
          Add Track
        </button>
      </form>

      {/* Track list */}
      {tracks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tracks.map((track) => (
            <div key={track.id} className="p-4 bg-white/5 rounded">
              {track.coverUrl && (
                <img
                  src={track.coverUrl}
                  alt={track.title}
                  className="w-full h-48 object-cover rounded mb-4"
                />
              )}
              <h3 className="font-medium">{track.title}</h3>
              <p className="text-sm text-white/70">{track.artist}</p>
              <p className="text-sm text-white/50">
                {formatDuration(track.duration)}
              </p>
              <audio src={track.audioUrl} controls className="mt-2 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white/60">No single tracks found</p>
      )}
    </div>
  );
}
