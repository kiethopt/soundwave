'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Genre } from '@/types';
import { toast } from 'react-toastify';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { theme } = useTheme();

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
    <div
      className="container mx-auto mb-16 md:mb-0 p-4"
      suppressHydrationWarning
    >
      <div className="flex flex-col space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          {/* Back Button */}
          <div className="w-fit">
            <Link
              href="/artist/albums"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                theme === 'light'
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
                  : 'bg-white/10 hover:bg-white/15 text-white/80 hover:text-white'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Link>
          </div>
        </div>

        {/* Main Form Card */}
        <div
          className={`rounded-xl p-6 border ${
            theme === 'light'
              ? 'bg-white border-gray-200'
              : 'bg-[#121212] border-gray-800'
          }`}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Form fields with updated styling */}
              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className={`block text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-white/80'
                  }`}
                >
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={newAlbum.title}
                  onChange={(e) =>
                    setNewAlbum({ ...newAlbum, title: e.target.value })
                  }
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                      : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20'
                  }`}
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
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                      : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20'
                  }`}
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
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                      : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20'
                  }`}
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
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                      : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-gray-900 text-white hover:bg-gray-800'
                    : 'bg-white text-[#121212] hover:bg-white/90'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? 'Creating...' : 'Create Album'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
