'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { ArrowLeft, Upload, Music, FileAudio, CheckCircle, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { ArtistCreatableSelect } from '@/components/ui/ArtistCreatableSelect';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ArtistProfile } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label as UILabel } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import * as mm from 'music-metadata';
import { CopyrightAlert, CopyrightInfo, normalizeArtistNameForFrontend } from '@/components/ui/CopyrightAlert';

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
  const { theme } = useTheme();
  const [lastCheckTimestamp, setLastCheckTimestamp] = useState<number>(0);
  const COOLDOWN_PERIOD = 15000;

  // Helper function to get current date and time in YYYY-MM-DDTHH:MM format
  const getCurrentDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - (offset * 60 * 1000));
    return localNow.toISOString().slice(0, 16);
  };

  const [trackData, setTrackData] = useState({
    title: '',
    type: 'SINGLE',
    releaseDate: getCurrentDateTime(),
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
  const [copyrightInfo, setCopyrightInfo] = useState<CopyrightInfo | null>(null);
  const [uploaderArtistName, setUploaderArtistName] = useState<string | null>(null);

  // State for label selection
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // State to store the artist's default label name
  const [artistLabelName, setArtistLabelName] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          toast.error("Authentication required. Please log in.");
          router.push('/login');
          return;
        }

        // Fetch artists, genres, profile, and selectable labels in parallel
        const [artistsResponse, genresResponse, profileResponse, selectableLabelsResponse] = await Promise.all([
          api.artists.getAllArtistsProfile(token, 1, 500),
          api.genres.getAll(token, 1, 1000),
          api.auth.getMe(token),
          api.labels.getSelectableByArtist(token) // Use the new API call
        ]);

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

        // Set available labels for selection
        if (selectableLabelsResponse && selectableLabelsResponse.data) { // Assuming response is { data: Label[] }
          setAvailableLabels(selectableLabelsResponse.data.map((label: Label) => ({ id: label.id, name: label.name })));
        }

        // Set Artist Label Name from profile (could be used as a default for the new selector)
        if (profileResponse?.artistProfile?.label?.id) {
          setSelectedLabel(profileResponse.artistProfile.label.id); // Pre-select artist's own label
          setArtistLabelName(profileResponse.artistProfile.label.name);
        } else {
          setArtistLabelName(null);
        }

        if (profileResponse?.artistProfile?.artistName) {
          setUploaderArtistName(profileResponse.artistProfile.artistName);
        }

      } catch (error) {
        console.error('Failed to fetch initial data:', error);
        toast.error('Failed to load required data (artists, genres, or profile)');
      }
    };

    fetchData();
  }, [router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTrackData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (e.target.name === 'audio') {
        if (e.target.files.length === 0) {
          return;
        }
        const file = e.target.files[0];
        setAudioFile(file);
        setCopyrightInfo(null);
        setFeaturedArtists([]);

        if (file) {
          try {
            const buffer = await file.arrayBuffer();
            const metadata = await mm.parseBuffer(Buffer.from(buffer), file.type);
            console.log('Music Metadata:', metadata);

            // Auto-fill title
            if (metadata.common.title) {
              setTrackData(prev => ({ ...prev, title: metadata.common.title || prev.title }));
            }

            // Auto-fill featured artists
            const foundArtists: string[] = [];
            if (metadata.common.artists) {
              foundArtists.push(...metadata.common.artists);
            } else if (metadata.common.artist) {
              foundArtists.push(metadata.common.artist);
            }
            
            if (foundArtists.length > 0) {
              const newFeatured: SelectedArtist[] = [];
              const currentFeaturedNames = new Set<string>();

              for (const artistName of foundArtists) {
                const normalizedArtistName = normalizeArtistNameForFrontend(artistName);
                const normalizedUploaderName = normalizeArtistNameForFrontend(uploaderArtistName);

                if (normalizedArtistName === normalizedUploaderName && normalizedArtistName !== '') {
                  continue; // Skip if it's the main uploader
                }

                if (currentFeaturedNames.has(normalizedArtistName)) {
                  continue; // Skip if already added
                }

                const existingArtist = availableArtists.find(
                  (a) => a.name.toLowerCase() === normalizedArtistName
                );

                if (existingArtist) {
                  newFeatured.push({ id: existingArtist.id, name: existingArtist.name });
                } else {
                  newFeatured.push({ name: artistName.trim() });
                }
                currentFeaturedNames.add(normalizedArtistName);
              }
              setFeaturedArtists(newFeatured);
            }

          } catch (metaError) {
            console.error('Error parsing audio metadata:', metaError);
            toast.error('Could not read metadata from audio file.');
          }
        }

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

  // Function to check copyright
  const checkCopyright = async () => {
    console.log('[Frontend CheckCopyright] Attempting to check copyright...');
    if (!audioFile) {
      toast.error('Please select an audio file first');
      console.log('[Frontend CheckCopyright] Aborted: No audio file.');
      return;
    }
    if (!trackData.title) {
        toast.error('Please enter a title first');
        console.log('[Frontend CheckCopyright] Aborted: No title.');
        return;
    }
    
    // Check if we're within the cooldown period
    const now = Date.now();
    const timeSinceLastCheck = now - lastCheckTimestamp;
    if (timeSinceLastCheck < COOLDOWN_PERIOD && lastCheckTimestamp !== 0) {
      const remainingTime = Math.ceil((COOLDOWN_PERIOD - timeSinceLastCheck) / 1000);
      toast.error(`Please wait ${remainingTime} seconds before checking again`);
      return;
    }
    
    setCopyrightInfo(null);
    setIsLoading(true);
    setLastCheckTimestamp(now);
    
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');
      
      const formData = new FormData();
      formData.append('audioFile', audioFile);
      formData.append('title', trackData.title);
      formData.append('releaseDate', trackData.releaseDate || getCurrentDateTime());

      // Add featured artists to FormData
      featuredArtists.forEach((artist, index) => {
        if (artist.id) {
          formData.append(`featuredArtistIds[${index}]`, artist.id);
        }
        formData.append(`featuredArtistNames[${index}]`, artist.name);
      });
      
      console.log('[Frontend CheckCopyright] Calling api.tracks.checkCopyright with formData:', {
        audioFileName: audioFile.name,
        title: trackData.title,
        releaseDate: trackData.releaseDate || getCurrentDateTime(),
        featuredArtists: featuredArtists, // Log the featured artists being sent
      });

      // Call the NEW check-copyright endpoint
      const result = await api.tracks.checkCopyright(formData, token);
      setIsLoading(false);

      if (result.copyrightDetails) {
          const details = result.copyrightDetails;
          console.log('[Frontend CheckCopyright] Received copyrightDetails from backend:', JSON.stringify(details, null, 2));
          console.log('[Frontend CheckCopyright] External Metadata:', JSON.stringify(details.external_metadata, null, 2));

          // Extract artist name(s) correctly
          let artistString = 'Unknown Artist';
          if (details.artists && details.artists.length > 0) {
            artistString = details.artists.map((a: { name: string }) => a.name).join(', ');
          }

          const newCopyrightInfo: CopyrightInfo = {
            title: details.title || 'Unknown Title',
            artist: artistString,
            album: details.album?.name,
            releaseDate: details.release_date,
            label: details.label,
            // songLink: details.song_link, // Commented out as specific links are preferred
            isBlocking: false, // Non-blocking scenario
            // NEW: Extract Spotify and YouTube links for CopyrightInfo
            // Ensure your CopyrightInfo type in CopyrightAlert.tsx supports these fields.
            spotifyLink: details.external_metadata?.spotify?.track?.href,
            youtubeLink: details.external_metadata?.youtube?.vid
                           ? `https://www.youtube.com/watch?v=${details.external_metadata.youtube.vid}`
                           : undefined,
          };
          setCopyrightInfo(newCopyrightInfo);
          toast.success(result.message || 'Potential match found (non-blocking)');

      } else {
          toast.success(result.message || 'No copyright issues detected.');
      }

    } catch (error: any) {
      setIsLoading(false);
      const backendError = error.responseBody;

      if (error.message && (
        error.message.includes('ECONNRESET') || 
        error.message.includes('network error') || 
        error.message.includes('failed to fetch') ||
        error.message.includes('timeout')
      )) {
        toast.error('Connection timeout. The server may be busy, please try again in a few moments.');
        return;
      }

      if (backendError && backendError.isCopyrightConflict && backendError.copyrightDetails) {
          // Blocking copyright conflict
          const details = backendError.copyrightDetails;
          console.log('[Frontend CheckCopyright] Received blocking copyrightDetails from backend (error path):', JSON.stringify(details, null, 2));
          console.log('[Frontend CheckCopyright] External Metadata (error path):', JSON.stringify(details.external_metadata, null, 2));

          // Extract artist name(s) correctly
          let artistString = 'Unknown Artist';
          if (details.artists && details.artists.length > 0) {
            artistString = details.artists.map((a: { name: string }) => a.name).join(', ');
          }

          const newCopyrightInfo: CopyrightInfo = {
            title: details.title || 'Unknown Title',
            artist: artistString,
            album: details.album?.name,
            releaseDate: details.release_date,
            label: details.label,
            // songLink: details.song_link, // Commented out as specific links are preferred
            isBlocking: true,
            // NEW: Extract Spotify and YouTube links for CopyrightInfo
            // Ensure your CopyrightInfo type in CopyrightAlert.tsx supports these fields.
            spotifyLink: details.external_metadata?.spotify?.track?.href,
            youtubeLink: details.external_metadata?.youtube?.vid
                           ? `https://www.youtube.com/watch?v=${details.external_metadata.youtube.vid}`
                           : undefined,
          };
          setCopyrightInfo(newCopyrightInfo);
          if (backendError.message && backendError.message.includes('similarity score')) {
            toast.error('Copyright Match: Artist name similarity too low. See details below.');
          } else {
            toast.error('Copyright Match: Track matches existing content. See details below.');
          }
      } else {
          console.error('Full error checking copyright:', error);
          toast.error('Error checking copyright. Please try again.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Frontend handleSubmit] Attempting to submit track...');

    if (!audioFile) {
      toast.error('Please select an audio file');
      console.log('[Frontend handleSubmit] Aborted: No audio file.');
      return;
    }

    if (selectedGenres.length === 0) {
      toast.error('Please select at least one genre');
      console.log('[Frontend handleSubmit] Aborted: No genres selected.');
      return;
    }

    if (!copyrightInfo) {
      toast.error('Please perform the copyright check before submitting.');
      console.log('[Frontend handleSubmit] Aborted: Copyright check not performed (copyrightInfo is null).');
      return;
    }
    if (copyrightInfo.isBlocking) {
        toast.error('Cannot submit due to a blocking copyright conflict. Please use a different audio file.');
        console.log('[Frontend handleSubmit] Aborted: Copyright conflict is blocking.');
        return;
    }

    setIsLoading(true);
    console.log('[Frontend handleSubmit] Proceeding with track creation...');

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      // Create FormData for the actual submission
      const formData = new FormData();
      formData.append('title', trackData.title);
      formData.append('type', 'SINGLE');
      formData.append('releaseDate', trackData.releaseDate);
      formData.append('audioFile', audioFile);
      if (coverFile) formData.append('coverFile', coverFile);
      featuredArtists.forEach((artist) => {
        if (artist.id) formData.append('featuredArtistIds[]', artist.id);
        else formData.append('featuredArtistNames[]', artist.name);
      });
      selectedGenres.forEach((genreId) => formData.append('genreIds[]', genreId));
      if (selectedLabel) {
        formData.append('labelId', selectedLabel);
      }

      await api.tracks.create(formData, token);
      toast.success('Track created successfully');
      router.push('/artist/tracks');

    } catch (error: any) {
      setIsLoading(false);
      const backendError = error.responseBody;
      let displayMessage = error.message || 'Failed to create track';

      if (backendError && backendError.isCopyrightConflict && backendError.copyrightDetails) {
        const details = backendError.copyrightDetails;
        const newCopyrightInfo: CopyrightInfo = {
          title: details.title || 'Unknown Title',
          artist: details.artist || 'Unknown Artist',
          album: details.album,
          releaseDate: details.release_date,
          label: details.label,
          // songLink: details.song_link, // Commented out as specific links are preferred
          isBlocking: true,
          // NEW: Extract Spotify and YouTube links for CopyrightInfo
          // Ensure your CopyrightInfo type in CopyrightAlert.tsx supports these fields.
          spotifyLink: details.external_metadata?.spotify?.track?.href,
          youtubeLink: details.external_metadata?.youtube?.vid
                         ? `https://www.youtube.com/watch?v=${details.external_metadata.youtube.vid}`
                         : undefined,
        };
        setCopyrightInfo(newCopyrightInfo);
        displayMessage = backendError.message || 'Copyright match detected, upload failed.';
      } else if (error.statusCode === 409 && error.message?.includes('already exists')) {
         displayMessage = 'A track with this title already exists for you.';
      }
      
      toast.error(displayMessage);
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
                
                {/* Check Copyright Button */}
                {audioFile && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      onClick={checkCopyright}
                      disabled={isLoading || !audioFile || !trackData.title}
                      className={cn(
                        'w-full',
                        theme === 'light'
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                          : 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/30 border border-blue-800'
                      )}
                      variant="outline"
                    >
                      {isLoading ? 'Checking...' : 'Check for Copyright'}
                    </Button>
                    {!trackData.title && (
                      <p className={cn("text-xs mt-1", theme === 'light' ? 'text-gray-500' : 'text-gray-400')}>
                        Please enter a title before checking for copyright
                      </p>
                    )}
                  </div>
                )}
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

              {/* Display Artist's Default Label (Read-only) - TO BE REPLACED */}
              {/* {artistLabelName && (
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
              )} */}

              {/* New Label Selector */}
              <div className="space-y-1.5">
                <UILabel className={theme === 'dark' ? 'text-white/80' : 'text-gray-700'}>Label (Optional)</UILabel>
                <SearchableSelect
                  options={availableLabels.map(l => ({ id: l.id, name: l.name }))}
                  value={selectedLabel ? [selectedLabel] : []}
                  onChange={(selectedIds: string[]) => {
                    setSelectedLabel(selectedIds.length > 0 ? selectedIds[0] : null);
                  }}
                  placeholder="Select a label..."
                  multiple={false}
                />
              </div>

              {/* ADD Copyright Alert here */}
              {copyrightInfo && (
                <div className="mt-4 md:mt-0">
                  <CopyrightAlert copyright={copyrightInfo} theme={theme} />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={isLoading || !audioFile || selectedGenres.length === 0 || !trackData.title || !trackData.releaseDate || (copyrightInfo !== null && copyrightInfo.isBlocking)}
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