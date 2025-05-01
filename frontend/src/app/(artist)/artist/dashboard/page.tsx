'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { Music, Album, Users } from '@/components/ui/Icons';
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

export default function ArtistDashboard() {
  const [stats, setStats] = useState({
    monthlyListeners: 0,
    albumCount: 0,
    trackCount: 0,
  });
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [chartData, setChartData] = useState({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Monthly Listeners Trend',
        data: [0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }
        // Lấy số liệu thống kê dành cho Artist, bao gồm topTracks
        const data = await api.artist.getStats(token);
        setStats({
          monthlyListeners: data.monthlyListeners,
          albumCount: data.albumCount,
          trackCount: data.trackCount,
        });
        setTopTracks(data.topTracks || []);

        // Cập nhật dữ liệu biểu đồ dựa trên số liệu monthlyListeners
        setChartData((prev) => ({
          ...prev,
          datasets: [
            {
              ...prev.datasets[0],
              data: [
                data.monthlyListeners * 0.8,
                data.monthlyListeners * 0.85,
                data.monthlyListeners * 0.9,
                data.monthlyListeners * 0.95,
                data.monthlyListeners * 0.97,
                data.monthlyListeners,
              ],
            },
          ],
        }));
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
    <div className="container mx-auto space-y-6 p-4 mb-16 md:mb-0">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}
          >
            Artist Dashboard
          </h1>
          <h2 className={theme === 'light' ? 'text-gray-600' : 'text-white/60'}>
            Overview of your performance
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(3)].map((_, i) => (
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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <Link
              href="/artist/albums"
              className={`p-3 sm:p-4 md:p-6 rounded-lg ${theme === 'light'
                ? 'bg-gray-100 hover:bg-gray-200'
                : 'bg-white/5 hover:bg-white/10'
                }`}
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <Album
                  className={`w-5 h-5 md:w-8 md:h-8 ${theme === 'light' ? 'text-blue-500' : 'text-blue-400'
                    }`}
                />
                <span className="text-lg sm:text-xl md:text-2xl font-bold">
                  {stats.albumCount}
                </span>
              </div>
              <h3
                className={`text-sm sm:text-base md:text-lg font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
              >
                Albums
              </h3>
              <p
                className={
                  theme === 'light' ? 'text-gray-600' : 'text-white/60'
                }
              >
                Manage your albums
              </p>
            </Link>

            <Link
              href="/artist/tracks"
              className={`p-3 sm:p-4 md:p-6 rounded-lg ${theme === 'light'
                ? 'bg-gray-100 hover:bg-gray-200'
                : 'bg-white/5 hover:bg-white/10'
                }`}
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <Music
                  className={`w-5 h-5 md:w-8 md:h-8 ${theme === 'light' ? 'text-green-500' : 'text-green-400'
                    }`}
                />
                <span className="text-lg sm:text-xl md:text-2xl font-bold">
                  {stats.trackCount}
                </span>
              </div>
              <h3
                className={`text-sm sm:text-base md:text-lg font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
              >
                Tracks
              </h3>
              <p
                className={
                  theme === 'light' ? 'text-gray-600' : 'text-white/60'
                }
              >
                Manage your tracks
              </p>
            </Link>

            <div
              className={`p-3 sm:p-4 md:p-6 rounded-lg ${theme === 'light' ? 'bg-gray-100' : 'bg-white/5'
                }`}
            >
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <Users
                  className={`w-5 h-5 md:w-8 md:h-8 ${theme === 'light' ? 'text-purple-500' : 'text-purple-400'
                    }`}
                />
                <span className="text-lg sm:text-xl md:text-2xl font-bold">
                  {stats.monthlyListeners}
                </span>
              </div>
              <h3
                className={`text-sm sm:text-base md:text-lg font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
              >
                Monthly Listeners
              </h3>
              <p
                className={
                  theme === 'light' ? 'text-gray-600' : 'text-white/60'
                }
              >
                Your monthly listeners
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div
              className={`md:col-span-2 p-3 sm:p-4 md:p-6 rounded-lg ${theme === 'light' ? 'bg-gray-100' : 'bg-white/5'
                }`}
            >
              <h3
                className={`text-sm sm:text-base md:text-xl font-bold mb-3 md:mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
              >
                Monthly Listeners Trend
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
                        grid: {
                          color:
                            theme === 'light'
                              ? 'rgba(0, 0, 0, 0.1)'
                              : 'rgba(255, 255, 255, 0.1)',
                        },
                        ticks: {
                          color:
                            theme === 'light'
                              ? 'rgba(0, 0, 0, 0.6)'
                              : 'rgba(255, 255, 255, 0.6)',
                          font: { size: window.innerWidth < 768 ? 10 : 12 },
                        },
                      },
                      x: {
                        grid: {
                          color:
                            theme === 'light'
                              ? 'rgba(0, 0, 0, 0.1)'
                              : 'rgba(255, 255, 255, 0.1)',
                        },
                        ticks: {
                          color:
                            theme === 'light'
                              ? 'rgba(0, 0, 0, 0.6)'
                              : 'rgba(255, 255, 255, 0.6)',
                          font: { size: window.innerWidth < 768 ? 10 : 12 },
                        },
                      },
                    },
                    plugins: {
                      legend: {
                        labels: {
                          color:
                            theme === 'light'
                              ? 'rgba(0, 0, 0, 0.6)'
                              : 'rgba(255, 255, 255, 0.6)',
                          font: { size: window.innerWidth < 768 ? 11 : 13 },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>

            <div
              className={`p-3 sm:p-4 md:p-6 rounded-lg ${theme === 'light' ? 'bg-gray-100' : 'bg-white/5'
                }`}
            >
              <h3
                className={`text-sm sm:text-base md:text-xl font-bold mb-3 md:mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
              >
                Top Tracks
              </h3>
              {topTracks.length > 0 ? (
                <ul
                  className={`divide-y ${theme === 'light' ? 'divide-gray-200' : 'divide-white/10'
                    } space-y-2`}
                >
                  {topTracks.map((track) => (
                    <li
                      key={track.id}
                      className="py-2 flex justify-between items-center"
                    >
                      <span
                        className={`font-medium text-sm sm:text-base ${theme === 'light' ? 'text-gray-900' : 'text-white'
                          }`}
                      >
                        {track.title}
                      </span>
                      <span
                        className={`text-xs sm:text-sm ${theme === 'light' ? 'text-gray-600' : 'text-white/60'
                          }`}
                      >
                        {track.playCount} plays
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-white/60'
                    }`}
                >
                  No data available
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
