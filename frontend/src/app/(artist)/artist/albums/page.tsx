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

export default function ArtistAlbums() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Nếu query param "page" có giá trị nhỏ hơn 1 (âm) thì tự động chuyển về trang 1 (loại bỏ param)
  useEffect(() => {
    const pageParam = Number(searchParams.get('page'));
    if (pageParam < 1) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('page');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/artist/albums${queryStr}`);
    }
  }, [searchParams, router]);

  // Nếu query param "page" bằng "1" thì tự động loại bỏ nó (dù người dùng nhập thủ công)
  useEffect(() => {
    if (searchParams.get('page') === '1') {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('page');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/artist/albums${queryStr}`);
    }
  }, [searchParams, router]);

  // Get the current page (defaults to 1 if missing)
  const currentPage = Number(searchParams.get('page')) || 1;
  const [albums, setAlbums] = useState<Album[]>([]);
  // Pagination state
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

  // Check artist access on mount
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
  // Nếu page === 1 thì xóa đi parameter "page" để URL trở về dạng "/artist/albums".
  const updateQueryParam = (param: string, value: number) => {
    if (value < 1) {
      value = 1;
    }
    const current = new URLSearchParams(searchParams.toString());
    if (value === 1) {
      current.delete(param);
    } else {
      current.set(param, value.toString());
    }
    const queryStr = current.toString() ? `?${current.toString()}` : '';
    router.push(`/artist/albums${queryStr}`);
  };

  // Fetch albums data (using search if query provided, otherwise getting the artist’s albums)
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

        // Nếu page vượt quá tổng số pages trả về, reset về page 1 (URL không có param)
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

  // Debounce the search input and re-fetch when currentPage changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchAlbums(searchInput, currentPage);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchInput, currentPage, fetchAlbums]);

  const toggleAlbumVisibility = async (albumId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.albums.toggleVisibility(albumId, token);

      // Update the local albums state after toggling visibility
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
    <div className="container mx-auto space-y-8" suppressHydrationWarning>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Album Management
          </h1>
          <p className="text-white/60 mt-2">
            Create and manage your music albums
          </p>
        </div>
        <Link
          href="/artist/albums/new"
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-white/90"
        >
          <AddSimple className="w-4 h-4" />
          New Album
        </Link>
      </div>

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08]">
        <div className="p-6 border-b border-white/[0.08]">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search albums..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : albums.length > 0 ? (
            <div className="min-w-full overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/[0.03]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider hidden md:table-cell">
                      Release Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider hidden sm:table-cell">
                      Total Tracks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider hidden sm:table-cell">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.08]">
                  {albums.map((album) => (
                    <tr
                      key={album.id}
                      className="hover:bg-white/[0.03] transition-colors"
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
                            <div className="w-10 h-10 rounded-md mr-3 bg-white/[0.03] flex items-center justify-center">
                              <Music className="w-6 h-6 text-white/60" />
                            </div>
                          )}
                          <Link
                            href={`/artist/albums/${album.id}`}
                            title={album.title}
                            className="font-medium hover:underline"
                          >
                            {album.title}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        {new Date(album.releaseDate).toLocaleDateString(
                          'en-GB'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        {album.totalTracks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        {album.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            album.isActive
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-yellow-500/10 text-yellow-500'
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
                          <DropdownMenuTrigger className="hover:bg-white/10 p-2 rounded-full">
                            <MoreVertical className="w-5 h-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#282828] border border-white/10 text-white">
                            <DropdownMenuItem
                              onClick={() => toggleAlbumVisibility(album.id)}
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
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => setAlbumToDelete(album)}
                              className="text-red-400"
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
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
              <Music className="w-12 h-12 mb-4" />
              <p>No albums found</p>
            </div>
          )}
        </div>
      </div>

      {pagination.total > 0 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 transition-colors"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            <span className="text-white/60">Page</span>
            <div className="bg-white/5 px-3 py-1 rounded-lg border border-white/10">
              <span className="text-white font-medium">{currentPage}</span>
            </div>
            <span className="text-white/60">of {pagination.totalPages}</span>

            <div className="flex items-center gap-2 ml-4">
              <input
                type="number"
                min={1}
                max={pagination.totalPages}
                defaultValue={currentPage}
                ref={pageInputRef}
                className="w-16 px-3 py-1 rounded-lg bg-white/5 border border-white/[0.1] text-white text-center focus:outline-none focus:ring-2 focus:ring-[#ffaa3b]/50"
                placeholder="Page"
              />
              <button
                onClick={() => {
                  const page = pageInputRef.current
                    ? parseInt(pageInputRef.current.value, 10)
                    : NaN;
                  if (
                    !isNaN(page) &&
                    page >= 1 &&
                    page <= pagination.totalPages
                  ) {
                    updateQueryParam('page', page);
                  } else if (!isNaN(page) && page < 1) {
                    updateQueryParam('page', 1);
                  }
                }}
                className="px-3 py-1 rounded-lg bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20 transition-colors"
              >
                Go
              </button>
            </div>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= pagination.totalPages}
            className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {albumToDelete && (
        <div className="fixed inset-0 bg-[#404045]/50 flex items-center justify-center z-50">
          <div className="bg-[#121212] p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Delete Album</h3>
            <p className="text-white/60 mb-6">
              Are you sure you want to delete "{albumToDelete.title}"? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setAlbumToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAlbum(albumToDelete.id)}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-md hover:bg-red-600"
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
