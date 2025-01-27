'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Album } from '@/types';
import { api } from '@/utils/api';
import {
  Search,
  Music,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from '@/components/ui/Icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export default function ArtistAlbums() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);

  // Kiểm tra quyền truy cập
  useEffect(() => {
    const checkAccess = () => {
      const userData = localStorage.getItem('userData');
      if (!userData) {
        router.push('/login');
        return;
      }

      const user = JSON.parse(userData);
      if (!user.artistProfile?.isVerified) {
        toast.error('You need a verified artist profile to access this page');
        router.push('/');
        return;
      }

      // Kiểm tra currentProfile
      if (user.currentProfile !== 'ARTIST') {
        toast.error('Please switch to artist profile to access this page');
        router.push('/');
        return;
      }
    };

    checkAccess();
  }, [router]);

  // Fetch albums data
  const fetchAlbums = useCallback(async (query = '') => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('userToken');
      const userData = localStorage.getItem('userData');

      if (!token || !userData) {
        throw new Error('Authentication required');
      }

      const user = JSON.parse(userData);
      const artistId = user.artistProfile?.id;

      if (!artistId) {
        throw new Error('Artist profile not found');
      }

      // Sử dụng API search nếu có query, ngược lại lấy tất cả albums
      const data = query
        ? await api.albums.search(query, token)
        : await api.artists.getAlbums(artistId, token);
      setAlbums(data);
    } catch (err) {
      console.error('Error fetching albums:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch albums');
    } finally {
      setLoading(false);
    }
  }, []);

  // Thêm useEffect để theo dõi searchInput
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchAlbums(searchInput);
    }, 300); // Đợi 300ms sau khi người dùng ngừng gõ

    return () => clearTimeout(debounceTimer);
  }, [searchInput, fetchAlbums]);

  const toggleAlbumVisibility = async (albumId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.albums.toggleVisibility(albumId, token);

      // Cập nhật state albums sau khi toggle
      setAlbums(
        albums.map((album) =>
          album.id === albumId ? { ...album, isActive: !album.isActive } : album
        )
      );

      toast.success(response.message);
    } catch (err) {
      console.error('Error toggling album visibility:', err);
      toast.error('Failed to update album visibility');
    }
  };

  const deleteAlbum = async (albumId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.albums.delete(albumId, token);
      setAlbums(albums.filter((album) => album.id !== albumId));
      toast.success('Album deleted successfully');
      setAlbumToDelete(null);
    } catch (err) {
      console.error('Error deleting album:', err);
      toast.error('Failed to delete album');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Album Management
          </h1>
          <p className="text-white/60 mt-2">
            Create and manage your music albums
          </p>
        </div>
        <Link
          href="/artist/albums/new"
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-white/90"
        >
          <Plus className="w-4 h-4" />
          New Album
        </Link>
      </div>

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08]">
        <div className="p-6 border-b border-white/[0.08]">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search albums..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : albums.length > 0 ? (
            <div className="min-w-full overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/[0.03]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider hidden md:table-cell">
                      Release Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider hidden sm:table-cell">
                      Total Tracks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider hidden sm:table-cell">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.08]">
                  {albums.map((album) => (
                    <tr
                      key={album.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {album.coverUrl ? (
                            <img
                              src={album.coverUrl || '/placeholder.svg'}
                              alt={album.title}
                              className="w-10 h-10 rounded-md mr-3 object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md mr-3 bg-white/[0.03] flex items-center justify-center">
                              <Music className="w-6 h-6 text-white/60" />
                            </div>
                          )}
                          <Link
                            href={`/artist/albums/${album.id}`}
                            className="font-medium hover:underline"
                          >
                            {album.title}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        {new Date(album.releaseDate).toLocaleDateString(
                          'en-GB'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        {album.totalTracks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        {album.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            album.isActive
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-yellow-500/10 text-yellow-500'
                          }`}
                        >
                          {album.isActive ? (
                            <Eye className="w-3 h-3 mr-1" />
                          ) : (
                            <EyeOff className="w-3 h-3 mr-1" />
                          )}
                          {album.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleAlbumVisibility(album.id)}
                            className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                            title={album.isActive ? 'Hide Album' : 'Show Album'}
                          >
                            {album.isActive ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setAlbumToDelete(album)}
                            className="p-1.5 hover:bg-white/10 rounded-full text-red-500 transition-colors"
                            title="Delete Album"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
              <Music className="w-12 h-12 mb-4" />
              <p>No albums found</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {albumToDelete && (
        <div className="fixed inset-0 bg-[#404045]/50 flex items-center justify-center z-50">
          <div className="bg-[#121212] p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Delete Album</h3>
            <p className="text-white/60 mb-6">
              Are you sure you want to delete "{albumToDelete.title}"? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setAlbumToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAlbum(albumToDelete.id)}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
