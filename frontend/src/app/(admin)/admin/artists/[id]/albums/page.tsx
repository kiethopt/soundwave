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
          const { albums } = await api.albums.search(query, token); // Lấy data từ response
          response = albums.filter((a: Album) => a.artist.id === id);
        } else {
          // Sửa tên phương thức API
          response = await api.artists.getAlbums(id as string, token);
        }

        console.log('Albums data:', response);
        setAlbums(response);
      } catch (err) {
        // ... giữ nguyên
      }
    },
    [id]
  );

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchAlbums(searchInput);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Albums</h1>
        <Link
          href={`/admin/artists/${id}/albums/create`}
          className="flex items-center gap-2 bg-primary px-4 py-2 rounded-lg hover:bg-primary/90"
        >
          <Plus size={20} />
          <span>Create Album</span>
        </Link>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search albums..."
            className="w-full pl-10 pr-4 py-2 bg-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {albums.map((album) => (
          <Link
            key={album.id}
            href={`/admin/artists/${id}/albums/${album.id}`}
            className="bg-black/20 rounded-lg overflow-hidden hover:bg-black/30 transition"
          >
            <div className="aspect-square relative">
              {album.coverUrl ? (
                <img
                  src={album.coverUrl}
                  alt={album.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black/40">
                  <Music size={48} className="text-gray-500" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold mb-1">{album.title}</h3>
              <div className="text-sm text-gray-400">
                <p>{new Date(album.releaseDate).getFullYear()}</p>
                <p>{album.totalTracks} tracks</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
