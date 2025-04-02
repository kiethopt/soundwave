'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import Link from 'next/link';
import { ArrowLeft } from '@/components/ui/Icons';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ArtistProfile } from '@/types';

interface Label {
  id: string;
  name: string;
}

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
  const [availableArtists, setAvailableArtists] = useState<Array<{ id: string; name: string }>>([]);
  const [featuredArtists, setFeaturedArtists] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string>(''); // Thay đổi từ null sang '' để khớp với select
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const [artistsResponse, genresResponse, labelsResponse] = await Promise.all([
          api.artists.getAllArtistsProfile(token, 1, 100),
          api.genres.getAll(token, 1, 100),
          api.labels.getAll(token, 1, 100),
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

        setAvailableLabels(
          labelsResponse.labels.map((label: Label) => ({
            id: label.id,
            name: label.name,
          }))
        );
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load required data (artists, genres, or labels)');
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'labelId') {
      setSelectedLabelId(value); // Cập nhật selectedLabelId khi chọn label
    } else {
      setTrackData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (e.target.name === 'audio') {
        setAudioFile(e.target.files[0]);
      } else if (e.target.name === 'cover' && e.target.files.length > 0) {
        const file = e.target.files[0];
        setCoverFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result as string);
        };
        reader.readAsDataURL(file);
        if (previewImage && previewImage.startsWith('blob:')) {
          URL.revokeObjectURL(previewImage);
        }
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
        toast('No cover image selected. You can update it later.');
      }

      featuredArtists.forEach((artistId) => {
        formData.append('featuredArtists[]', artistId);
      });

      selectedGenres.forEach((genreId) => {
        formData.append('genreIds[]', genreId);
      });

      if (selectedLabelId) {
        formData.append('labelId', selectedLabelId);
      }

      await api.tracks.create(formData, token);
      toast.success('Track created successfully');
      router.push('/artist/tracks');
    } catch (error) {
      console.error('Error creating track:', error);
      const errorMessage = (error as any)?.response?.data?.message || 'Failed to create track';
      toast.error(errorMessage);
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
          <div className="w-fit">
            <Link
              href="/artist/tracks"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${theme === 'light'
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
          className={`rounded-xl p-6 border ${theme === 'light'
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
                  className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
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
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${theme === 'light'
                      ? 'bg-white border-gray-300 focus:ring-blue-500/20 text-gray-900'
                      : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20 text-white'
                    }`}
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <label
                  htmlFor="type"
                  className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                    }`}
                >
                  Type
                </label>
                <select
                  id="type"
                  name="type"
                  value="SINGLE"
                  disabled
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 appearance-none ${theme === 'light'
                      ? 'bg-gray-100 border-gray-300 focus:ring-blue-500/20 text-gray-500'
                      : 'bg-white/[0.05] border-white/[0.1] focus:ring-white/20 text-white/50'
                    }`}
                >
                  <option
                    value="SINGLE"
                    className={theme === 'dark' ? 'bg-[#121212] text-white' : ''}
                  >
                    Single
                  </option>
                </select>
              </div>

              {/* Label */}
              <div className="space-y-2">
                <label
                  htmlFor="labelId"
                  className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                    }`}
                >
                  Label
                </label>
                <select
                  id="labelId"
                  name="labelId"
                  value={selectedLabelId}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${theme === 'light'
                      ? 'bg-white border-gray-300 focus:ring-blue-500/20 text-gray-900'
                      : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20 text-white'
                    }`}
                >
                  <option
                    value=""
                    className={theme === 'dark' ? 'bg-[#121212] text-white' : ''}
                  >
                    Select a label (optional)
                  </option>
                  {availableLabels.map((label) => (
                    <option
                      key={label.id}
                      value={label.id}
                      className={theme === 'dark' ? 'bg-[#121212] text-white' : ''}
                    >
                      {label.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Release Date & Time */}
              <div className="space-y-2">
                <label
                  htmlFor="releaseDate"
                  className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
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
                  className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 ${theme === 'light'
                      ? 'bg-white border-gray-300 focus:ring-blue-500/20 text-gray-900'
                      : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20 text-white'
                    } ${theme === 'dark' ? 'date-input-dark' : ''}`}
                  required
                />
              </div>

              {/* Featured Artists */}
              <div className="space-y-2">
                <label
                  htmlFor="featuredArtists"
                  className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
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
                  className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                    }`}
                >
                  Genres *
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
                  className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                    }`}
                >
                  Audio File *
                </label>
                <input
                  type="file"
                  id="audio"
                  name="audio"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className={`w-full text-sm rounded-lg border cursor-pointer focus:outline-none ${theme === 'light'
                      ? 'text-gray-900 border-gray-300 bg-gray-50 focus:border-blue-500'
                      : 'text-gray-400 border-gray-600 bg-gray-700 placeholder-gray-400 focus:border-blue-500'
                    } file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold ${theme === 'light'
                      ? 'file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200'
                      : 'file:bg-white/10 file:text-white/80 hover:file:bg-white/20'
                    }`}
                  required
                />
                {audioFile && (
                  <span
                    className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}
                  >
                    {audioFile.name}
                  </span>
                )}
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <label
                  htmlFor="cover"
                  className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                    }`}
                >
                  Cover Image (Optional)
                </label>
                <div
                  className="w-full flex flex-col items-center mb-4 cursor-pointer"
                  onClick={handleCoverClick}
                >
                  <div
                    className={`w-40 h-40 rounded-md overflow-hidden border-2 flex items-center justify-center ${theme === 'dark'
                        ? 'border-gray-600 bg-gray-800'
                        : 'border-gray-300 bg-gray-100'
                      } hover:opacity-90 transition-opacity relative group`}
                  >
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt="Track cover preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          } text-xs text-center p-2`}
                      >
                        Click to upload cover
                      </span>
                    )}
                    <div
                      className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm`}
                    >
                      Choose Cover
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
                  {coverFile && (
                    <span
                      className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}
                    >
                      {coverFile.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${theme === 'light'
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