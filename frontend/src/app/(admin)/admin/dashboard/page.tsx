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
    <div className="flex flex-col gap-4 sm:gap-6 min-h-full p-4 mb-16 md:mb-0">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Admin Dashboard</h1>
          <h2 className="text-sm sm:text-base text-white/60">
            System Overview
          </h2>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-black rounded-lg hover:bg-white/90 text-xs sm:text-sm font-medium">
            Export Data
          </button>
          <button className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-[#A57865] rounded-lg hover:bg-[#A57865]/90 text-xs sm:text-sm font-medium">
            Generate Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 md:h-32 bg-white/5 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-red-500 bg-red-500/10 p-3 sm:p-4 rounded-lg text-sm">
          {error}
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Link
              href="/admin/users"
              className="p-3 sm:p-4 md:p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <Users className="w-5 h-5 md:w-8 md:h-8 text-blue-500" />
                <span className="text-lg sm:text-xl md:text-2xl font-bold">
                  {stats.totalUsers}
                </span>
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold">
                Total Users
              </h3>
              <p className="text-xs md:text-sm text-white/60">
                Active accounts
              </p>
            </Link>

            <Link
              href="/admin/artists"
              className="p-3 sm:p-4 md:p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <User className="w-5 h-5 md:w-8 md:h-8 text-green-500" />
                <span className="text-lg sm:text-xl md:text-2xl font-bold">
                  {stats.totalArtists}
                </span>
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold">
                Verified Artists
              </h3>
              <p className="text-xs md:text-sm text-white/60">
                Professional creators
              </p>
            </Link>

            <Link
              href="/admin/artist-requests"
              className="p-3 sm:p-4 md:p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <TrendingUp className="w-5 h-5 md:w-8 md:h-8 text-yellow-500" />
                <span className="text-lg sm:text-xl md:text-2xl font-bold">
                  {stats.totalArtistRequests}
                </span>
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold">
                Pending Requests
              </h3>
              <p className="text-xs md:text-sm text-white/60">
                Awaiting verification
              </p>
            </Link>

            <Link
              href="/admin/genres"
              className="p-3 sm:p-4 md:p-6 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <ListMusic className="w-5 h-5 md:w-8 md:h-8 text-purple-500" />
                <span className="text-lg sm:text-xl md:text-2xl font-bold">
                  {stats.totalGenres}
                </span>
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-bold">
                Music Genres
              </h3>
              <p className="text-xs md:text-sm text-white/60">
                Available categories
              </p>
            </Link>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* User Growth Chart */}
            <div className="md:col-span-2 p-3 sm:p-4 md:p-6 bg-white/5 rounded-lg">
              <h3 className="text-sm sm:text-base md:text-xl font-bold mb-3 md:mb-4">
                User Growth
              </h3>
              <div className="h-[200px] sm:h-[250px] md:h-[300px]">
                <Line
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.6)',
                          font: { size: window.innerWidth < 768 ? 10 : 12 },
                        },
                      },
                      x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.6)',
                          font: { size: window.innerWidth < 768 ? 10 : 12 },
                        },
                      },
                    },
                    plugins: {
                      legend: {
                        labels: {
                          color: 'rgba(255, 255, 255, 0.6)',
                          font: { size: window.innerWidth < 768 ? 11 : 13 },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            {/* Trending Artist Card */}
            <div className="p-3 sm:p-4 md:p-6 bg-white/5 rounded-lg">
              <h3 className="text-sm sm:text-base md:text-xl font-bold mb-3 md:mb-4">
                Trending Artist
              </h3>
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-white/10 rounded-full flex items-center justify-center">
                    <Music className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white/60" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm sm:text-base md:text-xl">
                      {stats.trendingArtist.artistName || 'No artist found'}
                    </h4>
                    <p className="text-xs md:text-sm text-white/60">
                      {stats.trendingArtist.monthlyListeners.toLocaleString()}{' '}
                      listeners
                    </p>
                  </div>
                </div>
                <div className="pt-3 md:pt-4 border-t border-white/10">
                  <div className="flex justify-between text-xs md:text-sm">
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
