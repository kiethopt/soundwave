'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import type { ArtistProfile } from '@/types';
import Image from 'next/image';
import { Star, Search } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowLeft } from '@/components/ui/Icons';
import Link from 'next/link';

export default function ArtistDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [showAll, setShowAll] = useState({ albums: false, tracks: false });

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        const data = await api.admin.getArtistById(id as string, token);
        setArtist(data);
      } catch (err) {
        console.error('Error fetching artist:', err);
        setError('Failed to load artist details');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchArtist();
  }, [id]);

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

  // Memoized computations
  const filteredAlbums = useMemo(() => {
    return (
      artist?.albums?.filter((album) =>
        album.title.toLowerCase().includes(filterText.toLowerCase())
      ) || []
    );
  }, [artist?.albums, filterText]);

  const sortedAlbums = useMemo(() => {
    return [...filteredAlbums].sort(
      (a, b) =>
        new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
    );
  }, [filteredAlbums]);

  const displayedAlbums = showAll.albums
    ? sortedAlbums
    : sortedAlbums.slice(0, 10);

  const filteredSingles = useMemo(() => {
    return (
      artist?.tracks?.filter(
        (track) =>
          track.type === 'SINGLE' &&
          track.title.toLowerCase().includes(filterText.toLowerCase())
      ) || []
    );
  }, [artist?.tracks, filterText]);

  const sortedSingles = useMemo(() => {
    return [...filteredSingles].sort(
      (a, b) =>
        new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
    );
  }, [filteredSingles]);

  const displayedSingles = showAll.tracks
    ? sortedSingles
    : sortedSingles.slice(0, 10);

  const sortedTracks = useMemo(() => {
    return artist?.tracks?.sort((a, b) => b.playCount - a.playCount) || [];
  }, [artist?.tracks]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error || 'Artist not found'}</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="w-fit mb-6">
        <button
          onClick={() => router.push('/admin/artists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            theme === 'light'
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
              : 'bg-white/10 hover:bg-white/15 text-white/80 hover:text-white'
          }`}
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1" />
          <span>Back</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column - Artist image and songs */}
        <div className="w-full md:w-1/3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
            <div className="relative aspect-square">
              <Image
                src={artist.avatar || '/placeholder.svg?height=300&width=300'}
                alt={artist.artistName}
                fill
                priority
                className="object-cover"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Top Songs</h2>
              <div className="flex items-center text-sm">
                <span className="mr-2">Popularity</span>
                <span className="text-xs">|</span>
                <span className="ml-2 text-blue-500">Top songs</span>
              </div>
            </div>

            <div className="space-y-2">
              {sortedTracks.slice(0, 10).map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center py-2 border-b border-gray-100 dark:border-gray-700"
                >
                  <div className="w-6 text-center text-gray-500">
                    {index + 1}
                  </div>
                  <div className="flex-1 ml-2">
                    <div className="font-medium">{track.title}</div>
                    <div className="text-xs text-gray-500">
                      {track.album?.title || 'Single'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <div className="flex items-center">
                      {track.playCount > 2 ? (
                        <Star className="w-4 h-4 fill-blue-500 text-blue-500 mr-1" />
                      ) : track.playCount > 1 ? (
                        <Star className="w-4 h-4 fill-gray-400 text-gray-400 mr-1" />
                      ) : null}
                      <span>{track.playCount.toLocaleString()}</span>
                    </div>
                    <div className="w-12 text-right">
                      {formatDuration(track.duration)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Artist info and discography */}
        <div className="w-full md:w-2/3">
          {/* Artist Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-3xl font-bold mb-4">{artist.artistName}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {artist.user?.name && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    Name
                  </span>
                  <p>{artist.user.name}</p>
                </div>
              )}
              {artist.user?.email && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    Email
                  </span>
                  <p>{artist.user.email}</p>
                </div>
              )}
              {artist.monthlyListeners > 0 && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    Monthly Listeners
                  </span>
                  <p>{artist.monthlyListeners.toLocaleString()}</p>
                </div>
              )}
              {artist.isVerified !== undefined && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    Verification Status
                  </span>
                  <p
                    className={
                      artist.isVerified ? 'text-green-500' : 'text-red-500'
                    }
                  >
                    {artist.isVerified ? 'Verified' : 'Not Verified'}
                  </p>
                </div>
              )}
            </div>
            {artist.bio && (
              <div className="mb-4">
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  Bio
                </span>
                <p className="mt-1">{artist.bio}</p>
              </div>
            )}
            {artist.genres && artist.genres.length > 0 && (
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  Genres
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {artist.genres.map((genreItem) => (
                    <span
                      key={genreItem.genre.id}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs"
                    >
                      {genreItem.genre.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Discography Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                Discography{' '}
                <span className="text-gray-500 text-sm">
                  {(filteredAlbums.length || 0) + (filteredSingles.length || 0)}
                </span>
              </h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter discography"
                  className="pl-8 pr-4 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-sm"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Albums Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">
                  Albums ({filteredAlbums.length})
                </h3>
                {filteredAlbums.length > 10 && (
                  <button
                    onClick={() =>
                      setShowAll((prev) => ({ ...prev, albums: !prev.albums }))
                    }
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {showAll.albums
                      ? 'Collapse'
                      : `Showing all (${filteredAlbums.length})`}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-12 text-xs font-medium text-gray-500 border-b pb-2">
                  <div className="col-span-6">Title</div>
                  <div className="col-span-2 text-center">Release Date</div>
                  <div className="col-span-2 text-center">Duration</div>
                  <div className="col-span-2 text-center">Plays</div>
                </div>
                {displayedAlbums.map((album) => (
                  <Link
                    key={album.id}
                    href={`/admin/artists/${id}/albums/${album.id}`}
                    className="grid grid-cols-12 text-sm items-center hover:bg-gray-100 cursor-pointer"
                  >
                    <div className="col-span-6 flex items-center gap-3">
                      <img
                        src={album.coverUrl || '/default-album.png'}
                        alt={album.title}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div>
                        <div className="font-medium">{album.title}</div>
                        <div className="text-xs text-gray-500">
                          {album.type}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      {formatDate(album.releaseDate)}
                    </div>
                    <div className="col-span-2 text-center">
                      {formatDuration(album.duration)}
                    </div>
                    <div className="col-span-2 text-center">
                      {album.tracks
                        .reduce((sum, track) => sum + track.playCount, 0)
                        .toLocaleString()}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Singles Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">
                  Singles ({filteredSingles.length})
                </h3>
                {filteredSingles.length > 10 && (
                  <button
                    onClick={() =>
                      setShowAll((prev) => ({ ...prev, tracks: !prev.tracks }))
                    }
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {showAll.tracks
                      ? 'Collapse'
                      : `Showing all (${filteredSingles.length})`}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-12 text-xs font-medium text-gray-500 border-b pb-2">
                  <div className="col-span-6">Title</div>
                  <div className="col-span-2 text-center">Release Date</div>
                  <div className="col-span-2 text-center">Duration</div>
                  <div className="col-span-2 text-center">Plays</div>
                </div>
                {displayedSingles.map((track) => (
                  <div
                    key={track.id}
                    className="grid grid-cols-12 text-sm items-center hover:bg-gray-50"
                  >
                    <div className="col-span-6 flex items-center gap-3">
                      <img
                        src={
                          track.coverUrl ||
                          'https://placehold.co/150x150?text=No+Cover'
                        }
                        alt={track.title}
                        className="w-10 h-10 object-cover rounded"
                      />
                      <div>
                        <div className="font-medium">{track.title}</div>
                        <div className="text-xs text-gray-500">Single</div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      {formatDate(track.releaseDate)}
                    </div>
                    <div className="col-span-2 text-center">
                      {formatDuration(track.duration)}
                    </div>
                    <div className="col-span-2 text-center">
                      {track.playCount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {filteredAlbums.length === 0 && filteredSingles.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No items found matching "{filterText}"
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
