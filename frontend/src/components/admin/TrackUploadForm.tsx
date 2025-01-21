'use client';

import { Album, ArtistProfile } from '@/types';
import { ChangeEvent, FormEvent } from 'react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

interface TrackUploadFormProps {
  album: Album;
  newTracks: File[];
  trackDetails: {
    [key: string]: {
      title: string;
      trackNumber: number;
      releaseDate: string;
      featuredArtists: string[];
    };
  };
  isUploading: boolean;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent) => void;
  onTrackDetailChange: (fileName: string, field: string, value: any) => void;
  artists?: ArtistProfile[];
}

const TrackUploadForm = ({
  album,
  newTracks,
  trackDetails,
  isUploading,
  onFileChange,
  onSubmit,
  onTrackDetailChange,
  artists = [],
}: TrackUploadFormProps) => {
  const artistOptions = artists.map((artist) => ({
    id: artist.id,
    name: artist.artistName,
  }));
  const formatDurationInput = (value: string) => {
    // Remove non-digit characters
    const digits = value.replace(/\D/g, '');

    // Ensure we have at most 4 digits
    const limitedDigits = digits.slice(0, 4);

    // Split into minutes and seconds
    const minutes = limitedDigits.slice(0, 2).padStart(2, '0');
    const seconds = limitedDigits.slice(2, 4).padStart(2, '0');

    // Validate seconds
    const validSeconds = Math.min(parseInt(seconds), 59)
      .toString()
      .padStart(2, '0');

    return `${minutes}:${validSeconds}`;
  };

  const handleDurationChange = (fileName: string, value: string) => {
    // Allow direct input without formatting while typing
    const digits = value.replace(/\D/g, '');
    const formattedValue =
      digits.length >= 4 ? formatDurationInput(digits) : value;

    if (digits.length >= 4) {
      const [minutes, seconds] = formattedValue.split(':').map(Number);
      const totalSeconds = minutes * 60 + seconds;
      onTrackDetailChange(fileName, 'duration', totalSeconds);
    } else {
      // Store the partial input temporarily
      const partialValue = value.replace(/[^\d:]/g, '');
      onTrackDetailChange(fileName, 'duration', partialValue);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white/60 mb-2">
          Select Track Files
        </label>
        <input
          type="file"
          accept="audio/*"
          multiple
          onChange={onFileChange}
          disabled={isUploading}
          className="block w-full text-sm text-white/60
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-white/10 file:text-white
            hover:file:bg-white/20
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {newTracks.length > 0 && (
        <div className="space-y-4">
          {newTracks.map((file) => (
            <div
              key={file.name}
              className="bg-white/5 p-4 rounded-lg space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                {/* Title input */}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={trackDetails[file.name]?.title || ''}
                    onChange={(e) =>
                      onTrackDetailChange(file.name, 'title', e.target.value)
                    }
                    className="bg-white/5 text-white rounded-md px-3 py-2 w-full"
                  />
                </div>

                {/* Track Number input */}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    Track Number
                  </label>
                  <input
                    type="number"
                    value={trackDetails[file.name]?.trackNumber || 0}
                    onChange={(e) =>
                      onTrackDetailChange(
                        file.name,
                        'trackNumber',
                        parseInt(e.target.value)
                      )
                    }
                    className="bg-white/5 text-white rounded-md px-3 py-2 w-full"
                  />
                </div>
              </div>

              {/* Release Date input */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Release Date
                </label>
                <input
                  type="date"
                  value={trackDetails[file.name]?.releaseDate || ''}
                  onChange={(e) =>
                    onTrackDetailChange(
                      file.name,
                      'releaseDate',
                      e.target.value
                    )
                  }
                  className="bg-white/5 text-white rounded-md px-3 py-2 w-full"
                />
              </div>

              {/* Featured Artists select */}
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">
                  Featured Artists
                </label>
                <SearchableSelect
                  options={artistOptions}
                  value={trackDetails[file.name]?.featuredArtists || []}
                  onChange={(value) =>
                    onTrackDetailChange(file.name, 'featuredArtists', value)
                  }
                  placeholder="Select featured artists"
                  multiple
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={isUploading || newTracks.length === 0}
        className="w-full bg-white text-black rounded-full py-2 px-4 font-medium
          hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? 'Uploading...' : 'Upload Tracks'}
      </button>
    </form>
  );
};

export default TrackUploadForm;
