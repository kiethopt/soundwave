'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';
import { ArtistProfile, Track, User } from '@/types';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { getDominantHexColor } from '@/utils/tailwind-color-map';
import { Play, Pause, Edit, Up, Down } from '@/components/ui/Icons';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useTrack } from '@/contexts/TrackContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import HorizontalTrackListItem from '@/components/user/track/HorizontalTrackListItem';


export default function DiscoveryGenrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const { id } = use(params);
  const [token, setToken] = useState<string | null>(null);
  const colorClass = searchParams.get('color') ?? '';
  const genre = searchParams.get('name') ?? '';
  const dominantColor = getDominantHexColor(colorClass);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [topAlbums, setTopAlbums] = useState<Track[]>([]);
  const [topArtists, setTopArtists] = useState<ArtistProfile[]>([]);
  const [newestTracks, setNewestTracks] = useState<Track[]>([]);
  
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

    // Fetch genre top albums, tracks, and artists, and newest tracks
    const fetchGenreData = async () => {
      try {
        const [albums, tracks, artists, newest] = await Promise.all([
          api.user.getGenreTopAlbums(id, storedToken),
          api.user.getGenreTopTracks(id, storedToken),
          api.user.getGenreTopArtists(id, storedToken),
          api.user.getGenreNewestTracks(id, storedToken),
        ]);
        setTopAlbums(albums);
        setTopTracks(tracks);
        setTopArtists(artists);
        setNewestTracks(newest);
              } catch (error) {
        console.error('Error fetching genre data:', error);
        toast.error('Failed to load genre data');
      }
    }
    fetchGenreData();
  }, [id, router]);

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
      <div>
        {/* Genre Banner */}
        <div
          className="relative w-full h-[330px] flex flex-col justify-between rounded-t-lg px-4 md:px-6 py-6"
          style={{ backgroundColor: dominantColor || undefined }}
        >
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

          {/* Genre Title */}
          <h1
            className={`text-4xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-md`}
            style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)' }}
          >
            {genre}
          </h1>
        </div>
        
      </div>
    </div>
  )
}