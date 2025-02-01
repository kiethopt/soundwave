'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Users, User, TrendingUp, ListMusic } from 'lucide-react';
import { api } from '@/utils/api';
import { Stats } from '@/types';
import { Music } from '@/components/ui/Icons';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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

  const [chartData, setChartData] = useState({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Monthly Active Users',
        data: [0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const data = await api.dashboard.getStats(token);
        setStats(data);

        setChartData((prev) => ({
          ...prev,
          datasets: [
            {
              ...prev.datasets[0],
              data: [
                data.totalUsers * 0.8,
                data.totalUsers * 0.85,
                data.totalUsers * 0.9,
                data.totalUsers * 0.95,
                data.totalUsers * 0.97,
                data.totalUsers,
              ],
            },
          ],
        }));
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
    <div className="flex flex-col gap-6 h-full" suppressHydrationWarning>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <h2 className="text-white/60">System Overview</h2>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white text-black rounded-lg hover:bg-white/50">
            Export Data
          </button>
          <button className="px-4 py-2 bg-[#A57865] rounded-lg hover:bg-[#A57865]/50">
            Generate Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-red-500 bg-red-500/10 p-4 rounded-lg">{error}</div>
      ) : (
        <div className="flex flex-col gap-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Link
              href="/admin/users"
              className="p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-blue-500" />
                <span className="text-2xl font-bold">{stats.totalUsers}</span>
              </div>
              <h3 className="text-xl font-bold">Total Users</h3>
              <p className="text-white/60">Active accounts in system</p>
            </Link>

            <Link
              href="/admin/artists"
              className="p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <User className="w-8 h-8 text-green-500" />
                <span className="text-2xl font-bold">{stats.totalArtists}</span>
              </div>
              <h3 className="text-xl font-bold">Verified Artists</h3>
              <p className="text-white/60">Professional creators</p>
            </Link>

            <Link
              href="/admin/artist-requests"
              className="p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8 text-yellow-500" />
                <span className="text-2xl font-bold">
                  {stats.totalArtistRequests}
                </span>
              </div>
              <h3 className="text-xl font-bold">Pending Requests</h3>
              <p className="text-white/60">Awaiting verification</p>
            </Link>

            <Link
              href="/admin/genres"
              className="p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <ListMusic className="w-8 h-8 text-purple-500" />
                <span className="text-2xl font-bold">{stats.totalGenres}</span>
              </div>
              <h3 className="text-xl font-bold">Music Genres</h3>
              <p className="text-white/60">Available categories</p>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 bg-white/5 rounded-lg flex flex-col">
              <h3 className="text-xl font-bold mb-4">User Growth</h3>
              <div className="flex-1 min-h-0">
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(255, 255, 255, 0.1)',
                        },
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.6)',
                        },
                      },
                      x: {
                        grid: {
                          color: 'rgba(255, 255, 255, 0.1)',
                        },
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.6)',
                        },
                      },
                    },
                    plugins: {
                      legend: {
                        labels: {
                          color: 'rgba(255, 255, 255, 0.6)',
                        },
                      },
                    },
                  }}
                  className="w-full h-full"
                />
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-lg">
              <h3 className="text-xl font-bold mb-4">Trending Artist</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                    <Music className="w-8 h-8 text-white/60" />
                  </div>
                  <div>
                    <h4 className="font-bold">
                      {stats.trendingArtist.artistName || 'No artist found'}
                    </h4>
                    <p className="text-white/60">
                      {stats.trendingArtist.monthlyListeners.toLocaleString()}{' '}
                      monthly listeners
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Total Tracks</span>
                    <span className="font-bold">
                      {stats.trendingArtist.trackCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
