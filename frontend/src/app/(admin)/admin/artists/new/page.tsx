'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export default function NewArtist() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '', // Giữ lại trường name (User Name)
    email: '',
    artistName: '',
    bio: '',
    facebookLink: '',
    twitterLink: '',
    instagramLink: '',
    genres: [] as string[],
    avatarFile: null as File | null,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [genreOptions, setGenreOptions] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await api.user.getAllGenres();
        setGenreOptions(response);
      } catch (err) {
        console.error('Error fetching genres:', err);
        setError('Failed to load genres');
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
        throw new Error('No authentication token found');
      }

      // Validate file size
      if (formData.avatarFile && formData.avatarFile.size > 5 * 1024 * 1024) {
        throw new Error('File size exceeds the limit of 5MB');
      }

      const submitFormData = new FormData();
      submitFormData.append('name', formData.name);
      submitFormData.append('email', formData.email);
      submitFormData.append('artistName', formData.artistName);
      submitFormData.append('bio', formData.bio);
      submitFormData.append('genres', formData.genres.join(','));

      // Add social media links as a JSON string
      const socialMediaLinks = {
        facebook: formData.facebookLink || '',
        twitter: formData.twitterLink || '',
        instagram: formData.instagramLink || '',
      };
      submitFormData.append(
        'socialMediaLinks',
        JSON.stringify(socialMediaLinks)
      );

      if (formData.avatarFile) {
        submitFormData.append('avatar', formData.avatarFile);
      }

      await api.artists.create(submitFormData, token);
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
            {/* Basic Info */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                User Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                required
              />
            </div>

            {/* Artist Info */}
            <div>
              <label
                htmlFor="artistName"
                className="block text-sm font-medium mb-1"
              >
                Artist Name
              </label>
              <input
                id="artistName"
                type="text"
                value={formData.artistName}
                onChange={(e) =>
                  setFormData({ ...formData, artistName: e.target.value })
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
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                rows={4}
                required
              />
            </div>

            {/* Social Media Links */}
            <div>
              <label
                htmlFor="facebookLink"
                className="block text-sm font-medium mb-1"
              >
                Facebook Link
              </label>
              <input
                id="facebookLink"
                type="url"
                value={formData.facebookLink}
                onChange={(e) =>
                  setFormData({ ...formData, facebookLink: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                placeholder="https://facebook.com/artist"
              />
            </div>

            <div>
              <label
                htmlFor="twitterLink"
                className="block text-sm font-medium mb-1"
              >
                Twitter Link
              </label>
              <input
                id="twitterLink"
                type="url"
                value={formData.twitterLink}
                onChange={(e) =>
                  setFormData({ ...formData, twitterLink: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                placeholder="https://twitter.com/artist"
              />
            </div>

            <div>
              <label
                htmlFor="instagramLink"
                className="block text-sm font-medium mb-1"
              >
                Instagram Link
              </label>
              <input
                id="instagramLink"
                type="url"
                value={formData.instagramLink}
                onChange={(e) =>
                  setFormData({ ...formData, instagramLink: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
                placeholder="https://instagram.com/artist"
              />
            </div>

            {/* Genres */}
            <div>
              <label className="block text-sm font-medium mb-1">Genres</label>
              <SearchableSelect
                options={genreOptions}
                value={formData.genres}
                onChange={(selected) =>
                  setFormData({
                    ...formData,
                    genres: Array.isArray(selected) ? selected : [selected],
                  })
                }
                placeholder="Select genres"
                multiple={true}
                required={true}
              />
            </div>

            {/* Avatar */}
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
                  setFormData({
                    ...formData,
                    avatarFile: e.target.files?.[0] || null,
                  })
                }
                className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent file:bg-white/20 file:border-0 file:mr-4 file:px-4 file:py-2 file:rounded-md file:text-sm file:font-medium hover:file:bg-white/30"
                required
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
