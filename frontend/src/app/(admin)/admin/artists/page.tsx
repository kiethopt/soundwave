'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ArtistProfile } from '@/types';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, XCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ConfirmDeleteModal, DeactivateModal } from '@/components/ui/admin-modals';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SortConfig {
  key: keyof ArtistProfile | null;
  direction: 'asc' | 'desc';
}

export default function ArtistManagement() {
  const { theme } = useTheme();
  const router = useRouter();
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedArtistIds, setSelectedArtistIds] = useState<Set<string>>(new Set());
  const [deletingArtist, setDeletingArtist] = useState<ArtistProfile | null>(null);
  const [deactivatingArtist, setDeactivatingArtist] = useState<ArtistProfile | null>(null);
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<'ALL' | 'VERIFIED' | 'UNVERIFIED'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  const limit = 10;

  const fetchArtists = useCallback(async (page: number, search: string, verified: 'ALL' | 'VERIFIED' | 'UNVERIFIED', status: 'ALL' | 'ACTIVE' | 'INACTIVE', sort: SortConfig) => {
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
      if (verified !== 'ALL') {
        params.append('isVerified', verified === 'VERIFIED' ? 'true' : 'false');
      }
      if (status !== 'ALL') {
        params.append('status', status === 'ACTIVE' ? 'true' : 'false');
      }
      if (sort.key) {
        params.append('sortBy', sort.key);
        params.append('sortOrder', sort.direction);
      }

      const response = await api.admin.getAllArtists(token, page, limit, params.toString());
      setArtists(response.artists || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Error fetching artists:', err);
      setError(err.message || 'Could not load artists');
      toast.error(err.message || 'Could not load artists');
      setArtists([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const refreshTable = useCallback(() => {
      fetchArtists(currentPage, activeSearchTerm, verifiedFilter, statusFilter, sortConfig);
      setSelectedArtistIds(new Set());
  }, [currentPage, activeSearchTerm, verifiedFilter, statusFilter, sortConfig, fetchArtists]);

  useEffect(() => {
    refreshTable();
  }, [refreshTable]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearchTerm, verifiedFilter, statusFilter, sortConfig]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActiveSearchTerm(searchInput);
  };

  const handleSort = (key: keyof ArtistProfile | null) => {
    if (!key) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const allIds = new Set(artists.map(a => a.id));
      setSelectedArtistIds(allIds);
    } else {
      setSelectedArtistIds(new Set());
    }
  };

  const handleSelectRow = (artistId: string, checked: boolean | 'indeterminate') => {
    setSelectedArtistIds(prev => {
      const newSet = new Set(prev);
      if (checked === true) {
        newSet.add(artistId);
      } else {
        newSet.delete(artistId);
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

  const handleAction = (action: string, artist: ArtistProfile) => {
    if (action === 'view') {
      router.push(`/admin/artists/${artist.id}`);
    } else if (action === 'delete') {
      setDeletingArtist(artist);
      setIsBulkDeleteConfirm(false);
      setIsDeleteModalOpen(true);
    } else if (action === 'activate') {
        handleActivateArtist(artist);
    } else if (action === 'deactivate') {
        handleDeactivateArtistClick(artist);
    }
  };

  const handleActivateArtist = async (artist: ArtistProfile) => {
    if (!artist) return;
    if (!window.confirm(`Are you sure you want to activate ${artist.artistName}?`)) {
        return;
    }

    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading(artist.id);
    try {
      await api.admin.updateArtist(artist.id, { isActive: true }, token);
      toast.success(`${artist.artistName} activated successfully!`);
      refreshTable();
    } catch (err: any) {
      console.error('Error activating artist:', err);
      toast.error(err.message || 'Failed to activate artist.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivateArtistClick = (artist: ArtistProfile) => {
    if (!artist) return;
    setDeactivatingArtist(artist);
    setIsDeactivateModalOpen(true);
  };

  const handleDeactivateConfirm = async (reason: string) => {
    if (!deactivatingArtist) return;

    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      setIsDeactivateModalOpen(false);
      setDeactivatingArtist(null);
      return;
    }
    setActionLoading(deactivatingArtist.id);
    try {
      await api.admin.updateArtist(deactivatingArtist.id, { isActive: false, reason }, token);
      toast.success(`${deactivatingArtist.artistName} deactivated successfully.`);
      setIsDeactivateModalOpen(false);
      setDeactivatingArtist(null);
      refreshTable();
    } catch (err: any) {
      console.error('Error deactivating artist:', err);
      toast.error(err.message || 'Failed to deactivate artist.');
      setIsDeactivateModalOpen(false);
      setDeactivatingArtist(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteConfirm = (ids: string[]) => {
    if (ids.length === 0 && isBulkDeleteConfirm) {
        handleBulkDeleteConfirm(Array.from(selectedArtistIds));
    } else if (ids.length === 1 && !isBulkDeleteConfirm && deletingArtist) {
        handleSingleDeleteConfirm(ids[0]);
    } else {
        console.error("Inconsistent state in handleDeleteConfirm");
    }
    setIsDeleteModalOpen(false);
    setDeletingArtist(null);
    setIsBulkDeleteConfirm(false);
  };

  const handleSingleDeleteConfirm = async (artistId: string) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading(artistId);
    try {
      await api.admin.deleteArtist(artistId, token);
      toast.success(`Successfully deleted artist.`);
      refreshTable();
      setSelectedArtistIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(artistId);
        return newSet;
      });
    } catch (err: any) {
      console.error('Error deleting artist:', err);
      toast.error(err.message || 'Failed to delete artist.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedArtistIds.size === 0) {
      toast('No artists selected.', { icon: '⚠️' });
      return;
    }
    setDeletingArtist(null);
    setIsBulkDeleteConfirm(true);
    setIsDeleteModalOpen(true);
  };

  const handleBulkDeleteConfirm = async (artistIds: string[]) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading('bulk-delete');
    try {
      await Promise.all(artistIds.map(id => api.admin.deleteArtist(id, token)));
      toast.success(`Successfully deleted ${artistIds.length} artist(s).`);

      const response = await api.admin.getAllArtists(token, 1, limit, new URLSearchParams({ limit: '1' }).toString());
      const newTotalArtists = response.pagination?.totalItems || 0;
      const newTotalPages = Math.ceil(newTotalArtists / limit) || 1;

      let targetPage = currentPage;
      if (currentPage > newTotalPages) {
        targetPage = newTotalPages;
      } else if (artists.length === artistIds.length && currentPage > 1) {
        targetPage = currentPage - 1;
      }

      if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
      } else {
          refreshTable();
      }

      setSelectedArtistIds(new Set());
    } catch (err: any) {
      console.error('Error deleting artists:', err);
      toast.error(err.message || 'Failed to delete artists.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRowClick = (artist: ArtistProfile, e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[role="checkbox"]') || target.closest('[data-radix-dropdown-menu-trigger]') || target.closest('button')) {
      return;
    }
    router.push(`/admin/artists/${artist.id}`);
  };

  const isAllSelected = artists.length > 0 && selectedArtistIds.size === artists.length;
  const isIndeterminate = selectedArtistIds.size > 0 && selectedArtistIds.size < artists.length;

  return (
    <div className={`container mx-auto space-y-6 p-4 pb-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
           Artist Management
        </h1>
        <p className={`text-muted-foreground ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
           Manage and monitor artist accounts
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-grow">
           <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
           <Input
             type="text"
             placeholder="Search and press Enter..."
             value={searchInput}
             onChange={(e) => setSearchInput(e.target.value)}
             className={`pl-10 pr-4 py-2 w-full rounded-md border h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}
           />
           <button type="submit" className="hidden">Search</button>
         </form>
        <div className="flex gap-2">
          <Select value={verifiedFilter} onValueChange={(value: 'ALL' | 'VERIFIED' | 'UNVERIFIED') => setVerifiedFilter(value)}>
            <SelectTrigger className={`w-[180px] rounded-md h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}>
              <SelectValue placeholder="Filter by Verification" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600 text-white' : ''}>
              <SelectItem value="ALL">All Verification</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="UNVERIFIED">Not Verified</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value: 'ALL' | 'ACTIVE' | 'INACTIVE') => setStatusFilter(value)}>
            <SelectTrigger className={`w-[140px] rounded-md h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}>
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600 text-white' : ''}>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && !deletingArtist && !deactivatingArtist && <p>Loading artists...</p>}
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
                  
                  {/* Artist Name column */}
                  <th 
                    scope="col" 
                    className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                    onClick={() => handleSort('artistName')}
                  >
                    <div className="flex items-center">
                      Artist Name
                      {sortConfig.key === 'artistName' ? (
                        sortConfig.direction === 'asc' ?
                          <ArrowUp className="ml-2 h-3 w-3" /> :
                          <ArrowDown className="ml-2 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  
                  {/* User Email column - not sortable */}
                  <th scope="col" className="py-3 px-6">User Email</th>
                  
                  {/* Verified column */}
                  <th 
                    scope="col" 
                    className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                    onClick={() => handleSort('isVerified')}
                  >
                    <div className="flex items-center">
                      Verified
                      {sortConfig.key === 'isVerified' ? (
                        sortConfig.direction === 'asc' ?
                          <ArrowUp className="ml-2 h-3 w-3" /> :
                          <ArrowDown className="ml-2 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  
                  {/* Status column */}
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
                  
                  {/* Monthly Listeners column */}
                  <th 
                    scope="col" 
                    className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                    onClick={() => handleSort('monthlyListeners')}
                  >
                    <div className="flex items-center">
                      Monthly Listeners
                      {sortConfig.key === 'monthlyListeners' ? (
                        sortConfig.direction === 'asc' ?
                          <ArrowUp className="ml-2 h-3 w-3" /> :
                          <ArrowDown className="ml-2 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  
                  {/* Created At column */}
                  <th 
                    scope="col" 
                    className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      Created At
                      {sortConfig.key === 'createdAt' ? (
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
                {artists.length > 0 ? (
                  artists.map((artist) => (
                    <tr
                      key={artist.id}
                      onClick={(e) => handleRowClick(artist, e)}
                      className={`border-b cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'} ${selectedArtistIds.has(artist.id) ? (theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-50') : ''} ${actionLoading === artist.id ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <td className="w-4 p-4">
                         <Checkbox
                           id={`select-row-${artist.id}`}
                           checked={selectedArtistIds.has(artist.id)}
                           onCheckedChange={(checked) => handleSelectRow(artist.id, checked)}
                           aria-label={`Select row for artist ${artist.artistName}`}
                           className={`${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                           disabled={loading || actionLoading !== null}
                         />
                      </td>
                      <td className={`py-4 px-6 font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {artist.artistName}
                      </td>
                      <td className="py-4 px-6">{artist.user?.email || 'N/A'}</td>
                      <td className="py-4 px-6">
                        {artist.isVerified ? (
                          <span className={`inline-flex items-center ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                            <CheckCircle className="h-4 w-4 mr-1" /> Verified
                          </span>
                        ) : (
                          <span className={`inline-flex items-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            <XCircle className="h-4 w-4 mr-1" /> Unverified
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${artist.isActive
                            ? (theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
                            : (theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800')
                          }`}>
                          {artist.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-6">{artist.monthlyListeners?.toLocaleString() || 0}</td>
                      <td className="py-4 px-6">{formatDate(artist.createdAt)}</td>
                      <td className="py-4 px-6">
                         <div className="flex items-center justify-center gap-1">
                           <Button
                             variant="ghost"
                             size="icon"
                             className={`text-red-600 hover:bg-red-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                             onClick={(e) => { e.stopPropagation(); handleAction('delete', artist); }}
                             aria-label={`Delete artist ${artist.artistName}`}
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
                               <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleAction('view', artist)} } disabled={loading || actionLoading === artist.id}>
                                   <Search className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className={theme === 'dark' ? 'bg-gray-600' : ''} />
                                {artist.isActive ? (
                                  <DropdownMenuItem
                                    onClick={(e) => {e.stopPropagation(); handleAction('deactivate', artist)}}
                                    className={cn(
                                      theme === 'light'
                                        ? "text-orange-600 focus:text-orange-700 focus:bg-orange-100"
                                        : "text-orange-400 focus:bg-orange-500/20 focus:text-orange-300",
                                    )}
                                    disabled={loading || actionLoading === artist.id}
                                  >
                                    <ShieldAlert className="mr-2 h-4 w-4" /> Deactivate Artist
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={(e) => {e.stopPropagation(); handleAction('activate', artist)}}
                                    className={cn(
                                      "focus:bg-opacity-50",
                                      theme === 'light'
                                        ? "text-green-700 focus:text-green-800 focus:bg-green-100"
                                        : "text-green-400 focus:bg-green-500/20 focus:text-green-300",
                                    )}
                                    disabled={loading || actionLoading === artist.id}
                                   >
                                     <ShieldCheck className="mr-2 h-4 w-4" /> Activate Artist
                                   </DropdownMenuItem>
                                )}
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-4 px-6 text-center">No artists found {activeSearchTerm || verifiedFilter !== 'ALL' || statusFilter !== 'ALL' ? 'matching your criteria' : ''}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="min-w-[200px]">
              {selectedArtistIds.size > 0 && (
                <Button
                  onClick={handleBulkDeleteClick}
                  variant="destructive"
                  size="default"
                  disabled={loading || actionLoading !== null}
                  className={`${theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : ''}`}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedArtistIds.size})
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
        item={isBulkDeleteConfirm ? null : (deletingArtist ? { id: deletingArtist.id, name: deletingArtist.artistName, email: deletingArtist.user?.email || '' } : null)}
        count={isBulkDeleteConfirm ? selectedArtistIds.size : undefined}
        isOpen={isDeleteModalOpen}
        onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingArtist(null);
            setIsBulkDeleteConfirm(false);
        }}
        onConfirm={handleDeleteConfirm}
        theme={theme}
        entityType="artist"
      />

       <DeactivateModal
         isOpen={isDeactivateModalOpen}
         onClose={() => {
             setIsDeactivateModalOpen(false);
             setDeactivatingArtist(null);
         }}
         onConfirm={handleDeactivateConfirm}
         theme={theme}
         entityType="artist"
       />
    </div>
  );
} 