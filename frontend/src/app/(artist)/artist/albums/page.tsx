'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Album, Genre } from '@/types';
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
  Updater,
  RowSelectionState,
} from '@tanstack/react-table';
import { DataTableWrapper } from '@/components/ui/data-table/data-table-wrapper';
import Link from 'next/link';
import { getAlbumColumns } from '@/components/ui/data-table/data-table-columns';
import { useDataTable } from '@/hooks/useDataTable';
import { EditAlbumModal } from '@/components/ui/data-table/data-table-modals';

export default function AlbumManagement() {
  const { theme } = useTheme();
  const limit = 10;

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
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found');

      const response = await api.albums.getAll(
        token,
        page,
        limit,
        params.toString()
      );
      console.log('API Response Albums:', response.albums); // Thêm log để kiểm tra response
      return {
        data: response.albums,
        pagination: response.pagination,
      };
    },
    limit,
  });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [availableGenres, setAvailableGenres] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [availableLabels, setAvailableLabels] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  const getAuthToken = () => localStorage.getItem('userToken');

  const fetchMetadata = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Please login to continue');
      return;
    }

    try {
      const [genresResponse, labelsResponse] = await Promise.all([
        api.artists.getAllGenres(token, 1, 100),
        api.labels.getAll(token, 1, 100),
      ]);

      setAvailableGenres(genresResponse.genres);
      setAvailableLabels(labelsResponse.labels);

      if (selectedAlbum) {
        setSelectedGenres(selectedAlbum.genres?.map((g) => g.genre.id) || []);
        if (selectedAlbum.labelId) {
          const matchedLabel = labelsResponse.labels.find(
            (label: { id: string; name: string }) => label.id === selectedAlbum.labelId
          );
          if (matchedLabel) {
            setSelectedLabelId(matchedLabel.id);
            console.log('Matched Label:', matchedLabel);
          } else {
            console.warn('Label ID not found in availableLabels:', selectedAlbum.labelId);
          }
        } else {
          setSelectedLabelId(null);
          console.log('No label ID in selectedAlbum');
        }
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      toast.error('Failed to load metadata');
    }
  }, [selectedAlbum]);

  useEffect(() => {
    if (selectedAlbum || !availableGenres.length) {
      fetchMetadata();
    }
  }, [fetchMetadata, selectedAlbum]);

  const handleEditAlbum = (album: Album) => {
    setSelectedAlbum(album);
    setSelectedGenres(album.genres?.map((g) => g.genre.id) || []);
    setSelectedLabelId(album.labelId || null); // Khởi tạo với labelId
  };

  const handleSubmit = async (albumId: string, formData: FormData) => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      setActionLoading(albumId);
      await api.albums.update(albumId, formData, token);
      toast.success('Album updated successfully');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(searchInput && { q: searchInput }),
        ...(statusFilter.length === 1 && { status: statusFilter[0] }),
        ...(genreFilter.length > 0 && { genres: genreFilter.join(',') }),
      });
      const response = await api.albums.getAll(
        token,
        currentPage,
        limit,
        params.toString()
      );
      setAlbums(response.albums);

      setSelectedAlbum(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update album'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleAlbumVisibility = async (albumId: string, isActive: boolean) => {
    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      setActionLoading(albumId);
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
        error instanceof Error ? error.message : 'Failed to toggle visibility'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAlbums = async (albumIds: string | string[]) => {
    const ids = Array.isArray(albumIds) ? albumIds : [albumIds];
    if (
      !confirm(
        `Are you sure you want to delete ${ids.length} album${ids.length > 1 ? 's' : ''
        }?`
      )
    ) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    try {
      setActionLoading(Array.isArray(albumIds) ? ids[0] : albumIds);
      await Promise.all(ids.map((id) => api.albums.delete(id, token)));

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(searchInput && { q: searchInput }),
        ...(statusFilter.length === 1 && { status: statusFilter[0] }),
        ...(genreFilter.length > 0 && { genres: genreFilter.join(',') }),
      });
      const response = await api.albums.getAll(
        token,
        currentPage,
        limit,
        params.toString()
      );
      setAlbums(response.albums);

      toast.success(
        `Deleted ${ids.length} album${ids.length > 1 ? 's' : ''} successfully`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete albums'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const columns = getAlbumColumns({
    theme,
    onVisibilityChange: handleAlbumVisibility,
    onDelete: handleDeleteAlbums,
    onEdit: handleEditAlbum,
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
    onRowSelectionChange: (updatedSelection: Updater<RowSelectionState>) => {
      setRowSelection(updatedSelection);
      const selectedRowData = albums.filter((_, index) => {
        const selectionState =
          typeof updatedSelection === 'function'
            ? updatedSelection(rowSelection)
            : updatedSelection;
        return selectionState[index.toString()];
      });
      setSelectedRows(selectedRowData);
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: { pageIndex: currentPage - 1, pageSize: limit },
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
              {
                key: 'genres',
                header: 'Genres',
                accessor: (row: Album) =>
                  row.genres
                    ?.map(
                      (g: { genre: { id: string; name: string } }) =>
                        g.genre.name
                    )
                    .join(', ') || '',
              },
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

      {selectedAlbum && (
        <EditAlbumModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          onSubmit={handleSubmit}
          availableGenres={availableGenres}
          selectedGenres={selectedGenres}
          setSelectedGenres={setSelectedGenres}
          availableLabels={availableLabels}
          selectedLabelId={selectedLabelId}
          setSelectedLabelId={setSelectedLabelId}
          theme={theme}
        />
      )}
    </div>
  );
}