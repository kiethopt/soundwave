'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Edit, UserCog, ShieldCheck, ShieldAlert } from 'lucide-react';
import { UserInfoModal } from '@/components/ui/data-table/data-table-modals';
import { EditUserModal, ConfirmDeleteModal, DeactivateModal, MakeAdminModal } from '@/components/ui/admin-modals';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SortConfig {
  key: keyof User | null;
  direction: 'asc' | 'desc';
}

export default function SimpleUserManagement() {
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const [makingAdminUser, setMakingAdminUser] = useState<User | null>(null);
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isMakeAdminModalOpen, setIsMakeAdminModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  const limit = 10;

  const fetchUsers = useCallback(async (page: number, search: string, role: 'ALL' | 'ADMIN' | 'USER', status: 'ALL' | 'ACTIVE' | 'INACTIVE', sort: SortConfig) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search) {
        params.append('search', search);
      }
      if (role !== 'ALL') {
        params.append('role', role);
      }
      if (status !== 'ALL') {
        params.append('status', status === 'ACTIVE' ? 'true' : 'false');
      }
      if (sort.key) {
        params.append('sortBy', sort.key);
        params.append('sortOrder', sort.direction);
      }

      const response = await api.admin.getAllUsers(token, page, limit, params.toString());
      setUsers(response.users || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Could not load users');
      toast.error(err.message || 'Could not load users');
      setUsers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const refreshTable = useCallback(() => {
      fetchUsers(currentPage, activeSearchTerm, roleFilter, statusFilter, sortConfig);
      setSelectedUserIds(new Set());
  }, [currentPage, activeSearchTerm, roleFilter, statusFilter, sortConfig, fetchUsers]);

  useEffect(() => {
    refreshTable();
  }, [refreshTable]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearchTerm, roleFilter, statusFilter, sortConfig]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActiveSearchTerm(searchInput);
  };

  const handleSort = (key: keyof User | null) => {
    if (!key) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortableHeader = (label: string, sortKey: keyof User | null) => (
    <th scope="col" className={`py-3 px-6 cursor-pointer transition-colors rounded-t-md ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`} onClick={() => handleSort(sortKey)}>
      <div className="flex items-center">
        {label}
        {sortKey && (
            sortConfig.key === sortKey ? (
              sortConfig.direction === 'asc' ?
                <ArrowUp className="ml-2 h-3 w-3" /> :
                <ArrowDown className="ml-2 h-3 w-3" />
            ) : (
              <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
            )
        )}
      </div>
    </th>
  );

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const allIds = new Set(users.map(u => u.id));
      setSelectedUserIds(allIds);
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleSelectRow = (userId: string, checked: boolean | 'indeterminate') => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (checked === true) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return 'Invalid Date';
    }
  };

  const handleAction = (action: string, user: User) => {
    if (action === 'view') {
      setViewingUser(user);
    } else if (action === 'edit') {
      setEditingUser(user);
      setIsEditModalOpen(true);
    } else if (action === 'delete') {
      setDeletingUser(user);
      setIsBulkDeleteConfirm(false);
      setIsDeleteModalOpen(true);
    } else if (action === 'makeAdmin') {
      setMakingAdminUser(user);
      setIsMakeAdminModalOpen(true);
    } else if (action === 'activate') {
        handleActivateUser(user);
    } else if (action === 'deactivate') {
        handleDeactivateUserClick(user);
    }
  };

  const handleActivateUser = async (user: User) => {
    if (!user) return;
    if (!window.confirm(`Are you sure you want to activate ${user.name || user.email}?`)) {
        return;
    }

    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading(user.id);
    try {
      await api.admin.updateUser(user.id, { isActive: true }, token);
      toast.success(`${user.name || user.email} activated successfully!`);
      refreshTable();
    } catch (err: any) {
      console.error('Error activating user:', err);
      toast.error(err.message || 'Failed to activate user.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivateUserClick = (user: User) => {
    if (!user) return;
    setDeactivatingUser(user);
    setIsDeactivateModalOpen(true);
  };

  const handleDeactivateConfirm = async (reason: string) => {
    if (!deactivatingUser) return;

    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      setIsDeactivateModalOpen(false);
      setDeactivatingUser(null);
      return;
    }
    setActionLoading(deactivatingUser.id);
    try {
      await api.admin.updateUser(deactivatingUser.id, { isActive: false, reason }, token);
      toast.success(`${deactivatingUser.name || deactivatingUser.email} deactivated successfully.`);
      setIsDeactivateModalOpen(false);
      setDeactivatingUser(null);
      refreshTable();
    } catch (err: any) {
      console.error('Error deactivating user:', err);
      toast.error(err.message || 'Failed to deactivate user.');
      setIsDeactivateModalOpen(false);
      setDeactivatingUser(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteConfirm = (ids: string[]) => {
    if (ids.length === 0 && isBulkDeleteConfirm) {
        handleBulkDeleteConfirm(Array.from(selectedUserIds));
    } else if (ids.length === 1 && !isBulkDeleteConfirm && deletingUser) {
        handleSingleDeleteConfirm(ids[0]);
    } else {
        console.error("Inconsistent state in handleDeleteConfirm");
    }
    setIsDeleteModalOpen(false);
    setDeletingUser(null);
    setIsBulkDeleteConfirm(false);
  };

  const handleSingleDeleteConfirm = async (userId: string) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading(userId);
    try {
      await api.admin.deleteUser(userId, token);
      toast.success(`Successfully deleted user.`);
      refreshTable();
      setSelectedUserIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast.error(err.message || 'Failed to delete user.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditUserSubmit = async (userId: string, editFormData: FormData) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading(userId);
    try {
      if (editFormData.has('isActive')) {
        editFormData.delete('isActive');
      }

      await api.admin.updateUser(userId, editFormData, token);
      toast.success('User updated successfully!');
      setIsEditModalOpen(false);
      setEditingUser(null);
      refreshTable();
    } catch (err: any) {
      console.error('Error updating user:', err);
      if (err instanceof Error) {
          toast.error(err.message);
      } else {
           toast.error('An unexpected error occurred while updating the user.');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleMakeAdminConfirm = async (userId: string) => {
    const userToMakeAdmin = users.find(u => u.id === userId);
    if (!userToMakeAdmin || userToMakeAdmin.role === 'ADMIN') {
      toast.error("Cannot make this user an admin or user is already an admin.");
      setIsMakeAdminModalOpen(false);
      setMakingAdminUser(null);
      return;
    }

    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      setIsMakeAdminModalOpen(false);
      setMakingAdminUser(null);
      return;
    }
    setActionLoading(userId);
    try {
      await api.admin.updateUser(userId, { role: 'ADMIN', adminLevel: 2 }, token);
      toast.success(`${userToMakeAdmin.name || userToMakeAdmin.email} is now an Admin (Level 2).`);
      refreshTable();
    } catch (err: any) {
      console.error('Error making user admin:', err);
      toast.error(err.message || 'Failed to make user admin.');
    } finally {
      setActionLoading(null);
      setIsMakeAdminModalOpen(false);
      setMakingAdminUser(null);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedUserIds.size === 0) {
      toast('No users selected.', { icon: '⚠️' });
      return;
    }
    setDeletingUser(null);
    setIsBulkDeleteConfirm(true);
    setIsDeleteModalOpen(true);
  };

  const handleBulkDeleteConfirm = async (userIds: string[]) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading('bulk-delete');
    try {
      await Promise.all(userIds.map(id => api.admin.deleteUser(id, token)));
      toast.success(`Successfully deleted ${userIds.length} user(s).`);

      const response = await api.admin.getAllUsers(token, 1, limit, new URLSearchParams({ limit: '1' }).toString());
      const newTotalUsers = response.pagination?.totalItems || 0;
      const newTotalPages = Math.ceil(newTotalUsers / limit) || 1;

      let targetPage = currentPage;
      if (currentPage > newTotalPages) {
        targetPage = newTotalPages;
      } else if (users.length === userIds.length && currentPage > 1) {
        targetPage = currentPage - 1;
      }

      if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
      } else {
          refreshTable();
      }

      setSelectedUserIds(new Set());
    } catch (err: any) {
      console.error('Error deleting users:', err);
      toast.error(err.message || 'Failed to delete users.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRowClick = (user: User, e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[role="checkbox"]') || target.closest('[data-radix-dropdown-menu-trigger]') || target.closest('button')) {
      return;
    }
    setViewingUser(user);
  };

  const isAllSelected = users.length > 0 && selectedUserIds.size === users.length;
  const isIndeterminate = selectedUserIds.size > 0 && selectedUserIds.size < users.length;

  return (
    <div className={`container mx-auto space-y-6 p-4 pb-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
           User Management
        </h1>
        <p className={`text-muted-foreground ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
           Manage and monitor user accounts
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-grow">
           <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
           <Input
             type="text"
             placeholder="Search and press Enter..."
             value={searchInput}
             onChange={(e) => setSearchInput(e.target.value)}
             className={`pl-10 pr-4 py-2 w-full rounded-md border h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}
           />
           <button type="submit" className="hidden">Search</button>
         </form>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={(value: 'ALL' | 'ADMIN' | 'USER') => setRoleFilter(value)}>
            <SelectTrigger className={`w-[140px] rounded-md h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}>
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600 text-white' : ''}>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="USER">User</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value: 'ALL' | 'ACTIVE' | 'INACTIVE') => setStatusFilter(value)}>
            <SelectTrigger className={`w-[140px] rounded-md h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}>
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600 text-white' : ''}>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && !viewingUser && !editingUser && !deletingUser && !deactivatingUser && !makingAdminUser && <p>Loading users...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!error && (
        <>
          <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className={`w-full text-sm text-left ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <thead className={`text-xs uppercase ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
                <tr>
                  <th scope="col" className="p-4 rounded-tl-md">
                     <Checkbox
                       id="select-all-checkbox"
                       checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
                       onCheckedChange={handleSelectAll}
                       aria-label="Select all rows on this page"
                       className={`${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                       disabled={loading || actionLoading !== null}
                     />
                   </th>
                   {renderSortableHeader('Name', 'name')}
                   {renderSortableHeader('Email', 'email')}
                   {renderSortableHeader('Role', 'role')}
                   {renderSortableHeader('Status', 'isActive')}
                   {renderSortableHeader('Created At', 'createdAt')}
                  <th scope="col" className="py-3 px-6 rounded-tr-md text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={(e) => handleRowClick(user, e)}
                      className={`border-b cursor-pointer transition-opacity ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'} ${selectedUserIds.has(user.id) ? (theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-50') : ''} ${actionLoading === user.id ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                      <td className="w-4 p-4">
                         <Checkbox
                           id={`select-row-${user.id}`}
                           checked={selectedUserIds.has(user.id)}
                           onCheckedChange={(checked) => handleSelectRow(user.id, checked)}
                           aria-label={`Select row for user ${user.name || user.email}`}
                           className={`${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                           disabled={loading || actionLoading !== null}
                         />
                      </td>
                      <td className={`py-4 px-6 font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {user.name || user.username || 'N/A'}
                      </td>
                      <td className="py-4 px-6">{user.email}</td>
                      <td className="py-4 px-6">{user.role}{user.adminLevel ? ` (L${user.adminLevel})` : ''}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive
                            ? (theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
                            : (theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800')
                          }`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-6">{formatDate(user.createdAt)}</td>
                      <td className="py-4 px-6">
                         <div className="flex items-center justify-center gap-1">
                           <Button
                             variant="ghost"
                             size="icon"
                             className={`text-red-600 hover:bg-red-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                             onClick={(e) => { e.stopPropagation(); handleAction('delete', user); }}
                             aria-label={`Delete user ${user.name || user.email}`}
                             disabled={loading || actionLoading !== null}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" className="h-8 w-8 p-0" data-radix-dropdown-menu-trigger disabled={loading || actionLoading !== null}>
                                 <span className="sr-only">Open menu</span>
                                 <MoreHorizontal className="h-4 w-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600 text-white' : ''}>
                               <DropdownMenuLabel>Actions</DropdownMenuLabel>
                               <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleAction('view', user)} } disabled={loading || actionLoading === user.id}>
                                   <Search className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                               <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleAction('edit', user)} } disabled={loading || actionLoading === user.id}>
                                   <Edit className="mr-2 h-4 w-4" /> Edit Info
                                </DropdownMenuItem>
                               {user.role !== 'ADMIN' && (
                                 <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleAction('makeAdmin', user)} } disabled={loading || actionLoading === user.id}>
                                   <UserCog className="mr-2 h-4 w-4" /> Make Admin (L2)
                                 </DropdownMenuItem>
                               )}
                                <DropdownMenuSeparator className={theme === 'dark' ? 'bg-gray-600' : ''} />
                                {user.isActive ? (
                                  <DropdownMenuItem
                                    onClick={(e) => {e.stopPropagation(); handleAction('deactivate', user)}}
                                    className={cn(
                                      theme === 'light'
                                        ? "text-orange-600 focus:text-orange-700 focus:bg-orange-100"
                                        : "text-orange-400 focus:bg-orange-500/20 focus:text-orange-300",
                                    )}
                                    disabled={loading || actionLoading === user.id}
                                  >
                                    <ShieldAlert className="mr-2 h-4 w-4" /> Deactivate User
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={(e) => {e.stopPropagation(); handleAction('activate', user)}}
                                    className={cn(
                                      "focus:bg-opacity-50",
                                      theme === 'light'
                                        ? "text-green-700 focus:text-green-800 focus:bg-green-100"
                                        : "text-green-400 focus:bg-green-500/20 focus:text-green-300",
                                    )}
                                    disabled={loading || actionLoading === user.id}
                                   >
                                     <ShieldCheck className="mr-2 h-4 w-4" /> Activate User
                                   </DropdownMenuItem>
                                )}
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-4 px-6 text-center">No users found {activeSearchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL' ? 'matching your criteria' : ''}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="min-w-[200px]">
              {selectedUserIds.size > 0 && (
                <Button
                  onClick={handleBulkDeleteClick}
                  variant="destructive"
                  size="default"
                  disabled={loading || actionLoading !== null}
                  className={`${theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : ''}`}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedUserIds.size})
                </Button>
              )}
            </div>
            <div className="flex justify-end">
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading || actionLoading !== null}
                    variant="outline"
                    size="sm">
                    Previous
                  </Button>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading || actionLoading !== null}
                    variant="outline"
                    size="sm">
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <UserInfoModal
        user={viewingUser}
        onClose={() => setViewingUser(null)}
        theme={theme}
      />

      <EditUserModal
        user={editingUser}
        isOpen={isEditModalOpen}
        onClose={() => {
            setIsEditModalOpen(false);
            setEditingUser(null);
        }}
        onSubmit={handleEditUserSubmit}
        theme={theme}
      />

      <ConfirmDeleteModal
        item={isBulkDeleteConfirm ? null : deletingUser}
        count={isBulkDeleteConfirm ? selectedUserIds.size : undefined}
        isOpen={isDeleteModalOpen}
        onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingUser(null);
            setIsBulkDeleteConfirm(false);
        }}
        onConfirm={handleDeleteConfirm}
        theme={theme}
        entityType="user"
      />

       <DeactivateModal
         isOpen={isDeactivateModalOpen}
         onClose={() => {
             setIsDeactivateModalOpen(false);
             setDeactivatingUser(null);
         }}
         onConfirm={handleDeactivateConfirm}
         theme={theme}
         entityType="user"
       />

       <MakeAdminModal
         user={makingAdminUser}
         isOpen={isMakeAdminModalOpen}
         onClose={() => {
           setIsMakeAdminModalOpen(false);
           setMakingAdminUser(null);
         }}
         onConfirm={handleMakeAdminConfirm}
         theme={theme}
       />
    </div>
  );
} 