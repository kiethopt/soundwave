import { Track } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { MoreHorizontal, Heart, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Play, Pause } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';
import { MusicAuthDialog } from '@/components/ui/data-table/data-table-modals';

interface AlbumTracksProps {
  tracks: Track[];
  onTrackPlay: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  requiresAuth?: boolean;
}

export function AlbumTracks({
  tracks,
  onTrackPlay,
  currentTrack,
  isPlaying,
  requiresAuth = false,
}: AlbumTracksProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const { dialogOpen, setDialogOpen, handleProtectedAction } = useAuth();

  const handleTrackPlay = (track: Track) => {
    if (requiresAuth) {
      const canProceed = handleProtectedAction();
      if (!canProceed) return;
    }

    onTrackPlay(track);
  };

  return (
    <div>
      {tracks.map((track) => (
        <div key={track.id}>
          {/* Desktop Layout */}
          <div
            className={`hidden md:grid grid-cols-[48px_1.5fr_1fr_1fr_100px_50px] gap-4 px-6 py-4 group ${
              theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/5'
            } cursor-pointer`}
            onClick={() => handleTrackPlay(track)}
          >
            <div
              className={`flex items-center justify-center ${
                theme === 'light' ? 'text-gray-500' : 'text-white/60'
              }`}
            >
              {/* Show play/pause button on hover */}
              <div className="hidden group-hover:block cursor-pointer">
                {currentTrack?.id === track.id && isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </div>

              {/* Show track number when not hovering */}
              <div className="group-hover:hidden cursor-pointer">
                {currentTrack?.id === track.id && isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  track.trackNumber
                )}
              </div>
            </div>

            <div className="flex items-center min-w-0">
              <span
                className={`font-medium truncate ${
                  currentTrack?.id === track.id
                    ? 'text-[#A57865]'
                    : theme === 'light'
                    ? 'text-gray-900'
                    : 'text-white'
                }`}
              >
                {track.title}
              </span>
            </div>

            <div className="flex flex-col justify-center min-w-0">
              <div
                className={`truncate ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  router.push(`/artist/profile/${track.artist.id}`);
                }}
              >
                {track.artist.artistName}
              </div>
              {track.featuredArtists?.length > 0 && (
                <div
                  className={`text-sm truncate ${
                    theme === 'light' ? 'text-gray-500' : 'text-white/60'
                  }`}
                >
                  feat.{' '}
                  {track.featuredArtists
                    .map(({ artistProfile }) => artistProfile.artistName)
                    .join(', ')}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center">
              <span
                className={`text-sm ${
                  theme === 'light' ? 'text-gray-500' : 'text-white/60'
                }`}
              >
                {track.playCount || 0}
              </span>
            </div>

            <div
              className={`flex items-center justify-end ${
                theme === 'light' ? 'text-gray-500' : 'text-white/60'
              }`}
            >
              {Math.floor(track.duration / 60)}:
              {(track.duration % 60).toString().padStart(2, '0')}
            </div>

            <div className="flex items-center justify-center">
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
                    <div className="flex items-center w-4 h-4 mr-2">+</div>
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

          {/* Mobile Layout */}
          <div
            className={`md:hidden p-4 ${
              theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-white/5'
            } cursor-pointer`}
            onClick={() => handleTrackPlay(track)}
          >
            <div className="flex items-center gap-4">
              <span
                className={
                  theme === 'light' ? 'text-gray-500' : 'text-white/60'
                }
              >
                {/* Show play/pause button on hover */}
                <div className="hidden group-hover:block cursor-pointer">
                  {currentTrack?.id === track.id && isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </div>

                {/* Show track number when not hovering */}
                <div className="group-hover:hidden cursor-pointer">
                  {currentTrack?.id === track.id && isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    track.trackNumber
                  )}
                </div>
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className={`font-medium truncate ${
                    currentTrack?.id === track.id
                      ? 'text-[#A57865]'
                      : theme === 'light'
                      ? 'text-gray-900'
                      : 'text-white'
                  }`}
                >
                  {track.title}
                </div>
                <div
                  className={`text-sm truncate ${
                    theme === 'light' ? 'text-gray-500' : 'text-white/60'
                  }`}
                >
                  {track.artist.artistName}
                  {track.featuredArtists?.length > 0 && (
                    <span
                      className={
                        theme === 'light' ? 'text-gray-400' : 'text-white/40'
                      }
                    >
                      {' '}
                      • feat.{' '}
                      {track.featuredArtists
                        .map(({ artistProfile }) => artistProfile.artistName)
                        .join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm ${
                    theme === 'light' ? 'text-gray-500' : 'text-white/60'
                  }`}
                >
                  {Math.floor(track.duration / 60)}:
                  {(track.duration % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
      <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
