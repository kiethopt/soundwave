'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/utils/api';
import type { ArtistProfile, Album, Track } from '@/types';
import Image from 'next/image';
import { Star, Search, MoreVertical } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowLeft, Trash2 } from '@/components/ui/Icons';
import {
  EditArtistModal,
  AlbumDetailModal,
  TrackDetailModal,
} from '@/components/ui/data-table/data-table-modals';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import toast from 'react-hot-toast';

export default function ArtistDetail() {
  const params = useParams();
  const artistId = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : params.id
    : null;
  const router = useRouter();
  const { theme } = useTheme();
  const [artist, setArtist] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [showAll, setShowAll] = useState({ albums: false, tracks: false });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);

  const searchParams = useSearchParams();

  // Helper function to safely access searchParams
  const safeGetParam = (key: string): string | null => {
    return searchParams?.get(key) || null;
  };

  useEffect(() => {
    const albumId = safeGetParam('album');
    if (albumId && artist && artist.albums) {
      const album = artist.albums.find((a) => {
        return a.id.toString() === albumId;
      });
      if (album) {
        setSelectedAlbum(album);
        setIsAlbumModalOpen(true);
      }
    }

    // Handle track parameter
    const trackId = safeGetParam('track');
    if (trackId && artist) {
      const track = artist.tracks?.find((t) => t.id.toString() === trackId);

      // If not found in direct tracks, check albums
      if (!track && artist.albums) {
        for (const album of artist.albums) {
          const foundTrack = album.tracks?.find(
            (t) => t.id.toString() === trackId
          );
          if (foundTrack) {
            setSelectedTrack(foundTrack);
            setIsTrackModalOpen(true);
            break;
          }
        }
      } else if (track) {
        setSelectedTrack(track);
        setIsTrackModalOpen(true);
      }
    }
  }, [searchParams, artist, safeGetParam]);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        if (!artistId) {
          throw new Error('Artist ID is missing');
        }
        const data = await api.admin.getArtistById(artistId, token);
        setArtist(data);
      } catch (err) {
        console.error('Error fetching artist:', err);
        setError('Failed to load artist details');
      } finally {
        setLoading(false);
      }
    };

    if (artistId) fetchArtist();
    else {
      setError('Artist ID not found in URL');
      setLoading(false);
    }
  }, [artistId]);

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

  const sortedTracks = useMemo(
    () =>
      [
        ...(artist?.tracks || []), // lấy tất cả tracks không thuộc album nào bằng spread operator
        ...(artist?.albums || []).flatMap((album) => album.tracks), // lấy tất cả tracks thuộc album bằng flatMap
      ].sort((a, b) => b.playCount - a.playCount), // sắp xếp theo playCount
    [artist?.albums, artist?.tracks]
  );

  const handleDeleteTrack = async (trackId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this track? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      await api.tracks.delete(trackId, token);
      toast.success('Track deleted successfully');

      // Update the UI by removing the deleted track
      if (artist) {
        setArtist({
          ...artist,
          tracks: artist.tracks?.filter((track) => track.id !== trackId) || [],
        });
      }
    } catch (error) {
      console.error('Error deleting track:', error);
      toast.error('Failed to delete track');
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this album? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      await api.albums.delete(albumId, token);
      toast.success('Album deleted successfully');

      // Update the UI by removing the deleted album
      if (artist) {
        setArtist({
          ...artist,
          albums: artist.albums?.filter((album) => album.id !== albumId) || [],
        });
      }
    } catch (error) {
      console.error('Error deleting album:', error);
      toast.error('Failed to delete album');
    }
  };

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
          onClick={() => router.back()}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
            theme === 'light'
              ? 'bg-gray-100 hover:bg-gray-200 text-black'
              : 'bg-white/10 hover:bg-white/15 text-white'
          }`}
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1" />
          <span>Back</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column */}
        <div className="w-full md:w-1/3">
          <div
            className={`${
              theme === 'light' ? 'bg-white' : 'bg-gray-800'
            } rounded-lg shadow-md overflow-hidden mb-6`}
          >
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

          <div
            className={`${
              theme === 'light' ? 'bg-white' : 'bg-gray-800'
            } rounded-lg shadow-md p-4`}
          >
            <div className="flex justify-between items-center mb-4">
              <h2
                className={`text-lg font-bold ${
                  theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                }`}
              >
                Top Songs
              </h2>
              <div
                className={`flex items-center text-sm ${
                  theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                }`}
              >
                <span className="mr-2">Popularity</span>
                <span className="text-xs">|</span>
                <span className="ml-2 text-blue-500">Top songs</span>
              </div>
            </div>

            <div className="space-y-2">
              {sortedTracks.slice(0, 10).map((track, index) => (
                <div
                  key={track.id}
                  className={`flex items-center py-2 border-b ${
                    theme === 'light' ? 'border-gray-100' : 'border-gray-700'
                  }`}
                >
                  <div
                    className={`w-6 text-center ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 ml-2">
                    <div
                      className={`font-medium ${
                        theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                      }`}
                    >
                      {track.title}
                    </div>
                    <div
                      className={`text-xs ${
                        theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      {track.album?.title || 'Single'}
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    } text-sm`}
                  >
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

        {/* Right column */}
        <div className="w-full md:w-2/3">
          {/* Artist Info Card */}
          <div
            className={`${
              theme === 'light' ? 'bg-white' : 'bg-gray-800'
            } rounded-lg shadow-md p-6 mb-6`}
          >
            <div className="flex justify-between items-center mb-4">
              <h2
                className={`text-3xl font-bold ${
                  theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                }`}
              >
                {artist.artistName}
              </h2>
              <MoreVertical
                className={`cursor-pointer ${
                  theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                }`}
                onClick={() => setIsEditModalOpen(true)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {artist.user?.name && (
                <div>
                  <span
                    className={`${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    } text-sm`}
                  >
                    Name
                  </span>
                  <p
                    className={`${
                      theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                    }`}
                  >
                    {artist.user.name}
                  </p>
                </div>
              )}
              {artist.user?.email && (
                <div>
                  <span
                    className={`${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    } text-sm`}
                  >
                    Email
                  </span>
                  <p
                    className={`${
                      theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                    }`}
                  >
                    {artist.user.email}
                  </p>
                </div>
              )}
              {artist.monthlyListeners > 0 && (
                <div>
                  <span
                    className={`${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    } text-sm`}
                  >
                    Monthly Listeners
                  </span>
                  <p
                    className={`${
                      theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                    }`}
                  >
                    {artist.monthlyListeners.toLocaleString()}
                  </p>
                </div>
              )}
              {artist.isVerified !== undefined && (
                <div>
                  <span
                    className={`${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    } text-sm`}
                  >
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
                <span
                  className={`${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  } text-sm`}
                >
                  Bio
                </span>
                <p
                  className={`mt-1 ${
                    theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                  }`}
                >
                  {artist.bio}
                </p>
              </div>
            )}
            {artist.genres && artist.genres.length > 0 && (
              <div>
                <span
                  className={`${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  } text-sm`}
                >
                  Genres
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {artist.genres.map((genreItem) => (
                    <span
                      key={genreItem.genre.id}
                      className={`px-2 py-1 rounded-full text-xs ${
                        theme === 'light'
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-gray-700 text-gray-100'
                      }`}
                    >
                      {genreItem.genre.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Discography Section */}
          <div
            className={`${
              theme === 'light' ? 'bg-white' : 'bg-gray-800'
            } rounded-lg shadow-md p-6`}
          >
            <div className="flex justify-between items-center mb-4">
              <h2
                className={`text-lg font-bold ${
                  theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                }`}
              >
                Discography{' '}
                <span
                  className={`${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  } text-sm`}
                >
                  {(filteredAlbums.length || 0) + (filteredSingles.length || 0)}
                </span>
              </h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter discography"
                  className={`pl-8 pr-4 py-1 rounded-full border ${
                    theme === 'light'
                      ? 'border-gray-300 text-gray-900 bg-white'
                      : 'border-gray-600 text-gray-100 bg-gray-700'
                  }`}
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Albums Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3
                  className={`text-sm font-medium ${
                    theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                  }`}
                >
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
                <div
                  className={`grid grid-cols-12 text-xs font-medium ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  } border-b pb-2`}
                >
                  <div className="col-span-6">Title</div>
                  <div className="col-span-2 text-center">Release Date</div>
                  <div className="col-span-2 text-center">Duration</div>
                  <div className="col-span-1 text-center">Plays</div>
                  <div className="col-span-1"></div>
                </div>
                {displayedAlbums.map((album) => (
                  <div
                    key={album.id}
                    className={`grid grid-cols-12 text-sm items-center ${
                      theme === 'light'
                        ? 'hover:bg-gray-100'
                        : 'hover:bg-gray-700'
                    } cursor-pointer`}
                    onClick={() => {
                      setSelectedAlbum(album);
                      setIsAlbumModalOpen(true);
                    }}
                  >
                    <div className="col-span-6 flex items-center gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={album.coverUrl}
                          alt={album.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div>
                          <div
                            className={`font-medium ${
                              theme === 'light'
                                ? 'text-gray-900'
                                : 'text-gray-100'
                            }`}
                          >
                            {album.title}
                          </div>
                          <div
                            className={`text-xs ${
                              theme === 'light'
                                ? 'text-gray-500'
                                : 'text-gray-400'
                            }`}
                          >
                            {album.type}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`col-span-2 text-center ${
                        theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                      }`}
                    >
                      {formatDate(album.releaseDate)}
                    </div>
                    <div
                      className={`col-span-2 text-center ${
                        theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                      }`}
                    >
                      {formatDuration(album.duration)}
                    </div>
                    <div
                      className={`col-span-1 text-center ${
                        theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                      }`}
                    >
                      {album.tracks
                        .reduce((sum, track) => sum + track.playCount, 0)
                        .toLocaleString()}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <MoreVertical className="h-4 w-4 cursor-pointer" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDeleteAlbum(album.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Album
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Singles Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3
                  className={`text-sm font-medium ${
                    theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                  }`}
                >
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
                <div
                  className={`grid grid-cols-12 text-xs font-medium ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  } border-b pb-2`}
                >
                  <div className="col-span-6">Title</div>
                  <div className="col-span-2 text-center">Release Date</div>
                  <div className="col-span-2 text-center">Duration</div>
                  <div className="col-span-1 text-center">Plays</div>
                  <div className="col-span-1"></div>
                </div>
                {displayedSingles.map((track) => (
                  <div
                    key={track.id}
                    className={`grid grid-cols-12 text-sm items-center ${
                      theme === 'light'
                        ? 'hover:bg-gray-50'
                        : 'hover:bg-gray-700'
                    } cursor-pointer`}
                    onClick={() => {
                      setSelectedTrack(track);
                      setIsTrackModalOpen(true);
                    }}
                  >
                    <div className="col-span-6 flex items-center gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            track.coverUrl ||
                            'https://placehold.co/150x150?text=No+Cover'
                          }
                          alt={track.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div>
                          <div
                            className={`font-medium ${
                              theme === 'light'
                                ? 'text-gray-900'
                                : 'text-gray-100'
                            }`}
                          >
                            {track.title}
                          </div>
                          <div
                            className={`text-xs ${
                              theme === 'light'
                                ? 'text-gray-500'
                                : 'text-gray-400'
                            }`}
                          >
                            Single
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`col-span-2 text-center ${
                        theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                      }`}
                    >
                      {formatDate(track.releaseDate)}
                    </div>
                    <div
                      className={`col-span-2 text-center ${
                        theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                      }`}
                    >
                      {formatDuration(track.duration)}
                    </div>
                    <div
                      className={`col-span-1 text-center ${
                        theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                      }`}
                    >
                      {track.playCount.toLocaleString()}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <MoreVertical className="h-4 w-4 cursor-pointer" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDeleteTrack(track.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Track
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {filteredAlbums.length === 0 && filteredSingles.length === 0 && (
              <div
                className={`text-center py-4 ${
                  theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                No items found matching "{filterText}"
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <EditArtistModal
          artist={artist}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={(updatedArtist) =>
            setArtist((prev) => (prev ? { ...prev, ...updatedArtist } : prev))
          }
          theme={theme}
        />
      )}

      <AlbumDetailModal
        album={selectedAlbum}
        isOpen={isAlbumModalOpen}
        onClose={() => setIsAlbumModalOpen(false)}
        theme={theme}
      />

      {isTrackModalOpen && selectedTrack && artistId && (
        <TrackDetailModal
          track={selectedTrack}
          isOpen={isTrackModalOpen}
          onClose={() => setIsTrackModalOpen(false)}
          theme={theme}
          currentArtistId={artistId}
        />
      )}
    </div>
  );
}
