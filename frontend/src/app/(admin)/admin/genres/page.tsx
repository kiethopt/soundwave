'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Genre } from '@/types';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Edit, Plus } from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/ui/admin-modals';
import { Input } from '@/components/ui/input';
import { AddGenreModal, EditGenreModal } from '@/components/ui/admin-modals';

interface SortConfig {
  key: keyof Genre | null;
  direction: 'asc' | 'desc';
}

export default function GenreManagement() {
  const { theme } = useTheme();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedGenreIds, setSelectedGenreIds] = useState<Set<string>>(new Set());
  const [deletingGenre, setDeletingGenre] = useState<Genre | null>(null);
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddGenreModalOpen, setIsAddGenreModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const limit = 10;

  const fetchGenres = useCallback(async (page: number, search: string, sort: SortConfig) => {
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
      if (sort.key) {
        params.append('sortBy', sort.key);
        params.append('sortOrder', sort.direction);
      }

      const response = await api.genres.getAll(token, page, limit, params.toString());
      setGenres(response.genres || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Error fetching genres:', err);
      setError(err.message || 'Could not load genres');
      toast.error(err.message || 'Could not load genres');
      setGenres([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const refreshTable = useCallback(() => {
      fetchGenres(currentPage, activeSearchTerm, sortConfig);
      setSelectedGenreIds(new Set());
  }, [currentPage, activeSearchTerm, sortConfig, fetchGenres]);

  useEffect(() => {
    refreshTable();
  }, [refreshTable]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearchTerm, sortConfig]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActiveSearchTerm(searchInput);
  };

  const handleSort = (key: keyof Genre | null) => {
    if (!key) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const allIds = new Set(genres.map(g => g.id));
      setSelectedGenreIds(allIds);
    } else {
      setSelectedGenreIds(new Set());
    }
  };

  const handleSelectRow = (genreId: string, checked: boolean | 'indeterminate') => {
    setSelectedGenreIds(prev => {
      const newSet = new Set(prev);
      if (checked === true) {
        newSet.add(genreId);
      } else {
        newSet.delete(genreId);
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

  const handleAction = (action: string, genre: Genre) => {
    if (action === 'edit') {
      setEditingGenre(genre);
      setIsEditModalOpen(true);
    } else if (action === 'delete') {
      setDeletingGenre(genre);
      setIsBulkDeleteConfirm(false);
      setIsDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = (ids: string[]) => {
    if (ids.length === 0 && isBulkDeleteConfirm) {
        handleBulkDeleteConfirm(Array.from(selectedGenreIds));
    } else if (ids.length === 1 && !isBulkDeleteConfirm && deletingGenre) {
        handleSingleDeleteConfirm(ids[0]);
    } else {
        console.error("Inconsistent state in handleDeleteConfirm");
    }
    setIsDeleteModalOpen(false);
    setDeletingGenre(null);
    setIsBulkDeleteConfirm(false);
  };

  const handleSingleDeleteConfirm = async (genreId: string) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading(genreId);
    try {
      await api.admin.deleteGenre(genreId, token);
      toast.success(`Successfully deleted genre.`);
      refreshTable();
      setSelectedGenreIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(genreId);
        return newSet;
      });
    } catch (err: any) {
      console.error('Error deleting genre:', err);
      toast.error(err.message || 'Failed to delete genre.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddGenre = async (name: string) => {
    if (!name.trim()) {
      toast.error('Genre name cannot be empty');
      return;
    }
    
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }

    setActionLoading('add-genre');
    try {
      await api.admin.createGenre({ name }, token);
      toast.success('Genre created successfully');
      refreshTable();
      setIsAddGenreModalOpen(false);
    } catch (err: any) {
      console.error('Error creating genre:', err);
      toast.error(err.message || 'Failed to create genre.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditGenre = async (genreId: string, name: string) => {
    if (!name.trim()) {
      toast.error('Genre name cannot be empty');
      return;
    }
    
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }

    setActionLoading(genreId);
    try {
      const formData = new FormData();
      formData.append('name', name);
      
      await api.admin.updateGenre(genreId, formData, token);
      toast.success('Genre updated successfully');
      refreshTable();
      setIsEditModalOpen(false);
      setEditingGenre(null);
    } catch (err: any) {
      console.error('Error updating genre:', err);
      toast.error(err.message || 'Failed to update genre.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedGenreIds.size === 0) {
      toast('No genres selected.', { icon: '⚠️' });
      return;
    }
    setDeletingGenre(null);
    setIsBulkDeleteConfirm(true);
    setIsDeleteModalOpen(true);
  };

  const handleBulkDeleteConfirm = async (genreIds: string[]) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading('bulk-delete');
    try {
      await Promise.all(genreIds.map(id => api.admin.deleteGenre(id, token)));
      toast.success(`Successfully deleted ${genreIds.length} genre(s).`);

      const response = await api.genres.getAll(token, 1, limit, new URLSearchParams({ limit: '1' }).toString());
      const newTotalGenres = response.pagination?.totalItems || 0;
      const newTotalPages = Math.ceil(newTotalGenres / limit) || 1;

      let targetPage = currentPage;
      if (currentPage > newTotalPages) {
        targetPage = newTotalPages;
      } else if (genres.length === genreIds.length && currentPage > 1) {
        targetPage = currentPage - 1;
      }

      if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
      } else {
          refreshTable();
      }

      setSelectedGenreIds(new Set());
    } catch (err: any) {
      console.error('Error deleting genres:', err);
      toast.error(err.message || 'Failed to delete genres.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRowClick = (genre: Genre, e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[role="checkbox"]') || target.closest('[data-radix-dropdown-menu-trigger]') || target.closest('button')) {
      return;
    }
    setEditingGenre(genre);
    setIsEditModalOpen(true);
  };

  const isAllSelected = genres.length > 0 && selectedGenreIds.size === genres.length;
  const isIndeterminate = selectedGenreIds.size > 0 && selectedGenreIds.size < genres.length;

  return (
    <div className={`container mx-auto space-y-6 p-4 pb-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
           Genre Management
        </h1>
        <p className={`text-muted-foreground ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
           Manage and categorize music genres
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-grow">
           <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
           <Input
             type="text"
             placeholder="Search genres and press Enter..."
             value={searchInput}
             onChange={(e) => setSearchInput(e.target.value)}
             className={`pl-10 pr-4 py-2 w-full rounded-md border h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}
           />
           <button type="submit" className="hidden">Search</button>
         </form>
        <div className="flex-shrink-0">
          <Button
            onClick={() => setIsAddGenreModalOpen(true)}
            variant="default"
            size="default"
            disabled={loading || actionLoading !== null}
            className={`h-10 px-6 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Genre
          </Button>
        </div>
      </div>

      {loading && !deletingGenre && <p>Loading genres...</p>}
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
                   
                   {/* Genre Name column - sortable */}
                   <th 
                     scope="col" 
                     className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                     onClick={() => handleSort('name')}
                   >
                     <div className="flex items-center">
                       Genre Name
                       {sortConfig.key === 'name' ? (
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
                   
                   {/* Updated At column - sortable */}
                   <th 
                     scope="col" 
                     className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                     onClick={() => handleSort('updatedAt')}
                   >
                     <div className="flex items-center">
                       Updated At
                       {sortConfig.key === 'updatedAt' ? (
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
                {genres.length > 0 ? (
                  genres.map((genre) => (
                    <tr
                      key={genre.id}
                      onClick={(e) => handleRowClick(genre, e)}
                      className={`border-b cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'} ${selectedGenreIds.has(genre.id) ? (theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-50') : ''} ${actionLoading === genre.id ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                      <td className="w-4 p-4">
                         <Checkbox
                           id={`select-row-${genre.id}`}
                           checked={selectedGenreIds.has(genre.id)}
                           onCheckedChange={(checked) => handleSelectRow(genre.id, checked)}
                           aria-label={`Select row for genre ${genre.name}`}
                           className={`${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                           disabled={loading || actionLoading !== null}
                         />
                      </td>
                      <td className={`py-4 px-6 font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {genre.name}
                      </td>
                      <td className="py-4 px-6">{formatDate(genre.createdAt)}</td>
                      <td className="py-4 px-6">{formatDate(genre.updatedAt)}</td>
                      <td className="py-4 px-6">
                         <div className="flex items-center justify-center gap-1">
                           <Button
                             variant="ghost"
                             size="icon"
                             className={`text-red-600 hover:bg-red-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                             onClick={(e) => { e.stopPropagation(); handleAction('delete', genre); }}
                             aria-label={`Delete genre ${genre.name}`}
                             disabled={loading || actionLoading !== null}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="icon"
                             className={`text-blue-600 hover:bg-blue-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-blue-500/20' : 'hover:bg-blue-100'}`}
                             onClick={(e) => { e.stopPropagation(); handleAction('edit', genre); }}
                             aria-label={`Edit genre ${genre.name}`}
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
                    <td colSpan={5} className="py-4 px-6 text-center">No genres found {activeSearchTerm ? 'matching your criteria' : ''}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="min-w-[200px]">
              {selectedGenreIds.size > 0 && (
                <Button
                  onClick={handleBulkDeleteClick}
                  variant="destructive"
                  size="default"
                  disabled={loading || actionLoading !== null}
                  className={`${theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : ''}`}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedGenreIds.size})
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
        item={isBulkDeleteConfirm ? null : (deletingGenre ? { id: deletingGenre.id, name: deletingGenre.name, email: '' } : null)}
        count={isBulkDeleteConfirm ? selectedGenreIds.size : undefined}
        isOpen={isDeleteModalOpen}
        onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingGenre(null);
            setIsBulkDeleteConfirm(false);
        }}
        onConfirm={handleDeleteConfirm}
        theme={theme}
        entityType="genre"
      />

      <AddGenreModal 
        isOpen={isAddGenreModalOpen}
        onClose={() => setIsAddGenreModalOpen(false)}
        onSubmit={handleAddGenre}
        theme={theme}
      />

      <EditGenreModal
        genre={editingGenre}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingGenre(null);
        }}
        onSubmit={handleEditGenre}
        theme={theme}
      />
    </div>
  );
}
