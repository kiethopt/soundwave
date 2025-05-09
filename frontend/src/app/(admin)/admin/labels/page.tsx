'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Label, ArtistRequestFilters } from '@/types';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Edit, Plus, Tag, Check, X } from 'lucide-react';
import { AddLabelModal, EditLabelModal, ConfirmDeleteModal } from '@/components/ui/admin-modals';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';

const LabelApproveModal = ({ isOpen, onClose, onConfirm, labelName, artistName, theme }: any) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: theme === 'dark' ? '#333' : 'white', padding: '20px', borderRadius: '8px', color: theme === 'dark' ? 'white' : 'black' }}>
        <h2>Approve Label Request?</h2>
        <p>Are you sure you want to approve the request for label "{labelName}" by {artistName}?</p>
        <p>This will create a new label and assign it to the artist.</p>
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>Confirm Approve</Button>
        </div>
      </div>
    </div>
  );
};

const LabelRejectModal = ({ isOpen, onClose, onConfirm, theme }: any) => {
  const [reason, setReason] = useState('');
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: theme === 'dark' ? '#333' : 'white', padding: '20px', borderRadius: '8px', color: theme === 'dark' ? 'white' : 'black' }}>
        <h2>Reject Label Request</h2>
        <p>Please provide a reason for rejection:</p>
        <textarea 
          value={reason}
          onChange={(e) => setReason(e.target.value)} 
          rows={3} 
          style={{ width: '100%', margin: '10px 0', padding: '8px', color: 'black', border: '1px solid #ccc' }}
          placeholder="Reason for rejection..."
        />
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => onConfirm(reason)} disabled={!reason.trim()}>Confirm Reject</Button>
        </div>
      </div>
    </div>
  );
};

interface SortConfig {
  key: keyof Label | null;
  direction: 'asc' | 'desc';
}

type LabelRegistrationRequest = any;

export default function CombinedLabelManagementPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'manage' | 'requests'>('manage');
  const limit = 10;

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
  const [manageSearchInput, setManageSearchInput] = useState('');
  const [manageActiveSearchTerm, setManageActiveSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
  
  const [labelRequests, setLabelRequests] = useState<LabelRegistrationRequest[]>([]);
  const [labelRequestsLoading, setLabelRequestsLoading] = useState(false);
  const [labelRequestsActionLoading, setLabelRequestsActionLoading] = useState<string | null>(null);
  const [labelRequestsError, setLabelRequestsError] = useState<string | null>(null);
  const [labelRequestsCurrentPage, setLabelRequestsCurrentPage] = useState(1);
  const [labelRequestsTotalPages, setLabelRequestsTotalPages] = useState(1);
  const [isLabelApproveModalOpen, setIsLabelApproveModalOpen] = useState(false);
  const [isLabelRejectModalOpen, setIsLabelRejectModalOpen] = useState(false);
  const [labelRequestToApprove, setLabelRequestToApprove] = useState<LabelRegistrationRequest | null>(null);
  const [labelRequestIdToReject, setLabelRequestIdToReject] = useState<string | null>(null);
  const [requestsSearchInput, setRequestsSearchInput] = useState('');
  const [requestsActiveSearchTerm, setRequestsActiveSearchTerm] = useState('');
  const [requestsStartDate, setRequestsStartDate] = useState('');
  const [requestsEndDate, setRequestsEndDate] = useState('');

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

  const refreshManageTable = useCallback(() => {
      fetchLabels(currentPage, manageActiveSearchTerm, sortConfig);
      setSelectedLabelIds(new Set());
  }, [currentPage, manageActiveSearchTerm, sortConfig, fetchLabels]);

  useEffect(() => {
    if (activeTab === 'manage') {
      refreshManageTable();
    }
  }, [activeTab, refreshManageTable]);

  useEffect(() => {
    if (activeTab === 'manage') {
        setCurrentPage(1);
    }
  }, [activeTab, manageActiveSearchTerm, sortConfig]);

  const handleManageSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setManageActiveSearchTerm(manageSearchInput);
  };

  const handleSort = (key: keyof Label | null) => {
    if (!key) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAllManage = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const allIds = new Set(labels.map(l => l.id));
      setSelectedLabelIds(allIds);
    } else {
      setSelectedLabelIds(new Set());
    }
  };

  const handleSelectManageRow = (labelId: string, checked: boolean | 'indeterminate') => {
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

  const handleManagePageChange = (newPage: number) => {
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

  const handleManageAction = (action: string, label: Label) => {
    if (action === 'edit') {
      setEditingLabel(label);
      setIsEditModalOpen(true);
    } else if (action === 'delete') {
      setDeletingLabel(label);
      setIsBulkDeleteConfirm(false);
      setIsDeleteModalOpen(true);
    }
  };

  const handleManageDeleteConfirm = (ids: string[]) => {
    if (ids.length === 0 && isBulkDeleteConfirm) {
        handleManageBulkDeleteConfirm(Array.from(selectedLabelIds));
    } else if (ids.length === 1 && !isBulkDeleteConfirm && deletingLabel) {
        handleManageSingleDeleteConfirm(ids[0]);
    } else {
        console.error("Inconsistent state in handleDeleteConfirm");
    }
    setIsDeleteModalOpen(false);
    setDeletingLabel(null);
    setIsBulkDeleteConfirm(false);
  };

  const handleManageSingleDeleteConfirm = async (labelId: string) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading(labelId);
    try {
      await api.labels.delete(labelId, token);
      toast.success(`Successfully deleted label.`);
      refreshManageTable();
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
      refreshManageTable();
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
      refreshManageTable();
      setIsEditModalOpen(false);
      setEditingLabel(null);
    } catch (err: any) {
      console.error('Error updating label:', err);
      toast.error(err.message || 'Failed to update label.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageBulkDeleteClick = () => {
    if (selectedLabelIds.size === 0) {
      toast('No labels selected.', { icon: '⚠️' });
      return;
    }
    setDeletingLabel(null);
    setIsBulkDeleteConfirm(true);
    setIsDeleteModalOpen(true);
  };

  const handleManageBulkDeleteConfirm = async (labelIds: string[]) => {
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
          refreshManageTable();
      }

      setSelectedLabelIds(new Set());
    } catch (err: any) {
      console.error('Error deleting labels:', err);
      toast.error(err.message || 'Failed to delete labels.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageRowClick = (label: Label, e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[role="checkbox"]') || target.closest('[data-radix-dropdown-menu-trigger]') || target.closest('button')) {
      return;
    }
    router.push(`/admin/labels/${label.id}`);
  };

  const isAllManageSelected = labels.length > 0 && selectedLabelIds.size === labels.length;
  const isManageIndeterminate = selectedLabelIds.size > 0 && selectedLabelIds.size < labels.length;

  const fetchLabelRequests = useCallback(async (page: number, searchTerm = '', dateFrom?: string, dateTo?: string) => {
    setLabelRequestsLoading(true);
    setLabelRequestsError(null);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const filters: ArtistRequestFilters = { search: searchTerm };
      if (dateFrom) filters.startDate = dateFrom;
      if (dateTo) filters.endDate = dateTo;

      const response = await api.admin.getLabelRegistrations(token, page, limit, filters);
      
      if (response && response.data) {
        setLabelRequests(response.data);
        if (response.pagination && typeof response.pagination.totalPages === 'number') {
          setLabelRequestsTotalPages(response.pagination.totalPages);
        } else {
          setLabelRequestsTotalPages(1);
        }
      } else {
        setLabelRequests([]);
        setLabelRequestsTotalPages(1);
        toast.error('Failed to parse label registration requests response.');
      }
    } catch (err: any) {
      console.error('Error fetching label registration requests:', err);
      setLabelRequestsError(err.message || 'Failed to fetch label registration requests');
      toast.error(err.message || 'Failed to fetch label registration requests');
      setLabelRequests([]);
      setLabelRequestsTotalPages(1);
    } finally {
      setLabelRequestsLoading(false);
    }
  }, [limit]);

  const refreshLabelRequestsTable = useCallback(() => {
    fetchLabelRequests(labelRequestsCurrentPage, requestsActiveSearchTerm, requestsStartDate, requestsEndDate);
  }, [labelRequestsCurrentPage, requestsActiveSearchTerm, requestsStartDate, requestsEndDate, fetchLabelRequests]);

  useEffect(() => {
    if (activeTab === 'requests') {
      refreshLabelRequestsTable();
    }
  }, [activeTab, refreshLabelRequestsTable]);
  
  useEffect(() => {
    if (activeTab === 'requests') {
        setLabelRequestsCurrentPage(1);
    }
  }, [activeTab, requestsActiveSearchTerm, requestsStartDate, requestsEndDate]);

  const handleRequestsSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestsActiveSearchTerm(requestsSearchInput);
  };

  const handleRequestsDateRangeChange = (dates: { startDate: string; endDate: string }) => {
    setRequestsStartDate(dates.startDate);
    setRequestsEndDate(dates.endDate);
  };

  const handleLabelRequestsPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= labelRequestsTotalPages) {
      setLabelRequestsCurrentPage(newPage);
    }
  };

  const handleApproveLabelRequestClick = (request: LabelRegistrationRequest) => {
      setLabelRequestToApprove(request);
      setIsLabelApproveModalOpen(true);
  };
  
  const handleRejectLabelRequestClick = (request: LabelRegistrationRequest) => {
      setLabelRequestIdToReject(request.id);
      setIsLabelRejectModalOpen(true);
  };

  const handleLabelApproveConfirm = async () => {
    if (!labelRequestToApprove) return;
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      setIsLabelApproveModalOpen(false);
      return;
    }
    setLabelRequestsActionLoading(labelRequestToApprove.id);
    try {
      await api.admin.approveLabelRegistration(token, labelRequestToApprove.id);
      toast.success(`Label request for "${labelRequestToApprove.requestedLabelName}" approved successfully!`);
    } catch (error: any) {
        toast.error(`Failed to approve label request: ${error.message || 'Unknown error'}`);
    } finally {
        setLabelRequestsActionLoading(null);
        setIsLabelApproveModalOpen(false);
        setLabelRequestToApprove(null);
        refreshLabelRequestsTable(); 
    }
  };

  const handleLabelRejectConfirm = async (reason: string) => {
    if (!labelRequestIdToReject) return;
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      setIsLabelRejectModalOpen(false);
      return;
    }
    setLabelRequestsActionLoading(labelRequestIdToReject);
    const requestName = labelRequests.find(r => r.id === labelRequestIdToReject)?.requestedLabelName || 'request';
    try {
        await api.admin.rejectLabelRegistration(token, labelRequestIdToReject, reason);
        toast.success(`Label request for "${requestName}" rejected successfully.`);
    } catch (error: any) {
        toast.error(`Failed to reject label request: ${error.message || 'Unknown error'}`);
    } finally {
        setLabelRequestsActionLoading(null);
        setIsLabelRejectModalOpen(false);
        setLabelRequestIdToReject(null);
        refreshLabelRequestsTable();
    }
  };

  const handleLabelRequestRowClick = (request: LabelRegistrationRequest, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    router.push(`/admin/labels/request/${request.id}`);
  };

  return (
    <div className={`container mx-auto space-y-6 p-4 pb-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
           Label Management & Requests
        </h1>
        <p className={`text-muted-foreground ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
           Manage existing labels and process new label registration requests.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'manage' | 'requests')} className="w-full">
        <TabsList className={`grid w-full grid-cols-2 mb-6 ${theme === 'dark' ? 'bg-gray-800' : ''}`}>
          <TabsTrigger value="manage" className={`flex items-center gap-2 ${theme === 'dark' ? 'data-[state=active]:bg-gray-700 data-[state=active]:text-white' : ''}`}>Label Management</TabsTrigger>
          <TabsTrigger value="requests" className={`flex items-center gap-2 ${theme === 'dark' ? 'data-[state=active]:bg-gray-700 data-[state=active]:text-white' : ''}`}><Tag className="w-4 h-4 mr-1" /> Label Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <form onSubmit={handleManageSearchSubmit} className="relative flex-grow">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <Input
                type="text"
                placeholder="Search labels and press Enter..."
                value={manageSearchInput}
                onChange={(e) => setManageSearchInput(e.target.value)}
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
                          checked={isAllManageSelected ? true : isManageIndeterminate ? 'indeterminate' : false}
                          onCheckedChange={handleSelectAllManage}
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
                        onClick={() => handleSort('tracks' as any)}
                      >
                        <div className="flex items-center">
                          Tracks
                          {sortConfig.key === 'tracks' as any ? (
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
                        onClick={() => handleSort('albums' as any)}
                      >
                        <div className="flex items-center">
                          Albums
                          {sortConfig.key === 'albums' as any ? (
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
                          onClick={(e) => handleManageRowClick(label, e)}
                          className={`border-b cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'} ${selectedLabelIds.has(label.id) ? (theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-50') : ''} ${actionLoading === label.id ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                          <td className="w-4 p-4">
                            <Checkbox
                              id={`select-row-${label.id}`}
                              checked={selectedLabelIds.has(label.id)}
                              onCheckedChange={(checked) => handleSelectManageRow(label.id, checked)}
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
                                className={`text-blue-600 hover:bg-blue-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-blue-500/20' : 'hover:bg-blue-100'}`}
                                onClick={(e) => { e.stopPropagation(); handleManageAction('edit', label); }}
                                aria-label={`Edit label ${label.name}`}
                                disabled={loading || actionLoading !== null}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`text-red-600 hover:bg-red-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                                onClick={(e) => { e.stopPropagation(); handleManageAction('delete', label); }}
                                aria-label={`Delete label ${label.name}`}
                                disabled={loading || actionLoading !== null}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 px-6 text-center">No labels found {manageActiveSearchTerm ? 'matching your criteria' : ''}.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="min-w-[200px]">
                  {selectedLabelIds.size > 0 && (
                    <Button
                      onClick={handleManageBulkDeleteClick}
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
                        onClick={() => handleManagePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading || actionLoading !== null}
                        variant="outline"
                        size="sm">
                        Previous
                      </Button>
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        onClick={() => handleManagePageChange(currentPage + 1)}
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
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
           <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <form onSubmit={handleRequestsSearchSubmit} className="relative flex-grow">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <Input
                type="text"
                placeholder="Search label requests and press Enter..."
                value={requestsSearchInput}
                onChange={(e) => setRequestsSearchInput(e.target.value)}
                className={`pl-10 pr-4 py-2 w-full rounded-md border h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}
              />
              <button type="submit" className="hidden">Search</button>
            </form>
            <DateRangePicker 
              onChange={handleRequestsDateRangeChange} 
              startDate={requestsStartDate}
              endDate={requestsEndDate}
              className="w-full sm:w-auto sm:flex-shrink-0"
            />
          </div>

          {labelRequestsLoading && <p>Loading label requests...</p>}
          {labelRequestsError && <p className="text-red-500">{labelRequestsError}</p>}

          {!labelRequestsError && (
            <>
              <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                <table className={`w-full text-sm text-left ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  <thead className={`text-xs uppercase ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
                    <tr>
                      <th className="py-3 px-6 text-left font-medium rounded-tl-md">Label Name</th>
                      <th className="py-3 px-6 text-left font-medium">Requesting Artist</th>
                      <th className="py-3 px-6 text-left font-medium">Submitted At</th>
                      <th className="py-3 px-6 text-left font-medium rounded-tr-md">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labelRequests.length > 0 ? (
                      labelRequests.map((request) => (
                        <tr
                          key={request.id}
                          onClick={(e) => handleLabelRequestRowClick(request, e)}
                          className={`border-b cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'} ${labelRequestsActionLoading === request.id ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          <td className={`py-4 px-6 font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {request.requestedLabelName}
                          </td>
                          <td className="py-4 px-6">{request.requestingArtist?.artistName || 'N/A'}</td>
                          <td className="py-4 px-6">{formatDate(request.submittedAt)}</td>
                          <td className="py-4 px-6 capitalize"><span className={`px-2 py-1 rounded-full text-xs font-medium ${request.status === 'PENDING' ? 'bg-yellow-200 text-yellow-800' : request.status === 'APPROVED' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{request.status.toLowerCase()}</span></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-4 px-6 text-center">No label requests found {requestsActiveSearchTerm ? 'matching your criteria' : ''}.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end items-center mt-4">
                {labelRequestsTotalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleLabelRequestsPageChange(labelRequestsCurrentPage - 1)}
                      disabled={labelRequestsCurrentPage === 1 || labelRequestsLoading || labelRequestsActionLoading !== null}
                      variant="outline"
                      size="sm">Previous</Button>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Page {labelRequestsCurrentPage} of {labelRequestsTotalPages}</span>
                    <Button
                      onClick={() => handleLabelRequestsPageChange(labelRequestsCurrentPage + 1)}
                      disabled={labelRequestsCurrentPage === labelRequestsTotalPages || labelRequestsLoading || labelRequestsActionLoading !== null}
                      variant="outline"
                      size="sm">Next</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDeleteModal
        item={isBulkDeleteConfirm ? null : (deletingLabel ? { id: deletingLabel.id, name: deletingLabel.name, email: '' } : null)}
        count={isBulkDeleteConfirm ? selectedLabelIds.size : undefined}
        isOpen={isDeleteModalOpen}
        onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingLabel(null);
            setIsBulkDeleteConfirm(false);
        }}
        onConfirm={handleManageDeleteConfirm}
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

      <LabelApproveModal
        isOpen={isLabelApproveModalOpen}
        onClose={() => { setIsLabelApproveModalOpen(false); setLabelRequestToApprove(null); }}
        onConfirm={handleLabelApproveConfirm}
        theme={theme}
        labelName={labelRequestToApprove?.requestedLabelName}
        artistName={labelRequestToApprove?.requestingArtist?.artistName}
      />
      <LabelRejectModal
         isOpen={isLabelRejectModalOpen}
         onClose={() => { setIsLabelRejectModalOpen(false); setLabelRequestIdToReject(null); }}
         onConfirm={handleLabelRejectConfirm}
         theme={theme}
      />
    </div>
  );
}
