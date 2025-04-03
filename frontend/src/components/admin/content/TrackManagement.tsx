'use client';

import React, { useMemo, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext'; // Make sure this import exists if used
import { DataTableWrapper } from '@/components/ui/data-table/data-table-wrapper';
import { useDataTable } from '@/hooks/useDataTable';
import { api } from '@/utils/api';
import { getTrackColumns } from '@/components/ui/data-table/data-table-columns';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import type { Track, FetchDataResponse } from '@/types';
import toast from 'react-hot-toast';

interface TrackManagementProps {
  theme: 'light' | 'dark';
}

export const TrackManagement: React.FC<TrackManagementProps> = ({ theme }) => {
  // --- Track Management State & Logic ---
  const fetchTracks = useCallback(
    async (
      page: number,
      params: URLSearchParams
    ): Promise<FetchDataResponse<Track>> => {
      try {
        const token = localStorage.getItem('userToken') || '';
        const response = await api.tracks.getAll(
          token,
          page,
          10,
          params.toString()
        );

        if (response && response.tracks && response.pagination) {
          return {
            data: response.tracks,
            pagination: {
              totalPages: response.pagination.totalPages,
            },
          };
        } else {
          console.error(
            'Unexpected API response structure for tracks:',
            response
          );
          toast.error('Failed to parse track data from API.');
          return { data: [], pagination: { totalPages: 1 } };
        }
      } catch (error) {
        console.error('Error fetching tracks:', error);
        toast.error('Failed to fetch tracks.');
        return { data: [], pagination: { totalPages: 1 } };
      }
    },
    []
  );

  const {
    data: tracks,
    totalPages: trackTotalPages,
    currentPage: trackCurrentPage,
    searchInput: trackSearch,
    setSearchInput: setTrackSearch,
    sorting: trackSorting,
    setSorting: setTrackSorting,
    loading: tracksLoading,
    updateQueryParam: updateTrackQueryParam,
    // refreshData: refreshTracks, // Potentially add back if needed
  } = useDataTable<Track>({ fetchData: fetchTracks, paramKeyPrefix: 'track_' }); // Add prefix

  const trackColumns = useMemo(() => getTrackColumns({ theme }), [theme]);

  const trackTable = useReactTable({
    data: tracks || [],
    columns: trackColumns,
    pageCount: trackTotalPages,
    state: {
      pagination: {
        pageIndex: trackCurrentPage - 1,
        pageSize: 10,
      },
      sorting: trackSorting,
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newPage =
          updater({ pageIndex: trackCurrentPage - 1, pageSize: 10 }).pageIndex +
          1;
        updateTrackQueryParam({ page: newPage });
      }
    },
    onSortingChange: setTrackSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  return (
    <DataTableWrapper
      table={trackTable}
      columns={trackColumns}
      data={tracks}
      pageCount={trackTotalPages}
      pageIndex={trackCurrentPage - 1}
      loading={tracksLoading}
      onPageChange={(page) => updateTrackQueryParam({ page: page + 1 })}
      theme={theme}
      toolbar={{
        searchValue: trackSearch,
        onSearchChange: setTrackSearch,
        searchPlaceholder: 'Search tracks...',
      }}
    />
  );
};
