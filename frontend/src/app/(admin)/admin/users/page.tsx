'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import { api } from '@/utils/api';
import { MoreVertical, Key, Trash2, Power, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/layout/Button/Button';
import Image from 'next/image';

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
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to update user'
      );
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
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to reset password'
      );
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
      setUsers(users.filter((user) => user.id !== userId));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to delete user'
      );
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

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex justify-between items-center animate-pulse">
          {/* Điều chỉnh màu cho tiêu đề */}
          <div className="h-8 w-48 bg-[#494747] rounded" />
          {/* Điều chỉnh màu cho search box */}
          <div className="h-10 w-64 bg-[#494747] rounded-full" />
        </div>
        {/* Điều chỉnh màu cho bảng */}
        <div className="bg-[#121212] rounded-lg divide-y divide-[#7e7e7e]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4">
              {/* Điều chỉnh màu cho từng dòng */}
              <div className="h-4 bg-[#494747] rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Users Management</h1>
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search users..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-gray-200 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#A57865]"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg">{error}</div>
      )}

      <div className="bg-[#121212] rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#494747]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                User
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                Role
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#7e7e7e]">
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={user.avatar || '/images/default-avatar.jpg'}
                      alt={user.name || 'User avatar'}
                      width={40}
                      height={40}
                      className="rounded-full object-cover w-[40px] h-[40px]"
                    />
                    <div>
                      <p className="font-medium text-white">
                        {user.name || 'No name'}
                      </p>
                      <p className="text-sm text-gray-400">{user.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-300">
                  {user.email}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs bg-gray-600 text-gray-300`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      user.isActive
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-[#111111] border-gray-500"
                    >
                      <DropdownMenuItem
                        className="hover:bg-gray-700 text-white"
                        onClick={() => handleUserStatus(user.id, user.isActive)}
                        disabled={!!actionLoading}
                      >
                        <Power className="w-4 h-4 mr-2" />
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="hover:bg-gray-700 text-white"
                        onClick={() => handleResetPassword(user.id)}
                        disabled={!!actionLoading}
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Reset Password
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="bg-gray-500" />

                      <DropdownMenuItem
                        className="text-red-400 hover:bg-red-500/20"
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

        {filteredUsers.length === 0 && (
          <div className="p-6 text-center text-gray-400">
            No users found matching your search
          </div>
        )}
      </div>
    </div>
  );
}
