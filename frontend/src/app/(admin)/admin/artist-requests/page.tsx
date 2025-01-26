'use client';

import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { Search, User, Check, RefreshCw, X, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ArtistRequest } from '@/types';
import { toast } from 'react-toastify';

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
      setError(null);
      const token = localStorage.getItem('userToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const limit = 10;
      const response = await api.admin.getArtistRequests(token, page, limit);

      const totalRequests = response.pagination.total;
      const totalPages = Math.ceil(totalRequests / limit);

      setRequests(response.requests);
      setTotalPages(totalPages);
    } catch (err) {
      console.error('Error fetching artist requests:', err);
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
      if (!token) {
        throw new Error('No authentication token found');
      }

      await api.admin.approveArtistRequest(requestId, token);
      toast.success('Artist request approved successfully!');
      fetchRequests(page, searchInput);
    } catch (err) {
      console.error('Error approving request:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to approve request'
      );
    }
  };

  const handleReject = async (requestId: string) => {
    // Xác nhận trước khi reject
    if (!confirm('Are you sure you want to reject this artist request?')) {
      return;
    }

    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await api.admin.rejectArtistRequest(requestId, token);

      // Kiểm tra hasPendingRequest từ response
      if (response.hasPendingRequest === false) {
        toast.success('Artist request rejected successfully!');
      } else {
        toast.error('Failed to update request status');
      }

      fetchRequests(page, searchInput);
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to reject request'
      );
    }
  };

  const handleViewDetails = (requestId: string) => {
    router.push(`/admin/artist-requests/${requestId}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artist Requests</h1>
          <p className="text-white/60 mt-2">
            Manage artist requests from users
          </p>
        </div>
      </div>

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08]">
        <div className="p-6 border-b border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Request List</h2>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search requests..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent w-64"
              />
              <button
                type="submit"
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
              >
                <Search className="text-white/40 w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : requests.length > 0 ? (
            <table className="w-full">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Artist Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Requested At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
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
                        <span className="ml-3 font-medium">
                          {request.artistName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(request.verificationRequestedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetails(request.id)}
                          className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
              <User className="w-12 h-12 mb-4" />
              <p>No requests found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
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
      </div>
    </div>
  );
}
