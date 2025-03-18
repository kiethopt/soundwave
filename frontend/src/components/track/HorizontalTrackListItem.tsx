import React from 'react';
import { Play, Pause, AddSimple} from '@/components/ui/Icons';
import { Heart, MoreHorizontal, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Track } from '@/types';

interface TrackListItemProps {
  track: Track
  index: number;
  currentTrack: {
    id: string;
  } | null;
  isPlaying: boolean;
  playCount: boolean;
  albumTitle: boolean;
  queueType: string;
  theme: string;
  onTrackClick: () => void;
}

const HorizontalTrackListItem: React.FC<TrackListItemProps> = ({
  track,
  index,
  currentTrack,
  isPlaying,
  playCount,
  albumTitle,
  queueType,
  theme,
  onTrackClick,
}) => {
  return (
    <div
      className={`grid grid-cols-[32px_48px_auto_auto] sm:grid-cols-[32px_48px_2fr_3fr_auto] gap-2 md:gap-4 py-2 md:px-2 group cursor-pointer rounded-lg ${
        theme === 'light'
          ? 'hover:bg-gray-50'
          : 'hover:bg-white/5'
      }`}
      onClick={onTrackClick}
    >
      {/* Track Number or Play/Pause Button */}
      <div
        className={`flex items-center justify-center ${
          theme === 'light' ? 'text-gray-500' : 'text-white/60'
        }`}
      >
        {/* Show play/pause button on hover */}
        <div className="hidden group-hover:block cursor-pointer">
          {currentTrack?.id === track.id && isPlaying && queueType === 'track' ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </div>

        {/* Show track number or pause button when not hovering */}
        <div className="group-hover:hidden cursor-pointer">
          {currentTrack?.id === track.id && isPlaying && queueType === 'track' ? (
            <Pause className="w-5 h-5" />
          ) : (
            index + 1
          )}
        </div>
      </div>

      {/* Track Cover */}
      <div className="flex items-center justify-center">
        <img
          src={track.coverUrl}
          alt={track.title}
          className="w-12 h-12 rounded-md"
        />
      </div>

      {/* Track Title and Play Count */}
      <div className="flex flex-col md:flex-row justify-center md:justify-between items-center min-w-0 w-full">
        {/* Track Title */}
        <span
          className={`font-medium text-black/60 truncate w-full md:w-auto dark:text-white ${
            currentTrack?.id === track.id && queueType === 'track'
              ? 'text-[#A57865]'
              : 'text-white'
          }`}
        >
          {track.title}
        </span>

        {/* Play Count */}
        {playCount && (
          <div
            className={`truncate text-sm md:text-base w-full md:w-auto text-start md:text-center justify-center ${
              theme === 'light' ? 'text-gray-500' : 'text-white/60'
            }`}
          >
            {new Intl.NumberFormat('en-US').format(track.playCount)}
          </div>
        )}
      </div>

      {/* Track Album */}
      {albumTitle && (
        <div
          className={`hidden md:flex items-center justify-center text-center ${
            theme === 'light' ? 'text-gray-500' : 'text-white/60'
          }`}
        >
          {track.album ? (
            <div className="flex items-center gap-1 truncate">
              <span className="truncate">{track.album.title}</span>
            </div>
          ) : (
            <span>-</span>
          )}
        </div>
      )}

      {/* Track Duration & option */}
      <div className="flex items-center justify-end gap-2 md:gap-8">
        {/* Track Duration */}
        <div
          className={`flex items-center justify-center font-medium text-sm ${
            theme === 'light' ? 'text-gray-500' : 'text-white/60'
          }`}
        >
          {Math.floor(track.duration / 60)}:
          {(track.duration % 60).toString().padStart(2, '0')}
        </div>

        {/* Track Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 opacity-60 hover:opacity-100 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <AddSimple className="w-4 h-4 mr-2" />
              Add to Playlist
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <Heart className="w-4 h-4 mr-2" />
              Add to Favorites
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default HorizontalTrackListItem;