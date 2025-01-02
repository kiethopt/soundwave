'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewTrack() {
  const router = useRouter();
  const [newTrack, setNewTrack] = useState({
    title: '',
    artist: '',
    duration: '',
    releaseDate: '',
    audioFile: null as File | null,
    coverFile: null as File | null,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('userToken');
      const formData = new FormData();

      formData.append('title', newTrack.title);
      formData.append('artist', newTrack.artist);
      formData.append('duration', newTrack.duration);
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

      router.push('/admin/tracks');
    } catch (error: any) {
      console.error('Error creating track:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to create track'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/admin/tracks"
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Tracks</span>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Add New Track</h1>
      </div>
      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={newTrack.title}
                onChange={(e) =>
                  setNewTrack({ ...newTrack, title: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label
                htmlFor="artist"
                className="block text-sm font-medium mb-1"
              >
                Artist
              </label>
              <input
                id="artist"
                type="text"
                value={newTrack.artist}
                onChange={(e) =>
                  setNewTrack({ ...newTrack, artist: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label
                htmlFor="duration"
                className="block text-sm font-medium mb-1"
              >
                Duration (in seconds)
              </label>
              <input
                id="duration"
                type="number"
                value={newTrack.duration}
                onChange={(e) =>
                  setNewTrack({ ...newTrack, duration: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label
                htmlFor="releaseDate"
                className="block text-sm font-medium mb-1"
              >
                Release Date
              </label>
              <input
                id="releaseDate"
                type="date"
                value={newTrack.releaseDate}
                onChange={(e) =>
                  setNewTrack({ ...newTrack, releaseDate: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label
                htmlFor="audioFile"
                className="block text-sm font-medium mb-1"
              >
                Audio File
              </label>
              <input
                id="audioFile"
                type="file"
                accept="audio/*"
                onChange={(e) =>
                  setNewTrack({
                    ...newTrack,
                    audioFile: e.target.files?.[0] || null,
                  })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent file:bg-white/20 file:border-0 file:mr-4 file:px-4 file:py-2 file:rounded-md file:text-sm file:font-medium hover:file:bg-white/30"
                required
              />
            </div>

            <div>
              <label
                htmlFor="coverFile"
                className="block text-sm font-medium mb-1"
              >
                Cover Image (optional)
              </label>
              <input
                id="coverFile"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setNewTrack({
                    ...newTrack,
                    coverFile: e.target.files?.[0] || null,
                  })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent file:bg-white/20 file:border-0 file:mr-4 file:px-4 file:py-2 file:rounded-md file:text-sm file:font-medium hover:file:bg-white/30"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isUploading}
            className="w-full px-4 py-2 bg-white text-[#121212] rounded-md hover:bg-white/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Creating Track...' : 'Create Track'}
          </button>
        </form>
      </div>
    </div>
  );
}
