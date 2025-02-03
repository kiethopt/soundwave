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
    <div className="flex flex-col gap-6 h-full" suppressHydrationWarning>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Artist Dashboard</h1>
          <h2 className="text-white/60">Overview of your performance</h2>
        </div>
      </div>

      {/* Thẻ thống kê */}
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

      {/* Phần Insights bổ sung */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-6 bg-white/5 rounded-lg flex flex-col">
          <h3 className="text-xl font-bold mb-4">Monthly Listeners Trend</h3>
          <div className="flex-1 min-h-0">
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                  },
                  x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.6)' },
                  },
                },
                plugins: {
                  legend: {
                    labels: { color: 'rgba(255, 255, 255, 0.6)' },
                  },
                },
              }}
              className="w-full h-full"
            />
          </div>
        </div>
        <div className="p-6 bg-white/5 rounded-lg flex flex-col">
          <h3 className="text-xl font-bold mb-4">Top Tracks</h3>
          {topTracks.length > 0 ? (
            <ul className="divide-y divide-white/10 w-full">
              {topTracks.map((track) => (
                <li
                  key={track.id}
                  className="py-2 flex justify-between items-center"
                >
                  <span className="font-medium">{track.title}</span>
                  <span className="text-sm text-white/60">
                    {track.playCount} plays
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-white/60">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
