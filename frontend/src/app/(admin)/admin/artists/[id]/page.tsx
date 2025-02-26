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
import { MoreVertical, Verified } from '@/components/ui/Icons';
import { ArtistProfile, Album, Track } from '@/types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';
import { EditArtistModal } from '@/components/data-table/data-table-modals';

export default function ArtistDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme } = useTheme();

  // Xử lý URL cho query param "albumPage":
  // Nếu giá trị âm hoặc bằng "1" => loại bỏ param khỏi URL
  useEffect(() => {
    const albumPageParam = Number(searchParams.get('albumPage'));
    if (albumPageParam < 1 || searchParams.get('albumPage') === '1') {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('albumPage');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/admin/artists/${id}${queryStr}`);
    }
  }, [searchParams, router, id]);

  // Xử lý URL cho query param "trackPage":
  // Nếu giá trị âm hoặc bằng "1" => loại bỏ param khỏi URL
  useEffect(() => {
    const trackPageParam = Number(searchParams.get('trackPage'));
    if (trackPageParam < 1 || searchParams.get('trackPage') === '1') {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('trackPage');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/admin/artists/${id}${queryStr}`);
    }
  }, [searchParams, router, id]);

  // Dùng giá trị đã làm sạch cho phân trang (nếu giá trị không hợp lệ thì ép về 1)
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
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const albumPageRef = useRef<HTMLInputElement>(null);
  const trackPageRef = useRef<HTMLInputElement>(null);

  // Hàm cập nhật query param theo key và value.
  // Nếu value < 1 thì chuyển về 1 và loại bỏ param khỏi URL.
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

        // Nếu số trang vượt quá tổng số pages trả về, xóa param khỏi URL.
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

  const handleArtistUpdate = (updatedArtist: Partial<ArtistProfile>) => {
    setArtist((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        artistName: updatedArtist.artistName ?? prev.artistName,
        bio: updatedArtist.bio ?? prev.bio,
        avatar: updatedArtist.avatar ?? prev.avatar,
      };
    });
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
    <div className="container mx-auto space-y-6 p-4 h-full mb-16 md:mb-0">
      <div className="flex items-center">
        <Link
          href="/admin/artists"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            theme === 'light'
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
              : 'bg-white/10 hover:bg-white/15 text-white/80 hover:text-white'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
      </div>

      <div
        className={`rounded-xl overflow-hidden border p-6 backdrop-blur-sm relative ${
          theme === 'light'
            ? 'bg-white border-gray-200'
            : 'bg-[#121212] border-white/10'
        }`}
      >
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="relative group">
              {artist?.avatar ? (
                <img
                  src={artist.avatar}
                  alt={artist.artistName}
                  className={`w-full md:w-60 h-60 rounded-xl object-cover shadow-xl border-4 ${
                    theme === 'light' ? 'border-gray-200' : 'border-white/10'
                  }`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '/images/default-avatar.jpg';
                  }}
                />
              ) : (
                <div
                  className={`w-full md:w-60 h-60 rounded-xl flex items-center justify-center ${
                    theme === 'light'
                      ? 'bg-gradient-to-br from-gray-100 to-gray-200'
                      : 'bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a]'
                  }`}
                >
                  <User
                    className={`w-16 h-16 md:w-20 md:h-20 ${
                      theme === 'light' ? 'text-gray-400' : 'text-white/60'
                    }`}
                  />
                </div>
              )}
            </div>

            <div
              className={`rounded-xl p-4 border ${
                theme === 'light'
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <p
                className={`text-xs md:text-sm ${
                  theme === 'light' ? 'text-gray-600' : 'text-white/60'
                } mb-1`}
              >
                Monthly Listeners
              </p>
              <p
                className={`text-xl md:text-2xl font-bold ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}
              >
                {artist?.monthlyListeners?.toLocaleString() ?? 0}
              </p>
            </div>
          </div>
          {/* Right Column */}
          <div className="space-y-6 flex flex-col">
            {/* Header Section */}
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                <h1
                  className={`text-2xl md:text-4xl font-bold tracking-tight ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  {artist?.artistName || artist?.user?.name}
                </h1>
                {artist?.isVerified && (
                  <span title="Verified Artist">
                    <Verified className="w-5 h-5 md:w-6 md:h-6" />
                  </span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <MoreVertical className="w-5 h-5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                      Edit Artist
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {artist?.bio && (
                <p
                  className={`text-sm md:text-lg leading-relaxed max-w-3xl ${
                    theme === 'light' ? 'text-gray-600' : 'text-white/60'
                  }`}
                >
                  {artist.bio}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleVerify}
                disabled={artist?.isVerified || isUpdating}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm',
                  artist?.isVerified
                    ? theme === 'light'
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : 'bg-green-500/10 text-green-400 cursor-not-allowed'
                    : theme === 'light'
                    ? 'bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20'
                    : 'bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20'
                )}
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>
                      {artist?.isVerified ? 'Verified' : 'Verify Artist'}
                    </span>
                  </>
                )}
              </button>

              <button
                onClick={handleUpdateMonthlyListeners}
                disabled={isUpdating}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg hover:bg-opacity-90 border text-sm ${
                  theme === 'light'
                    ? 'bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200'
                    : 'bg-white/5 text-white/90 border-white/10 hover:bg-white/10'
                }`}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`}
                />
                <span>Update Listeners</span>
              </button>
            </div>

            {/* Tab Navigation */}
            <div
              className={`border-b ${
                theme === 'light' ? 'border-gray-200' : 'border-white/10'
              }`}
            >
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('albums')}
                  className={`pb-3 px-1 text-sm font-medium ${
                    activeTab === 'albums'
                      ? theme === 'light'
                        ? 'border-b-2 border-gray-900 text-gray-900'
                        : 'border-b-2 border-white text-white'
                      : theme === 'light'
                      ? 'text-gray-600 hover:text-gray-900'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  Albums ({artist?.albums?.total ?? 0})
                </button>
                <button
                  onClick={() => setActiveTab('tracks')}
                  className={`pb-3 px-1 text-sm font-medium ${
                    activeTab === 'tracks'
                      ? theme === 'light'
                        ? 'border-b-2 border-gray-900 text-gray-900'
                        : 'border-b-2 border-white text-white'
                      : theme === 'light'
                      ? 'text-gray-600 hover:text-gray-900'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  Tracks ({artist?.tracks?.total ?? 0})
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0">
              {/* Albums Tab */}
              {activeTab === 'albums' && (
                <div className="space-y-6">
                  {artist?.albums?.data && artist.albums.data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(artist.albums.data || []).map((album: Album) => (
                        <div
                          key={album.id}
                          className={`rounded-lg p-2 border ${
                            theme === 'light'
                              ? 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                              : 'bg-white/5 hover:bg-white/10 border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {album.coverUrl ? (
                              <img
                                src={album.coverUrl}
                                alt={album.title}
                                className="w-12 h-12 rounded-md object-cover"
                              />
                            ) : (
                              <div
                                className={`w-12 h-12 rounded-md flex items-center justify-center ${
                                  theme === 'light'
                                    ? 'bg-gray-200'
                                    : 'bg-white/10'
                                }`}
                              >
                                <Disc
                                  className={`w-6 h-6 ${
                                    theme === 'light'
                                      ? 'text-gray-400'
                                      : 'text-white/60'
                                  }`}
                                />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/admin/artists/${artist.id}/albums/${album.id}`}
                                className={`text-sm font-semibold hover:underline truncate block ${
                                  theme === 'light'
                                    ? 'text-gray-900'
                                    : 'text-white'
                                }`}
                              >
                                {album.title}
                              </Link>
                              <p
                                className={`text-xs mt-0.5 truncate ${
                                  theme === 'light'
                                    ? 'text-gray-600'
                                    : 'text-white/60'
                                }`}
                              >
                                {album.totalTracks} tracks &middot;{' '}
                                {formatDuration(album.duration)}
                              </p>
                              <p
                                className={`text-xs truncate ${
                                  theme === 'light'
                                    ? 'text-gray-600'
                                    : 'text-white/60'
                                }`}
                              >
                                {new Date(album.releaseDate).getFullYear()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p
                      className={
                        theme === 'light' ? 'text-gray-600' : 'text-white'
                      }
                    >
                      No albums found on this page.
                    </p>
                  )}

                  {/* Album Pagination */}
                  {artist?.albums && artist.albums.total > 0 && (
                    <>
                      {/* Mobile Pagination */}
                      <div className="flex md:hidden items-center justify-center gap-2 mt-4">
                        <button
                          onClick={handleAlbumPrev}
                          disabled={sanitizedAlbumPage <= 1}
                          className={`px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                            theme === 'light'
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                              : 'bg-white/5 hover:bg-white/10 text-white'
                          }`}
                        >
                          Previous
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={`px-3 py-2 rounded-md text-sm ${
                              theme === 'light'
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                                : 'bg-white/5 hover:bg-white/10 text-white'
                            }`}
                          >
                            {sanitizedAlbumPage} of{' '}
                            {artist.albums?.totalPages ?? 1}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className={`p-4 w-[200px] ${
                              theme === 'light'
                                ? 'bg-white border-gray-200 text-gray-900'
                                : 'bg-[#282828] border-white/[0.1] text-white'
                            }`}
                          >
                            <div className="space-y-3">
                              <div
                                className={`text-xs ${
                                  theme === 'light'
                                    ? 'text-gray-500'
                                    : 'text-white/60'
                                }`}
                              >
                                Go to page:
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={artist.albums?.totalPages ?? 1}
                                  defaultValue={sanitizedAlbumPage}
                                  ref={albumPageRef}
                                  className={`w-full px-2 py-1 rounded-md text-center focus:outline-none focus:ring-2 text-sm ${
                                    theme === 'light'
                                      ? 'bg-gray-50 border-gray-200 focus:ring-gray-300'
                                      : 'bg-white/5 border-white/[0.1] focus:ring-[#ffaa3b]/50'
                                  }`}
                                  placeholder="Page"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const page = albumPageRef.current
                                    ? parseInt(albumPageRef.current.value, 10)
                                    : NaN;
                                  if (!isNaN(page)) {
                                    updateQueryParam('albumPage', page);
                                  }
                                }}
                                className="w-full px-3 py-1.5 rounded-md bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20 text-sm"
                              >
                                Go to Page
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
                          className={`px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                            theme === 'light'
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                              : 'bg-white/5 hover:bg-white/10 text-white'
                          }`}
                        >
                          Next
                        </button>
                      </div>

                      {/* Desktop Pagination */}
                      <div
                        className={`hidden md:flex items-center justify-center gap-2 mt-4 text-sm ${
                          theme === 'light' ? 'text-gray-600' : 'text-white/60'
                        }`}
                      >
                        <button
                          onClick={handleAlbumPrev}
                          disabled={sanitizedAlbumPage <= 1}
                          className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border ${
                            theme === 'light'
                              ? 'bg-gray-50 text-gray-900 border-gray-200 hover:bg-gray-100'
                              : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                          }`}
                        >
                          Previous
                        </button>
                        <span>Page</span>
                        <div
                          className={`px-3 py-1 rounded-lg border ${
                            theme === 'light'
                              ? 'bg-gray-50 border-gray-200 text-gray-900'
                              : 'bg-white/5 border-white/10 text-white'
                          }`}
                        >
                          <span className="font-medium">
                            {sanitizedAlbumPage}
                          </span>
                        </div>
                        <span>of {artist.albums?.totalPages ?? 1}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={artist.albums?.totalPages ?? 1}
                            defaultValue={sanitizedAlbumPage}
                            ref={albumPageRef}
                            className={`w-16 px-2 py-1 rounded-md text-center focus:outline-none focus:ring-2 text-sm ${
                              theme === 'light'
                                ? 'bg-gray-50 border-gray-200 focus:ring-gray-300 text-gray-900'
                                : 'bg-white/5 border-white/[0.1] focus:ring-[#ffaa3b]/50 text-white'
                            }`}
                            placeholder="Page"
                          />
                          <button
                            onClick={() => {
                              const page = albumPageRef.current
                                ? parseInt(albumPageRef.current.value, 10)
                                : NaN;
                              if (!isNaN(page)) {
                                updateQueryParam('albumPage', page);
                              }
                            }}
                            className={`px-3 py-1 rounded-md text-sm ${
                              theme === 'light'
                                ? 'bg-gray-900 text-white hover:bg-gray-800'
                                : 'bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20'
                            }`}
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
                          className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border ${
                            theme === 'light'
                              ? 'bg-gray-50 text-gray-900 border-gray-200 hover:bg-gray-100'
                              : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                          }`}
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
                  {artist?.tracks?.data && artist.tracks.data.length > 0 ? (
                    <div className="space-y-1">
                      {(artist.tracks.data || []).map((track: Track) => (
                        <div
                          key={track.id}
                          className={`rounded-md p-2 flex items-center gap-2 border ${
                            theme === 'light'
                              ? 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                              : 'bg-white/5 hover:bg-white/10 border-white/10'
                          }`}
                        >
                          <button
                            onClick={() =>
                              setPlayingTrackId(
                                playingTrackId === track.id ? null : track.id
                              )
                            }
                            className={`flex-shrink-0 ${
                              theme === 'light'
                                ? 'text-gray-600 hover:text-gray-900'
                                : 'text-white/60 hover:text-white'
                            }`}
                          >
                            {playingTrackId === track.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                          {track.coverUrl ? (
                            <img
                              src={track.coverUrl}
                              alt={track.title}
                              className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                                theme === 'light'
                                  ? 'bg-gray-200'
                                  : 'bg-white/10'
                              }`}
                            >
                              <Music
                                className={`w-4 h-4 ${
                                  theme === 'light'
                                    ? 'text-gray-400'
                                    : 'text-white/60'
                                }`}
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 grid grid-cols-[1fr_auto] items-center gap-2">
                            <div className="min-w-0">
                              <h3
                                className={`text-sm font-medium truncate ${
                                  theme === 'light'
                                    ? 'text-gray-900'
                                    : 'text-white'
                                }`}
                              >
                                {track.title}
                              </h3>
                              <p
                                className={`text-xs truncate ${
                                  theme === 'light'
                                    ? 'text-gray-600'
                                    : 'text-white/60'
                                }`}
                              >
                                {track.album?.title || 'Single'} &middot;{' '}
                                {formatDuration(track.duration)}
                              </p>
                            </div>
                            <div
                              className={`text-xs flex-shrink-0 ${
                                theme === 'light'
                                  ? 'text-gray-600'
                                  : 'text-white/60'
                              }`}
                            >
                              {track.playCount.toLocaleString()} plays
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p
                      className={
                        theme === 'light' ? 'text-gray-600' : 'text-white'
                      }
                    >
                      No tracks found on this page.
                    </p>
                  )}

                  {/* Track Pagination */}
                  {artist?.tracks && artist.tracks.total > 0 && (
                    <div className="mt-6">
                      {/* Mobile Pagination */}
                      <div className="flex md:hidden items-center justify-center gap-2">
                        <button
                          onClick={handleTrackPrev}
                          disabled={sanitizedTrackPage <= 1}
                          className={`px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                            theme === 'light'
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                              : 'bg-white/5 hover:bg-white/10 text-white'
                          }`}
                        >
                          Previous
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={`px-3 py-2 rounded-md text-sm ${
                              theme === 'light'
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                                : 'bg-white/5 hover:bg-white/10 text-white'
                            }`}
                          >
                            {sanitizedTrackPage} of{' '}
                            {artist.tracks?.totalPages ?? 1}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className={`p-4 w-[200px] ${
                              theme === 'light'
                                ? 'bg-white border-gray-200 text-gray-900'
                                : 'bg-[#282828] border-white/[0.1] text-white'
                            }`}
                          >
                            <div className="space-y-3">
                              <div
                                className={`text-xs ${
                                  theme === 'light'
                                    ? 'text-gray-500'
                                    : 'text-white/60'
                                }`}
                              >
                                Go to page:
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={artist.tracks?.totalPages ?? 1}
                                  defaultValue={sanitizedTrackPage}
                                  ref={trackPageRef}
                                  className={`w-full px-2 py-1 rounded-md text-center focus:outline-none focus:ring-2 text-sm ${
                                    theme === 'light'
                                      ? 'bg-gray-50 border-gray-200 focus:ring-gray-300'
                                      : 'bg-white/5 border-white/[0.1] focus:ring-[#ffaa3b]/50'
                                  }`}
                                  placeholder="Page"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const page = trackPageRef.current
                                    ? parseInt(trackPageRef.current.value, 10)
                                    : NaN;
                                  if (!isNaN(page)) {
                                    updateQueryParam('trackPage', page);
                                  }
                                }}
                                className="w-full px-3 py-1.5 rounded-md bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20 text-sm"
                              >
                                Go to Page
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
                          className={`px-3 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                            theme === 'light'
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                              : 'bg-white/5 hover:bg-white/10 text-white'
                          }`}
                        >
                          Next
                        </button>
                      </div>

                      {/* Desktop Pagination */}
                      <div
                        className={`hidden md:flex items-center justify-center gap-2 text-sm ${
                          theme === 'light' ? 'text-gray-600' : 'text-white/60'
                        }`}
                      >
                        <button
                          onClick={handleTrackPrev}
                          disabled={sanitizedTrackPage <= 1}
                          className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border ${
                            theme === 'light'
                              ? 'bg-gray-50 text-gray-900 border-gray-200 hover:bg-gray-100'
                              : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                          }`}
                        >
                          Previous
                        </button>
                        <span>Page</span>
                        <div
                          className={`px-3 py-1 rounded-lg border ${
                            theme === 'light'
                              ? 'bg-gray-50 border-gray-200 text-gray-900'
                              : 'bg-white/5 border-white/10 text-white'
                          }`}
                        >
                          <span className="font-medium">
                            {sanitizedTrackPage}
                          </span>
                        </div>
                        <span>of {artist.tracks?.totalPages ?? 1}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={artist.tracks?.totalPages ?? 1}
                            defaultValue={sanitizedTrackPage}
                            ref={trackPageRef}
                            className={`w-16 px-2 py-1 rounded-md text-center focus:outline-none focus:ring-2 text-sm ${
                              theme === 'light'
                                ? 'bg-gray-50 border-gray-200 focus:ring-gray-300 text-gray-900'
                                : 'bg-white/5 border-white/[0.1] focus:ring-[#ffaa3b]/50 text-white'
                            }`}
                            placeholder="Page"
                          />
                          <button
                            onClick={() => {
                              const page = trackPageRef.current
                                ? parseInt(trackPageRef.current.value, 10)
                                : NaN;
                              if (!isNaN(page)) {
                                updateQueryParam('trackPage', page);
                              }
                            }}
                            className={`px-3 py-1 rounded-md text-sm ${
                              theme === 'light'
                                ? 'bg-gray-900 text-white hover:bg-gray-800'
                                : 'bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20'
                            }`}
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
                          className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border ${
                            theme === 'light'
                              ? 'bg-gray-50 text-gray-900 border-gray-200 hover:bg-gray-100'
                              : 'bg-white/5 text-white border-white/10 hover:bg-white/10'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Artist Modal */}
      <EditArtistModal
        artist={isEditModalOpen ? artist : null}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleArtistUpdate}
        theme={theme}
      />
    </div>
  );
}
