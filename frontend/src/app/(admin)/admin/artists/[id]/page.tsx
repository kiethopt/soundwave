'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Artist } from '@/types';
import { api } from '@/utils/api';
import { ArrowLeft, User, Check, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/layout/Button/Button';

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

        const response = await fetch(api.artists.getById(id), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to fetch artist');

        const data = await response.json();
        setArtist(data);
      } catch (err) {
        console.error('Error fetching artist:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch artist');
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [id]);

  // Log re-renders when the artist state changes
  useEffect(() => {
    console.log('Component re-rendered with artist:', artist);
  }, [artist]);

  const handleVerify = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(api.artists.verify(id), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to verify artist');
      }

      const data = await response.json();
      setArtist(data.artist);
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

      const response = await fetch(api.artists.updateMonthlyListeners(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update monthly listeners');
      }

      // Explicitly fetch the updated artist data
      const artistResponse = await fetch(api.artists.getById(id), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!artistResponse.ok) {
        const data = await artistResponse.json();
        throw new Error(data.message || 'Failed to refresh artist data');
      }

      const artistData = await artistResponse.json();
      console.log('Updated Artist Data:', artistData); // Log the updated artist data
      setArtist(artistData);
      console.log('Artist state after update:', artist); // Log the state after update
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

      <Card className="bg-[#121212] border border-white/[0.08]">
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-[240px_1fr]">
            {/* Artist Image */}
            <div className="space-y-4">
              {artist.avatar ? (
                <img
                  src={artist.avatar}
                  alt={artist.name}
                  className="w-60 h-60 rounded-lg object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '/images/default-avatar.jpg';
                  }}
                />
              ) : (
                <div className="w-60 h-60 rounded-lg bg-muted flex items-center justify-center">
                  <User className="w-20 h-20 text-muted-foreground" />
                </div>
              )}

              {/* Monthly Listeners Card */}
              <div className="bg-white/[0.03] rounded-lg p-4">
                <p className="text-sm text-white/60 mb-1">Monthly Listeners</p>
                <p className="text-2xl font-bold text-white">
                  {artist.monthlyListeners.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Artist Info */}
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
                <Button
                  onClick={handleVerify}
                  disabled={artist.isVerified || isUpdating}
                  variant="default"
                  className={`min-w-[200px] ${
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
                </Button>

                <Button
                  onClick={handleUpdateMonthlyListeners}
                  disabled={isUpdating}
                  variant="secondary"
                  className="min-w-[200px]"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${
                      isUpdating ? 'animate-spin' : ''
                    }`}
                  />
                  Update Monthly Listeners
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
