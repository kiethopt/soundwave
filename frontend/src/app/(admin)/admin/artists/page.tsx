'use client';

import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { User, MoreVertical, Power, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ArtistProfile } from '@/types';
import { Search, Spinner } from '@/components/ui/Icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'react-toastify';

export default function AdminArtists() {
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const limit = 10;

  const fetchArtists = async (page: number, query: string = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.artists.getAllArtistsProfile(
        token,
        page,
        limit
      );
      setArtists(response.artists);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch artists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists(page, searchInput);
  }, [page, searchInput]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchArtists(1, searchInput);
  };

  const handleDeactivateArtist = async (
    artistId: string,
    currentStatus: boolean
  ) => {
    try {
      setActionLoading(artistId);
      const token = localStorage.getItem('userToken');
      if (!token) return;

      // Gọi API với giá trị isActive mới
      await api.admin.deactivateArtist(
        artistId,
        { isActive: !currentStatus },
        token
      );

      // Cập nhật state với giá trị mới
      setArtists((prev) =>
        prev.map((artist) =>
          artist.id === artistId
            ? {
                ...artist,
                isActive: !currentStatus,
                // Reset current profile nếu deactivate
                user: {
                  ...artist.user,
                  currentProfile: !currentStatus
                    ? 'USER'
                    : artist.user.currentProfile,
                },
              }
            : artist
        )
      );

      toast.success(
        `Artist ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Operation failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteArtist = async (artistId: string) => {
    if (!confirm('Are you sure you want to delete this artist?')) return;

    try {
      setActionLoading(artistId);
      const token = localStorage.getItem('userToken');
      if (!token) return;

      await api.admin.deleteArtist(artistId, token);

      setArtists((prevArtists) =>
        prevArtists.filter((artist) => artist.id !== artistId)
      );
      toast.success('Artist deleted successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete artist';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Artist Management
          </h1>
          <p className="text-white/60 mt-2">Create and manage your artists</p>
        </div>
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search artists..."
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
          {/* Optional */}
          {/* <Link
            href="/admin/artists/new"
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-white/90"
          >
            <AddSimple className="w-4 h-4" />
            New Artist
          </Link> */}
        </div>
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
                  Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Monthly Listeners
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold">
                  Created At
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
                : artists.map((artist) => (
                    <tr key={artist.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {artist.avatar ? (
                            <img
                              src={artist.avatar}
                              alt={artist.artistName}
                              className="w-10 h-10 rounded-full mr-3 object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = '/images/default-avatar.jpg';
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full mr-3 bg-white/[0.03] flex items-center justify-center">
                              <User className="w-6 h-6 text-white/60" />
                            </div>
                          )}
                          <Link
                            href={`/admin/artists/${artist.id}`}
                            className="font-medium hover:underline"
                          >
                            {artist.artistName}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {artist.user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {artist.monthlyListeners.toLocaleString() ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              artist.isVerified
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-yellow-500/10 text-yellow-500'
                            }`}
                          >
                            {artist.isVerified ? 'Verified' : 'Unverified'}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              artist.isActive
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-red-500/10 text-red-500'
                            }`}
                          >
                            {artist.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatDate(artist.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="hover:bg-white/10 p-2 rounded-full">
                            <MoreVertical className="w-5 h-5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#282828] border-white/10 text-white">
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeactivateArtist(
                                  artist.id,
                                  artist.isActive
                                )
                              }
                              disabled={actionLoading === artist.id}
                              className="cursor-pointer hover:bg-white/10"
                            >
                              <Power className="w-4 h-4 mr-2" />
                              {artist.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                              onClick={() => handleDeleteArtist(artist.id)}
                              disabled={actionLoading === artist.id}
                              className="text-red-400 cursor-pointer hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Artist
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!loading && artists.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
              <User className="w-12 h-12 mb-4" />
              <p>No artists found</p>
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
