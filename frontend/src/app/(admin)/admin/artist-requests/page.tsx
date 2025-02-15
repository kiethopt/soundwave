'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { User, Check, X, Eye, MoreVertical } from 'lucide-react';
import { ArtistRequest } from '@/types';
import { toast } from 'react-toastify';
import { Search, Spinner } from '@/components/ui/Icons';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';

export default function ArtistRequests() {
  const { theme } = useTheme();
  const [requests, setRequests] = useState<ArtistRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [totalPages, setTotalPages] = useState(1);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Định nghĩa các biến dựa theo theme
  const textColor = theme === 'light' ? 'text-gray-900' : 'text-white';
  const subTextColor = theme === 'light' ? 'text-gray-600' : 'text-white/60';
  const inputBg = theme === 'light' ? 'bg-gray-50' : 'bg-white/[0.07]';
  const inputBorder =
    theme === 'light' ? 'border-gray-200' : 'border-white/[0.1]';
  const cardBg = theme === 'light' ? 'bg-gray-100' : 'bg-white/5';
  const cardBorder =
    theme === 'light' ? 'border-gray-200' : 'border-white/[0.08]';
  const pulseBg = theme === 'light' ? 'bg-gray-200' : 'bg-white/10';
  const dropdownBg = theme === 'light' ? 'bg-white' : 'bg-[#282828]';
  const dropdownBorder =
    theme === 'light' ? 'border-gray-200' : 'border-white/[0.1]';
  const dropdownText = theme === 'light' ? 'text-gray-900' : 'text-white';
  const paginationBtnBg = theme === 'light' ? 'bg-gray-200' : 'bg-white/5';
  const paginationBtnHover =
    theme === 'light' ? 'hover:bg-gray-300' : 'hover:bg-white/10';
  const iconColor = theme === 'light' ? 'text-gray-500' : 'text-white/40';

  // Nếu query param "page" có giá trị "1" hoặc nhỏ hơn 1 thì loại bỏ nó để URL gọn
  useEffect(() => {
    const pageStr = searchParams.get('page');
    const pageNumber = Number(pageStr);
    if (pageStr === '1' || pageNumber < 1) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('page');
      const queryStr = newParams.toString() ? `?${newParams.toString()}` : '';
      router.replace(`/admin/artist-requests${queryStr}`);
    }
  }, [searchParams, router]);

  const pageFromURL = Number(searchParams.get('page'));
  const currentPage = isNaN(pageFromURL) || pageFromURL < 1 ? 1 : pageFromURL;

  // Dùng ref cho input "Go to page"
  const pageInputRef = useRef<HTMLInputElement>(null);

  // Hàm cập nhật query param "page"
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
    router.push(`/admin/artist-requests${queryStr}`);
  };

  const fetchRequests = async (page: number, query: string = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const limit = 10;
      const response = await api.admin.getArtistRequests(token, page, limit);
      setRequests(response.requests);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(currentPage, searchInput);
  }, [currentPage, searchInput]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Khi tìm kiếm, reset về trang 1
    updateQueryParam('page', 1);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleApprove = async (requestId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.admin.approveArtistRequest(requestId, token);
      toast.success('Artist request approved successfully!');
      fetchRequests(currentPage, searchInput);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to approve request'
      );
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm('Are you sure you want to reject this artist request?'))
      return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.admin.rejectArtistRequest(requestId, token);
      if (response.hasPendingRequest === false) {
        toast.success('Artist request rejected successfully!');
      } else {
        toast.error('Failed to update request status');
      }
      fetchRequests(currentPage, searchInput);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to reject request'
      );
    }
  };

  const handleViewDetails = (requestId: string) => {
    router.push(`/admin/artist-requests/${requestId}`);
  };

  return (
    <div
      className="container mx-auto space-y-8 p-4 mb-16"
      suppressHydrationWarning
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1
            className={`text-2xl md:text-3xl font-bold tracking-tight ${textColor}`}
          >
            Artist Requests
          </h1>
          <p className={`mt-2 text-sm md:text-base ${subTextColor}`}>
            Manage artist requests from users
          </p>
        </div>
        <form onSubmit={handleSearch} className="relative w-full md:w-auto">
          <input
            type="text"
            placeholder="Search requests..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={`w-full md:w-64 pl-10 pr-4 py-2 ${inputBg} border ${inputBorder} rounded-md focus:outline-none focus:ring-2 ${
              theme === 'light' ? 'focus:ring-gray-300' : 'focus:ring-white/20'
            } text-sm`}
          />
          <button
            type="submit"
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
          >
            <Search className={`${iconColor} w-5 h-5`} />
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg">{error}</div>
      )}

      <div
        className={`rounded-lg overflow-hidden border ${cardBg} ${cardBorder} relative`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead
              className={`border-b ${cardBorder} ${
                theme === 'light' ? 'bg-gray-100' : 'bg-white/5'
              }`}
            >
              <tr>
                <th
                  className={`px-6 py-4 text-left text-sm font-semibold ${textColor}`}
                >
                  Artist Name
                </th>
                <th
                  className={`px-6 py-4 text-left text-sm font-semibold ${textColor}`}
                >
                  Email
                </th>
                <th
                  className={`px-6 py-4 text-left text-sm font-semibold ${textColor}`}
                >
                  Requested At
                </th>
                <th
                  className={`px-6 py-4 text-right text-sm font-semibold ${textColor}`}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                theme === 'light' ? 'divide-gray-200' : 'divide-white/[0.04]'
              }`}
            >
              {loading
                ? Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <tr key={i}>
                        <td className="px-3 md:px-6 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full ${pulseBg} animate-pulse`}
                            />
                            <div className="space-y-2">
                              <div
                                className={`h-4 rounded w-32 animate-pulse ${pulseBg}`}
                              />
                              <div
                                className={`h-3 rounded w-24 animate-pulse ${pulseBg}`}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 md:px-6 py-2">
                          <div
                            className={`h-4 rounded w-48 animate-pulse ${pulseBg}`}
                          />
                        </td>
                        <td className="px-3 md:px-6 py-2">
                          <div
                            className={`h-4 rounded w-24 animate-pulse ${pulseBg}`}
                          />
                        </td>
                        <td className="px-3 md:px-6 py-2 text-right">
                          <div
                            className={`h-6 w-6 rounded-full animate-pulse ${pulseBg}`}
                          />
                        </td>
                      </tr>
                    ))
                : requests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-3 md:px-6 py-2 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center">
                            {request.avatar ? (
                              <img
                                src={request.avatar}
                                alt={request.artistName}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <User className="w-6 h-6" />
                            )}
                          </div>
                          <Link
                            href={`/admin/artist-requests/${request.id}`}
                            className={`ml-3 font-medium text-sm ${textColor} hover:underline`}
                          >
                            {request.artistName}
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-2 whitespace-nowrap text-sm">
                        {request.user.email}
                      </td>
                      <td className="px-3 md:px-6 py-2 whitespace-nowrap text-sm">
                        {formatDate(request.verificationRequestedAt)}
                      </td>
                      <td className="px-3 md:px-6 py-2 whitespace-nowrap text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-2 rounded-full hover:bg-white/10">
                            <MoreVertical className="w-5 h-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className={`${dropdownBg} border ${dropdownBorder} ${dropdownText}`}
                          >
                            <DropdownMenuItem
                              onClick={() => handleViewDetails(request.id)}
                              className="cursor-pointer hover:bg-white/10 text-sm"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleApprove(request.id)}
                              className="cursor-pointer hover:bg-white/10 text-green-400 text-sm"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Approve Request
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => handleReject(request.id)}
                              className="cursor-pointer hover:bg-red-500/20 text-red-400 text-sm"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Reject Request
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!loading && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <User className="w-12 h-12 mb-4" />
            <p className={subTextColor}>No requests found</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 0 && (
          <div
            className={`flex items-center justify-center gap-2 p-4 border-t ${
              theme === 'light' ? 'border-gray-200' : 'border-white/[0.04]'
            }`}
          >
            <button
              onClick={() => updateQueryParam('page', currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-2 ${paginationBtnBg} rounded-md ${paginationBtnHover} disabled:opacity-50 disabled:cursor-not-allowed text-sm`}
            >
              Previous
            </button>

            {/* Mobile Pagination */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`px-3 py-2 ${paginationBtnBg} rounded-md ${paginationBtnHover} text-sm`}
                >
                  {currentPage} of {totalPages}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className={`${dropdownBg} border ${dropdownBorder} ${dropdownText} p-4 w-[200px]`}
                >
                  <div className="space-y-3">
                    <div className="text-xs">Go to page:</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        defaultValue={currentPage}
                        ref={pageInputRef}
                        className={`w-full px-2 py-1 rounded-md ${inputBg} border ${inputBorder} text-center focus:outline-none focus:ring-2 ${
                          theme === 'light'
                            ? 'focus:ring-gray-300'
                            : 'focus:ring-[#ffaa3b]/50'
                        } text-sm`}
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
              <span className={subTextColor}>Page</span>
              <div className={`px-3 py-1 rounded-md border ${inputBorder}`}>
                <span className={`font-medium ${textColor}`}>
                  {currentPage}
                </span>
              </div>
              <span className={subTextColor}>of {totalPages}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  defaultValue={currentPage}
                  ref={pageInputRef}
                  className={`w-16 px-2 py-1 rounded-md ${inputBg} border ${inputBorder} ${textColor} text-center focus:outline-none focus:ring-2 ${
                    theme === 'light'
                      ? 'focus:ring-gray-300'
                      : 'focus:ring-[#ffaa3b]/50'
                  } text-sm`}
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
                  className={`px-3 py-1 rounded-md text-sm ${
                    theme === 'light'
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'bg-[#ffaa3b]/10 text-[#ffaa3b] hover:bg-[#ffaa3b]/20 border border-[#ffaa3b]/20'
                  }`}
                >
                  Go
                </button>
              </div>
            </div>

            <button
              onClick={() => updateQueryParam('page', currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 ${paginationBtnBg} rounded-md ${paginationBtnHover} disabled:opacity-50 disabled:cursor-not-allowed text-sm`}
            >
              Next
            </button>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div
            className={`absolute inset-0 flex items-center justify-center ${
              theme === 'light' ? 'bg-gray-500/50' : 'bg-black/50'
            }`}
          >
            <Spinner
              className={`w-8 h-8 animate-spin ${
                theme === 'light' ? 'text-gray-900' : 'text-white'
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
