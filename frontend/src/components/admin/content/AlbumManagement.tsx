'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Trash2, Search, Eye, Edit, CheckCircle, XCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { Album } from '@/types';
import { AlbumDetailModal } from '@/components/ui/admin-modals';

interface AlbumManagementProps {
  theme: 'light' | 'dark';
}

interface SortConfig {
  key: keyof Album | null;
  direction: 'asc' | 'desc';
}

export const AlbumManagement: React.FC<AlbumManagementProps> = ({ theme }) => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const limit = 10;

  const fetchAlbums = useCallback(async (page: number, search: string, sort: SortConfig) => {
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

      const response = await api.albums.getAlbums(token, page, limit, params.toString());
      setAlbums(response.albums || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Error fetching albums:', err);
      toast.error(err.message || 'Could not load albums');
      setAlbums([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlbums(currentPage, activeSearchTerm, sortConfig);
  }, [fetchAlbums, currentPage, activeSearchTerm, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearchTerm, sortConfig]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActiveSearchTerm(searchInput);
  };

  const handleSort = (key: keyof Album | null) => {
    if (!key) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!window.confirm('Are you sure you want to delete this album? This action cannot be undone.')) {
      return;
    }

    setActionLoading(albumId);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      await api.albums.delete(albumId, token);
      toast.success('Album deleted successfully');
      fetchAlbums(currentPage, activeSearchTerm, sortConfig);
      setSelectedAlbumIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(albumId);
        return newSet;
      });
    } catch (err: any) {
      console.error('Error deleting album:', err);
      toast.error(err.message || 'Failed to delete album');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedAlbumIds.size === 0) {
      toast('No albums selected.', { icon: '⚠️' });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedAlbumIds.size} selected album(s)? This action cannot be undone.`)) {
        return;
      }

    const deleteMultipleAlbums = async () => {
      setActionLoading('bulk-delete');
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }
        
        await Promise.all(
          Array.from(selectedAlbumIds).map(id => api.albums.delete(id, token))
        );
        
        toast.success(`Successfully deleted ${selectedAlbumIds.size} album(s)`);
        fetchAlbums(currentPage, activeSearchTerm, sortConfig);
        setSelectedAlbumIds(new Set());
      } catch (err: any) {
        console.error('Error deleting albums:', err);
        toast.error(err.message || 'Failed to delete albums');
      } finally {
        setActionLoading(null);
      }
    };

    deleteMultipleAlbums();
  };

  const handleToggleVisibility = async (albumId: string, currentIsActive: boolean) => {
    setActionLoading(albumId);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      await api.albums.toggleVisibility(albumId, token);
      
      setAlbums(albums.map(album => 
        album.id === albumId 
          ? { ...album, isActive: !currentIsActive } 
          : album
      ));
      
      toast.success(`Album ${currentIsActive ? 'hidden' : 'activated'} successfully`);
    } catch (err: any) {
      console.error('Error toggling album visibility:', err);
      toast.error(err.message || 'Failed to update album visibility');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const allIds = new Set(albums.map(a => a.id));
      setSelectedAlbumIds(allIds);
    } else {
      setSelectedAlbumIds(new Set());
    }
  };

  const handleSelectRow = (albumId: string, checked: boolean | 'indeterminate') => {
    setSelectedAlbumIds(prev => {
      const newSet = new Set(prev);
      if (checked === true) {
        newSet.add(albumId);
      } else {
        newSet.delete(albumId);
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

  const isAllSelected = albums.length > 0 && selectedAlbumIds.size === albums.length;
  const isIndeterminate = selectedAlbumIds.size > 0 && selectedAlbumIds.size < albums.length;

  const handleViewAlbumDetails = (album: Album) => {
    setSelectedAlbum(album);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedAlbum(null);
  };

  const handleRowClick = (album: Album) => {
    handleViewAlbumDetails(album);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-grow">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
          <Input
            type="text"
            placeholder="Search albums and press Enter..."
            value={searchInput}
            onChange={handleSearchChange}
            className={`pl-10 pr-4 py-2 w-full rounded-md border h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}
          />
          <button type="submit" className="hidden">Search</button>
        </form>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading albums...</div>
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
                      aria-label="Select all albums"
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
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center">
                      Type
                      {sortConfig.key === 'type' ? (
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
                  <th 
                    scope="col" 
                    className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                    onClick={() => handleSort('releaseDate')}
                  >
                    <div className="flex items-center">
                      Release Date
                      {sortConfig.key === 'releaseDate' ? (
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
                {albums.length > 0 ? (
                  albums.map((album) => (
                    <tr
                      key={album.id}
                      className={`border-b cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'} ${selectedAlbumIds.has(album.id) ? (theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-50') : ''} ${actionLoading === album.id ? 'opacity-50 pointer-events-none' : ''}`}
                      onClick={() => handleRowClick(album)}
                    >
                      <td className="w-4 p-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          id={`select-row-${album.id}`}
                          checked={selectedAlbumIds.has(album.id)}
                          onCheckedChange={(checked) => handleSelectRow(album.id, checked)}
                          aria-label={`Select row for album ${album.title}`}
                          className={`${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                          disabled={loading || actionLoading !== null}
                        />
                      </td>
                      <td className={`py-4 px-6 font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {album.title}
                      </td>
                      <td className="py-4 px-6">{album.artist?.artistName || 'Unknown'}</td>
                      <td className="py-4 px-6">{album.type}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${album.isActive
                          ? (theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
                          : (theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800')
                        }`}>
                          {album.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-6">{formatDate(album.releaseDate)}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`text-red-600 hover:bg-red-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAlbum(album.id);
                            }}
                            aria-label={`Delete album ${album.title}`}
                            disabled={loading || actionLoading !== null}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0" data-radix-dropdown-menu-trigger disabled={loading || actionLoading !== null}>
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600 text-white' : ''}>
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewAlbumDetails(album)}>
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" /> Edit Album
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className={theme === 'dark' ? 'bg-gray-600' : ''} />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleVisibility(album.id, album.isActive);
                                }}
                                disabled={actionLoading === album.id}
                              >
                                {album.isActive ? (
                                  <>
                                    <XCircle className="mr-2 h-4 w-4" /> Hide Album
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Show Album
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-4 px-6 text-center">No albums found {activeSearchTerm ? 'matching your search' : ''}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="min-w-[200px]">
              {selectedAlbumIds.size > 0 && (
                <Button
                  onClick={handleBulkDeleteClick}
                  variant="destructive"
                  size="default"
                  disabled={loading || actionLoading !== null}
                  className={`${theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : ''}`}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedAlbumIds.size})
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

      {/* Album Detail Modal */}
      <AlbumDetailModal
        album={selectedAlbum}
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        theme={theme}
      />
    </div>
  );
};