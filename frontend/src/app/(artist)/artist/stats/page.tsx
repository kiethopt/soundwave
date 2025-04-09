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

// Định nghĩa interface, loại bỏ optional cho followerCount và totalPlays
interface ArtistStats {
    monthlyListeners: number;
    albumCount: number;
    trackCount: number;
    followerCount: number; // Không optional
    totalPlays: number;    // Không optional
}

interface Track {
    id: string;
    title: string;
    playCount: number;
}

interface Album {
    id: string;
    title: string;
    totalPlays: number;
}

export default function ArtistDetailedStats() {
    const [stats, setStats] = useState<ArtistStats>({
        monthlyListeners: 0,
        albumCount: 0,
        trackCount: 0,
        followerCount: 0,
        totalPlays: 0,
    });
    const [topTracks, setTopTracks] = useState<Track[]>([]);
    const [topAlbums, setTopAlbums] = useState<Album[]>([]);
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

                const data = await api.artist.getStats(token);

                setStats({
                    monthlyListeners: data.monthlyListeners || 0,
                    albumCount: data.albumCount || 0,
                    trackCount: data.trackCount || 0,
                    followerCount: data.followerCount || 0, // Đảm bảo backend trả về hoặc mặc định 0
                    totalPlays: data.totalPlays || 0,       // Đảm bảo backend trả về hoặc mặc định 0
                });

                setTopTracks(data.topTracks || []);
                setTopAlbums(data.topAlbums || []); // Nếu backend không trả về, để trống thì đã xử lý ở dưới

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
                console.error('Error fetching stats:', err);
                setError(err.message || 'Failed to fetch stats');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-white/5 rounded-lg animate-pulse"></div>
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
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                <div>
                    <h1 className={`text-2xl sm:text-3xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        Detailed Artist Statistics
                    </h1>
                    <h2 className={theme === 'light' ? 'text-gray-600' : 'text-white/60'}>
                        In-depth performance analytics
                    </h2>
                </div>

            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                    icon={<Users className={`w-8 h-8 ${theme === 'light' ? 'text-purple-500' : 'text-purple-400'}`} />}
                    title="Followers"
                    value={stats.followerCount}
                    theme={theme}
                    link="/artist/followers"
                />
                <StatsCard
                    icon={<Music className={`w-8 h-8 ${theme === 'light' ? 'text-green-500' : 'text-green-400'}`} />}
                    title="Total Tracks"
                    value={stats.trackCount}
                    theme={theme}
                    link="/artist/tracks"
                />
                <StatsCard
                    icon={<Album className={`w-8 h-8 ${theme === 'light' ? 'text-blue-500' : 'text-blue-400'}`} />}
                    title="Total Albums"
                    value={stats.albumCount}
                    theme={theme}
                    link="/artist/albums"
                />
                <StatsCard
                    icon={<Users className={`w-8 h-8 ${theme === 'light' ? 'text-yellow-500' : 'text-yellow-400'}`} />}
                    title="Total Plays"
                    value={stats.totalPlays}
                    theme={theme}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`md:col-span-2 p-6 rounded-lg ${theme === 'light' ? 'bg-gray-100' : 'bg-white/5'}`}>
                    <h3 className={`text-xl font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        Listener Trend
                    </h3>
                    <div className="h-[300px]">
                        <Line
                            data={chartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        grid: { color: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)' },
                                        ticks: { color: theme === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)' },
                                    },
                                    x: {
                                        grid: { color: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)' },
                                        ticks: { color: theme === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)' },
                                    },
                                },
                                plugins: {
                                    legend: {
                                        labels: { color: theme === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)' },
                                    },
                                },
                            }}
                        />
                    </div>
                </div>

                <div className={`p-6 rounded-lg ${theme === 'light' ? 'bg-gray-100' : 'bg-white/5'}`}>
                    <h3 className={`text-xl font-bold mb-4 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                        Top Performing
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <h4 className={`text-sm font-semibold mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-white/80'}`}>
                                Top Tracks
                            </h4>
                            {topTracks.length > 0 ? (
                                <ul className={`divide-y ${theme === 'light' ? 'divide-gray-200' : 'divide-white/10'}`}>
                                    {topTracks.slice(0, 3).map((track) => (
                                        <li key={track.id} className="py-2 flex justify-between">
                                            <span className={`text-sm ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                                {track.title}
                                            </span>
                                            <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-white/60'}`}>
                                                {track.playCount} plays
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-white/60'}`}>
                                    No data available
                                </p>
                            )}
                        </div>

                        <div>
                            <h4 className={`text-sm font-semibold mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-white/80'}`}>
                                Top Albums
                            </h4>
                            {topAlbums.length > 0 ? (
                                <ul className={`divide-y ${theme === 'light' ? 'divide-gray-200' : 'divide-white/10'}`}>
                                    {topAlbums.slice(0, 3).map((album) => (
                                        <li key={album.id} className="py-2 flex justify-between">
                                            <span className={`text-sm ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                                                {album.title}
                                            </span>
                                            <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-white/60'}`}>
                                                {album.totalPlays || 0} plays
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-white/60'}`}>
                                    No data available
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface StatsCardProps {
    icon: React.ReactElement;
    title: string;
    value: number;
    theme: string;
    link?: string;
}

function StatsCard({ icon, title, value, theme, link }: StatsCardProps) {
    const cardContent = (
        <div className={`p-6 rounded-lg ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200' : 'bg-white/5 hover:bg-white/10'}`}>
            <div className="flex items-center justify-between mb-4">
                {icon}
                <span className="text-2xl font-bold">{value}</span>
            </div>
            <h3 className={`text-lg font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                {title}
            </h3>
        </div>
    );

    return link ? <Link href={link}>{cardContent}</Link> : cardContent;
}