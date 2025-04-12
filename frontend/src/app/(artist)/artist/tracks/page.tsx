'use client';

import { useState, useEffect, useCallback } from 'react';
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
  RowSelectionState,
} from '@tanstack/react-table';
import { DataTableWrapper } from '@/components/ui/data-table/data-table-wrapper';
import Link from 'next/link';
import { EditTrackModal } from '@/components/ui/data-table/data-table-modals';
import { getTrackColumns } from '@/components/ui/data-table/data-table-columns';
import { useDataTable } from '@/hooks/useDataTable';
import type { Track, ArtistProfile, Genre, Label } from '@/types';

export default function TrackManagement() {
  const { theme } = useTheme();
  const limit = 10;

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
    refreshData,
  } = useDataTable<Track>({
    fetchData: async (page, params) => {
      const token = localStorage.getItem('userToken') || '';
      const response = await api.tracks.getTracks(
        token,
        page,
        limit,
        params.toString()
      );
      console.log('API Response Tracks:', response.tracks); // Log để xem cấu trúc dữ liệu
      return {
        data: response.tracks,
        pagination: response.pagination,
      };
    },
    limit,
  });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

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
  const [availableLabels, setAvailableLabels] = useState<{ id: string; name: string }[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  const fetchMetadata = useCallback(async () => {
    setSelectedFeaturedArtists([]);
    setSelectedGenres([]);
    setSelectedLabelId(null);

    try {
      const token = localStorage.getItem('userToken');
      if (!token) return;

      const [artistsResponse, genresResponse, labelsResponse] = await Promise.all([
        api.artists.getAllArtistsProfile(token, 1, 500),
        api.genres.getAll(token, 1, 100),
        api.labels.getAll(token, 1, 500),
      ]);

      const artists = artistsResponse.artists.map((artist: ArtistProfile) => ({
        id: artist.id,
        name: artist.artistName,
      }));
      const genres = genresResponse.genres.map((genre: Genre) => ({
        id: genre.id,
        name: genre.name,
      }));
      const labels = labelsResponse.labels.map((label: { id: string; name: string }) => ({
        id: label.id,
        name: label.name,
      }));

      setAvailableArtists(artists);
      setAvailableGenres(genres);
      setAvailableLabels(labels);

      if (editingTrack) {
        setSelectedFeaturedArtists(
          editingTrack.featuredArtists?.map((fa) => fa.artistProfile.id) || []
        );
        setSelectedGenres(editingTrack.genres?.map((g) => g.genre.id) || []);

        // Sử dụng labelId thay vì label
        if (editingTrack.labelId) {
          const matchedLabel = labels.find((label: { id: string; name: string }) =>
            label.id === editingTrack.labelId
          );
          if (matchedLabel) {
            setSelectedLabelId(matchedLabel.id);
            console.log('Matched Label:', matchedLabel);
          } else {
            console.warn('Label ID not found in availableLabels:', editingTrack.labelId);
          }
        } else {
          console.log('No label ID in editingTrack');
        }
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
      toast.error('Failed to load required select options');
    }
  }, [editingTrack]);

  useEffect(() => {
    if (editingTrack) {
      fetchMetadata();
    }
  }, [editingTrack, fetchMetadata]);

  const handleTrackVisibility = async (trackId: string, isActive: boolean) => {
    setActionLoading(trackId);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');
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
      setTracks((prev) =>
        prev.map((track) =>
          track.id === trackId ? { ...track, isActive: isActive } : track
        )
      );
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to update track visibility';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTracks = async (trackIds: string | string[]) => {
    const idsToDelete = Array.isArray(trackIds) ? trackIds : [trackIds];
    if (idsToDelete.length === 0) return;

    const confirmMessage =
      idsToDelete.length === 1
        ? 'Are you sure you want to delete this track?'
        : `Delete ${idsToDelete.length} selected tracks?`;
    if (!confirm(confirmMessage)) return;

    idsToDelete.forEach((id) => setActionLoading(id));
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');
      await Promise.all(idsToDelete.map((id) => api.tracks.delete(id, token)));
      await refreshData();
      setRowSelection({});
      setSelectedRows([]);
      toast.success(
        idsToDelete.length === 1
          ? 'Track deleted successfully'
          : `Deleted ${idsToDelete.length} tracks successfully`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete track(s)';
      toast.error(errorMessage);
      idsToDelete.forEach((id) => setActionLoading(null));
    }
  };

  const handleUpdateTrack = async (trackId: string, formData: FormData) => {
    setActionLoading(trackId);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      // Đảm bảo labelId đã được thêm vào formData từ handleFormSubmit
      await api.tracks.update(trackId, formData, token);
      await refreshData();
      setEditingTrack(null);
      toast.success('Track updated successfully');
    } catch (error) {
      console.error('Update track error:', error);
      const errorMessage =
        (error as any)?.response?.data?.message || 'Failed to update track';
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const columns = getTrackColumns({
    theme,
    onVisibilityChange: handleTrackVisibility,
    onDelete: handleDeleteTracks,
    onEdit: (track: Track) => {
      setEditingTrack(track);
    },
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
    onRowSelectionChange: (updater) => {
      const newRowSelection =
        typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(newRowSelection);
      const selectedIndexes = Object.keys(newRowSelection).filter(
        (key) => newRowSelection[key]
      );
      const newlySelectedRows = selectedIndexes
        .map((index) => tracks[parseInt(index, 10)])
        .filter(Boolean);
      setSelectedRows(newlySelectedRows);
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
    debugTable: process.env.NODE_ENV === 'development',
  });

  // Add useEffect for auto-refresh when release dates pass
  useEffect(() => {
    if (tracks.length === 0 || loading) return;

    let nextReleaseTimeout: NodeJS.Timeout | null = null;
    let shouldRefresh = false;

    const checkForUpcomingReleases = () => {
      const now = new Date();
      let closestReleaseTime: Date | null = null;
      let timeUntilNextRelease = Infinity;

      // Find the closest upcoming release date
      tracks.forEach((track) => {
        const releaseDate = new Date(track.releaseDate);
        const timeUntilRelease = releaseDate.getTime() - now.getTime();

        // If release date is in the future but coming up soon (within 1 hour)
        if (
          timeUntilRelease > 0 &&
          timeUntilRelease < 3600000 &&
          timeUntilRelease < timeUntilNextRelease
        ) {
          timeUntilNextRelease = timeUntilRelease;
          closestReleaseTime = releaseDate;
        }

        // If release date just passed (within last 5 seconds) and item is not active
        if (
          timeUntilRelease >= -5000 &&
          timeUntilRelease <= 0 &&
          !track.isActive
        ) {
          shouldRefresh = true;
        }
      });

      // If we should refresh now (a release date just passed)
      if (shouldRefresh) {
        refreshData();
        shouldRefresh = false;
      }

      // If there's an upcoming release, set a timeout to refresh at that time
      if (closestReleaseTime) {
        const delayMs = Math.max(100, timeUntilNextRelease);

        if (nextReleaseTimeout) {
          clearTimeout(nextReleaseTimeout);
        }

        nextReleaseTimeout = setTimeout(() => {
          refreshData();
          // After refresh, check again for next release
          checkForUpcomingReleases();
        }, delayMs);
      }
    };

    // Initial check
    checkForUpcomingReleases();

    // Set up an interval to periodically check (every 30 seconds)
    const intervalId = setInterval(checkForUpcomingReleases, 30000);

    return () => {
      clearInterval(intervalId);
      if (nextReleaseTimeout) {
        clearTimeout(nextReleaseTimeout);
      }
    };
  }, [tracks, loading, refreshData]);

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
            Track Management
          </h1>
          <p
            className={`text-muted-foreground ${theme === 'dark' ? 'text-white/60' : ''
              }`}
          >
            Manage and monitor your tracks
          </p>
        </div>
        <Link
          href="/artist/tracks/new"
          className={`px-4 py-2 rounded-md font-medium transition-colors w-fit h-fit ${theme === 'light'
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
        onPageChange={(page) => updateQueryParam({ page: page + 1 })}
        theme={theme}
        toolbar={{
          searchValue: searchInput,
          onSearchChange: (value) => {
            setSearchInput(value);
            updateQueryParam({ q: value });
          },
          selectedRowsCount: selectedRows.length,
          onDelete: () => handleDeleteTracks(selectedRows.map((row) => row.id)),
          showExport: true,
          exportData: {
            data: tracks,
            columns: [
              { key: 'title', header: 'Track Title' },
              { key: 'album.title', header: 'Album' },
              {
                key: 'featuredArtists',
                header: 'Featured Artists',
                format: (val: any[]) =>
                  val?.map((a) => a.artistProfile.artistName).join(', '),
              },
              {
                key: 'genres',
                header: 'Genres',
                format: (val: any[]) =>
                  val?.map((g) => g.genre.name).join(', '),
              },
              { key: 'label.name', header: 'Label' },
              { key: 'duration', header: 'Duration' },
              { key: 'playCount', header: 'Plays' },
              {
                key: 'isActive',
                header: 'Status',
                format: (val: boolean) => (val ? 'Visible' : 'Hidden'),
              },
              {
                key: 'releaseDate',
                header: 'Release Date',
                format: (val: string) =>
                  val ? new Date(val).toLocaleString() : '',
              },
              {
                key: 'createdAt',
                header: 'Created At',
                format: (val: string) =>
                  val ? new Date(val).toLocaleString() : '',
              },
              {
                key: 'updatedAt',
                header: 'Updated At',
                format: (val: string) =>
                  val ? new Date(val).toLocaleString() : '',
              },
            ],
            filename: 'tracks-export',
          },
          searchPlaceholder: 'Search tracks by title...',
          statusFilter: {
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value);
              updateQueryParam({
                status: value.length === 1 ? value[0] : null,
              });
            },
          },
          genreFilter: {
            value: genreFilter,
            onChange: (value) => {
              setGenreFilter(value);
              updateQueryParam({ genres: value.length > 0 ? value : null });
            },
            options: availableGenres.map((genre) => ({
              value: genre.id,
              label: genre.name,
            })),
          },
        }}
      />

      {editingTrack && (
        <EditTrackModal
          track={editingTrack}
          onClose={() => {
            setEditingTrack(null);
            setSelectedFeaturedArtists([]);
            setSelectedGenres([]);
            setSelectedLabelId(null);
          }}
          onSubmit={handleUpdateTrack} // Truyền trực tiếp hàm với chữ ký đúng
          availableArtists={availableArtists}
          availableGenres={availableGenres}
          availableLabels={availableLabels}
          selectedLabelId={selectedLabelId}
          setSelectedLabelId={setSelectedLabelId}
          selectedFeaturedArtists={selectedFeaturedArtists}
          setSelectedFeaturedArtists={setSelectedFeaturedArtists}
          selectedGenres={selectedGenres}
          setSelectedGenres={setSelectedGenres}
          theme={theme}
        />
      )}
    </div>
  );
}
