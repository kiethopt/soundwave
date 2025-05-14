'use client';

import { useState, useEffect } from 'react';
import { TrackUploadFormProps, ArtistProfile, Genre } from '@/types';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ArtistCreatableSelect } from '@/components/ui/ArtistCreatableSelect';
import { useTheme } from '@/contexts/ThemeContext';
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { CopyrightAlert, CopyrightInfo, normalizeArtistNameForFrontend } from '@/components/ui/CopyrightAlert';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import * as mm from 'music-metadata'; // Import music-metadata
import { X as XIcon } from 'lucide-react'; // Import X icon for remove button

// Define the type for selected artists (can have ID or just name)
interface SelectedArtist {
  id?: string;
  name: string;
}

// Define a more specific type for track details within this form
interface FormTrackDetail {
  title: string;
  artist: string; // Assuming this is artist ID
  featuredArtists: SelectedArtist[];
  trackNumber: number;
  releaseDate: string;
  genres: string[];
  labelId?: string | null; // Added labelId here
}

const TrackUploadForm = ({
  album,
  newTracks,
  trackDetails,
  isUploading,
  onFileChange,
  onSubmit,
  onTrackDetailChange,
  availableArtists = [],
  existingTrackCount,
  availableGenres = [],
  uploaderArtistName,
  onRemoveTrackFile, // New prop for removing a track
}: TrackUploadFormProps & {
  trackDetails: { [key: string]: FormTrackDetail };
  availableArtists?: Array<{ id: string; name: string }>;
  existingTrackCount: number;
  availableGenres?: Array<{ id: string; name: string }>;
  uploaderArtistName: string;
  onRemoveTrackFile?: (fileName: string) => void; // Define the prop type
}) => {
  const { theme } = useTheme();
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [copyrightInfos, setCopyrightInfos] = useState<{ [fileName: string]: CopyrightInfo | null }>({});
  const [isLoadingCopyright, setIsLoadingCopyright] = useState<{ [fileName: string]: boolean }>({});
  const [lastCheckTimestamps, setLastCheckTimestamps] = useState<{ [fileName: string]: number }>({});
  const [isCheckingAllCopyrights, setIsCheckingAllCopyrights] = useState(false);
  const COOLDOWN_PERIOD = 15000; // 15 seconds

  useEffect(() => {
    if (newTracks && newTracks.length > 0 && onTrackDetailChange) {
      newTracks.forEach(async (file) => { // Make the callback async
        const fileName = file.name;
        
        // Explicitly use the local SelectedArtist type for these variables after casting from props
        let currentTitleInDetails = trackDetails[fileName]?.title || '';
        let currentFeaturedArtistsInDetails: SelectedArtist[] = 
          (trackDetails[fileName]?.featuredArtists || []) as SelectedArtist[];

        let titleFromMetadata = '';
        let featuredArtistsFromMetadata: SelectedArtist[] = []; // This is LocalSelectedArtist[]
        
        // --- 1. Attempt Metadata Parsing --- Only if fields are not already fully populated by user.
        if (!currentTitleInDetails || currentFeaturedArtistsInDetails.length === 0) {
          try {
            const buffer = await file.arrayBuffer();
            const metadata = await mm.parseBuffer(Buffer.from(buffer), file.type);

            if (metadata.common.title) {
              titleFromMetadata = metadata.common.title;
            }

            const foundArtists: string[] = [];
            if (metadata.common.artists) {
              foundArtists.push(...metadata.common.artists);
            } else if (metadata.common.artist) {
              foundArtists.push(metadata.common.artist);
            }

            if (foundArtists.length > 0) {
              const normalizedUploaderName = uploaderArtistName ? normalizeArtistNameForFrontend(uploaderArtistName) : '';
              const tempFeatured: SelectedArtist[] = [];
              const addedNames = new Set<string>();

              for (const artistName of foundArtists) {
                const normalizedArtistName = normalizeArtistNameForFrontend(artistName);
                if (normalizedUploaderName && normalizedArtistName === normalizedUploaderName && normalizedArtistName !== '') {
                  continue; // Skip if it's the main uploader
                }
                if (addedNames.has(normalizedArtistName)) continue; // Skip if already added

                const existingArtist = availableArtists.find(
                  (a) => normalizeArtistNameForFrontend(a.name) === normalizedArtistName
                );
                if (existingArtist) {
                  tempFeatured.push({ id: existingArtist.id, name: existingArtist.name });
                } else {
                  tempFeatured.push({ name: artistName.trim() });
                }
                addedNames.add(normalizedArtistName);
              }
              featuredArtistsFromMetadata = tempFeatured;
            }
          } catch (metaError) {
            console.warn(`Could not parse metadata for ${fileName}, will try filename parsing:`, metaError);
          }
        }

        // Update with metadata if found and field is empty
        if (!currentTitleInDetails && titleFromMetadata) {
          onTrackDetailChange(fileName, 'title', titleFromMetadata);
          currentTitleInDetails = titleFromMetadata; // Update for subsequent logic
        }
        if (currentFeaturedArtistsInDetails.length === 0 && featuredArtistsFromMetadata.length > 0) {
          onTrackDetailChange(fileName, 'featuredArtists', featuredArtistsFromMetadata);
          currentFeaturedArtistsInDetails = featuredArtistsFromMetadata; // This line should now be valid
        }

        // --- 2. Fallback to Filename Parsing (if fields are still empty) ---
        if (!currentTitleInDetails || currentFeaturedArtistsInDetails.length === 0) {
          let baseName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
          let extractedTitleFromFile = baseName;
          let extractedFeaturedFromFile: SelectedArtist[] = [];
          const featPatterns = [/\s*\(feat\.\s*([^)]+)\)/i, /\s*\(ft\.\s*([^)]+)\)/i];
          let featuredPartFromFile = '';

          for (const pattern of featPatterns) {
            const match = baseName.match(pattern);
            if (match && match[1]) {
              extractedTitleFromFile = baseName.substring(0, match.index).trim();
              featuredPartFromFile = match[1];
              break;
            }
          }

          if (featuredPartFromFile) {
            extractedFeaturedFromFile = featuredPartFromFile
              .split(/[,&]/)
              .map((name: string) => ({ name: name.trim() }))
              .filter((artist: SelectedArtist) => artist.name);
          }

          const lastDashIndex = extractedTitleFromFile.lastIndexOf(' - ');
          if (lastDashIndex !== -1) {
            extractedTitleFromFile = extractedTitleFromFile.substring(lastDashIndex + 3).trim();
          }
          extractedTitleFromFile = extractedTitleFromFile.trim();

          if (!currentTitleInDetails && extractedTitleFromFile) {
            onTrackDetailChange(fileName, 'title', extractedTitleFromFile);
          }
          if (currentFeaturedArtistsInDetails.length === 0 && extractedFeaturedFromFile.length > 0) {
            onTrackDetailChange(fileName, 'featuredArtists', extractedFeaturedFromFile);
          }
        }
      });
    }
  }, [newTracks, trackDetails, onTrackDetailChange, availableArtists, uploaderArtistName]);

  // Log the received album prop to debug label issue
  console.log('[TrackUploadForm] Received album prop:', album);

  // Get label name from album artist's label, provide default
  const artistLabelName = album?.label?.name || 'No Label Assigned';

  console.log('Received availableGenres prop:', availableGenres);
  const artistOptions = availableArtists
    // .filter((artist) => artist.isVerified && artist.role === 'ARTIST') // Keep filtering if needed, or remove if all passed artists are valid
    .map((artist: { id: string; name: string }) => ({
      id: artist.id,
      name: artist.name,
    }));

  const genreOptions = availableGenres.map((genre) => ({
    id: genre.id,
    name: genre.name,
  }));

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    let isValid = true;

    newTracks.forEach((file) => {
      if (!trackDetails[file.name]?.genres || trackDetails[file.name].genres.length === 0) {
        errors[file.name] = 'This field is required';
        isValid = false;
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(e);
    }
  };

  const handleCheckCopyright = async (file: File) => {
    const fileName = file.name;
    const trackTitle = trackDetails[fileName]?.title;

    if (!trackTitle) {
      toast.error('Please enter a title for this track first.');
      return;
    }

    const now = Date.now();
    const timeSinceLastCheck = now - (lastCheckTimestamps[fileName] || 0);
    if (timeSinceLastCheck < COOLDOWN_PERIOD && lastCheckTimestamps[fileName]) {
      const remainingTime = Math.ceil((COOLDOWN_PERIOD - timeSinceLastCheck) / 1000);
      toast.error(`Please wait ${remainingTime} seconds before checking "${trackTitle}" again.`);
      return;
    }

    setIsLoadingCopyright(prev => ({ ...prev, [fileName]: true }));
    setCopyrightInfos(prev => ({ ...prev, [fileName]: null }));
    setLastCheckTimestamps(prev => ({ ...prev, [fileName]: now }));

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      formData.append('audioFile', file);
      formData.append('title', trackTitle);
      formData.append('releaseDate', album?.releaseDate || new Date().toISOString()); 
      // The backend checkCopyright uses the authenticated user's artist ID by default.
      // Featured artists details from trackDetails
      const featured = trackDetails[fileName]?.featuredArtists || [];
      featured.forEach((artist, index) => {
        if (artist.id) {
          formData.append(`featuredArtistIds[${index}]`, artist.id);
        }
        formData.append(`featuredArtistNames[${index}]`, artist.name);
      });

      const result = await api.tracks.checkCopyright(formData, token);
      
      if (result.copyrightDetails) {
        const details = result.copyrightDetails;
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
          songLink: details.song_link,
          isBlocking: false, // Non-blocking by default for this path
        };
        setCopyrightInfos(prev => ({ ...prev, [fileName]: newCopyrightInfo }));
        toast.success(result.message || `Potential match found for "${trackTitle}" (non-blocking).`);
      } else {
        setCopyrightInfos(prev => ({ ...prev, [fileName]: null })); // Clear if no conflict
        toast.success(result.message || `No copyright issues detected for "${trackTitle}".`);
      }

    } catch (error: any) {
      const backendError = error.responseBody;
      if (error.message?.includes('ECONNRESET') || error.message?.includes('network error') || error.message?.includes('failed to fetch') || error.message?.includes('timeout')) {
        toast.error('Connection timeout. Server might be busy. Please try again.');
      } else if (backendError && backendError.isCopyrightConflict && backendError.copyrightDetails) {
        const details = backendError.copyrightDetails;
        const isLocalConflictCheck = !!details.isLocalFingerprintConflict;

        let finalTitle = 'Unknown Title';
        let finalArtist = 'Unknown Artist';
        let finalAlbum = details.album?.name;
        let finalReleaseDate = details.release_date;
        let finalLabel = details.label;
        let finalSongLink = details.song_link;
        let originalConflictingFile = backendError.conflictingFile || fileName;

        if (isLocalConflictCheck) {
          finalTitle = details.conflictingTrackTitle || 'Conflict Title (Local)';
          finalArtist = details.conflictingArtistName || 'Conflict Artist (Local)';
          finalAlbum = undefined;
          finalReleaseDate = undefined;
          finalLabel = undefined;
          finalSongLink = undefined;
        } else {
          // This is for non-local (e.g., ACRCloud) copyright matches
          finalTitle = details.title || 'Unknown Title';
          if (details.artists && details.artists.length > 0) {
            finalArtist = details.artists.map((a: { name: string }) => a.name).join(', ');
          }
        }

        const newCopyrightInfo: CopyrightInfo = {
          title: finalTitle,
          artist: finalArtist,
          album: finalAlbum,
          releaseDate: finalReleaseDate,
          label: finalLabel,
          songLink: finalSongLink,
          isBlocking: true, 
        };
        setCopyrightInfos(prev => ({ ...prev, [fileName]: newCopyrightInfo }));

        if (isLocalConflictCheck) {
          toast.error(`Local Content Conflict for "${originalConflictingFile}": Audio matches "${finalTitle}" by ${finalArtist}.`);
        } else if (backendError.message?.includes('similarity score')) {
          toast.error(`Copyright Match for "${finalTitle || trackTitle}": Artist name similarity too low with ${finalArtist}.`);
        } else {
          toast.error(`Copyright Match for "${finalTitle || trackTitle}" by ${finalArtist}.`);
        }
      } else {
        console.error(`Full error checking copyright for "${trackTitle}":`, error);
        toast.error(`Error checking copyright for "${trackTitle}". Please try again.`);
      }
       setCopyrightInfos(prev => ({ ...prev, [fileName]: prev[fileName] || { title: trackTitle, artist: 'Error', isBlocking: false } })); // Fallback for UI
    } finally {
      setIsLoadingCopyright(prev => ({ ...prev, [fileName]: false }));
    }
  };

  const handleCheckAllCopyrights = async () => {
    setIsCheckingAllCopyrights(true);
    toast('Starting copyright check for ' + newTracks.length + ' tracks...');

    for (const file of newTracks) {
      if (!trackDetails[file.name]?.title) {
        toast.error(`Skipping copyright check for "${file.name}": Title is missing.`);
        continue;
      }
      try {
        // The individual isLoadingCopyright state within handleCheckCopyright will manage the button text for each track
        await handleCheckCopyright(file);
      } catch (error) {
        // This catch is a safeguard; handleCheckCopyright should manage its own errors and toasts.
        console.error(`Error during batch copyright check for ${file.name}:`, error);
        toast.error(`An unexpected error occurred while checking ${file.name}.`);
      }
    }

    setIsCheckingAllCopyrights(false);
    toast.success("All copyright checks complete.");
  };

  const handleRemoveClick = (fileNameToRemove: string) => {
    // Clear local states for this file first
    setCopyrightInfos(prev => {
      const newState = {...prev};
      delete newState[fileNameToRemove];
      return newState;
    });
    setIsLoadingCopyright(prev => {
      const newState = {...prev};
      delete newState[fileNameToRemove];
      return newState;
    });
    setLastCheckTimestamps(prev => {
      const newState = {...prev};
      delete newState[fileNameToRemove];
      return newState;
    });
    setValidationErrors(prev => {
      const newState = {...prev};
      delete newState[fileNameToRemove];
      return newState;
    });

    // Call the parent's handler to remove the file from the main list
    if (onRemoveTrackFile) {
      onRemoveTrackFile(fileNameToRemove);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div>
        <UILabel
          htmlFor="track-files-input"
          className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
            }`}
        >
          Select Track Files
        </UILabel>
        <Input
          id="track-files-input"
          type="file"
          accept="audio/*"
          multiple
          onChange={onFileChange}
          disabled={isUploading}
          className={cn(
            // Container styles (input element itself)
            'block w-full h-11 rounded-md border', // Set height, border, rounding
            theme === 'light' ? 'border-gray-300 bg-white' : 'border-white/10 bg-transparent',
            'flex items-center', // Use flex to help align button and text vertically

            // File button styles (the part that looks like a button)
            'file:h-full file:cursor-pointer file:border-0 file:rounded-md', // Button takes full height, no border, rounded
            'file:mr-4 file:px-4 file:font-semibold', // Spacing (margin-right) and text style
            theme === 'light'
              ? 'file:bg-gray-100 file:text-gray-800 hover:file:bg-gray-200' // Light theme button colors
              : 'file:bg-white/5 file:text-white/80 hover:file:bg-white/10', // Dark theme button colors

            // Text styles (for the filename display)
            'text-sm',
            theme === 'light' ? 'text-gray-700' : 'text-white/80',

            // Disabled state
            'disabled:opacity-50 disabled:cursor-not-allowed file:disabled:opacity-70'
          )}
        />
      </div>

      {newTracks.length > 0 && (
        <div className="my-4">
          <Button
            type="button"
            onClick={handleCheckAllCopyrights}
            disabled={isUploading || isCheckingAllCopyrights || newTracks.every(f => !trackDetails[f.name]?.title)}
            className={cn(
              'w-full md:w-auto',
              theme === 'light'
                ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                : 'bg-green-900/30 text-green-400 hover:bg-green-900/40 border border-green-700'
            )}
            variant="outline"
          >
            {isCheckingAllCopyrights ? 'Checking All Copyrights...' : 'Check Copyrights for All Tracks'}
          </Button>
        </div>
      )}

      {newTracks.length > 0 && (
        <div className="space-y-4">
          {newTracks.map((file, index) => (
            <div
              key={file.name}
              className={cn(
                 "p-4 md:p-6 rounded-lg space-y-4 border relative", // Added relative for positioning remove button
                 theme === 'light'
                ? 'bg-gray-50 border-gray-200'
                : 'bg-[#181818] border-gray-700/50'
              )}
            >
              {/* File Name Header */}
              <div
                className={`text-sm font-medium mb-2 pb-2 border-b border-dashed ${theme === 'light' ? 'text-gray-900 border-gray-300' : 'text-white/80 border-white/10'
                  }`}
              >
                File: <span className="font-semibold">{file.name}</span>
              </div>

              {/* Remove Button for individual track */}
              {onRemoveTrackFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveClick(file.name)}
                  className={cn(
                    "absolute top-2 right-2 h-7 w-7 p-0 rounded-full",
                    theme === 'light' 
                      ? 'text-gray-400 hover:bg-red-100 hover:text-red-600' 
                      : 'text-gray-500 hover:bg-red-800/50 hover:text-red-400'
                  )}
                  title={`Remove ${file.name}`}
                  disabled={isUploading || isCheckingAllCopyrights || isLoadingCopyright[file.name]}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              )}

              {/* Grid for Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Title input */}
                <div className="space-y-1.5">
                  <UILabel
                     htmlFor={`title-${index}`}
                     className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                      }`}
                  >
                    Title *
                  </UILabel>
                  <Input
                    type="text"
                    id={`title-${index}`}
                    value={trackDetails[file.name]?.title || ''}
                    onChange={(e) =>
                      onTrackDetailChange(file.name, 'title', e.target.value)
                    }
                    required
                    className={cn(
                      'w-full',
                      theme === 'light' ? 'bg-white border-gray-300' : 'bg-white/[0.07] border-white/[0.1]'
                     )}
                    placeholder="Enter track title"
                  />
                </div>

                {/* Track Number input (readonly) */}
                <div className="space-y-1.5">
                  <UILabel
                    htmlFor={`trackNumber-${index}`}
                    className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                      }`}
                  >
                    Track Number
                  </UILabel>
                  <Input
                    type="number"
                    id={`trackNumber-${index}`}
                    value={existingTrackCount + index + 1}
                    readOnly
                    className={cn(
                      'w-full cursor-not-allowed',
                      theme === 'light'
                        ? 'bg-gray-100 border-gray-300 text-gray-500'
                        : 'bg-white/[0.05] border-white/[0.1] text-white/50'
                    )}
                  />
                </div>

                {/* Release Date display (readonly) */}
                 <div className="space-y-1.5">
                  <UILabel
                     htmlFor={`releaseDate-${index}`}
                     className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                      }`}
                  >
                    Release Date
                  </UILabel>
                  <Input
                    type="text"
                    id={`releaseDate-${index}`}
                    value={
                      album?.releaseDate
                        ? new Date(album.releaseDate).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : 'N/A'
                    }
                    readOnly
                    className={cn(
                       'w-full cursor-not-allowed',
                       theme === 'light'
                         ? 'bg-gray-100 border-gray-300 text-gray-500'
                         : 'bg-white/[0.05] border-white/[0.1] text-white/50'
                     )}
                  />
                </div>

                {/* Display Label (Read-only from album) */}
                <div className="space-y-1.5">
                  <UILabel
                    htmlFor={`label-${index}`}
                    className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'}`}
                  >
                    Label (from Album)
                  </UILabel>
                  <Input
                    type="text"
                    id={`label-${index}`}
                    value={album?.label?.name || 'No Label Assigned to Album'}
                    readOnly
                    className={cn(
                     'w-full cursor-not-allowed',
                     theme === 'light'
                       ? 'bg-gray-100 border-gray-300 text-gray-500'
                       : 'bg-white/[0.05] border-white/[0.1] text-white/50'
                    )}
                  />
                </div>

                {/* Featured Artists select (using ArtistCreatableSelect) */}
                <div className="space-y-1.5 md:col-span-2">
                  <UILabel
                    className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                      }`}
                  >
                    Featured Artists (Optional)
                  </UILabel>
                   <ArtistCreatableSelect
                     existingArtists={artistOptions}
                     value={trackDetails[file.name]?.featuredArtists || []}
                     onChange={(value: SelectedArtist[]) =>
                       onTrackDetailChange(file.name, 'featuredArtists', value)
                     }
                     placeholder="Search or add featured artists..."
                   />
                </div>

                {/* Genres select */}
                 <div className="space-y-1.5 md:col-span-2">
                   <UILabel
                    className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'
                      }`}
                  >
                    Genres *
                  </UILabel>
                  {/* Wrap SearchableSelect for error styling */}
                  <div
                    className={validationErrors[file.name] ? 'rounded-lg border border-red-500 p-0.5' : ''}
                  >
                    <SearchableSelect
                      options={genreOptions}
                      value={trackDetails[file.name]?.genres || []}
                      onChange={(value: string[]) =>
                        onTrackDetailChange(file.name, 'genres', value)
                      }
                      placeholder="Select genres"
                      multiple
                   />
                  </div>
                  {/* Display validation error */}
                  {validationErrors[file.name] && (
                    <p className="mt-1 text-xs text-red-500">
                      {validationErrors[file.name]}
                    </p>
                  )}
                </div>
              </div> {/* End Grid for Details */}

              {/* Copyright Check Area - Individual button removed */}
              
              {copyrightInfos[file.name] && (
                <CopyrightAlert copyright={copyrightInfos[file.name]!} theme={theme} />
              )}

            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={isUploading || newTracks.length === 0 || newTracks.some(f => copyrightInfos[f.name]?.isBlocking === true) || newTracks.some(f => !copyrightInfos[f.name]) || isCheckingAllCopyrights}
        className={cn(
           `w-full py-2.5 px-4 rounded-full font-semibold transition-colors text-sm`,
            theme === 'light'
            ? 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300'
            : 'bg-white text-black hover:bg-white/90 disabled:opacity-50',
           'disabled:cursor-not-allowed'
        )}
      >
        {isUploading ? 'Uploading...' : `Upload ${newTracks.length} Track${newTracks.length !== 1 ? 's' : ''}`}
      </button>
    </form>
  );
};

export default TrackUploadForm;