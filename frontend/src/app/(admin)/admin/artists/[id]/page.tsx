'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import {
  ArrowLeft,
  User,
  Check,
  RefreshCw,
  Disc,
  Music,
  Plus,
  Play,
  Pause,
} from 'lucide-react';
import Link from 'next/link';
import { ArtistProfile } from '@/types';

export default function ArtistDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'albums' | 'tracks'>('albums');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) throw new Error('No authentication token found');

        const response = await api.admin.getArtistById(id, token);
        console.log('Artist data:', response);
        if (!response) throw new Error('Artist not found');
        setArtist(response);
      } catch (err) {
        console.error('Error fetching artist:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch artist');
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [id]);

  const handleVerify = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.admin.verifyArtist({ userId: id }, token);
      if (response && response.user) {
        setArtist(response.user);
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
        setArtist((prev: ArtistProfile) => ({
          ...prev,
          monthlyListeners: response.artistProfile.monthlyListeners,
        }));
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center">
        <Link
          href="/admin/artists"
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Artists</span>
        </Link>
      </div>

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08] p-6">
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          {/* Artist Info - Left Column */}
          <div className="space-y-4">
            {artist.avatar ? (
              <div className="relative w-60 h-60">
                <img
                  src={artist.avatar}
                  alt={artist.artistName}
                  className="w-full h-full rounded-lg object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '/images/default-avatar.jpg';
                  }}
                />
              </div>
            ) : (
              <div className="w-60 h-60 rounded-lg bg-white/[0.03] flex items-center justify-center">
                <User className="w-20 h-20 text-white/60" />
              </div>
            )}
            <div className="bg-white/[0.03] rounded-lg p-4">
              <p className="text-sm text-white/60 mb-1">Monthly Listeners</p>
              <p className="text-2xl font-bold text-white">
                {artist.monthlyListeners?.toLocaleString() ?? 0}
              </p>
            </div>
          </div>

          {/* Artist Info - Right Column */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight text-white">
                  {artist.artistName || artist.user?.name}
                </h1>
                {artist.isVerified && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-500/10 text-green-500">
                    <Check className="w-4 h-4 mr-1" />
                    Verified
                  </span>
                )}
              </div>

              {artist.bio && (
                <p className="text-white/60 text-lg leading-relaxed">
                  {artist.bio}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleVerify}
                disabled={artist.isVerified || isUpdating}
                className={`min-w-[200px] px-4 py-2 rounded-md ${
                  artist.isVerified
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-[#A57865] hover:bg-[#7d5d50]'
                } text-white`}
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : artist.isVerified ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Verified Artist
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Verify Artist
                  </>
                )}
              </button>

              <button
                onClick={handleUpdateMonthlyListeners}
                disabled={isUpdating}
                className="min-w-[200px] px-4 py-2 bg-white/10 rounded-md hover:bg-white/20 text-white"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`}
                />
                Update Monthly Listeners
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-white/[0.08] mt-8">
              <div className="flex gap-8">
                <button
                  onClick={() => setActiveTab('albums')}
                  className={`pb-4 px-1 ${
                    activeTab === 'albums'
                      ? 'border-b-2 border-white text-white'
                      : 'text-white/60'
                  }`}
                >
                  Albums ({artist.albums?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('tracks')}
                  className={`pb-4 px-1 ${
                    activeTab === 'tracks'
                      ? 'border-b-2 border-white text-white'
                      : 'text-white/60'
                  }`}
                >
                  Tracks ({artist.tracks?.length || 0})
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="mt-6">
              {/* Albums Tab */}
              {activeTab === 'albums' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Albums</h2>
                    <Link
                      href={`/admin/artists/${id}/albums/new`}
                      className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full hover:bg-white/20"
                    >
                      <Plus className="w-4 h-4" />
                      New Album
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {artist.albums?.map((album: any) => (
                      <div
                        key={album.id}
                        className="bg-white/[0.03] rounded-lg p-4 hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {album.coverUrl ? (
                            <img
                              src={album.coverUrl}
                              alt={album.title}
                              className="w-16 h-16 rounded-md object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-md bg-white/[0.03] flex items-center justify-center">
                              <Disc className="w-8 h-8 text-white/60" />
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/admin/artists/${id}/albums/${album.id}`}
                              className="text-lg font-semibold text-white hover:underline"
                            >
                              {album.title}
                            </Link>
                            <p className="text-sm text-white/60">
                              {album.totalTracks} tracks ·{' '}
                              {formatDuration(album.duration)}
                            </p>
                            <p className="text-sm text-white/60">
                              {new Date(album.releaseDate).getFullYear()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracks Tab */}
              {activeTab === 'tracks' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Tracks</h2>
                    <Link
                      href={`/admin/artists/${id}/tracks/new`}
                      className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full hover:bg-white/20"
                    >
                      <Plus className="w-4 h-4" />
                      New Track
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {artist.tracks?.map((track: any) => (
                      <div
                        key={track.id}
                        className="bg-white/[0.03] rounded-lg p-4 hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() =>
                              setPlayingTrackId(
                                playingTrackId === track.id ? null : track.id
                              )
                            }
                            className="text-white/60 hover:text-white"
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
                            <div className="w-12 h-12 rounded-md bg-white/[0.03] flex items-center justify-center">
                              <Music className="w-6 h-6 text-white/60" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">
                              {track.title}
                            </h3>
                            <p className="text-sm text-white/60">
                              {track.album?.title || 'Single'} ·{' '}
                              {formatDuration(track.duration)}
                            </p>
                          </div>
                          <div className="text-sm text-white/60">
                            {track.playCount.toLocaleString()} plays
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
