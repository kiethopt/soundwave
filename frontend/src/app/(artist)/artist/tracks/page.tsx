'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Track, Genre } from '@/types';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Edit, Plus, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteModal } from '@/components/ui/admin-modals';
import { EditTrackModal } from '@/components/ui/artist-modals';

interface SortConfig {
  key: keyof Track | null;
  direction: 'asc' | 'desc';
}

export default function SimpleTrackManagement() {
  const router = useRouter();
  const { theme } = useTheme();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [deletingTrack, setDeletingTrack] = useState<Track | null>(null);
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [genreFilter, setGenreFilter] = useState<string>('ALL');
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'releaseDate', direction: 'desc' });
  const limit = 10;

  // Additional states for the track edit modal
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedFeaturedArtists, setSelectedFeaturedArtists] = useState<string[]>([]);
  const [availableArtists, setAvailableArtists] = useState<{ id: string; name: string }[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [availableLabels, setAvailableLabels] = useState<{ id: string; name: string }[]>([]);

  const fetchTracks = useCallback(async (page: number, search: string, status: 'ALL' | 'ACTIVE' | 'INACTIVE', genre: string, sort: SortConfig) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search) {
        params.append('search', search);
      }
      if (status !== 'ALL') {
        params.append('status', status === 'ACTIVE' ? 'true' : 'false');
      }
      if (genre !== 'ALL') {
        params.append('genres', genre);
      }
      if (sort.key) {
        params.append('sortBy', sort.key);
        params.append('sortOrder', sort.direction);
      }

      const response = await api.tracks.getTracks(token, page, limit, params.toString());
      setTracks(response.tracks || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Error fetching tracks:', err);
      setError(err.message || 'Could not load tracks');
      toast.error(err.message || 'Could not load tracks');
      setTracks([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const fetchMetadata = useCallback(async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return;
      
      // Fetch both genres and artists in parallel
      const [genresResponse, artistsResponse, labelsResponse] = await Promise.all([
        api.genres.getAll(token, 1, 1000),
        api.artists.getAllArtistsProfile(token, 1, 500),
        api.labels.getAll(token, 1, 500)
      ]);
      
      setAvailableGenres(genresResponse.genres || []);
      
      const artists = artistsResponse.artists?.map((artist: any) => ({
        id: artist.id,
        name: artist.artistName,
      })) || [];
      setAvailableArtists(artists);

      const labels = labelsResponse.labels?.map((label: any) => ({
        id: label.id,
        name: label.name,
      })) || [];
      setAvailableLabels(labels);
      
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  }, []);

  const refreshTable = useCallback(() => {
    fetchTracks(currentPage, activeSearchTerm, statusFilter, genreFilter, sortConfig);
    setSelectedTrackIds(new Set());
  }, [currentPage, activeSearchTerm, statusFilter, genreFilter, sortConfig, fetchTracks]);

  useEffect(() => {
    refreshTable();
  }, [refreshTable]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearchTerm, statusFilter, genreFilter, sortConfig]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActiveSearchTerm(searchInput);
  };

  const handleSort = (key: keyof Track | null) => {
    if (!key) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const allIds = new Set(tracks.map(t => t.id));
      setSelectedTrackIds(allIds);
    } else {
      setSelectedTrackIds(new Set());
    }
  };

  const handleSelectRow = (trackId: string, checked: boolean | 'indeterminate') => {
    setSelectedTrackIds(prev => {
      const newSet = new Set(prev);
      if (checked === true) {
        newSet.add(trackId);
      } else {
        newSet.delete(trackId);
      }
      return newSet;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAction = (action: string, track: Track) => {
    if (action === 'edit') {
      setEditingTrack(track);
      setSelectedGenres(track.genres?.map((g) => g.genre.id) || []);
      setSelectedFeaturedArtists(track.featuredArtists?.map((a) => a.artistProfile.id) || []);
      setSelectedLabelId(track.labelId || null);
      setIsEditModalOpen(true);
    } else if (action === 'delete') {
      setDeletingTrack(track);
      setIsBulkDeleteConfirm(false);
      setIsDeleteModalOpen(true);
    } else if (action === 'toggleVisibility') {
      handleTrackVisibility(track.id, track.isActive);
    }
  };

  const handleDeleteConfirm = (ids: string[]) => {
    if (ids.length === 0 && isBulkDeleteConfirm) {
      handleBulkDeleteConfirm(Array.from(selectedTrackIds));
    } else if (ids.length === 1 && !isBulkDeleteConfirm && deletingTrack) {
      handleSingleDeleteConfirm(ids[0]);
    } else {
      console.error("Inconsistent state in handleDeleteConfirm");
    }
    setIsDeleteModalOpen(false);
    setDeletingTrack(null);
    setIsBulkDeleteConfirm(false);
  };

  const handleSingleDeleteConfirm = async (trackId: string) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading(trackId);
    try {
      await api.tracks.delete(trackId, token);
      toast.success(`Successfully deleted track.`);
      refreshTable();
      setSelectedTrackIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(trackId);
        return newSet;
      });
    } catch (err: any) {
      console.error('Error deleting track:', err);
      toast.error(err.message || 'Failed to delete track.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTrackVisibility = async (trackId: string, isActive: boolean) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading(trackId);
    try {
      await api.tracks.toggleVisibility(trackId, token);
      setTracks(prev => 
        prev.map(track => 
          track.id === trackId ? { ...track, isActive: !isActive } : track
        )
      );
      toast.success(`Track ${isActive ? 'hidden' : 'made visible'} successfully`);
    } catch (err: any) {
      console.error('Error toggling track visibility:', err);
      toast.error(err.message || 'Failed to update track visibility.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditTrack = async (trackId: string, formData: FormData) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading(trackId);
    try {
      await api.tracks.update(trackId, formData, token);
      toast.success('Track updated successfully');
      refreshTable();
      setIsEditModalOpen(false);
      setEditingTrack(null);
    } catch (err: any) {
      console.error('Error updating track:', err);
      toast.error(err.message || 'Failed to update track.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedTrackIds.size === 0) {
      toast('No tracks selected.', { icon: '⚠️' });
      return;
    }
    setDeletingTrack(null);
    setIsBulkDeleteConfirm(true);
    setIsDeleteModalOpen(true);
  };

  const handleBulkDeleteConfirm = async (trackIds: string[]) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading('bulk-delete');
    try {
      await Promise.all(trackIds.map(id => api.tracks.delete(id, token)));
      toast.success(`Successfully deleted ${trackIds.length} track(s).`);
      
      let targetPage = currentPage;
      if (tracks.length === trackIds.length && currentPage > 1) {
        targetPage = currentPage - 1;
      }

      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      } else {
        refreshTable();
      }

      setSelectedTrackIds(new Set());
    } catch (err: any) {
      console.error('Error deleting tracks:', err);
      toast.error(err.message || 'Failed to delete tracks.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRowClick = (track: Track, e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[role="checkbox"]') || target.closest('button')) {
      return;
    }
    router.push(`/artist/tracks/${track.id}`);
  };

  const isAllSelected = tracks.length > 0 && selectedTrackIds.size === tracks.length;
  const isIndeterminate = selectedTrackIds.size > 0 && selectedTrackIds.size < tracks.length;

  return (
    <div className={`container mx-auto space-y-6 p-4 pb-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
           Track Management
        </h1>
        <p className={`text-muted-foreground ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
           Manage and organize your tracks
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-grow">
           <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
           <Input
             type="text"
             placeholder="Search tracks and press Enter..."
             value={searchInput}
             onChange={(e) => setSearchInput(e.target.value)}
             className={`pl-10 pr-4 py-2 w-full rounded-md border h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}
           />
           <button type="submit" className="hidden">Search</button>
        </form>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(value: 'ALL' | 'ACTIVE' | 'INACTIVE') => setStatusFilter(value)}>
            <SelectTrigger className={`w-[140px] rounded-md h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}>
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600 text-white' : ''}>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Visible</SelectItem>
              <SelectItem value="INACTIVE">Hidden</SelectItem>
            </SelectContent>
          </Select>

          <Select value={genreFilter} onValueChange={(value: string) => setGenreFilter(value)}>
            <SelectTrigger className={`w-[140px] rounded-md h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}>
              <SelectValue placeholder="Filter by Genre" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600 text-white' : ''}>
              <SelectItem value="ALL">All Genres</SelectItem>
              {availableGenres.map((genre) => (
                <SelectItem key={genre.id} value={genre.id}>{genre.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Link href="/artist/tracks/new">
            <Button 
              variant="default"
              size="default"
              className={`h-10 px-6 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Track
            </Button>
          </Link>
        </div>
      </div>

      {loading && !deletingTrack && !editingTrack && <p>Loading tracks...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!error && (
        <>
          <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className={`w-full text-sm text-left ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <thead className={`text-xs uppercase ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
                <tr>
                  <th scope="col" className="p-4 rounded-tl-md">
                     <Checkbox
                       id="select-all-checkbox"
                       checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
                       onCheckedChange={handleSelectAll}
                       aria-label="Select all rows on this page"
                       className={`${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                       disabled={loading || actionLoading !== null}
                     />
                  </th>
                  <th 
                    scope="col" 
                    className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Title
                      {sortConfig.key === 'title' ? (
                        sortConfig.direction === 'asc' ?
                          <ArrowUp className="ml-2 h-3 w-3" /> :
                          <ArrowDown className="ml-2 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="py-3 px-6">Album</th>
                  <th scope="col" className="py-3 px-6">Genres</th>
                  <th 
                    scope="col" 
                    className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                    onClick={() => handleSort('duration')}
                  >
                    <div className="flex items-center">
                      Duration
                      {sortConfig.key === 'duration' ? (
                        sortConfig.direction === 'asc' ?
                          <ArrowUp className="ml-2 h-3 w-3" /> :
                          <ArrowDown className="ml-2 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                    onClick={() => handleSort('playCount')}
                  >
                    <div className="flex items-center">
                      Plays
                      {sortConfig.key === 'playCount' ? (
                        sortConfig.direction === 'asc' ?
                          <ArrowUp className="ml-2 h-3 w-3" /> :
                          <ArrowDown className="ml-2 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                    onClick={() => handleSort('isActive')}
                  >
                    <div className="flex items-center">
                      Status
                      {sortConfig.key === 'isActive' ? (
                        sortConfig.direction === 'asc' ?
                          <ArrowUp className="ml-2 h-3 w-3" /> :
                          <ArrowDown className="ml-2 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="py-3 px-6 rounded-tr-md text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tracks.length > 0 ? (
                  tracks.map((track) => (
                    <tr
                      key={track.id}
                      onClick={(e) => handleRowClick(track, e)}
                      className={`border-b cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'} ${selectedTrackIds.has(track.id) ? (theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-50') : ''} ${actionLoading === track.id ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <td className="w-4 p-4">
                         <Checkbox
                           id={`select-row-${track.id}`}
                           checked={selectedTrackIds.has(track.id)}
                           onCheckedChange={(checked) => handleSelectRow(track.id, checked)}
                           aria-label={`Select row for track ${track.title}`}
                           className={`${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                           disabled={loading || actionLoading !== null}
                         />
                      </td>
                      <td className={`py-4 px-6 font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {track.title}
                      </td>
                      <td className="py-4 px-6">{track.album?.title || ''}</td>
                      <td className="py-4 px-6">
                        {track.genres?.map(g => g.genre.name).join(', ')}
                      </td>
                      <td className="py-4 px-6">{formatDuration(track.duration)}</td>
                      <td className="py-4 px-6">{track.playCount.toLocaleString()}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${track.isActive
                            ? (theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
                            : (theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800')
                          }`}>
                          {track.isActive ? 'Visible' : 'Hidden'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                         <div className="flex items-center justify-center gap-1">
                           {/* <Button
                             variant="ghost"
                             size="icon"
                             className={`text-red-600 hover:bg-red-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                             onClick={(e) => { e.stopPropagation(); handleAction('delete', track); }}
                             aria-label={`Delete track ${track.title}`}
                             disabled={loading || actionLoading !== null}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button> */}
                           <Button
                             variant="ghost"
                             size="icon"
                             className={`text-blue-600 hover:bg-blue-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-blue-500/20' : 'hover:bg-blue-100'}`}
                             onClick={(e) => { e.stopPropagation(); handleAction('edit', track); }}
                             aria-label={`Edit track ${track.title}`}
                             disabled={loading || actionLoading !== null}
                           >
                             <Edit className="h-4 w-4" />
                           </Button>
                         </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-4 px-6 text-center">No tracks found {activeSearchTerm || statusFilter !== 'ALL' || genreFilter !== 'ALL' ? 'matching your criteria' : ''}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="min-w-[200px]">
              {selectedTrackIds.size > 0 && (
                <Button
                  onClick={handleBulkDeleteClick}
                  variant="destructive"
                  size="default"
                  disabled={loading || actionLoading !== null}
                  className={`${theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : ''}`}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedTrackIds.size})
                </Button>
              )}
            </div>
            <div className="flex justify-end">
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading || actionLoading !== null}
                    variant="outline"
                    size="sm">
                    Previous
                  </Button>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading || actionLoading !== null}
                    variant="outline"
                    size="sm">
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmDeleteModal
        item={isBulkDeleteConfirm ? null : (deletingTrack ? { id: deletingTrack.id, name: deletingTrack.title, email: '' } : null)}
        count={isBulkDeleteConfirm ? selectedTrackIds.size : undefined}
        isOpen={isDeleteModalOpen}
        onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingTrack(null);
            setIsBulkDeleteConfirm(false);
        }}
        onConfirm={handleDeleteConfirm}
        theme={theme}
        entityType="track"
      />

      <EditTrackModal
        track={editingTrack}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTrack(null);
        }}
        onSubmit={handleEditTrack}
        theme={theme}
        availableGenres={availableGenres}
        availableLabels={availableLabels}
        availableArtists={availableArtists}
      />
    </div>
  );
}
