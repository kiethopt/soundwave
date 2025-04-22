'use client';

import { useState } from 'react';
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
  MakeAdminModal,
} from '@/components/ui/data-table/data-table-modals';
import { useSession } from '@/contexts/SessionContext';
import React from 'react';

export default function UserManagement() {
  const { theme } = useTheme();
  const { user: loggedInUser } = useSession();
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
    roleFilter,
    setRoleFilter,
    selectedRows,
    setSelectedRows,
    updateQueryParam,
    refreshData,
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
    loggedInAdminLevel: loggedInUser?.adminLevel,
  });

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  // Modal states
  const [updatingUser, setUpdatingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [userIdToDeactivate, setUserIdToDeactivate] = useState<string | null>(
    null
  );
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isBulkDeactivating, setIsBulkDeactivating] = useState(false);
  const [isBulkActivating, setIsBulkActivating] = useState(false);
  const [userToMakeAdmin, setUserToMakeAdmin] = useState<User | null>(null);

  // Action handlers
  const handleUpdateUser = async (userId: string, data: FormData) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      setActionLoading(userId);
      const response = await api.admin.updateUser(userId, data, token);
      const updatedUser = response.user;

      setUsers((prevUsers) =>
        prevUsers.map((user) => (user.id === userId ? { ...user, ...updatedUser } : user))
      );

      toast.success('User updated successfully');
      setUpdatingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update user'
      );
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

      if (ids.length > 0) {
        setActionLoading('bulk-delete'); // Indicate bulk action
      }

      await Promise.all(ids.map((id) => api.admin.deleteUser(id, token)));

      // Instead of conditional logic, always refetch after delete for simplicity and consistency
      await refreshData();
      setRowSelection({}); // Clear selection after successful delete
      setSelectedRows([]);

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
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    if (!isActive) {
      // Open deactivate modal for confirmation and reason
      setUserIdToDeactivate(userId);
      setIsDeactivateModalOpen(true);
      return;
    }

    // Proceed with activation directly
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      setActionLoading(userId);
      const response = await api.admin.updateUser(userId, { isActive }, token);

      if (response && response.user) {
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, ...response.user } : user
          )
        );
        toast.success(`User activated successfully`);
      } else {
        console.warn('Activate response did not contain expected user data.');
        toast.error('Failed to update user data locally after activation.');
      }
    } catch (err) {
      console.error('Activation error:', err);
      toast.error(
        err instanceof Error ? err.message : `Failed to activate user`
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivateConfirm = async (reason: string) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('No authentication token found');
      return;
    }

    const idsToProcess = isBulkDeactivating
      ? selectedRows.filter((user) => user.isActive).map((user) => user.id)
      : userIdToDeactivate
      ? [userIdToDeactivate]
      : [];

    if (idsToProcess.length === 0) {
      toast('No active users selected for deactivation.');
      setIsDeactivateModalOpen(false);
      setIsBulkDeactivating(false);
      setUserIdToDeactivate(null);
      return;
    }

    setActionLoading(isBulkDeactivating ? 'bulk-deactivate' : userIdToDeactivate);

    try {
      await Promise.all(
        idsToProcess.map((id) =>
          api.admin.updateUser(id, { isActive: false, reason }, token)
        )
      );

      // Update local state after successful deactivation
      setUsers((prev) =>
        prev.map((user) =>
          idsToProcess.includes(user.id)
            ? { ...user, isActive: false }
            : user
        )
      );

      toast.success(
        `Deactivated ${idsToProcess.length} user(s) successfully`
      );
      if (isBulkDeactivating) {
        setSelectedRows([]);
        setRowSelection({});
      }
    } catch (error) {
      console.error('Deactivation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to deactivate user(s)'
      );
    } finally {
      setIsDeactivateModalOpen(false);
      setIsBulkDeactivating(false);
      setUserIdToDeactivate(null);
      setActionLoading(null);
    }
  };

  const handleBulkActivate = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('No authentication token found');
      return;
    }

    const usersToActivate = selectedRows.filter((user) => !user.isActive);

    if (usersToActivate.length === 0) {
      toast('No inactive users selected for activation.');
      return;
    }

    if (!confirm(`Activate ${usersToActivate.length} selected users?`)) return;

    setActionLoading('bulk-activate');
    setIsBulkActivating(true);

    try {
      await Promise.all(
        usersToActivate.map((user) =>
          api.admin.updateUser(user.id, { isActive: true }, token)
        )
      );

      // Update local state
      const activatedUserIds = usersToActivate.map((user) => user.id);
      setUsers((prev) =>
        prev.map((user) =>
          activatedUserIds.includes(user.id)
            ? { ...user, isActive: true }
            : user
        )
      );

      toast.success(`Activated ${usersToActivate.length} users successfully`);
      setSelectedRows([]);
      setRowSelection({});
    } catch (error) {
      console.error('Activation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to activate user(s)'
      );
    } finally {
      setActionLoading(null);
      setIsBulkActivating(false);
    }
  };

  const handleBulkDeactivate = () => {
    const usersToDeactivate = selectedRows.filter((user) => user.isActive);

    if (usersToDeactivate.length === 0) {
      toast('No active users selected for deactivation.');
      return;
    }

    if (!confirm(`Deactivate ${usersToDeactivate.length} selected users?`)) return;

    setIsBulkDeactivating(true);
    setIsDeactivateModalOpen(true);
  };

  const handleConfirmMakeAdmin = async (userId: string) => {
    if (!userToMakeAdmin || userToMakeAdmin.id !== userId) return; 

    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('No authentication token found');
      return;
    }

    setActionLoading(userId);
    try {
      const response = await api.admin.updateUser(
        userId,
        { role: 'ADMIN', adminLevel: 2 },
        token
      );

      if (response && response.user) {
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, ...response.user } : user
          )
        );
        toast.success('User promoted to Admin successfully');
      } else {
        console.warn('Make admin response did not contain expected user data.');
        toast.error('Failed to update user data locally after promotion.');
      }
    } catch (err) {
      console.error('Make Admin error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to promote user to Admin'
      );
    } finally {
      setActionLoading(null);
      setUserToMakeAdmin(null); // Close modal on success or failure
    }
  };

  // Table configuration
  const columns = React.useMemo(
    () =>
      getUserColumns({
        theme,
        onDelete: handleDeleteUsers,
        onEdit: setUpdatingUser,
        onView: setViewingUser,
        onStatusChange: handleStatusChange,
        onMakeAdmin: setUserToMakeAdmin,
        loggedInAdminLevel: loggedInUser?.adminLevel,
      }),
    [theme, loggedInUser?.adminLevel]
  );

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      // Cập nhật state của hàng được chọn
      setRowSelection(updater); 

      // Lấy dữ liệu của các hàng được chọn và cập nhật state của hook
      const currentSelection = table.getState().rowSelection;
      const selectedRowData = table
        .getRowModel()
        .rows.filter((row) => currentSelection[row.id])
        .map((row) => row.original);
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
      className={`container mx-auto space-y-4 p-4 pb-20 ${theme === 'dark' ? 'text-white' : ''
        }`}
    >
      <div className="mb-6">
        <h1
          className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
        >
          User Management
        </h1>
        <p
          className={`text-muted-foreground ${theme === 'dark' ? 'text-white/60' : ''
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
        onPageChange={(page) => updateQueryParam({ page: page + 1 })}
        onRowSelection={setSelectedRows}
        theme={theme}
        toolbar={{
          searchValue: searchInput,
          onSearchChange: setSearchInput,
          selectedRowsCount: selectedRows.length,
          onDelete: () => handleDeleteUsers(selectedRows.map((row) => row.id)),
          onActivate: handleBulkActivate,
          onDeactivate: handleBulkDeactivate,
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
          ...(loggedInUser?.adminLevel === 1 && {
            roleFilter: {
              value: roleFilter,
              onChange: setRoleFilter,
            },
          }),
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

      {/* Render the MakeAdminModal - Props updated */}
      <MakeAdminModal
        isOpen={!!userToMakeAdmin} // Use truthiness of user object
        user={userToMakeAdmin}
        onClose={() => setUserToMakeAdmin(null)} // Directly set state to null
        onConfirm={handleConfirmMakeAdmin}
        theme={theme}
      />
    </div>
  );
}
