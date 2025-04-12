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
import io, { Socket } from 'socket.io-client';


export default function AlbumManagement() {
  const { theme } = useTheme();
  const limit = 10;
  const [artistId, setArtistId] = useState<string | null>(null);

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
    refreshData,
  } = useDataTable<Album>({
    fetchData: async (page, params) => {
      const token = localStorage.getItem('userToken') || '';
      const response = await api.albums.getAlbums(
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

  useEffect(() => {
    // Fetch artistId from localStorage on mount
    let id: string | null = null;
    try {
        const userDataString = localStorage.getItem('userData');
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            id = userData?.artistProfile?.id || null;
        }
    } catch (error) {
        console.error("Error parsing userData from localStorage:", error);
    }
    setArtistId(id);
  }, []);

  // WebSocket listener for Album updates
  useEffect(() => {
    if (!artistId) return; // Only connect if artistId is known

    let socket: Socket | null = null;
    const connectTimer = setTimeout(() => {
        socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');

        console.log(`[WebSocket] Connecting for Artist AlbumManagement (${artistId})...`);

        socket.on('connect', () => {
            console.log("[WebSocket] Connected for Artist AlbumManagement");
        });
        socket.on('disconnect', (reason: string) => {
            console.log("[WebSocket] Disconnected from Artist AlbumManagement:", reason);
        });
        socket.on('connect_error', (error: Error) => {
            console.error("[WebSocket] Connection Error for Artist AlbumManagement:", error);
        });

        // Listen for album creation by this artist
        socket.on('album:created', (data: { album: Album }) => {
            if (data.album.artist?.id === artistId) {
                console.log('[WebSocket] Album created by this artist:', data.album);
                // Add to the beginning of the list or refresh
                setAlbums((currentAlbums: Album[]) => [data.album, ...currentAlbums]);
                 // Or consider refreshData() if sorting/pagination is complex
                 // refreshData(); 
            }
        });

        // Listen for album updates for this artist
        socket.on('album:updated', (data: { album: Album }) => {
          if (data.album.artist?.id === artistId) {
              console.log('[WebSocket] Album updated by this artist:', data.album);
              setAlbums((currentAlbums: Album[]) =>
                currentAlbums.map((album: Album) =>
                  album.id === data.album.id ? { ...album, ...data.album } : album
                )
              );
          }
        });

        // Listen for album deletions for this artist
        socket.on('album:deleted', (data: { albumId: string }) => {
           // Check if the deleted album belongs to the current artist before updating state
           setAlbums((currentAlbums: Album[]) => {
                const albumExists = currentAlbums.some(a => a.id === data.albumId && a.artist?.id === artistId);
                if (albumExists) {
                    console.log('[WebSocket] Album deleted by this artist:', data.albumId);
                    return currentAlbums.filter((album: Album) => album.id !== data.albumId);
                }
                return currentAlbums; // No change if album doesn't belong to this artist or wasn't found
           });
        });

         // Listen for album visibility changes for this artist
        socket.on('album:visibilityChanged', (data: { albumId: string; isActive: boolean }) => {
             // Check if the affected album belongs to the current artist
             setAlbums((currentAlbums: Album[]) => {
                const albumIndex = currentAlbums.findIndex(a => a.id === data.albumId);
                if (albumIndex !== -1 && currentAlbums[albumIndex].artist?.id === artistId) {
                    console.log('[WebSocket] Album visibility changed by this artist:', data);
                    return currentAlbums.map((album: Album) =>
                        album.id === data.albumId ? { ...album, isActive: data.isActive } : album
                    );
                }
                return currentAlbums; // No change if album doesn't belong to this artist
             });
        });
    }, process.env.NODE_ENV === 'development' ? 100 : 0); // Add delay

    // Cleanup on component unmount
    return () => {
      clearTimeout(connectTimer);
      if (socket) {
          console.log("[WebSocket] Disconnecting from Artist AlbumManagement...");
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
  }, [artistId, setAlbums]); // Add artistId and setAlbums as dependencies

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
      const response = await api.albums.getAlbums(
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
      const response = await api.albums.getAlbums(
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