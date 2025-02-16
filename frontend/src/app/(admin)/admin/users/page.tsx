'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { User } from '@/types';
import { api } from '@/utils/api';
import {
  Search,
  MoreVertical,
  Key,
  Trash2,
  Power,
  User as UserIcon,
  Spinner,
} from '@/components/ui/Icons';
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
import { MoreHorizontal } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableWrapper } from '@/components/data-table/data-table-wrapper';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;
  const { theme } = useTheme();

  // State cho sorting, column filters, column visibility, row selection, selected rows, status filter
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [selectedRows, setSelectedRows] = useState<User[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  // Sử dụng URL query param cho số trang
  const searchParams = useSearchParams();
  const router = useRouter();

  // Nếu query param "page" có giá trị "1" hoặc nhỏ hơn 1, loại bỏ nó để URL được gọn
  useEffect(() => {
    const pageStr = searchParams.get('page');
    const pageNumber = Number(pageStr);
    if (pageStr === '1' || pageNumber < 1) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('page');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/admin/users${queryStr}`);
    }
  }, [searchParams, router]);

  // Lấy số trang hiện tại từ URL, đảm bảo rằng giá trị luôn tối thiểu là 1
  const pageFromURL = Number(searchParams.get('page'));
  const currentPage = isNaN(pageFromURL) || pageFromURL < 1 ? 1 : pageFromURL;

  // Hàm cập nhật query param "page"
  // Nếu chỉ có 1 trang và giá trị mới khác 1 thì không chuyển trang,
  // nếu giá trị vượt quá totalPages thì chuyển về totalPages.
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
    router.push(`/admin/users${queryStr}`);
  };

  // useRef cho input "Go to page"
  const pageInputRef = useRef<HTMLInputElement>(null);

  // Gọi API lấy danh sách user theo số trang và limit, trả về full response (có pagination)
  const fetchUsers = async (page: number, query: string = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) return;

      const response = await api.admin.getAllUsers(token, page, limit);
      // Các API có thể trả về data theo nhiều cách khác nhau
      const usersArray = Array.isArray(response)
        ? response
        : response?.data || response?.users || [];

      setUsers(usersArray);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Mỗi khi currentPage hoặc searchInput thay đổi, gọi API
  useEffect(() => {
    fetchUsers(currentPage, searchInput);
  }, [currentPage, searchInput]);

  const handleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      setActionLoading(userId);
      const token = localStorage.getItem('userToken');
      if (!token) return;

      await api.admin.deactivateUser(userId, { isActive: !isActive }, token);

      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, isActive: !isActive } : user
        )
      );

      toast.success(
        `User ${isActive ? 'deactivated' : 'activated'} successfully`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update user';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      setActionLoading(userId);
      const token = localStorage.getItem('userToken');
      if (!token) return;

      await api.auth.requestPasswordReset(
        users.find((u) => u.id === userId)?.email || ''
      );
      setError(null);
      toast.success('Password reset email sent successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reset password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      setActionLoading(userId);
      const token = localStorage.getItem('userToken');
      if (!token) return;

      await api.admin.deleteUser(userId, token);

      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
      toast.success('User deleted successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete user';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (
      !selectedRows.length ||
      !confirm(`Delete ${selectedRows.length} selected users?`)
    )
      return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await Promise.all(
        selectedRows.map((row) => api.admin.deleteUser(row.id, token))
      );

      setSelectedRows([]);
      fetchUsers(currentPage, searchInput);
      toast.success(`Deleted ${selectedRows.length} users successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Deletion failed');
    }
  };

  // Khi tìm kiếm, reset về trang 1 qua việc cập nhật query param "page"
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParam('page', 1);
  };

  // Filter hiển thị user thuộc role "USER" dựa trên searchInput
  const filteredUsers = users.filter(
    (user) =>
      user.role === 'USER' &&
      (searchInput
        ? user.email.toLowerCase().includes(searchInput.toLowerCase()) ||
          user.username?.toLowerCase().includes(searchInput.toLowerCase()) ||
          user.name?.toLowerCase().includes(searchInput.toLowerCase())
        : true) &&
      (statusFilter.length === 0 ||
        statusFilter.includes(user.isActive.toString()))
  );

  const columns: ColumnDef<User>[] = [
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
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full overflow-hidden ${
                theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
              }`}
            >
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name || 'User avatar'}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <UserIcon
                  className={`w-8 h-8 p-1.5 ${
                    theme === 'dark' ? 'text-white/40' : 'text-gray-400'
                  }`}
                />
              )}
            </div>
            <div>
              <div
                className={`font-medium ${
                  theme === 'dark' ? 'text-white' : ''
                }`}
              >
                {user.name || 'Anonymous'}
              </div>
              <div
                className={theme === 'dark' ? 'text-white/60' : 'text-gray-500'}
              >
                @{user.username}
              </div>
            </div>
          </div>
        );
      },
      sortingFn: 'text',
    },
    {
      accessorKey: 'email',
      header: 'Email',
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
      enableSorting: true,
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
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleUserStatus(user.id, user.isActive)}
              >
                <Power className="w-4 h-4 mr-2" />
                {user.isActive ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                <Key className="w-4 h-4 mr-2" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteUser(user.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredUsers,
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
          User Management
        </h1>
        <p
          className={`text-muted-foreground ${
            theme === 'dark' ? 'text-white/60' : ''
          }`}
        >
          Manage and monitor user accounts
        </p>
      </div>

      <DataTableWrapper
        table={table}
        columns={columns}
        data={filteredUsers}
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
            data: filteredUsers,
            columns: [
              { key: 'id', header: 'ID' },
              { key: 'name', header: 'Name' },
              { key: 'username', header: 'Username' },
              { key: 'email', header: 'Email' },
              { key: 'role', header: 'Role' },
              { key: 'currentProfile', header: 'Current Profile' },
              { key: 'isActive', header: 'Status' },
              { key: 'createdAt', header: 'Created At' },
              { key: 'updatedAt', header: 'Updated At' },
              { key: 'lastLoginAt', header: 'Last Login' },
              { key: 'artistProfile.artistName', header: 'Artist Name' },
              {
                key: 'artistProfile.monthlyListeners',
                header: 'Monthly Listeners',
              },
              { key: 'artistProfile.isVerified', header: 'Verified Artist' },
              {
                key: 'artistProfile.verificationRequestedAt',
                header: 'Verification Requested',
              },
              { key: 'artistProfile.verifiedAt', header: 'Verified At' },
              {
                key: 'artistProfile.socialMediaLinks.facebook',
                header: 'Facebook',
              },
              {
                key: 'artistProfile.socialMediaLinks.instagram',
                header: 'Instagram',
              },
            ],
            filename: 'users',
          },
          searchPlaceholder: 'Search users...',
          statusFilter: {
            value: statusFilter,
            onChange: setStatusFilter,
          },
        }}
      />
    </div>
  );
}
