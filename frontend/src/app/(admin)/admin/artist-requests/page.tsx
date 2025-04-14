'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useDataTable } from '@/hooks/useDataTable';
import { getArtistRequestColumns } from '@/components/ui/data-table/data-table-columns';
import { DataTableWrapper } from '@/components/ui/data-table/data-table-wrapper';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ArtistRequest } from '@/types';
import { RejectModal } from '@/components/ui/data-table/data-table-modals';
import {
  ColumnFiltersState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';

export default function ArtistRequestManagement() {
  const { theme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const limit = 10;

  // Helper functions to safely access searchParams
  const safeGetParam = (key: string): string => {
    return searchParams?.get(key) || '';
  };

  const safeParamsToString = (): string => {
    return searchParams?.toString() || '';
  };

  const [requestIdToReject, setRequestIdToReject] = useState<string | null>(
    null
  );
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Sử dụng useDataTable hook
  const {
    data: requests,
    setData: setRequests,
    loading,
    totalPages,
    currentPage,
    searchInput,
    setSearchInput,
    selectedRows,
    setSelectedRows,
    updateQueryParam,
  } = useDataTable<ArtistRequest>({
    fetchData: async (page, params) => {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const filters = {
        search: params.get('search') || '',
        startDate: params.get('startDate')
          ? new Date(params.get('startDate')!)
          : undefined,
        endDate: params.get('endDate')
          ? new Date(params.get('endDate')!)
          : undefined,
      };

      const response = await api.admin.getArtistRequests(
        token,
        page,
        limit,
        filters
      );
      return {
        data: response.requests,
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
  
  // Derive startDate and endDate directly from searchParams for the picker
  const currentStartDate = safeGetParam('startDate');
  const currentEndDate = safeGetParam('endDate');

  // Action handlers
  const handleApprove = async (requestId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');
      await api.admin.approveArtistRequest(requestId, token);
      toast.success('Artist request approved successfully!');
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to approve request'
      );
    }
  };

  const handleRejectClick = (requestId: string) => {
    setRequestIdToReject(requestId);
    setIsRejectModalOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    try {
      setIsRejectModalOpen(false);

      if (!requestIdToReject) return;

      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.admin.rejectArtistRequest(requestIdToReject, reason, token);
      toast.success('Artist request rejected successfully!');
      setRequests((prev) => prev.filter((req) => req.id !== requestIdToReject));
      setRequestIdToReject(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to reject request'
      );
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedRows.length) {
      toast.error('No requests selected for deletion.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to permanently delete ${selectedRows.length} selected request(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication token not found.');
      return;
    }

    const deletePromises = selectedRows.map((row) =>
      api.admin.deleteArtistRequest(row.id, token)
    );

    try {
      await Promise.all(deletePromises);

      // Update local state after successful deletion
      setRequests((prev) =>
        prev.filter((req) => !selectedRows.some((row) => row.id === req.id))
      );
      setSelectedRows([]); // Clear selection
      toast.success(`Deleted ${selectedRows.length} requests successfully.`);
    } catch (err) {
      console.error('Bulk delete error:', err);
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to delete some or all selected requests.'
      );
    }
  };

  const handleViewDetails = (requestId: string) => {
    router.push(`/admin/artist-requests/${requestId}`);
  };

  // Define columns
  const columns = getArtistRequestColumns({
    theme,
    onApprove: handleApprove,
    onReject: handleRejectClick,
    onViewDetails: handleViewDetails,
  });

  const table = useReactTable({
    data: requests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updatedSelection) => {
      let newSelection: RowSelectionState;
      if (typeof updatedSelection === 'function') {
        newSelection = updatedSelection(rowSelection);
      } else {
        newSelection = updatedSelection;
      }
      setRowSelection(newSelection);
      const selectedRowData = requests.filter(
        (request, index) => newSelection[index]
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

  // Xử lý khi người dùng thay đổi ngày
  const handleDateChange = (dates: { startDate: string; endDate: string }) => {
    updateQueryParam({
      startDate: dates.startDate || null,
      endDate: dates.endDate || null,
      page: 1,
    });
  };

  return (
    <div
      className={`container mx-auto space-y-4 p-4 pb-20 ${
        theme === 'dark' ? 'text-white' : ''
      }`}
    >
      <div className="mb-6">
        <h1
          className={`text-2xl md:text-3xl font-bold tracking-tight ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}
        >
          Artist Requests
        </h1>
        <p
          className={`text-muted-foreground ${
            theme === 'dark' ? 'text-white/60' : ''
          }`}
        >
          Manage artist requests from users
        </p>
      </div>

      <div className="w-full">
        <DateRangePicker
          startDate={currentStartDate}
          endDate={currentEndDate}
          onChange={handleDateChange}
        />
      </div>

      <DataTableWrapper
        table={table}
        columns={columns}
        data={requests}
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
          onDelete: handleBulkDelete,
          showExport: true,
          exportData: {
            data: requests,
            columns: [
              { key: 'artistName', header: 'Artist Name' },
              { key: 'user.name', header: 'User Name' },
              { key: 'user.email', header: 'Email' },
              { key: 'verificationRequestedAt', header: 'Requested At' },
              { key: 'bio', header: 'Biography' },
              { key: 'socialMediaLinks.facebook', header: 'Facebook' },
              { key: 'socialMediaLinks.instagram', header: 'Instagram' },
              { key: 'isVerified', header: 'Status' },
            ],
            filename: 'artist-requests',
          },
          searchPlaceholder: 'Search requests...',
        }}
      />

      {/* Rejection Reason Modal (Only for single reject) */}
      <RejectModal
        isOpen={isRejectModalOpen && !!requestIdToReject}
        onClose={() => {
          setIsRejectModalOpen(false);
          setRequestIdToReject(null);
        }}
        onConfirm={handleRejectConfirm}
        theme={theme === 'dark' ? 'dark' : 'light'}
      />
    </div>
  );
}
