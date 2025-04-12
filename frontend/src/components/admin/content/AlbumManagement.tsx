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
    refreshData: refreshAlbums,
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
      try {
        const token = localStorage.getItem('userToken') || '';
        const id = Array.isArray(albumId) ? albumId[0] : albumId;

        await api.albums.delete(id, token);
        toast.success('Album deleted successfully');
        refreshAlbums();
      } catch (error) {
        console.error('Failed to delete album:', error);
        toast.error('Failed to delete album');
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
        refreshAlbums();
      } catch (error) {
        console.error('Failed to update album:', error);
        toast.error('Failed to update album');
      }
    },
    [refreshAlbums]
  );

  const albumColumns = useMemo(
    () =>
      getAlbumColumns({
        theme,
        onEdit: handleEditAlbum,
        onDelete: handleDeleteAlbum,
        onViewDetails: handleViewAlbumDetails,
      }),
    [theme, handleEditAlbum, handleDeleteAlbum, handleViewAlbumDetails]
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