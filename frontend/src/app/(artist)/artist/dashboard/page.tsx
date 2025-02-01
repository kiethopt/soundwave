'use client';

import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import Link from 'next/link';
import { Music, Album, Users } from '@/components/ui/Icons';

export default function ArtistDashboard() {
  const [stats, setStats] = useState({
    monthlyListeners: 0,
    albumCount: 0,
    trackCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }
        // Gọi API lấy thống kê dành cho Artist
        const data = await api.artist.getStats(token);
        setStats({
          monthlyListeners: data.monthlyListeners,
          albumCount: data.albumCount,
          trackCount: data.trackCount,
        });
      } catch (err: any) {
        console.error('Error fetching artist stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-white/5 rounded-lg animate-pulse"
          ></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 bg-red-500/10 p-4 rounded-lg">{error}</div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <h1 className="text-3xl font-bold">Artist Dashboard</h1>
      <h2 className="text-white/60">Welcome to your artist dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/artist/albums"
          className="p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <Album className="w-8 h-8 text-white/60" />
            <span className="text-2xl font-bold">{stats.albumCount}</span>
          </div>
          <h3 className="text-xl font-bold">Albums</h3>
          <p className="text-white/60">Manage your albums</p>
        </Link>
        <Link
          href="/artist/tracks"
          className="p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <Music className="w-8 h-8 text-white/60" />
            <span className="text-2xl font-bold">{stats.trackCount}</span>
          </div>
          <h3 className="text-xl font-bold">Tracks</h3>
          <p className="text-white/60">Manage your tracks</p>
        </Link>
        <div className="p-6 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-white/60" />
            <span className="text-2xl font-bold">{stats.monthlyListeners}</span>
          </div>
          <h3 className="text-xl font-bold">Monthly Listeners</h3>
          <p className="text-white/60">Your monthly listeners</p>
        </div>
      </div>
    </div>
  );
}
