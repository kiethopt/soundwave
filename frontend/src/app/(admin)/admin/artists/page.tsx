'use client';

import { useState } from 'react';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useDataTable } from '@/hooks/useDataTable';
import { getArtistColumns } from '@/components/ui/data-table/data-table-columns';
import { DataTableWrapper } from '@/components/ui/data-table/data-table-wrapper';
import { ArtistProfile } from '@/types';
import {
  ColumnFiltersState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';

export default function ArtistManagement() {
  const { theme } = useTheme();
  const limit = 10;

  // Sử dụng useDataTable hook
  const {
    data: artists,
    setData: setArtists,
    loading,
    totalPages,
    currentPage,
    actionLoading,
    setActionLoading,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    selectedRows,
    setSelectedRows,
    updateQueryParam,
  } = useDataTable<ArtistProfile>({
    fetchData: async (page, params) => {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');
      const response = await api.admin.getAllArtists(
        token,
        page,
        limit,
        params.toString()
      );
      return {
        data: response.artists,
        pagination: response.pagination,
      };
    },
    limit,
  });

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  // Action handlers
  const handleArtistStatus = async (artistId: string, isActive: boolean) => {
    try {
      setActionLoading(artistId);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.admin.updateArtist(artistId, { isActive: !isActive }, token);

      setArtists((prev) =>
        prev.map((artist) =>
          artist.id === artistId ? { ...artist, isActive: !isActive } : artist
        )
      );

      toast.success('Artist updated successfully');
    } catch (error) {
      toast.error('Failed to update artist');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle bulk activation of artists
  const handleBulkActivate = async () => {
    if (!selectedRows.length) return;

    const confirmMessage = `Activate ${selectedRows.length} selected artists?`;
    if (!confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      // Only target inactive artists
      const inactiveArtists = selectedRows.filter((artist) => !artist.isActive);

      if (inactiveArtists.length === 0) {
        toast.error('All selected artists are already active');
        return;
      }

      setActionLoading('bulkOperation');

      await Promise.all(
        inactiveArtists.map((artist) =>
          api.admin.updateArtist(artist.id, { isActive: true }, token)
        )
      );

      // Update local state
      setArtists((prev) =>
        prev.map((artist) =>
          inactiveArtists.some((a) => a.id === artist.id)
            ? { ...artist, isActive: true }
            : artist
        )
      );

      toast.success('Artists activated successfully');
    } catch (error) {
      toast.error('Failed to activate artists');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle bulk deactivation of artists
  const handleBulkDeactivate = async () => {
    if (!selectedRows.length) return;

    const confirmMessage = `Deactivate ${selectedRows.length} selected artists?`;
    if (!confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      // Only target active artists
      const activeArtists = selectedRows.filter((artist) => artist.isActive);

      if (activeArtists.length === 0) {
        toast.error('All selected artists are already inactive');
        return;
      }

      setActionLoading('bulkOperation');

      await Promise.all(
        activeArtists.map((artist) =>
          api.admin.updateArtist(artist.id, { isActive: false }, token)
        )
      );

      // Update local state
      setArtists((prev) =>
        prev.map((artist) =>
          activeArtists.some((a) => a.id === artist.id)
            ? { ...artist, isActive: false }
            : artist
        )
      );

      toast.success('Artists deactivated successfully');
    } catch (error) {
      toast.error('Failed to deactivate artists');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteArtist = async (artistIds: string | string[]) => {
    const ids = Array.isArray(artistIds) ? artistIds : [artistIds];
    const confirmMessage =
      ids.length === 1
        ? 'Are you sure you want to delete this artist?'
        : `Delete ${ids.length} selected artists?`;
    if (!confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');
      if (!Array.isArray(artistIds)) setActionLoading(artistIds);
      await Promise.all(ids.map((id) => api.admin.deleteArtist(id, token)));
      setArtists((prev) => prev.filter((artist) => !ids.includes(artist.id)));
      setSelectedRows([]);
      toast.success('Artist deleted successfully');
    } catch (error) {
      toast.error('Failed to delete artist(s)');
    } finally {
      if (!Array.isArray(artistIds)) setActionLoading(null);
    }
  };

  // Define columns
  const columns = getArtistColumns({
    theme,
    onStatusChange: handleArtistStatus,
    onDelete: handleDeleteArtist,
    loading,
    actionLoading,
  });

  const table = useReactTable({
    data: artists,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updatedSelection) => {
      setRowSelection(updatedSelection);
      const selectedRowData = artists.filter(
        (artist, index) =>
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
      pagination: { pageIndex: currentPage - 1, pageSize: limit },
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1
            className={`text-2xl md:text-3xl font-bold tracking-tight ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Artist Management
          </h1>
          <p
            className={`text-muted-foreground ${
              theme === 'dark' ? 'text-white/60' : ''
            }`}
          >
            Manage and monitor artist profiles
          </p>
        </div>
      </div>

      <DataTableWrapper
        table={table}
        columns={columns}
        data={artists}
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
          onDelete: () => handleDeleteArtist(selectedRows.map((row) => row.id)),
          onActivate: handleBulkActivate,
          onDeactivate: handleBulkDeactivate,
          showExport: true,
          exportData: {
            data: artists,
            columns: [
              { key: 'id', header: 'ID' },
              { key: 'artistName', header: 'Artist Name' },
              { key: 'user.email', header: 'Email' },
              { key: 'bio', header: 'Bio' },
              { key: 'monthlyListeners', header: 'Monthly Listeners' },
              { key: 'isVerified', header: 'Verified' },
              { key: 'isActive', header: 'Status' },
              { key: 'createdAt', header: 'Created At' },
              { key: 'updatedAt', header: 'Updated At' },
            ],
            filename: 'artists',
          },
          searchPlaceholder: 'Search artists...',
          statusFilter: {
            value: statusFilter,
            onChange: setStatusFilter,
          },
        }}
      />
    </div>
  );
}
