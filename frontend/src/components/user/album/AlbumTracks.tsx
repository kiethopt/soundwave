import { Track } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { MoreHorizontal, Heart, Share2, ListMusic } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Play, Pause, AddSimple } from '@/components/ui/Icons';
import { useAuth } from '@/hooks/useAuth';
import { MusicAuthDialog } from '@/components/ui/data-table/data-table-modals';
import { toast } from 'react-hot-toast';
import { api } from '@/utils/api';
import { useTrack } from '@/contexts/TrackContext';

interface AlbumTracksProps {
  tracks: Track[];
  onTrackPlay: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  requiresAuth?: boolean;
  playlists: { id: string; name: string; coverUrl?: string }[];
}

export function AlbumTracks({
  tracks,
  onTrackPlay,
  currentTrack,
  isPlaying,
  requiresAuth = false,
  playlists,
}: AlbumTracksProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const { dialogOpen, setDialogOpen, handleProtectedAction } = useAuth();
  const { addToQueue } = useTrack();

  const handleTrackPlay = (track: Track) => {
    if (requiresAuth) {
      const canProceed = handleProtectedAction();
      if (!canProceed) return;
    }

    onTrackPlay(track);
  };

  const handleAddToFavorites = async (trackId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        router.push('/login');
        return;
      }

      await api.tracks.like(trackId, token);
      toast.success('Added to Favorites');
      
      // Emit event to update playlists
      window.dispatchEvent(new CustomEvent('favorites-changed'));
    } catch (error: any) {
      console.error('Error adding to favorites:', error);
      toast.error(error.message || 'Cannot add to favorites');
    }
  };

  const handleAddToQueue = (track: Track) => {
    addToQueue(track);
    toast.success('Added to queue');
  };

  const handleAddToPlaylist = async (playlistId: string, trackId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        router.push('/login');
        return;
      }

      await api.playlists.addTrack(playlistId, trackId, token);
      toast.success('Added to playlist');
    } catch (error: any) {
      console.error('Error adding to playlist:', error);
      toast.error(error.message || 'Cannot add to playlist');
    }
  };

  return (
    <div>
      {tracks.map((track, index) => (
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
                  <span className="font-medium">{index + 1}</span>
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
                className={`truncate cursor-pointer hover:underline underline-offset-2 ${
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
                    .map(({ artistProfile }, index) => (
                      <span key={artistProfile.id}>
                        {index > 0 && ', '}
                        <span 
                          className="cursor-pointer hover:underline underline-offset-2"
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/artist/profile/${artistProfile.id}`);
                          }}
                        >
                          {artistProfile.artistName}
                        </span>
                      </span>
                    ))}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToQueue(track);
                    }}
                  >
                    <ListMusic className="w-4 h-4 mr-2" />
                    Add to Queue
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <AddSimple className="w-4 h-4 mr-2" />
                      Add to Playlist
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="w-48">
                        {playlists.length === 0 ? (
                          <DropdownMenuItem disabled>
                            No playlists available
                          </DropdownMenuItem>
                        ) : (
                          playlists.map((playlist) => (
                            <DropdownMenuItem
                              key={playlist.id}
                              onClick={() =>
                                handleAddToPlaylist(playlist.id, track.id)
                              }
                            >
                              <div className="flex items-center gap-2 w-full">
                                <div className="w-6 h-6 relative flex-shrink-0">
                                  {playlist.coverUrl ? (
                                    <img
                                      src={playlist.coverUrl}
                                      alt={playlist.name}
                                      className="w-full h-full object-cover rounded"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-white/10 rounded flex items-center justify-center">
                                      <svg
                                        className="w-4 h-4 text-white/70"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <span className="truncate">{playlist.name}</span>
                              </div>
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToFavorites(track.id);
                    }}
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
                    index + 1
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
                  <span
                    onClick={(event) => {
                      event.stopPropagation();
                      router.push(`/artist/profile/${track.artist.id}`);
                    }}
                    className="cursor-pointer hover:underline underline-offset-2"
                  >
                    {track.artist.artistName}
                  </span>

                  {track.featuredArtists?.length > 0 && (
                  <span
                    className={
                    theme === 'light' ? 'text-gray-400' : 'text-white/40'
                    }
                  >
                    {' '}
                    • feat.{' '}
                    {track.featuredArtists
                    .map(({ artistProfile }, index) => (
                      <span key={artistProfile.id}>
                      {index > 0 && ', '}
                        <span 
                          className="cursor-pointer hover:underline underline-offset-2"
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/artist/profile/${artistProfile.id}`);
                          }}
                        >
                          {artistProfile.artistName}
                        </span>
                      </span>
                    ))}
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
