'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [availableArtists, setAvailableArtists] = useState<
    Array<{
      id: string;
      name: string;
    }>
  >([]);
  const [featuredArtists, setFeaturedArtists] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<
    Array<{
      id: string;
      name: string;
    }>
  >([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const [artistsResponse, genresResponse] = await Promise.all([
          api.artists.getAllArtistsProfile(token, 1, 100),
          api.genres.getAll(token, 1, 100),
        ]);

        setAvailableArtists(
          artistsResponse.artists.map((artist: ArtistProfile) => ({
            id: artist.id,
            name: artist.artistName,
          }))
        );

        setAvailableGenres(
          genresResponse.genres.map((genre: { id: string; name: string }) => ({
            id: genre.id,
            name: genre.name,
          }))
        );
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load required data');
      }
    };

    fetchData();
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
      } else if (e.target.name === 'cover' && e.target.files.length > 0) {
        const file = e.target.files[0];
        setCoverFile(file);
        const imageUrl = URL.createObjectURL(file);
        setPreviewImage(imageUrl);
      }
    }
  };

  const handleCoverClick = () => {
    coverFileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!audioFile) {
      toast.error('Please select an audio file');
      return;
    }

    if (selectedGenres.length === 0) {
      toast.error('Please select at least one genre');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      formData.append('title', trackData.title);
      formData.append('type', 'SINGLE');
      formData.append('releaseDate', trackData.releaseDate);
      formData.append('audioFile', audioFile);

      if (coverFile) {
        formData.append('coverFile', coverFile);
      } else {
        toast.warning('No cover image selected. You can update it later.');
      }

      featuredArtists.forEach((artistId) => {
        formData.append('featuredArtists[]', artistId);
      });

      selectedGenres.forEach((genreId) => {
        formData.append('genreIds[]', genreId);
      });

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
              {/* Title */}
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

              {/* Type */}
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
                      ? 'bg-white border-gray-300 focus:ring-blue-500/20 text-gray-900'
                      : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20 text-white'
                  }`}
                >
                  <option
                    value="SINGLE"
                    className={
                      theme === 'dark' ? 'bg-[#121212] text-white' : ''
                    }
                  >
                    Single
                  </option>
                </select>
              </div>

              {/* Release Date & Time */}
              <div className="space-y-2">
                <label
                  htmlFor="releaseDate"
                  className={`block text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-white/80'
                  }`}
                >
                  Release Date & Time
                </label>
                <input
                  type="datetime-local"
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

              {/* Featured Artists */}
              <div className="space-y-2">
                <label
                  htmlFor="featuredArtists"
                  className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                  }`}
                >
                  Featured Artists
                </label>
                <SearchableSelect
                  options={availableArtists}
                  value={featuredArtists}
                  onChange={setFeaturedArtists}
                  placeholder="Select featured artists..."
                  multiple={true}
                />
              </div>

              {/* Genres */}
              <div className="space-y-2">
                <label
                  htmlFor="genres"
                  className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                  }`}
                >
                  Genres
                </label>
                <SearchableSelect
                  options={availableGenres}
                  value={selectedGenres}
                  onChange={setSelectedGenres}
                  placeholder="Select genres..."
                  multiple={true}
                  required={true}
                />
              </div>

              {/* Audio File */}
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

              {/* Cover Image */}
              <div className="space-y-2">
                <label
                  htmlFor="cover"
                  className={`block text-sm font-medium ${
                    theme === 'light' ? 'text-gray-700' : 'text-white/80'
                  }`}
                >
                  Cover Image
                </label>
                <div
                  className="w-full flex flex-col items-center mb-4"
                  onClick={handleCoverClick}
                >
                  <div
                    className={`w-40 h-40 rounded-md overflow-hidden cursor-pointer border-2 ${
                      theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                    } hover:opacity-90 transition-opacity relative`}
                  >
                    <img
                      src={
                        previewImage ||
                        'https://placehold.co/150x150?text=No+Cover'
                      }
                      alt="Track cover"
                      className="w-full h-full object-cover"
                    />
                    <div
                      className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity text-white`}
                    >
                      <span>Choose Cover</span>
                    </div>
                  </div>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    id="cover"
                    name="cover"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <span
                    className={`mt-2 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    Click to upload cover image
                  </span>
                </div>
              </div>

              {/* Submit Button */}
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
