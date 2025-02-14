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
import { useTheme } from '@/contexts/ThemeContext';

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
  const { theme } = useTheme();
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

  // Định nghĩa các lớp CSS theo theme
  const cardBg = theme === 'light' ? 'bg-gray-100' : 'bg-white/5';
  const cardHoverBg =
    theme === 'light' ? 'hover:bg-gray-200' : 'hover:bg-white/10';
  const textSecondary = theme === 'light' ? 'text-gray-600' : 'text-white/60';
  const headingPrimary = theme === 'light' ? 'text-gray-900' : 'text-white';
  const chartGridColor =
    theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
  const chartTickColor =
    theme === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)';
  const chartLegendColor =
    theme === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)';

  // Định nghĩa style cho button Export Data theo theme
  const exportBtnBg = theme === 'light' ? 'bg-gray-200' : 'bg-white/10';
  const exportBtnHover =
    theme === 'light' ? 'hover:bg-gray-300' : 'hover:bg-white/20';
  const exportBtnText = theme === 'light' ? 'text-gray-900' : 'text-white';

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: chartGridColor },
        ticks: {
          color: chartTickColor,
          font: { size: window.innerWidth < 768 ? 10 : 12 },
        },
      },
      x: {
        grid: { color: chartGridColor },
        ticks: {
          color: chartTickColor,
          font: { size: window.innerWidth < 768 ? 10 : 12 },
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: chartLegendColor,
          font: { size: window.innerWidth < 768 ? 11 : 13 },
        },
      },
    },
  };

  return (
    <div className="container mx-auto space-y-6 p-4 mb-16 md:mb-0">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${headingPrimary}`}>
            Admin Dashboard
          </h1>
          <h2 className={`text-sm sm:text-base ${textSecondary}`}>
            System Overview
          </h2>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            className={`flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 ${exportBtnBg} ${exportBtnText} ${exportBtnHover} rounded-lg text-xs sm:text-sm font-medium`}
          >
            Export Data
          </button>
          <button className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 bg-[#A57865] text-white rounded-lg hover:bg-[#A57865]/90 text-xs sm:text-sm font-medium">
            Generate Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 md:h-32 rounded-lg animate-pulse"
              style={{
                backgroundColor: theme === 'light' ? '#f9fafb' : undefined,
              }}
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
              className={`p-3 sm:p-4 md:p-6 rounded-lg ${cardBg} ${cardHoverBg}`}
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <Users className="w-5 h-5 md:w-8 md:h-8 text-blue-500" />
                <span className="text-lg sm:text-xl md:text-2xl font-bold">
                  {stats.totalUsers}
                </span>
              </div>
              <h3
                className={`text-sm sm:text-base md:text-lg font-bold ${headingPrimary}`}
              >
                Total Users
              </h3>
              <p className={`text-xs md:text-sm ${textSecondary}`}>
                Active accounts
              </p>
            </Link>

            <Link
              href="/admin/artists"
              className={`p-3 sm:p-4 md:p-6 rounded-lg ${cardBg} ${cardHoverBg}`}
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <User className="w-5 h-5 md:w-8 md:h-8 text-green-500" />
                <span className="text-lg sm:text-xl md:text-2xl font-bold">
                  {stats.totalArtists}
                </span>
              </div>
              <h3
                className={`text-sm sm:text-base md:text-lg font-bold ${headingPrimary}`}
              >
                Verified Artists
              </h3>
              <p className={`text-xs md:text-sm ${textSecondary}`}>
                Professional creators
              </p>
            </Link>

            <Link
              href="/admin/artist-requests"
              className={`p-3 sm:p-4 md:p-6 rounded-lg ${cardBg} ${cardHoverBg}`}
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <TrendingUp className="w-5 h-5 md:w-8 md:h-8 text-yellow-500" />
                <span className="text-lg sm:text-xl md:text-2xl font-bold">
                  {stats.totalArtistRequests}
                </span>
              </div>
              <h3
                className={`text-sm sm:text-base md:text-lg font-bold ${headingPrimary}`}
              >
                Pending Requests
              </h3>
              <p className={`text-xs md:text-sm ${textSecondary}`}>
                Awaiting verification
              </p>
            </Link>

            <Link
              href="/admin/genres"
              className={`p-3 sm:p-4 md:p-6 rounded-lg ${cardBg} ${cardHoverBg}`}
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <ListMusic className="w-5 h-5 md:w-8 md:h-8 text-purple-500" />
                <span className="text-lg sm:text-xl md:text-2xl font-bold">
                  {stats.totalGenres}
                </span>
              </div>
              <h3
                className={`text-sm sm:text-base md:text-lg font-bold ${headingPrimary}`}
              >
                Music Genres
              </h3>
              <p className={`text-xs md:text-sm ${textSecondary}`}>
                Available categories
              </p>
            </Link>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* User Growth Chart */}
            <div
              className={`md:col-span-2 p-3 sm:p-4 md:p-6 rounded-lg ${cardBg} ${cardHoverBg}`}
            >
              <h3
                className={`text-sm sm:text-base md:text-xl font-bold mb-3 md:mb-4 ${headingPrimary}`}
              >
                User Growth
              </h3>
              <div className="h-[200px] sm:h-[250px] md:h-[300px]">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Trending Artist Card */}
            <div
              className={`p-3 sm:p-4 md:p-6 rounded-lg ${cardBg} ${cardHoverBg}`}
            >
              <h3
                className={`text-sm sm:text-base md:text-xl font-bold mb-3 md:mb-4 ${headingPrimary}`}
              >
                Trending Artist
              </h3>
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center ${
                      theme === 'light' ? 'bg-gray-100' : 'bg-white/10'
                    }`}
                  >
                    <Music
                      className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 ${textSecondary}`}
                    />
                  </div>
                  <div>
                    <h4
                      className={`font-bold text-sm sm:text-base md:text-xl ${headingPrimary}`}
                    >
                      {stats.trendingArtist.artistName || 'No artist found'}
                    </h4>
                    <p className={`text-xs md:text-sm ${textSecondary}`}>
                      {stats.trendingArtist.monthlyListeners.toLocaleString()}{' '}
                      listeners
                    </p>
                  </div>
                </div>
                <div
                  className={`pt-3 md:pt-4 ${
                    theme === 'light'
                      ? 'border-t border-gray-200'
                      : 'border-t border-white/10'
                  }`}
                >
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className={textSecondary}>Total Tracks</span>
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
