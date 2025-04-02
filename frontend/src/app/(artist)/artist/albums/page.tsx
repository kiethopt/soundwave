'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Album } from '@/types';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ColumnFiltersState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { DataTableWrapper } from '@/components/ui/data-table/data-table-wrapper';
import Link from 'next/link';
import { getAlbumColumns } from '@/components/ui/data-table/data-table-columns';
import { useDataTable } from '@/hooks/useDataTable';
import { EditAlbumModal } from '@/components/ui/data-table/data-table-modals';

export default function AlbumManagement() {
  const { theme } = useTheme();
  const limit = 10;

  // Dùng custom hook để xử lý logic của data table
  const {
    data: albums,
    setData: setAlbums,
    loading,
    totalPages,
    currentPage,
    setActionLoading,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    genreFilter,
    setGenreFilter,
    selectedRows,
    setSelectedRows,
    updateQueryParam,
  } = useDataTable<Album>({
    fetchData: async (page, params) => {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.albums.getAll(
        token,
        page,
        limit,
        params.toString()
      );

      return {
        data: response.albums,
        pagination: response.pagination,
      };
    },
    limit,
  });

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  // Edit modal state
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [availableGenres, setAvailableGenres] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Fetch metadata for edit modal
  const fetchMetadata = useCallback(async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return;

      const genresResponse = await api.artists.getAllGenres(token);
      console.log('Genres response:', genresResponse);

      setAvailableGenres(
        genresResponse.genres.map((genre: { id: string; name: string }) => ({
          id: genre.id,
          name: genre.name,
        }))
      );

      // Set selected values if editing an album
      if (editingAlbum) {
        setSelectedGenres(editingAlbum.genres.map((g) => g.genre.id));
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      toast.error('Failed to load required data');
    }
  }, [editingAlbum]);

  // Fetch metadata when needed
  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

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

  const handleDeleteAlbums = async (albumIds: string | string[]) => {
    const ids = Array.isArray(albumIds) ? albumIds : [albumIds];
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

      // Set loading state for single album delete
      if (!Array.isArray(albumIds)) {
        setActionLoading(albumIds);
      }

      await Promise.all(ids.map((id) => api.albums.delete(id, token)));

      // Update UI based on delete type
      if (!Array.isArray(albumIds)) {
        setAlbums((prev) => prev.filter((album) => album.id !== albumIds));
      } else {
        // Refresh the current page
        const params = new URLSearchParams();
        params.set('page', currentPage.toString());
        params.set('limit', limit.toString());

        if (searchInput) params.append('q', searchInput);
        if (statusFilter.length === 1) params.append('status', statusFilter[0]);

        const token = localStorage.getItem('userToken');
        if (token) {
          const response = await api.albums.getAll(
            token,
            currentPage,
            limit,
            params.toString()
          );
          setAlbums(response.albums);
        }
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
      if (!Array.isArray(albumIds)) {
        setActionLoading(null);
      }
    }
  };

  const handleUpdateAlbum = async (albumId: string, formData: FormData) => {
    try {
      setActionLoading(albumId);
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      await api.albums.update(albumId, formData, token);

      // Refresh the current page
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', limit.toString());

      if (searchInput) params.append('q', searchInput);
      if (statusFilter.length === 1) params.append('status', statusFilter[0]);

      const response = await api.albums.getAll(
        token,
        currentPage,
        limit,
        params.toString()
      );
      setAlbums(response.albums);

      setEditingAlbum(null);
      toast.success('Album updated successfully');
    } catch (error) {
      console.error('Update album error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update album'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Table configuration
  const columns = getAlbumColumns({
    theme,
    onVisibilityChange: handleAlbumVisibility,
    onDelete: handleDeleteAlbums,
    onEdit: (album: Album) => setEditingAlbum(album),
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
    onRowSelectionChange: (updatedSelection) => {
      setRowSelection(updatedSelection);
      const selectedRowData = albums.filter(
        (album, index) =>
          typeof updatedSelection === 'object' &&
          updatedSelection[index.toString()]
      );
      setSelectedRows(selectedRowData);
    },
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
      className={`container mx-auto space-y-4 p-4 pb-20 ${theme === 'dark' ? 'text-white' : ''
        }`}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4 mb-6">
        <div>
          <h1
            className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
          >
            Album Management
          </h1>
          <p
            className={`text-muted-foreground ${theme === 'dark' ? 'text-white/60' : ''
              }`}
          >
            Manage and monitor your albums
          </p>
        </div>

        <Link
          href="/artist/albums/new"
          className={`px-4 py-2 rounded-md font-medium transition-colors w-fit h-fit ${theme === 'light'
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
        onPageChange={(page) => updateQueryParam({ page: page + 1 })}
        onRowSelection={setSelectedRows}
        theme={theme}
        toolbar={{
          searchValue: searchInput,
          onSearchChange: setSearchInput,
          selectedRowsCount: selectedRows.length,
          onDelete: () => handleDeleteAlbums(selectedRows.map((row) => row.id)),
          showExport: true,
          exportData: {
            data: albums,
            columns: [
              { key: 'title', header: 'Album Title' },
              { key: 'type', header: 'Type' },
              { key: 'totalTracks', header: 'Total Tracks' },
              { key: 'genres', header: 'Genres' },
              { key: 'duration', header: 'Duration' },
              { key: 'isActive', header: 'Status' },
              { key: 'releaseDate', header: 'Release Date' },
              { key: 'createdAt', header: 'Created At' },
              { key: 'updatedAt', header: 'Updated At' },
            ],
            filename: 'albums-export',
          },
          searchPlaceholder: 'Search albums...',
          statusFilter: {
            value: statusFilter,
            onChange: setStatusFilter,
          },
          genreFilter: {
            value: genreFilter,
            onChange: setGenreFilter,
            options: availableGenres.map((genre) => ({
              value: genre.id,
              label: genre.name,
            })),
          },
        }}
      />

      {/* Edit Album Modal */}
      <EditAlbumModal
        album={editingAlbum}
        onClose={() => setEditingAlbum(null)}
        onSubmit={handleUpdateAlbum}
        availableGenres={availableGenres}
        selectedGenres={selectedGenres}
        setSelectedGenres={setSelectedGenres}
        theme={theme}
      />
    </div>
  );
}
