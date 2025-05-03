'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Music, AddSimple } from '@/components/ui/Icons';
import { useDominantColor } from '@/hooks/useDominantColor';
import { useTheme } from '@/contexts/ThemeContext';
import { Album, Track, Playlist } from '@/types';
import { useTrack } from '@/contexts/TrackContext';
import { Heart, MoreHorizontal, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { MusicAuthDialog } from '@/components/ui/data-table/data-table-modals';
import { AlbumTracks } from '@/components/user/album/AlbumTracks';
import io, { Socket } from 'socket.io-client'; // Import Socket
import Image from 'next/image';
export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : params.id
    : null;

  const router = useRouter();
  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { dominantColor } = useDominantColor(album?.coverUrl);
  const { theme } = useTheme();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    queueType,
    setQueueType,
    trackQueue,
  } = useTrack();
  const { isAuthenticated, dialogOpen, setDialogOpen, handleProtectedAction } =
    useAuth();

  const fetchAlbumDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get token if available
      const token = localStorage.getItem('userToken');

      // Now we can fetch album details without requiring authentication
      const data = await api.albums.getById(
        albumId as string,
        token ?? undefined
      );
      setAlbum(data);
      console.log('data', data);
    } catch (err) {
      console.error('Error fetching album:', err);
      setError(err instanceof Error ? err.message : 'Failed to load album');
    } finally {
      setIsLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    if (albumId) {
      fetchAlbumDetails();
    }
  }, [albumId, fetchAlbumDetails]);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const response = await api.playlists.getAll(token);
        setPlaylists(response.data);
      } catch (error) {
        console.error('Error fetching playlists:', error);
      }
    };

    fetchPlaylists();
  }, []);

  // WebSocket listener for album updates
  useEffect(() => {
    if (!albumId) return; // Don't connect if albumId is not available

    let socket: Socket | null = null;
    const connectTimer = setTimeout(() => {
        socket = io(process.env.NEXT_PUBLIC_API_URL!);

        console.log(`[WebSocket] Connecting for Album Detail: ${albumId}`);

        socket.on('connect', () => {
            console.log(`[WebSocket] Connected for Album Detail: ${albumId}`);
        });
        socket.on('disconnect', (reason: string) => {
            console.log(`[WebSocket] Disconnected from Album Detail ${albumId}:`, reason);
        });
        socket.on('connect_error', (error: Error) => {
            console.error(`[WebSocket] Connection Error for Album Detail ${albumId}:`, error);
        });

        // Update album data
        socket.on('album:updated', (data: { album: Album }) => {
            if (data.album.id === albumId) {
                console.log(`[WebSocket] Album ${albumId} updated:`, data.album);
                // Merge new data with existing data, especially preserving tracks if not included in update
                setAlbum((prevAlbum) => (prevAlbum ? { ...prevAlbum, ...data.album } : data.album));
                setError(null);
            }
        });

        // Handle album deletion
        socket.on('album:deleted', (data: { albumId: string }) => {
            if (data.albumId === albumId) {
                console.log(`[WebSocket] Album ${albumId} deleted`);
                setAlbum(null);
                setError('This album has been deleted.');
            }
        });

        // Handle visibility change
        socket.on('album:visibilityChanged', (data: { albumId: string; isActive: boolean }) => {
            if (data.albumId === albumId) {
                console.log(`[WebSocket] Album ${albumId} visibility changed to ${data.isActive}`);
                if (!data.isActive) {
                    // User page should not show inactive albums
                    setAlbum(null);
                    setError('This album is no longer available.');
                } else {
                    // Album became active, refetch might be simplest if it wasn't loaded before
                    // Or update state if it was already loaded but marked inactive (unlikely for user page)
                    setAlbum((prevAlbum) => prevAlbum ? { ...prevAlbum, isActive: true } : prevAlbum);
                    setError(null); // Clear any previous error
                    // Consider refetching if the album was previously null due to inactivity
                    // fetchAlbumDetails();
                }
            }
        });
    }, process.env.NODE_ENV === 'development' ? 100 : 0); // Add delay

    // Cleanup
    return () => {
        clearTimeout(connectTimer);
        if (socket) {
            console.log(`[WebSocket] Disconnecting from Album Detail ${albumId}...`);
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
            socket.off('album:updated');
            socket.off('album:deleted');
            socket.off('album:visibilityChanged');
            socket.disconnect();
        }
    };
  }, [albumId, fetchAlbumDetails]); // Add fetchAlbumDetails to dependencies if used inside effect

  const handleTrackPlay = (track: Track) => {
    // Check if user is authenticated before playing
    handleProtectedAction(() => {
      if (currentTrack?.id === track.id && isPlaying && queueType === 'album') {
        pauseTrack();
      } else {
        setQueueType('album');
        if (album) {
          trackQueue(album.tracks);
        }
        playTrack(track);
      }
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-500/10 text-red-500 rounded">
        Error: {error}
      </div>
    );
  }

  // Not found state
  if (!album) {
    return <div>Album not found</div>;
  }

  return (
    <div
      className="rounded-lg"
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
      <div className="max-w-8xl mx-auto px-4 md:px-6 py-6 mb-16 md:mb-0">
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

        {/* Main Container */}
        <div className="flex flex-col items-center md:items-end md:flex-row gap-8">
          {/* Album Cover */}
          {album.coverUrl && (
            <div className="w-[280px] md:w-[220px] flex-shrink-0">
              <Image
                src={album.coverUrl}
                alt={album.title}
                width={280}
                height={280}
                className="w-full aspect-square object-cover rounded-xl shadow-2xl"
              />
            </div>
          )}

          {/* Album Info */}
          <div className="w-full flex flex-col gap-4 mb-4">
            <div className="text-center md:text-left">
              <h1
                className={`text-3xl md:text-4xl font-bold mb-2 ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}
              >
                {album.title}
              </h1>

              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <span
                  className={`cursor-pointer hover:underline underline-offset-4 ${
                    theme === 'light' ? 'text-gray-900' : 'text-white/90'
                  }`}
                  onClick={() =>
                    router.push(`/artist/profile/${album.artist.id}`)
                  }
                >
                  {album.artist.artistName}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-base">
                <div
                  className={`flex items-center gap-2 ${
                    theme === 'light' ? 'text-gray-600' : 'text-white/60'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span>
                    {new Date(album.releaseDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    theme === 'light' ? 'text-gray-600' : 'text-white/60'
                  }`}
                >
                  <Music className="w-5 h-5" />
                  <span>{album.totalTracks || 0} tracks</span>
                </div>
              </div>

              {album.genres?.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-center md:justify-start mt-4">
                  {album.genres.map(({ genre }) => (
                    <span
                      key={genre.id}
                      className={`px-3 py-1 rounded-full text-sm ${
                        theme === 'light'
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Track List */}
        {album.tracks?.length > 0 && (
          <div className="mt-6 ">
            <div
              className={`w-full rounded-xl overflow-hidden border backdrop-blur-sm ${
                theme === 'light'
                  ? 'bg-white/80 border-gray-200'
                  : 'bg-black/20 border-white/10'
              }`}
            >
              {/* Header - Desktop only */}
              <div
                className={`hidden md:block px-6 py-4 border-b ${
                  theme === 'light' ? 'border-gray-200' : 'border-white/10'
                }`}
              >
                <div
                  className={`grid grid-cols-[48px_1.5fr_1fr_1fr_40px_100px_50px] gap-4 text-sm ${
                    theme === 'light' ? 'text-gray-500' : 'text-white/60'
                  }`}
                >
                  <div className="text-center">#</div>
                  <div>Title</div>
                  <div>Artists</div>
                  <div className="text-center">Play Count</div>
                  <div className="w-[40px]"></div>
                  <div className="text-right">Duration</div>
                  <div></div>
                </div>
              </div>

              <div
                className={`divide-y ${
                  theme === 'light' ? 'divide-gray-200' : 'divide-white/10'
                }`}
              >
                <AlbumTracks
                  tracks={album.tracks}
                  onTrackPlay={handleTrackPlay}
                  currentTrack={currentTrack}
                  isPlaying={isPlaying}
                  requiresAuth={!isAuthenticated}
                  playlists={playlists}
                />
              </div>
            </div>

            {album.label && (
              <div className="flex items-center gap-2 mt-6">
                <span className={`text-xs font-medium ${theme === 'light' ? 'text-gray-500' : 'text-white/60'}`}>
                  © {album.label.name}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Auth Dialog */}
        <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>
    </div>
  );
}
