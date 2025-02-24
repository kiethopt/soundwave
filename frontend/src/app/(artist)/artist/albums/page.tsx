'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Album } from '@/types';
import { api } from '@/utils/api';
import { MoreVertical, Eye, EyeOff, Trash2, Music } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableWrapper } from '@/components/data-table/data-table-wrapper';
import Link from 'next/link';
import { getAlbumColumns } from '@/components/data-table/data-table-columns';

export default function ArtistAlbums() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const { theme } = useTheme();

  // State for sorting, column filters, visibility, row selection, selected rows, status filter
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [selectedRows, setSelectedRows] = useState<Album[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const searchParams = useSearchParams();
  const router = useRouter();

  // URL handling logic
  useEffect(() => {
    const pageStr = searchParams.get('page');
    const pageNumber = Number(pageStr);
    if (pageStr === '1' || pageNumber < 1) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('page');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/artist/albums${queryStr}`);
    }
  }, [searchParams, router]);

  const pageFromURL = Number(searchParams.get('page'));
  const currentPage = isNaN(pageFromURL) || pageFromURL < 1 ? 1 : pageFromURL;

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
    router.push(`/artist/albums${queryStr}`);
  };

  // API calls
  const fetchAlbums = async (page: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      // Tạo query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      // Thêm search param nếu có
      if (searchInput) {
        params.append('q', searchInput);
      }

      // Thêm status filter nếu có
      if (statusFilter.length === 1) {
        params.append('status', statusFilter[0]);
      }

      const response = await api.albums.getAll(
        token,
        page,
        limit,
        params.toString()
      );
      setAlbums(response.albums);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to fetch albums'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset về trang 1 khi filter hoặc search thay đổi
    if (currentPage !== 1) {
      updateQueryParam('page', 1);
    } else {
      fetchAlbums(1);
    }
  }, [searchInput, statusFilter]);

  useEffect(() => {
    fetchAlbums(currentPage);
  }, [currentPage]);

  // Action handlers
  const handleAlbumVisibility = async (albumId: string, isActive: boolean) => {
    try {
      setActionLoading(albumId);
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      await api.albums.toggleVisibility(albumId, token);
      setAlbums((prev) =>
        prev.map((album) =>
          album.id === albumId ? { ...album, isActive: !isActive } : album
        )
      );
      toast.success(
        `Album ${isActive ? 'hidden' : 'made visible'} successfully`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update album'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAlbum = async (albumId: string | string[]) => {
    const ids = Array.isArray(albumId) ? albumId : [albumId];
    const confirmMessage =
      ids.length === 1
        ? 'Are you sure you want to delete this album?'
        : `Delete ${ids.length} selected albums?`;

    if (!confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      // Nếu xóa một album, set loading state cho album đó
      if (!Array.isArray(albumId)) {
        setActionLoading(albumId);
      }

      await Promise.all(ids.map((id) => api.albums.delete(id, token)));

      // Nếu xóa một album, cập nhật state albums ngay lập tức
      if (!Array.isArray(albumId)) {
        setAlbums((prev) => prev.filter((album) => album.id !== albumId));
      } else {
        // Nếu xóa nhiều albums, fetch lại data
        await fetchAlbums(currentPage);
      }

      toast.success(
        ids.length === 1
          ? 'Album deleted successfully'
          : `Deleted ${ids.length} albums successfully`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete album(s)'
      );
    } finally {
      if (!Array.isArray(albumId)) {
        setActionLoading(null);
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (
      !selectedRows.length ||
      !confirm(`Delete ${selectedRows.length} selected albums?`)
    )
      return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await Promise.all(
        selectedRows.map((row) => api.albums.delete(row.id, token))
      );

      setSelectedRows([]);
      fetchAlbums(currentPage);
      toast.success(`Deleted ${selectedRows.length} albums successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Deletion failed');
    }
  };

  // Table columns definition
  const columns = getAlbumColumns({
    theme,
    onVisibilityChange: handleAlbumVisibility,
    onDelete: handleDeleteAlbum,
  });

  const table = useReactTable({
    data: albums,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: limit,
      },
    },
    pageCount: totalPages,
    manualPagination: true,
  });

  return (
    <div
      className={`container mx-auto space-y-4 p-4 pb-20 ${
        theme === 'dark' ? 'text-white' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6">
        <div>
          <h1
            className={`text-2xl md:text-3xl font-bold tracking-tight ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Album Management
          </h1>
          <p
            className={`text-muted-foreground ${
              theme === 'dark' ? 'text-white/60' : ''
            }`}
          >
            Manage your albums and tracks
          </p>
        </div>

        <Link
          href="/artist/albums/new"
          className={`px-4 py-2 rounded-md font-medium transition-colors w-fit h-fit ${
            theme === 'light'
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-white text-[#121212] hover:bg-white/90'
          }`}
        >
          New Album
        </Link>
      </div>

      <DataTableWrapper
        table={table}
        columns={columns}
        data={albums}
        pageCount={totalPages}
        pageIndex={currentPage - 1}
        loading={loading}
        onPageChange={(page) => updateQueryParam('page', page + 1)}
        onRowSelection={setSelectedRows}
        theme={theme}
        toolbar={{
          searchValue: searchInput,
          onSearchChange: setSearchInput,
          selectedRowsCount: selectedRows.length,
          onDelete: () => handleDeleteAlbum(selectedRows.map((row) => row.id)),
          showExport: true,
          exportData: {
            data: albums,
            columns: [
              { key: 'id', header: 'ID' },
              { key: 'title', header: 'Title' },
              { key: 'type', header: 'Type' },
              { key: 'totalTracks', header: 'Total Tracks' },
              { key: 'duration', header: 'Duration' },
              { key: 'isActive', header: 'Status' },
              { key: 'releaseDate', header: 'Release Date' },
              { key: 'createdAt', header: 'Created At' },
              { key: 'updatedAt', header: 'Updated At' },
            ],
            filename: 'albums',
          },
          searchPlaceholder: 'Search albums...',
          statusFilter: {
            value: statusFilter,
            onChange: setStatusFilter,
          },
        }}
      />
    </div>
  );
}
