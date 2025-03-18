'use client';

import { TrackUploadFormProps } from '@/types';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useTheme } from '@/contexts/ThemeContext';

const TrackUploadForm = ({
  album,
  newTracks,
  trackDetails,
  isUploading,
  onFileChange,
  onSubmit,
  onTrackDetailChange,
  artists = [],
  existingTrackCount,
}: TrackUploadFormProps & { existingTrackCount: number }) => {
  const { theme } = useTheme();
  const artistOptions = artists
    .filter((artist) => artist.isVerified && artist.role === 'ARTIST')
    .map((artist) => ({
      id: artist.id,
      name: artist.artistName,
    }));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label
          className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-white/60'
            }`}
        >
          Select Track Files
        </label>
        <input
          type="file"
          accept="audio/*"
          multiple
          onChange={onFileChange}
          disabled={isUploading}
          className={`block w-full text-sm
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              disabled:opacity-50 disabled:cursor-not-allowed
              ${theme === 'light'
              ? 'text-gray-600 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200'
              : 'text-white/60 file:bg-white/10 file:text-white hover:file:bg-white/20'
            }`}
        />
      </div>

      {newTracks.length > 0 && (
        <div className="space-y-4">
          {newTracks.map((file, index) => (
            <div
              key={file.name}
              className={`p-4 rounded-lg space-y-4 ${theme === 'light'
                ? 'bg-gray-50 border border-gray-200'
                : 'bg-white/5'
                }`}
            >
              <div
                className={`text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-900' : 'text-white/80'
                  }`}
              >
                File: {file.name}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Title input */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-white/60'
                      }`}
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    value={trackDetails[file.name]?.title || ''}
                    onChange={(e) =>
                      onTrackDetailChange(file.name, 'title', e.target.value)
                    }
                    required
                    className={`rounded-md px-3 py-2 w-full ${theme === 'light'
                      ? 'bg-white border border-gray-300 text-gray-900 focus:ring-blue-500/20'
                      : 'bg-white/5 text-white'
                      }`}
                    placeholder="Enter track title"
                  />
                </div>

                {/* Track Number input (readonly) */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-white/60'
                      }`}
                  >
                    Track Number
                  </label>
                  <input
                    type="number"
                    value={existingTrackCount + index + 1}
                    readOnly
                    className={`rounded-md px-3 py-2 w-full cursor-not-allowed ${theme === 'light'
                      ? 'bg-gray-100 text-gray-500 border border-gray-300'
                      : 'bg-white/5 text-white'
                      }`}
                  />
                </div>
              </div>

              {/* Release Date display (readonly) with VN format */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-white/60'
                    }`}
                >
                  Release Date
                </label>
                <input
                  type="text"
                  value={
                    album?.releaseDate
                      ? new Date(album.releaseDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                      : 'N/A'
                  }
                  className={`rounded-md px-3 py-2 w-full bg-gray-100/50 cursor-not-allowed ${theme === 'light'
                    ? 'border border-gray-300 text-gray-700'
                    : 'border-white/10 text-white/60 bg-white/5'
                    }`}
                  disabled
                />
              </div>

              {/* Featured Artists select */}
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-white/60'
                    }`}
                >
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
        className={`w-full py-2 px-4 rounded-full font-medium transition-colors
            ${theme === 'light'
            ? 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300'
            : 'bg-white text-black hover:bg-white/90 disabled:opacity-50'
          } disabled:cursor-not-allowed`}
      >
        {isUploading ? 'Uploading...' : 'Upload Tracks'}
      </button>
    </form>
  );
};

export default TrackUploadForm;