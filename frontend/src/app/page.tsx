'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/utils/api';
import { Album, Track, Playlist } from '@/types';
import { useTrack } from '@/contexts/TrackContext';

export default function Home() {
  const router = useRouter();
  const [newestAlbums, setNewestAlbums] = useState<Album[]>([]);
  const [hotAlbums, setHotAlbums] = useState<Album[]>([]);
  const [recommendedPlaylist, setRecommendedPlaylist] =
    useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const { playTrack } = useTrack();

  const token = localStorage.getItem('userToken') || '';

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchHomeData = async () => {
      try {
        setLoading(true);

        const [newestAlbumsRes, hotAlbumsRes, recommendedPlaylistRes] =
          await Promise.all([
            api.albums.getNewestAlbums(token),
            api.albums.getHotAlbums(token),
            api.playlists.getGlobalRecommendedPlaylist(token),
          ]);

        setNewestAlbums(newestAlbumsRes.albums || []);
        setHotAlbums(hotAlbumsRes.albums || []);
        setRecommendedPlaylist(recommendedPlaylistRes.playlist || null);
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [token, router]);

  const handlePlayTrack = (track: Track) => {
    playTrack(track);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-6 py-6">
      {/* Header Section */}
      <h1 className="text-4xl font-bold mb-6">New</h1>
      {/* Separator */}
      <div className="h-px bg-white/20 w-full mb-6"></div>

      {/* Featured Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {/* Card 1: Updated Playlist */}
        {recommendedPlaylist && (
          <div
            className="cursor-pointer"
            onClick={() => router.push(`/playlist/${recommendedPlaylist.id}`)}
          >
            <div className="mb-3">
              <div className="uppercase text-xs font-medium text-muted-foreground mb-1.5">
                UPDATED PLAYLIST
              </div>
              <h3 className="text-lg font-bold line-clamp-1 mb-1">
                {recommendedPlaylist.name}
              </h3>
              <p className="text-sm text-muted-foreground">Soundwave</p>
            </div>
            <div className="editorial-card">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                <Image
                  src={
                    recommendedPlaylist.coverUrl ||
                    '/images/default-playlist.png'
                  }
                  alt={recommendedPlaylist.name}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        )}

        {/* Card 2: New Album */}
        {newestAlbums.length > 0 && (
          <div
            className="cursor-pointer"
            onClick={() => router.push(`/album/${newestAlbums[0].id}`)}
          >
            <div className="mb-3">
              <div className="uppercase text-xs font-medium text-muted-foreground mb-1.5">
                NEW ALBUM
              </div>
              <h3 className="text-lg font-bold line-clamp-1 mb-1">
                {newestAlbums[0].title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {newestAlbums[0].artist.artistName}
              </p>
            </div>
            <div className="editorial-card">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                <Image
                  src={newestAlbums[0].coverUrl || '/images/default-album.png'}
                  alt={newestAlbums[0].title}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        )}

        {/* Card 3: Featured Album/Set List */}
        {hotAlbums.length > 0 && (
          <div
            className="cursor-pointer"
            onClick={() => router.push(`/album/${hotAlbums[0].id}`)}
          >
            <div className="mb-3">
              <div className="uppercase text-xs font-medium text-muted-foreground mb-1.5">
                TELL THEM HOW THE CROWDS WENT WILD
              </div>
              <h3 className="text-lg font-bold line-clamp-1 mb-1">
                {hotAlbums[0].title}
              </h3>
              <p className="text-sm text-muted-foreground">Soundwave</p>
            </div>
            <div className="editorial-card">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                <Image
                  src={hotAlbums[0].coverUrl || '/images/default-album.png'}
                  alt={hotAlbums[0].title}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Releases Section */}
      <div className="space-y-5 mb-12">
        <h2 className="text-2xl font-bold">New Releases</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {newestAlbums.slice(1, 9).map((album) => (
            <div
              key={album.id}
              className="cursor-pointer"
              onClick={() => router.push(`/album/${album.id}`)}
            >
              <div className="flex flex-col space-y-1.5">
                <div className="relative aspect-square overflow-hidden rounded">
                  <Image
                    src={album.coverUrl || '/images/default-album.png'}
                    alt={album.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium line-clamp-1">
                    {album.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {album.artist.artistName}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Hits Section */}
      {recommendedPlaylist && recommendedPlaylist.tracks && (
        <div className="space-y-5 mb-12">
          <h2 className="text-2xl font-bold">Top Hits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recommendedPlaylist.tracks.slice(0, 6).map((track) => (
              <div
                key={track.id}
                className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent/20 cursor-pointer transition-colors"
                onClick={() => handlePlayTrack(track)}
              >
                <div className="relative w-10 h-10 flex-shrink-0">
                  <Image
                    src={track.coverUrl || '/images/default-track.png'}
                    alt={track.title}
                    fill
                    className="rounded object-cover"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-medium line-clamp-1">
                    {track.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {track.artist.artistName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Albums Section */}
      <div className="space-y-5">
        <h2 className="text-2xl font-bold">Trending Now</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {hotAlbums.slice(1, 9).map((album) => (
            <div
              key={album.id}
              className="cursor-pointer"
              onClick={() => router.push(`/album/${album.id}`)}
            >
              <div className="flex flex-col space-y-1.5">
                <div className="relative aspect-square overflow-hidden rounded">
                  <Image
                    src={album.coverUrl || '/images/default-album.png'}
                    alt={album.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium line-clamp-1">
                    {album.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {album.artist.artistName}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
