'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import {
  ArrowLeft,
  User,
  RefreshCw,
  Disc,
  Music,
  Play,
  Pause,
} from 'lucide-react';
import { Verified } from '@/components/ui/Icons';
import { ArtistProfile, Album, Track } from '@/types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';

export default function ArtistDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const albumPageParam = Number(searchParams.get('albumPage'));
    if (albumPageParam < 1 || searchParams.get('albumPage') === '1') {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('albumPage');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/admin/artists/${id}${queryStr}`);
    }
  }, [searchParams, router, id]);

  useEffect(() => {
    const trackPageParam = Number(searchParams.get('trackPage'));
    if (trackPageParam < 1 || searchParams.get('trackPage') === '1') {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('trackPage');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/admin/artists/${id}${queryStr}`);
    }
  }, [searchParams, router, id]);

  const albumPageParam = Number(searchParams.get('albumPage'));
  const sanitizedAlbumPage = albumPageParam > 0 ? albumPageParam : 1;
  const trackPageParam = Number(searchParams.get('trackPage'));
  const sanitizedTrackPage = trackPageParam > 0 ? trackPageParam : 1;

  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'albums' | 'tracks'>('albums');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const albumPageRef = useRef<HTMLInputElement>(null);
  const trackPageRef = useRef<HTMLInputElement>(null);

  const updateQueryParam = (param: string, value: number) => {
    if (value < 1) {
      value = 1;
    }
    const current = new URLSearchParams(searchParams.toString());
    if (value === 1) {
      current.delete(param);
    } else {
      current.set(param, value.toString());
    }
    const queryStr = current.toString() ? `?${current.toString()}` : '';
    router.push(`/admin/artists/${id}${queryStr}`);
  };

  const handleAlbumPrev = () => {
    if (sanitizedAlbumPage > 1)
      updateQueryParam('albumPage', sanitizedAlbumPage - 1);
  };

  const handleAlbumNext = () => {
    if (artist?.albums && sanitizedAlbumPage < (artist.albums.totalPages ?? 1))
      updateQueryParam('albumPage', sanitizedAlbumPage + 1);
  };

  const handleTrackPrev = () => {
    if (sanitizedTrackPage > 1)
      updateQueryParam('trackPage', sanitizedTrackPage - 1);
  };

  const handleTrackNext = () => {
    if (artist?.tracks && sanitizedTrackPage < (artist.tracks.totalPages ?? 1))
      updateQueryParam('trackPage', sanitizedTrackPage + 1);
  };

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) throw new Error('No authentication token found');
        const queryString = `?albumPage=${sanitizedAlbumPage}&albumLimit=6&trackPage=${sanitizedTrackPage}&trackLimit=10`;
        const response = await api.admin.getArtistById(
          `${id}${queryString}`,
          token
        );
        if (!response) throw new Error('Artist not found');

        if (response.role !== 'ARTIST') {
          throw new Error('This user is not an artist');
        }
        setArtist(response);

        if (
          response.albums &&
          response.albums.totalPages < sanitizedAlbumPage
        ) {
          const current = new URLSearchParams(searchParams.toString());
          current.delete('albumPage');
          router.replace(
            `/admin/artists/${id}${
              current.toString() ? '?' + current.toString() : ''
            }`
          );
        }
        if (
          response.tracks &&
          response.tracks.totalPages < sanitizedTrackPage
        ) {
          const current = new URLSearchParams(searchParams.toString());
          current.delete('trackPage');
          router.replace(
            `/admin/artists/${id}${
              current.toString() ? '?' + current.toString() : ''
            }`
          );
        }
      } catch (err) {
        console.error('Error fetching artist:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch artist');
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [id, sanitizedAlbumPage, sanitizedTrackPage, router, searchParams]);

  const handleVerify = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.admin.verifyArtist({ userId: id }, token);
      if (response && response.user) {
        setArtist((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            isVerified: true,
            verifiedAt: new Date().toISOString(),
            role: 'ARTIST',
          };
        });
      }
    } catch (err) {
      console.error('Error verifying artist:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify artist');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateMonthlyListeners = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.artists.updateMonthlyListeners(id, token);

      if (response && response.artistProfile) {
        setArtist((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            monthlyListeners: response.artistProfile.monthlyListeners,
          };
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error updating monthly listeners:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update monthly listeners'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
          {error || 'Artist not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 mb-10">
      {/* Header Section */}
      <div className="flex flex-col space-y-4">
        {/* Back Button - Luôn căn trái */}
        <div>
          <Link
            href="/admin/artists"
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Artists</span>
          </Link>
        </div>

        {/* Action Buttons - Căn phải trên desktop, căn giữa trên mobile */}
        <div className="flex sm:justify-end justify-center gap-2">
          <button
            onClick={handleVerify}
            disabled={artist.isVerified || isUpdating}
            className={cn(
              'flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg transition-all text-xs sm:text-sm min-w-[120px] sm:min-w-[140px]',
              artist.isVerified
                ? 'bg-green-500/10 text-green-400 cursor-not-allowed'
                : 'bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20'
            )}
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{artist.isVerified ? 'Verified' : 'Verify Artist'}</span>
          </button>

          <button
            onClick={handleUpdateMonthlyListeners}
            disabled={isUpdating}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-white/5 text-white/90 rounded-lg hover:bg-white/10 border border-white/10 transition-all text-xs sm:text-sm min-w-[120px] sm:min-w-[140px]"
          >
            <RefreshCw
              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                isUpdating ? 'animate-spin' : ''
              }`}
            />
            <span>Update Listeners</span>
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-[#121212] rounded-xl overflow-hidden border border-white/10 sm:p-8 p-4 backdrop-blur-sm">
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          {/* Left Column - Avatar & Stats */}
          <div className="space-y-4">
            <div className="relative group mx-auto md:mx-0 w-60 h-60">
              {artist.avatar ? (
                <img
                  src={artist.avatar}
                  alt={artist.artistName}
                  className="w-full h-full rounded-xl object-cover shadow-xl border-4 border-white/10"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '/images/default-avatar.jpg';
                  }}
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] flex items-center justify-center">
                  <User className="w-20 h-20 text-white/60" />
                </div>
              )}
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-sm text-white/60 mb-1">Monthly Listeners</p>
              <p className="text-2xl font-bold text-white">
                {artist.monthlyListeners?.toLocaleString() ?? 0}
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Artist Info */}
            <div className="space-y-4 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  {artist.artistName || artist.user?.name}
                </h1>
                {artist.isVerified && (
                  <span title="Verified Artist">
                    <Verified className="w-6 h-6" />
                  </span>
                )}
              </div>
              {artist.bio && (
                <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-3xl">
                  {artist.bio}
                </p>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-white/10">
              <div className="flex gap-8 flex-wrap justify-center md:justify-start">
                <button
                  onClick={() => setActiveTab('albums')}
                  className={`pb-4 px-1 font-medium text-sm sm:text-base ${
                    activeTab === 'albums'
                      ? 'border-b-2 border-white text-white'
                      : 'text-white/60 hover:text-white/80'
                  } transition-colors`}
                >
                  Albums ({artist.albums?.total ?? 0})
                </button>
                <button
                  onClick={() => setActiveTab('tracks')}
                  className={`pb-4 px-1 font-medium text-sm sm:text-base ${
                    activeTab === 'tracks'
                      ? 'border-b-2 border-white text-white'
                      : 'text-white/60 hover:text-white/80'
                  } transition-colors`}
                >
                  Tracks ({artist.tracks?.total ?? 0})
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="mt-6">
              {/* Albums Tab */}
              {activeTab === 'albums' && (
                <div className="space-y-6">
                  {artist.albums?.data && artist.albums.data.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(artist.albums.data || []).map((album: Album) => (
                        <div
                          key={album.id}
                          className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors border border-white/10"
                        >
                          <div className="flex items-center gap-4">
                            {album.coverUrl ? (
                              <img
                                src={album.coverUrl}
                                alt={album.title}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center">
                                <Disc className="w-8 h-8 text-white/60" />
                              </div>
                            )}
                            <div>
                              <Link
                                href={`/admin/artists/${id}/albums/${album.id}`}
                                className="text-base sm:text-lg font-semibold text-white hover:underline line-clamp-1"
                              >
                                {album.title}
                              </Link>
                              <p className="text-xs sm:text-sm text-white/60 mt-1">
                                {album.totalTracks} tracks &middot;{' '}
                                {formatDuration(album.duration)}
                              </p>
                              <p className="text-xs sm:text-sm text-white/60">
                                {new Date(album.releaseDate).getFullYear()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white text-center">No albums found.</p>
                  )}

                  {/* Pagination for Albums */}
                  {artist.albums && artist.albums.total > 0 && (
                    <>
                      {/* Mobile Pagination */}
                      <div className="flex md:hidden items-center justify-center gap-2 mt-4">
                        <button
                          onClick={handleAlbumPrev}
                          disabled={sanitizedAlbumPage <= 1}
                          className="px-3 py-2 bg-white/5 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Previous
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="px-3 py-2 bg-white/5 rounded-md hover:bg-white/10 text-sm">
                            {sanitizedAlbumPage} of{' '}
                            {artist.albums?.totalPages ?? 1}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#282828] border border-white/[0.1] text-white p-4 w-[200px]">
                            <div className="space-y-3">
                              <div className="text-xs text-white/60">
                                Go to page:
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={artist.albums?.totalPages ?? 1}
                                  defaultValue={sanitizedAlbumPage}
                                  ref={albumPageRef}
                                  className="w-full px-2 py-1 rounded-md bg-white/5 border border-white/[0.1] text-white text-center focus:outline-none focus:ring-2 focus:ring-[#ffaa3b]/50 text-sm"
                                  placeholder="Page"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const page = albumPageRef.current
                                    ? parseInt(albumPageRef.current.value, 10)
                                    : NaN;
                                  if (
                                    !isNaN(page) &&
                                    page >= 1 &&
                                    page <= (artist.albums?.totalPages ?? 1)
                                  ) {
                                    updateQueryParam('albumPage', page);
                                  }
                                }}
                                className="w-full px-3 py-1.5 rounded-md bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20 transition-colors text-sm"
                              >
                                Go
                              </button>
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <button
                          onClick={handleAlbumNext}
                          disabled={
                            sanitizedAlbumPage >=
                            (artist.albums?.totalPages ?? 1)
                          }
                          className="px-3 py-2 bg-white/5 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Next
                        </button>
                      </div>

                      {/* Desktop Pagination */}
                      <div className="hidden md:flex items-center justify-center gap-2 mt-4">
                        <button
                          onClick={handleAlbumPrev}
                          disabled={sanitizedAlbumPage <= 1}
                          className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 transition-colors text-sm"
                        >
                          Previous
                        </button>
                        <span className="text-white/60 text-sm">Page</span>
                        <div className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                          <span className="text-white font-medium text-sm">
                            {sanitizedAlbumPage}
                          </span>
                        </div>
                        <span className="text-white/60 text-sm">
                          of {artist.albums?.totalPages ?? 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={artist.albums?.totalPages ?? 1}
                            defaultValue={sanitizedAlbumPage}
                            ref={albumPageRef}
                            className="w-16 px-2 py-1 rounded-md bg-white/5 border border-white/[0.1] text-white text-center focus:outline-none focus:ring-2 focus:ring-[#ffaa3b]/50 text-sm"
                            placeholder="Page"
                          />
                          <button
                            onClick={() => {
                              const page = albumPageRef.current
                                ? parseInt(albumPageRef.current.value, 10)
                                : NaN;
                              if (
                                !isNaN(page) &&
                                page >= 1 &&
                                page <= (artist.albums?.totalPages ?? 1)
                              ) {
                                updateQueryParam('albumPage', page);
                              }
                            }}
                            className="px-3 py-1 rounded-md bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20 transition-colors text-sm"
                          >
                            Go
                          </button>
                        </div>
                        <button
                          onClick={handleAlbumNext}
                          disabled={
                            sanitizedAlbumPage >=
                            (artist.albums?.totalPages ?? 1)
                          }
                          className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 transition-colors text-sm"
                        >
                          Next
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tracks Tab */}
              {activeTab === 'tracks' && (
                <div className="space-y-6">
                  {artist.tracks?.data && artist.tracks.data.length > 0 ? (
                    <div className="space-y-2">
                      {(artist.tracks.data || []).map((track: Track) => (
                        <div
                          key={track.id}
                          className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors border border-white/10"
                        >
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() =>
                                setPlayingTrackId(
                                  playingTrackId === track.id ? null : track.id
                                )
                              }
                              className="text-white/60 hover:text-white transition-colors"
                            >
                              {playingTrackId === track.id ? (
                                <Pause className="w-6 h-6" />
                              ) : (
                                <Play className="w-6 h-6" />
                              )}
                            </button>
                            {track.coverUrl ? (
                              <img
                                src={track.coverUrl}
                                alt={track.title}
                                className="w-12 h-12 rounded-md object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-md bg-white/10 flex items-center justify-center">
                                <Music className="w-6 h-6 text-white/60" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white text-base sm:text-lg truncate">
                                {track.title}
                              </h3>
                              <p className="text-xs sm:text-sm text-white/60 truncate">
                                {track.album?.title || 'Single'} &middot;{' '}
                                {formatDuration(track.duration)}
                              </p>
                            </div>
                            <div className="text-xs sm:text-sm text-white/60 whitespace-nowrap">
                              {track.playCount.toLocaleString()} plays
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white text-center">No tracks found.</p>
                  )}

                  {/* Pagination for Tracks */}
                  {artist.tracks && artist.tracks.total > 0 && (
                    <>
                      {/* Mobile Pagination */}
                      <div className="flex md:hidden items-center justify-center gap-2 mt-4">
                        <button
                          onClick={handleTrackPrev}
                          disabled={sanitizedTrackPage <= 1}
                          className="px-3 py-2 bg-white/5 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Previous
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="px-3 py-2 bg-white/5 rounded-md hover:bg-white/10 text-sm">
                            {sanitizedTrackPage} of{' '}
                            {artist.tracks?.totalPages ?? 1}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#282828] border border-white/[0.1] text-white p-4 w-[200px]">
                            <div className="space-y-3">
                              <div className="text-xs text-white/60">
                                Go to page:
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={artist.tracks?.totalPages ?? 1}
                                  defaultValue={sanitizedTrackPage}
                                  ref={trackPageRef}
                                  className="w-full px-2 py-1 rounded-md bg-white/5 border border-white/[0.1] text-white text-center focus:outline-none focus:ring-2 focus:ring-[#ffaa3b]/50 text-sm"
                                  placeholder="Page"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const page = trackPageRef.current
                                    ? parseInt(trackPageRef.current.value, 10)
                                    : NaN;
                                  if (
                                    !isNaN(page) &&
                                    page >= 1 &&
                                    page <= (artist.tracks?.totalPages ?? 1)
                                  ) {
                                    updateQueryParam('trackPage', page);
                                  }
                                }}
                                className="w-full px-3 py-1.5 rounded-md bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20 transition-colors text-sm"
                              >
                                Go
                              </button>
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <button
                          onClick={handleTrackNext}
                          disabled={
                            sanitizedTrackPage >=
                            (artist.tracks?.totalPages ?? 1)
                          }
                          className="px-3 py-2 bg-white/5 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Next
                        </button>
                      </div>

                      {/* Desktop Pagination */}
                      <div className="hidden md:flex items-center justify-center gap-2 mt-4">
                        <button
                          onClick={handleTrackPrev}
                          disabled={sanitizedTrackPage <= 1}
                          className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 transition-colors text-sm"
                        >
                          Previous
                        </button>
                        <span className="text-white/60 text-sm">Page</span>
                        <div className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                          <span className="text-white font-medium text-sm">
                            {sanitizedTrackPage}
                          </span>
                        </div>
                        <span className="text-white/60 text-sm">
                          of {artist.tracks?.totalPages ?? 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={artist.tracks?.totalPages ?? 1}
                            defaultValue={sanitizedTrackPage}
                            ref={trackPageRef}
                            className="w-16 px-2 py-1 rounded-md bg-white/5 border border-white/[0.1] text-white text-center focus:outline-none focus:ring-2 focus:ring-[#ffaa3b]/50 text-sm"
                            placeholder="Page"
                          />
                          <button
                            onClick={() => {
                              const page = trackPageRef.current
                                ? parseInt(trackPageRef.current.value, 10)
                                : NaN;
                              if (
                                !isNaN(page) &&
                                page >= 1 &&
                                page <= (artist.tracks?.totalPages ?? 1)
                              ) {
                                updateQueryParam('trackPage', page);
                              }
                            }}
                            className="px-3 py-1 rounded-md bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20 transition-colors text-sm"
                          >
                            Go
                          </button>
                        </div>
                        <button
                          onClick={handleTrackNext}
                          disabled={
                            sanitizedTrackPage >=
                            (artist.tracks?.totalPages ?? 1)
                          }
                          className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 transition-colors text-sm"
                        >
                          Next
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
