'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { ArrowLeft, Upload, Music, FileAudio, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { ArtistCreatableSelect } from '@/components/ui/ArtistCreatableSelect';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ArtistProfile } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label as UILabel } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Define the type for selected artists (can have ID or just name)
interface SelectedArtist {
  id?: string;
  name: string;
}

// Định nghĩa kiểu dữ liệu cho Label (nếu chưa có)
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
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const [availableArtists, setAvailableArtists] = useState<Array<{ id: string; name: string }>>([]);
  const [featuredArtists, setFeaturedArtists] = useState<SelectedArtist[]>([]);
  const [availableGenres, setAvailableGenres] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // State to store the artist's default label name
  const [artistLabelName, setArtistLabelName] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          toast.error("Authentication required. Please log in.");
          router.push('/login');
          return;
        }

        // Fetch artists, genres, and profile in parallel
        const [artistsResponse, genresResponse, profileResponse] = await Promise.all([
          api.artists.getAllArtistsProfile(token, 1, 500),
          api.genres.getAll(token, 1, 1000),
          api.auth.getMe(token), // Fetch current user profile
        ]);

        // Set available artists (excluding self if needed, though maybe allow for features)
        setAvailableArtists(
          artistsResponse.artists.map((artist: ArtistProfile) => ({
            id: artist.id,
            name: artist.artistName,
          }))
        );

        // Set available genres
        setAvailableGenres(
          genresResponse.genres.map((genre: { id: string; name: string }) => ({
            id: genre.id,
            name: genre.name,
          }))
        );

        // Set Artist Label Name from profile
        if (profileResponse?.artistProfile?.label?.name) {
          setArtistLabelName(profileResponse.artistProfile.label.name);
        } else {
          setArtistLabelName(null);
        }

      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        toast.error('Failed to load required data (artists, genres, or profile)');
      }
    };

    fetchData();
  }, [router]); // Depend on router

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
        // Clean up previous object URL if exists to prevent memory leaks
        if (previewImage && previewImage.startsWith('blob:')) {
            URL.revokeObjectURL(previewImage);
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCoverClick = () => {
    coverFileInputRef.current?.click();
  };

  const handleAudioInputClick = () => {
    audioFileInputRef.current?.click();
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
      formData.append('type', 'SINGLE'); // Type vẫn đang là SINGLE
      formData.append('releaseDate', trackData.releaseDate);
      formData.append('audioFile', audioFile); // Đã kiểm tra nên audioFile không null

      if (coverFile) {
        formData.append('coverFile', coverFile);
      } else {
        toast('No cover image selected. You can update it later.');
      }

      featuredArtists.forEach((artist) => {
        if (artist.id) {
          formData.append('featuredArtistIds[]', artist.id);
        } else {
          formData.append('featuredArtistNames[]', artist.name);
        }
      });

      selectedGenres.forEach((genreId) => {
        formData.append('genreIds[]', genreId);
      });

      await api.tracks.create(formData, token); // Gọi API tạo track
      toast.success('Track created successfully');
      router.push('/artist/tracks'); // Điều hướng sau khi tạo thành công
    } catch (error) {
      console.error('Error creating track:', error);
      // Cung cấp thông báo lỗi cụ thể hơn nếu có thể
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
        <div className="flex items-center justify-between gap-4 mb-4">
          <Button
            variant="outline"
            size="default"
            onClick={() => router.back()}
            className={cn(theme === 'dark' ? 'border-white/20 hover:bg-white/10' : '')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Upload New Single</h1>
          <div className="w-[88px]"></div> {/* Spacer */}
        </div>

        {/* Main Form Card */}
        <div className={cn(
          'rounded-xl p-6 md:p-8 border',
          theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#181818] border-gray-700/50'
        )}>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column: Cover Art & Audio */}
            <div className="md:col-span-1 space-y-8 flex flex-col items-center md:items-start">
              {/* Cover Image Upload */}
              <div className={cn("w-full space-y-2 p-4 rounded-lg", theme === 'dark' ? 'bg-white/5' : 'bg-gray-50 border')}>
                <UILabel
                  htmlFor="cover-upload-area"
                  className={cn(
                    "self-start text-sm font-medium mb-1",
                    theme === 'light' ? 'text-gray-700' : 'text-white/80'
                  )}
                >
                  Cover Image (Optional)
                </UILabel>
                <div
                  id="cover-upload-area"
                  className={cn(
                    "w-full aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group",
                    theme === "dark" ? "border-gray-600 hover:border-gray-500 bg-black/20" : "border-gray-300 hover:border-gray-400 bg-gray-100"
                  )}
                  onClick={handleCoverClick}
                >
                  {previewImage ? (
                    <img src={previewImage} alt="Track cover preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <Upload className={cn("h-12 w-12 mx-auto mb-3", theme === 'dark' ? 'text-gray-500' : 'text-gray-400')} />
                      <p className={cn("font-medium", theme === 'dark' ? 'text-gray-300' : 'text-gray-600')}>Click to upload cover</p>
                      <p className={cn("text-xs mt-1", theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>PNG, JPG, GIF up to 10MB</p>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-medium">{previewImage ? 'Change Cover' : 'Upload Cover'}</p>
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
                {coverFile && <span className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{coverFile.name}</span>}
              </div>

              {/* Audio File Upload */}
              <div className={cn("w-full space-y-2 p-4 rounded-lg", theme === 'dark' ? 'bg-white/5' : 'bg-gray-50 border')}>
                <UILabel
                  htmlFor="audio-display"
                  className={cn(
                    "block text-sm font-medium",
                    theme === 'light' ? 'text-gray-700' : 'text-white/80'
                  )}
                >
                  Audio File *
                </UILabel>
                {/* Hidden Actual Input */}
                <input
                  ref={audioFileInputRef}
                  type="file"
                  id="audio"
                  name="audio"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
                {/* Custom Audio Upload Button/Display */}
                <div
                  id="audio-display"
                  onClick={handleAudioInputClick}
                  className={cn(
                    "w-full p-6 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors",
                    theme === 'light'
                      ? 'border-gray-300 bg-gray-100 hover:bg-gray-200 text-gray-500'
                      : 'border-gray-600 bg-black/20 hover:bg-black/30 text-gray-400',
                    audioFile ? (theme === 'light' ? 'border-green-500 bg-green-50' : 'border-green-700 bg-green-900/20') : (theme === 'light' ? 'hover:border-blue-400' : 'hover:border-blue-600'),
                    'group'
                  )}
                >
                  {audioFile ? (
                    <div className="flex flex-col items-center text-center">
                      <CheckCircle className={cn("h-8 w-8 mb-2", theme === 'light' ? 'text-green-600' : 'text-green-500')} />
                      <p className={cn("text-sm font-medium break-all", theme === 'light' ? 'text-green-800' : 'text-green-300')}>{audioFile.name}</p>
                      <p className={cn("text-xs mt-1", theme === 'light' ? 'text-gray-600 group-hover:text-blue-700' : 'text-gray-400 group-hover:text-blue-400')}>
                        Click to change audio file
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center">
                      <FileAudio className="h-8 w-8 mb-2" />
                      <p className="text-sm font-medium">Choose Audio File</p>
                      <p className="text-xs mt-1">MP3, WAV, FLAC, etc.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Track Details */}
            <div className="md:col-span-2 space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <UILabel htmlFor="title" className={theme === 'light' ? 'text-gray-700' : 'text-white/80'}>Title *</UILabel>
                <Input
                  type="text"
                  id="title"
                  name="title"
                  value={trackData.title}
                  onChange={handleInputChange}
                  className={cn(
                    'w-full',
                    theme === 'light' ? 'bg-white border-gray-300' : 'bg-white/[0.07] border-white/[0.1]'
                  )}
                  required
                />
              </div>

              {/* Featured Artists */}
              <div className="space-y-1.5">
                <UILabel className={theme === 'dark' ? 'text-white/80' : 'text-gray-700'}>Featured Artists (Optional)</UILabel>
                <ArtistCreatableSelect
                  existingArtists={availableArtists}
                  value={featuredArtists}
                  onChange={setFeaturedArtists}
                  placeholder="Search or add featured artists..."
                />
              </div>

              {/* Genres */}
              <div className="space-y-1.5">
                <UILabel className={theme === 'dark' ? 'text-white/80' : 'text-gray-700'}>Genres *</UILabel>
                <SearchableSelect
                  options={availableGenres}
                  value={selectedGenres}
                  onChange={setSelectedGenres}
                  placeholder="Select genres..."
                  multiple={true}
                  required={true}
                />
              </div>

              {/* Release Date & Time */}
              <div className="space-y-1.5">
                <UILabel htmlFor="releaseDate" className={theme === 'light' ? 'text-gray-700' : 'text-white/80'}>Release Date & Time *</UILabel>
                <Input
                  type="datetime-local"
                  id="releaseDate"
                  name="releaseDate"
                  value={trackData.releaseDate}
                  onChange={handleInputChange}
                  className={cn(
                    'w-full',
                    theme === 'light' ? 'bg-white border-gray-300' : 'bg-white/[0.07] border-white/[0.1]',
                    theme === 'dark' ? 'date-input-dark' : ''
                  )}
                  required
                />
              </div>

              {/* Display Artist's Default Label (Read-only) */}
              {artistLabelName && (
                <div className="space-y-1.5">
                  <UILabel htmlFor="labelDisplay" className={theme === 'dark' ? 'text-white/80' : 'text-gray-700'}>Label</UILabel>
                  <Input
                    type="text"
                    id="labelDisplay"
                    value={artistLabelName}
                    disabled
                    className={cn(
                      'w-full',
                      theme === 'light'
                        ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-white/[0.05] border-white/[0.1] text-white/50 cursor-not-allowed'
                    )}
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isLoading || !audioFile || selectedGenres.length === 0 || !trackData.title || !trackData.releaseDate}
                  className={cn(
                    'px-6 py-2.5',
                    theme === 'light'
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'bg-white text-[#121212] hover:bg-white/90',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isLoading ? 'Creating...' : 'Create Track'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}