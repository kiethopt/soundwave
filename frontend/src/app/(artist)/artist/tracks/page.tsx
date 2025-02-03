'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Track } from '@/types';
import { api } from '@/utils/api';
import {
  Search,
  Music,
  AddSimple,
  Play,
  Pause,
  Eye,
  EyeOff,
  Trash2,
  Edit,
} from '@/components/ui/Icons';
import Link from 'next/link';
import AudioPlayer from '@/components/ui/AudioPlayer';
import { toast } from 'react-toastify';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ArtistTracks() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [playingTrack, setPlayingTrack] = useState<Track | null>(null);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [trackToEdit, setTrackToEdit] = useState<Track | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch tracks data
  const fetchTracks = useCallback(async (query = '') => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('userToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = query
        ? await api.tracks.search(query, token)
        : await api.tracks.getAll(token, 1, 100);
      setTracks(query ? response : response.tracks);
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tracks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchTracks(searchInput);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchInput, fetchTracks]);

  const handlePlayPause = async (track: Track) => {
    if (playingTrack?.id === track.id) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(track);
      try {
        const token = localStorage.getItem('userToken');
        if (token) {
          await api.tracks.play(track.id, token);
        }
      } catch (err) {
        console.error('Error playing track:', err);
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const toggleTrackVisibility = async (trackId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.tracks.toggleVisibility(trackId, token);

      setTracks(
        tracks.map((track) =>
          track.id === trackId ? { ...track, isActive: !track.isActive } : track
        )
      );

      toast.success(response.message);
    } catch (err) {
      console.error('Error toggling track visibility:', err);
      toast.error('Failed to update track visibility');
    }
  };

  const deleteTrack = async (trackId: string) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.tracks.delete(trackId, token);
      setTracks(tracks.filter((track) => track.id !== trackId));
      toast.success('Track deleted successfully');
      setTrackToDelete(null);
    } catch (err) {
      console.error('Error deleting track:', err);
      toast.error('Failed to delete track');
    }
  };

  const handleEditTrack = (track: Track) => {
    setTrackToEdit(track);
    setShowEditModal(true);
  };

  const handleUpdateTrack = async (updatedTrack: Track) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const formData = new FormData();
      formData.append('title', updatedTrack.title);
      formData.append('releaseDate', updatedTrack.releaseDate);
      formData.append('type', updatedTrack.type);

      const response = await api.tracks.update(
        updatedTrack.id,
        formData,
        token
      );
      setTracks(
        tracks.map((track) =>
          track.id === updatedTrack.id ? response.track : track
        )
      );
      toast.success('Track updated successfully');
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating track:', err);
      toast.error('Failed to update track');
    }
  };

  return (
    <div className="container mx-auto space-y-8" suppressHydrationWarning>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Track Management
          </h1>
          <p className="text-white/60 mt-2">Upload and manage your tracks</p>
        </div>
        <Link
          href="/artist/tracks/new"
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-white/90"
        >
          <AddSimple className="w-4 h-4" />
          New Track
        </Link>
      </div>

      <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08]">
        <div className="p-6 border-b border-white/[0.08]">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search tracks..."
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
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : tracks.length > 0 ? (
            <table className="w-full">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Album
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                    Plays
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
                {tracks.map((track) => (
                  <tr
                    key={track.id}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => handlePlayPause(track)}
                          className="mr-3 text-white/60 hover:text-white transition-colors"
                        >
                          {playingTrack?.id === track.id ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5" />
                          )}
                        </button>
                        {track.coverUrl ? (
                          <img
                            src={track.coverUrl || '/placeholder.svg'}
                            alt={track.title}
                            className="w-10 h-10 rounded-md mr-3 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md mr-3 bg-white/[0.03] flex items-center justify-center">
                            <Music className="w-6 h-6 text-white/60" />
                          </div>
                        )}
                        <span className="font-medium">{track.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {track.album?.title || 'Single'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDuration(track.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {track.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {track.playCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          track.isActive
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                        }`}
                      >
                        {track.isActive ? (
                          <Eye className="w-3 h-3 mr-1" />
                        ) : (
                          <EyeOff className="w-3 h-3 mr-1" />
                        )}
                        {track.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="hover:bg-white/10 p-2 rounded-full">
                          <MoreVertical className="w-5 h-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#282828] border border-white/10 text-white">
                          <DropdownMenuItem
                            onClick={() => toggleTrackVisibility(track.id)}
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
                          <DropdownMenuItem
                            onClick={() => handleEditTrack(track)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Track
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={() => setTrackToDelete(track)}
                            className="text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Track
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-white/60">
              <Music className="w-12 h-12 mb-4" />
              <p>No tracks found</p>
            </div>
          )}
        </div>
      </div>

      {/* Audio Player */}
      {playingTrack && (
        <AudioPlayer
          src={playingTrack.audioUrl}
          isPlaying={true}
          onEnded={() => setPlayingTrack(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {trackToDelete && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-[#404045]/50 flex items-center justify-center z-[9999] !m-0">
          <div className="bg-[#121212] p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Delete Track</h3>
            <p className="text-white/60 mb-6">
              Are you sure you want to delete "{trackToDelete.title}"? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setTrackToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTrack(trackToDelete.id)}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Track Modal */}
      {showEditModal && trackToEdit && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-[#404045]/50 flex items-center justify-center z-[9999] !m-0">
          <div className="bg-[#121212] p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Edit Track</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateTrack(trackToEdit);
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-white/60 mb-1"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={trackToEdit.title}
                  onChange={(e) =>
                    setTrackToEdit({ ...trackToEdit, title: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-white/60 mb-1"
                >
                  Type
                </label>
                <select
                  id="type"
                  value={trackToEdit.type}
                  disabled
                  className="w-full px-3 py-2 bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20 cursor-not-allowed opacity-50"
                >
                  <option value={trackToEdit.type}>{trackToEdit.type}</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="releaseDate"
                  className="block text-sm font-medium text-white/60 mb-1"
                >
                  Release Date
                </label>
                <input
                  type="date"
                  id="releaseDate"
                  value={trackToEdit.releaseDate.split('T')[0]}
                  onChange={(e) =>
                    setTrackToEdit({
                      ...trackToEdit,
                      releaseDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-white/[0.07] border border-white/[0.1] rounded-md focus:outline-none focus:ring-2 focus:ring-white/20"
                  required
                />
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
  );
}
