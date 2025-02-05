'use client';

import { Album, ArtistProfile, Track } from '@/types';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Music, Disc } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useParams } from 'next/navigation';
import { useDominantColor } from '@/hooks/useDominantColor';
import { Verified } from '@/components/ui/Icons';

const TrackList = ({
  tracks,
  albumId,
  albumCoverUrl,
}: {
  tracks: Track[];
  albumId: string;
  albumCoverUrl?: string;
}) => {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-black/20 rounded-xl overflow-hidden border border-white/10 backdrop-blur-sm">
      {/* Header - Desktop only */}
      <div className="hidden md:block px-6 py-4 border-b border-white/10">
        <div className="grid grid-cols-[48px_4fr_2fr_100px] gap-4 text-sm text-white/60">
          <div className="text-center">#</div>
          <div>Title</div>
          <div>Artists</div>
          <div className="text-right">Duration</div>
        </div>
      </div>

      <div className="divide-y divide-white/10">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="md:grid md:grid-cols-[48px_4fr_2fr_100px] md:gap-4 px-4 md:px-6 py-3 md:py-4 hover:bg-white/5 transition-colors"
          >
            {/* Track number */}
            <div className="hidden md:flex items-center justify-center text-white/60">
              {track.trackNumber}
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden flex items-center justify-between gap-2">
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium text-sm line-clamp-1">
                  {track.title}
                </span>
                <div className="text-xs text-white/60 line-clamp-1">
                  {track.artist.artistName}
                  {track.featuredArtists?.length > 0 && (
                    <span className="text-white/40">
                      {' '}
                      • feat.{' '}
                      {track.featuredArtists
                        .map(({ artistProfile }) => artistProfile.artistName)
                        .join(', ')}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-sm text-white/60 whitespace-nowrap pl-3">
                {formatDuration(track.duration)}
              </span>
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex items-center min-w-0">
              <span className="font-medium line-clamp-1">{track.title}</span>
            </div>

            <div className="hidden md:flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/artists/${track.artist.id}`}
                  className="text-white/90 hover:underline hover:text-white line-clamp-1"
                >
                  {track.artist.artistName}
                </Link>
              </div>
              {track.featuredArtists?.length > 0 && (
                <div className="text-sm text-white/60 line-clamp-1">
                  feat.{' '}
                  {track.featuredArtists
                    .map(({ artistProfile }) => artistProfile.artistName)
                    .join(', ')}
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center justify-end">
              {formatDuration(track.duration)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AlbumDetailPage() {
  const { id, albumId } = useParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const { dominantColor } = useDominantColor(album?.coverUrl);
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
        const verifiedArtists = response.artists.filter(
          (artist: ArtistProfile) =>
            artist.isVerified && artist.role === 'ARTIST'
        );
        setArtists(verifiedArtists);
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

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
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
      const existingTrackCount = album?.tracks?.length || 0;

      files.forEach((file, index) => {
        if (!newTrackDetails[file.name]) {
          newTrackDetails[file.name] = {
            title: file.name.replace(/\.[^/.]+$/, ''),
            artist: album?.artist.id || '',
            featuredArtists: [],
            trackNumber: existingTrackCount + index + 1,
            releaseDate:
              album?.releaseDate || new Date().toISOString().split('T')[0],
          };
        }
      });
      setTrackDetails(newTrackDetails);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 text-red-500 rounded-lg">
        Error: {error}
      </div>
    );
  }

  if (!album) {
    return <div className="text-white/80 p-6">Album not found</div>;
  }

  return (
    <div
      className="rounded-lg"
      style={{
        background: dominantColor
          ? `linear-gradient(180deg, 
            ${dominantColor} 0%, 
            ${dominantColor}99 15%,
            ${dominantColor}40 30%,
            #121212 100%)`
          : 'linear-gradient(180deg, #2c2c2c 0%, #121212 100%)',
      }}
    >
      <div className="max-w-8xl mx-auto px-4 md:px-6 py-6 mb-16 md:mb-0">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/admin/artists/${id}`}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span>Back to Albums</span>
          </Link>
        </div>

        {/* Main Container */}
        <div className="flex flex-col items-center md:items-start md:flex-row gap-8">
          {/* Album Cover - Centered on mobile, left on desktop */}
          {album.coverUrl && (
            <div className="w-[280px] md:w-[220px] flex-shrink-0">
              <img
                src={album.coverUrl}
                alt={album.title}
                className="w-full aspect-square object-cover rounded-xl shadow-2xl"
              />
            </div>
          )}

          {/* Album Info - Left aligned text */}
          <div className="w-full flex flex-col gap-4">
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {album.title}
              </h1>

              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <Link
                  href={`/admin/artists/${album.artist.id}`}
                  className="flex items-center gap-2 hover:underline"
                >
                  <span className="text-white/90 text-lg">
                    {album.artist.artistName}
                  </span>
                  {album.artist.isVerified && <Verified className="w-5 h-5" />}
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-base text-white/60">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>
                    {new Date(album.releaseDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Music className="w-5 h-5" />
                  <span>{album.totalTracks || 0} tracks</span>
                </div>
              </div>

              {album.genres?.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-center md:justify-start mt-4">
                  {album.genres.map(({ genre }) => (
                    <span
                      key={genre.id}
                      className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/80"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Track List */}
        {album.tracks?.length > 0 && (
          <div className="mb-12 mt-6">
            <TrackList
              tracks={album.tracks}
              albumId={album.id}
              albumCoverUrl={album.coverUrl}
            />
          </div>
        )}

        {/*
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-white mb-6">
            Upload New Tracks
          </h2>
          <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
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
              existingTrackCount={album.tracks?.length || 0}
            />
          </div>
        </div>
        */}

        {message.text && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              message.type === 'error'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-green-500/10 text-green-400'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
