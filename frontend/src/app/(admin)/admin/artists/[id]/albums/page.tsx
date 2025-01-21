'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Album } from '@/types';
import { api } from '@/utils/api';
import { Search, Music, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function AdminAlbums() {
  const { id } = useParams();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');

  // Fetch albums data
  const fetchAlbums = useCallback(
    async (query: string = '') => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('userToken');
        if (!token) throw new Error('No authentication token found');

        let response;
        if (query) {
          const data = await api.albums.search(query, token);
          response = data.filter((a: Album) => a.artistId === id);
        } else {
          response = await api.artists.getAlbums(id as string, token);
        }

        setAlbums(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch albums');
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAlbums(searchInput);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {albums[0]?.artist.artistName}'s Albums
          </h1>
          <p className="text-white/60 mt-2">Manage artist's discography</p>
        </div>
        <Link
          href={`/admin/artists/${id}/albums/new`}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-white/90"
        >
          <Plus className="w-4 h-4" />
          New Album
        </Link>
      </div>

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08]">
        <div className="p-6 border-b border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Album List</h2>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search albums..."
                value={searchInput}
                onChange={handleSearchInputChange}
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
          ) : albums.length > 0 ? (
            <table className="w-full">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Artist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Release Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Tracks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08]">
                {albums.map((album) => (
                  <tr
                    key={album.id}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {album.coverUrl ? (
                          <img
                            src={album.coverUrl}
                            alt={album.title}
                            className="w-10 h-10 rounded-md mr-3 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md mr-3 bg-white/[0.03] flex items-center justify-center">
                            <Music className="w-6 h-6 text-white/60" />
                          </div>
                        )}
                        <Link
                          href={`/admin/artists/${id}/albums/${album.id}`}
                          className="font-medium hover:underline"
                        >
                          {album.title}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {album.artist.artistName}
                      {album.artist.isVerified && (
                        <span className="ml-1 text-blue-500">✓</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(album.releaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {album.trackCount || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
              <Music className="w-12 h-12 mb-4" />
              <p>No albums found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
