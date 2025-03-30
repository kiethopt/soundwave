'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Track } from '@/types';
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
import { EditTrackModal } from '@/components/ui/data-table/data-table-modals';
import { getTrackColumns } from '@/components/ui/data-table/data-table-columns';
import { useDataTable } from '@/hooks/useDataTable';

export default function TrackManagement() {
  const { theme } = useTheme();
  const limit = 10;

  // Dùng custom hook để xử lý logic của data table
  const {
    data: tracks,
    setData: setTracks,
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
  } = useDataTable<Track>({
    fetchData: async (page, params) => {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.tracks.getAll(
        token,
        page,
        limit,
        params.toString()
      );

      return {
        data: response.tracks,
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
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [availableArtists, setAvailableArtists] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [availableGenres, setAvailableGenres] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedFeaturedArtists, setSelectedFeaturedArtists] = useState<
    string[]
  >([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Fetch metadata for edit modal
  const fetchMetadata = useCallback(async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return;

      const [artistsResponse, genresResponse] = await Promise.all([
        api.artists.getAllArtistsProfile(token, 1, 100),
        api.genres.getAll(token),
      ]);

      setAvailableArtists(
        artistsResponse.artists.map((artist: any) => ({
          id: artist.id,
          name: artist.artistName,
        }))
      );

      setAvailableGenres(
        genresResponse.genres.map((genre: { id: string; name: string }) => ({
          id: genre.id,
          name: genre.name,
        }))
      );

      // Set selected values if editing a track
      if (editingTrack) {
        setSelectedFeaturedArtists(
          editingTrack.featuredArtists.map((fa) => fa.artistProfile.id)
        );
        setSelectedGenres(editingTrack.genres.map((g) => g.genre.id));
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      toast.error('Failed to load required data');
    }
  }, [editingTrack]);

  // Fetch metadata when needed
  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Action handlers
  const handleTrackVisibility = async (trackId: string, isActive: boolean) => {
    try {
      setActionLoading(trackId);
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      await api.tracks.toggleVisibility(trackId, token);
      setTracks((prev) =>
        prev.map((track) =>
          track.id === trackId ? { ...track, isActive: !isActive } : track
        )
      );
      toast.success(
        `Track ${isActive ? 'hidden' : 'made visible'} successfully`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update track'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTracks = async (trackIds: string | string[]) => {
    const ids = Array.isArray(trackIds) ? trackIds : [trackIds];
    const confirmMessage =
      ids.length === 1
        ? 'Are you sure you want to delete this track?'
        : `Delete ${ids.length} selected tracks?`;

    if (!confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      // Set loading state for single track delete
      if (!Array.isArray(trackIds)) {
        setActionLoading(trackIds);
      }

      await Promise.all(ids.map((id) => api.tracks.delete(id, token)));

      // Update UI based on delete type
      if (!Array.isArray(trackIds)) {
        setTracks((prev) => prev.filter((track) => track.id !== trackIds));
      } else {
        // Refresh the current page
        const params = new URLSearchParams();
        params.set('page', currentPage.toString());
        params.set('limit', limit.toString());

        if (searchInput) params.append('q', searchInput);
        if (statusFilter.length === 1) params.append('status', statusFilter[0]);
        if (genreFilter.length > 0) {
          genreFilter.forEach((genre) => params.append('genres', genre));
        }

        const token = localStorage.getItem('userToken');
        if (token) {
          const response = await api.tracks.getAll(
            token,
            currentPage,
            limit,
            params.toString()
          );
          setTracks(response.tracks);
        }
      }

      toast.success(
        ids.length === 1
          ? 'Track deleted successfully'
          : `Deleted ${ids.length} tracks successfully`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete track(s)'
      );
    } finally {
      if (!Array.isArray(trackIds)) {
        setActionLoading(null);
      }
    }
  };

  const handleUpdateTrack = async (trackId: string, formData: FormData) => {
    try {
      setActionLoading(trackId);
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      await api.tracks.update(trackId, formData, token);

      // Refresh the current page
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', limit.toString());

      if (searchInput) params.append('q', searchInput);
      if (statusFilter.length === 1) params.append('status', statusFilter[0]);
      if (genreFilter.length > 0) {
        genreFilter.forEach((genre) => params.append('genres', genre));
      }

      const response = await api.tracks.getAll(
        token,
        currentPage,
        limit,
        params.toString()
      );
      setTracks(response.tracks);

      setEditingTrack(null);
      toast.success('Track updated successfully');
    } catch (error) {
      console.error('Update track error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update track'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Table configuration
  const columns = getTrackColumns({
    theme,
    onVisibilityChange: handleTrackVisibility,
    onDelete: handleDeleteTracks,
    onEdit: (track: Track) => setEditingTrack(track),
  });

  const table = useReactTable({
    data: tracks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updatedSelection) => {
      setRowSelection(updatedSelection);
      const selectedRowData = tracks.filter(
        (track, index) =>
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
            Track Management
          </h1>
          <p
            className={`text-muted-foreground ${
              theme === 'dark' ? 'text-white/60' : ''
            }`}
          >
            Manage and monitor your tracks
          </p>
        </div>

        <Link
          href="/artist/tracks/new"
          className={`px-4 py-2 rounded-md font-medium transition-colors w-fit h-fit ${
            theme === 'light'
              ? 'bg-gray-900 text-white hover:bg-gray-800'
              : 'bg-white text-[#121212] hover:bg-white/90'
          }`}
        >
          New Track
        </Link>
      </div>

      <DataTableWrapper
        table={table}
        columns={columns}
        data={tracks}
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
          onDelete: () => handleDeleteTracks(selectedRows.map((row) => row.id)),
          showExport: true,
          exportData: {
            data: tracks,
            columns: [
              { key: 'title', header: 'Track Title' },
              { key: 'album.title', header: 'Album' },
              { key: 'featuredArtists', header: 'Featured Artists' },
              { key: 'genres', header: 'Genres' },
              { key: 'duration', header: 'Duration' },
              { key: 'playCount', header: 'Plays' },
              { key: 'isActive', header: 'Status' },
              { key: 'releaseDate', header: 'Release Date' },
              { key: 'createdAt', header: 'Created At' },
              { key: 'updatedAt', header: 'Updated At' },
            ],
            filename: 'tracks-export',
          },
          searchPlaceholder: 'Search tracks...',
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

      {/* Edit Track Modal */}
      <EditTrackModal
        track={editingTrack}
        onClose={() => setEditingTrack(null)}
        onSubmit={handleUpdateTrack}
        availableArtists={availableArtists}
        selectedFeaturedArtists={selectedFeaturedArtists}
        setSelectedFeaturedArtists={setSelectedFeaturedArtists}
        availableGenres={availableGenres}
        selectedGenres={selectedGenres}
        setSelectedGenres={setSelectedGenres}
        theme={theme}
      />
    </div>
  );
}
