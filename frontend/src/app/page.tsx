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
  // const { theme } = useTheme();
  // const router = useRouter();
  // const [artist, setArtist] = useState<ArtistProfile | null>(null);
  // const [albums, setAlbums] = useState<Album[]>([]);
  // const [tracks, setTracks] = useState<Track[]>([]);
  // // Track mapping for related artists - key is artist ID, value is array of tracks
  // const [artistTracksMap, setArtistTracksMap] = useState<Record<string, Track[]>>({});
  // const [relatedArtists, setRelatedArtists] = useState<ArtistProfile[]>([]);
  // const [loading, setLoading] = useState(true);
  // const [follow, setFollow] = useState(false);
  // const [isOwner, setIsOwner] = useState(false);
  // const { dominantColor } = useDominantColor(artist?.avatar || '#A57865');
  // const [ showAllTracks, setShowAllTracks ] = useState(false);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 p-6">Welcome to Music Website</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Add your content here */}
      </div>
    </div>
  );
}
