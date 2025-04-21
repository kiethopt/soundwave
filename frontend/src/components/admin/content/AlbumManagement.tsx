'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
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
import { EditAlbumModal, AlbumDetailModal } from '@/components/ui/data-table/data-table-modals';
import io, { Socket } from 'socket.io-client';


interface AlbumManagementProps {
  theme: 'light' | 'dark';
}

export const AlbumManagement: React.FC<AlbumManagementProps> = ({ theme }) => {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [albumForDetail, setAlbumForDetail] = useState<Album | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [availableGenres, setAvailableGenres] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [availableLabels, setAvailableLabels] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const fetchAlbums = useCallback(
    async (
      page: number,
      params: URLSearchParams
    ): Promise<FetchDataResponse<Album>> => {
      try {
        const token = localStorage.getItem('userToken') || '';
        const response = await api.albums.getAlbums(
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
    refreshData: refreshAlbums,
    setData: setAlbums,
  } = useDataTable<Album>({ fetchData: fetchAlbums, paramKeyPrefix: 'album_' });

  const fetchAvailableData = useCallback(async () => {
    try {
      const token = localStorage.getItem('userToken') || '';

      // Fetch genres nếu chưa có
      if (availableGenres.length === 0) {
        const genresResponse = await api.genres.getAll(token);
        if (genresResponse && genresResponse.genres) {
          setAvailableGenres(
            genresResponse.genres.map((genre: any) => ({
              id: genre.id,
              name: genre.name,
            }))
          );
        }
      }

      // Fetch labels nếu chưa có
      if (availableLabels.length === 0) {
        const labelsResponse = await api.labels.getAll(token, 1, 100, '');
        if (labelsResponse && labelsResponse.labels) {
          setAvailableLabels(
            labelsResponse.labels.map((label: any) => ({
              id: label.id,
              name: label.name,
            }))
          );
        }
      }
    } catch (error) {
      console.error('Failed to fetch available data:', error);
      toast.error('Failed to load some required data');
    }
  }, [availableGenres.length, availableLabels.length]);

  // Tải availableLabels ngay khi component mount
  useEffect(() => {
    fetchAvailableData();
  }, [fetchAvailableData]);

  const handleEditAlbum = useCallback(
    (album: Album) => {
      setSelectedAlbum(album);
      setIsEditModalOpen(true);

      // Set genres
      if (album.genres) {
        const genreIds = album.genres.map((g) => g.genre.id);
        setSelectedGenres(genreIds);
      } else {
        setSelectedGenres([]);
      }

      // Set label từ database (album.labelId)
      if (album.labelId) {
        const matchedLabel = availableLabels.find(
          (label) => label.id === album.labelId
        );
        if (matchedLabel) {
          setSelectedLabelId(matchedLabel.id);
          console.log('Matched Label for Album:', matchedLabel);
        } else {
          setSelectedLabelId(null);
          console.warn('Label ID not found in availableLabels:', album.labelId);
        }
      } else {
        setSelectedLabelId(null);
        console.log('No labelId found for album:', album.id);
      }
    },
    [availableLabels]
  );

  const handleViewAlbumDetails = useCallback((album: Album) => {
    setAlbumForDetail(album);
    setIsDetailModalOpen(true);
  }, []);

  const handleDeleteAlbum = useCallback(
    async (albumId: string | string[]) => {
      const idsToDelete = Array.isArray(albumId) ? albumId : [albumId];
      const confirmMessage = idsToDelete.length > 1 
        ? `Are you sure you want to delete these ${idsToDelete.length} albums? This action cannot be undone.`
        : 'Are you sure you want to delete this album? This action cannot be undone.';
        
      if (!window.confirm(confirmMessage)) {
        return;
      }

      try {
        const token = localStorage.getItem('userToken') || '';
        const deletePromises = idsToDelete.map(id => api.albums.delete(id, token)); 
        await Promise.all(deletePromises);

        toast.success(`Successfully deleted ${idsToDelete.length} album${idsToDelete.length > 1 ? 's' : ''}`);
        refreshAlbums();
      } catch (error) {
        console.error('Failed to delete album(s):', error);
        toast.error('Failed to delete album(s)');
      }
    },
    [refreshAlbums]
  );

  const handleAlbumEditSubmit = useCallback(
    async (albumId: string, formData: FormData) => {
      try {
        const token = localStorage.getItem('userToken') || '';
        await api.albums.update(albumId, formData, token);
        toast.success('Album updated successfully');
        setSelectedAlbum(null);
      } catch (error) {
        console.error('Failed to update album:', error);
        toast.error('Failed to update album');
      }
    },
    []
  );
  const handleToggleVisibility = useCallback(
    async (albumId: string, currentIsActive: boolean) => {
      const action = currentIsActive ? 'hiding' : 'activating';
      const optimisticAction = currentIsActive ? 'Hide' : 'Show';
      const toastId = toast.loading(`${optimisticAction} album...`);
      try {
        const token = localStorage.getItem('userToken') || '';
        // Assuming an endpoint exists like api.albums.toggleVisibility
        await api.albums.toggleVisibility(albumId, token);
        toast.success(`Album ${action === 'hiding' ? 'hidden' : 'activated'} successfully`, { id: toastId });
        setAlbums((currentAlbums: Album[]) =>
            currentAlbums.map((album: Album) =>
                album.id === albumId ? { ...album, isActive: !currentIsActive } : album
            )
        );
      } catch (error) {
        console.error(`Failed ${action} album:`, error);
        toast.error(`Failed to ${action} album`, { id: toastId });
      }
    },
    [setAlbums]
  );

  const albumColumns = useMemo(
    () =>
      getAlbumColumns({
        theme,
        onEdit: handleEditAlbum,
        onDelete: handleDeleteAlbum,
        onVisibilityChange: handleToggleVisibility,
        onViewDetails: handleViewAlbumDetails,
      }),
    [theme, handleEditAlbum, handleDeleteAlbum, handleViewAlbumDetails, handleToggleVisibility]
  );

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

  // WebSocket listener for Album updates
  useEffect(() => {
    let socket: Socket | null = null;
    const connectTimer = setTimeout(() => {
        socket = io(process.env.NEXT_PUBLIC_API_URL!);

        console.log("[WebSocket] Connecting for Admin AlbumManagement...");

        socket.on('connect', () => {
            console.log("[WebSocket] Connected for Admin AlbumManagement");
        });
        socket.on('disconnect', (reason: string) => {
            console.log("[WebSocket] Disconnected from Admin AlbumManagement:", reason);
        });
        socket.on('connect_error', (error: Error) => {
            console.error("[WebSocket] Connection Error for Admin AlbumManagement:", error);
        });

        // Listen for album creation
        socket.on('album:created', (data: { album: Album }) => {
            console.log('[WebSocket] Album created:', data.album);
            // Add to the beginning of the list for immediate visibility
            // Note: This might not respect current sorting/filtering/pagination
            // For a more robust solution, might need to refresh or re-evaluate filters/sort.
            setAlbums((currentAlbums: Album[]) => [data.album, ...currentAlbums]);
            // Or trigger a refresh if complex filtering/sorting is applied:
            // refreshAlbums(); 
        });

        // Listen for album updates
        socket.on('album:updated', (data: { album: Album }) => {
          console.log('[WebSocket] Album updated:', data.album);
          setAlbums((currentAlbums: Album[]) =>
            currentAlbums.map((album: Album) =>
              album.id === data.album.id ? { ...album, ...data.album } : album
            )
          );
        });

        // Listen for album deletions
        socket.on('album:deleted', (data: { albumId: string }) => {
          console.log('[WebSocket] Album deleted:', data.albumId);
          setAlbums((currentAlbums: Album[]) =>
            currentAlbums.filter((album: Album) => album.id !== data.albumId)
          );
        });

         // Listen for album visibility changes
        socket.on('album:visibilityChanged', (data: { albumId: string; isActive: boolean }) => {
            console.log('[WebSocket] Album visibility changed:', data);
            setAlbums((currentAlbums: Album[]) =>
                currentAlbums.map((album: Album) =>
                    album.id === data.albumId ? { ...album, isActive: data.isActive } : album
                )
            );
        });
    }, process.env.NODE_ENV === 'development' ? 100 : 0); // Add delay

    // Cleanup on component unmount
    return () => {
        clearTimeout(connectTimer);
        if (socket) {
            console.log("[WebSocket] Disconnecting from Admin AlbumManagement...");
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
            socket.off('album:created');
            socket.off('album:updated');
            socket.off('album:deleted');
            socket.off('album:visibilityChanged');
            socket.disconnect();
        }
    };
  }, [setAlbums]); // Add setAlbums as dependency

  return (
    <>
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

      {isEditModalOpen && selectedAlbum && (
        <EditAlbumModal
          album={selectedAlbum}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedAlbum(null);
          }}
          onSubmit={handleAlbumEditSubmit}
          availableGenres={availableGenres}
          selectedGenres={selectedGenres}
          setSelectedGenres={setSelectedGenres}
          availableLabels={availableLabels}
          selectedLabelId={selectedLabelId}
          setSelectedLabelId={setSelectedLabelId}
          theme={theme}
        />
      )}

      <AlbumDetailModal
        album={albumForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setAlbumForDetail(null);
        }}
        theme={theme}
      />
    </>
  );
};