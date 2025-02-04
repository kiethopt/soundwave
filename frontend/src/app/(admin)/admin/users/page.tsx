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
import { Button } from '@/components/layout/Button/Button';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

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

  // Khi tìm kiếm, reset về trang 1 qua việc cập nhật query param "page"
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParam('page', 1);
  };

  // Filter hiển thị user thuộc role "USER" dựa trên searchInput
  const filteredUsers = users.filter(
    (user) =>
      user.role === 'USER' &&
      (user.email.toLowerCase().includes(searchInput.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchInput.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchInput.toLowerCase()))
  );

  return (
    <div className="container mx-auto space-y-8 mb-16" suppressHydrationWarning>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            User Management
          </h1>
          <p className="text-white/60 mt-2 text-sm md:text-base">
            Manage and monitor user accounts
          </p>
        </div>
        <form onSubmit={handleSearch} className="relative w-full md:w-auto">
          <input
            type="text"
            placeholder="Search users..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
          />
          <button
            type="submit"
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
          >
            <Search className="text-white/40 w-5 h-5" />
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08] relative">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-white/5 border-b border-white/[0.08]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  User
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Joined
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {loading
                ? Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                            <div className="space-y-2">
                              <div className="h-4 bg-white/10 rounded w-32 animate-pulse" />
                              <div className="h-3 bg-white/10 rounded w-24 animate-pulse" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-white/10 rounded w-48 animate-pulse" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-6 bg-white/10 rounded-full w-20 animate-pulse" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="h-6 w-6 bg-white/10 rounded-full animate-pulse" />
                        </td>
                      </tr>
                    ))
                : filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                            {user.avatar ? (
                              <Image
                                src={user.avatar}
                                alt={user.name || 'User avatar'}
                                width={32}
                                height={32}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <UserIcon className="w-8 h-8 text-white/40 p-1.5" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {user.name || 'Anonymous'}
                            </div>
                            <div className="text-white/60 text-sm">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="hover:bg-white/10 p-2 rounded-full">
                            <MoreVertical className="w-5 h-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#282828] border-white/10 text-white">
                            <DropdownMenuItem
                              onClick={() =>
                                handleUserStatus(user.id, user.isActive)
                              }
                              disabled={actionLoading === user.id}
                              className="cursor-pointer hover:bg-white/10"
                            >
                              <Power className="w-4 h-4 mr-2" />
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleResetPassword(user.id)}
                              disabled={actionLoading === user.id}
                              className="cursor-pointer hover:bg-white/10"
                            >
                              <Key className="w-4 h-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={actionLoading === user.id}
                              className="text-red-400 cursor-pointer hover:bg-red-500/20"
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

          {!loading && filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
              <UserIcon className="w-12 h-12 mb-4" />
              <p>No users found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-white/[0.08]">
            <button
              onClick={() => updateQueryParam('page', currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-white/5 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Previous
            </button>

            {/* Mobile Pagination */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger className="px-3 py-2 bg-white/5 rounded-md hover:bg-white/10 text-sm">
                  {currentPage} of {totalPages}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#282828] border border-white/[0.1] text-white p-4 w-[200px]">
                  <div className="space-y-3">
                    <div className="text-xs text-white/60">Go to page:</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        defaultValue={currentPage}
                        ref={pageInputRef}
                        className="w-full px-2 py-1 rounded-md bg-white/5 border border-white/[0.1] text-white text-center focus:outline-none focus:ring-2 focus:ring-[#ffaa3b]/50 text-sm"
                        placeholder="Page"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const page = pageInputRef.current
                          ? parseInt(pageInputRef.current.value, 10)
                          : NaN;
                        if (!isNaN(page)) {
                          updateQueryParam('page', page);
                        }
                      }}
                      className="w-full px-3 py-1.5 rounded-md bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20 transition-colors text-sm"
                    >
                      Go to Page
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop Pagination */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-white/60">Page</span>
              <div className="bg-white/5 px-3 py-1 rounded-md border border-white/[0.1]">
                <span className="text-white font-medium">{currentPage}</span>
              </div>
              <span className="text-white/60">of {totalPages}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  defaultValue={currentPage}
                  ref={pageInputRef}
                  className="w-16 px-2 py-1 rounded-md bg-white/5 border border-white/[0.1] text-white text-center focus:outline-none focus:ring-2 focus:ring-[#ffaa3b]/50 text-sm"
                  placeholder="Page"
                />
                <button
                  onClick={() => {
                    const page = pageInputRef.current
                      ? parseInt(pageInputRef.current.value, 10)
                      : NaN;
                    if (!isNaN(page)) {
                      updateQueryParam('page', page);
                    }
                  }}
                  className="px-3 py-1 rounded-md bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20 transition-colors text-sm"
                >
                  Go
                </button>
              </div>
            </div>

            <button
              onClick={() => updateQueryParam('page', currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-white/5 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
            </button>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Spinner className="w-8 h-8 animate-spin text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
