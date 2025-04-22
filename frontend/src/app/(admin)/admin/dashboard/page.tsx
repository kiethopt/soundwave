'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Users,
  User,
  TrendingUp,
  ListMusic,
  Calendar,
  Tags,
  Library,
  FileAudio,
  List,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { Stats } from '@/types';
import { Music } from '@/components/ui/Icons';
import { useTheme } from '@/contexts/ThemeContext';
import { StatsCard } from '@/components/admin/StatsCard';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartConfig = {
  users: {
    label: 'Users',
    color: '#A57865',
  },
} satisfies ChartConfig;

export default function AdminDashboard() {
  const { theme } = useTheme();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalArtists: 0,
    totalArtistRequests: 0,
    totalGenres: 0,
    totalLabels: 0,
    totalAlbums: 0,
    totalTracks: 0,
    totalSystemPlaylists: 0,
    topArtists: [],
    monthlyUserData: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'6m' | '1y'>('6m');

  const chartData = useMemo(() => {
    if (!stats.monthlyUserData || stats.monthlyUserData.length === 0) {
      return [];
    }

    if (timeframe === '6m') {
      return stats.monthlyUserData.slice(-6);
    } else {
      return stats.monthlyUserData;
    }
  }, [stats.monthlyUserData, timeframe]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }
        const data = await api.dashboard.getDashboardStats(token);
        setStats(data);
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
    <div
      className={`container mx-auto space-y-6 p-4 mb-16 md:mb-0 theme-${theme}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">
            Admin Dashboard
          </h1>
          <h2 className="text-sm sm:text-base text-secondary">
            System Overview
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-24 md:h-32 rounded-lg animate-pulse"
              style={{
                backgroundColor:
                  theme === 'light' ? '#f9fafb' : 'rgba(255, 255, 255, 0.05)',
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            <StatsCard
              icon={Users}
              iconColor="text-blue-500"
              count={stats.totalUsers}
              title="Total Users"
              description="Active accounts"
              href="/admin/users"
            />

            <StatsCard
              icon={User}
              iconColor="text-green-500"
              count={stats.totalArtists}
              title="Verified Artists"
              description="Professional creators"
              href="/admin/artists"
            />

            <StatsCard
              icon={TrendingUp}
              iconColor="text-yellow-500"
              count={stats.totalArtistRequests}
              title="Pending Requests"
              description="Awaiting verification"
              href="/admin/artist-requests"
            />

            <StatsCard
              icon={ListMusic}
              iconColor="text-purple-500"
              count={stats.totalGenres}
              title="Music Genres"
              description="Available categories"
              href="/admin/genres"
            />

            <StatsCard
              icon={Tags}
              iconColor="text-red-500"
              count={stats.totalLabels}
              title="Total Labels"
              description="Record labels"
              href="/admin/labels"
            />

            <StatsCard
              icon={Library}
              iconColor="text-orange-500"
              count={stats.totalAlbums}
              title="Total Albums"
              description="Published albums"
              href="/admin/content"
            />

            <StatsCard
              icon={FileAudio}
              iconColor="text-teal-500"
              count={stats.totalTracks}
              title="Total Tracks"
              description="Available songs"
              href="/admin/content"
            />

            <StatsCard
              icon={List}
              iconColor="text-cyan-500"
              count={stats.totalSystemPlaylists}
              title="System Playlists"
              description="Base AI playlists"
              href="/admin/content"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="md:col-span-2 dashboard-card">
              <div className="flex justify-between items-center mb-3 md:mb-4">
                <h3 className="text-sm sm:text-base md:text-xl font-bold text-primary">
                  User Growth
                </h3>
                <div className="flex space-x-2 text-xs">
                  <button
                    className={`px-2 py-1 rounded ${
                      timeframe === '6m'
                        ? 'bg-[#A57865] text-white'
                        : 'text-secondary'
                    }`}
                    onClick={() => setTimeframe('6m')}
                  >
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      6M
                    </span>
                  </button>
                  <button
                    className={`px-2 py-1 rounded ${
                      timeframe === '1y'
                        ? 'bg-[#A57865] text-white'
                        : 'text-secondary'
                    }`}
                    onClick={() => setTimeframe('1y')}
                  >
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      1Y
                    </span>
                  </button>
                </div>
              </div>
              <div className="h-[200px] sm:h-[250px] md:h-[300px]">
                <ChartContainer config={chartConfig} className="w-full h-full">
                  <BarChart accessibilityLayer data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      stroke={theme === 'dark' ? '#a1a1aa' : '#71717a'}
                      tickFormatter={(value) => value}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" hideLabel />}
                    />
                    <Bar
                      dataKey="users"
                      fill="var(--color-users)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>

            <div className="dashboard-card">
              <h3 className="text-sm sm:text-base md:text-xl font-bold mb-3 md:mb-4 text-primary">
                Top Artists
              </h3>
              <div className="space-y-3 md:space-y-4">
                {stats.topArtists && stats.topArtists.length > 0 ? (
                  stats.topArtists.map((artist) => (
                    <div
                      key={artist.id}
                      className="flex items-center gap-3 md:gap-4"
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full overflow-hidden flex-shrink-0">
                        {artist.avatar ? (
                          <img
                            src={artist.avatar}
                            alt={artist.artistName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-full h-full flex items-center justify-center ${
                              theme === 'light' ? 'bg-gray-100' : 'bg-white/10'
                            }`}
                          >
                            <Music
                              className={`w-5 h-5 sm:w-6 sm:h-6 text-secondary`}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Link
                          href={`/admin/artists/${artist.id}`}
                          className="font-bold text-sm sm:text-base hover:underline text-primary"
                        >
                          {artist.artistName}
                        </Link>
                        <p className="text-xs md:text-sm text-secondary">
                          {artist.monthlyListeners.toLocaleString()} listeners
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-secondary">No artist data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
