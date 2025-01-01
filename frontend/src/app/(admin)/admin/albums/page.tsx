'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '@/utils/config';
import { Album } from '@/types';
import Link from 'next/link';

export default function AdminAlbums() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [newAlbum, setNewAlbum] = useState({
    title: '',
    artist: '',
    releaseDate: '',
    coverFile: null as File | null,
  });

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/albums`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setAlbums(data);
    } catch (error) {
      console.error('Error fetching albums:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('userToken');
      const formData = new FormData();

      // Đảm bảo dữ liệu được append đúng
      formData.append('title', newAlbum.title);
      formData.append('artist', newAlbum.artist);
      formData.append('releaseDate', newAlbum.releaseDate);

      // Kiểm tra và append cover file
      if (newAlbum.coverFile) {
        formData.append('cover', newAlbum.coverFile);
      }

      const response = await fetch(`${API_URL}/api/albums`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create album');
      }

      const data = await response.json();
      console.log('Album created:', data);

      // Reset form
      setNewAlbum({
        title: '',
        artist: '',
        releaseDate: '',
        coverFile: null,
      });

      // Refresh album list
      fetchAlbums();
    } catch (error: any) {
      console.error('Error creating album:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create album';
      alert(errorMessage);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Create New Album</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={newAlbum.title}
            onChange={(e) =>
              setNewAlbum({ ...newAlbum, title: e.target.value })
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Artist</label>
          <input
            type="text"
            value={newAlbum.artist}
            onChange={(e) =>
              setNewAlbum({ ...newAlbum, artist: e.target.value })
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Release Date</label>
          <input
            type="date"
            value={newAlbum.releaseDate}
            onChange={(e) =>
              setNewAlbum({ ...newAlbum, releaseDate: e.target.value })
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cover Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setNewAlbum({
                ...newAlbum,
                coverFile: e.target.files?.[0] || null,
              })
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 bg-white text-black rounded-md hover:bg-white/90"
        >
          Create Album
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-4">Albums List</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {albums.map((album) => (
          <div key={album.id} className="p-4 bg-white/5 rounded-lg">
            <Link href={`/admin/albums/${album.id}`}>
              {album.coverUrl && (
                <img
                  src={album.coverUrl}
                  alt={album.title}
                  className="w-full aspect-square object-cover rounded-md mb-2"
                />
              )}
              <h3 className="font-medium">{album.title}</h3>
              <p className="text-sm text-white/70">{album.artist}</p>
              <p className="text-sm text-white/50">
                {new Date(album.releaseDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-white/50">{album.trackCount} tracks</p>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
