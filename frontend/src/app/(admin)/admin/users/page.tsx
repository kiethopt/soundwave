'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { User } from '@/types';
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
} from '@tanstack/react-table';
import { DataTableWrapper } from '@/components/ui/data-table/data-table-wrapper';
import { getUserColumns } from '@/components/ui/data-table/data-table-columns';
import { useDataTable } from '@/hooks/useDataTable';
import {
  EditUserModal,
  UserInfoModal,
  DeactivateModal,
} from '@/components/ui/data-table/data-table-modals';

export default function UserManagement() {
  const { theme } = useTheme();
  const limit = 10;

  const {
    data: users,
    setData: setUsers,
    loading,
    totalPages,
    currentPage,
    setActionLoading,
    searchInput,
    setSearchInput,
    statusFilter,
    setStatusFilter,
    selectedRows,
    setSelectedRows,
    updateQueryParam,
  } = useDataTable<User>({
    fetchData: async (page, params) => {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.admin.getAllUsers(
        token,
        page,
        limit,
        params.toString()
      );
      return {
        data: response.users,
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

  // Modal states
  const [updatingUser, setUpdatingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  // Add new state variables
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [userIdToDeactivate, setUserIdToDeactivate] = useState<string | null>(
    null
  );
  const [isBulkDeactivating, setIsBulkDeactivating] = useState(false);

  // Action handlers
  const handleUpdateUser = async (
    userId: string,
    data: FormData | { isActive: boolean; reason?: string }
  ) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      setActionLoading(userId);
      const response = await api.admin.updateUser(userId, data, token);
      setUsers(
        users.map((user) => (user.id === userId ? response.user : user))
      );
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUsers = async (userIds: string | string[]) => {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    const confirmMessage =
      ids.length === 1
        ? 'Are you sure you want to delete this user?'
        : `Delete ${ids.length} selected users?`;

    if (!confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      if (!Array.isArray(userIds)) {
        setActionLoading(userIds);
      }

      await Promise.all(ids.map((id) => api.admin.deleteUser(id, token)));

      if (!Array.isArray(userIds)) {
        setUsers((prev) => prev.filter((user) => user.id !== userIds));
      } else {
        const params = new URLSearchParams();
        params.set('page', currentPage.toString());
        params.set('limit', limit.toString());

        if (searchInput) params.append('q', searchInput);
        if (statusFilter.length === 1) params.append('status', statusFilter[0]);

        const response = await api.admin.getAllUsers(
          token,
          currentPage,
          limit,
          params.toString()
        );
        setUsers(response.users);
      }

      toast.success(
        ids.length === 1
          ? 'User deleted successfully'
          : `Deleted ${ids.length} users successfully`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete user(s)'
      );
    } finally {
      if (!Array.isArray(userIds)) {
        setActionLoading(null);
      }
    }
  };

  // Update handleStatusChange to include token initialization
  const handleStatusChange = async (userId: string, isActive: boolean) => {
    if (!isActive) {
      // If deactivating, show the modal
      setUserIdToDeactivate(userId);
      setIsDeactivateModalOpen(true);
      return;
    }

    // If activating, proceed directly
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      setActionLoading(userId);
      await api.admin.updateUser(userId, { isActive }, token);
      setUsers(
        users.map((user) => (user.id === userId ? { ...user, isActive } : user))
      );
      toast.success(
        `User ${isActive ? 'activated' : 'deactivated'} successfully`
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : `Failed to ${isActive ? 'activate' : 'deactivate'} user`
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Add function to handle deactivation with reason
  const handleDeactivateConfirm = async (reason: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      setIsDeactivateModalOpen(false);

      if (isBulkDeactivating && selectedRows.length > 0) {
        // Bulk deactivation
        setActionLoading('bulk');
        await Promise.all(
          selectedRows.map((user) =>
            api.admin.updateUser(user.id, { isActive: false, reason }, token)
          )
        );

        setUsers(
          users.map((user) =>
            selectedRows.some((selected) => selected.id === user.id)
              ? { ...user, isActive: false }
              : user
          )
        );

        toast.success(`${selectedRows.length} users deactivated successfully`);
        setSelectedRows([]);
      } else if (userIdToDeactivate) {
        // Single user deactivation
        setActionLoading(userIdToDeactivate);
        await api.admin.updateUser(
          userIdToDeactivate,
          { isActive: false, reason },
          token
        );

        setUsers(
          users.map((user) =>
            user.id === userIdToDeactivate ? { ...user, isActive: false } : user
          )
        );

        toast.success('User deactivated successfully');
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to deactivate user(s)'
      );
    } finally {
      setActionLoading(null);
      setUserIdToDeactivate(null);
      setIsBulkDeactivating(false);
    }
  };

  // Modify handleBulkDeactivate to use modal
  const handleBulkDeactivate = async () => {
    if (
      !selectedRows.length ||
      !confirm(`Deactivate ${selectedRows.length} selected users?`)
    )
      return;

    setIsBulkDeactivating(true);
    setIsDeactivateModalOpen(true);
  };

  // Table configuration
  const columns = getUserColumns({
    theme,
    onDelete: handleDeleteUsers,
    onEdit: setUpdatingUser,
    onView: setViewingUser,
    onStatusChange: handleStatusChange,
  });

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updatedSelection) => {
      setRowSelection(updatedSelection);
      const selectedRowData = users.filter(
        (user, index) =>
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
        pageSize: limit,
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
        data={users}
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
          onDelete: () => handleDeleteUsers(selectedRows.map((row) => row.id)),
          showExport: true,
          exportData: {
            data: users,
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

      <EditUserModal
        user={updatingUser}
        onClose={() => setUpdatingUser(null)}
        onSubmit={handleUpdateUser}
        theme={theme}
      />

      <UserInfoModal
        user={viewingUser}
        onClose={() => setViewingUser(null)}
        theme={theme}
      />

      <DeactivateModal
        isOpen={isDeactivateModalOpen}
        onClose={() => {
          setIsDeactivateModalOpen(false);
          setUserIdToDeactivate(null);
          setIsBulkDeactivating(false);
        }}
        onConfirm={handleDeactivateConfirm}
        theme={theme}
        entityType="user"
      />
    </div>
  );
}
