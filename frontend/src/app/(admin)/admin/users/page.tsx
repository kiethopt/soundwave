'use client';

import { useState, useEffect, Fragment } from 'react';
import { User } from '@/types';
import { api } from '@/utils/api';
import { MoreVertical, Key, Trash2, Power, Search } from 'lucide-react';
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from '@headlessui/react';

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
      setUsers(Array.isArray(data) ? data : []);
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

      await fetchUsers(); // Refresh users list
      setError(null);
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      setError(
        error instanceof Error ? error.message : `Failed to ${action} user`
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

      alert('Password has been reset successfully');
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
    if (
      !window.confirm(
        'Are you sure you want to delete this user? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      setActionLoading(username);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No token found');

      const response = await fetch(api.users.delete(username), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      await fetchUsers(); // Refresh users list
      setError(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to delete user'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchInput.toLowerCase()) ||
      user.email.toLowerCase().includes(searchInput.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchInput.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white/5">
          <table className="min-w-full divide-y divide-white/10">
            <thead>
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
                <tr key={user.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <span className="text-lg">
                            {user.username[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="font-medium">{user.username}</div>
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
                    <Menu as="div" className="relative inline-block text-left">
                      <MenuButton className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10">
                        <MoreVertical className="w-4 h-4" />
                      </MenuButton>

                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-[#2a2a2a] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-white/10 z-[100]">
                          <div className="py-1">
                            <MenuItem>
                              {({ active }) => (
                                <button
                                  className={`${
                                    active ? 'bg-white/10' : ''
                                  } flex items-center px-4 py-2 text-sm w-full text-left`}
                                  onClick={() =>
                                    handleUserAction(
                                      user.username,
                                      user.isActive ? 'deactivate' : 'activate'
                                    )
                                  }
                                  disabled={actionLoading === user.username}
                                >
                                  <Power className="w-4 h-4 mr-2" />
                                  {actionLoading === user.username
                                    ? 'Processing...'
                                    : user.isActive
                                    ? 'Deactivate'
                                    : 'Activate'}
                                </button>
                              )}
                            </MenuItem>

                            <MenuItem>
                              {({ active }) => (
                                <button
                                  className={`${
                                    active ? 'bg-white/10' : ''
                                  } flex items-center px-4 py-2 text-sm w-full text-left`}
                                  onClick={() =>
                                    handleResetPassword(user.username)
                                  }
                                  disabled={actionLoading === user.username}
                                >
                                  <Key className="w-4 h-4 mr-2" />
                                  Reset Password
                                </button>
                              )}
                            </MenuItem>
                          </div>

                          <div className="py-1">
                            <MenuItem>
                              {({ active }) => (
                                <button
                                  className={`${
                                    active ? 'bg-white/10' : ''
                                  } flex items-center px-4 py-2 text-sm w-full text-left text-red-400`}
                                  onClick={() =>
                                    handleDeleteUser(user.username)
                                  }
                                  disabled={actionLoading === user.username}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </button>
                              )}
                            </MenuItem>
                          </div>
                        </MenuItems>
                      </Transition>
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
