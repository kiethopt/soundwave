'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Search, CheckCircle, XCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ArtistRequest } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { RejectModal, ApproveModal } from '@/components/ui/admin-modals';

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
  
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const limit = 10;

  // Fetch data from API
  const fetchRequests = useCallback(async (page: number, searchTerm = '', dateFrom?: string, dateTo?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const filters: any = {
        search: searchTerm
      };
      
      if (dateFrom) {
        filters.startDate = dateFrom;
      }
      
      if (dateTo) {
        filters.endDate = dateTo;
      }
    
      
      const response = await api.admin.getArtistRequests(token, page, limit, filters);
      setRequests(response.requests);
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

  // Khởi tạo và fetch dữ liệu dựa trên sự thay đổi của state
  useEffect(() => {
    fetchRequests(currentPage, activeSearchTerm, startDate, endDate);
  }, [currentPage, activeSearchTerm, startDate, endDate, fetchRequests]);

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
      refreshTable();
    } catch (err: any) {
      console.error('Error approving request:', err);
      toast.error(err.message || 'Failed to approve request.');
    } finally {
      setActionLoading(null);
      setIsApproveModalOpen(false);
      setRequestToApprove(null);
    }
  };

  // Open reject modal for single request
  const handleRejectRequestClick = (request: ArtistRequest) => {
    if (!request) return;
    setRequestIdToReject(request.id);
    setIsBulkReject(false);
    setIsRejectModalOpen(true);
  };

  // Open reject modal for bulk rejection
  const handleBulkRejectClick = () => {
    if (selectedRequestIds.size === 0) {
      toast.error('No requests selected for rejection.');
      return;
    }
    // Ensure current page has selected items before proceeding
    const itemsOnCurrentPage = requests.filter(r => selectedRequestIds.has(r.id)).length;
    if (itemsOnCurrentPage === 0 && selectedRequestIds.size > 0) {
        toast.error('Selection includes items from other pages. Please reject per page or clear selection.');
        return;
    }

    setIsBulkReject(true);
    setIsRejectModalOpen(true);
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

  return (
    <div className={`container mx-auto space-y-6 p-4 pb-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Artist Requests
        </h1>
        <p className={`text-muted-foreground ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
          Manage and process artist verification requests
        </p>
      </div>

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

      {/* Table */}
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
              <th className="py-3 px-6 text-left font-medium">Requested At</th>
              <th className="py-3 px-6 rounded-tr-md text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className={`py-8 text-center ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                  Loading artist requests...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={5} className={`py-8 text-center ${theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-500'}`}>
                  No artist requests found
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr
                  key={request.id}
                  onClick={(e) => handleRowClick(request, e)}
                  className={`border-b cursor-pointer transition-opacity ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'} ${selectedRequestIds.has(request.id) ? (theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-50') : ''} ${actionLoading === request.id ? 'opacity-50 pointer-events-none' : ''}`}
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
                  <td className="py-4 px-6">{formatDate(request.verificationRequestedAt)}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`text-green-600 hover:bg-green-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-green-500/20' : 'hover:bg-green-100'}`}
                        onClick={(e) => { e.stopPropagation(); handleAction('approve', request); }}
                        aria-label={`Approve request from ${request.artistName}`}
                        disabled={loading || actionLoading !== null}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`text-red-600 hover:bg-red-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                        onClick={(e) => { e.stopPropagation(); handleAction('reject', request); }}
                        aria-label={`Reject request from ${request.artistName}`}
                        disabled={loading || actionLoading !== null}
                      >
                        <XCircle className="h-4 w-4" />
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
                          <DropdownMenuItem onClick={(e) => {e.stopPropagation(); handleAction('view', request); }} disabled={loading || actionLoading === request.id}>
                            <Search className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className={theme === 'dark' ? 'bg-gray-600' : ''} />
                          <DropdownMenuItem 
                            onClick={(e) => {e.stopPropagation(); handleAction('approve', request)}}
                            className={cn(
                              "focus:bg-opacity-50",
                              theme === 'light'
                                ? "text-green-700 focus:text-green-800 focus:bg-green-100"
                                : "text-green-400 focus:bg-green-500/20 focus:text-green-300",
                            )}
                            disabled={loading || actionLoading === request.id}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" /> Approve Request
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {e.stopPropagation(); handleAction('reject', request)}}
                            className={cn(
                              theme === 'light'
                                ? "text-red-600 focus:text-red-700 focus:bg-red-100"
                                : "text-red-400 focus:bg-red-500/20 focus:text-red-300",
                            )}
                            disabled={loading || actionLoading === request.id}
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Reject Request
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
              onClick={handleBulkRejectClick}
              variant="destructive"
              size="default"
              disabled={loading || actionLoading === 'bulk'}
              className={`${theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : ''}`}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Reject Selected ({selectedRequestIds.size})
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

      {/* Rejection Reason Modal */}
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

      {/* Approve Modal */}
      <ApproveModal
        isOpen={isApproveModalOpen}
        onClose={() => {
          setIsApproveModalOpen(false);
          setRequestToApprove(null);
        }}
        onConfirm={handleApproveConfirm}
        theme={theme}
        artistName={requestToApprove?.artistName}
      />
    </div>
  );
} 