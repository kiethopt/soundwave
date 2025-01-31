'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Users, User } from 'lucide-react';
import { api } from '@/utils/api';
import { Stats } from '@/types';
import { Music } from '@/components/ui/Icons';

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalArtists: 0,
    totalArtistRequests: 0,
    totalGenres: 0,
    trendingArtist: {
      id: '',
      artistName: '',
      monthlyListeners: 0,
      trackCount: 0,
    },
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

        const data = await api.dashboard.getStats(token);
        setStats({
          totalUsers: data.totalUsers,
          totalArtists: data.totalArtists,
          totalArtistRequests: data.totalArtistRequests,
          totalGenres: data.totalGenres,
          trendingArtist: {
            id: data.trendingArtist.id,
            artistName: data.trendingArtist.artistName,
            monthlyListeners: data.trendingArtist.monthlyListeners,
            trackCount: data.trendingArtist.trackCount,
          },
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <h2 className="text-white/60">Welcome to your admin dashboard</h2>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-white/5 rounded-lg animate-pulse"
            ></div>
          ))}
        </div>
      ) : error ? (
        <div className="text-red-500 bg-red-500/10 p-4 rounded-lg">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Link
            href="/admin/users"
            className="p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-white/60" />
              <span className="text-2xl font-bold">{stats.totalUsers}</span>
            </div>
            <h3 className="text-xl font-bold">Users</h3>
            <p className="text-white/60">Manage users</p>
          </Link>
          <Link
            href="/admin/artists"
            className="p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <User className="w-8 h-8 text-white/60" />
              <span className="text-2xl font-bold">{stats.totalArtists}</span>
            </div>
            <h3 className="text-xl font-bold">Artists</h3>
            <p className="text-white/60">Manage artists</p>
          </Link>
          <Link
            href="/admin/artist-requests"
            className="p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <User className="w-8 h-8 text-white/60" />
              <span className="text-2xl font-bold">
                {stats.totalArtistRequests}
              </span>
            </div>
            <h3 className="text-xl font-bold">Artist Requests</h3>
            <p className="text-white/60">Manage artist requests</p>
          </Link>
          <Link
            href="/admin/genres"
            className="p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <Music className="w-8 h-8 text-white/60" />
              <span className="text-2xl font-bold">{stats.totalGenres}</span>
            </div>
            <h3 className="text-xl font-bold">Genres</h3>
            <p className="text-white/60">Manage music genres</p>
          </Link>
        </div>
      )}

      {/* Trending Artist Section */}
      {!loading && !error && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Trending Artist</h2>
          <div className="p-6 bg-white/5 rounded-lg">
            <h3 className="text-lg font-bold">
              {stats.trendingArtist.artistName}
            </h3>
            <p className="text-white/60">
              Monthly Listeners: {stats.trendingArtist.monthlyListeners}
            </p>
            <p className="text-white/60">
              Tracks: {stats.trendingArtist.trackCount}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
