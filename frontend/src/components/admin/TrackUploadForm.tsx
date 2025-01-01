'use client';

import { Album } from '@/types';

export interface TrackDetails {
  title: string;
  artist: string;
  featuredArtists: string;
  duration: number;
  trackNumber: number;
  releaseDate: string;
  audioMessageId?: string;
}

interface TrackUploadFormProps {
  album: Album | null;
  newTracks: File[];
  trackDetails: { [key: string]: TrackDetails };
  isUploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onTrackDetailChange: (
    fileName: string,
    field: keyof TrackDetails,
    value: string | number
  ) => void;
}

export default function TrackUploadForm({
  album,
  newTracks,
  trackDetails,
  isUploading,
  onFileChange,
  onSubmit,
  onTrackDetailChange,
}: TrackUploadFormProps) {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const parseDuration = (timeString: string): number => {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return (minutes || 0) * 60 + (seconds || 0);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="file"
          multiple
          accept="audio/*"
          onChange={onFileChange}
          className="flex-1 p-2 bg-white/5 rounded"
        />
        {newTracks.length > 0 && (
          <button
            type="submit"
            disabled={isUploading}
            className="px-4 py-2 bg-white text-black rounded hover:bg-white/90 disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Upload Tracks'}
          </button>
        )}
      </div>

      {newTracks.length > 0 && (
        <div className="space-y-4 mt-4">
          <h2 className="text-xl font-semibold">Track Details</h2>
          {newTracks.map((file) => (
            <div key={file.name} className="p-4 bg-white/5 rounded space-y-2">
              <p className="font-medium">{file.name}</p>
              <div className="grid gap-2">
                <input
                  type="text"
                  placeholder="Title"
                  value={trackDetails[file.name]?.title || ''}
                  onChange={(e) =>
                    onTrackDetailChange(file.name, 'title', e.target.value)
                  }
                  className="w-full px-3 py-2 bg-white/5 rounded border border-white/10"
                  lang="vi"
                />
                <input
                  type="text"
                  placeholder="Artist"
                  value={trackDetails[file.name]?.artist || album?.artist || ''}
                  onChange={(e) =>
                    onTrackDetailChange(file.name, 'artist', e.target.value)
                  }
                  className="w-full px-3 py-2 bg-white/5 rounded border border-white/10"
                  lang="vi"
                />
                <input
                  type="text"
                  placeholder="Featured Artists (optional)"
                  value={trackDetails[file.name]?.featuredArtists || ''}
                  onChange={(e) =>
                    onTrackDetailChange(
                      file.name,
                      'featuredArtists',
                      e.target.value
                    )
                  }
                  className="w-full px-3 py-2 bg-white/5 rounded border border-white/10"
                  lang="vi"
                />
                <input
                  type="text"
                  placeholder="Duration (mm:ss)"
                  pattern="[0-9]+:[0-5][0-9]"
                  value={
                    trackDetails[file.name]?.duration
                      ? formatDuration(trackDetails[file.name].duration)
                      : '0:00'
                  }
                  onChange={(e) => {
                    const durationInSeconds = parseDuration(e.target.value);
                    onTrackDetailChange(
                      file.name,
                      'duration',
                      durationInSeconds
                    );
                  }}
                  className="w-full px-3 py-2 bg-white/5 rounded border border-white/10"
                />
                <input
                  type="number"
                  placeholder="Track Number"
                  value={trackDetails[file.name]?.trackNumber || ''}
                  onChange={(e) =>
                    onTrackDetailChange(
                      file.name,
                      'trackNumber',
                      parseInt(e.target.value, 10)
                    )
                  }
                  min={1}
                  className="w-full px-3 py-2 bg-white/5 rounded border border-white/10"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}
