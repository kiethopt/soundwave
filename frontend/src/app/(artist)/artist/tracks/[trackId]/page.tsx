'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import type { Track, ArtistProfile, Genre, Label, Album } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft as LucideArrowLeft,
  CalendarDays,
  Clock,
  Music,
  Eye,
  Pencil,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Verified } from '@/components/ui/Icons';
import { useDominantColor } from '@/hooks/useDominantColor';
import { EditTrackModal } from '@/components/ui/artist-modals';

interface TrackDetails extends Omit<Track, 'album' | 'artist' | 'featuredArtists'> {
  artist: ArtistProfile & { avatar: string | null; isVerified?: boolean };
  album?: Album & { coverUrl: string | null };
  featuredArtists: { artistProfile: ArtistProfile & { avatar: string | null } }[];
  genres: { genre: Genre }[];
  label?: Label;
  audioUrl: string; // Keep as string to match base Track type
}

export default function ArtistTrackDetailsPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams();
  const trackId = Array.isArray(params.trackId)
    ? params.trackId[0]
    : params.trackId;

  const [track, setTrack] = useState<TrackDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [availableArtists, setAvailableArtists] = useState<{ id: string; name: string }[]>([]);
  const [availableGenres, setAvailableGenres] = useState<{ id: string; name: string }[]>([]);
  const [availableLabels, setAvailableLabels] = useState<{ id: string; name: string }[]>([]);

  const fetchTrackDetails = useCallback(async () => {
    if (!trackId) {
      setError('Track ID not found.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('Authentication token not found.');
      const response = await api.tracks.getById(trackId, token);
      if (response) {
        setTrack(response as TrackDetails);
      } else {
        throw new Error('Track not found or failed to load.');
      }
    } catch (err: any) {
      console.error('Failed to fetch track details:', err);
      const message =
        err?.response?.data?.message ||
        err.message ||
        'Failed to load track details. Please try again later.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [trackId]);

  useEffect(() => {
    fetchTrackDetails();
  }, [fetchTrackDetails]);

  const coverImageUrl =
    track?.coverUrl || track?.album?.coverUrl || track?.artist?.avatar || '/images/default-track.jpg';

  const { dominantColor } = useDominantColor(coverImageUrl);

  const fetchMetadata = useCallback(async () => {
    if (!track) return;
    setIsMetadataLoading(true);

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('Authentication token not found.');

      const [artistsResponse, genresResponse, labelsResponse] = await Promise.all([
        api.artists.getAllArtistsProfile(token, 1, 500),
        api.genres.getAll(token, 1, 100),
        api.labels.getAll(token, 1, 500),
      ]);

      const artists = artistsResponse.artists.map((artist: ArtistProfile) => ({
        id: artist.id,
        name: artist.artistName,
      }));
      const genres = genresResponse.genres.map((genre: Genre) => ({
        id: genre.id,
        name: genre.name,
      }));
      const labels = labelsResponse.labels.map((label: Label) => ({
        id: label.id,
        name: label.name,
      }));

      setAvailableArtists(artists);
      setAvailableGenres(genres);
      setAvailableLabels(labels);

    } catch (error) {
      console.error('Failed to fetch metadata for editing:', error);
      toast.error('Failed to load options for editing.');
      setIsEditModalOpen(false);
    } finally {
      setIsMetadataLoading(false);
    }
  }, [track]);

  const handleEditClick = () => {
    if (!track) return;
    setIsEditModalOpen(true);
    fetchMetadata();
  };

  const handleUpdateTrack = async (trackId: string, formData: FormData) => {
    if (!track) return;
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('Authentication token not found.');

      await api.tracks.update(trackId, formData, token);
      await fetchTrackDetails();

      toast.success('Track updated successfully');
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Update track error:', error);
      const errorMessage =
        (error as any)?.response?.data?.message || 'Failed to update track';
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDuration = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds === Infinity) {
        return '--:--';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div
        className={`container mx-auto space-y-6 p-4 pb-20 ${theme === 'dark' ? 'text-white' : ''}`}
      >
        <Button variant="ghost" disabled className="mb-4 opacity-50">
          <LucideArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex flex-col md:flex-row items-start gap-6">
          <Skeleton className="w-40 h-40 md:w-48 md:h-48 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-3 mt-2 md:mt-0">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
        <div className="mt-8 overflow-x-auto">
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`container mx-auto p-4 ${theme === 'dark' ? 'text-white' : ''}`}>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <LucideArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
        <Button onClick={fetchTrackDetails} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!track) {
    return (
      <div className={`container mx-auto p-4 ${theme === 'dark' ? 'text-white' : ''}`}>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <LucideArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p>Track not found.</p>
      </div>
    );
  }

  const genres = track.genres?.map((g) => g.genre) || [];
  const allArtists = [
    track.artist,
    ...(track.featuredArtists?.map((fa) => fa.artistProfile) || []),
  ];

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background: dominantColor
          ? `linear-gradient(180deg,
            ${dominantColor}99 0%,
            ${dominantColor}50 15%,
            ${dominantColor}10 40%,
            ${theme === 'light' ? '#f9fafb' : '#111827'} 70%)`
          : theme === 'light'
          ? 'linear-gradient(180deg, #e5e7eb 0%, #f9fafb 70%)'
          : 'linear-gradient(180deg, #374151 0%, #111827 70%)',
      }}
    >
      <div className="px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <Button
          variant="default"
          onClick={() => router.back()}
          className="mb-4 -ml-4 text-white focus-visible:ring-white/50 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: dominantColor || (theme === 'dark' ? '#374151' : '#6b7280') }}
        >
          <LucideArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="relative w-40 h-40 md:w-48 md:h-48 flex-shrink-0 shadow-lg rounded-md">
            <Image
              src={coverImageUrl}
              alt={track.title || 'Track cover'}
              fill
              sizes="(max-width: 768px) 160px, 192px"
              style={{ objectFit: 'cover' }}
              className="rounded-md"
              priority
              onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/default-track.jpg';
              }}
            />
          </div>
          <div className="flex-1 space-y-2 mt-2 md:mt-0">
            <h1 className={`text-3xl md:text-4xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {track.title}
            </h1>
            <Link
              href={`/artist/profile/${track.artist.id}`}
              className={`text-lg hover:underline flex items-center gap-1 ${theme === 'dark' ? 'text-white/90' : 'text-gray-800'}`}
            >
              {track.artist.artistName}
              {track.artist.isVerified && (
                <Verified className="w-4 h-4 ml-1 flex-shrink-0" />
              )}
            </Link>
            <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <CalendarDays className="w-3.5 h-3.5" />
                Released: {track.releaseDate ? new Date(track.releaseDate).toISOString().split('T')[0] : 'N/A'}
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(track.duration)}
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Music className="w-3.5 h-3.5" /> Track
              </span>
              <span className={`flex items-center gap-1.5 whitespace-nowrap ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
                 {track.playCount !== null && track.playCount !== undefined ? track.playCount.toLocaleString() : '0'} plays
              </span>
            </div>
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {genres.map((genre) => (
                  <Badge key={genre.id} variant={theme === 'dark' ? 'secondary' : 'outline'} className="cursor-default">
                    {genre.name}
                  </Badge>
                ))}
              </div>
            )}
            {track.label && (
                 <div className="text-xs text-muted-foreground pt-1">
                    © {track.label.name}
                 </div>
            )}
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <div className={`rounded-md border backdrop-blur-sm ${theme === 'dark' ? 'border-gray-700 bg-black/20' : 'border-gray-200 bg-white/60'}`}>
            <div className="grid grid-cols-[20px_3fr_2fr_1fr_minmax(50px,auto)] items-center gap-4 px-4 py-2 text-xs font-medium border-b text-muted-foreground">
              <span className="text-center">#</span>
              <span>Title</span>
              <span>Artist</span>
              <span className="text-center">Status</span>
              <span className="text-right">Edit</span>
            </div>

            <div className="grid grid-cols-[20px_3fr_2fr_1fr_minmax(50px,auto)] items-center gap-4 px-4 py-3 text-sm">
              <span className="text-muted-foreground font-medium text-center">1</span>
              <span className={`font-medium truncate ${ theme === 'dark' ? 'text-white' : 'text-gray-900' }`}>
                {track.title}
              </span>
              <span className={`truncate ${ theme === 'dark' ? 'text-white/80' : 'text-gray-700' }`}>
                {allArtists.map((a) => a.artistName).join(', ')}
              </span>
              <div className="flex items-center justify-center">
                <span className={`flex items-center gap-1 text-xs ${track.isActive ? (theme === 'dark' ? 'text-green-400' : 'text-green-600') : (theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}`}>
                  <Eye className="w-3 h-3" />
                  {track.isActive ? 'Visible' : 'Hidden'}
                </span>
              </div>
              <div className="flex items-center justify-end">
                 <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleEditClick}
                    disabled={loading || isUpdating || isMetadataLoading}
                    className={`w-7 h-7 ${theme === 'dark' ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                    title="Edit Track"
                 >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
              </div>
            </div>
          </div>
        </div>

        {isEditModalOpen && track && (
            <EditTrackModal
                track={track}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={handleUpdateTrack}
                availableArtists={availableArtists}
                availableGenres={availableGenres}
                availableLabels={availableLabels}
                theme={theme}
            />
        )}
      </div>
    </div>
  );
}
