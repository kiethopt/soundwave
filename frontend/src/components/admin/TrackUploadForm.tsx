'use client';

import { useState } from 'react';
import { TrackUploadFormProps, ArtistProfile } from '@/types';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ArtistCreatableSelect } from '@/components/ui/ArtistCreatableSelect';
import { useTheme } from '@/contexts/ThemeContext';
import { Genre } from '@/types';
import { Input } from "@/components/ui/input";
import { Label as UILabel } from "@/components/ui/label";
import { cn } from '@/lib/utils';

// Define the type for selected artists (can have ID or just name)
interface SelectedArtist {
  id?: string;
  name: string;
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
}: TrackUploadFormProps & {
  existingTrackCount: number;
  availableArtists?: Array<{ id: string; name: string }>;
}) => {
  const { theme } = useTheme();
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

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
        <div className="space-y-4">
          {newTracks.map((file, index) => (
            <div
              key={file.name}
              className={cn(
                 "p-4 md:p-6 rounded-lg space-y-4 border",
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

                {/* Display Label (Read-only) */}
                <div className="space-y-1.5">
                   <UILabel
                    htmlFor={`label-${index}`}
                    className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-white/80'}`}
                   >
                     Label
                   </UILabel>
                   <Input
                     type="text"
                     id={`label-${index}`}
                     value={artistLabelName}
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
                      onChange={(value) =>
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
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={isUploading || newTracks.length === 0}
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