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
  const token = localStorage.getItem('userToken') || '';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  const { dominantColor } = useDominantColor(userData?.avatar || DEFAULT_AVATAR);
  const [ following, setFollowing ] = useState<ArtistProfile[]>([]);
  const [ user, setUser ] = useState<User | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
    } else {
      if (userData.id === id) {
        setIsOwner(true);
      }
    }
  }, [token]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
      const [userResponse, followingResponse] = await Promise.all([
        api.user.getUserById(id, token),
        api.user.getFollowing(token),
      ]);

      if (userResponse) {
        setUser(userResponse);
      }

      if (followingResponse) {
        setFollowing(followingResponse);
        const isFollowing = followingResponse.some((user:User) => user.id === id);
        setFollow(isFollowing);
      }
      } catch (error) {
      console.error('Failed to fetch user data:', error);
      }
    };

    fetchUserData();
  }, [token, userData]);

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
        </div>
      )}
    </div>
  );
}
