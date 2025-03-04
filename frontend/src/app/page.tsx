'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Album, ArtistProfile, Track } from '@/types';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { useDominantColor } from '@/hooks/useDominantColor';
import { useTrack } from '@/contexts/TrackContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Home() {
  const { theme } = useTheme();
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  // Track mapping for related artists - key is artist ID, value is array of tracks
  // const [artistTracksMap, setArtistTracksMap] = useState<Record<string, Track[]>>({});
  // const [getRecommendedArtists, setRecommendedArtists] = useState<ArtistProfile[]>([]);
  // const [loading, setLoading] = useState(true);
  // const [follow, setFollow] = useState(false);
  // const [isOwner, setIsOwner] = useState(false);
  const { dominantColor } = useDominantColor(artist?.avatar || '');
  // const [ showAllTracks, setShowAllTracks ] = useState(false);
  // const {
  //   currentTrack,
  //   isPlaying,
  //   volume,
  //   progress,
  //   loop,
  //   shuffle,
  //   playTrack,
  //   pauseTrack,
  //   setVolume,
  //   seekTrack,
  //   toggleLoop,
  //   toggleShuffle,
  //   skipNext,
  //   skipPrevious,
  //   queueType,
  //   setQueueType,
  //   trackQueue,
  // } = useTrack();

  const token = localStorage.getItem('userToken') || '';
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token]);

  return (
    <div
      className="min-h-screen w-full rounded-lg p-4"
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
      suppressHydrationWarning
    >
      <div>
        <h2 className="text-2xl font-bold">Listen Again</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 grid-rows-4 lg:grid-row-2 gap-6"></div>
      </div>
    </div>
  );
}
