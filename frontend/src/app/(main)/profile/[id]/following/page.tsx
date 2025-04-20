'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { ArtistProfile, Track, User } from '@/types';
import toast from 'react-hot-toast';
import { Play, Pause } from '@/components/ui/Icons';
import { useTrack } from '@/contexts/TrackContext';

type FollowingFilterType = 'all' | 'artists' | 'users';

const DEFAULT_AVATAR = '/images/default-avatar.jpg';

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [token, setToken] = useState<string | null>(null);
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);
  const [followingArtists, setFollowingArtists] = useState<ArtistProfile[]>([]);
  const [artistTracksMap, setArtistTracksMap] = useState<
    Record<string, Track[]>
  >({});
  const [activeFilter, setActiveFilter] = useState<FollowingFilterType>('all');

  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
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

    const fetchUserData = async () => {
      try {
        const [followingResponse] = await Promise.all([
          api.user.getFollowing(storedToken),
        ]);

        if (followingResponse) {
          const followingUser = followingResponse.filter(
            (followingUser: any) => followingUser.type === 'USER'
          );
          const followingArtists = followingResponse.filter(
            (followingUser: any) => followingUser.type === 'ARTIST'
          );
          setFollowingUsers(followingUser);
          setFollowingArtists(followingArtists);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };

    fetchUserData();
  }, [id, router]);

  const handleArtistPlay = async (
    artist: ArtistProfile,
    queueTypeValue: 'topArtist' | 'followingArtist',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    try {
      let artistTracks = artistTracksMap[artist.id] || [];

      if (!artistTracks.length) {
        artistTracks = await getArtistTracks(artist.id);

        setArtistTracksMap((prev) => ({
          ...prev,
          [artist.id]: artistTracks,
        }));
      }

      if (artistTracks.length > 0) {
        const isCurrentArtistPlaying =
          isPlaying &&
          currentTrack &&
          artistTracks.some((track) => track.id === currentTrack.id) &&
          queueType === queueTypeValue;

        if (isCurrentArtistPlaying) {
          pauseTrack();
        } else {
          setQueueType(queueTypeValue);
          trackQueue(artistTracks);
          playTrack(artistTracks[0]);
        }
      } else {
        toast.error('No tracks available for this artist');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load artist tracks');
    }
  };

  const getArtistTracks = async (artistId: string) => {
    try {
      if (!token) {
        throw new Error('Token is null');
      }
      const data = await api.artists.getTrackByArtistId(artistId, token);
      return data.tracks.sort((a: any, b: any) => b.playCount - a.playCount);
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  const isArtistPlaying = (
    artistId: string,
    queueTypeValue: 'followingArtist'
  ) => {
    const artistTracks = artistTracksMap[artistId] || [];
    return (
      currentTrack &&
      artistTracks.some((track) => track.id === currentTrack.id) &&
      isPlaying &&
      queueType === queueTypeValue
    );
  };

  const filterButtons: { label: string; value: FollowingFilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Artists', value: 'artists' },
    { label: 'Users', value: 'users' },
  ];

  return (
    <div className='px-4 md:px-6 py-6'>
      <div className='flex flex-col gap-6'>
        <h1 className='text-2xl font-bold'>Following</h1> 
        
        {/* Filter Bar - Copied and adapted from search page */}
        <div className="w-full border-b border-white/10">
          <div className="flex gap-8 px-0">
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

        {/* Grid for content */}
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4'>
          {/* Render Artists if filter is 'all' or 'artists' */}
          {(activeFilter === 'all' || activeFilter === 'artists') && 
            followingArtists.map((artist) => (
              <div
                key={artist.id}
                className="hover:bg-white/5 p-3 rounded-lg group relative cursor-pointer flex flex-col items-center flex-shrink-0 w-[180px]"
                onClick={() => router.push(`/artist/profile/${artist.id}`)}
              >
                <div className="relative w-full mb-4">
                  <img
                    src={artist.avatar || DEFAULT_AVATAR}
                    alt={artist.artistName}
                    className="w-full aspect-square object-cover rounded-full"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArtistPlay(artist, 'followingArtist', e);
                    }}
                    className="absolute bottom-1 right-1 p-3 rounded-full bg-[#A57865] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
                    aria-label={`Play ${artist.artistName}`}
                  >
                    {isArtistPlaying(artist.id, 'followingArtist') ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
                <div className="w-full text-left mt-1">
                  <h3 className="font-medium truncate text-white w-full">
                    {artist.artistName}
                  </h3>
                  <p className="text-sm text-white/60">Artist</p>
                </div>
              </div>
            ))}

          {/* Render Users if filter is 'all' or 'users' */}
          {(activeFilter === 'all' || activeFilter === 'users') && 
            followingUsers.map((user) => (
              <div
                key={user.id}
                className="hover:bg-white/5 p-3 rounded-lg group relative cursor-pointer flex flex-col items-center flex-shrink-0 w-[180px]"
                onClick={() => router.push(`/profile/${user.id}`)}
              >
                <div className="w-full mb-4">
                  <img
                    src={user.avatar || DEFAULT_AVATAR}
                    alt={user.name}
                    className="w-full aspect-square object-cover rounded-full"
                  />
                </div>
                <div className="w-full text-left mt-1">
                  <h3 className="font-medium truncate text-white w-full">
                    {user.name}
                  </h3>
                  <p className="text-sm text-white/60">Profile</p>
                </div>
              </div>
            ))}
        </div>
        
        {/* Optional: Message for empty results based on filter */}
        {(activeFilter === 'artists' && followingArtists.length === 0) && (
          <p className="text-white/60">You are not following any artists.</p>
        )}
        {(activeFilter === 'users' && followingUsers.length === 0) && (
          <p className="text-white/60">You are not following any users.</p>
        )}
        {(activeFilter === 'all' && followingArtists.length === 0 && followingUsers.length === 0) && (
          <p className="text-white/60">You are not following anyone yet.</p>
        )}

      </div>
    </div>
  )
}
