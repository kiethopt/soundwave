'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Eye, Check, X, MoreHorizontal } from 'lucide-react';
import type { ArtistRequest, ArtistRequestFilters } from '@/types';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableWrapper } from '@/components/data-table/data-table-wrapper';
import { DateRangePicker } from '@/components/ui/date-range-picker';
export default function ArtistRequests() {
  const [requests, setRequests] = useState<ArtistRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedRows, setSelectedRows] = useState<ArtistRequest[]>([]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme } = useTheme();

  const pageFromURL = Number(searchParams.get('page'));
  const currentPage = isNaN(pageFromURL) || pageFromURL < 1 ? 1 : pageFromURL;

  useEffect(() => {
    const pageStr = searchParams.get('page');
    const pageNumber = Number(pageStr);
    if (pageStr === '1' || pageNumber < 1) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('page');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/admin/artist-requests${queryStr}`);
    }
  }, [searchParams, router]);

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
    router.push(`/admin/artist-requests${queryStr}`);
  };

  const fetchRequests = async (page: number, query = '') => {
    try {
      setLoading(true);
      // Kiểm tra xem có đang ở client-side không
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('userToken');
        if (!token) throw new Error('No authentication token found');

        // Tạo đối tượng filters
        const filters: ArtistRequestFilters = {};

        // Thêm search nếu có
        if (query) {
          filters.search = query;
        }

        // Thêm date filters nếu có
        if (startDate && endDate) {
          filters.startDate = new Date(startDate);
          filters.endDate = new Date(endDate);
        }

        const response = await api.admin.getArtistRequests(
          token,
          page,
          10,
          filters
        );

        setRequests(response.requests);
        setTotalPages(response.pagination.totalPages);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to fetch requests'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset về trang 1 khi search hoặc date filters thay đổi
    if (currentPage !== 1) {
      updateQueryParam('page', 1);
    } else {
      // Chỉ fetch khi không có date filter hoặc có đủ cả start và end date
      if (!startDate || (startDate && endDate)) {
        fetchRequests(1, searchInput);
      }
    }
  }, [searchInput, startDate, endDate]);

  useEffect(() => {
    // Chỉ fetch khi không có date filter hoặc có đủ cả start và end date
    if (!startDate || (startDate && endDate)) {
      fetchRequests(currentPage, searchInput);
    }
  }, [currentPage]);

  const handleApprove = async (requestId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.admin.approveArtistRequest(requestId, token);
      toast.success('Artist request approved successfully!');
      fetchRequests(currentPage, searchInput);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to approve request'
      );
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this artist request?'))
      return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.admin.rejectArtistRequest(requestId, token);
      if (response.hasPendingRequest === false) {
        toast.success('Artist request rejected successfully!');
      } else {
        toast.error('Failed to update request status');
      }
      fetchRequests(currentPage, searchInput);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to reject request'
      );
    }
  };

  const handleViewDetails = (requestId: string) => {
    router.push(`/admin/artist-requests/${requestId}`);
  };

  const handleDeleteSelected = async () => {
    if (
      !selectedRows.length ||
      !confirm(`Delete ${selectedRows.length} selected requests?`)
    )
      return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await Promise.all(
        selectedRows.map((row) => api.admin.rejectArtistRequest(row.id, token))
      );

      setSelectedRows([]);
      fetchRequests(currentPage, searchInput);
      toast.success(`Deleted ${selectedRows.length} requests successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Deletion failed');
    }
  };

  const columns: ColumnDef<ArtistRequest>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className={`translate-y-[2px] ${
            theme === 'dark' ? 'border-white/50' : ''
          }`}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className={`translate-y-[2px] ${
            theme === 'dark' ? 'border-white/50' : ''
          }`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'artistName',
      header: 'Artist Name',
      cell: ({ row }) => {
        const request = row.original;
        return (
          <Link
            href={`/admin/artist-requests/${request.id}`}
            className={`font-medium text-sm hover:underline ${
              theme === 'dark' ? 'text-white' : ''
            }`}
          >
            {request.artistName}
          </Link>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'user.email',
      header: 'Email',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {row.original.user.email}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'verificationRequestedAt',
      header: 'Requested At',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {new Date(row.original.verificationRequestedAt).toLocaleDateString(
            'vi-VN',
            {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }
          )}
        </span>
      ),
      enableSorting: true,
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const request = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewDetails(request.id)}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleApprove(request.id)}
                className="text-green-600"
              >
                <Check className="w-4 h-4 mr-2" />
                Approve Request
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleReject(request.id)}
                className="text-red-600"
              >
                <X className="w-4 h-4 mr-2" />
                Reject Request
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Initialize table
  const table = useReactTable({
    data: requests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
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

  const exportColumns = [
    { key: 'artistName', header: 'Artist Name' },
    { key: 'user.name', header: 'User Name' },
    { key: 'user.email', header: 'Email' },
    { key: 'verificationRequestedAt', header: 'Requested At' },
    { key: 'bio', header: 'Biography' },
    { key: 'socialMediaLinks.facebook', header: 'Facebook' },
    { key: 'socialMediaLinks.instagram', header: 'Instagram' },
    { key: 'isVerified', header: 'Status' },
  ];

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
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          theme={theme}
        />
      </div>

      <DataTableWrapper
        table={table}
        columns={columns}
        data={requests}
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
          onDelete: handleDeleteSelected,
          showExport: true,
          exportData: {
            data: requests,
            columns: exportColumns,
            filename: 'artist-requests',
          },
          searchPlaceholder: 'Search requests...',
        }}
      />
    </div>
  );
}
