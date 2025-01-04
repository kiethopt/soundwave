'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Music, Library, Users, User } from 'lucide-react';
import { api } from '@/utils/api';

interface Stats {
  totalTracks: number;
  totalAlbums: number;
  totalUsers: number;
  totalArtists: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalTracks: 0,
    totalAlbums: 0,
    totalUsers: 0,
    totalArtists: 0,
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

        const response = await fetch(api.dashboard.getStats(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }
        const data = await response.json();

        setStats({
          totalTracks: data.tracks,
          totalAlbums: data.albums,
          totalUsers: data.users,
          totalArtists: data.artists,
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
            href="/admin/tracks"
            className="p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <Music className="w-8 h-8 text-white/60" />
              <span className="text-2xl font-bold">{stats.totalTracks}</span>
            </div>
            <h3 className="text-xl font-bold">Tracks</h3>
            <p className="text-white/60">Manage music tracks</p>
          </Link>

          <Link
            href="/admin/albums"
            className="p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <Library className="w-8 h-8 text-white/60" />
              <span className="text-2xl font-bold">{stats.totalAlbums}</span>
            </div>
            <h3 className="text-xl font-bold">Albums</h3>
            <p className="text-white/60">Manage albums</p>
          </Link>

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
        </div>
      )}
    </div>
  );
}
