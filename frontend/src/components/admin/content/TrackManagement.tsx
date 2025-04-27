'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Search, Edit, CheckCircle, XCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { Track } from '@/types';
import { TrackDetailModal, EditTrackModal, ConfirmDeleteModal } from '@/components/ui/admin-modals';

interface TrackManagementProps {
  theme: 'light' | 'dark';
}

interface SortConfig {
  key: keyof Track | null;
  direction: 'asc' | 'desc';
}

export const TrackManagement: React.FC<TrackManagementProps> = ({ theme }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [trackToEdit, setTrackToEdit] = useState<Track | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);
  const [tracksToDeleteCount, setTracksToDeleteCount] = useState<number | null>(null);
  const limit = 10;

  const fetchTracks = useCallback(async (page: number, search: string, sort: SortConfig) => {
    setLoading(true);
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
      if (sort.key) {
        params.append('sortBy', sort.key);
        params.append('sortOrder', sort.direction);
      }

      const response = await api.tracks.getTracks(token, page, limit, params.toString());
      setTracks(response.tracks || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Error fetching tracks:', err);
      toast.error(err.message || 'Could not load tracks');
      setTracks([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTracks(currentPage, activeSearchTerm, sortConfig);
  }, [fetchTracks, currentPage, activeSearchTerm, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearchTerm, sortConfig]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

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

  const handleDeleteTrackClick = (track: Track) => {
    setTrackToDelete(track);
    setTracksToDeleteCount(null); // Indicate single delete
    setIsDeleteModalOpen(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedTrackIds.size === 0) {
      toast('No tracks selected.', { icon: '⚠️' });
      return;
    }
    setTrackToDelete(null); // Indicate bulk delete
    setTracksToDeleteCount(selectedTrackIds.size);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (idsToDelete: string[]) => {
    const isBulk = tracksToDeleteCount !== null && tracksToDeleteCount > 0;
    const actionId = isBulk ? 'bulk-delete' : idsToDelete[0];
    setActionLoading(actionId);

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const deletePromises = idsToDelete.map(id => api.tracks.delete(id, token));
      await Promise.all(deletePromises);

      toast.success(`Successfully deleted ${idsToDelete.length} track(s)`);
      fetchTracks(currentPage, activeSearchTerm, sortConfig); // Refresh list
      setSelectedTrackIds(prev => {
        const newSet = new Set(prev);
        idsToDelete.forEach(id => newSet.delete(id));
        return newSet;
      });
      setIsDeleteModalOpen(false);
      setTrackToDelete(null);
      setTracksToDeleteCount(null);
    } catch (err: any) {
      console.error('Error deleting track(s):', err);
      toast.error(err.message || 'Failed to delete track(s)');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVisibility = async (trackId: string, currentIsActive: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(trackId);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      await api.tracks.toggleVisibility(trackId, token);
      
      setTracks(tracks.map(track => 
        track.id === trackId 
          ? { ...track, isActive: !currentIsActive } 
          : track
      ));
      
      toast.success(`Track ${currentIsActive ? 'hidden' : 'activated'} successfully`);
    } catch (err: any) {
      console.error('Error toggling track visibility:', err);
      toast.error(err.message || 'Failed to update track visibility');
    } finally {
      setActionLoading(null);
    }
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

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isAllSelected = tracks.length > 0 && selectedTrackIds.size === tracks.length;
  const isIndeterminate = selectedTrackIds.size > 0 && selectedTrackIds.size < tracks.length;

  const handleViewTrackDetails = (track: Track) => {
    setSelectedTrack(track);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTrack(null);
  };

  const handleRowClick = (track: Track) => {
    handleViewTrackDetails(track);
  };

  const handleEditTrackClick = (track: Track, e: React.MouseEvent) => {
    e.stopPropagation();
    setTrackToEdit(track);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setTrackToEdit(null);
  };

  const handleEditTrackSubmit = async (trackId: string, formData: FormData) => {
    setActionLoading(trackId);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      formData.append('updateFeaturedArtists', 'true');
      formData.append('updateGenres', 'true');

      await api.tracks.update(trackId, formData, token);
      toast.success('Track updated successfully');
      closeEditModal();
      fetchTracks(currentPage, activeSearchTerm, sortConfig);
    } catch (err: any) {
      console.error('Error updating track:', err);
      toast.error(err.message || 'Failed to update track');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-grow">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
          <Input
            type="text"
            placeholder="Search tracks and press Enter..."
            value={searchInput}
            onChange={handleSearchChange}
            className={`pl-10 pr-4 py-2 w-full rounded-md border h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}
          />
          <button type="submit" className="hidden">Search</button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading tracks...</div>
      ) : (
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
                      aria-label="Select all tracks"
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
                  <th 
                    scope="col" 
                    className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center">
                      Artist
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center">
                      Album
                    </div>
                  </th>
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
                      className={`border-b cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'} ${selectedTrackIds.has(track.id) ? (theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-50') : ''} ${actionLoading === track.id ? 'opacity-50 pointer-events-none' : ''}`}
                      onClick={() => handleRowClick(track)}
                    >
                      <td className="w-4 p-4" onClick={(e) => e.stopPropagation()}>
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
                      <td className="py-4 px-6">{track.artist?.artistName || 'Unknown'}</td>
                      <td className="py-4 px-6">{track.album?.title || 'Single'}</td>
                      <td className="py-4 px-6">{formatDuration(track.duration)}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${track.isActive
                          ? (theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
                          : (theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800')
                        }`}>
                          {track.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`hover:bg-red-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'text-red-500 hover:text-red-400 hover:bg-red-500/20' : 'text-red-600 hover:text-red-700 hover:bg-red-100'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTrackClick(track);
                            }}
                            aria-label={`Delete track ${track.title}`}
                            disabled={loading || actionLoading !== null}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`hover:bg-blue-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20' : 'text-blue-600 hover:text-blue-700 hover:bg-blue-100'}`}
                            onClick={(e) => handleEditTrackClick(track, e)}
                            aria-label={`Edit track ${track.title}`}
                            disabled={loading || actionLoading !== null}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 p-0 ${theme === 'dark' ? (track.isActive ? 'text-green-400 hover:text-green-300 hover:bg-green-500/20' : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20') : (track.isActive ? 'text-green-600 hover:text-green-700 hover:bg-green-100' : 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100')}`}
                            onClick={(e) => handleToggleVisibility(track.id, track.isActive, e)}
                            aria-label={track.isActive ? `Hide track ${track.title}` : `Show track ${track.title}`}
                            disabled={loading || actionLoading !== null || actionLoading === track.id}
                          >
                            {actionLoading === track.id ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : (track.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />)}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-4 px-6 text-center">No tracks found {activeSearchTerm ? 'matching your search' : ''}.</td>
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

      {/* Track Detail Modal */}
      <TrackDetailModal
        track={selectedTrack}
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        theme={theme}
      />

      {/* Edit Track Modal */}
      <EditTrackModal
        track={trackToEdit}
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSubmit={handleEditTrackSubmit}
        theme={theme}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (trackToDelete) {
            handleConfirmDelete([trackToDelete.id]);
          } else if (tracksToDeleteCount) {
            handleConfirmDelete(Array.from(selectedTrackIds));
          }
        }}
        item={trackToDelete ? { id: trackToDelete.id, name: trackToDelete.title, email: '' } : null} // Adapt Track type
        count={tracksToDeleteCount || undefined}
        theme={theme}
        entityType="track"
      />
    </div>
  );
};