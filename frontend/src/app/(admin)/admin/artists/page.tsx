'use client';

import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { Search, User, Plus } from 'lucide-react';
import Link from 'next/link';
import { ArtistProfile } from '@/types';

export default function AdminArtists() {
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchArtists = async (page: number, query: string = '') => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('userToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const limit = 10;
      const response = await api.artists.getAllArtistsProfile(
        token,
        page,
        limit
      );
      setArtists(response.artists);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      console.error('Error fetching artists:', err);
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

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
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
        <Link
          href="/admin/artists/new"
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-white/90"
        >
          <Plus className="w-4 h-4" />
          New Artist
        </Link>
      </div>

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08]">
        <div className="p-6 border-b border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Artist List</h2>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search artists..."
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
          ) : artists.length > 0 ? (
            <table className="w-full">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Monthly Listeners
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {artists.map((artist) => (
                  <tr
                    key={artist.id}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
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
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          artist.isVerified
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {artist.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(artist.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
              <User className="w-12 h-12 mb-4" />
              <p>No artists found</p>
            </div>
          )}
        </div>

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
