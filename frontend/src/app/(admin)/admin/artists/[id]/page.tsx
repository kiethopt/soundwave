'use client';

import { useState, useEffect, use } from 'react';
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
import { cn } from '@/lib/utils';

export default function ArtistDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
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
        if (!response) throw new Error('Artist not found');

        // Kiểm tra role của artist
        if (response.role !== 'ARTIST') {
          throw new Error('This user is not an artist');
        }

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
    <div className="container mx-auto space-y-6">
      <div className="flex items-center">
        <Link
          href="/admin/artists"
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Artists</span>
        </Link>
      </div>

      <div className="bg-[#121212] rounded-xl overflow-hidden border border-white/10 p-6 backdrop-blur-sm">
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="relative group">
              {artist.avatar ? (
                <img
                  src={artist.avatar}
                  alt={artist.artistName}
                  className="w-60 h-60 rounded-xl object-cover shadow-xl border-4 border-white/10"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '/images/default-avatar.jpg';
                  }}
                />
              ) : (
                <div className="w-60 h-60 rounded-xl bg-gradient-to-br from-[#2c2c2c] to-[#1a1a1a] flex items-center justify-center">
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
            {/* Header Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-4xl font-bold tracking-tight text-white">
                  {artist.artistName || artist.user?.name}
                </h1>
                {artist.isVerified && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                    <Check className="w-4 h-4 mr-1.5" />
                    Verified Artist
                  </span>
                )}
              </div>

              {artist.bio && (
                <p className="text-white/60 text-lg leading-relaxed max-w-3xl">
                  {artist.bio}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleVerify}
                disabled={artist.isVerified || isUpdating}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all',
                  artist.isVerified
                    ? 'bg-green-500/10 text-green-400 cursor-not-allowed'
                    : 'bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20'
                )}
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {artist.isVerified ? 'Verified' : 'Verify Artist'}
                  </>
                )}
              </button>

              <button
                onClick={handleUpdateMonthlyListeners}
                disabled={isUpdating}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 text-white/90 rounded-xl hover:bg-white/10 border border-white/10 transition-all"
              >
                <RefreshCw
                  className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`}
                />
                Update Listeners
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-white/10 mt-8">
              <div className="flex gap-8">
                <button
                  onClick={() => setActiveTab('albums')}
                  className={`pb-4 px-1 font-medium ${
                    activeTab === 'albums'
                      ? 'border-b-2 border-white text-white'
                      : 'text-white/60 hover:text-white/80'
                  } transition-colors`}
                >
                  Albums ({artist.albums?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('tracks')}
                  className={`pb-4 px-1 font-medium ${
                    activeTab === 'tracks'
                      ? 'border-b-2 border-white text-white'
                      : 'text-white/60 hover:text-white/80'
                  } transition-colors`}
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
                  {/* Commented New Album Button */}
                  {/* <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Albums</h2>
                    <Link
                      href={`/admin/artists/${id}/albums/new`}
                      className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full hover:bg-white/20"
                    >
                      <Plus className="w-4 h-4" />
                      New Album
                    </Link>
                  </div> */}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {artist.albums?.map((album) => (
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
                              className="text-lg font-semibold text-white hover:underline"
                            >
                              {album.title}
                            </Link>
                            <p className="text-sm text-white/60 mt-1">
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
                  {/* Commented New Track Button */}
                  {/* <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Tracks</h2>
                    <Link
                      href={`/admin/artists/${id}/tracks/new`}
                      className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full hover:bg-white/20"
                    >
                      <Plus className="w-4 h-4" />
                      New Track
                    </Link>
                  </div> */}

                  <div className="space-y-2">
                    {artist.tracks?.map((track) => (
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
