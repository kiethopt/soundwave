'use client';

import type { Album, ArtistProfile, Track, TrackEditForm, Genre } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { useParams, useRouter } from 'next/navigation';
import TrackUploadForm from '@/components/admin/TrackUploadForm';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Music,
  MoreVertical,
  Eye,
  EyeOff,
  Verified,
  Edit,
  Trash2,
} from '@/components/ui/Icons';
import { useDominantColor } from '@/hooks/useDominantColor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';
import io, { Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

export default function AlbumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const extractedAlbumId = params?.albumId
    ? Array.isArray(params.albumId)
      ? params.albumId[0]
      : params.albumId
    : null;
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
      genres: string[];
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
    genres: [],
  });
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [trackGenreError, setTrackGenreError] = useState<string | null>(null);
  const { dominantColor } = useDominantColor(album?.coverUrl);
  const { theme } = useTheme();

  useEffect(() => {
    if (extractedAlbumId) {
      fetchAlbumDetails();
    } else {
      setError('Album ID not found in URL');
      setIsLoading(false);
    }
  }, [extractedAlbumId]);

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
    if (!extractedAlbumId) {
      setError('Album ID is missing, cannot fetch details.');
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('userToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const data = await api.albums.getById(extractedAlbumId, token);
      setAlbum(data);
    } catch (err) {
      console.error('Error fetching album:', err);
      setError(err instanceof Error ? err.message : 'Failed to load album');
    } finally {
      setIsLoading(false);
    }
  }, [extractedAlbumId]);

  useEffect(() => {
    const fetchArtistsAndGenres = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        // Fetch Artists
        const artistResponse = await api.artists.getAllArtistsProfile(token, 1, 100);
        const verifiedArtists = artistResponse.artists.filter(
          (artist: ArtistProfile) =>
            artist.isVerified && artist.role === 'ARTIST'
        );
        setArtists(verifiedArtists);

        // Fetch Genres
        const genreResponse = await api.genres.getAll(token);
        console.log('API Genre Response:', genreResponse);
        setAvailableGenres(genreResponse?.genres || []);

      } catch (err) {
        console.error('Error fetching artists or genres:', err);
      }
    };

    fetchArtistsAndGenres();
  }, []);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');
      if (!extractedAlbumId) throw new Error('Album ID is missing');

      const formData = new FormData();
      formData.append('title', editForm.title);
      formData.append('releaseDate', editForm.releaseDate);
      formData.append('type', editForm.type);
      if (editForm.coverFile) {
        formData.append('coverFile', editForm.coverFile);
      }

      await api.albums.update(extractedAlbumId, formData, token);
      await fetchAlbumDetails();
      setShowEditDialog(false);
      toast.success('Album updated successfully');
    } catch (err) {
      console.error('Error updating album:', err);
      toast.error('Failed to update album');
    }
  };

  const handleEditTrack = async (track: Track) => {
    console.log("Editing Track Object:", JSON.stringify(track, null, 2));
    setEditingTrack(track);
    setTrackEditForm({
      title: track.title,
      releaseDate: new Date(track.releaseDate).toISOString().split('T')[0],
      trackNumber: track.trackNumber,
      featuredArtists: track.featuredArtists.map(
        ({ artistProfile }) => artistProfile.id
      ),
      genres: track.genres?.map(({ genre }) => genre.id) ?? [],
    });
    setShowEditTrackDialog(true);
    setActiveTrackMenu(null);
  };

  const handleEditTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrack || !album) return;

    // Genre validation
    if (!trackEditForm.genres || trackEditForm.genres.length === 0) {
      setTrackGenreError("This field is required");
      return; // Stop submission
    } else {
      setTrackGenreError(null);
    }

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
        formData.append('updateFeaturedArtists', 'true');
      }

      if (trackEditForm.genres && trackEditForm.genres.length > 0) {
        formData.append('genreIds', trackEditForm.genres.join(','));
        formData.append('updateGenres', 'true');
      }

      // Optimistic update with kiểu dữ liệu hợp lệ
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
            genres: trackEditForm.genres.map((genreId) => ({
              genre: {
                id: genreId,
                name: availableGenres.find((g) => g.id === genreId)?.name || '',
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
      if (!extractedAlbumId) {
        setError('Album ID is missing, cannot upload tracks.');
        setIsUploading(false);
        return;
      }

      const formData = new FormData();

      newTracks.forEach((file, index) => {
        const details = trackDetails[file.name];
        if (!details) throw new Error('Missing track details');

        formData.append('tracks', file);
        formData.append(`title`, details.title);
        formData.append(
          'releaseDate',
          album?.releaseDate || new Date().toISOString().split('T')[0]
        );
        formData.append(`trackNumber`, details.trackNumber.toString());
        if (details.featuredArtists && details.featuredArtists.length > 0) {
          formData.append(`featuredArtists`, details.featuredArtists.join(','));
        }
        if (details.genres && details.genres.length > 0) {
          formData.append(`genres`, details.genres.join(','));
        }
      });

      // Log the genres being sent for each track
      console.log('FormData - genres being sent:', formData.getAll('genres'));

      const response = await api.albums.uploadTracks(
        extractedAlbumId,
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
            genres: [],
          };
        }
      });
      setTrackDetails(newTrackDetails);
    }
  };

  // WebSocket listener for album updates
  // useEffect(() => {
  //   if (!extractedAlbumId) return; // Don't connect if albumId is not available

  //   let socket: Socket | null = null;
  //   const connectTimer = setTimeout(() => {
  //       socket = io(process.env.NEXT_PUBLIC_API_URL!);

  //       console.log(`[WebSocket] Connecting for Artist Album Detail: ${extractedAlbumId}`);

  //       socket.on('connect', () => {
  //           console.log(`[WebSocket] Connected for Artist Album Detail: ${extractedAlbumId}`);
  //       });
  //       socket.on('disconnect', (reason: string) => {
  //           console.log(`[WebSocket] Disconnected from Artist Album Detail ${extractedAlbumId}:`, reason);
  //       });
  //       socket.on('connect_error', (error: Error) => {
  //           console.error(`[WebSocket] Connection Error for Artist Album Detail ${extractedAlbumId}:`, error);
  //       });

  //       // Update album data
  //       socket.on('album:updated', (data: { album: Album }) => {
  //           if (data.album.id === extractedAlbumId) {
  //               console.log(`[WebSocket] Artist Album ${extractedAlbumId} updated:`, data.album);
  //               // Merge new data with existing data, especially preserving tracks if not included in update
  //               setAlbum((prevAlbum) => (prevAlbum ? { ...prevAlbum, ...data.album } : data.album));
  //               setError(null);
  //           }
  //       });

  //       // Handle album deletion
  //       socket.on('album:deleted', (data: { albumId: string }) => {
  //           if (data.albumId === extractedAlbumId) {
  //               console.log(`[WebSocket] Artist Album ${extractedAlbumId} deleted`);
  //               setAlbum(null);
  //               setError('This album has been deleted.');
  //           }
  //       });

  //       // Handle visibility change (Artist can still see inactive albums)
  //       socket.on('album:visibilityChanged', (data: { albumId: string; isActive: boolean }) => {
  //           if (data.albumId === extractedAlbumId) {
  //               console.log(`[WebSocket] Artist Album ${extractedAlbumId} visibility changed to ${data.isActive}`);
  //               setAlbum((prevAlbum) => prevAlbum ? { ...prevAlbum, isActive: data.isActive } : prevAlbum);
  //               setError(null); // Clear error in case it was previously set by other means
  //           }
  //       });

  //        // ---- Track Event Handling within Album Detail ----
  //       // Update track within the album's track list
  //       socket.on('track:updated', (data: { track: Track }) => {
  //           if (data.track.albumId === extractedAlbumId) {
  //               console.log(`[WebSocket] Track ${data.track.id} in Artist Album ${extractedAlbumId} updated:`, data.track);
  //               setAlbum(prevAlbum => {
  //                   if (!prevAlbum) return null;
  //                   const updatedTracks = prevAlbum.tracks.map(t => 
  //                       t.id === data.track.id ? { ...t, ...data.track } : t
  //                   );
  //                   return { ...prevAlbum, tracks: updatedTracks };
  //               });
  //           }
  //       });

  //       // Remove track from the album's track list
  //       socket.on('track:deleted', (data: { trackId: string }) => {
  //           setAlbum(prevAlbum => {
  //               if (!prevAlbum) return null;
  //               const trackExists = prevAlbum.tracks.some(t => t.id === data.trackId);
  //               if (trackExists) {
  //                   console.log(`[WebSocket] Track ${data.trackId} deleted from Artist Album ${extractedAlbumId}`);
  //                   const updatedTracks = prevAlbum.tracks.filter(t => t.id !== data.trackId);
  //                    // Recalculate duration/totalTracks if necessary
  //                    const totalDuration = updatedTracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  //                    const totalTracks = updatedTracks.length;
  //                    return { ...prevAlbum, tracks: updatedTracks, duration: totalDuration, totalTracks: totalTracks };
  //               }
  //               return prevAlbum;
  //           });
  //       });

  //       // Update track visibility within the album's track list
  //       socket.on('track:visibilityChanged', (data: { trackId: string, isActive: boolean }) => {
  //            setAlbum(prevAlbum => {
  //               if (!prevAlbum) return null;
  //               const trackIndex = prevAlbum.tracks.findIndex(t => t.id === data.trackId);
  //               if (trackIndex !== -1) {
  //                   console.log(`[WebSocket] Track ${data.trackId} visibility changed to ${data.isActive} in Artist Album ${extractedAlbumId}`);
  //                   const updatedTracks = prevAlbum.tracks.map(t => 
  //                       t.id === data.trackId ? { ...t, isActive: data.isActive } : t
  //                   );
  //                   return { ...prevAlbum, tracks: updatedTracks };
  //               }
  //               return prevAlbum;
  //           });
  //       });
  //   }, process.env.NODE_ENV === 'development' ? 100 : 0); // Add delay

  //   // Cleanup
  //   return () => {
  //       clearTimeout(connectTimer);
  //       if (socket) {
  //           console.log(`[WebSocket] Disconnecting from Artist Album Detail ${extractedAlbumId}...`);
  //           socket.off('connect');
  //           socket.off('disconnect');
  //           socket.off('connect_error');
  //           socket.off('album:updated');
  //           socket.off('album:deleted');
  //           socket.off('album:visibilityChanged');
  //           socket.off('track:updated');
  //           socket.off('track:deleted');
  //           socket.off('track:visibilityChanged');
  //           socket.disconnect();
  //       }
  //   };
  // }, [extractedAlbumId, setAlbum]); // setAlbum is needed for track updates

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
      className="rounded-lg"
      style={{
        background: dominantColor
          ? `linear-gradient(180deg, 
            ${dominantColor} 0%, 
            ${dominantColor}99 15%,
            ${dominantColor}40 30%,
            ${theme === 'light' ? '#ffffff' : '#121212'} 100%)`
          : theme === 'light'
          ? 'linear-gradient(180deg, #f3f4f6 0%, #ffffff 100%)'
          : 'linear-gradient(180deg, #2c2c2c 0%, #121212 100%)',
      }}
    >
      <div className="max-w-8xl mx-auto px-4 md:px-6 py-6 mb-16 md:mb-0">
        {/* Header with Back button and Edit button */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="default"
            onClick={() => router.back()}
            className="mb-4 -ml-4 text-white focus-visible:ring-white/50 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: dominantColor || (theme === 'dark' ? '#374151' : '#6b7280') }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <button
            onClick={() => setShowEditDialog(true)}
            className={`p-2 rounded-full transition-colors ${
              theme === 'light' ? 'hover:bg-gray-200' : 'hover:bg-white/10'
            }`}
          >
            <MoreVertical
              className={`w-5 h-5 ${
                theme === 'light' ? 'text-gray-700' : 'text-white'
              }`}
            />
          </button>
        </div>

        {/* Main Container */}
        <div className="flex flex-col items-center md:items-start md:flex-row gap-8">
          {/* Album Cover */}
          {album.coverUrl && (
            <div className="w-[280px] md:w-[220px] flex-shrink-0">
              <img
                src={album.coverUrl}
                alt={album.title}
                className="w-full aspect-square object-cover rounded-xl shadow-2xl"
              />
            </div>
          )}

          {/* Album Info */}
          <div className="w-full flex flex-col gap-4">
            <div className="text-center md:text-left">
              <h1
                className={`text-3xl md:text-4xl font-bold mb-2 ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}
              >
                {album.title}
              </h1>

              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <span
                  className={
                    theme === 'light' ? 'text-gray-900' : 'text-white/90'
                  }
                >
                  {album.artist.artistName}
                </span>
                {album.artist.isVerified && <Verified className="w-5 h-5" />}
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-base">
                <div
                  className={`flex items-center gap-2 ${
                    theme === 'light' ? 'text-gray-600' : 'text-white/60'
                  }`}
                >
                  <Calendar className="w-5 h-5" />
                  <span>
                    {new Date(album.releaseDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    theme === 'light' ? 'text-gray-600' : 'text-white/60'
                  }`}
                >
                  <Music className="w-5 h-5" />
                  <span>{album.totalTracks || 0} tracks</span>
                </div>
              </div>

              {album.genres?.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-center md:justify-start mt-4">
                  {album.genres.map(({ genre }) => (
                    <span
                      key={genre.id}
                      className={`px-3 py-1 rounded-full text-sm ${
                        theme === 'light'
                          ? 'bg-gray-200 text-gray-800'
                          : 'bg-white/10 text-white/80'
                      }`}
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
          <div className="mt-6">
            <div
              className={`w-full rounded-xl overflow-hidden border backdrop-blur-sm ${
                theme === 'light'
                  ? 'bg-white/80 border-gray-200'
                  : 'bg-black/20 border-white/10'
              }`}
            >
              {/* Header - Desktop only */}
              <div
                className={`hidden md:block px-6 py-4 border-b ${
                  theme === 'light' ? 'border-gray-200' : 'border-white/10'
                }`}
              >
                <div
                  className={`grid grid-cols-[48px_4fr_2fr_100px_48px] gap-4 text-sm ${
                    theme === 'light' ? 'text-gray-500' : 'text-white/60'
                  }`}
                >
                  <div className="text-center">#</div>
                  <div>Title</div>
                  <div>Artists</div>
                  <div className="text-right">Duration</div>
                  <div></div>
                </div>
              </div>

              <div
                className={`divide-y ${
                  theme === 'light' ? 'divide-gray-200' : 'divide-white/10'
                }`}
              >
                {album.tracks.map((track) => (
                  <div key={track.id}>
                    {/* Desktop Layout */}
                    <div
                      className={`hidden md:grid grid-cols-[48px_4fr_2fr_100px_48px] gap-4 px-6 py-4 group ${
                        theme === 'light'
                          ? 'hover:bg-gray-50'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center ${
                          theme === 'light' ? 'text-gray-500' : 'text-white/60'
                        }`}
                      >
                        {track.trackNumber}
                      </div>
                      <div className="flex items-center min-w-0">
                        <span
                          className={`font-medium truncate ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </span>
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <div
                          className={`truncate ${
                            theme === 'light' ? 'text-gray-900' : 'text-white'
                          }`}
                        >
                          {track.artist.artistName}
                        </div>
                        {track.featuredArtists?.length > 0 && (
                          <div
                            className={`text-sm truncate ${
                              theme === 'light'
                                ? 'text-gray-500'
                                : 'text-white/60'
                            }`}
                          >
                            feat.{' '}
                            {track.featuredArtists
                              .map(
                                ({ artistProfile }) => artistProfile.artistName
                              )
                              .join(', ')}
                          </div>
                        )}
                      </div>
                      <div
                        className={`flex items-center justify-end ${
                          theme === 'light' ? 'text-gray-500' : 'text-white/60'
                        }`}
                      >
                        {Math.floor(track.duration / 60)}:
                        {(track.duration % 60).toString().padStart(2, '0')}
                      </div>
                      <div className="flex items-center justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className={`opacity-0 group-hover:opacity-100 p-2 rounded-full transition-all ${
                              theme === 'light'
                                ? 'hover:bg-gray-200'
                                : 'hover:bg-white/10'
                            }`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className={
                              theme === 'light'
                                ? 'bg-white border border-gray-200'
                                : 'bg-[#282828] border border-white/10'
                            }
                          >
                            <DropdownMenuItem
                              onClick={() => handleEditTrack(track)}
                              className={
                                theme === 'light'
                                  ? 'text-gray-700'
                                  : 'text-white'
                              }
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Track
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleTrackVisibility(track)}
                              className={
                                theme === 'light'
                                  ? 'text-gray-700'
                                  : 'text-white'
                              }
                            >
                              {track.isActive ? (
                                <>
                                  <EyeOff className="w-4 h-4 mr-2" />
                                  Hide Track
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Show Track
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator
                              className={
                                theme === 'light'
                                  ? 'bg-gray-200'
                                  : 'bg-white/10'
                              }
                            />
                            <DropdownMenuItem
                              onClick={() => handleDeleteTrack(track)}
                              className="text-red-500"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Track
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div
                      className={`md:hidden p-4 ${
                        theme === 'light'
                          ? 'hover:bg-gray-50'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={
                            theme === 'light'
                              ? 'text-gray-500'
                              : 'text-white/60'
                          }
                        >
                          {track.trackNumber}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`font-medium truncate ${
                              theme === 'light' ? 'text-gray-900' : 'text-white'
                            }`}
                          >
                            {track.title}
                          </div>
                          <div
                            className={`text-sm truncate ${
                              theme === 'light'
                                ? 'text-gray-500'
                                : 'text-white/60'
                            }`}
                          >
                            {track.artist.artistName}
                            {track.featuredArtists?.length > 0 && (
                              <span
                                className={
                                  theme === 'light'
                                    ? 'text-gray-400'
                                    : 'text-white/40'
                                }
                              >
                                {' '}
                                • feat.{' '}
                                {track.featuredArtists
                                  .map(
                                    ({ artistProfile }) =>
                                      artistProfile.artistName
                                  )
                                  .join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm ${
                              theme === 'light'
                                ? 'text-gray-500'
                                : 'text-white/60'
                            }`}
                          >
                            {Math.floor(track.duration / 60)}:
                            {(track.duration % 60).toString().padStart(2, '0')}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className={`p-2 rounded-full ${
                                theme === 'light'
                                  ? 'hover:bg-gray-200'
                                  : 'hover:bg-white/10'
                              }`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              className={
                                theme === 'light'
                                  ? 'bg-white border border-gray-200'
                                  : 'bg-[#282828] border border-white/10'
                              }
                            >
                              <DropdownMenuItem
                                onClick={() => handleEditTrack(track)}
                                className={
                                  theme === 'light'
                                    ? 'text-gray-700'
                                    : 'text-white'
                                }
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Track
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleToggleTrackVisibility(track)
                                }
                                className={
                                  theme === 'light'
                                    ? 'text-gray-700'
                                    : 'text-white'
                                }
                              >
                                {track.isActive ? (
                                  <>
                                    <EyeOff className="w-4 h-4 mr-2" />
                                    Hide Track
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Show Track
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator
                                className={
                                  theme === 'light'
                                    ? 'bg-gray-200'
                                    : 'bg-white/10'
                                }
                              />
                              <DropdownMenuItem
                                onClick={() => handleDeleteTrack(track)}
                                className="text-red-500"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Track
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upload New Tracks Section */}
        <div className="mt-12">
          <h2
            className={`text-xl font-semibold mb-6 ${
              theme === 'light' ? 'text-gray-900' : 'text-white'
            }`}
          >
            Upload New Tracks
          </h2>
          <div
            className={`rounded-xl p-6 backdrop-blur-sm border ${
              theme === 'light'
                ? 'bg-white border-gray-200'
                : 'bg-white/5 border-white/10'
            }`}
          >
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
              availableGenres={availableGenres}
              existingTrackCount={album.tracks?.length || 0}
            />
          </div>
        </div>

        {/* Message display */}
        {message.text && (
          <div
            className={`mt-4 p-4 rounded-lg ${
              message.type === 'error'
                ? 'bg-red-50 text-red-500 border border-red-200'
                : 'bg-green-50 text-green-500 border border-green-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Edit Album Dialog */}
        {showEditDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
              className={`max-w-md w-full p-6 rounded-lg ${
                theme === 'light' ? 'bg-white' : 'bg-[#121212]'
              }`}
            >
              <h3
                className={`text-xl font-bold mb-4 ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}
              >
                Edit Album
              </h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'light' ? 'text-gray-700' : 'text-white/60'
                    }`}
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                        : 'bg-white/5 border-white/10 focus:ring-white/20'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'light' ? 'text-gray-700' : 'text-white/60'
                    }`}
                  >
                    Release Date
                  </label>
                  <input
                    type="date"
                    value={editForm.releaseDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, releaseDate: e.target.value })
                    }
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                        : 'bg-white/5 border-white/10 focus:ring-white/20'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'light' ? 'text-gray-700' : 'text-white/60'
                    }`}
                  >
                    Type
                  </label>
                  <div className="relative">
                    <select
                      value={editForm.type}
                      onChange={(e) =>
                        setEditForm({ ...editForm, type: e.target.value })
                      }
                      className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 appearance-none ${
                        theme === 'light'
                          ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500/20'
                          : 'bg-white/5 border-white/10 text-white focus:ring-white/20'
                      }`}
                      required
                    >
                      <option value="">Select type</option>
                      <option value="ALBUM">Album</option>
                      <option value="EP">EP</option>
                      <option value="SINGLE">Single</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg
                        className={`w-4 h-4 ${
                          theme === 'light' ? 'text-gray-400' : 'text-white/60'
                        }`}
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
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'light' ? 'text-gray-700' : 'text-white/60'
                    }`}
                  >
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
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-700 focus:ring-blue-500/20'
                        : 'bg-white/5 border-white/10 text-white focus:ring-white/20'
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditDialog(false)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg ${
                      theme === 'light'
                        ? 'text-gray-600 hover:text-gray-900'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      theme === 'light'
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'bg-white text-black hover:bg-white/90'
                    }`}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
              className={`max-w-md w-full p-6 rounded-lg ${
                theme === 'light' ? 'bg-white' : 'bg-[#121212]'
              }`}
            >
              <h3
                className={`text-xl font-bold mb-4 ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}
              >
                Edit Track
              </h3>
              <form onSubmit={handleEditTrackSubmit} className="space-y-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'light' ? 'text-gray-700' : 'text-white/60'
                    }`}
                  >
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
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                        : 'bg-white/5 border-white/10 focus:ring-white/20'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'light' ? 'text-gray-700' : 'text-white/60'
                    }`}
                  >
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
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                        : 'bg-white/5 border-white/10 focus:ring-white/20'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'light' ? 'text-gray-700' : 'text-white/60'
                    }`}
                  >
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
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 focus:ring-blue-500/20'
                        : 'bg-white/5 border-white/10 focus:ring-white/20'
                    }`}
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'light' ? 'text-gray-700' : 'text-white/60'
                    }`}
                  >
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
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500/20'
                        : 'bg-white/5 border-white/10 text-white focus:ring-white/20'
                    }`}
                  >
                    {artists.map((artist) => (
                      <option key={artist.id} value={artist.id}>
                        {artist.artistName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Genres Select */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-1 ${
                      theme === 'light' ? 'text-gray-700' : 'text-white/60'
                    }`}
                  >
                    Genres *
                  </label>
                  {/* Wrap SearchableSelect for error styling */}
                  <div
                    className={trackGenreError ? "rounded-md border border-red-500" : ""}
                  >
                    <SearchableSelect
                      options={availableGenres.map((g) => ({ id: g.id, name: g.name }))}
                      value={trackEditForm.genres}
                      onChange={(value: string[]) =>
                        setTrackEditForm({
                          ...trackEditForm,
                          genres: value,
                        })
                      }
                      placeholder="Select genres..."
                      multiple={true}
                    />
                  </div>
                  {/* Display error message */}
                  {trackGenreError && (
                    <p className="text-sm text-red-500 mt-1">{trackGenreError}</p>
                  )}
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditTrackDialog(false)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg ${
                      theme === 'light'
                        ? 'text-gray-600 hover:text-gray-900'
                        : 'text-white/60 hover:text-white'
                    }`}
                  > 
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      theme === 'light'
                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                        : 'bg-white text-black hover:bg-white/90'
                    }`}
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
