'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Album, ArtistProfile, Track, User } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { useDominantColor } from '@/hooks/useDominantColor';
import { Verified, Play, Pause, AddSimple, Edit, Music } from '@/components/ui/Icons';
import { Heart, MoreHorizontal, Share2 } from 'lucide-react';
import { useTrack } from '@/contexts/TrackContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DEFAULT_AVATAR = '/images/default-avatar.jpg';

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = use(params);
  const [ follow, setFollow ] = useState(false);
  const [ isOwner, setIsOwner ] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const { dominantColor } = useDominantColor(userData?.avatar || DEFAULT_AVATAR);
  const [ following, setFollowing ] = useState<ArtistProfile[]>([]);
  const [ user, setUser ] = useState<User | null>(null);
  const [ topArtists, setTopArtists ] = useState<ArtistProfile[]>([]);
  const [ topTracks, setTopTracks ] = useState<Track[]>([]);
  const [artistTracksMap, setArtistTracksMap] = useState<Record<string, Track[]>>({});

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

  useEffect(() => {
    const storedToken = localStorage.getItem('userToken');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);

    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const isOwner = userData.id === id;
    setIsOwner(isOwner);

    const fetchUserData = async () => {
      try {
        const [userResponse, followingResponse] = await Promise.all([
          api.user.getUserById(id, storedToken),
          api.user.getFollowing(storedToken),
        ]);

        if (userResponse) {
          setUser(userResponse);
        }

        if (isOwner) {
          setFollowing(followingResponse);
        } else {
          const isFollowing = followingResponse.some((user: User) => user.id === id);
          setFollow(isFollowing);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    const fetchTopArtists = async () => {
      try {
        const topArtistsResponse = await api.user.getTopArtists(storedToken);
        setTopArtists(topArtistsResponse);
      } catch (error) {
        console.error('Failed to fetch top artists:', error);
      }
    };

    const fetchTopTracks = async () => {
      try {
        const topTracksResponse = await api.user.getTopTracks(storedToken);
        setTopTracks(topTracksResponse);
      } catch (error) {
        console.error('Failed to fetch top tracks:', error);
      }
    };

    fetchUserData();

    if (isOwner) {
      fetchTopArtists();
      fetchTopTracks();
    }
  }, [id, router]);

  const handleFollow = async () => {
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      if (follow) {
        await api.user.unfollowUserOrArtist(id, token);
        toast.success('Unfollowed user!');
        setFollow(false);
      } else {
        await api.user.followUserOrArtist(id, token);
        toast.success('Followed user!');
        setFollow(true);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to follow user!');
    }
  };

  const getArtistTracks = async (artistId: string) => {
    try {
      if (!token) {
        throw new Error('Token is null');
      }
      const data = await api.artists.getTrackByArtistId(artistId, token);
      return data.tracks.sort((a:any, b:any) => b.playCount - a.playCount);
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  // Helper to check if an artist has the current playing track
  const isArtistPlaying = (artistId: string) => {
    const artistTracks = artistTracksMap[artistId] || [];
    return currentTrack && 
           artistTracks.some(track => track.id === currentTrack.id) && 
           isPlaying && 
           queueType === 'artist';
  };

  return (
    <div
      className="min-h-screen w-full rounded-lg"
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
      {user && (
        <div>
          {/* User Banner */}
          <div
            className="relative w-full h-[300px] flex flex-row items-end justify-start rounded-t-lg p-2 md:p-6"
            style={{ backgroundColor: dominantColor || undefined }}
          >
            <div className="flex flex-row items-center justify-start w-full">
              {/* Avatar */}
              <img
                  src={user.avatar || DEFAULT_AVATAR}
                  alt={user.name}
                  className="w-32 h-32 md:w-48 md:h-48 rounded-full"
                />
              
              {/* Username */}
              <div className="flex flex-col items-start justify-center flex-1 ml-4 llg:ml-8 gap-4">
                <span className='text-sm font-semibold '>Profile</span>
                <h1 className='text-4xl md:text-6xl font-bold capitalize' style={{ lineHeight: '1.1' }}>
                  {user.name}
                </h1>
                { isOwner && (
                  <div>
                    <span>• </span>
                    <span 
                      className='text-sm font-semibold hover:underline cursor-pointer'
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {following.length} Following
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
  
          {/* Artist Controls */}
          <div className="px-2 md:px-8 py-6">
            <div className="flex items-center gap-5">
              {/* Follow Button (Can't self follow) */}
              {!isOwner && (
                <Button
                  variant={theme === 'dark' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={handleFollow}
                  className="flex-shrink-0 justify-center min-w-[80px]"
                >
                  {follow ? 'Unfollow' : 'Follow'}
                </Button>
              )}

              {/* Option */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="p-2 opacity-60 hover:opacity-100 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-full px-2">
                  {isOwner && (
                    <DropdownMenuItem 
                      className='cursor-pointer'
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/edit-profile`);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                    </DropdownMenuItem>
                  )}
                  {!isOwner && (
                    <DropdownMenuItem 
                      className='cursor-pointer'
                      onClick={(e) => e.stopPropagation()}
                    >
                      Follow User
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    className='cursor-pointer'
                    onClick={(e) => e.stopPropagation()}
                  >
                    Copy Profile Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Top Artists Section */}
          {topArtists.length > 0 && (
            <div className="px-2 md:px-8 mt-8">
              <h2 className="text-2xl font-bold">Top artists this month</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                {topArtists.map((topArtist) => (
                  <div
                    key={topArtist.id}
                    className="hover:bg-white/5 p-4 rounded-lg group relative w-full"
                    onClick={() => router.push(`/artist/profile/${topArtist.id}`)}
                  >
                    <div className="relative">
                      <img
                        src={topArtist.avatar || '/images/default-avatar.jpg'}
                        alt={topArtist.artistName}
                        className="w-full aspect-square object-cover rounded-full mb-4"
                      />
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            let artistTracks = artistTracksMap[topArtist.id] || [];
                            
                            if (!artistTracks.length) {
                              artistTracks = await getArtistTracks(topArtist.id);
                              
                              setArtistTracksMap(prev => ({
                                ...prev,
                                [topArtist.id]: artistTracks
                              }));
                            }
                            
                            if (artistTracks.length > 0) {
                                if (isArtistPlaying(topArtist.id)) {
                                pauseTrack();
                                } else if (currentTrack && queueType === 'artist') {
                                playTrack(currentTrack);
                                } else {
                                playTrack(artistTracks[0]);
                                setQueueType('artist');
                                trackQueue(artistTracks);
                                }
                            } else {
                              toast.error("No tracks available for this artist");
                            }
                          } catch (error) {
                            console.error(error);
                            toast.error("Failed to load artist tracks");
                          }
                        }}
                        className="absolute bottom-6 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isArtistPlaying(topArtist.id) ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white" />
                        )}
                      </button>
                    </div>
                    <h3 className={`font-medium truncate ${
                      artistTracksMap[topArtist.id]?.some(track => track.id === currentTrack?.id) && queueType === 'artist'
                        ? 'text-[#A57865]'
                        : 'text-white'
                      }`}
                    >
                      {topArtist.artistName}
                    </h3>
                    <p className="text-white/60 text-sm truncate">
                      {new Intl.NumberFormat('en-US').format(topArtist.monthlyListeners)} monthly listeners
                    </p>
                  </div>
                ))}
              </div>   
            </div>
          )}

          {/* Top Tracks Section */}
          { topTracks.length > 0 && (
            <div className="px-2 md:px-8">
              <h2 className="text-2xl font-bold">Top tracks this month</h2>
              <div className="grid grid-cols-1 gap-4 mt-4">
                {topTracks.map((track, index) => (
                  <div
                    key={track.id}
                    className={`grid grid-cols-[32px_48px_4fr_48px_32px] sm:grid-cols-[32px_48px_2fr_2fr_auto] gap-2 md:gap-4 py-2 md:px-2 group cursor-pointer rounded-lg lg:max-w-4xl ${
                      theme === 'light'
                        ? 'hover:bg-gray-50'
                        : 'hover:bg-white/5'
                    }`}
                    onClick={() => {
                      if (currentTrack?.id === track.id && isPlaying && queueType === 'track') {
                        pauseTrack();
                      } else {
                        playTrack(track);
                        setQueueType('track');
                        trackQueue(topTracks)
                      }
                    }}
                  >
                    {/* Track Number or Play/Pause Button */}
                    <div
                      className={`flex items-center justify-center ${
                        theme === 'light' ? 'text-gray-500' : 'text-white/60'
                      }`}
                    >
                      {/* Show play/pause button on hover */}
                      <div className="hidden group-hover:block cursor-pointer">
                        {currentTrack?.id === track.id && isPlaying && queueType === 'track'? (
                          <Pause className="w-5 h-5" /> 
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </div>

                      {/* Show track number or pause button when not hovering */}
                      <div className="group-hover:hidden cursor-pointer">
                        {currentTrack?.id === track.id && isPlaying && queueType === 'track'? (
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
                    <div className="flex flex-col md:flex-row md:justify-between items-center min-w-0 w-full">
                      {/* Track Title */}
                      <span
                        className={`font-medium truncate w-full md:w-auto ${
                          currentTrack?.id == track.id && queueType === 'track'
                            ? 'text-[#A57865]'
                            : 'text-white'
                        }`}
                      >
                        {track.title}
                      </span>

                      {/* Play Count */}
                      <div
                        className={`truncate text-sm md:text-base w-full md:w-auto text-start sm:text-right ${
                          theme === 'light' ? 'text-gray-500' : 'text-white/60'
                        }`}
                      >
                        {new Intl.NumberFormat('en-US').format(track.playCount)}
                      </div>
                    </div>


                    {/* Track Album */}
                    <div
                      className={`flex items-center justify-center ${
                        theme === 'light' ? 'text-gray-500' : 'text-white/60'
                      }`}
                    >
                      
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
                          className='cursor-pointer'
                          onClick={(e) => e.stopPropagation()}
                        >
                          <AddSimple className="w-4 h-4 mr-2" />
                            Add to playlist
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className='cursor-pointer'
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Heart className="w-4 h-4 mr-2" />
                            Add to favorites
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className='cursor-pointer'
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div> 
            </div>
          )}
        </div>
      )}
    </div>
  );
}
