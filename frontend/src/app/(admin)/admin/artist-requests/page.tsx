// frontend\src\app\(admin)\admin\artist-requests\page.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { User, Check, X, Eye, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

export default function ArtistRequests() {
  const [requests, setRequests] = useState<ArtistRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

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
    fetchRequests(page, searchInput);
  }, [page, searchInput]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRequests(1, searchInput);
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
      fetchRequests(page, searchInput);
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
      fetchRequests(page, searchInput);
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
    <div className="container mx-auto space-y-8" suppressHydrationWarning>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artist Requests</h1>
          <p className="text-white/60 mt-2">
            Manage artist requests from users
          </p>
        </div>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search requests..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-12 pr-4 py-2 bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20 w-64"
          />
          <button
            type="submit"
            className="absolute left-4 top-1/2 transform -translate-y-1/2"
          >
            <Search className="text-white/40 w-5 h-5" />
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-400 p-3 rounded-lg">{error}</div>
      )}

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08] relative">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/[0.08]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Artist Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Requested At
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
                            <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
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
                          <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-6 w-6 bg-white/10 rounded-full animate-pulse" />
                        </td>
                      </tr>
                    ))
                : requests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center">
                            {request.avatar ? (
                              <img
                                src={request.avatar}
                                alt={request.artistName}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <User className="w-6 h-6 text-white/60" />
                            )}
                          </div>
                          <Link
                            href={`/admin/artist-requests/${request.id}`}
                            className="ml-3 font-medium hover:underline"
                          >
                            {request.artistName}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {request.user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatDate(request.verificationRequestedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="hover:bg-white/10 p-2 rounded-full">
                            <MoreVertical className="w-5 h-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#282828] border-white/10 text-white">
                            <DropdownMenuItem
                              onClick={() => handleViewDetails(request.id)}
                              className="cursor-pointer hover:bg-white/10"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleApprove(request.id)}
                              className="cursor-pointer hover:bg-white/10 text-green-400"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Approve Request
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => handleReject(request.id)}
                              className="text-red-400 cursor-pointer hover:bg-red-500/20"
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

          {!loading && requests.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
              <User className="w-12 h-12 mb-4" />
              <p>No requests found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex justify-between items-center p-4 border-t border-white/[0.08]">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white/5 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => prev + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white/5 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
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
