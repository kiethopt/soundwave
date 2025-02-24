'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ArtistProfile, Track } from '@/types';
import { api } from '@/utils/api';
import { toast } from 'react-toastify';
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
import { DataTableWrapper } from '@/components/data-table/data-table-wrapper';
import Link from 'next/link';
import { EditTrackModal } from '@/components/data-table/data-table-modals';
import { getTrackColumns } from '@/components/data-table/data-table-columns';

export default function ArtistTracks() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [availableArtists, setAvailableArtists] = useState<
    Array<{
      id: string;
      name: string;
    }>
  >([]);
  const [selectedFeaturedArtists, setSelectedFeaturedArtists] = useState<
    string[]
  >([]);
  const [availableGenres, setAvailableGenres] = useState<
    Array<{
      id: string;
      name: string;
    }>
  >([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const limit = 10;
  const { theme } = useTheme();

  // State cho sorting, column filters, visibility, row selection, selected rows, status filter
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [selectedRows, setSelectedRows] = useState<Track[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const searchParams = useSearchParams();
  const router = useRouter();

  // URL handling logic
  useEffect(() => {
    const pageStr = searchParams.get('page');
    const pageNumber = Number(pageStr);
    if (pageStr === '1' || pageNumber < 1) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('page');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/artist/tracks${queryStr}`);
    }
  }, [searchParams, router]);

  const pageFromURL = Number(searchParams.get('page'));
  const currentPage = isNaN(pageFromURL) || pageFromURL < 1 ? 1 : pageFromURL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const [artistsResponse, genresResponse] = await Promise.all([
          api.artists.getAllArtistsProfile(token, 1, 100),
          api.artists.getAllGenres(token),
        ]);

        setAvailableArtists(
          artistsResponse.artists.map((artist: ArtistProfile) => ({
            id: artist.id,
            name: artist.artistName,
          }))
        );
        setAvailableGenres(
          genresResponse.data.map((genre: { id: string; name: string }) => ({
            id: genre.id,
            name: genre.name,
          }))
        );

        if (editingTrack) {
          setSelectedFeaturedArtists(
            editingTrack.featuredArtists.map((fa) => fa.artistProfile.id)
          );
          setSelectedGenres(editingTrack.genres.map((g) => g.genre.id));
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load required data');
      }
    };

    fetchData(); // Luôn fetch data, không cần điều kiện editingTrack
  }, [editingTrack]);

  const updateQueryParam = (param: string, value: number) => {
    if (totalPages === 1 && value !== 1) return;
    if (value < 1) value = 1;
    if (value > totalPages) value = totalPages;
    const current = new URLSearchParams(searchParams.toString());
    if (value === 1) {
      current.delete(param);
    } else {
      current.set(param, value.toString());
    }
    const queryStr = current.toString() ? `?${current.toString()}` : '';
    router.push(`/artist/tracks${queryStr}`);
  };

  // Format release time
  const formatReleaseTime = (releaseDate: string) => {
    const release = new Date(releaseDate);
    const now = new Date();

    if (release <= now) {
      return release.toLocaleString(); // Hiển thị ngày giờ cố định nếu đã release
    }

    // Tính thời gian còn lại
    const diff = release.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  // API calls
  const fetchTracks = async (page: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      // Tạo query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      // Thêm search param nếu có
      if (searchInput) {
        params.append('q', searchInput);
      }

      // Thêm status filter nếu có
      if (statusFilter.length === 1) {
        params.append('status', statusFilter[0]);
      }

      const response = await api.tracks.getAll(
        token,
        page,
        limit,
        params.toString()
      );
      setTracks(response.tracks);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to fetch tracks'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset về trang 1 khi filter hoặc search thay đổi
    if (currentPage !== 1) {
      updateQueryParam('page', 1);
    } else {
      fetchTracks(1);
    }
  }, [searchInput, statusFilter]);

  useEffect(() => {
    fetchTracks(currentPage);
  }, [currentPage]);

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

      // Nếu xóa một track, set loading state cho track đó
      if (!Array.isArray(trackIds)) {
        setActionLoading(trackIds);
      }

      await Promise.all(ids.map((id) => api.tracks.delete(id, token)));

      // Nếu xóa một track, cập nhật state tracks ngay lập tức
      if (!Array.isArray(trackIds)) {
        setTracks((prev) => prev.filter((track) => track.id !== trackIds));
      } else {
        // Nếu xóa nhiều tracks, fetch lại data
        await fetchTracks(currentPage);
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

      // Xóa các trường cũ từ formData
      formData.delete('featuredArtists');
      formData.delete('genres');

      // Tạo object data để gửi lên server
      const data = {
        title: formData.get('title'),
        releaseDate: formData.get('releaseDate'),
        featuredArtists: selectedFeaturedArtists,
        genreIds: selectedGenres, // Đổi tên từ genres thành genreIds để match với backend
      };

      // Gửi request với JSON thay vì FormData
      await api.tracks.update(trackId, data, token);
      await fetchTracks(currentPage);
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

  // Table columns definition
  const columns = getTrackColumns({
    theme,
    onVisibilityChange: handleTrackVisibility,
    onDelete: handleDeleteTracks,
    onEdit: setEditingTrack,
    formatReleaseTime,
  });

  // Table configuration
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
        pageSize: 10,
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
              { key: 'duration', header: 'Duration' },
              { key: 'playCount', header: 'Plays' },
              { key: 'isActive', header: 'Status' },
              { key: 'releaseDate', header: 'Release Date' },
              { key: 'createdAt', header: 'Created At' },
              { key: 'updatedAt', header: 'Updated At' },
            ],
            filename: 'tracks-export',
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
