'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { DataTableWrapper } from '@/components/ui/data-table/data-table-wrapper';
import { useDataTable } from '@/hooks/useDataTable';
import { api } from '@/utils/api';
import { getTrackColumns } from '@/components/ui/data-table/data-table-columns';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Table,
} from '@tanstack/react-table';
import type { Track, FetchDataResponse } from '@/types';
import toast from 'react-hot-toast';
import { EditTrackModal, TrackDetailModal } from '@/components/ui/data-table/data-table-modals';
import io, { Socket } from 'socket.io-client';


interface TrackManagementProps {
  theme: 'light' | 'dark';
}

export const TrackManagement: React.FC<TrackManagementProps> = ({ theme }) => {
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [trackForDetail, setTrackForDetail] = useState<Track | null>(null);
  const [selectedFeaturedArtists, setSelectedFeaturedArtists] = useState<
    string[]
  >([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [availableArtists, setAvailableArtists] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [availableGenres, setAvailableGenres] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [availableLabels, setAvailableLabels] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const fetchTracks = useCallback(
    async (
      page: number,
      params: URLSearchParams
    ): Promise<FetchDataResponse<Track>> => {
      try {
        const token = localStorage.getItem('userToken') || '';
        const response = await api.tracks.getTracks(
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
    refreshData: refreshTracks,
    setData,
  } = useDataTable<Track>({ fetchData: fetchTracks, paramKeyPrefix: 'track_' });

  const fetchAvailableData = useCallback(async () => {
    try {
      const token = localStorage.getItem('userToken') || '';

      // Fetch artists nếu chưa có
      if (availableArtists.length === 0) {
        const artistsResponse = await api.artists.getAll(token, 1, 100);
        if (artistsResponse && artistsResponse.artists) {
          setAvailableArtists(
            artistsResponse.artists.map((artist: any) => ({
              id: artist.id,
              name: artist.artistName,
            }))
          );
        }
      }

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
  }, [availableArtists.length, availableGenres.length, availableLabels.length]);

  // Tải availableLabels ngay khi component mount
  useEffect(() => {
    fetchAvailableData();
  }, [fetchAvailableData]);

  const handleEditTrack = useCallback(
    (track: Track) => {
      setSelectedTrack(track);
      setIsEditModalOpen(true);

      // Set featured artists
      if (track.featuredArtists) {
        const featuredIds = track.featuredArtists.map(
          (fa) => fa.artistProfile.id
        );
        setSelectedFeaturedArtists(featuredIds);
      } else {
        setSelectedFeaturedArtists([]);
      }

      // Set genres
      if (track.genres) {
        const genreIds = track.genres.map((g) => g.genre.id);
        setSelectedGenres(genreIds);
      } else {
        setSelectedGenres([]);
      }

      // Set label từ database (track.labelId)
      if (track.labelId) {
        const matchedLabel = availableLabels.find(
          (label) => label.id === track.labelId
        );
        if (matchedLabel) {
          setSelectedLabelId(matchedLabel.id);
          console.log('Matched Label for Track:', matchedLabel);
        } else {
          setSelectedLabelId(null);
          console.warn('Label ID not found in availableLabels:', track.labelId);
        }
      } else {
        setSelectedLabelId(null);
        console.log('No labelId found for track:', track.id);
      }
    },
    [availableLabels]
  );

  const handleViewTrackDetails = useCallback((track: Track) => {
    setTrackForDetail(track);
    setIsDetailModalOpen(true);
  }, []);

  const handleDeleteTrack = useCallback(
    async (trackId: string | string[]) => {
      try {
        const token = localStorage.getItem('userToken') || '';
        const id = Array.isArray(trackId) ? trackId[0] : trackId;

        await api.tracks.delete(id, token);
        toast.success('Track deleted successfully');
      } catch (error) {
        console.error('Failed to delete track:', error);
        toast.error('Failed to delete track');
      }
    },
    []
  );
  const handleToggleVisibility = useCallback(
    async (trackId: string, currentIsActive: boolean) => {
      const action = currentIsActive ? 'hiding' : 'activating';
      const optimisticAction = currentIsActive ? 'Hide' : 'Show';
      const toastId = toast.loading(`${optimisticAction} track...`);
      try {
        const token = localStorage.getItem('userToken') || '';
        await api.tracks.toggleVisibility(trackId, token);
        toast.success(`Track ${action === 'hiding' ? 'hidden' : 'activated'} successfully`, { id: toastId });
        setData((currentTracks: Track[]) =>
          currentTracks.map((track: Track) =>
            track.id === trackId ? { ...track, isActive: !currentIsActive } : track
          )
        );
      } catch (error) {
        console.error(`Failed ${action} track:`, error);
        toast.error(`Failed to ${action} track`, { id: toastId });
        setData((currentTracks: Track[]) =>
          currentTracks.map((track: Track) =>
            track.id === trackId ? { ...track, isActive: currentIsActive } : track
          )
        );
      }
    },
    [setData]
  );

  const handleTrackEditSubmit = useCallback(
    async (trackId: string, formData: FormData) => {
      try {
        const token = localStorage.getItem('userToken') || '';
        await api.tracks.update(trackId, formData, token);
        toast.success('Track updated successfully');
        setSelectedTrack(null);
      } catch (error) {
        console.error('Failed to update track:', error);
        toast.error('Failed to update track');
      }
    },
    []
  );

  const trackColumns = useMemo(
    () =>
      getTrackColumns({
        theme,
        onEdit: handleEditTrack,
        onDelete: handleDeleteTrack,
        onVisibilityChange: handleToggleVisibility,
        onViewDetails: handleViewTrackDetails,
      }),
    [theme, handleEditTrack, handleDeleteTrack, handleViewTrackDetails, handleToggleVisibility]
  );

  useEffect(() => {
    let socket: Socket | null = null;
    const connectTimer = setTimeout(() => {
        socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');

        socket.on('track:visibilityChanged', (data: { trackId: string; isActive: boolean }) => {
            console.log('[Admin] Track visibility changed via WebSocket:', data);
            setData((currentTracks: Track[]) =>
                currentTracks.map((track: Track) =>
                    track.id === data.trackId ? { ...track, isActive: data.isActive } : track
                )
            );
        });

        // Listen for track updates
        socket.on('track:updated', (data: { track: Track }) => {
            console.log('[Admin] Track updated via WebSocket:', data);
            setData((currentTracks: Track[]) =>
                currentTracks.map((track: Track) =>
                    track.id === data.track.id ? { ...track, ...data.track } : track // Merge updates
                )
            );
        });

        // Listen for track deletions
        socket.on('track:deleted', (data: { trackId: string }) => {
            console.log('[Admin] Track deleted via WebSocket:', data);
            setData((currentTracks: Track[]) =>
                currentTracks.filter((track: Track) => track.id !== data.trackId)
            );
        });
    }, process.env.NODE_ENV === 'development' ? 100 : 0); // Add delay

    // Cleanup on component unmount
    return () => {
      clearTimeout(connectTimer);
      if (socket) {
          socket.off('track:visibilityChanged');
          socket.off('track:updated');
          socket.off('track:deleted');
          socket.disconnect();
      }
    };
  }, [setData]); // Keep setData dependency

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
    <>
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

      {isEditModalOpen && selectedTrack && (
        <EditTrackModal
          track={selectedTrack}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTrack(null);
          }}
          onSubmit={handleTrackEditSubmit}
          availableArtists={availableArtists}
          selectedFeaturedArtists={selectedFeaturedArtists}
          setSelectedFeaturedArtists={setSelectedFeaturedArtists}
          availableGenres={availableGenres}
          selectedGenres={selectedGenres}
          setSelectedGenres={setSelectedGenres}
          availableLabels={availableLabels}
          selectedLabelId={selectedLabelId}
          setSelectedLabelId={setSelectedLabelId}
          theme={theme}
        />
      )}

      {isDetailModalOpen && trackForDetail && (
        <TrackDetailModal
          track={trackForDetail}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setTrackForDetail(null);
          }}
          theme={theme}
        />
      )}
    </>
  );
};