'use client';

import React, { useMemo, useCallback } from 'react';
import { DataTableWrapper } from '@/components/ui/data-table/data-table-wrapper';
import { useDataTable } from '@/hooks/useDataTable';
import { api } from '@/utils/api';
import { getAlbumColumns } from '@/components/ui/data-table/data-table-columns';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import type { Album, FetchDataResponse } from '@/types';
import toast from 'react-hot-toast';

interface AlbumManagementProps {
  theme: 'light' | 'dark';
}

export const AlbumManagement: React.FC<AlbumManagementProps> = ({ theme }) => {
  // --- Album Management State & Logic ---
  const fetchAlbums = useCallback(
    async (
      page: number,
      params: URLSearchParams
    ): Promise<FetchDataResponse<Album>> => {
      try {
        const token = localStorage.getItem('userToken') || '';
        const response = await api.albums.getAll(
          token,
          page,
          10,
          params.toString()
        );

        if (response && response.albums && response.pagination) {
          return {
            data: response.albums,
            pagination: {
              totalPages: response.pagination.totalPages,
            },
          };
        } else {
          console.error(
            'Unexpected API response structure for albums:',
            response
          );
          toast.error('Failed to parse album data from API.');
          return { data: [], pagination: { totalPages: 1 } };
        }
      } catch (error) {
        console.error('Error fetching albums:', error);
        toast.error('Failed to fetch albums.');
        return { data: [], pagination: { totalPages: 1 } };
      }
    },
    []
  );

  const {
    data: albums,
    totalPages: albumTotalPages,
    currentPage: albumCurrentPage,
    searchInput: albumSearch,
    setSearchInput: setAlbumSearch,
    sorting: albumSorting,
    setSorting: setAlbumSorting,
    loading: albumsLoading,
    updateQueryParam: updateAlbumQueryParam,
    // refreshData: refreshAlbums, // Potentially add back if needed
  } = useDataTable<Album>({ fetchData: fetchAlbums, paramKeyPrefix: 'album_' }); // Add prefix

  const albumColumns = useMemo(() => getAlbumColumns({ theme }), [theme]);

  const albumTable = useReactTable({
    data: albums || [],
    columns: albumColumns,
    pageCount: albumTotalPages,
    state: {
      pagination: {
        pageIndex: albumCurrentPage - 1,
        pageSize: 10,
      },
      sorting: albumSorting,
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newPage =
          updater({ pageIndex: albumCurrentPage - 1, pageSize: 10 }).pageIndex +
          1;
        updateAlbumQueryParam({ page: newPage });
      }
    },
    onSortingChange: setAlbumSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  return (
    <DataTableWrapper
      table={albumTable}
      columns={albumColumns}
      data={albums}
      pageCount={albumTotalPages}
      pageIndex={albumCurrentPage - 1}
      loading={albumsLoading}
      onPageChange={(page) => updateAlbumQueryParam({ page: page + 1 })}
      theme={theme}
      toolbar={{
        searchValue: albumSearch,
        onSearchChange: setAlbumSearch,
        searchPlaceholder: 'Search albums...',
      }}
    />
  );
};
