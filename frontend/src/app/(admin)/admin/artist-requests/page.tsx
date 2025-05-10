'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ArtistRequest, ArtistClaimRequest } from '@/types';
import { RejectModal, ApproveModal, ConfirmDeleteModal } from '@/components/ui/admin-modals';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function ArtistRequestManagement() {
  const { theme } = useTheme();
  const router = useRouter();
  const [requests, setRequests] = useState<ArtistRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [requestIdToReject, setRequestIdToReject] = useState<string | null>(null);
  const [isBulkReject, setIsBulkReject] = useState(false);
  
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [requestToApprove, setRequestToApprove] = useState<ArtistRequest | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<ArtistRequest | null>(null);
  
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const limit = 10;

  // Tab state
  const [activeTab, setActiveTab] = useState<'artist' | 'claim'>('artist');

  // Claim request state
  const [claimRequests, setClaimRequests] = useState<ArtistClaimRequest[]>([]);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimCurrentPage, setClaimCurrentPage] = useState(1);
  const [claimTotalPages, setClaimTotalPages] = useState(1);
  const [claimSelectedIds, setClaimSelectedIds] = useState<Set<string>>(new Set());
  const [claimActionLoading, setClaimActionLoading] = useState<string | null>(null);
  const [isClaimApproveModalOpen, setIsClaimApproveModalOpen] = useState(false);
  const [isClaimRejectModalOpen, setIsClaimRejectModalOpen] = useState(false);
  const [claimRequestToApprove, setClaimRequestToApprove] = useState<ArtistClaimRequest | null>(null);
  const [claimRequestIdToReject, setClaimRequestIdToReject] = useState<string | null>(null);
  const [isClaimBulkReject, setIsClaimBulkReject] = useState(false);

  // Claim select all logic
  const isAllClaimSelected = claimRequests.length > 0 && claimSelectedIds.size === claimRequests.length;
  const isClaimIndeterminate = claimSelectedIds.size > 0 && claimSelectedIds.size < claimRequests.length;
  const handleSelectAllClaimRows = (checked: boolean | 'indeterminate') => {
    if (checked) {
      const allIds = new Set(claimRequests.map(request => request.id));
      setClaimSelectedIds(allIds);
    } else {
      setClaimSelectedIds(new Set());
    }
  };

  // Fetch data from API
  const fetchRequests = useCallback(async (page: number, searchTerm = '', dateFrom?: string, dateTo?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const filters: any = {
        search: searchTerm,
        // status: RequestStatus.PENDING // Example if we want to send status filter
      };
      
      if (dateFrom) {
        filters.startDate = dateFrom;
      }
      
      if (dateTo) {
        filters.endDate = dateTo;
      }
    
      // Use the new API endpoint for artist role requests
      const response = await api.admin.getArtistRoleRequests(token, page, limit, filters);
      // Assuming the response structure is { requests: ArtistRequest[], pagination: { totalPages: number } }
      // The type ArtistRequest in frontend/src/types/index.ts might need an update
      // to match the fields selected by getPendingArtistRoleRequests in admin.service.ts
      // (id, artistName, bio, status, requestedLabelName, user)
      setRequests(response.requests as ArtistRequest[]); // Cast for now, ensure type alignment
      setTotalPages(response.pagination.totalPages);
      setActiveSearchTerm(searchTerm);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch artist requests');
      setRequests([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Fetch claim requests
  const fetchClaimRequests = useCallback(async (page: number, searchTerm = '', dateFrom?: string, dateTo?: string) => {
    setClaimLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('Authentication required');
      const filters: any = { search: searchTerm };
      if (dateFrom) filters.startDate = dateFrom;
      if (dateTo) filters.endDate = dateTo;
      const response = await api.admin.getArtistClaimRequests(token, page, limit, filters);
      setClaimRequests(response.claimRequests);
      setClaimTotalPages(response.pagination.totalPages);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch claim requests');
      setClaimRequests([]);
      setClaimTotalPages(1);
    } finally {
      setClaimLoading(false);
    }
  }, [limit]);

  // Khởi tạo và fetch dữ liệu dựa trên sự thay đổi của state
  useEffect(() => {
    if (activeTab === 'artist') {
      fetchRequests(currentPage, activeSearchTerm, startDate, endDate);
    } else {
      fetchClaimRequests(claimCurrentPage, activeSearchTerm, startDate, endDate);
    }
    // eslint-disable-next-line
  }, [activeTab, currentPage, claimCurrentPage, activeSearchTerm, startDate, endDate]);

  // Handle page navigation
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Handle search form submission - update state, reset page
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearchTerm(searchInput);
    setCurrentPage(1);
  };

  // Handle date range changes
  const handleDateRangeChange = (dates: { startDate: string; endDate: string }) => {
    setStartDate(dates.startDate);
    setEndDate(dates.endDate);
    setCurrentPage(1);
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return 'Invalid Date';
    }
  };

  // Row selection handling
  const handleSelectRow = (id: string, checked: boolean | 'indeterminate') => {
    const newSelection = new Set(selectedRequestIds);
    if (checked === true) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedRequestIds(newSelection);
  };

  // Select all rows
  const handleSelectAllRows = (checked: boolean | 'indeterminate') => {
    if (checked) {
      const allIds = new Set(requests.map(request => request.id));
      setSelectedRequestIds(allIds);
    } else {
      setSelectedRequestIds(new Set());
    }
  };

  // Row click handler
  const handleRowClick = (request: ArtistRequest, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[role="checkbox"]') || target.closest('[data-radix-dropdown-menu-trigger]') || target.closest('button')) {
      return;
    }
    router.push(`/admin/artist-requests/${request.id}`);
  };

  // Refresh table data
  const refreshTable = useCallback(() => {
    fetchRequests(currentPage, activeSearchTerm, startDate, endDate);
    setSelectedRequestIds(new Set());
  }, [currentPage, activeSearchTerm, startDate, endDate, fetchRequests]);

  // Open approve modal
  const handleApproveRequestClick = (request: ArtistRequest) => {
    if (!request) return;
    setRequestToApprove(request);
    setIsApproveModalOpen(true);
  };

  // Handle approve artist request
  const handleApproveConfirm = async () => {
    if (!requestToApprove) return;

    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      setIsApproveModalOpen(false);
      return;
    }
    
    setActionLoading(requestToApprove.id);
    try {
      await api.admin.approveArtistRequest(requestToApprove.id, token);
      toast.success(`${requestToApprove.artistName} approved successfully!`);
    } catch (err: any) {
      console.error('Error approving request:', err);
      // Check for the specific backend error message
      if (err.message && err.message.includes('Artist request not found, already verified, or rejected')) {
        toast.error('Could not approve: Request may have already been processed or deleted.');
      } else {
        toast.error(err.message || 'Failed to approve request.');
      }
    } finally {
      setActionLoading(null);
      setIsApproveModalOpen(false);
      setRequestToApprove(null);
      refreshTable();
    }
  };

  // Open reject modal for single request
  const handleRejectRequestClick = (request: ArtistRequest) => {
    if (!request) return;
    setRequestIdToReject(request.id);
    setIsBulkReject(false);
    setIsRejectModalOpen(true);
  };

  // Open delete modal for bulk deletion
  const handleBulkDeleteClick = () => {
    if (selectedRequestIds.size === 0) {
      toast.error('No requests selected for deletion.');
      return;
    }
    // Ensure current page has selected items before proceeding
    const itemsOnCurrentPage = requests.filter(r => selectedRequestIds.has(r.id)).length;
    if (itemsOnCurrentPage === 0 && selectedRequestIds.size > 0) {
        toast.error('Selection includes items from other pages. Please delete per page or clear selection.');
        return;
    }

    setIsBulkDelete(true);
    setIsDeleteModalOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async (ids: string[]) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      setIsDeleteModalOpen(false);
      return;
    }

    try {
      setActionLoading('bulk');
      
      if (isBulkDelete) {
        const promises = Array.from(selectedRequestIds).map(id => 
          api.admin.deleteArtistRequest(id, token)
        );
        await Promise.all(promises);
        toast.success(`${selectedRequestIds.size} requests deleted successfully!`);
        setSelectedRequestIds(new Set());
      } else if (requestToDelete) {
        await api.admin.deleteArtistRequest(requestToDelete.id, token);
        toast.success(`${requestToDelete.artistName || 'Request'} deleted successfully!`);
      }
      
      refreshTable();
    } catch (err: any) {
      console.error('Error deleting request(s):', err);
      toast.error(err.message || 'Failed to delete request(s).');
    } finally {
      setActionLoading(null);
      setIsDeleteModalOpen(false);
      setRequestToDelete(null);
      setIsBulkDelete(false);
    }
  };

  // Handle reject confirmation
  const handleRejectConfirm = async (reason: string) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      setIsRejectModalOpen(false);
      return;
    }

    try {
      if (isBulkReject) {
        setActionLoading('bulk');
        const promises = Array.from(selectedRequestIds).map(id => 
          api.admin.rejectArtistRequest(id, reason, token)
        );
        await Promise.all(promises);
        toast.success(`${selectedRequestIds.size} requests rejected successfully!`);
        setSelectedRequestIds(new Set());
      } else if (requestIdToReject) {
        setActionLoading(requestIdToReject);
        await api.admin.rejectArtistRequest(requestIdToReject, reason, token);
        const request = requests.find(r => r.id === requestIdToReject);
        toast.success(`${request?.artistName || 'Request'} rejected successfully!`);
      }
      
      refreshTable();
    } catch (err: any) {
      console.error('Error rejecting request(s):', err);
      toast.error(err.message || 'Failed to reject request(s).');
    } finally {
      setActionLoading(null);
      setIsRejectModalOpen(false);
      setRequestIdToReject(null);
      setIsBulkReject(false);
    }
  };

  // --- Generic Action Handler --- 
  const handleAction = (action: 'view' | 'approve' | 'reject', request: ArtistRequest) => {
      if (action === 'view') {
          router.push(`/admin/artist-requests/${request.id}`);
      } else if (action === 'approve') {
          handleApproveRequestClick(request);
      } else if (action === 'reject') {
          handleRejectRequestClick(request);
      }
  };

  const isAllSelected = requests.length > 0 && selectedRequestIds.size === requests.length;
  const isIndeterminate = selectedRequestIds.size > 0 && selectedRequestIds.size < requests.length;

  // Add claim page change handler
  const handleClaimPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= claimTotalPages) {
      setClaimCurrentPage(newPage);
    }
  };

  // Claim approve/reject handlers
  const handleClaimApproveConfirm = async () => {
    if (!claimRequestToApprove) return;
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      setIsClaimApproveModalOpen(false);
      return;
    }
    setClaimActionLoading(claimRequestToApprove.id);
    try {
      await api.admin.approveArtistClaim(claimRequestToApprove.id, token);
      toast.success('Claim request approved successfully!');
      // Remove all claim requests for this artist profile from UI
      setClaimRequests(prev => prev.filter(c => c.artistProfile.id !== claimRequestToApprove.artistProfile.id));
      fetchClaimRequests(claimCurrentPage, activeSearchTerm, startDate, endDate);
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve claim request.');
    } finally {
      setClaimActionLoading(null);
      setIsClaimApproveModalOpen(false);
      setClaimRequestToApprove(null);
    }
  };
  const handleClaimRejectConfirm = async (reason: string) => {
    if (!claimRequestIdToReject) return;
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      setIsClaimRejectModalOpen(false);
      return;
    }
    setClaimActionLoading(claimRequestIdToReject);
    try {
      await api.admin.rejectArtistClaim(claimRequestIdToReject, reason, token);
      toast.success('Claim request rejected successfully!');
      fetchClaimRequests(claimCurrentPage, activeSearchTerm, startDate, endDate);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject claim request.');
    } finally {
      setClaimActionLoading(null);
      setIsClaimRejectModalOpen(false);
      setClaimRequestIdToReject(null);
      setIsClaimBulkReject(false);
    }
  };

  return (
    <div className={`container mx-auto space-y-6 p-4 pb-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Artist & Claim Requests</h1>
        <p className={`text-muted-foreground ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>Manage and process artist verification and claim requests</p>
      </div>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'artist' | 'claim')} className="w-full">
        <TabsList className={`grid w-full grid-cols-2 mb-6 ${theme === 'dark' ? 'bg-gray-800' : ''}`}>
          <TabsTrigger value="artist" className={`flex items-center gap-2 ${theme === 'dark' ? 'data-[state=active]:bg-gray-700 data-[state=active]:text-white' : ''}`}>Artist Requests</TabsTrigger>
          <TabsTrigger value="claim" className={`flex items-center gap-2 ${theme === 'dark' ? 'data-[state=active]:bg-gray-700 data-[state=active]:text-white' : ''}`}>Claim Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="artist" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
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
            <DateRangePicker 
              onChange={handleDateRangeChange} 
              startDate={startDate}
              endDate={endDate}
              className="w-full sm:w-[350px]"
            />
          </div>
          <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className={`w-full text-sm text-left ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <thead className={`text-xs uppercase ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
                <tr>
                  <th scope="col" className="p-4 rounded-tl-md">
                    <Checkbox
                      id="select-all-checkbox"
                      checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
                      onCheckedChange={handleSelectAllRows}
                      aria-label="Select all rows on this page"
                      className={`${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                      disabled={loading || requests.length === 0 || actionLoading !== null}
                    />
                  </th>
                  <th className="py-3 px-6 text-left font-medium">Artist Name</th>
                  <th className="py-3 px-6 text-left font-medium">Email</th>
                  <th className="py-3 px-6 text-left font-medium">Requested Label</th>
                  <th className="py-3 px-6 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className={`py-8 text-center ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                      Loading artist requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={`py-8 text-center ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                      No artist requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr
                      key={request.id}
                      onClick={(e) => handleRowClick(request, e)}
                      className={`border-b cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'} ${selectedRequestIds.has(request.id) ? (theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-50') : ''} ${actionLoading === request.id ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <td className="w-4 p-4">
                        <Checkbox
                          id={`select-row-${request.id}`}
                          checked={selectedRequestIds.has(request.id)}
                          onCheckedChange={(checked) => handleSelectRow(request.id, checked)}
                          aria-label={`Select row for request ${request.artistName}`}
                          className={`${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                          disabled={loading || actionLoading !== null}
                        />
                      </td>
                      <td className={`py-4 px-6 font-medium whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {request.artistName}
                      </td>
                      <td className="py-4 px-6">{request.user?.email || 'N/A'}</td>
                      <td className="py-4 px-6">{request.requestedLabelName || 'N/A'}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          request.status === 'PENDING' ? (theme === 'dark' ? 'bg-yellow-700 text-yellow-100' : 'bg-yellow-100 text-yellow-800') :
                          request.status === 'APPROVED' ? (theme === 'dark' ? 'bg-green-700 text-green-100' : 'bg-green-100 text-green-800') :
                          request.status === 'REJECTED' ? (theme === 'dark' ? 'bg-red-700 text-red-100' : 'bg-red-100 text-red-800') :
                          (theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800')
                        }`}>
                          {request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1).toLowerCase() : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="min-w-[200px]">
              {selectedRequestIds.size > 0 && (
                <Button
                  onClick={handleBulkDeleteClick}
                  variant="destructive"
                  size="default"
                  disabled={loading || actionLoading === 'bulk'}
                  className={`${theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : ''}`}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedRequestIds.size})
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
          <RejectModal
            isOpen={isRejectModalOpen}
            onClose={() => {
              setIsRejectModalOpen(false);
              setRequestIdToReject(null);
              setIsBulkReject(false);
            }}
            onConfirm={handleRejectConfirm}
            theme={theme}
          />
          <ApproveModal
            isOpen={isApproveModalOpen}
            onClose={() => {
              setIsApproveModalOpen(false);
              setRequestToApprove(null);
            }}
            onConfirm={handleApproveConfirm}
            theme={theme}
            itemName={requestToApprove?.artistName}
            itemType="artist request"
          />
          <ConfirmDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setRequestToDelete(null);
              setIsBulkDelete(false);
            }}
            onConfirm={handleDeleteConfirm}
            theme={theme}
            entityType="artist request"
            item={requestToDelete ? { 
              id: requestToDelete.id, 
              name: requestToDelete.artistName, 
              email: requestToDelete.user?.email || ''
            } : null}
            count={isBulkDelete ? selectedRequestIds.size : undefined}
          />
        </TabsContent>
        <TabsContent value="claim" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
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
            <DateRangePicker 
              onChange={handleDateRangeChange} 
              startDate={startDate}
              endDate={endDate}
              className="w-full sm:w-[350px]"
            />
          </div>
          <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className={`w-full text-sm text-left ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <thead className={`text-xs uppercase ${theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-50 text-gray-700'}`}>
                <tr>
                  <th className="p-4 rounded-tl-md">
                    <Checkbox
                      id="select-all-claim-checkbox"
                      checked={isAllClaimSelected ? true : isClaimIndeterminate ? 'indeterminate' : false}
                      onCheckedChange={handleSelectAllClaimRows}
                      aria-label="Select all claim requests on this page"
                      className={theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}
                      disabled={claimLoading || claimRequests.length === 0 || claimActionLoading !== null}
                    />
                  </th>
                  <th className="py-3 px-6 text-left font-medium">Claimed Artist</th>
                  <th className="py-3 px-6 text-left font-medium">Claiming User</th>
                  <th className="py-3 px-6 text-left font-medium">Email</th>
                  <th className="py-3 px-6 text-left font-medium">Submitted At</th>
                  <th className="py-3 px-6 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {claimLoading ? (
                  <tr><td colSpan={7} className="py-8 text-center">Loading claim requests...</td></tr>
                ) : claimRequests.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center">No claim requests found</td></tr>
                ) : (
                  claimRequests.map((claim) => (
                    <tr key={claim.id} className="border-b cursor-pointer" onClick={(e) => {
                      // Only trigger row click if not clicking a button or checkbox
                      const target = e.target as HTMLElement;
                      if (target.closest('button') || target.closest('[role="checkbox"]')) return;
                      router.push(`/admin/artist-requests/claim/${claim.id}`);
                    }}>
                      <td className="w-4 p-4">
                        <Checkbox
                          id={`select-claim-row-${claim.id}`}
                          checked={claimSelectedIds.has(claim.id)}
                          onCheckedChange={(checked) => {
                            const newSet = new Set(claimSelectedIds);
                            if (checked) newSet.add(claim.id); else newSet.delete(claim.id);
                            setClaimSelectedIds(newSet);
                          }}
                          aria-label={`Select row for claim ${claim.artistProfile.artistName}`}
                          className={theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}
                          disabled={claimLoading || claimActionLoading !== null}
                        />
                      </td>
                      <td className="py-4 px-6 font-medium whitespace-nowrap">{claim.artistProfile.artistName}</td>
                      <td className="py-4 px-6">{claim.claimingUser.name || claim.claimingUser.username || claim.claimingUser.email}</td>
                      <td className="py-4 px-6">{claim.claimingUser.email}</td>
                      <td className="py-4 px-6">{formatDate(claim.submittedAt)}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          claim.status === 'PENDING' ? (theme === 'dark' ? 'bg-yellow-700 text-yellow-100' : 'bg-yellow-100 text-yellow-800') :
                          claim.status === 'APPROVED' ? (theme === 'dark' ? 'bg-green-700 text-green-100' : 'bg-green-100 text-green-800') :
                          claim.status === 'REJECTED' ? (theme === 'dark' ? 'bg-red-700 text-red-100' : 'bg-red-100 text-red-800') :
                          (theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800')
                        }`}>
                          {claim.status ? claim.status.charAt(0).toUpperCase() + claim.status.slice(1).toLowerCase() : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="min-w-[200px]">
              {selectedRequestIds.size > 0 && (
                <Button
                  onClick={handleBulkDeleteClick}
                  variant="destructive"
                  size="default"
                  disabled={loading || actionLoading === 'bulk'}
                  className={`${theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : ''}`}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedRequestIds.size})
                </Button>
              )}
            </div>
            <div className="flex justify-end">
              {claimTotalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleClaimPageChange(claimCurrentPage - 1)}
                    disabled={claimCurrentPage === 1 || claimLoading || claimActionLoading !== null}
                    variant="outline"
                    size="sm">
                    Previous
                  </Button>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Page {claimCurrentPage} of {claimTotalPages}
                  </span>
                  <Button
                    onClick={() => handleClaimPageChange(claimCurrentPage + 1)}
                    disabled={claimCurrentPage === claimTotalPages || claimLoading || claimActionLoading !== null}
                    variant="outline"
                    size="sm">
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
          <RejectModal
            isOpen={isClaimRejectModalOpen}
            onClose={() => {
              setIsClaimRejectModalOpen(false);
              setClaimRequestIdToReject(null);
              setIsClaimBulkReject(false);
            }}
            onConfirm={handleClaimRejectConfirm}
            theme={theme}
          />
          <ApproveModal
            isOpen={isClaimApproveModalOpen}
            onClose={() => {
              setIsClaimApproveModalOpen(false);
              setClaimRequestToApprove(null);
            }}
            onConfirm={handleClaimApproveConfirm}
            theme={theme}
            itemName={claimRequestToApprove?.artistProfile.artistName}
            itemType="artist claim"
          />
          <ConfirmDeleteModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setRequestToDelete(null);
              setIsBulkDelete(false);
            }}
            onConfirm={handleDeleteConfirm}
            theme={theme}
            entityType="artist request"
            item={requestToDelete ? { 
              id: requestToDelete.id, 
              name: requestToDelete.artistName, 
              email: requestToDelete.user?.email || ''
            } : null}
            count={isBulkDelete ? selectedRequestIds.size : undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 