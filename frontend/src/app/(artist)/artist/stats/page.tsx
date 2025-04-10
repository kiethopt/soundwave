'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/utils/api';
import {
    Music,
    Album,
    Users,
    BarChartBig,
    ListMusic,
    TrendingUp,
} from '@/components/ui/Icons';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
} from 'chart.js';
import { useTheme } from '@/contexts/ThemeContext';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement
);

// Define structure for trend data
interface TrendData {
    labels: string[];
    data: number[];
}

// Define structure for genre distribution data
interface GenreDistribution {
    genreName: string;
    trackCount: number;
}

// Cập nhật interface để bao gồm thông tin nghệ sĩ, trends, và genre distribution
interface ArtistStats {
    monthlyListeners: number;
    albumCount: number;
    trackCount: number;
    followerCount: number;
    totalPlays: number;
    artistName?: string;
    avatar?: string;
    genres?: { id: string; name: string }[];
    followerTrend?: TrendData;
    likeTrend?: TrendData;
    playlistAddTrend?: TrendData;
    genreDistribution?: GenreDistribution[];
    monthlyStreamTrend?: TrendData;
    yearlyStreamTrend?: TrendData;
}

interface Track {
    id: string;
    title: string;
    playCount: number;
    duration?: number;
    coverUrl?: string;
    album?: {
        id: string;
        title: string;
    } | null;
    totalPlays: 0,
    artistName: 'Artist Name',
    avatar: '/default-avatar.png',
    genres: [],
}

// Thêm interface cho Top Listener
interface TopListener {
    id: string;
    name: string | null;
    username: string | null;
    avatar: string | null;
    totalPlays: number;
}

// Interface cho Follower/Liker (chỉ cần thông tin user cơ bản)
interface UserInfo {
    id: string;
    name: string | null;
    username: string | null;
    avatar: string | null;
}

// Helper function để format số lớn
const formatNumber = (num: number): string => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
};

// Helper function để format thời gian (giây sang mm:ss)
const formatDuration = (seconds: number | null | undefined): string => {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
        return '--:--';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

export default function ArtistDetailedStats() {
    const [stats, setStats] = useState<ArtistStats>({
        monthlyListeners: 0,
        albumCount: 0,
        trackCount: 0,
        followerCount: 0,
        totalPlays: 0,
        artistName: 'Artist Name',
        avatar: '/default-avatar.png',
        genres: [],
    });
    const [topTracks, setTopTracks] = useState<Track[]>([]);
    const [topListeners, setTopListeners] = useState<TopListener[]>([]);
    const [followers, setFollowers] = useState<UserInfo[]>([]);
    const [trackLikers, setTrackLikers] = useState<UserInfo[]>([]);
    const [chartData, setChartData] = useState<any>({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [],
    });
    // --- State for new trend charts --- 
    const [followerChartData, setFollowerChartData] = useState<any>({ labels: [], datasets: [] });
    const [likeChartData, setLikeChartData] = useState<any>({ labels: [], datasets: [] });
    const [playlistAddChartData, setPlaylistAddChartData] = useState<any>({ labels: [], datasets: [] });
    // --- State for new Genre Distribution Doughnut chart ---
    const [genreChartData, setGenreChartData] = useState<any>({ labels: [], datasets: [] });
    // --- State for Stream Bar charts ---
    const [monthlyStreamChartData, setMonthlyStreamChartData] = useState<any>({ labels: [], datasets: [] });
    const [yearlyStreamChartData, setYearlyStreamChartData] = useState<any>({ labels: [], datasets: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { theme } = useTheme();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('userToken');
                if (!token) {
                    setError('Authentication required. Please log in.');
                    setLoading(false);
                    return;
                }

                const data = await api.artist.getStats(token);

                setStats({
                    monthlyListeners: data.monthlyListeners || 0,
                    albumCount: data.albumCount || 0,
                    trackCount: data.trackCount || 0,
                    followerCount: data.followerCount || 0,
                    totalPlays: data.totalPlays || 0,
                    artistName: data.artistName || 'Artist Name',
                    avatar: data.avatar || '/default-avatar.png',
                    genres: data.genres || [],
                    followerTrend: data.followerTrend,
                    likeTrend: data.likeTrend,
                    playlistAddTrend: data.playlistAddTrend,
                    genreDistribution: data.genreDistribution,
                    monthlyStreamTrend: data.monthlyStreamTrend,
                    yearlyStreamTrend: data.yearlyStreamTrend,
                });

                setTopTracks(data.topTracks || []);
                setTopListeners(data.topListeners || []);

                // --- Helper to create chart config --- 
                const createLineChartConfig = (trendData: TrendData | undefined, label: string, borderColorLight: string, borderColorDark: string, bgColorLight: string[], bgColorDark: string[]) => {
                    if (!trendData || !trendData.labels || !trendData.data) {
                        return { labels: [], datasets: [] };
                    }
                    return {
                        labels: trendData.labels,
                        datasets: [
                            {
                                label: label,
                                data: trendData.data,
                                fill: true,
                                borderColor: theme === 'light' ? borderColorLight : borderColorDark,
                                backgroundColor: (context: any) => {
                                    const ctx = context.chart.ctx;
                                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                                    if (theme === 'light') {
                                        gradient.addColorStop(0, bgColorLight[0]);
                                        gradient.addColorStop(1, bgColorLight[1]);
                                    } else {
                                        gradient.addColorStop(0, bgColorDark[0]);
                                        gradient.addColorStop(1, bgColorDark[1]);
                                    }
                                    return gradient;
                                },
                                tension: 0.4,
                                pointBackgroundColor: theme === 'light' ? borderColorLight : borderColorDark,
                                pointBorderColor: theme === 'light' ? '#fff' : '#111827',
                                pointHoverBackgroundColor: theme === 'light' ? '#fff' : '#111827',
                                pointHoverBorderColor: theme === 'light' ? borderColorLight : borderColorDark,
                            },
                        ],
                    };
                };

                // --- Helper to create Bar chart config --- 
                const createBarChartConfig = (trendData: TrendData | undefined, label: string, bgColorLight: string, bgColorDark: string) => {
                    if (!trendData || !trendData.labels || !trendData.data) {
                        return { labels: [], datasets: [] };
                    }
                    return {
                        labels: trendData.labels,
                        datasets: [
                            {
                                label: label,
                                data: trendData.data,
                                backgroundColor: theme === 'light' ? bgColorLight : bgColorDark,
                                borderRadius: 4,
                            },
                        ],
                    };
                };

                // Predefined colors for Doughnut chart slices
                const doughnutColorsLight = [
                    '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#60a5fa', '#f87171', '#c084fc'
                ];
                const doughnutColorsDark = [
                    '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#a855f7'
                ];

                // --- Configure Genre Doughnut Chart ---
                if (data.genreDistribution && data.genreDistribution.length > 0) {
                    const labels = data.genreDistribution.map((g: GenreDistribution) => g.genreName);
                    const counts = data.genreDistribution.map((g: GenreDistribution) => g.trackCount);
                    const backgroundColors = theme === 'light' ? doughnutColorsLight : doughnutColorsDark;
                    
                    setGenreChartData({
                        labels: labels,
                        datasets: [
                            {
                                data: counts,
                                backgroundColor: backgroundColors.slice(0, counts.length),
                                borderColor: theme === 'light' ? '#ffffff' : '#1f2937', // bg-white / gray-800
                                borderWidth: 2,
                            },
                        ],
                    });
                } else {
                     setGenreChartData({ labels: [], datasets: [] }); // Handle empty data
                }

                // --- Configure all charts --- 
                const listenerData = [
                    data.monthlyListeners * 0.8,
                    data.monthlyListeners * 0.85,
                    data.monthlyListeners * 0.9,
                    data.monthlyListeners * 0.95,
                    data.monthlyListeners * 0.97,
                    data.monthlyListeners,
                ].map(val => Math.max(0, Math.round(val)));

                // Existing Listener Trend Chart Config (Example - you might need to adjust)
                const listenerConfig = {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], // Use actual labels if available
                    datasets: [
                         {
                            label: 'Monthly Listeners',
                            data: listenerData,
                            fill: true,
                            borderColor: theme === 'light' ? '#4f46e5' : '#818cf8',
                            backgroundColor: (context: any) => {
                                const ctx = context.chart.ctx;
                                const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                                if (theme === 'light') {
                                    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.5)');
                                    gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');
                                } else {
                                    gradient.addColorStop(0, 'rgba(129, 140, 248, 0.5)');
                                    gradient.addColorStop(1, 'rgba(129, 140, 248, 0)');
                                }
                                return gradient;
                            },
                            tension: 0.4,
                            pointBackgroundColor: theme === 'light' ? '#4f46e5' : '#818cf8',
                            pointBorderColor: theme === 'light' ? '#fff' : '#111827',
                            pointHoverBackgroundColor: theme === 'light' ? '#fff' : '#111827',
                            pointHoverBorderColor: theme === 'light' ? '#4f46e5' : '#818cf8',
                        },
                    ],
                };
                setChartData(listenerConfig); // Set existing chart data

                // New Follower Trend Chart
                setFollowerChartData(createLineChartConfig(
                    data.followerTrend,
                    'New Followers',
                    '#10b981', // green-500
                    '#34d399', // green-400
                    ['rgba(16, 185, 129, 0.5)', 'rgba(16, 185, 129, 0)'], // bg light
                    ['rgba(52, 211, 153, 0.5)', 'rgba(52, 211, 153, 0)']  // bg dark
                ));

                // New Like Trend Chart
                setLikeChartData(createLineChartConfig(
                    data.likeTrend,
                    'Track Likes',
                    '#ec4899', // pink-500
                    '#f472b6', // pink-400
                    ['rgba(236, 72, 153, 0.5)', 'rgba(236, 72, 153, 0)'], // bg light
                    ['rgba(244, 114, 182, 0.5)', 'rgba(244, 114, 182, 0)'] // bg dark
                ));

                // New Playlist Add Trend Chart
                setPlaylistAddChartData(createLineChartConfig(
                    data.playlistAddTrend,
                    'Playlist Adds',
                    '#f59e0b', // amber-500
                    '#fbbf24', // amber-400
                    ['rgba(245, 158, 11, 0.5)', 'rgba(245, 158, 11, 0)'], // bg light
                    ['rgba(251, 191, 36, 0.5)', 'rgba(251, 191, 36, 0)']  // bg dark
                ));

                // --- Configure Stream Bar charts --- 
                setMonthlyStreamChartData(createBarChartConfig(
                    data.monthlyStreamTrend,
                    'Streams',
                    '#60a5fa', // blue-400 light
                    '#3b82f6'  // blue-500 dark
                ));
                 setYearlyStreamChartData(createBarChartConfig(
                    data.yearlyStreamTrend,
                    'Streams',
                     '#a78bfa', // purple-400 light
                     '#8b5cf6'  // purple-500 dark
                ));

            } catch (err: any) {
                console.error('Error fetching stats:', err);
                setError(err.message || 'Failed to fetch stats. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [theme]);

    if (loading) {
        return (
            <div className="container mx-auto space-y-6 p-4 mb-16 md:mb-0 animate-pulse">
                <div className="flex items-center space-x-4 mb-6">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                    ))}
                </div>
                <div className="space-y-6">
                    <div className="h-[300px] bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                    <div className="h-[200px] bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                    <div className="h-[200px] bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
             <div className="container mx-auto p-4">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            </div>
        );
    }

    // --- Chart Options --- 
    // Options for Line charts
    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: theme === 'light' ? '#6b7280' : '#9ca3af', padding: 10 },
            },
            x: {
                grid: { display: false },
                ticks: { color: theme === 'light' ? '#6b7280' : '#9ca3af', padding: 10 },
            },
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: theme === 'light' ? '#111827' : '#ffffff',
                titleColor: theme === 'light' ? '#ffffff' : '#111827',
                bodyColor: theme === 'light' ? '#ffffff' : '#111827',
                padding: 10,
                cornerRadius: 4,
                displayColors: false,
                borderColor: theme === 'light' ? 'transparent' : 'rgba(0,0,0,0.1)',
                borderWidth: 1,
            },
        },
        interaction: {
            intersect: false,
            mode: 'index' as 'index',
        },
    };

    // Options for Doughnut chart
    const doughnutChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as 'bottom',
                labels: {
                    color: theme === 'light' ? '#374151' : '#d1d5db', // text-gray-700 / text-gray-300
                    padding: 15,
                    boxWidth: 12,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: theme === 'light' ? '#111827' : '#ffffff',
                titleColor: theme === 'light' ? '#ffffff' : '#111827',
                bodyColor: theme === 'light' ? '#ffffff' : '#111827',
                padding: 10,
                cornerRadius: 4,
                callbacks: {
                    label: function(context: any) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed !== null) {
                            label += context.parsed + ' tracks';
                        }
                        return label;
                    }
                }
            }
        },
        cutout: '60%', // Makes it a doughnut chart
    };

    // Options for Bar charts (can be similar to line, adjust tooltip)
    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
             y: {
                beginAtZero: true,
                grid: { color: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)' },
                ticks: {
                    color: theme === 'light' ? '#6b7280' : '#9ca3af', 
                    padding: 10,
                    // Optional: Format Y-axis ticks for large numbers
                    callback: function(value: number | string) {
                        if (typeof value === 'number' && value >= 1000) {
                            return formatNumber(value); // Use existing helper
                        }
                        return value;
                    }
                },
            },
            x: {
                grid: { display: false },
                ticks: { color: theme === 'light' ? '#6b7280' : '#9ca3af', padding: 10 },
            },
        },
        plugins: {
            legend: {
                display: false, // Often hidden for simple bar charts
            },
            tooltip: {
                backgroundColor: theme === 'light' ? '#111827' : '#ffffff',
                titleColor: theme === 'light' ? '#ffffff' : '#111827',
                bodyColor: theme === 'light' ? '#ffffff' : '#111827',
                padding: 10,
                cornerRadius: 4,
                displayColors: false,
                callbacks: {
                    label: function(context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            // Format the number for the tooltip
                            label += formatNumber(context.parsed.y); 
                        }
                        return label;
                    }
                }
            },
        },
    };

    return (
        <div className={`container mx-auto space-y-8 p-4 md:p-6 mb-16 md:mb-0 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <Image
                    src={stats.avatar || '/default-avatar.png'}
                    alt={stats.artistName || 'Artist Avatar'}
                    width={128}
                    height={128}
                    className="rounded-full object-cover border-4 border-gray-300 dark:border-gray-700 shadow-lg"
                    priority
                />
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold">
                        {stats.artistName}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                        {formatNumber(stats.followerCount)} followers
                    </p>
                    {stats.genres && stats.genres.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                            {stats.genres.map((genre) => (
                                <span
                                    key={genre.id}
                                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${theme === 'light' ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-900 text-indigo-300'}`}
                                >
                                    {genre.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MiniStatsCard
                    icon={<BarChartBig className="w-5 h-5 text-yellow-500" />}
                    title="Total Plays"
                    value={formatNumber(stats.totalPlays)}
                    theme={theme}
                />
                <MiniStatsCard
                    icon={<TrendingUp className="w-5 h-5 text-indigo-500" />}
                    title="Monthly Listeners"
                    value={formatNumber(stats.monthlyListeners)}
                    theme={theme}
                />
                <MiniStatsCard
                    icon={<ListMusic className="w-5 h-5 text-green-500" />}
                    title="Total Tracks"
                    value={formatNumber(stats.trackCount)}
                    theme={theme}
                    link="/artist/tracks"
                />
                <MiniStatsCard
                    icon={<Album className="w-5 h-5 text-blue-500" />}
                    title="Total Albums"
                    value={formatNumber(stats.albumCount)}
                    theme={theme}
                    link="/artist/albums"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-4 sm:p-6 rounded-lg shadow-md ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
                    <h3 className="text-xl font-semibold mb-1">Monthly Listener Trend</h3>
                    <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Listeners over the last 12 months</p>
                    <div className="h-[300px] sm:h-[350px]">
                        {chartData.datasets.length > 0 ? (
                            <Line data={chartData} options={lineChartOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">Loading chart...</div>
                        )}
                    </div>
                </div>

                <div className={`p-4 sm:p-6 rounded-lg shadow-md ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
                    <h3 className="text-xl font-semibold mb-1">Genre Distribution</h3>
                    <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Distribution of tracks across genres</p>
                    <div className="h-[300px] sm:h-[350px] flex items-center justify-center">
                        {genreChartData.datasets.length > 0 && genreChartData.datasets[0]?.data?.length > 0 ? (
                            <Doughnut data={genreChartData} options={doughnutChartOptions} />
                        ) : (
                             <div className="flex items-center justify-center h-full text-gray-500">No genre data available.</div>
                        )}
                     </div>
                </div>
            </div>

            {/* --- Stream Bar Charts Section (2 Columns) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Streams */}
                <div className={`p-4 sm:p-6 rounded-lg shadow-md ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
                    <h3 className="text-xl font-semibold mb-1">Streams by month</h3>
                    <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Total streams per month</p>
                    <div className="h-[300px]">
                         {monthlyStreamChartData.datasets.length > 0 && monthlyStreamChartData.datasets[0]?.data?.length > 0 ? (
                            <Bar data={monthlyStreamChartData} options={barChartOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">No stream data available.</div>
                        )}
                    </div>
                </div>
                 {/* Yearly Streams */}
                 <div className={`p-4 sm:p-6 rounded-lg shadow-md ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
                    <h3 className="text-xl font-semibold mb-1">Streams by year</h3>
                    <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Total streams per year</p>
                    <div className="h-[300px]">
                         {yearlyStreamChartData.datasets.length > 0 && yearlyStreamChartData.datasets[0]?.data?.length > 0 ? (
                            <Bar data={yearlyStreamChartData} options={barChartOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">No stream data available.</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`p-4 sm:p-6 rounded-lg shadow-md ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
                    <h3 className="text-lg font-semibold mb-1">Followers</h3>
                    <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>New followers in the last 6 months</p>
                    <div className="h-[250px]">
                        {followerChartData.datasets.length > 0 && followerChartData.datasets[0]?.data?.length > 0 ? (
                            <Line data={followerChartData} options={lineChartOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">No follower data available.</div>
                        )}
                    </div>
                </div>

                <div className={`p-4 sm:p-6 rounded-lg shadow-md ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
                    <h3 className="text-lg font-semibold mb-1">Favorite</h3>
                    <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Track likes in the last 6 months</p>
                    <div className="h-[250px]">
                        {likeChartData.datasets.length > 0 && likeChartData.datasets[0]?.data?.length > 0 ? (
                            <Line data={likeChartData} options={lineChartOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">No like data available.</div>
                        )}
                    </div>
                </div>

                <div className={`p-4 sm:p-6 rounded-lg shadow-md ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
                    <h3 className="text-lg font-semibold mb-1">Playlist Adds </h3>
                    <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Users adding tracks in the last 6 months</p>
                    <div className="h-[250px]">
                        {playlistAddChartData.datasets.length > 0 && playlistAddChartData.datasets[0]?.data?.length > 0 ? (
                            <Line data={playlistAddChartData} options={lineChartOptions} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">No playlist add data available.</div>
                        )}
                    </div>
                </div>
            </div>

            <div className={`p-4 sm:p-6 rounded-lg shadow-md ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
                <h3 className="text-xl font-semibold mb-1">Top Tracks</h3>
                <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Most played tracks overall</p>
                {topTracks.length > 0 ? (
                    <ul className="space-y-4">
                        {topTracks.slice(0, 5).map((track, index) => (
                            <li key={track.id} className="flex items-center justify-between text-sm gap-4">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <span className={`text-gray-500 dark:text-gray-400 w-5 text-right`}>{index + 1}</span>
                                    <Image
                                        src={track.coverUrl || '/placeholder-image.png'}
                                        alt={track.title}
                                        width={40}
                                        height={40}
                                        className="rounded flex-shrink-0 object-cover"
                                    />
                                    <div className="flex items-center justify-between min-w-0 flex-1">
                                        <span className="font-medium truncate mr-2">{track.title}</span>
                                        <div className="flex items-center space-x-2 text-xs flex-shrink-0">
                                            {track.album && (
                                                <Link href={`/album/${track.album.id}`} className={`${theme === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'} truncate hidden sm:inline`}>
                                                    {track.album.title}
                                                </Link>
                                            )}
                                            {track.album && track.duration && (
                                                 <span className="text-gray-400 dark:text-gray-600 hidden sm:inline">•</span>
                                            )}
                                            {track.duration && (
                                                <span className={`${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {formatDuration(track.duration)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`font-semibold ${theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'} flex-shrink-0`}>
                                    {formatNumber(track.playCount)} plays
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>No track data available.</p>
                )}
            </div>

            <div className={`p-4 sm:p-6 rounded-lg shadow-md ${theme === 'light' ? 'bg-white' : 'bg-gray-800'}`}>
                <h3 className="text-xl font-semibold mb-1">Top listeners</h3>
                <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                    People who listen a lot to {stats.artistName || 'this artist'}
                </p>
                {topListeners.length > 0 ? (
                    <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        {topListeners.map((listener, index) => (
                            <div key={listener.id} className="flex flex-col items-center text-center flex-shrink-0 w-28">
                                <div className="relative mb-2">
                                    <Image
                                        src={listener.avatar || '/default-avatar.png'}
                                        alt={listener.name || listener.username || 'Listener'}
                                        width={80}
                                        height={80}
                                        className="rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 w-20 h-20"
                                    />
                                    {/* Rank Badge */}
                                    <span className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full shadow-md">
                                        #{index + 1}
                                    </span>
                                </div>
                                <span className="text-sm font-semibold truncate w-full">{listener.name || listener.username}</span>
                                <span className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {formatNumber(listener.totalPlays)} streams
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>No listener data available.</p>
                )}
            </div>

        </div>
    );
}

interface MiniStatsCardProps {
    icon: React.ReactElement;
    title: string;
    value: string | number;
    theme: string;
    link?: string;
}

function MiniStatsCard({ icon, title, value, theme, link }: MiniStatsCardProps) {
    const content = (
        <div className={`p-3 rounded-lg ${theme === 'light' ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-800 hover:bg-gray-700'}`}>
            <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-full ${theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'}`}>
                     {icon}
                </div>
                 <div>
                    <div className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>{title}</div>
                    <div className="text-sm font-semibold">{value}</div>
                </div>
            </div>
        </div>
    );
    return link ? <Link href={link} className="block">{content}</Link> : content;
}

interface StatsCardProps {
    icon: React.ReactElement;
    title: string;
    value: number;
    theme: string;
    link?: string;
}

function StatsCard({ icon, title, value, theme, link }: StatsCardProps) {
    const formattedValue = formatNumber(value);

    const cardContent = (
        <div className={`p-4 rounded-xl shadow-sm transition-shadow duration-200 ease-in-out ${theme === 'light' ? 'bg-white hover:shadow-md' : 'bg-gray-800 hover:bg-gray-700'}`}>
            <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-full ${theme === 'light' ? 'bg-gray-100' : 'bg-gray-700'}`}>
                    {icon}
                </div>
                <span className={`text-xl font-bold ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>{formattedValue}</span>
            </div>
            <h3 className={`text-sm font-medium ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                {title}
            </h3>
        </div>
    );

    return link ? (
        <Link href={link} className="block">
            {cardContent}
        </Link>
    ) : (
        cardContent
    );
}