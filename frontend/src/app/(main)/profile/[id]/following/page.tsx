'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';
import { ArtistProfile, Track, User } from '@/types';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useDominantColor } from '@/hooks/useDominantColor';
import { Play, Pause, Edit, Up, Down, Right } from '@/components/ui/Icons';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useTrack } from '@/contexts/TrackContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import HorizontalTrackListItem from '@/components/user/track/HorizontalTrackListItem';
import Image from 'next/image';

const DEFAULT_AVATAR = '/images/default-avatar.jpg';

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const { id } = use(params);
  const [follow, setFollow] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);
  const [followingArtists, setFollowingArtists] = useState<ArtistProfile[]>([]);
  const [artistTracksMap, setArtistTracksMap] = useState<
    Record<string, Track[]>
  >({});

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

    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const isOwner = userData.id === id;
    setIsOwner(isOwner);

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

  return (
    <div className='px-4 md:px-6 py-6'>
      <div className='flex flex-col gap-4'>
        <h1 className='text-2xl font-bold'>Following</h1>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4'>
          {followingArtists.map((artist) => (
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
          {followingUsers.map((user) => (
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
      </div>
    </div>
  )
}
