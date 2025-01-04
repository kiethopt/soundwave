'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewArtist() {
  const router = useRouter();
  const [newArtist, setNewArtist] = useState({
    name: '',
    bio: '',
    avatarFile: null as File | null,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('userToken');
      const formData = new FormData();

      formData.append('name', newArtist.name);
      if (newArtist.bio) {
        formData.append('bio', newArtist.bio);
      }
      if (newArtist.avatarFile) {
        formData.append('avatar', newArtist.avatarFile);
      }

      const response = await fetch(api.artists.create(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create artist');
      }

      router.push('/admin/artists');
    } catch (error: any) {
      console.error('Error creating artist:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to create artist'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/admin/artists"
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Artists</span>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create New Artist</h1>
      </div>

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={newArtist.name}
                onChange={(e) =>
                  setNewArtist({ ...newArtist, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium mb-1">
                Bio
              </label>
              <textarea
                id="bio"
                value={newArtist.bio}
                onChange={(e) =>
                  setNewArtist({ ...newArtist, bio: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                rows={4}
              />
            </div>

            <div>
              <label
                htmlFor="avatar"
                className="block text-sm font-medium mb-1"
              >
                Avatar Image
              </label>
              <input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setNewArtist({
                    ...newArtist,
                    avatarFile: e.target.files?.[0] || null,
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
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-white text-[#121212] rounded-md hover:bg-white/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating Artist...' : 'Create Artist'}
          </button>
        </form>
      </div>
    </div>
  );
}
