'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Genre } from '@/types';
import { toast } from 'react-toastify';

export default function NewAlbum() {
  const router = useRouter();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [newAlbum, setNewAlbum] = useState({
    title: '',
    releaseDate: '',
    type: 'ALBUM',
    genres: [] as string[],
    coverFile: null as File | null,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch genres when component mounts
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const response = await api.user.getAllGenres();
        setGenres(response);
      } catch (error) {
        console.error('Error fetching genres:', error);
      }
    };

    fetchGenres();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const formData = new FormData();
      formData.append('title', newAlbum.title);
      formData.append('releaseDate', newAlbum.releaseDate);
      formData.append('type', newAlbum.type);

      newAlbum.genres.forEach((genre) => formData.append('genres', genre));

      if (newAlbum.coverFile) {
        formData.append('coverFile', newAlbum.coverFile);
      }

      const response = await api.albums.create(formData, token);

      if (response.message) {
        toast.success('Album created successfully');
        router.push('/artist/albums');
      } else {
        throw new Error('Failed to create album');
      }
    } catch (error: any) {
      console.error('Error creating album:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to create album'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/artist/albums"
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Albums</span>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create New Album</h1>
      </div>
      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={newAlbum.title}
                onChange={(e) =>
                  setNewAlbum({ ...newAlbum, title: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="type" className="block text-sm font-medium">
                Type
              </label>
              <select
                id="type"
                value={newAlbum.type}
                onChange={(e) =>
                  setNewAlbum({ ...newAlbum, type: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent text-white"
                required
              >
                <option value="ALBUM" className="bg-[#121212] text-white">
                  Album
                </option>
                <option value="EP" className="bg-[#121212] text-white">
                  EP
                </option>
                <option value="SINGLE" className="bg-[#121212] text-white">
                  Single
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="genres" className="block text-sm font-medium">
                Genres
              </label>
              <SearchableSelect
                options={genres.map((genre) => ({
                  id: genre.id,
                  name: genre.name,
                }))}
                value={newAlbum.genres}
                onChange={(selectedGenres) =>
                  setNewAlbum({
                    ...newAlbum,
                    genres: Array.isArray(selectedGenres)
                      ? selectedGenres
                      : [selectedGenres],
                  })
                }
                placeholder="Select genres"
                multiple={true}
                required={true}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="releaseDate"
                className="block text-sm font-medium"
              >
                Release Date
              </label>
              <input
                id="releaseDate"
                type="date"
                value={newAlbum.releaseDate}
                onChange={(e) =>
                  setNewAlbum({ ...newAlbum, releaseDate: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="cover" className="block text-sm font-medium">
                Cover Image
              </label>
              <input
                id="cover"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setNewAlbum({
                    ...newAlbum,
                    coverFile: e.target.files?.[0] || null,
                  })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent file:bg-white/20 file:border-0 file:mr-4 file:px-4 file:py-2 file:rounded-md file:text-sm file:font-medium hover:file:bg-white/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-white text-[#121212] rounded-md hover:bg-white/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Album'}
          </button>
        </form>
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 text-red-500 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
