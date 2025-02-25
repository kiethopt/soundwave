'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { ArrowLeft, Calendar, Music, MoreVertical, Play, Pause, AddSimple } from '@/components/ui/Icons';
import { useDominantColor } from '@/hooks/useDominantColor';
import { useTheme } from '@/contexts/ThemeContext';
import { Album, Track } from '@/types';
import { useTrack } from '@/contexts/TrackContext';
import { Heart, MoreHorizontal, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AlbumDetailPage() {
  const { id: albumId } = useParams();
  const router = useRouter();
  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { dominantColor } = useDominantColor(album?.coverUrl);
  const { theme } = useTheme();
  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    queueType,
    setQueueType,
    trackQueue,
  } = useTrack();

  const fetchAlbumDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('userToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const data = await api.albums.getById(albumId as string, token);
      setAlbum(data);
      console.log('data', data); 
    } catch (err) {
      console.error('Error fetching album:', err);
      setError(err instanceof Error ? err.message : 'Failed to load album');
    } finally {
      setIsLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    if (albumId) {
      fetchAlbumDetails();
    }
  }, [albumId, fetchAlbumDetails]);

  const handleTrackPlay = (track: Track) => {
    if (currentTrack?.id === track.id && isPlaying && queueType === 'album') {
      pauseTrack();
    } else {
      playTrack(track);
      setQueueType('album');
      if (album) {
        trackQueue(album.tracks);
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-500/10 text-red-500 rounded">
        Error: {error}
      </div>
    );
  }

  // Not found state
  if (!album) {
    return <div>Album not found</div>;
  }

  return (
    <div
      className="rounded-lg"
      style={{
        background: dominantColor
          ? `linear-gradient(180deg, 
            ${dominantColor} 0%, 
            ${dominantColor}99 15%,
            ${dominantColor}40 30%,
            ${theme === 'light' ? '#ffffff' : '#121212'} 100%)`
          : theme === 'light'
          ? 'linear-gradient(180deg, #f3f4f6 0%, #ffffff 100%)'
          : 'linear-gradient(180deg, #2c2c2c 0%, #121212 100%)',
      }}
    >
      <div className="max-w-8xl mx-auto px-4 md:px-6 py-6 mb-16 md:mb-0">
        {/* Header with Back button */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              theme === 'light'
                ? 'bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 shadow-sm hover:shadow'
                : 'bg-black/20 hover:bg-black/30 text-white/80 hover:text-white'
            }`}
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span>Back</span>
          </button>
        </div>

        {/* Main Container */}
        <div className="flex flex-col items-center md:items-start md:flex-row gap-8">
          {/* Album Cover */}
          {album.coverUrl && (
            <div className="w-[280px] md:w-[220px] flex-shrink-0">
              <img
                src={album.coverUrl}
                alt={album.title}
                className="w-full aspect-square object-cover rounded-xl shadow-2xl"
              />
            </div>
          )}

          {/* Album Info */}
          <div className="w-full flex flex-col gap-4">
            <div className="text-center md:text-left">
              <h1
                className={`text-3xl md:text-4xl font-bold mb-2 ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}
              >
                {album.title}
              </h1>

              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <span
                  className={`cursor-pointer hover:underline underline-offset-4 ${
                    theme === 'light' ? 'text-gray-900' : 'text-white/90'
                  }`}
                  onClick={() => router.push(`/artist/profile/${album.artist.id}`)}
                >
                  {album.artist.artistName}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-base">
                <div
                  className={`flex items-center gap-2 ${
                    theme === 'light' ? 'text-gray-600' : 'text-white/60'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span>
                    {new Date(album.releaseDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    theme === 'light' ? 'text-gray-600' : 'text-white/60'
                  }`}
                >
                  <Music className="w-5 h-5" />
                  <span>{album.totalTracks || 0} tracks</span>
                </div>
              </div>

              {album.genres?.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-center md:justify-start mt-4">
                  {album.genres.map(({ genre }) => (
                    <span
                      key={genre.id}
                      className={`px-3 py-1 rounded-full text-sm ${
                        theme === 'light'
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Track Options */}
              <div className='mt-4'>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-2 opacity-60 hover:opacity-100 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <AddSimple className="w-4 h-4 mr-2" />
                      Add to Library
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
          </div>
        </div>

        {/* Track List */}
        {album.tracks?.length > 0 && (
          <div className="mt-6 ">
            <div
              className={`w-full rounded-xl overflow-hidden border backdrop-blur-sm ${
                theme === 'light'
                  ? 'bg-white/80 border-gray-200'
                  : 'bg-black/20 border-white/10'
              }`}
            >
              {/* Header - Desktop only */}
              <div
                className={`hidden md:block px-6 py-4 border-b ${
                  theme === 'light' ? 'border-gray-200' : 'border-white/10'
                }`}
              >
                <div
                  className={`grid grid-cols-[48px_1.5fr_1fr_1fr_100px_50px] gap-4 text-sm ${
                    theme === 'light' ? 'text-gray-500' : 'text-white/60'
                  }`}
                >
                  <div className="text-center">#</div>
                  <div>Title</div>
                  <div>Artists</div>
                  <div className="text-center">Play Count</div>
                  <div className="text-right">Duration</div>
                  <div></div>
                </div>
              </div>

              <div
                className={`divide-y ${
                  theme === 'light' ? 'divide-gray-200' : 'divide-white/10'
                }`}
              >
                {album.tracks.map((track) => (
                  <div key={track.id}>
                    {/* Desktop Layout */}
                    <div
                      className={`hidden md:grid grid-cols-[48px_1.5fr_1fr_1fr_100px_50px] gap-4 px-6 py-4 group ${
                        theme === 'light'
                          ? 'hover:bg-gray-50'
                          : 'hover:bg-white/5'
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
                              theme === 'light'
                                ? 'text-gray-500'
                                : 'text-white/60'
                            }`}
                          >
                            feat.{' '}
                            {track.featuredArtists
                              .map(
                                ({ artistProfile }) => artistProfile.artistName
                              )
                              .join(', ')}
                          </div>
                        )}
                      </div>

                      <div className='flex items-center justify-center'>
                        <span className={`text-sm ${
                            theme === 'light' ? 'text-gray-500' : 'text-white/60'
                          }`}
                        >
                          {track.playCount}
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

                      <div className='flex items-center justify-center'>
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

                    {/* Mobile Layout */}
                    <div
                      className={`md:hidden p-4 ${
                        theme === 'light'
                          ? 'hover:bg-gray-50'
                          : 'hover:bg-white/5'
                      } cursor-pointer`}
                      onClick={() => handleTrackPlay(track)}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={
                            theme === 'light'
                              ? 'text-gray-500'
                              : 'text-white/60'
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
                              theme === 'light'
                                ? 'text-gray-500'
                                : 'text-white/60'
                            }`}
                          >
                            {track.artist.artistName}
                            {track.featuredArtists?.length > 0 && (
                              <span
                                className={
                                  theme === 'light'
                                    ? 'text-gray-400'
                                    : 'text-white/40'
                                }
                              >
                                {' '}
                                • feat.{' '}
                                {track.featuredArtists
                                  .map(
                                    ({ artistProfile }) =>
                                      artistProfile.artistName
                                  )
                                  .join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm ${
                              theme === 'light'
                                ? 'text-gray-500'
                                : 'text-white/60'
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
