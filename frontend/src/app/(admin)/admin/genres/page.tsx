'use client';

import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { Edit, Search, Spinner, Trash2 } from '@/components/ui/Icons';
import { toast } from 'react-toastify';
import { Button } from '@/components/layout/Button/Button';

export default function AdminGenres() {
  const [genres, setGenres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingGenre, setEditingGenre] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const limit = 10;

  const fetchGenres = async (page: number, query: string = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.admin.getAllGenres(token, page, limit);
      setGenres(response.genres);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch genres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenres(page, searchInput);
  }, [page, searchInput]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchGenres(1, searchInput);
  };

  const handleDeleteGenre = async (genreId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.admin.deleteGenre(genreId, token);
      toast.success('Genre deleted successfully');
      fetchGenres(page, searchInput);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete genre'
      );
    }
  };

  const handleEditGenre = (genre: { id: string; name: string }) => {
    setEditingGenre(genre);
  };

  const handleSaveEdit = async () => {
    if (!editingGenre) return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.admin.updateGenre(
        editingGenre.id,
        { name: editingGenre.name },
        token
      );
      toast.success('Genre updated successfully');
      setEditingGenre(null);
      fetchGenres(page, searchInput);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update genre'
      );
    }
  };

  return (
    <div className="container mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Genre Management
          </h1>
          <p className="text-white/60 mt-2">View and manage music genres</p>
        </div>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            placeholder="Search genres..."
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
                  Name
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
                          <div className="h-4 bg-white/10 rounded w-32 animate-pulse" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="h-4 bg-white/10 rounded w-24 animate-pulse" />
                        </td>
                      </tr>
                    ))
                : genres.map((genre) => (
                    <tr key={genre.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {genre.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(genre.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditGenre(genre)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGenre(genre.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!loading && genres.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
              <p>No genres found</p>
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

      {/* Edit Genre Popup */}
      {editingGenre && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#121212] p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Genre</h2>
            <input
              type="text"
              value={editingGenre.name}
              onChange={(e) =>
                setEditingGenre({ ...editingGenre, name: e.target.value })
              }
              className="w-full p-2 bg-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="ghost" onClick={() => setEditingGenre(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
