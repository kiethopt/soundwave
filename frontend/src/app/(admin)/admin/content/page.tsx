'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTableWrapper } from '@/components/ui/data-table/data-table-wrapper';
import { useDataTable } from '@/hooks/useDataTable';
import { api } from '@/utils/api';
import {
  getAlbumColumns,
  getTrackColumns,
} from '@/components/ui/data-table/data-table-columns';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { Album, Track, Playlist } from '@/types';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { format } from 'date-fns';

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

interface ApiResponse<T> {
  data: T[];
  pagination: PaginationData;
}

export default function ContentManagement() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('albums');

  // --- Album Management --- (Reusing existing logic as much as possible)
  const fetchAlbums = useCallback(
    async (page: number, params: URLSearchParams) => {
      const token = localStorage.getItem('userToken') || '';
      const response = await api.artists.getAllAlbums(
        token,
        page,
        10,
        params.toString()
      );
      return {
        data: response.data,
        pagination: response.pagination,
      } as ApiResponse<Album>;
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
    refreshData: refreshAlbums,
    loading: albumsLoading,
    updateQueryParam: updateAlbumQueryParam,
  } = useDataTable<Album>({ fetchData: fetchAlbums });

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

  // --- Track Management --- (Reusing existing logic)
  const fetchTracks = useCallback(
    async (page: number, params: URLSearchParams) => {
      const token = localStorage.getItem('userToken') || '';
      const response = await api.tracks.getAll(
        token,
        page,
        10,
        params.toString() // Pass the whole query string
      );
      return {
        data: response.data,
        pagination: response.pagination,
      } as ApiResponse<Track>; // Adjust based on actual API response structure
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
    refreshData: refreshTracks,
    loading: tracksLoading,
    updateQueryParam: updateTrackQueryParam,
  } = useDataTable<Track>({ fetchData: fetchTracks });

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

  // --- Playlist Management --- (Implementation)
  const fetchPlaylists = useCallback(
    async (page: number, params: URLSearchParams) => {
      const token = localStorage.getItem('userToken') || '';
      const response = await api.playlists.getSystemPlaylists(
        token,
        page,
        10,
        params.toString()
      );

      if (!response.success || !response.data) {
        toast.error('Failed to fetch system playlists');
        return {
          data: [],
          pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
        } as ApiResponse<Playlist>;
      }

      // Return the response directly as it now contains pagination
      return response as ApiResponse<Playlist>;
    },
    []
  );

  const {
    data: playlists,
    totalPages: playlistTotalPages,
    currentPage: playlistCurrentPage,
    searchInput: playlistSearch,
    setSearchInput: setPlaylistSearch,
    sorting: playlistSorting,
    setSorting: setPlaylistSorting,
    refreshData: refreshPlaylists,
    loading: playlistsLoading,
    updateQueryParam: updatePlaylistQueryParam,
  } = useDataTable<Playlist>({ fetchData: fetchPlaylists });

  // Define playlist columns inline
  const playlistColumns = useMemo<ColumnDef<Playlist>[]>(
    () => [
      {
        accessorKey: 'coverUrl',
        header: 'Cover',
        cell: ({ row }) => (
          <Image
            src={row.original.coverUrl || '/default-cover.png'} // Provide a fallback image
            alt={row.original.name}
            width={40}
            height={40}
            className="rounded"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'name',
        header: 'Name',
        enableSorting: true,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <p className="truncate max-w-xs">{row.original.description}</p>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        enableSorting: true,
      },
      {
        accessorKey: 'totalTracks',
        header: 'Tracks',
        cell: ({ row }) => (
          <div className="text-center">{row.original.totalTracks}</div>
        ),
        enableSorting: true,
      },
      {
        accessorKey: 'updatedAt',
        header: 'Last Updated',
        cell: ({ row }) => format(new Date(row.original.updatedAt), 'PPpp'), // Format the date
        enableSorting: true,
      },
      // Add more columns as needed (e.g., actions)
    ],
    []
  );

  const playlistTable = useReactTable({
    data: playlists || [],
    columns: playlistColumns,
    pageCount: playlistTotalPages,
    state: {
      pagination: {
        pageIndex: playlistCurrentPage - 1,
        pageSize: 10,
      },
      sorting: playlistSorting,
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newPage =
          updater({ pageIndex: playlistCurrentPage - 1, pageSize: 10 })
            .pageIndex + 1;
        updatePlaylistQueryParam({ page: newPage });
      }
    },
    onSortingChange: setPlaylistSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  // TODO: Implement playlist update functions
  const handleUpdatePlaylistsNow = async () => {
    const token = localStorage.getItem('userToken') || '';
    toast.loading('Updating system playlists...');
    try {
      // TODO: Replace with actual API call
      await api.admin.updateGlobalPlaylist(token);
      toast.success('System playlists updated successfully!');
      // Optionally refresh playlist data if needed
      // refreshPlaylists();
    } catch (error) {
      console.error('Error updating playlists:', error);
      toast.error('Failed to update system playlists.');
    } finally {
      toast.dismiss();
    }
  };

  // TODO: Implement scheduling logic
  const handleScheduleUpdate = async (dateTime: Date) => {
    toast.loading('Scheduling playlist update...');
    try {
      // TODO: Implement API call to schedule update
      // await api.admin.schedulePlaylistUpdate(dateTime);
      toast.success(
        `Playlist update scheduled for ${dateTime.toLocaleString()}`
      );
    } catch (error) {
      console.error('Error scheduling update:', error);
      toast.error('Failed to schedule playlist update.');
    } finally {
      toast.dismiss();
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1
        className={`text-2xl font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}
      >
        Content Management
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className={`grid w-full grid-cols-3 ${
            theme === 'dark' ? 'bg-[#282828]' : 'bg-gray-100'
          }`}
        >
          <TabsTrigger
            value="albums"
            className={`${
              theme === 'dark'
                ? 'data-[state=active]:bg-[#3e3e3e] data-[state=active]:text-white'
                : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
            }`}
          >
            Albums
          </TabsTrigger>
          <TabsTrigger
            value="tracks"
            className={`${
              theme === 'dark'
                ? 'data-[state=active]:bg-[#3e3e3e] data-[state=active]:text-white'
                : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
            }`}
          >
            Tracks
          </TabsTrigger>
          <TabsTrigger
            value="playlists"
            className={`${
              theme === 'dark'
                ? 'data-[state=active]:bg-[#3e3e3e] data-[state=active]:text-white'
                : 'data-[state=active]:bg-white data-[state=active]:text-gray-900'
            }`}
          >
            System Playlists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="albums" className="mt-4">
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
        </TabsContent>

        <TabsContent value="tracks" className="mt-4">
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
        </TabsContent>

        <TabsContent value="playlists" className="mt-4">
          <Card
            className={`${
              theme === 'dark' ? 'bg-[#1e1e1e] border-white/10' : 'bg-white'
            }`}
          >
            <CardHeader>
              <CardTitle
                className={`${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                System Playlist Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p
                className={`${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Manage and update system-generated playlists like "Hot Hits",
                "New Releases", etc.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleUpdatePlaylistsNow}
                  className={
                    theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : ''
                  }
                >
                  Update All Now
                </Button>
                {/* TODO: Add scheduling UI (e.g., Date/Time picker and button) */}
                <p
                  className={`${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}
                >
                  (Scheduling functionality coming soon)
                </p>
              </div>
              {/* Placeholder for Playlist DataTable */}
              <DataTableWrapper
                table={playlistTable}
                columns={playlistColumns}
                data={playlists}
                pageCount={playlistTotalPages}
                pageIndex={playlistCurrentPage - 1}
                loading={playlistsLoading}
                onPageChange={(page) => {
                  updatePlaylistQueryParam({ page: page + 1 });
                }}
                theme={theme}
                toolbar={{
                  searchValue: playlistSearch,
                  onSearchChange: setPlaylistSearch,
                  searchPlaceholder: 'Search playlists...',
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
