'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Music, Library, Users } from 'lucide-react';
import { api } from '@/utils/api';

interface Stats {
  totalTracks: number;
  totalAlbums: number;
  totalUsers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalTracks: 0,
    totalAlbums: 0,
    totalUsers: 0,
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

        // Fetch tracks count
        const tracksResponse = await fetch(api.tracks.getAll(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const tracksData = await tracksResponse.json();

        // Fetch albums count
        const albumsResponse = await fetch(api.albums.getAll(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const albumsData = await albumsResponse.json();

        // Fetch users count
        const usersResponse = await fetch(api.users.getAll(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const usersData = await usersResponse.json();

        setStats({
          totalTracks: tracksData.length,
          totalAlbums: albumsData.length,
          totalUsers: usersData.length,
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-white/5 rounded-lg animate-pulse"
            ></div>
          ))}
        </div>
      ) : error ? (
        <div className="text-red-500 bg-red-500/10 p-4 rounded-lg">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
