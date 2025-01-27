'use client';

import { useState, useEffect } from 'react';
import type { User } from '@/types';
import { api } from '@/utils/api';
import {
  Search,
  MoreVertical,
  Key,
  Trash2,
  Power,
  User as UserIcon,
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
import { Button } from '@/components/layout/Button/Button';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const response = await api.admin.getAllUsers(token, 1, 100);
        const usersArray = Array.isArray(response)
          ? response
          : response?.data || response?.users || [];

        setUsers(usersArray);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'Failed to fetch users'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

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

  const filteredUsers = users.filter(
    (user) =>
      user.role === 'USER' &&
      (user.email.toLowerCase().includes(searchInput.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchInput.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchInput.toLowerCase()))
  );

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-white/60 mt-2">Manage and monitor user accounts</p>
        </div>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search users..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 pr-4 py-2 w-full bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg">{error}</div>
      )}

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08]">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Artist Profile
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Image
                          src={user.avatar || '/images/default-avatar.jpg'}
                          alt={user.name || 'User avatar'}
                          width={40}
                          height={40}
                          className="rounded-full object-cover w-[40px] h-[40px]"
                        />
                        <div className="ml-3">
                          <p className="font-medium text-white">
                            {user.name || 'No name'}
                          </p>
                          <p className="text-sm text-white/60">
                            {user.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-white/10 text-white/80">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.artistProfile ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-400">
                          Artist
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-white/10 text-white/60">
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.isActive
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#1E1E1E] border-white/10"
                        >
                          <DropdownMenuItem
                            className="hover:bg-white/5 text-white cursor-pointer"
                            onClick={() =>
                              handleUserStatus(user.id, user.isActive)
                            }
                            disabled={!!actionLoading}
                          >
                            <Power className="w-4 h-4 mr-2" />
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="hover:bg-white/5 text-white cursor-pointer"
                            onClick={() => handleResetPassword(user.id)}
                            disabled={!!actionLoading}
                          >
                            <Key className="w-4 h-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={!!actionLoading}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredUsers.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
            <UserIcon className="w-12 h-12 mb-4" />
            <p>No users found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
