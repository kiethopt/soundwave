'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { ArrowLeft, User, Check, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Artist } from '@/types';

export default function ArtistDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) throw new Error('No authentication token found');

        const response = await api.artists.getById(id, token);
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
      setArtist(response.user); // Ensure this includes the avatar
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
      console.log('API Response:', response); // Log the API response

      // Ensure the response includes all necessary fields
      if (response && response.avatar && response.artistProfile) {
        setArtist(response);
      } else {
        throw new Error('Incomplete data received from API');
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
          <div className="space-y-4">
            {artist.avatar ? (
              <div className="relative w-60 h-60">
                <img
                  src={artist.avatar}
                  alt={artist.name}
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
                {artist.artistProfile?.monthlyListeners.toLocaleString() ?? 0}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold tracking-tight text-white">
                  {artist.name}
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
          </div>
        </div>
      </div>
    </div>
  );
}
