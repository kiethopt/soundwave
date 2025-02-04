'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { User, MoreVertical, Power, Trash2 } from 'lucide-react';
import { ArtistProfile } from '@/types';
import { Search, Spinner } from '@/components/ui/Icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'react-toastify';

export default function AdminArtists() {
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const limit = 10;

  // Sử dụng router và searchParams để quản lý query param "page"
  const searchParams = useSearchParams();
  const router = useRouter();

  // Nếu query param "page" có giá trị nhỏ hơn 1 hoặc bằng "1", loại bỏ nó để đảm bảo URL luôn sạch
  useEffect(() => {
    const pageStr = searchParams.get('page');
    const pageNumber = Number(pageStr);
    if (pageStr === '1' || pageNumber < 1) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('page');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/admin/artists${queryStr}`);
    }
  }, [searchParams, router]);

  // Lấy số trang hiện tại từ URL (mặc định là 1 nếu không có)
  const currentPage = Number(searchParams.get('page')) || 1;

  // Hàm cập nhật query param
  // Nếu totalPages === 1 và giá trị cập nhật khác 1, thì không update để tránh chuyển sang trang không có dữ liệu.
  // Nếu giá trị vượt quá totalPages, sẽ gán lại bằng totalPages.
  const updateQueryParam = (param: string, value: number) => {
    if (totalPages === 1 && value !== 1) {
      // Nếu chỉ có 1 trang, không cho chuyển sang trang khác
      return;
    }
    if (value < 1) value = 1;
    if (value > totalPages) value = totalPages;
    const current = new URLSearchParams(searchParams.toString());
    if (value === 1) {
      current.delete(param);
    } else {
      current.set(param, value.toString());
    }
    const queryStr = current.toString() ? `?${current.toString()}` : '';
    router.push(`/admin/artists${queryStr}`);
  };

  // Gọi API lấy danh sách artist với số trang và limit được truyền qua query param
  const fetchArtists = async (page: number, query: string = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.artists.getAllArtistsProfile(
        token,
        page,
        limit
      );
      setArtists(response.artists);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch artists');
    } finally {
      setLoading(false);
    }
  };

  // Khi currentPage (lấy từ URL) hoặc searchInput thay đổi, gọi API lại
  useEffect(() => {
    fetchArtists(currentPage, searchInput);
  }, [currentPage, searchInput]);

  // Khi tìm kiếm, reset về trang 1 (bằng cách update query param "page")
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParam('page', 1);
  };

  const handleDeactivateArtist = async (
    artistId: string,
    currentStatus: boolean
  ) => {
    try {
      setActionLoading(artistId);
      const token = localStorage.getItem('userToken');
      if (!token) return;

      // Gọi API với giá trị isActive mới
      await api.admin.deactivateArtist(
        artistId,
        { isActive: !currentStatus },
        token
      );

      // Cập nhật state với giá trị mới
      setArtists((prev) =>
        prev.map((artist) =>
          artist.id === artistId
            ? {
                ...artist,
                isActive: !currentStatus,
                // Reset current profile nếu deactivate
                user: {
                  ...artist.user,
                  currentProfile: !currentStatus
                    ? 'USER'
                    : artist.user.currentProfile,
                },
              }
            : artist
        )
      );

      toast.success(
        `Artist ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteArtist = async (artistId: string) => {
    if (!confirm('Are you sure you want to delete this artist?')) return;

    try {
      setActionLoading(artistId);
      const token = localStorage.getItem('userToken');
      if (!token) return;

      await api.admin.deleteArtist(artistId, token);

      setArtists((prevArtists) =>
        prevArtists.filter((artist) => artist.id !== artistId)
      );
      toast.success('Artist deleted successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete artist';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Dùng cho input "Go to page" của pagination
  const pageInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="container mx-auto space-y-8 mb-16" suppressHydrationWarning>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Artist Management
          </h1>
          <p className="text-white/60 mt-2 text-sm md:text-base">
            Manage and monitor artist profiles
          </p>
        </div>
        <form onSubmit={handleSearch} className="relative w-full md:w-auto">
          <input
            type="text"
            placeholder="Search artists..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
          />
          <button
            type="submit"
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
          >
            <Search className="text-white/40 w-5 h-5" />
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg">{error}</div>
      )}

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08] relative">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-white/5 border-b border-white/[0.08]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Monthly Listeners
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Created At
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {loading
                ? Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                            <div className="space-y-2">
                              <div className="h-4 bg-white/10 rounded w-32 animate-pulse" />
                              <div className="h-3 bg-white/10 rounded w-24 animate-pulse" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-white/10 rounded w-48 animate-pulse" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-6 bg-white/10 rounded-full w-20 animate-pulse" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="h-6 w-6 bg-white/10 rounded-full animate-pulse" />
                        </td>
                      </tr>
                    ))
                : artists.map((artist) => (
                    <tr key={artist.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {artist.avatar ? (
                            <img
                              src={artist.avatar}
                              alt={artist.artistName}
                              className="w-10 h-10 rounded-full mr-3 object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = '/images/default-avatar.jpg';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full mr-3 bg-white/[0.03] flex items-center justify-center">
                              <User className="w-6 h-6 text-white/60" />
                            </div>
                          )}
                          <Link
                            href={`/admin/artists/${artist.id}`}
                            className="font-medium truncate hover:underline"
                          >
                            {artist.artistName}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {artist.user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {artist.monthlyListeners.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              artist.isVerified
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-yellow-500/10 text-yellow-500'
                            }`}
                          >
                            {artist.isVerified ? 'Verified' : 'Unverified'}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              artist.isActive
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-red-500/10 text-red-500'
                            }`}
                          >
                            {artist.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatDate(artist.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="hover:bg-white/10 p-2 rounded-full">
                            <MoreVertical className="w-5 h-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#282828] border-white/10 text-white">
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeactivateArtist(
                                  artist.id,
                                  artist.isActive
                                )
                              }
                              disabled={actionLoading === artist.id}
                              className="cursor-pointer hover:bg-white/10"
                            >
                              <Power className="w-4 h-4 mr-2" />
                              {artist.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => handleDeleteArtist(artist.id)}
                              disabled={actionLoading === artist.id}
                              className="text-red-400 cursor-pointer hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Artist
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!loading && artists.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
              <User className="w-12 h-12 mb-4" />
              <p>No artists found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-white/[0.08]">
            <button
              onClick={() => updateQueryParam('page', currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-white/5 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>

            {/* Mobile Pagination */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger className="px-3 py-2 bg-white/5 rounded-md hover:bg-white/10 text-sm">
                  {currentPage} of {totalPages}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#282828] border border-white/[0.1] text-white p-4 w-[200px]">
                  <div className="space-y-3">
                    <div className="text-xs text-white/60">Go to page:</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        defaultValue={currentPage}
                        ref={pageInputRef}
                        className="w-full px-2 py-1 rounded-md bg-white/5 border border-white/[0.1] text-white text-center focus:outline-none focus:ring-2 focus:ring-[#ffaa3b]/50 text-sm"
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
                      className="w-full px-3 py-1.5 rounded-md bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20 transition-colors text-sm"
                    >
                      Go to Page
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop Pagination */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-white/60">Page</span>
              <div className="bg-white/5 px-3 py-1 rounded-md border border-white/[0.1]">
                <span className="text-white font-medium">{currentPage}</span>
              </div>
              <span className="text-white/60">of {totalPages}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  defaultValue={currentPage}
                  ref={pageInputRef}
                  className="w-16 px-2 py-1 rounded-md bg-white/5 border border-white/[0.1] text-white text-center focus:outline-none focus:ring-2 focus:ring-[#ffaa3b]/50 text-sm"
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
                  className="px-3 py-1 rounded-md bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20 transition-colors text-sm"
                >
                  Go
                </button>
              </div>
            </div>

            <button
              onClick={() => updateQueryParam('page', currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-white/5 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Spinner className="w-8 h-8 animate-spin text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
