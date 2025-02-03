'use client';

import type { Album, ArtistProfile, Track, TrackEditForm } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useParams } from 'next/navigation';
import TrackUploadForm from '@/components/admin/TrackUploadForm';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Calendar,
  Music,
  MoreVertical,
  Eye,
  EyeOff,
  Verified,
} from '@/components/ui/Icons';
import { useDominantColor } from '@/hooks/useDominantColor';

export default function AlbumDetailPage() {
  const { albumId } = useParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [newTracks, setNewTracks] = useState<File[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTrackMenu, setActiveTrackMenu] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    releaseDate: '',
    type: '',
    coverFile: null as File | null,
  });
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
  const [showEditTrackDialog, setShowEditTrackDialog] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [trackEditForm, setTrackEditForm] = useState<TrackEditForm>({
    title: '',
    releaseDate: '',
    trackNumber: 0,
    featuredArtists: [],
  });
  const { dominantColor } = useDominantColor(album?.coverUrl);

  useEffect(() => {
    if (albumId) {
      fetchAlbumDetails();
    }
  }, [albumId]);

  useEffect(() => {
    if (album) {
      setEditForm({
        title: album.title,
        releaseDate: new Date(album.releaseDate).toISOString().split('T')[0],
        type: album.type,
        coverFile: null,
      });
    }
  }, [album]);

  // Đóng track menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        activeTrackMenu &&
        !(event.target as Element).closest('.track-menu-button') &&
        !(event.target as Element).closest('.track-menu')
      ) {
        setActiveTrackMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeTrackMenu]);

  const fetchAlbumDetails = useCallback(async () => {
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      formData.append('title', editForm.title);
      formData.append('releaseDate', editForm.releaseDate);
      formData.append('type', editForm.type);
      if (editForm.coverFile) {
        formData.append('coverFile', editForm.coverFile);
      }

      await api.albums.update(albumId as string, formData, token);
      await fetchAlbumDetails();
      setShowEditDialog(false);
      toast.success('Album updated successfully');
    } catch (err) {
      console.error('Error updating album:', err);
      toast.error('Failed to update album');
    }
  };

  const handleEditTrack = async (track: Track) => {
    setEditingTrack(track);
    setTrackEditForm({
      title: track.title,
      releaseDate: new Date(track.releaseDate).toISOString().split('T')[0],
      trackNumber: track.trackNumber,
      featuredArtists: track.featuredArtists.map(
        ({ artistProfile }) => artistProfile.id
      ),
    });
    setShowEditTrackDialog(true);
    setActiveTrackMenu(null);
  };

  const handleEditTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrack || !album) return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      formData.append('title', trackEditForm.title);
      formData.append('releaseDate', trackEditForm.releaseDate);
      formData.append('trackNumber', trackEditForm.trackNumber.toString());
      if (trackEditForm.featuredArtists.length > 0) {
        formData.append(
          'featuredArtists',
          trackEditForm.featuredArtists.join(',')
        );
      }

      // Optimistic update với kiểu dữ liệu hợp lệ
      const updatedTracks = album.tracks.map((t) => {
        if (t.id === editingTrack.id) {
          return {
            ...t,
            title: trackEditForm.title,
            releaseDate: trackEditForm.releaseDate,
            trackNumber: trackEditForm.trackNumber,
            featuredArtists: trackEditForm.featuredArtists.map((artistId) => ({
              artistProfile: {
                id: artistId,
                artistName:
                  artists.find((a) => a.id === artistId)?.artistName || '',
                avatar: artists.find((a) => a.id === artistId)?.avatar || null,
                isVerified:
                  artists.find((a) => a.id === artistId)?.isVerified || false,
              },
            })),
          };
        }
        return t;
      });

      setAlbum({ ...album, tracks: updatedTracks });

      await api.tracks.update(editingTrack.id, formData, token);
      setShowEditTrackDialog(false);
      toast.success('Track updated successfully');
    } catch (err) {
      // Revert on error
      await fetchAlbumDetails();
      console.error('Error updating track:', err);
      toast.error('Failed to update track');
    }
  };

  const handleToggleTrackVisibility = async (track: Track) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      // Optimistic update
      setAlbum((prevAlbum) => {
        if (!prevAlbum) return null;
        return {
          ...prevAlbum,
          tracks: prevAlbum.tracks.map((t) =>
            t.id === track.id ? { ...t, isActive: !t.isActive } : t
          ),
        };
      });

      await api.tracks.toggleVisibility(track.id, token);
      toast.success(
        `Track ${track.isActive ? 'hidden' : 'shown'} successfully`
      );
    } catch (error) {
      setAlbum((prevAlbum) => {
        if (!prevAlbum) return null;
        return {
          ...prevAlbum,
          tracks: prevAlbum.tracks.map((t) =>
            t.id === track.id ? { ...t, isActive: !t.isActive } : t
          ),
        };
      });
      console.error('Error toggling track visibility:', error);
      toast.error('Failed to toggle track visibility');
    }
    setActiveTrackMenu(null);
  };

  const handleDeleteTrack = async (track: Track) => {
    if (!window.confirm('Are you sure you want to delete this track?')) return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      // Optimistic update
      setAlbum((prevAlbum) => {
        if (!prevAlbum) return null;
        return {
          ...prevAlbum,
          tracks: prevAlbum.tracks.filter((t) => t.id !== track.id),
          totalTracks: prevAlbum.totalTracks - 1,
        };
      });

      await api.tracks.delete(track.id, token);
      toast.success('Track deleted successfully');
    } catch (error) {
      await fetchAlbumDetails();
      console.error('Error deleting track:', error);
      toast.error('Failed to delete track');
    }
    setActiveTrackMenu(null);
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
      let errorMessage = 'Failed to upload tracks';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as any;
        if (errorObj.response?.data?.message) {
          errorMessage = errorObj.response.data.message;
        }
      }

      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-500/10 text-red-500 rounded">
        Error: {error}
      </div>
    );
  }

  // Not found state
  if (!album) {
    return <div>Album not found</div>;
  }

  return (
    <div
      className="min-h-screen rounded-lg"
      style={{
        background: dominantColor
          ? `linear-gradient(180deg, ${dominantColor} 0%, ${dominantColor}99 15%, ${dominantColor}40 30%, #121212 100%)`
          : 'linear-gradient(180deg, #2c2c2c 0%, #121212 100%)',
      }}
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* Header section */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/artist/albums"
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span>Back to Albums</span>
          </Link>
          <button
            onClick={() => setShowEditDialog(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Album info section */}
        <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
          {album.coverUrl && (
            <img
              src={album.coverUrl || '/placeholder.svg'}
              alt={album.title}
              className="w-48 h-48 object-cover rounded-lg shadow-xl"
            />
          )}
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-4">{album.title}</h1>
            <div className="flex flex-col gap-2 text-white/60">
              <div className="flex items-center gap-2">
                <p className="text-xl text-white">{album.artist.artistName}</p>
                {/* Sử dụng icon Verified thay vì dấu ✓ */}
                {album.artist.isVerified && <Verified className="w-5 h-5" />}
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(album.releaseDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4" />
                  {album.totalTracks || 0} tracks
                </div>
              </div>
              {album.genres && album.genres.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {album.genres.map(({ genre }) => (
                    <span
                      key={genre.id}
                      className="px-2 py-1 bg-white/10 rounded-full text-sm"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tracks section */}
        {album.tracks && album.tracks.length > 0 && (
          <div className="mb-12">
            {/* <h2 className="text-xl font-semibold mb-4">Tracks</h2> */}
            <div className="w-full bg-black/20 rounded-lg overflow-visible">
              <div className="px-6 py-4 border-b border-white/10">
                <div className="grid grid-cols-[16px_4fr_2fr_minmax(120px,1fr)_100px_48px] gap-4 text-sm text-white/60">
                  <div className="text-center">#</div>
                  <div>Title</div>
                  <div>Artists</div>
                  <div className="text-left">Duration</div>
                  <div className="text-center">Status</div>
                  <div></div>
                </div>
              </div>
              <div className="divide-y divide-white/10">
                {album.tracks.map((track) => (
                  <div
                    key={track.id}
                    className="grid grid-cols-[16px_4fr_2fr_minmax(120px,1fr)_100px_48px] gap-4 items-center px-6 py-4 hover:bg-white/5 transition-colors group relative"
                  >
                    <div className="text-center">{track.trackNumber}</div>
                    <div className="flex items-center gap-3">
                      {track.coverUrl || album.coverUrl ? (
                        <img
                          src={track.coverUrl || album.coverUrl}
                          alt={track.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-white/10 rounded"></div>
                      )}
                      <span>{track.title}</span>
                    </div>
                    <div>
                      <div>{track.artist.artistName}</div>
                      {track.featuredArtists &&
                        track.featuredArtists.length > 0 && (
                          <div className="text-sm text-white/60">
                            feat.{' '}
                            {track.featuredArtists
                              .map(
                                ({ artistProfile }) => artistProfile.artistName
                              )
                              .join(', ')}
                          </div>
                        )}
                    </div>
                    <div className="text-left">
                      {Math.floor(track.duration / 60)}:
                      {(track.duration % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          track.isActive
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {track.isActive ? (
                          <Eye className="w-3 h-3 mr-1" />
                        ) : (
                          <EyeOff className="w-3 h-3 mr-1" />
                        )}
                        {track.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTrackMenu((prev) =>
                            prev === track.id ? null : track.id
                          );
                        }}
                        className="track-menu-button p-2 hover:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeTrackMenu === track.id && (
                        <div
                          className="track-menu absolute w-48 bg-[#282828] rounded-md shadow-lg z-[100] border border-white/10"
                          style={{
                            right: '100%',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            marginRight: '0.5rem',
                          }}
                        >
                          <div className="py-1">
                            <button
                              onClick={() => handleEditTrack(track)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors"
                            >
                              Edit Track
                            </button>
                            <button
                              onClick={() => handleToggleTrackVisibility(track)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors"
                            >
                              {track.isActive ? 'Hide Track' : 'Show Track'}
                            </button>
                            <button
                              onClick={() => handleDeleteTrack(track)}
                              className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-white/10 transition-colors"
                            >
                              Delete Track
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upload section */}
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
              existingTrackCount={album?.tracks?.length || 0}
            />
          </div>
        </div>

        {/* Message display */}
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

        {/* Edit Album Dialog */}
        {showEditDialog && (
          <div className="fixed inset-0 bg-[#404045]/50 flex items-center justify-center z-50">
            <div className="bg-[#121212] p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Edit Album</h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Release Date
                  </label>
                  <input
                    type="date"
                    value={editForm.releaseDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, releaseDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <div className="relative">
                    <select
                      value={editForm.type}
                      onChange={(e) =>
                        setEditForm({ ...editForm, type: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-[#1a1a1a] text-white border border-white/10 rounded-md appearance-none pr-8 focus:outline-none focus:border-white/30"
                      required
                    >
                      <option value="">Select type</option>
                      <option value="ALBUM">Album</option>
                      <option value="EP">EP</option>
                      <option value="SINGLE">Single</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Cover Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        coverFile: e.target.files?.[0] || null,
                      })
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md"
                  />
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditDialog(false)}
                    className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium bg-white text-black rounded-md hover:bg-white/90"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Track Dialog */}
        {showEditTrackDialog && editingTrack && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#121212] p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Edit Track</h3>
              <form onSubmit={handleEditTrackSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={trackEditForm.title}
                    onChange={(e) =>
                      setTrackEditForm({
                        ...trackEditForm,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Release Date
                  </label>
                  <input
                    type="date"
                    value={trackEditForm.releaseDate}
                    onChange={(e) =>
                      setTrackEditForm({
                        ...trackEditForm,
                        releaseDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Track Number
                  </label>
                  <input
                    type="number"
                    value={trackEditForm.trackNumber}
                    onChange={(e) =>
                      setTrackEditForm({
                        ...trackEditForm,
                        trackNumber: Number.parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md"
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Featured Artists
                  </label>
                  <select
                    multiple
                    value={trackEditForm.featuredArtists}
                    onChange={(e) => {
                      const selectedArtists = Array.from(
                        e.target.selectedOptions,
                        (option) => option.value
                      );
                      setTrackEditForm({
                        ...trackEditForm,
                        featuredArtists: selectedArtists,
                      });
                    }}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md"
                  >
                    {artists.map((artist) => (
                      <option key={artist.id} value={artist.id}>
                        {artist.artistName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditTrackDialog(false)}
                    className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium bg-white text-black rounded-md hover:bg-white/90"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
