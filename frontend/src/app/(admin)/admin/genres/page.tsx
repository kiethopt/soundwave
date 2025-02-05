'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import {
  Edit,
  MoreVertical,
  Music,
  Search,
  Spinner,
  Trash2,
} from '@/components/ui/Icons';
import { toast } from 'react-toastify';
import { Button } from '@/components/layout/Button/Button';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function AdminGenres() {
  const [genres, setGenres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [editingGenre, setEditingGenre] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const limit = 10;

  // Sử dụng hooks của Next để làm việc với URL query params
  const searchParams = useSearchParams();
  const router = useRouter();

  // Nếu query param "page" có giá trị "1" hoặc nhỏ hơn 1, loại bỏ nó để URL được gọn
  useEffect(() => {
    const pageStr = searchParams.get('page');
    const pageNumber = Number(pageStr);
    if (pageStr === '1' || pageNumber < 1) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('page');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/admin/genres${queryStr}`);
    }
  }, [searchParams, router]);

  // Lấy số trang hiện tại từ URL, đảm bảo trả về giá trị tối thiểu là 1
  const pageFromURL = Number(searchParams.get('page'));
  const currentPage = pageFromURL > 0 ? pageFromURL : 1;

  // Hàm cập nhật query param "page"
  const updateQueryParam = (param: string, value: number) => {
    if (totalPages === 1 && value !== 1) return;
    if (value < 1) value = 1;
    if (value > totalPages) value = totalPages;
    const current = new URLSearchParams(searchParams.toString());
    if (value === 1) {
      current.delete(param);
    } else {
      current.set(param, value.toString());
    }
    const queryStr = current.toString() ? `?${current.toString()}` : '';
    router.push(`/admin/genres${queryStr}`);
  };

  const fetchGenres = async (page: number, query: string = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.admin.getAllGenres(token, page, limit);
      setGenres(response.genres);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch genres');
    } finally {
      setLoading(false);
    }
  };

  // Gọi API mỗi khi currentPage (lấy từ URL) hoặc searchInput thay đổi
  useEffect(() => {
    fetchGenres(currentPage, searchInput);
  }, [currentPage, searchInput]);

  // Khi submit form tìm kiếm, reset về trang 1 bằng cách cập nhật query param "page"
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParam('page', 1);
  };

  const handleDeleteGenre = async (genreId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.admin.deleteGenre(genreId, token);
      toast.success('Genre deleted successfully');
      fetchGenres(currentPage, searchInput);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete genre'
      );
    }
  };

  const handleEditGenre = (genre: { id: string; name: string }) => {
    setEditingGenre(genre);
  };

  const handleSaveEdit = async () => {
    if (!editingGenre) return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.admin.updateGenre(
        editingGenre.id,
        { name: editingGenre.name },
        token
      );
      toast.success('Genre updated successfully');
      setEditingGenre(null);
      fetchGenres(currentPage, searchInput);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update genre'
      );
    }
  };

  // useRef cho input "Go to page" trong pagination
  const pageInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="container mx-auto space-y-8 p-4 mb-16"
      suppressHydrationWarning
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Genre Management
          </h1>
          <p className="text-white/60 mt-2 text-sm md:text-base">
            View and manage music genres
          </p>
        </div>
        <form onSubmit={handleSearch} className="relative w-full md:w-auto">
          <input
            type="text"
            placeholder="Search genres..."
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
        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
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
                          <div className="h-4 bg-white/10 rounded w-32 animate-pulse" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="h-8 w-8 bg-white/10 rounded-full animate-pulse ml-auto" />
                        </td>
                      </tr>
                    ))
                : genres.map((genre) => (
                    <tr key={genre.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {genre.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(genre.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="hover:bg-white/10 p-2 rounded-full">
                            <MoreVertical className="w-5 h-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#282828] border-white/10 text-white">
                            <DropdownMenuItem
                              onClick={() => handleEditGenre(genre)}
                              className="cursor-pointer hover:bg-white/10 text-sm"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Genre
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => handleDeleteGenre(genre.id)}
                              className="text-red-400 cursor-pointer hover:bg-red-500/20 text-sm"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Genre
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!loading && genres.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
              <Music className="w-12 h-12 mb-4" />
              <p>No genres found</p>
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

      {/* Edit Genre Modal */}
      {editingGenre && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#121212] p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Genre</h2>
            <input
              type="text"
              value={editingGenre.name}
              onChange={(e) =>
                setEditingGenre({ ...editingGenre, name: e.target.value })
              }
              className="w-full p-2 bg-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="ghost" onClick={() => setEditingGenre(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
