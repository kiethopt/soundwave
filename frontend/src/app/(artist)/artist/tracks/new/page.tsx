'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import Link from 'next/link';
import { ArrowLeft } from '@/components/ui/Icons';
import { toast } from 'react-toastify';
import { useTheme } from '@/contexts/ThemeContext';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ArtistProfile } from '@/types';

export default function NewTrack() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [trackData, setTrackData] = useState({
    title: '',
    type: 'SINGLE',
    releaseDate: '',
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [featuredArtists, setFeaturedArtists] = useState<string[]>([]);
  const [artistOptions, setArtistOptions] = useState<ArtistProfile[]>([]);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const response = await api.artists.getAllArtistsProfile(token, 1, 100);
        const verifiedArtists = response.artists.filter(
          (artist: ArtistProfile) =>
            artist.isVerified && artist.role === 'ARTIST'
        );
        setArtistOptions(verifiedArtists);
      } catch (err) {
        console.error('Error fetching artists:', err);
        toast.error('Failed to load featured artists');
      }
    };

    fetchArtists();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTrackData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (e.target.name === 'audio') {
        setAudioFile(e.target.files[0]);
      } else if (e.target.name === 'cover') {
        setCoverFile(e.target.files[0]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      formData.append('title', trackData.title);
      formData.append('type', 'SINGLE');
      formData.append('releaseDate', trackData.releaseDate);
      if (audioFile) formData.append('audioFile', audioFile);
      if (coverFile) formData.append('coverFile', coverFile);
      if (featuredArtists.length > 0) {
        formData.append('featuredArtists', featuredArtists.join(','));
      }

      await api.tracks.create(formData, token);
      toast.success('Track created successfully');
      router.push('/artist/tracks');
    } catch (error) {
      console.error('Error creating track:', error);
      toast.error('Failed to create track');
    } finally {
      setIsLoading(false);
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
              href="/artist/tracks"
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
                  type="text"
                  id="title"
                  name="title"
                  value={trackData.title}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                      : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20'
                  }`}
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="type"
                  className={`block text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-white/80'
                  }`}
                >
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  value="SINGLE"
                  disabled
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                      : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20'
                  }`}
                >
                  <option value="SINGLE">Single</option>
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="releaseDate"
                  className={`block text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-white/80'
                  }`}
                >
                  Release Date
                </label>
                <input
                  type="date"
                  id="releaseDate"
                  name="releaseDate"
                  value={trackData.releaseDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                      : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20'
                  }`}
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="featuredArtists"
                  className={`block text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-white/80'
                  }`}
                >
                  Featured Artists
                </label>
                <SearchableSelect
                  options={artistOptions.map((artist) => ({
                    id: artist.id,
                    name: artist.artistName,
                  }))}
                  value={featuredArtists}
                  onChange={(value) => setFeaturedArtists(value as string[])}
                  placeholder="Select featured artists"
                  multiple
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="audio"
                  className={`block text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-white/80'
                  }`}
                >
                  Audio File
                </label>
                <input
                  type="file"
                  id="audio"
                  name="audio"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                      : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20'
                  }`}
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="cover"
                  className={`block text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-white/80'
                  }`}
                >
                  Cover Image
                </label>
                <input
                  type="file"
                  id="cover"
                  name="cover"
                  accept="image/*"
                  onChange={handleFileChange}
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                      : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20'
                  }`}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    theme === 'light'
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'bg-white text-[#121212] hover:bg-white/90'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? 'Creating...' : 'Create Track'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
