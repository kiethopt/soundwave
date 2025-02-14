'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Album } from '@/types';
import { api } from '@/utils/api';
import {
  Search,
  Music,
  AddSimple,
  Trash2,
  Eye,
  EyeOff,
} from '@/components/ui/Icons';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';
export default function ArtistAlbums() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  // Ensure valid page param
  useEffect(() => {
    const pageParam = Number(searchParams.get('page'));
    if (pageParam < 1) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('page');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/artist/albums${queryStr}`);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (searchParams.get('page') === '1') {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('page');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/artist/albums${queryStr}`);
    }
  }, [searchParams, router]);

  const currentPage = Number(searchParams.get('page')) || 1;
  const [albums, setAlbums] = useState<Album[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);

  // Check artist's access on mount
  useEffect(() => {
    const checkAccess = () => {
      const userData = localStorage.getItem('userData');
      if (!userData) {
        router.push('/login');
        return;
      }
      const user = JSON.parse(userData);
      if (!user.artistProfile?.isVerified) {
        toast.error('You need a verified artist profile to access this page');
        router.push('/');
        return;
      }
      if (user.currentProfile !== 'ARTIST') {
        toast.error('Please switch to artist profile to access this page');
        router.push('/');
        return;
      }
    };

    checkAccess();
  }, [router]);

  // Update query param "page" on navigation.
  const updateQueryParam = (param: string, value: number) => {
    if (value < 1) value = 1;
    const current = new URLSearchParams(searchParams.toString());
    if (value === 1) {
      current.delete(param);
    } else {
      current.set(param, value.toString());
    }
    const queryStr = current.toString() ? `?${current.toString()}` : '';
    router.push(`/artist/albums${queryStr}`);
  };

  // Fetch albums (using search if available, otherwise the artist's albums)
  const fetchAlbums = useCallback(
    async (query: string, page: number) => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('userToken');
        const userData = localStorage.getItem('userData');

        if (!token || !userData) {
          throw new Error('Authentication required');
        }

        const user = JSON.parse(userData);
        const artistId = user.artistProfile?.id;

        if (!artistId) {
          throw new Error('Artist profile not found');
        }

        const limit = 10;
        const data = query
          ? await api.albums.search(query, token, page, limit)
          : await api.artists.getAlbums(artistId, token, page, limit);

        // If page exceeds totalPages, reset URL to page 1
        if (data.pagination && data.pagination.totalPages < page) {
          const current = new URLSearchParams(searchParams.toString());
          current.delete('page');
          router.replace(
            `/artist/albums${
              current.toString() ? '?' + current.toString() : ''
            }`
          );
          return;
        }

        setAlbums(data.albums);
        setPagination(data.pagination);
      } catch (err) {
        console.error('Error fetching albums:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch albums');
      } finally {
        setLoading(false);
      }
    },
    [router, searchParams]
  );

  // Debounce the search input and re-fetch when currentPage/searchInput change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchAlbums(searchInput, currentPage);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchInput, currentPage, fetchAlbums]);

  // On form submit, reset page to 1
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParam('page', 1);
  };

  const toggleAlbumVisibility = async (albumId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.albums.toggleVisibility(albumId, token);

      // Update local state
      setAlbums(
        albums.map((album) =>
          album.id === albumId ? { ...album, isActive: !album.isActive } : album
        )
      );

      toast.success(response.message);
    } catch (err) {
      console.error('Error toggling album visibility:', err);
      toast.error('Failed to update album visibility');
    }
  };

  const deleteAlbum = async (albumId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.albums.delete(albumId, token);
      setAlbums(albums.filter((album) => album.id !== albumId));
      toast.success('Album deleted successfully');
      setAlbumToDelete(null);
    } catch (err) {
      console.error('Error deleting album:', err);
      toast.error('Failed to delete album');
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) updateQueryParam('page', currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < (pagination.totalPages ?? 1))
      updateQueryParam('page', currentPage + 1);
  };

  return (
    <div
      className="container mx-auto space-y-8 p-4 mb-16"
      suppressHydrationWarning
    >
      {/* Header Section */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1
              className={`text-3xl font-bold tracking-tight ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}
            >
              Album Management
            </h1>
            <p
              className={
                theme === 'light' ? 'text-gray-600 mt-2' : 'text-white/60 mt-2'
              }
            >
              Create and manage your music albums
            </p>
          </div>
          <Link
            href="/artist/albums/new"
            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              theme === 'light'
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            <AddSimple className="w-4 h-4" />
            New Album
          </Link>
        </div>
        {/* Mobile New Album Button */}
        <Link
          href="/artist/albums/new"
          className={`md:hidden flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-fit mt-4 transition-colors ${
            theme === 'light'
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-white text-black hover:bg-white/90'
          }`}
        >
          <AddSimple className="w-4 h-4" />
          New Album
        </Link>
      </div>

      <div
        className={`rounded-lg overflow-hidden border ${
          theme === 'light'
            ? 'bg-white border-gray-200'
            : 'bg-[#121212] border-white/[0.08]'
        }`}
      >
        {/* Search Bar - Desktop */}
        <div
          className={`hidden md:block p-6 border-b ${
            theme === 'light' ? 'border-gray-200' : 'border-white/[0.08]'
          }`}
        >
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search albums..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`pl-10 pr-4 py-2 w-full rounded-lg border focus:outline-none focus:ring-2 ${
                theme === 'light'
                  ? 'bg-gray-50 border-gray-300 focus:ring-gray-300'
                  : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20'
              }`}
            />
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                theme === 'light' ? 'text-gray-400' : 'text-white/40'
              }`}
            />
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden p-4">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search albums..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                theme === 'light'
                  ? 'bg-gray-50 border-gray-300 focus:ring-gray-300'
                  : 'bg-white/[0.07] border-white/[0.1] focus:ring-white/20'
              }`}
            />
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                theme === 'light' ? 'text-gray-400' : 'text-white/40'
              }`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div
                className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                  theme === 'light' ? 'border-gray-900' : 'border-white'
                }`}
              ></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : albums.length > 0 ? (
            <table className="w-full">
              <thead
                className={theme === 'light' ? 'bg-gray-50' : 'bg-white/[0.03]'}
              >
                <tr>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider w-[300px] ${
                      theme === 'light' ? 'text-gray-500' : 'text-white/60'
                    }`}
                  >
                    Title
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider hidden md:table-cell ${
                      theme === 'light' ? 'text-gray-500' : 'text-white/60'
                    }`}
                  >
                    Release Date
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider hidden sm:table-cell ${
                      theme === 'light' ? 'text-gray-500' : 'text-white/60'
                    }`}
                  >
                    Total Tracks
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider hidden sm:table-cell ${
                      theme === 'light' ? 'text-gray-500' : 'text-white/60'
                    }`}
                  >
                    Type
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'light' ? 'text-gray-500' : 'text-white/60'
                    }`}
                  >
                    Status
                  </th>
                  <th
                    className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      theme === 'light' ? 'text-gray-500' : 'text-white/60'
                    }`}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  theme === 'light' ? 'divide-gray-200' : 'divide-white/[0.08]'
                }`}
              >
                {albums.map((album) => (
                  <tr
                    key={album.id}
                    className={`transition-colors ${
                      theme === 'light'
                        ? 'hover:bg-gray-50'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {album.coverUrl ? (
                          <img
                            src={album.coverUrl || '/placeholder.svg'}
                            alt={album.title}
                            className="w-10 h-10 rounded-md mr-3 object-cover"
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-md mr-3 flex items-center justify-center ${
                              theme === 'light'
                                ? 'bg-gray-100'
                                : 'bg-white/[0.03]'
                            }`}
                          >
                            <Music
                              className={`w-6 h-6 ${
                                theme === 'light'
                                  ? 'text-gray-400'
                                  : 'text-white/60'
                              }`}
                            />
                          </div>
                        )}
                        <Link
                          href={`/artist/albums/${album.id}`}
                          title={album.title}
                          className={`font-medium hover:underline truncate ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                          }`}
                        >
                          {album.title}
                        </Link>
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap hidden md:table-cell ${
                        theme === 'light' ? 'text-gray-500' : 'text-white/60'
                      }`}
                    >
                      {new Date(album.releaseDate).toLocaleDateString('en-GB')}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap hidden sm:table-cell ${
                        theme === 'light' ? 'text-gray-500' : 'text-white/60'
                      }`}
                    >
                      {album.totalTracks}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap hidden sm:table-cell ${
                        theme === 'light' ? 'text-gray-500' : 'text-white/60'
                      }`}
                    >
                      {album.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          album.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {album.isActive ? (
                          <Eye className="w-3 h-3 mr-1" />
                        ) : (
                          <EyeOff className="w-3 h-3 mr-1" />
                        )}
                        {album.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={`p-2 rounded-full ${
                            theme === 'light'
                              ? 'hover:bg-gray-100'
                              : 'hover:bg-white/10'
                          }`}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className={
                            theme === 'light'
                              ? 'bg-white border border-gray-200'
                              : 'bg-[#282828] border border-white/10'
                          }
                        >
                          <DropdownMenuItem
                            onClick={() => toggleAlbumVisibility(album.id)}
                            className={
                              theme === 'light' ? 'text-gray-700' : 'text-white'
                            }
                          >
                            {album.isActive ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Hide Album
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Show Album
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator
                            className={
                              theme === 'light' ? 'bg-gray-200' : 'bg-white/10'
                            }
                          />
                          <DropdownMenuItem
                            onClick={() => setAlbumToDelete(album)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Album
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              className={`flex flex-col items-center justify-center h-[400px] ${
                theme === 'light' ? 'text-gray-500' : 'text-white/60'
              }`}
            >
              <Music className="w-12 h-12 mb-4" />
              <p>No albums found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div
            className={`flex items-center justify-center gap-2 p-4 border-t ${
              theme === 'light' ? 'border-gray-200' : 'border-white/[0.08]'
            }`}
          >
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className={`px-3 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                theme === 'light'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50'
                  : 'bg-white/5 hover:bg-white/10 disabled:bg-white/5'
              }`}
            >
              Previous
            </button>

            {/* Mobile Pagination */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`px-3 py-2 rounded-lg text-sm ${
                    theme === 'light'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {currentPage} of {pagination.totalPages}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className={`p-4 w-[200px] ${
                    theme === 'light'
                      ? 'bg-white border border-gray-200'
                      : 'bg-[#282828] border border-white/[0.1]'
                  }`}
                >
                  <div className="space-y-3">
                    <div
                      className={
                        theme === 'light'
                          ? 'text-gray-500 text-xs'
                          : 'text-white/60 text-xs'
                      }
                    >
                      Go to page:
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={pagination.totalPages}
                        defaultValue={currentPage}
                        ref={pageInputRef}
                        className={`w-full px-2 py-1 rounded-lg text-center text-sm focus:outline-none focus:ring-2 ${
                          theme === 'light'
                            ? 'bg-gray-50 border border-gray-300 focus:ring-blue-500/20 text-gray-900'
                            : 'bg-white/5 border border-white/[0.1] focus:ring-[#ffaa3b]/50 text-white'
                        }`}
                        placeholder="Page"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const page = pageInputRef.current
                          ? parseInt(pageInputRef.current.value, 10)
                          : NaN;
                        if (!isNaN(page)) {
                          updateQueryParam('page', page);
                        }
                      }}
                      className={`w-full px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        theme === 'light'
                          ? 'bg-gray-900 text-white hover:bg-gray-800'
                          : 'bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20'
                      }`}
                    >
                      Go to Page
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop Pagination */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span
                className={
                  theme === 'light' ? 'text-gray-500' : 'text-white/60'
                }
              >
                Page
              </span>
              <div
                className={`px-3 py-1 rounded-lg border ${
                  theme === 'light'
                    ? 'bg-gray-50 border-gray-300'
                    : 'bg-white/5 border-white/[0.1]'
                }`}
              >
                <span
                  className={theme === 'light' ? 'text-gray-900' : 'text-white'}
                >
                  {currentPage}
                </span>
              </div>
              <span
                className={
                  theme === 'light' ? 'text-gray-500' : 'text-white/60'
                }
              >
                of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={pagination.totalPages}
                  defaultValue={currentPage}
                  ref={pageInputRef}
                  className={`w-16 px-2 py-1 rounded-lg text-center text-sm focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'bg-gray-50 border border-gray-300 focus:ring-blue-500/20 text-gray-900'
                      : 'bg-white/5 border border-white/[0.1] focus:ring-[#ffaa3b]/50 text-white'
                  }`}
                  placeholder="Page"
                />
                <button
                  onClick={() => {
                    const page = pageInputRef.current
                      ? parseInt(pageInputRef.current.value, 10)
                      : NaN;
                    if (!isNaN(page)) {
                      updateQueryParam('page', page);
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    theme === 'light'
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20'
                  }`}
                >
                  Go
                </button>
              </div>
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage >= pagination.totalPages}
              className={`px-3 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                theme === 'light'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50'
                  : 'bg-white/5 hover:bg-white/10 disabled:bg-white/5'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {albumToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className={`max-w-md w-full mx-4 p-6 rounded-lg ${
              theme === 'light' ? 'bg-white' : 'bg-[#121212]'
            }`}
          >
            <h3
              className={`text-xl font-bold mb-4 ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}
            >
              Delete Album
            </h3>
            <p
              className={
                theme === 'light' ? 'text-gray-600 mb-6' : 'text-white/60 mb-6'
              }
            >
              Are you sure you want to delete "{albumToDelete.title}"? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setAlbumToDelete(null)}
                className={`px-4 py-2 text-sm font-medium ${
                  theme === 'light'
                    ? 'text-gray-600 hover:text-gray-900'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAlbum(albumToDelete.id)}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
