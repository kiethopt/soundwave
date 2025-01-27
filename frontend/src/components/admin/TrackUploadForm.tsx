'use client';

import { TrackUploadFormProps } from '@/types';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

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
  const artistOptions = artists
    .filter((artist) => artist.isVerified && artist.role === 'ARTIST')
    .map((artist) => ({
      id: artist.id,
      name: artist.artistName,
    }));

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
          {newTracks.map((file, index) => (
            <div
              key={file.name}
              className="bg-white/5 p-4 rounded-lg space-y-4"
            >
              <div className="text-sm font-medium text-white/80 mb-2">
                File: {file.name}
              </div>
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
                    required
                    className="bg-white/5 text-white rounded-md px-3 py-2 w-full"
                    placeholder="Enter track title"
                  />
                </div>

                {/* Track Number input (readonly) */}
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">
                    Track Number
                  </label>
                  <input
                    type="number"
                    value={existingTrackCount + index + 1}
                    readOnly
                    className="bg-white/5 text-white rounded-md px-3 py-2 w-full cursor-not-allowed"
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
                  required
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
