'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Album, ArtistProfile, Track } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';

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
  const [loading, setLoading] = useState(true);
  const [follow, setFollow] = useState(false);
  const [isOwner, setIsOwner] = useState(false); // ✅ New state to hide follow button

  const token = localStorage.getItem('userToken') || '';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  useEffect(() => {
    if (!token) {
      router.push('/login');
    } else {
      getArtistData(token);
    }
  }, [id, token]);

  // ✅ Check if the user is following OR if the user is the owner
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

    fetchFollowing();
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

  return (
    <div>
      {artist && (
        <div>
          <img 
            src={artist.avatar || 'images/default-avatar.jpg'} 
            alt="Artist Avatar" 
            style={{ width: '200px', height: '200px' }} 
          />
          <h1>Artist Name: {artist.artistName}</h1>

          {!isOwner && ( // ✅ Hide button if user is the owner
            <Button
              variant={theme === 'dark' ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleFollow}
              className="flex-shrink-0 justify-center min-w-[80px]"
            >
              {follow ? 'Unfollow' : 'Follow'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
