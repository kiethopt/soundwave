'use client';

import { Track } from '@/types';

interface TrackListProps {
  tracks: Track[];
  albumId: string;
  albumCoverUrl?: string;
}

const TrackList = ({ tracks, albumId, albumCoverUrl }: TrackListProps) => {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-black/20 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <div className="grid grid-cols-[16px_4fr_2fr_minmax(120px,1fr)] gap-4 text-sm text-white/60">
          <div className="text-center">#</div>
          <div>Title</div>
          <div>Artist</div>
          <div className="text-left">Duration</div>
        </div>
      </div>
      <div className="divide-y divide-white/10">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="grid grid-cols-[16px_4fr_2fr_minmax(120px,1fr)] gap-4 items-center px-6 py-4 hover:bg-white/5 transition-colors"
          >
            <div className="text-center">{track.trackNumber}</div>
            <div className="flex items-center gap-3">
              {track.coverUrl || albumCoverUrl ? (
                <img
                  src={track.coverUrl || albumCoverUrl}
                  alt={track.title}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <div className="w-10 h-10 bg-white/10 rounded"></div>
              )}
              <span>{track.title}</span>
            </div>
            <div>{track.artist.artistName}</div>
            <div className="text-left">{formatDuration(track.duration)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackList;
