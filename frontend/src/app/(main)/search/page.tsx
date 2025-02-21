'use client';

import { Suspense, useRef, useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Track, Album, Artist, User } from '@/types';
import { api } from '@/utils/api';
import { Pause, Play, AddSimple } from '@/components/ui/Icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Heart, MoreHorizontal, Share2 } from 'lucide-react';
import pusher from '@/utils/pusher';
import { toast } from 'react-toastify';
import { useTrack } from '@/contexts/TrackContext';

type FilterType = 'all' | 'albums' | 'tracks' | 'artists' | 'users';

// Loading UI component
function LoadingUI() {
  return (
    <div>
      <div className="w-full border-b border-white/10">
        <div className="flex gap-6 px-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-10 w-20 bg-white/5 animate-pulse rounded-full"
            />
          ))}
        </div>
      </div>
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/5 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white/5 p-4 rounded-lg">
                <div className="bg-white/10 aspect-square rounded-md mb-4"></div>
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-white/10 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Search Results Component
function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [results, setResults] = useState<{
    artists: Artist[];
    albums: Album[];
    tracks: Track[];
    users: User[];
  }>({ artists: [], albums: [], tracks: [], users: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Audio states
  const {
    currentTrack,
    isPlaying,
    volume,
    progress,
    loop,
    shuffle,
    playTrack,
    pauseTrack,
    setVolume,
    seekTrack,
    toggleLoop,
    toggleShuffle,
    skipNext,
    skipPrevious,
    queueType,
    setQueueType,
    trackQueue,
  } = useTrack();
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter buttons
  const filterButtons: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Albums', value: 'albums' },
    { label: 'Tracks', value: 'tracks' },
    { label: 'Artists', value: 'artists' },
    { label: 'Users', value: 'users' },
  ];

  // Fetch search results
  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setResults({ artists: [], albums: [], tracks: [], users: [] });
        return;
      }

      setIsLoading(true);
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          router.push('/login');
          return;
        }

        const searchResult = await api.user.searchAll(query, token);
        setResults(searchResult);
      } catch (error: any) {
        console.error('Search error:', error);
        if (
          error.message === 'Unauthorized' ||
          error.message === 'User not found'
        ) {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query, router]);

  useEffect(() => {
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
      const user = JSON.parse(userDataStr);

      // Subscribe vào channel của user
      const channel = pusher.subscribe(`user-${user.id}`);

      // Lắng nghe sự kiện audio-control
      channel.bind('audio-control', (data: any) => {
        if (data.type === 'STOP_OTHER_SESSIONS') {
          // Dừng phát nhạc nếu đang phát
          if (audioRef.current) {
            audioRef.current.pause();
            setCurrentlyPlaying(null);
          }
        }
      });

      // Cleanup function
      return () => {
        channel.unbind('audio-control');
        pusher.unsubscribe(`user-${user.id}`);
      };
    }
  }, []);
  
  useEffect(() => {
    if (currentTrack && queueType !== 'album' && queueType !== 'artist') {
      setCurrentlyPlaying(currentTrack.id);
    }
  }, [currentTrack, queueType]);

  const handlePlay = async (item: Track | Album | Artist) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        router.push('/login');
        return;
      }
  
      if ('audioUrl' in item) {
        // Single Track
        if (currentTrack?.id === item.id && currentlyPlaying === item.id) {
          if (isPlaying) {
            pauseTrack();
          } else {
            playTrack(item);
            setCurrentlyPlaying(item.id);
          }
        } else {
          trackQueue(results.tracks);
          setQueueType('track');
          playTrack(item);
          setCurrentlyPlaying(item.id);
        }
      } else if ('tracks' in item) {
        // Album
        if (queueType === 'album' && currentlyPlaying === item.id) {
          // We're already playing from this album, just toggle play/pause
          if (isPlaying) {
            pauseTrack();
          } else {
            // Just resume the current track
            if (currentTrack) {
              playTrack(currentTrack);
              setCurrentlyPlaying(item.id);
            }
          }
        } else {
          // Start fresh with this album
          if (item.tracks.length > 0) {
            trackQueue(item.tracks);
            setQueueType('album');
            playTrack(item.tracks[0]);
            setCurrentlyPlaying(item.id);
          } else {
            toast.error('No tracks found in this album.');
            setCurrentlyPlaying(null);
          }
        }
      } else if ('artistProfile' in item) {
        // Artist
        if (queueType === 'artist' && currentlyPlaying === item.artistProfile.id) {
          // We're already playing from this artist, just toggle play/pause
          if (isPlaying) {
            pauseTrack();
          } else {
            // Just resume the current track
            if (currentTrack) {
              playTrack(currentTrack);
              setCurrentlyPlaying(item.artistProfile.id);
            }
          }
        } else {
          // Load artist tracks for a fresh start
          const response = await api.artists.getTrackByArtistId(item.artistProfile.id, token);
          const artistTracks = response?.tracks || [];
  
          if (!Array.isArray(artistTracks)) {
            console.error('artistTracks is not an array:', artistTracks);
            toast.error('Error fetching artist tracks.');
            return;
          }
  
          const sortedTracks = artistTracks.sort((a, b) =>
            (b.playCount - a.playCount) ||
            (new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
          );
            
          if (sortedTracks.length > 0) {
            trackQueue(sortedTracks);
            setQueueType('artist');
            playTrack(sortedTracks[0]);
            setCurrentlyPlaying(item.artistProfile.id);
          } else {
            toast.error('No tracks found for this artist.');
            setCurrentlyPlaying(null);
          }
        }
      }
    } catch (error) {
      console.error('Error playing:', error);
      toast.error('Error playing track. Please try again.');
    }
  };
  
  

  return (
    <div suppressHydrationWarning>
      {/* Filter Bar */}
      <div className="w-full border-b border-white/10">
        <div className="flex gap-8 px-6">
          {filterButtons.map((button) => (
            <button
              key={button.value}
              onClick={() => setActiveFilter(button.value)}
              className={`py-2.5 text-sm font-medium transition-colors relative ${
                activeFilter === button.value
                  ? 'text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {button.label}
              {activeFilter === button.value && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        <div className="space-y-8">
          {/* Artists Section */}
          {(activeFilter === 'all' || activeFilter === 'artists') &&
            results.artists.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Artists</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {results.artists.map((artist) => (
                    <div
                      key={artist.id}
                      className="group relative p-4 rounded-lg hover:bg-white/5 transition-colors"
                      onClick={() => router.push(`/artist/profile/${artist.artistProfile.id}`)}
                    >
                      <div className="relative">
                        <div className="aspect-square mb-4">
                          <img
                            src={
                              artist.artistProfile?.avatar ||
                              '/images/default-avatar.jpg'
                            }
                            alt={artist.artistProfile?.artistName || 'Artist'}
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handlePlay(artist);
                          }}
                          className="absolute bottom-6 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity shadow-lg transform translate-y-2 group-hover:translate-y-0"
                        >
                          { currentTrack && queueType === 'artist' && currentTrack.artistId === artist.artistProfile?.id && isPlaying ? (
                            <Pause className="w-6 h-6 text-white" />
                          ) : (
                            <Play className="w-6 h-6 text-white" />
                          )}
                        </button>
                      </div>
                      <div className="text-center">
                        <h3 className={`font-medium truncate ${
                          currentTrack && queueType === 'artist' && currentTrack.artistId === artist.artistProfile?.id
                            ? 'text-[#A57865]'
                            : 'text-white'
                          }`}
                        >
                          {artist.artistProfile?.artistName}
                        </h3>
                        <p className="text-white/60 text-sm truncate">
                          {artist.artistProfile?.monthlyListeners.toLocaleString()}{' '}
                          monthly listeners
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Albums Section */}
          {(activeFilter === 'all' || activeFilter === 'albums') &&
            results.albums.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Albums</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {results.albums.map((album) => (
                    <div
                      key={album.id}
                      className="bg-white/5 p-4 rounded-lg group relative"
                    >
                      <div className="relative">
                        <img
                          src={album.coverUrl || '/images/default-album.png'}
                          alt={album.title}
                          className="w-full aspect-square object-cover rounded-md mb-4"
                        />
                        <button
                          onClick={() => handlePlay(album)}
                          className="absolute bottom-6 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {currentTrack && album.tracks.some(track => track.id === currentTrack.id) && isPlaying && queueType === 'album' ? (
                            <Pause className="w-6 h-6 text-white" />
                          ) : (
                            <Play className="w-6 h-6 text-white" />
                          )}
                        </button>
                      </div>
                      <h3
                        className={`font-medium truncate ${
                          currentlyPlaying === album.id
                            ? 'text-[#A57865]'
                            : 'text-white'
                        }`}
                      >
                        {album.title}
                      </h3>
                      <p className="text-white/60 text-sm truncate">
                        {typeof album.artist === 'string'
                          ? album.artist
                          : album.artist?.artistName || 'Unknown Artist'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Tracks Section */}
          {(activeFilter === 'all' || activeFilter === 'tracks') &&
            results.tracks.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Tracks</h2>
                <div className="md:grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Mobile List View */}
                  <div className="block md:hidden space-y-2 mb-10">
                    {results.tracks.map((track) => (
                      <div
                        key={track.id}
                        className={`flex items-center gap-3 p-2 rounded-lg group
                        ${
                          currentlyPlaying === track.id
                            ? 'bg-white/5'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={track.coverUrl || '/images/default-avatar.jpg'}
                            alt={track.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <button
                            onClick={() => handlePlay(track)}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                          >
                            { currentTrack && track.id == currentTrack.id && isPlaying && queueType === 'track' ? (
                              <Pause className="w-5 h-5 text-white" />
                            ) : (
                              <Play className="w-5 h-5 text-white" />
                            )}
                          </button>
                        </div>
                        <div className="flex-grow min-w-0">
                          <h3
                            className={`font-medium truncate ${
                              currentlyPlaying === track.id
                                ? 'text-[#A57865]'
                                : 'text-white'
                            }`}
                          >
                            {track.title}
                          </h3>
                          <p className="text-white/60 text-sm truncate">
                            {[
                              track.artist
                                ? typeof track.artist === 'string'
                                  ? track.artist
                                  : track.artist.artistName
                                : 'Unknown Artist',
                              ...(track.featuredArtists?.map(
                                (fa) => fa.artistProfile.artistName
                              ) || []),
                            ].join(', ')}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 opacity-60 hover:opacity-100">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem>
                              <AddSimple className="w-4 h-4 mr-2" />
                              Add to playlist
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Heart className="w-4 h-4 mr-2" />
                              Add to favorites
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Grid View */}
                  {results.tracks.map((track) => (
                    <div
                      key={track.id}
                      className={`hidden md:block bg-white/5 p-4 rounded-lg group relative
                      ${
                        currentlyPlaying === track.id
                          ? 'bg-white/5'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={track.coverUrl || '/images/default-avatar.jpg'}
                          alt={track.title}
                          className="w-full aspect-square object-cover rounded-md mb-4"
                        />
                        <button
                          onClick={() => handlePlay(track)} 
                          className="absolute bottom-6 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {currentlyPlaying === track.id ? (
                            <Pause className="w-6 h-6 text-white" />
                          ) : (
                            <Play className="w-6 h-6 text-white" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-grow min-w-0">
                          <h3
                            className={`font-medium truncate ${
                              currentlyPlaying === track.id
                                ? 'text-[#A57865]'
                                : 'text-white'
                            }`}
                          >
                            {track.title}
                          </h3>
                          <p className="text-white/60 text-sm truncate">
                            {[
                              track.artist
                                ? typeof track.artist === 'string'
                                  ? track.artist
                                  : track.artist.artistName
                                : 'Unknown Artist',
                              ...(track.featuredArtists?.map(
                                (fa) => fa.artistProfile.artistName
                              ) || []),
                            ].join(', ')}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem>
                              <AddSimple className="w-4 h-4 mr-2" />
                              Add to playlist
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Heart className="w-4 h-4 mr-2" />
                              Add to favorites
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Users Section */}
          {/* import { useRouter } from 'next/navigation';

          const router = useRouter(); */}

          {/* Users Section */}
          {(activeFilter === 'all' || activeFilter === 'users') &&
            results.users.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Users</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {results.users.map((user) => (
                    <div
                      key={user.id}
                      className="group relative p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => router.push(`/user/${user.id}`)}
                    >
                      <div className="relative">
                        <div className="aspect-square mb-4">
                          <img
                            src={user.avatar || '/images/default-avatar.jpg'}
                            alt={user.name || 'User'}
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                      </div>
                      <div className="text-center">
                        <h3 className="text-white font-medium truncate hover:underline">
                          {user.name}
                        </h3>
                        <p className="text-white/60 text-sm truncate">
                          {user.username || 'No username'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


          {/* No Results Message */}
          {!isLoading &&
            query &&
            results.tracks.length === 0 &&
            results.albums.length === 0 &&
            results.artists.length === 0 &&
            results.users.length === 0 && (
              <p className="text-white/60">
                No results found for "{query}". Try searching for something
                else.
              </p>
            )}
        </div>
      </div>
    </div>
  );
}

// Main Page Component
export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingUI />}>
      <SearchContent />
    </Suspense>
  );
}
