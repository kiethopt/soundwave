'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import type { Label } from '@/types';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowLeft, Edit, Search } from 'lucide-react';
import { EditLabelModal } from '@/components/ui/data-table/data-table-modals';
import toast from 'react-hot-toast';
import { LabelInfoCard } from '@/components/admin/labels/LabelInfoCard';
import { LabelTabs } from '@/components/admin/labels/LabelTabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function LabelDetail() {
  const params = useParams();
  const labelId = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : params.id
    : null;
  const router = useRouter();
  const { theme } = useTheme();
  const [label, setLabel] = useState<Label | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState<'artists' | 'albums' | 'tracks'>(
    'artists'
  );

  useEffect(() => {
    const fetchLabel = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        if (!labelId) {
          throw new Error('Label ID is missing');
        }
        const data = await api.labels.getById(labelId, token);
        setLabel(data.label);
      } catch (err) {
        console.error('Error fetching label:', err);
        setError('Failed to load label details');
      } finally {
        setLoading(false);
      }
    };

    if (labelId) fetchLabel();
    else {
      setError('Label ID not found in URL');
      setLoading(false);
    }
  }, [labelId]);

  const handleUpdateLabel = async (updateId: string, formData: FormData) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required');
      return;
    }
    try {
      const updatedLabelData = await api.labels.update(
        updateId,
        formData,
        token
      );
      setLabel(updatedLabelData.label);
      setIsEditModalOpen(false);
      toast.success('Label updated successfully');
    } catch (error) {
      toast.error('Failed to update label');
      console.error(error);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Filter data based on search text
  const filteredAlbums =
    label?.albums?.filter((album) =>
      album.title.toLowerCase().includes(filterText.toLowerCase())
    ) || [];

  const filteredTracks =
    label?.tracks?.filter((track) =>
      track.title.toLowerCase().includes(filterText.toLowerCase())
    ) || [];

  const filteredArtists =
    label?.artists?.filter((artist) =>
      artist.artistName.toLowerCase().includes(filterText.toLowerCase())
    ) || [];

  // Display all filtered data instead of limiting it (pagination will handle display)
  const displayedAlbums = filteredAlbums;
  const displayedTracks = filteredTracks;
  const displayedArtists = filteredArtists;

  // Get top artists (sắp xếp theo tổng số album và bài hát)
  const topArtists = useMemo(() => {
    if (!label?.artists) return [];
    return [...label.artists]
      .sort(
        (a, b) => b.albumCount + b.trackCount - (a.albumCount + a.trackCount)
      )
      .slice(0, 5);
  }, [label?.artists]);

  // Get latest albums (sắp xếp theo ngày phát hành)
  const latestAlbums = useMemo(() => {
    if (!label?.albums) return [];
    return [...label.albums]
      .sort(
        (a, b) =>
          new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
      )
      .slice(0, 5);
  }, [label?.albums]);

  // Get popular tracks (sắp xếp theo số lượt nghe)
  const popularTracks = useMemo(() => {
    if (!label?.tracks) return [];
    return [...label.tracks]
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 5);
  }, [label?.tracks]);

  // Chuyển đến trang chi tiết album
  const handleAlbumClick = (albumId: string) => {
    const album = label?.albums?.find((album) => album.id === albumId);
    if (album && album.artist?.id) {
      router.push(`/admin/artists/${album.artist.id}?album=${albumId}`);
    }
  };

  // Chuyển đến trang chi tiết bài hát
  const handleTrackClick = (trackId: string) => {
    const track = label?.tracks?.find((track) => track.id === trackId);
    if (track && track.artist?.id) {
      if (track.album?.id) {
        router.push(
          `/admin/artists/${track.artist.id}?album=${track.album.id}`
        );
      } else {
        router.push(`/admin/artists/${track.artist.id}?track=${trackId}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !label) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error || 'Label not found'}</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      {/* Header & Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            theme === 'light'
              ? 'bg-gray-100 hover:bg-gray-200 text-black'
              : 'bg-white/10 hover:bg-white/15 text-white'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={() => setIsEditModalOpen(true)}
          className={`p-2 rounded-lg ${
            theme === 'light' ? 'hover:bg-gray-200' : 'hover:bg-white/15'
          }`}
          title="Edit Label"
        >
          <Edit className="w-5 h-5" />
        </button>
      </div>

      {/* Label Info Card */}
      <LabelInfoCard label={label} theme={theme} formatDate={formatDate} />

      {/* Two-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Tab Content (70%) */}
        <div className="w-full lg:w-[68%]">
          <LabelTabs
            theme={theme}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            displayedArtists={displayedArtists}
            displayedAlbums={displayedAlbums}
            displayedTracks={displayedTracks}
            filteredArtists={filteredArtists}
            filteredAlbums={filteredAlbums}
            filteredTracks={filteredTracks}
            handleAlbumClick={handleAlbumClick}
            handleTrackClick={handleTrackClick}
            formatDate={formatDate}
            formatDuration={formatDuration}
          />
        </div>

        {/* Right Column - Search & Highlights (30%) */}
        <div className="w-full lg:w-[32%] space-y-6">
          {/* Search Input */}
          <div
            className={`${
              theme === 'light' ? 'bg-white' : 'bg-gray-800'
            } rounded-lg shadow-md p-4`}
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Search artists, albums, tracks..."
                className={`pl-10 pr-4 py-2 rounded-full border w-full ${
                  theme === 'light'
                    ? 'border-gray-300 text-gray-900 bg-white'
                    : 'border-gray-600 text-gray-100 bg-gray-700'
                }`}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-sm ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  } hover:underline`}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Search status message */}
            {filterText && (
              <div className="mt-3 text-center">
                {filteredArtists?.length === 0 &&
                filteredAlbums?.length === 0 &&
                filteredTracks?.length === 0 ? (
                  <p
                    className={`text-sm ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}
                  >
                    No results found for "{filterText}"
                  </p>
                ) : (
                  <p
                    className={`text-sm ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}
                  >
                    Found {filteredArtists?.length || 0} artists,{' '}
                    {filteredAlbums?.length || 0} albums,{' '}
                    {filteredTracks?.length || 0} tracks
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Highlights Section */}
          <div
            className={`${
              theme === 'light' ? 'bg-white' : 'bg-gray-800'
            } rounded-lg shadow-md p-4 space-y-6`}
          >
            <h2
              className={`text-xl font-bold ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}
            >
              Highlights
            </h2>

            {/* Top Artists Highlight */}
            {topArtists && topArtists.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3
                    className={`text-base font-semibold ${
                      theme === 'light' ? 'text-gray-800' : 'text-gray-200'
                    }`}
                  >
                    Top Artists
                  </h3>
                  <button
                    onClick={() => setActiveTab('artists')}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    View All
                  </button>
                </div>
                {topArtists.slice(0, 3).map((artist) => (
                  <div
                    key={artist.id}
                    className={`flex items-center p-3 rounded-md cursor-pointer ${
                      theme === 'light'
                        ? 'hover:bg-gray-100'
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => router.push(`/admin/artists/${artist.id}`)}
                  >
                    <Avatar className="w-12 h-12 mr-4 border border-gray-200 dark:border-gray-700">
                      {artist.avatar ? (
                        <AvatarImage
                          src={artist.avatar}
                          alt={artist.artistName}
                          className="object-cover"
                        />
                      ) : null}
                      <AvatarFallback className="text-base font-medium">
                        {artist.artistName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p
                        className={`font-medium text-sm ${
                          theme === 'light' ? 'text-gray-900' : 'text-white'
                        }`}
                      >
                        {artist.artistName}
                      </p>
                      <p
                        className={`text-xs ${
                          theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        {artist.albumCount} albums • {artist.trackCount} tracks
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Latest Albums Highlight */}
            {latestAlbums && latestAlbums.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3
                    className={`text-base font-semibold ${
                      theme === 'light' ? 'text-gray-800' : 'text-gray-200'
                    }`}
                  >
                    Latest Releases
                  </h3>
                  <button
                    onClick={() => setActiveTab('albums')}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    View All
                  </button>
                </div>
                {latestAlbums.slice(0, 3).map((album) => (
                  <div
                    key={album.id}
                    className={`flex items-center p-3 rounded-md cursor-pointer ${
                      theme === 'light'
                        ? 'hover:bg-gray-100'
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => handleAlbumClick(album.id)}
                  >
                    <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700 mr-4 border border-gray-200 dark:border-gray-700">
                      {album.coverUrl ? (
                        <Image
                          src={album.coverUrl}
                          alt={album.title}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-base font-medium text-gray-400 dark:text-gray-500">
                            {album.title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p
                        className={`font-medium text-sm truncate ${
                          theme === 'light' ? 'text-gray-900' : 'text-white'
                        }`}
                      >
                        {album.title}
                      </p>
                      <p
                        className={`text-xs truncate ${
                          theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        {album.artist.artistName} • {album.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Popular Tracks Highlight */}
            {popularTracks && popularTracks.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3
                    className={`text-base font-semibold ${
                      theme === 'light' ? 'text-gray-800' : 'text-gray-200'
                    }`}
                  >
                    Popular Tracks
                  </h3>
                  <button
                    onClick={() => setActiveTab('tracks')}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    View All
                  </button>
                </div>
                {popularTracks.slice(0, 3).map((track) => (
                  <div
                    key={track.id}
                    className={`flex items-center p-3 rounded-md cursor-pointer ${
                      theme === 'light'
                        ? 'hover:bg-gray-100'
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => handleTrackClick(track.id)}
                  >
                    <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700 mr-4 border border-gray-200 dark:border-gray-700">
                      {track.coverUrl ? (
                        <Image
                          src={track.coverUrl}
                          alt={track.title}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-base font-medium text-gray-400 dark:text-gray-500">
                            {track.title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p
                        className={`font-medium text-sm truncate ${
                          theme === 'light' ? 'text-gray-900' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </p>
                      <p
                        className={`text-xs truncate ${
                          theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        {track.artist.artistName}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right ml-2">
                      <span
                        className={`text-xs ${
                          theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                        }`}
                      >
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Label Modal */}
      {isEditModalOpen && (
        <EditLabelModal
          label={label}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={(id, data) => handleUpdateLabel(id, data)}
          theme={theme}
        />
      )}
    </div>
  );
}
