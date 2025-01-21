'use client';

import { Album, ArtistProfile } from '@/types';
import { useEffect, useState } from 'react';
import TrackUploadForm from '@/components/admin/TrackUploadForm';
import TrackList from '@/components/admin/TrackList';
import { ArrowLeftIcon, Calendar, Music } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useParams } from 'next/navigation';

export default function AlbumDetailPage() {
  const { id, albumId } = useParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [newTracks, setNewTracks] = useState<File[]>([]);
  const [trackDetails, setTrackDetails] = useState<{
    [key: string]: {
      title: string;
      artist: string;
      featuredArtists: string[];
      trackNumber: number;
      releaseDate: string;
    };
  }>({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (albumId) {
      fetchAlbumDetails();
    }
  }, [albumId]);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const response = await api.artists.getAllArtistsProfile(token, 1, 100);
        setArtists(response.artists);
      } catch (err) {
        console.error('Error fetching artists:', err);
      }
    };

    fetchArtists();
  }, []);

  const fetchAlbumDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('userToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const data = await api.albums.getById(albumId as string, token);
      setAlbum(data);
    } catch (err) {
      console.error('Error fetching album:', err);
      setError(err instanceof Error ? err.message : 'Failed to load album');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();

      newTracks.forEach((file, index) => {
        const details = trackDetails[file.name];
        if (!details) throw new Error('Missing track details');

        formData.append('tracks', file);
        formData.append(`title`, details.title);
        formData.append(`releaseDate`, details.releaseDate);
        formData.append(`trackNumber`, details.trackNumber.toString());
        if (details.featuredArtists && details.featuredArtists.length > 0) {
          formData.append(`featuredArtists`, details.featuredArtists.join(','));
        }
      });

      const response = await api.albums.uploadTracks(
        albumId as string,
        formData,
        token
      );

      setMessage({ type: 'success', text: response.message });
      setNewTracks([]);
      setTrackDetails({});
      fetchAlbumDetails();
    } catch (err) {
      console.error('Upload error:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to upload tracks',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewTracks((prevTracks) => [...prevTracks, ...files]);

      const newTrackDetails = { ...trackDetails };
      files.forEach((file) => {
        if (!newTrackDetails[file.name]) {
          newTrackDetails[file.name] = {
            title: file.name.replace(/\.[^/.]+$/, ''),
            artist: album?.artistId || '',
            featuredArtists: [],
            trackNumber: (album?.tracks?.length || 0) + newTracks.length + 1,
            releaseDate:
              album?.releaseDate || new Date().toISOString().split('T')[0],
          };
        }
      });
      setTrackDetails(newTrackDetails);
    }
  };

  const getArtistName = (artist: ArtistProfile): string => {
    return artist.artistName || '';
  };

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 text-red-500 rounded">
        Error: {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!album) {
    return <div>Album not found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-800 to-neutral-950 rounded-lg">
      <div className="max-w-7xl mx-auto p-10">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/admin/artists/${id}/albums`}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to Albums</span>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
          {album.coverUrl && (
            <img
              src={album.coverUrl}
              alt={album.title}
              className="w-48 h-48 object-cover rounded-lg shadow-xl"
            />
          )}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-4">{album.title}</h1>
            <div className="flex flex-col gap-2 text-white/60">
              <p className="text-xl text-white">
                {getArtistName(album.artist)}
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(album.releaseDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  {album.tracks?.length || 0} tracks
                </div>
              </div>
            </div>
          </div>
        </div>

        {album.tracks && album.tracks.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Tracks</h2>
            <TrackList
              tracks={album.tracks}
              albumId={album.id}
              albumCoverUrl={album.coverUrl}
            />
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6">Upload New Tracks</h2>
          <div className="bg-white/5 rounded-md p-6 backdrop-blur-sm">
            <TrackUploadForm
              album={album}
              newTracks={newTracks}
              trackDetails={trackDetails}
              isUploading={isUploading}
              onFileChange={onFileChange}
              onSubmit={handleUpload}
              onTrackDetailChange={(fileName, field, value) => {
                setTrackDetails((prev) => ({
                  ...prev,
                  [fileName]: {
                    ...prev[fileName],
                    [field]: value,
                  },
                }));
              }}
              artists={artists}
            />
          </div>
        </div>

        {message.text && (
          <div
            className={`mt-4 p-4 rounded-md ${
              message.type === 'error'
                ? 'bg-red-500/10 text-red-500'
                : 'bg-green-500/10 text-green-500'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
