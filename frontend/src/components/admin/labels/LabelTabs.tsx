import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { LabelTabsProps } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from '@/components/ui/data-table/data-table-pagination';

interface TabButtonProps {
  tab: 'artists' | 'albums' | 'tracks';
  label: string;
  count: number;
  activeTab: string;
  theme: 'light' | 'dark';
  onClick: () => void;
}

function TabButton({
  tab,
  label,
  count,
  activeTab,
  theme,
  onClick,
}: TabButtonProps) {
  return (
    <button
      onClick={onClick}
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
}

export function LabelTabs({
  theme,
  activeTab,
  setActiveTab,
  displayedArtists,
  displayedAlbums,
  displayedTracks,
  filteredArtists,
  filteredAlbums,
  filteredTracks,
  handleAlbumClick,
  handleTrackClick,
  formatDate,
  formatDuration,
}: LabelTabsProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState({
    artists: 0,
    albums: 0,
    tracks: 0,
  });

  const ITEMS_PER_PAGE = 10;

  // Create paginated data for each tab
  const paginatedArtists = useMemo(() => {
    const start = currentPage.artists * ITEMS_PER_PAGE;
    return (filteredArtists || []).slice(start, start + ITEMS_PER_PAGE);
  }, [filteredArtists, currentPage.artists]);

  const paginatedAlbums = useMemo(() => {
    const start = currentPage.albums * ITEMS_PER_PAGE;
    return (filteredAlbums || []).slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAlbums, currentPage.albums]);

  const paginatedTracks = useMemo(() => {
    const start = currentPage.tracks * ITEMS_PER_PAGE;
    return (filteredTracks || []).slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTracks, currentPage.tracks]);

  // Calculate page counts
  const artistsPageCount = Math.max(
    1,
    Math.ceil((filteredArtists?.length || 0) / ITEMS_PER_PAGE)
  );
  const albumsPageCount = Math.max(
    1,
    Math.ceil((filteredAlbums?.length || 0) / ITEMS_PER_PAGE)
  );
  const tracksPageCount = Math.max(
    1,
    Math.ceil((filteredTracks?.length || 0) / ITEMS_PER_PAGE)
  );

  // Handle page changes
  const handleArtistsPageChange = (page: number) =>
    setCurrentPage((prev) => ({ ...prev, artists: page }));
  const handleAlbumsPageChange = (page: number) =>
    setCurrentPage((prev) => ({ ...prev, albums: page }));
  const handleTracksPageChange = (page: number) =>
    setCurrentPage((prev) => ({ ...prev, tracks: page }));

  return (
    <div
      className={`${
        theme === 'light' ? 'bg-white' : 'bg-gray-800'
      } rounded-lg shadow-md`}
    >
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto overflow-y-hidden border-b border-gray-200 dark:border-gray-700">
        <TabButton
          tab="artists"
          label="Artists"
          count={filteredArtists?.length || 0}
          activeTab={activeTab}
          theme={theme}
          onClick={() => setActiveTab('artists')}
        />
        <TabButton
          tab="albums"
          label="Albums"
          count={filteredAlbums?.length || 0}
          activeTab={activeTab}
          theme={theme}
          onClick={() => setActiveTab('albums')}
        />
        <TabButton
          tab="tracks"
          label="Tracks"
          count={filteredTracks?.length || 0}
          activeTab={activeTab}
          theme={theme}
          onClick={() => setActiveTab('tracks')}
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
            </div>

            {filteredArtists && filteredArtists.length > 0 ? (
              <div>
                <div className="space-y-2">
                  {paginatedArtists.map((artist) => (
                    <div
                      key={artist.id}
                      className={`flex items-center p-3 rounded-lg ${
                        theme === 'light'
                          ? 'hover:bg-gray-100'
                          : 'hover:bg-gray-700'
                      } cursor-pointer`}
                      onClick={() => router.push(`/admin/artists/${artist.id}`)}
                    >
                      <Avatar className="w-12 h-12 mr-3 flex-shrink-0">
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
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center">
                          <h3
                            className={`font-medium text-sm ${
                              theme === 'light' ? 'text-gray-900' : 'text-white'
                            }`}
                          >
                            {artist.artistName}
                          </h3>
                        </div>
                        <p
                          className={`text-xs ${
                            theme === 'light'
                              ? 'text-gray-600'
                              : 'text-gray-300'
                          }`}
                        >
                          {artist.albumCount}{' '}
                          {artist.albumCount === 1 ? 'album' : 'albums'} •{' '}
                          {artist.trackCount}{' '}
                          {artist.trackCount === 1 ? 'track' : 'tracks'}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                  ))}
                </div>

                {artistsPageCount > 1 && (
                  <div className="mt-4">
                    <DataTablePagination
                      pageCount={artistsPageCount}
                      pageIndex={currentPage.artists}
                      onPageChange={handleArtistsPageChange}
                      theme={theme}
                    />
                  </div>
                )}
              </div>
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
            </div>
            {filteredAlbums && filteredAlbums.length > 0 ? (
              <div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader
                      className={
                        theme === 'dark'
                          ? 'border-white/[0.08] rounded-t-lg'
                          : 'border-gray-200 rounded-t-lg'
                      }
                    >
                      <TableRow
                        className={
                          theme === 'dark'
                            ? 'border-white/[0.08]'
                            : 'border-gray-200'
                        }
                      >
                        <TableHead className="w-16"></TableHead>
                        <TableHead className="px-4 py-3">Title</TableHead>
                        <TableHead className="px-4 py-3">Artist</TableHead>
                        <TableHead className="px-4 py-3">Type</TableHead>
                        <TableHead className="px-4 py-3 text-center">
                          Tracks
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAlbums.map((album) => (
                        <TableRow
                          key={album.id}
                          className={`${
                            theme === 'light'
                              ? 'bg-white border-b hover:bg-gray-50'
                              : 'bg-gray-800 border-gray-700 hover:bg-gray-600'
                          } cursor-pointer`}
                          onClick={() => handleAlbumClick(album.id)}
                        >
                          <TableCell className="p-2">
                            <Image
                              src={
                                album.coverUrl ||
                                'https://placehold.co/64x64?text=Album'
                              }
                              alt={album.title}
                              width={40}
                              height={40}
                              className="rounded object-cover"
                            />
                          </TableCell>
                          <TableCell
                            className={`px-4 py-2 font-medium whitespace-nowrap ${
                              theme === 'light' ? 'text-gray-900' : 'text-white'
                            }`}
                          >
                            {album.title}
                          </TableCell>
                          <TableCell className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <span
                                className={`${
                                  theme === 'light'
                                    ? 'text-gray-600'
                                    : 'text-gray-300'
                                }`}
                              >
                                {album.artist.artistName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-2">
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
                          </TableCell>
                          <TableCell className="px-4 py-2 text-center">
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                theme === 'light'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-gray-700 text-gray-300'
                              }`}
                            >
                              {album.totalTracks}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {albumsPageCount > 1 && (
                  <div className="mt-4">
                    <DataTablePagination
                      pageCount={albumsPageCount}
                      pageIndex={currentPage.albums}
                      onPageChange={handleAlbumsPageChange}
                      theme={theme}
                    />
                  </div>
                )}
              </div>
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
            </div>
            {filteredTracks && filteredTracks.length > 0 ? (
              <div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader
                      className={
                        theme === 'dark'
                          ? 'border-white/[0.08] rounded-t-lg'
                          : 'border-gray-200 rounded-t-lg'
                      }
                    >
                      <TableRow
                        className={
                          theme === 'dark'
                            ? 'border-white/[0.08]'
                            : 'border-gray-200'
                        }
                      >
                        <TableHead className="w-16"></TableHead>
                        <TableHead className="px-4 py-3">Title</TableHead>
                        <TableHead className="px-4 py-3">Artist</TableHead>
                        <TableHead className="px-4 py-3">Album</TableHead>
                        <TableHead className="px-4 py-3">Duration</TableHead>
                        <TableHead className="px-4 py-3 text-center">
                          Plays
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTracks.map((track) => (
                        <TableRow
                          key={track.id}
                          className={`${
                            theme === 'light'
                              ? 'bg-white border-b hover:bg-gray-50'
                              : 'bg-gray-800 border-gray-700 hover:bg-gray-600'
                          } cursor-pointer`}
                          onClick={() => handleTrackClick(track.id)}
                        >
                          <TableCell className="p-2">
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
                          </TableCell>
                          <TableCell
                            className={`px-4 py-2 font-medium whitespace-nowrap ${
                              theme === 'light' ? 'text-gray-900' : 'text-white'
                            }`}
                          >
                            {track.title}
                          </TableCell>
                          <TableCell className="px-4 py-2">
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
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-2">
                            <span
                              className={`${
                                theme === 'light'
                                  ? 'text-gray-500'
                                  : 'text-gray-400'
                              }`}
                            >
                              {track.album?.title ?? 'Single'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-2">
                            {formatDuration(track.duration)}
                          </TableCell>
                          <TableCell className="px-4 py-2 text-center">
                            <span
                              className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                track.playCount > 1000
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {track.playCount.toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {tracksPageCount > 1 && (
                  <div className="mt-4">
                    <DataTablePagination
                      pageCount={tracksPageCount}
                      pageIndex={currentPage.tracks}
                      onPageChange={handleTracksPageChange}
                      theme={theme}
                    />
                  </div>
                )}
              </div>
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
      </div>
    </div>
  );
}
