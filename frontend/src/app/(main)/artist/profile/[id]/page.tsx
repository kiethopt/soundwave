'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Album, ArtistProfile, Track } from '@/types';
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

export default function ArtistProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { theme } = useTheme();
  const { id } = use(params);
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  // Track mapping for related artists - key is artist ID, value is array of tracks
  const [artistTracksMap, setArtistTracksMap] = useState<Record<string, Track[]>>({});
  const [relatedArtists, setRelatedArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [follow, setFollow] = useState(false);
  const [isOwner, setIsOwner] = useState(false); 
  const { dominantColor } = useDominantColor(artist?.avatar || '');
  const [showAllTracks, setShowAllTracks] = useState(false);

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

  const token = localStorage.getItem('userToken') || '';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const displayedTracks = showAllTracks ? tracks : tracks.slice(0, 5);

  useEffect(() => {
    if (!token) {
      router.push('/login');
    } else {
      getArtistData(token);
    }
  }, [id, token]);

  useEffect(() => {
    const fetchFollowing = async () => {
      const response = await api.user.getFollowing(token);
      if (response) {
        const isFollowing = response.some((artistProfile: ArtistProfile) => artistProfile.id === id);
        const isOwner = userData.artistProfile?.id === id;

        setFollow(isFollowing);
        setIsOwner(isOwner);
      }
    };

    const fetchAlbums = async () => {
      const response = await api.artists.getAlbumByArtistId(id, token);
      setAlbums(response.albums);
    };

    const fetchTracks = async () => {
      const response = await api.artists.getTrackByArtistId(id, token);
      // Sort track by playCount and releaseDate
      const sortedTracks = response.tracks
        .sort((a:any, b:any) => b.playCount - a.playCount);
      setTracks(sortedTracks);
    };

    const fetchRelatedArtists = async () => {
      const response = await api.artists.getRelatedArtists(id, token);
      setRelatedArtists(response);
      
      // Pre-fetch tracks for all related artists
      if (response && response.length > 0) {
        const tracksPromises = response.map((artist: { id: string; }) => getArtistTracks(artist.id));
        
        Promise.all(tracksPromises).then(results => {
          const tracksMap: Record<string, Track[]> = {};
          
            response.forEach((artist: ArtistProfile, index: number) => {
            tracksMap[artist.id] = results[index];
            });
          
          setArtistTracksMap(tracksMap);
        });
      }
    };

    fetchFollowing();
    fetchAlbums();
    fetchTracks();
    fetchRelatedArtists();
  }, [id, token]);

  const getArtistData = async (token: string) => {
    try {
      const data = await api.artists.getProfile(id, token);
      setArtist(data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!token) {
      router.push('/login');
    } else {
      try {
        if (follow) {
          await api.user.unfollowUserOrArtist(id, token);
          toast.success('Unfollowed artist!');
          setFollow(false);
        } else {
          await api.user.followUserOrArtist(id, token);
          toast.success('Followed artist!');
          setFollow(true);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to follow artist!');
      }
    }
  };

  const getArtistTracks = async (artistId: string) => {
    try {
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
      {artist && (
        <div>
          {/* Artist Banner */}
          <div
            className="relative w-full h-[370px] flex flex-col items-start justify-end rounded-t-lg"
            style={{ backgroundColor: dominantColor || undefined }}
          >
            <div className='p-8'>
              <div className="flex items-center space-x-2">
                <Verified className='w-6 h-6' />
                <span className='text-sm font-medium'>Verified Artist</span>
              </div>
              <h1 className='text-6xl font-bold uppercase py-4' style={{ lineHeight: '1.1' }}>
                {artist.artistName}
              </h1>
              <span className='text-base font-semibold py-6'>
                {new Intl.NumberFormat('en-US').format(artist.monthlyListeners)} monthly listeners
              </span>
            </div>
          </div>
  
          {/* Artist Controls */}
          <div className="px-2 md:px-8 py-6">
            <div className="flex items-center gap-5">
              {/* Play/Pause Button */}
                <button
                  onClick={(e) => {
                    if (tracks.length > 0) {
                      if (isPlaying && queueType === 'track' && currentTrack?.artistId === artist?.id) {
                        pauseTrack();
                      } else {
                        playTrack(tracks[0]);
                        setQueueType('track');
                        trackQueue(tracks);
                      }
                    }
                  }}
                  className="p-3 rounded-full bg-[#A57865] hover:bg-[#8a5f4d] transition-colors duration-200 ml-2"
                >
                  { isPlaying && queueType === 'track' && currentTrack?.artistId === artist?.id ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white" />
                  )}
                </button>

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
              {isOwner && (
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
                      <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className='cursor-pointer'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Music className="w-4 h-4 mr-2" />
                        View Stats
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>


          {/* Track Section */}
          { tracks.length > 0 && (
            <div className="px-2 md:px-8">
              <h2 className="text-2xl font-bold">Popular Tracks</h2>
              <div className="grid grid-cols-1 gap-4 mt-4">
                {displayedTracks.map((track, index) => (
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
                        trackQueue(tracks)
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


                    {/* Track Duration */}
                    <div
                      className={`flex items-center justify-center ${
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

               {/* "See More" Button */}
              {tracks.length > 5 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowAllTracks(!showAllTracks)}
                    className="text-[#A57865] hover:underline"
                  >
                    {showAllTracks ? 'See Less' : 'See More'}
                  </button>
                </div>
              )} 
            </div>
          )}

          {/* Album Section */}
          {albums.length > 0 && (
            <div className="px-2 md:px-8 mt-8">
              <h2 className="text-2xl font-bold">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                {albums.map((album) => (
                  <div
                    key={album.id}
                    className="bg-white/5 p-4 rounded-lg group relative w-full"
                  >
                    <div className="relative">
                      <img
                        src={album.coverUrl || '/images/default-album.png'}
                        alt={album.title}
                        className="w-full aspect-square object-cover rounded-md mb-4"
                      />
                      <button
                        onClick={() => {
                          if (album.tracks.some(track => track.id === currentTrack?.id) && isPlaying && queueType === 'album') {
                            pauseTrack();
                          } else if (currentTrack && queueType === 'album') {
                            playTrack(currentTrack);
                          } else {
                            playTrack(album.tracks[0]);
                            setQueueType('album');
                            trackQueue(album.tracks);
                          }
                        }}
                        className="absolute bottom-6 right-2 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity"
                      > 
                        {album.tracks.some(track => track.id === currentTrack?.id && isPlaying && queueType === 'album') ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white" />
                        )}
                      </button>
                    </div>
                    <h3
                      className={`font-medium truncate ${
                        currentTrack && album.tracks.some(track => track.id === currentTrack.id && queueType === 'album')
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

          {/* Related Artists Section */}
          {relatedArtists.length > 0 && (
            <div className="px-2 md:px-8 mt-8">
              <h2 className="text-2xl font-bold">Related Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
                {relatedArtists.map((relatedArtist) => (
                  <div
                    key={relatedArtist.id}
                    className="hover:bg-white/5 p-4 rounded-lg group relative w-full"
                    onClick={() => router.push(`/artist/profile/${relatedArtist.id}`)}
                  >
                    <div className="relative">
                      <img
                        src={relatedArtist.avatar || '/images/default-avatar.jpg'}
                        alt={relatedArtist.artistName}
                        className="w-full aspect-square object-cover rounded-full mb-4"
                      />
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            let artistTracks = artistTracksMap[relatedArtist.id] || [];
                            
                            if (!artistTracks.length) {
                              artistTracks = await getArtistTracks(relatedArtist.id);
                              
                              setArtistTracksMap(prev => ({
                                ...prev,
                                [relatedArtist.id]: artistTracks
                              }));
                            }
                            
                            if (artistTracks.length > 0) {
                                if (isArtistPlaying(relatedArtist.id)) {
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
                        {isArtistPlaying(relatedArtist.id) ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white" />
                        )}
                      </button>
                    </div>
                    <h3 className={`font-medium truncate ${
                      artistTracksMap[relatedArtist.id]?.some(track => track.id === currentTrack?.id) && queueType === 'artist'
                        ? 'text-[#A57865]'
                        : 'text-white'
                      }`}
                    >
                      {relatedArtist.artistName}
                    </h3>
                    <p className="text-white/60 text-sm truncate">
                      {new Intl.NumberFormat('en-US').format(relatedArtist.monthlyListeners)} monthly listeners
                    </p>
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