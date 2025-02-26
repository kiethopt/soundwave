'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ArtistProfile } from '@/types';
import { api } from '@/utils/api';
import { User, MoreVertical, Power, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { useTheme } from '@/contexts/ThemeContext';
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableWrapper } from '@/components/data-table/data-table-wrapper';
import Link from 'next/link';

export default function ArtistManagement() {
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const { theme } = useTheme();

  // State cho sorting, column filters, visibility, row selection, selected rows, status filter
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [selectedRows, setSelectedRows] = useState<ArtistProfile[]>([]);
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
      router.replace(`/admin/artists${queryStr}`);
    }
  }, [searchParams, router]);

  const pageFromURL = Number(searchParams.get('page'));
  const currentPage = isNaN(pageFromURL) || pageFromURL < 1 ? 1 : pageFromURL;

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
    router.push(`/admin/artists${queryStr}`);
  };

  // API calls
  const fetchArtists = async (page: number) => {
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
        params.append('search', searchInput);
      }

      // Thêm status filter nếu có
      if (statusFilter.length === 1) {
        params.append('status', statusFilter[0]);
      }

      const response = await api.artists.getAllArtistsProfile(
        token,
        page,
        limit,
        params.toString()
      );

      setArtists(response.artists);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to fetch artists'
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
      fetchArtists(1);
    }
  }, [searchInput, statusFilter]);

  useEffect(() => {
    fetchArtists(currentPage);
  }, [currentPage]);

  const filteredArtists = artists.filter(
    (artist) =>
      (searchInput
        ? artist.artistName.toLowerCase().includes(searchInput.toLowerCase()) ||
          artist.user.email.toLowerCase().includes(searchInput.toLowerCase())
        : true) &&
      (statusFilter.length === 0 ||
        statusFilter.includes(artist.isActive.toString()))
  );

  // Action handlers
  const handleArtistStatus = async (artistId: string, isActive: boolean) => {
    try {
      setActionLoading(artistId);
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      await api.admin.deactivateArtist(
        artistId,
        { isActive: !isActive },
        token
      );
      setArtists((prev) =>
        prev.map((artist) =>
          artist.id === artistId ? { ...artist, isActive: !isActive } : artist
        )
      );
      toast.success(
        `Artist ${isActive ? 'deactivated' : 'activated'} successfully`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update artist'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteArtist = async (artistId: string) => {
    if (!confirm('Are you sure you want to delete this artist?')) return;

    try {
      setActionLoading(artistId);
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      await api.admin.deleteArtist(artistId, token);
      setArtists((prev) => prev.filter((artist) => artist.id !== artistId));
      toast.success('Artist deleted successfully');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete artist'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (
      !selectedRows.length ||
      !confirm(`Delete ${selectedRows.length} selected artists?`)
    )
      return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await Promise.all(
        selectedRows.map((row) => api.admin.deleteArtist(row.id, token))
      );

      setSelectedRows([]);
      fetchArtists(currentPage);
      toast.success(`Deleted ${selectedRows.length} artists successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Deletion failed');
    }
  };

  // Table columns definition
  const columns: ColumnDef<ArtistProfile>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className={theme === 'dark' ? 'border-white/50' : ''}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'artistName',
      header: 'Artist',
      cell: ({ row }) => {
        const artist = row.original;
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full overflow-hidden ${
                theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
              }`}
            >
              {artist.avatar ? (
                <Image
                  src={artist.avatar}
                  alt={artist.artistName}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <User
                  className={`w-8 h-8 p-1.5 ${
                    theme === 'dark' ? 'text-white/40' : 'text-gray-400'
                  }`}
                />
              )}
            </div>
            <div>
              <Link
                href={`/admin/artists/${artist.id}`}
                className={`font-medium hover:underline ${
                  theme === 'dark' ? 'text-white' : ''
                }`}
              >
                {artist.artistName}
              </Link>
              <div
                className={theme === 'dark' ? 'text-white/60' : 'text-gray-500'}
              >
                {artist.user.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'monthlyListeners',
      header: 'Monthly Listeners',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {row.original.monthlyListeners.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'isVerified',
      header: 'Verification',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.original.isVerified
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}
        >
          {row.original.isVerified ? 'Verified' : 'Unverified'}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.original.isActive
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {row.original.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => (
        <span className={theme === 'dark' ? 'text-white' : ''}>
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const artist = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleArtistStatus(artist.id, artist.isActive)}
              >
                <Power className="w-4 h-4 mr-2" />
                {artist.isActive ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteArtist(artist.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Artist
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: artists,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
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
          onDelete: handleDeleteSelected,
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
              {
                key: 'verificationRequestedAt',
                header: 'Verification Requested',
              },
              { key: 'verifiedAt', header: 'Verified At' },
              { key: 'createdAt', header: 'Created At' },
              { key: 'updatedAt', header: 'Updated At' },
              { key: 'socialMediaLinks.facebook', header: 'Facebook' },
              { key: 'socialMediaLinks.instagram', header: 'Instagram' },
              { key: 'socialMediaLinks.twitter', header: 'Twitter' },
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
