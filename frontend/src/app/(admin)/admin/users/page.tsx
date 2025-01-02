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
import { Button } from '@/components/ui/button';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No token found');

      const response = await fetch(api.users.getAll(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      const usersData = Array.isArray(data) ? data : [];
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to fetch users'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (
    username: string,
    action: 'activate' | 'deactivate'
  ) => {
    try {
      setActionLoading(username);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No token found');

      // Optimistically update the UI
      setUsers(
        users.map((user) => {
          if (user.username === username) {
            return {
              ...user,
              isActive: action === 'activate',
            };
          }
          return user;
        })
      );

      const endpoint =
        action === 'activate'
          ? api.users.activate(username)
          : api.users.deactivate(username);

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }

      // Refetch users after successful action
      await fetchUsers();
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      setError(
        error instanceof Error ? error.message : `Failed to ${action} user`
      );

      // Revert the optimistic update if the request fails
      setUsers(
        users.map((user) => {
          if (user.username === username) {
            return {
              ...user,
              isActive: user.isActive,
            };
          }
          return user;
        })
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (username: string) => {
    try {
      setActionLoading(username);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No token found');

      const response = await fetch(api.users.resetPassword(username), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }

      // Refetch users after successful action
      await fetchUsers();
      setError(null);
    } catch (error) {
      console.error('Error resetting password:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to reset password'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      setActionLoading(username);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No token found');

      // Optimistically remove the user from the UI
      setUsers(users.filter((user) => user.username !== username));

      const response = await fetch(api.users.delete(username), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      // Refetch users after successful action
      await fetchUsers();
      setError(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to delete user'
      );

      // Revert the optimistic update if the request fails
      fetchUsers();
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchInput.toLowerCase()) ||
      user.email.toLowerCase().includes(searchInput.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchInput.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Users Management</h1>
          <div className="w-64 h-10 bg-white/5 rounded-full animate-pulse" />
        </div>
        <div className="bg-white/5 rounded-lg">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 border-b border-white/10 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search users..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-white/10 rounded-full px-10 py-2 text-sm focus:outline-none focus:bg-white/20"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">{error}</div>
      )}

      <div className="bg-white/5 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5">
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
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <img
                        className="h-10 w-10 rounded-full"
                        src={user.avatar || '/images/default-avatar.jpg'}
                        alt=""
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium">{user.username}</div>
                      <div className="text-sm text-white/60">{user.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      user.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          handleUserAction(
                            user.username,
                            user.isActive ? 'deactivate' : 'activate'
                          )
                        }
                        disabled={actionLoading === user.username}
                      >
                        {actionLoading === user.username &&
                        user.username === user.username ? (
                          <span className="animate-pulse">Processing...</span>
                        ) : (
                          <>
                            <Power className="mr-2 h-4 w-4" />
                            <span>
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </span>
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleResetPassword(user.username)}
                        disabled={actionLoading === user.username}
                      >
                        {actionLoading === user.username ? (
                          <span className="animate-pulse">Processing...</span>
                        ) : (
                          <>
                            <Key className="mr-2 h-4 w-4" />
                            <span>Reset Password</span>
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteUser(user.username)}
                        disabled={actionLoading === user.username}
                        className="text-red-600"
                      >
                        {actionLoading === user.username ? (
                          <span className="animate-pulse">Processing...</span>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
