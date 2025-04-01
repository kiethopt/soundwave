'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import type { Label } from '@/types';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowLeft, ChevronRight, Edit, Search, Tags } from 'lucide-react';
import { EditLabelModal } from '@/components/ui/data-table/data-table-modals';
import toast from 'react-hot-toast';

export default function LabelDetail() {
  const { id } = useParams();
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
  const [showAll, setShowAll] = useState({
    albums: false,
    tracks: false,
    artists: false,
  });

  useEffect(() => {
    const fetchLabel = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('Authentication token not found');
        }
        const data = await api.labels.getById(id as string, token);
        setLabel(data.label);
      } catch (err) {
        console.error('Error fetching label:', err);
        setError('Failed to load label details');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchLabel();
  }, [id]);

  const handleUpdateLabel = async (labelId: string, formData: FormData) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required');
      return;
    }
    try {
      const updatedLabelData = await api.labels.update(
        labelId,
        formData,
        token
      );
      setLabel(updatedLabelData.label); // Update state with the returned label
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

  // Display variables based on "show all" state
  const displayedAlbums = showAll.albums
    ? filteredAlbums
    : filteredAlbums.slice(0, 10);
  const displayedTracks = showAll.tracks
    ? filteredTracks
    : filteredTracks.slice(0, 10);
  const displayedArtists = showAll.artists
    ? filteredArtists
    : filteredArtists.slice(0, 10);

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

  const TabButton = ({
    tab,
    label,
    count,
  }: {
    tab: 'artists' | 'albums' | 'tracks';
    label: string;
    count: number;
  }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`relative px-6 py-3 font-medium text-sm transition-colors ${
        activeTab === tab
          ? theme === 'light'
            ? 'text-black border-b-2 border-black'
            : 'text-white border-b-2 border-white'
          : theme === 'light'
          ? 'text-gray-500 hover:text-gray-800'
          : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {label}
      <span
        className={`ml-2 inline-flex items-center justify-center px-2 py-1 text-xs rounded-full ${
          theme === 'light'
            ? activeTab === tab
              ? 'bg-gray-900 text-white'
              : 'bg-gray-200 text-gray-700'
            : activeTab === tab
            ? 'bg-white text-gray-900'
            : 'bg-gray-700 text-gray-200'
        }`}
      >
        {count}
      </span>
    </button>
  );

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
      <div
        className={`${
          theme === 'light' ? 'bg-white' : 'bg-gray-800'
        } rounded-lg shadow-md p-6`}
      >
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-shrink-0 w-28 h-28 md:w-32 md:h-32 rounded-lg overflow-hidden bg-transparent flex items-center justify-center">
            {label.logoUrl ? (
              <Image
                src={label.logoUrl}
                alt={`${label.name} logo`}
                width={128}
                height={128}
                className="object-contain w-full h-full"
              />
            ) : (
              <Tags className="w-16 h-16 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <div className="flex-grow">
            <div className="flex flex-wrap justify-between items-start">
              <div>
                <h1
                  className={`text-2xl md:text-3xl font-bold mb-2 ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  {label.name}
                </h1>
                {label.description && (
                  <p
                    className={`mb-4 max-w-3xl ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}
                  >
                    {label.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col mt-2 md:mt-0 gap-2 text-sm">
                <div
                  className={`flex gap-2 px-3 py-1.5 rounded-md ${
                    theme === 'light' ? 'bg-gray-100' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    Created:
                  </span>
                  <span
                    className={`${
                      theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    {formatDate(label.createdAt)}
                  </span>
                </div>
                <div
                  className={`flex gap-2 px-3 py-1.5 rounded-md ${
                    theme === 'light' ? 'bg-gray-100' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`${
                      theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    Last Updated:
                  </span>
                  <span
                    className={`${
                      theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    {formatDate(label.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              <div
                className={`flex items-center gap-3 py-1.5 px-4 rounded-lg ${
                  theme === 'light'
                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                    : 'bg-blue-900/20 text-blue-400 border border-blue-900/40'
                }`}
              >
                <span className="font-medium">Albums</span>
                <span className="text-lg font-semibold">
                  {label._count?.albums ?? 0}
                </span>
              </div>

              <div
                className={`flex items-center gap-3 py-1.5 px-4 rounded-lg ${
                  theme === 'light'
                    ? 'bg-purple-50 text-purple-600 border border-purple-100'
                    : 'bg-purple-900/20 text-purple-400 border border-purple-900/40'
                }`}
              >
                <span className="font-medium">Tracks</span>
                <span className="text-lg font-semibold">
                  {label._count?.tracks ?? 0}
                </span>
              </div>

              <div
                className={`flex items-center gap-3 py-1.5 px-4 rounded-lg ${
                  theme === 'light'
                    ? 'bg-green-50 text-green-600 border border-green-100'
                    : 'bg-green-900/20 text-green-400 border border-green-900/40'
                }`}
              >
                <span className="font-medium">Artists</span>
                <span className="text-lg font-semibold">
                  {filteredArtists.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Tab Navigation */}
      <div
        className={`${
          theme === 'light' ? 'bg-white' : 'bg-gray-800'
        } rounded-lg shadow-md`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <input
              type="text"
              placeholder="Search albums, tracks, artists..."
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
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto overflow-y-hidden border-b border-gray-200 dark:border-gray-700">
          <TabButton
            tab="artists"
            label="Artists"
            count={filteredArtists.length}
          />
          <TabButton
            tab="albums"
            label="Albums"
            count={filteredAlbums.length}
          />
          <TabButton
            tab="tracks"
            label="Tracks"
            count={filteredTracks.length}
          />
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Artists Tab */}
          {activeTab === 'artists' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2
                  className={`text-xl font-bold ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  Artists
                </h2>
                {filteredArtists.length > 10 && (
                  <button
                    onClick={() =>
                      setShowAll((prev) => ({
                        ...prev,
                        artists: !prev.artists,
                      }))
                    }
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {showAll.artists
                      ? 'Show less'
                      : `Show all (${filteredArtists.length})`}
                  </button>
                )}
              </div>

              {filteredArtists.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayedArtists.map((artist) => (
                    <div
                      key={artist.id}
                      className={`p-4 rounded-lg ${
                        theme === 'light'
                          ? 'bg-gray-50 hover:bg-gray-100 shadow-sm'
                          : 'bg-gray-700 hover:bg-gray-600 shadow-md'
                      } cursor-pointer transition-all`}
                      onClick={() => router.push(`/admin/artists/${artist.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
                          {artist.avatar ? (
                            <Image
                              src={artist.avatar}
                              alt={artist.artistName}
                              width={48}
                              height={48}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div
                              className={`w-full h-full flex items-center justify-center ${
                                theme === 'light'
                                  ? 'bg-gray-200'
                                  : 'bg-gray-600'
                              }`}
                            >
                              <span className="text-xl font-bold text-gray-500">
                                {artist.artistName.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3
                            className={`font-medium truncate ${
                              theme === 'light' ? 'text-gray-900' : 'text-white'
                            }`}
                          >
                            {artist.artistName}
                          </h3>
                          <div className="flex items-center mt-1">
                            <span
                              className={`text-xs ${
                                theme === 'light'
                                  ? 'text-gray-500'
                                  : 'text-gray-400'
                              }`}
                            >
                              {artist.albumCount} albums · {artist.trackCount}{' '}
                              tracks
                            </span>
                            {artist.isVerified && (
                              <span className="ml-1.5 bg-blue-100 text-blue-800 text-xs font-medium px-1.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="ml-auto w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filterText ? (
                <p
                  className={`${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  No artists found matching "{filterText}".
                </p>
              ) : (
                <p
                  className={`${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  No artists found for this label.
                </p>
              )}
            </div>
          )}

          {/* Albums Tab */}
          {activeTab === 'albums' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2
                  className={`text-xl font-bold ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  Albums
                </h2>
                {filteredAlbums.length > 10 && (
                  <button
                    onClick={() =>
                      setShowAll((prev) => ({ ...prev, albums: !prev.albums }))
                    }
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {showAll.albums
                      ? 'Show less'
                      : `Show all (${filteredAlbums.length})`}
                  </button>
                )}
              </div>
              {filteredAlbums.length > 0 ? (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {displayedAlbums.map((album) => (
                    <div
                      key={album.id}
                      className={`flex ${
                        theme === 'light'
                          ? 'bg-gray-50 hover:bg-gray-100'
                          : 'bg-gray-700 hover:bg-gray-600'
                      } rounded-lg overflow-hidden cursor-pointer transition-all`}
                    >
                      <div className="w-24 h-24 flex-shrink-0 overflow-hidden">
                        <Image
                          src={
                            album.coverUrl ||
                            'https://placehold.co/100x100?text=Album'
                          }
                          alt={album.title}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 flex-grow">
                        <h3
                          className={`font-medium line-clamp-1 ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                          }`}
                        >
                          {album.title}
                        </h3>
                        <p
                          className={`text-sm ${
                            theme === 'light'
                              ? 'text-gray-600'
                              : 'text-gray-300'
                          }`}
                        >
                          {album.artist.artistName}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              album.type === 'ALBUM'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                : album.type === 'EP'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            }`}
                          >
                            {album.type}
                          </span>
                          <span
                            className={`text-xs ${
                              theme === 'light'
                                ? 'text-gray-500'
                                : 'text-gray-400'
                            }`}
                          >
                            {album.totalTracks} tracks
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filterText ? (
                <p
                  className={`${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  No albums found matching "{filterText}".
                </p>
              ) : (
                <p
                  className={`${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  No albums found for this label.
                </p>
              )}
            </div>
          )}

          {/* Tracks Tab */}
          {activeTab === 'tracks' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2
                  className={`text-xl font-bold ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  Tracks
                </h2>
                {filteredTracks.length > 10 && (
                  <button
                    onClick={() =>
                      setShowAll((prev) => ({ ...prev, tracks: !prev.tracks }))
                    }
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {showAll.tracks
                      ? 'Show less'
                      : `Show all (${filteredTracks.length})`}
                  </button>
                )}
              </div>
              {filteredTracks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead
                      className={`text-xs uppercase ${
                        theme === 'light'
                          ? 'text-gray-700 bg-gray-50'
                          : 'text-gray-400 bg-gray-700'
                      }`}
                    >
                      <tr>
                        <th scope="col" className="px-4 py-3 w-16"></th>
                        <th scope="col" className="px-4 py-3">
                          Title
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Artist
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Album
                        </th>
                        <th scope="col" className="px-4 py-3">
                          Duration
                        </th>
                        <th scope="col" className="px-4 py-3 text-center">
                          Plays
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedTracks.map((track) => (
                        <tr
                          key={track.id}
                          className={`${
                            theme === 'light'
                              ? 'bg-white border-b hover:bg-gray-50'
                              : 'bg-gray-800 border-gray-700 hover:bg-gray-600'
                          }`}
                        >
                          <td className="p-2">
                            <Image
                              src={
                                track.coverUrl ||
                                'https://placehold.co/64x64?text=Track'
                              }
                              alt={track.title}
                              width={40}
                              height={40}
                              className="rounded object-cover"
                            />
                          </td>
                          <th
                            scope="row"
                            className={`px-4 py-2 font-medium whitespace-nowrap ${
                              theme === 'light' ? 'text-gray-900' : 'text-white'
                            }`}
                          >
                            {track.title}
                          </th>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <span
                                className={`${
                                  theme === 'light'
                                    ? 'text-gray-600'
                                    : 'text-gray-300'
                                }`}
                              >
                                {track.artist.artistName}
                              </span>
                              {track.artist.isVerified && (
                                <span className="ml-1 inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`${
                                theme === 'light'
                                  ? 'text-gray-500'
                                  : 'text-gray-400'
                              }`}
                            >
                              {track.album?.title ?? 'Single'}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {formatDuration(track.duration)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                track.playCount > 1000
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {track.playCount.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : filterText ? (
                <p
                  className={`${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  No tracks found matching "{filterText}".
                </p>
              ) : (
                <p
                  className={`${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  No tracks found for this label.
                </p>
              )}
            </div>
          )}

          {/* No Results Message */}
          {filterText &&
            filteredAlbums.length === 0 &&
            filteredTracks.length === 0 &&
            filteredArtists.length === 0 && (
              <div className="text-center py-8">
                <p
                  className={`text-lg ${
                    theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                  }`}
                >
                  No results found for "{filterText}"
                </p>
                <button
                  onClick={() => setFilterText('')}
                  className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Clear search
                </button>
              </div>
            )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <EditLabelModal
          label={label}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateLabel}
          theme={theme}
        />
      )}
    </div>
  );
}
