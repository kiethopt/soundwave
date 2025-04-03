'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { DataTableWrapper } from '@/components/ui/data-table/data-table-wrapper';
import { useDataTable } from '@/hooks/useDataTable';
import { api } from '@/utils/api';
import { getSystemPlaylistColumns } from '@/components/ui/data-table/data-table-columns';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import type { Playlist, FetchDataResponse } from '@/types';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { SystemPlaylistModal } from '@/components/ui/data-table/data-table-modals';
import { PlusCircle, RefreshCw, Calendar } from 'lucide-react';

interface SystemPlaylistManagementProps {
  theme: 'light' | 'dark';
}

export const SystemPlaylistManagement: React.FC<
  SystemPlaylistManagementProps
> = ({ theme }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null);
  const [isUpdateLoading, setIsUpdateLoading] = useState(false);

  const fetchPlaylists = useCallback(
    async (
      page: number,
      params: URLSearchParams
    ): Promise<FetchDataResponse<Playlist>> => {
      try {
        const token = localStorage.getItem('userToken') || '';

        // Use getAllBaseSystemPlaylists which fetches only the base template playlists
        const response = await api.playlists.getAllBaseSystemPlaylists(
          token,
          page,
          10,
          params.toString()
        );

        if (response.success && response.data && response.pagination) {
          return {
            data: response.data,
            pagination: {
              totalPages: response.pagination.totalPages,
            },
          };
        } else {
          console.error(
            'Unexpected API response structure for playlists:',
            response
          );
          const message =
            response.message || 'Failed to parse playlist data from API.';
          toast.error(message);
          return { data: [], pagination: { totalPages: 1 } };
        }
      } catch (error) {
        console.error('Error fetching system playlists:', error);
        toast.error('Failed to fetch system playlists.');
        return { data: [], pagination: { totalPages: 1 } };
      }
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
  } = useDataTable<Playlist>({
    fetchData: fetchPlaylists,
    paramKeyPrefix: 'playlist_',
  }); // Add prefix

  const formatPlaylistDate = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  };

  const handleEditPlaylist = (playlist: Playlist) => {
    setEditPlaylist(playlist);
  };

  const handleDeletePlaylist = async (playlistId: string | string[]) => {
    const ids = Array.isArray(playlistId) ? playlistId : [playlistId];
    const confirmMessage = `Are you sure you want to delete ${
      ids.length > 1 ? 'these playlists' : 'this playlist'
    }? This action cannot be undone.`;

    if (!confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('userToken') || '';
      await Promise.all(
        ids.map((id) => api.admin.deleteSystemPlaylist(id, token))
      );
      toast.success(
        `Successfully deleted ${
          ids.length > 1 ? `${ids.length} playlists` : 'playlist'
        }`
      );
      refreshPlaylists();
    } catch (error) {
      console.error('Error deleting playlist(s):', error);
      toast.error('Failed to delete playlist(s)');
    }
  };

  const handleCreateSubmit = async (formData: FormData) => {
    try {
      const token = localStorage.getItem('userToken') || '';
      await api.admin.createSystemPlaylist(formData, token);
      toast.success('System playlist created successfully!');
      refreshPlaylists();
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to create system playlist'
      );
    }
  };

  const handleEditSubmit = async (formData: FormData) => {
    if (!editPlaylist?.id) return;

    try {
      const token = localStorage.getItem('userToken') || '';
      await api.admin.updateSystemPlaylist(editPlaylist.id, formData, token);
      toast.success('Playlist updated successfully!');
      setEditPlaylist(null);
      refreshPlaylists();
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update system playlist'
      );
    }
  };

  const playlistColumns = useMemo(
    () =>
      getSystemPlaylistColumns({
        theme,
        onDelete: handleDeletePlaylist,
        onEdit: handleEditPlaylist,
        formatUpdatedAt: formatPlaylistDate,
      }),
    [theme, refreshPlaylists] // Add refreshPlaylists dependency
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

  const handleUpdatePlaylistsNow = async () => {
    const token = localStorage.getItem('userToken') || '';
    setIsUpdateLoading(true);
    toast.loading('Updating system playlists...');
    try {
      await api.admin.updateAllSystemPlaylists(token);
      toast.dismiss();
      toast.success('System playlists update started!');
      setTimeout(() => refreshPlaylists(), 3000);
    } catch (error) {
      toast.dismiss();
      console.error('Error triggering playlist update:', error);
      toast.error('Failed to start system playlist update.');
    } finally {
      setIsUpdateLoading(false);
    }
  };

  return (
    <>
      <Card
        className={`${
          theme === 'dark' ? 'bg-[#1e1e1e] border-white/10' : 'bg-white'
        }`}
      >
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
            <CardTitle
              className={`${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
            >
              System Playlist Management
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                variant="outline"
                className={`${
                  theme === 'dark'
                    ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    : ''
                }`}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Playlist
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p
            className={`${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Manage and update system-generated playlists like "Hot Hits", "New
            Releases", etc. These playlists are automatically personalized for
            each user.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={handleUpdatePlaylistsNow}
              className={`${
                theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : ''
              } ${isUpdateLoading ? 'opacity-80 pointer-events-none' : ''}`}
              disabled={isUpdateLoading}
            >
              {isUpdateLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update All Now
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className={`${
                theme === 'dark'
                  ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  : ''
              }`}
              disabled
            >
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Update
              <span className="ml-2 text-xs opacity-70">(Coming Soon)</span>
            </Button>
          </div>
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

      {/* Modals */}
      <SystemPlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        theme={theme}
        mode="create"
      />
      {editPlaylist && (
        <SystemPlaylistModal
          isOpen={!!editPlaylist}
          onClose={() => setEditPlaylist(null)}
          onSubmit={handleEditSubmit}
          initialData={{
            id: editPlaylist.id,
            name: editPlaylist.name,
            description: editPlaylist.description,
            coverUrl: editPlaylist.coverUrl,
            privacy: editPlaylist.privacy as 'PUBLIC' | 'PRIVATE',
            basedOnArtist: (editPlaylist as any).basedOnArtist || '',
            basedOnMood: (editPlaylist as any).basedOnMood || '',
            basedOnGenre: (editPlaylist as any).basedOnGenre || '',
            trackCount: (editPlaylist as any).trackCount || 10,
          }}
          theme={theme}
          mode="edit"
        />
      )}
    </>
  );
};
