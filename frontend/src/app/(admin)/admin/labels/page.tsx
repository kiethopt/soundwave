'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Label } from '@/types';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Edit, Plus } from 'lucide-react';
import { AddLabelModal, EditLabelModal, ConfirmDeleteModal } from '@/components/ui/admin-modals';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

interface SortConfig {
  key: keyof Label | null;
  direction: 'asc' | 'desc';
}

export default function LabelManagement() {
  const { theme } = useTheme();
  const router = useRouter();
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());
  const [deletingLabel, setDeletingLabel] = useState<Label | null>(null);
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddLabelModalOpen, setIsAddLabelModalOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  const limit = 10;

  const fetchLabels = useCallback(async (page: number, search: string, sort: SortConfig) => {
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

      const response = await api.labels.getAll(token, page, limit, params.toString());
      setLabels(response.labels || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Error fetching labels:', err);
      setError(err.message || 'Could not load labels');
      toast.error(err.message || 'Could not load labels');
      setLabels([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const refreshTable = useCallback(() => {
      fetchLabels(currentPage, activeSearchTerm, sortConfig);
      setSelectedLabelIds(new Set());
  }, [currentPage, activeSearchTerm, sortConfig, fetchLabels]);

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

  const handleSort = (key: keyof Label | null) => {
    if (!key) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const allIds = new Set(labels.map(l => l.id));
      setSelectedLabelIds(allIds);
    } else {
      setSelectedLabelIds(new Set());
    }
  };

  const handleSelectRow = (labelId: string, checked: boolean | 'indeterminate') => {
    setSelectedLabelIds(prev => {
      const newSet = new Set(prev);
      if (checked === true) {
        newSet.add(labelId);
      } else {
        newSet.delete(labelId);
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

  const handleAction = (action: string, label: Label) => {
    if (action === 'edit') {
      setEditingLabel(label);
      setIsEditModalOpen(true);
    } else if (action === 'delete') {
      setDeletingLabel(label);
      setIsBulkDeleteConfirm(false);
      setIsDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = (ids: string[]) => {
    if (ids.length === 0 && isBulkDeleteConfirm) {
        handleBulkDeleteConfirm(Array.from(selectedLabelIds));
    } else if (ids.length === 1 && !isBulkDeleteConfirm && deletingLabel) {
        handleSingleDeleteConfirm(ids[0]);
    } else {
        console.error("Inconsistent state in handleDeleteConfirm");
    }
    setIsDeleteModalOpen(false);
    setDeletingLabel(null);
    setIsBulkDeleteConfirm(false);
  };

  const handleSingleDeleteConfirm = async (labelId: string) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading(labelId);
    try {
      await api.labels.delete(labelId, token);
      toast.success(`Successfully deleted label.`);
      refreshTable();
      setSelectedLabelIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(labelId);
        return newSet;
      });
    } catch (err: any) {
      console.error('Error deleting label:', err);
      toast.error(err.message || 'Failed to delete label.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddLabel = async (formData: FormData) => {
    if (!formData.get('name') || formData.get('name') === '') {
      toast.error('Label name cannot be empty');
      return;
    }
    
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }

    setActionLoading('add-label');
    try {
      await api.labels.create(formData, token);
      toast.success('Label created successfully');
      refreshTable();
      setIsAddLabelModalOpen(false);
    } catch (err: any) {
      console.error('Error creating label:', err);
      toast.error(err.message || 'Failed to create label.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditLabel = async (labelId: string, formData: FormData) => {
    if (!formData.get('name') || formData.get('name') === '') {
      toast.error('Label name cannot be empty');
      return;
    }
    
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }

    setActionLoading(labelId);
    try {      
      await api.labels.update(labelId, formData, token);
      toast.success('Label updated successfully');
      refreshTable();
      setIsEditModalOpen(false);
      setEditingLabel(null);
    } catch (err: any) {
      console.error('Error updating label:', err);
      toast.error(err.message || 'Failed to update label.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedLabelIds.size === 0) {
      toast('No labels selected.', { icon: '⚠️' });
      return;
    }
    setDeletingLabel(null);
    setIsBulkDeleteConfirm(true);
    setIsDeleteModalOpen(true);
  };

  const handleBulkDeleteConfirm = async (labelIds: string[]) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading('bulk-delete');
    try {
      await Promise.all(labelIds.map(id => api.labels.delete(id, token)));
      toast.success(`Successfully deleted ${labelIds.length} label(s).`);

      const response = await api.labels.getAll(token, 1, limit, new URLSearchParams({ limit: '1' }).toString());
      const newTotalLabels = response.pagination?.totalItems || 0;
      const newTotalPages = Math.ceil(newTotalLabels / limit) || 1;

      let targetPage = currentPage;
      if (currentPage > newTotalPages) {
        targetPage = newTotalPages;
      } else if (labels.length === labelIds.length && currentPage > 1) {
        targetPage = currentPage - 1;
      }

      if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
      } else {
          refreshTable();
      }

      setSelectedLabelIds(new Set());
    } catch (err: any) {
      console.error('Error deleting labels:', err);
      toast.error(err.message || 'Failed to delete labels.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRowClick = (label: Label, e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[role="checkbox"]') || target.closest('[data-radix-dropdown-menu-trigger]') || target.closest('button')) {
      return;
    }
    router.push(`/admin/labels/${label.id}`);
  };

  const isAllSelected = labels.length > 0 && selectedLabelIds.size === labels.length;
  const isIndeterminate = selectedLabelIds.size > 0 && selectedLabelIds.size < labels.length;

  return (
    <div className={`container mx-auto space-y-6 p-4 pb-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
           Label Management
        </h1>
        <p className={`text-muted-foreground ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
           Manage and organize record labels
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-grow">
           <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
           <Input
             type="text"
             placeholder="Search labels and press Enter..."
             value={searchInput}
             onChange={(e) => setSearchInput(e.target.value)}
             className={`pl-10 pr-4 py-2 w-full rounded-md border h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}
           />
           <button type="submit" className="hidden">Search</button>
         </form>
        <div className="flex-shrink-0">
          <Button
            onClick={() => setIsAddLabelModalOpen(true)}
            variant="default"
            size="default"
            disabled={loading || actionLoading !== null}
            className={`h-10 px-6 ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Label
          </Button>
        </div>
      </div>

      {loading && !deletingLabel && <p>Loading labels...</p>}
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
                     onClick={() => handleSort('name')}
                   >
                     <div className="flex items-center">
                       Label Name
                       {sortConfig.key === 'name' ? (
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
                     onClick={() => handleSort('tracks')}
                   >
                     <div className="flex items-center">
                       Tracks
                       {sortConfig.key === 'tracks' ? (
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
                     onClick={() => handleSort('albums')}
                   >
                     <div className="flex items-center">
                       Albums
                       {sortConfig.key === 'albums' ? (
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
                {labels.length > 0 ? (
                  labels.map((label) => (
                    <tr
                      key={label.id}
                      onClick={(e) => handleRowClick(label, e)}
                      className={`border-b cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'} ${selectedLabelIds.has(label.id) ? (theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-50') : ''} ${actionLoading === label.id ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                      <td className="w-4 p-4">
                         <Checkbox
                           id={`select-row-${label.id}`}
                           checked={selectedLabelIds.has(label.id)}
                           onCheckedChange={(checked) => handleSelectRow(label.id, checked)}
                           aria-label={`Select row for label ${label.name}`}
                           className={`${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                           disabled={loading || actionLoading !== null}
                         />
                      </td>
                      <td className={`py-4 px-6 font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {label.name}
                      </td>
                      <td className="py-4 px-6">{label._count?.tracks || 0}</td>
                      <td className="py-4 px-6">{label._count?.albums || 0}</td>
                      <td className="py-4 px-6">
                         <div className="flex items-center justify-center gap-1">
                           <Button
                             variant="ghost"
                             size="icon"
                             className={`text-red-600 hover:bg-red-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                             onClick={(e) => { e.stopPropagation(); handleAction('delete', label); }}
                             aria-label={`Delete label ${label.name}`}
                             disabled={loading || actionLoading !== null}
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="icon"
                             className={`text-blue-600 hover:bg-blue-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-blue-500/20' : 'hover:bg-blue-100'}`}
                             onClick={(e) => { e.stopPropagation(); handleAction('edit', label); }}
                             aria-label={`Edit label ${label.name}`}
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
                    <td colSpan={5} className="py-4 px-6 text-center">No labels found {activeSearchTerm ? 'matching your criteria' : ''}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="min-w-[200px]">
              {selectedLabelIds.size > 0 && (
                <Button
                  onClick={handleBulkDeleteClick}
                  variant="destructive"
                  size="default"
                  disabled={loading || actionLoading !== null}
                  className={`${theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : ''}`}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedLabelIds.size})
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
        item={isBulkDeleteConfirm ? null : (deletingLabel ? { id: deletingLabel.id, name: deletingLabel.name, email: '' } : null)}
        count={isBulkDeleteConfirm ? selectedLabelIds.size : undefined}
        isOpen={isDeleteModalOpen}
        onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingLabel(null);
            setIsBulkDeleteConfirm(false);
        }}
        onConfirm={handleDeleteConfirm}
        theme={theme}
        entityType="label"
      />

      <AddLabelModal 
        isOpen={isAddLabelModalOpen}
        onClose={() => setIsAddLabelModalOpen(false)}
        onSubmit={handleAddLabel}
        theme={theme}
      />

      <EditLabelModal
        label={editingLabel}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingLabel(null);
        }}
        onSubmit={handleEditLabel}
        theme={theme}
      />
    </div>
  );
}
