'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/utils/api';
import { Report, ReportStatus, ReportType } from '@/types';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Flag, Trash2, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ReportDetailModal, ResolveReportModal, ConfirmDeleteModal } from '@/components/ui/admin-modals';

// Define constants for filter values
const ALL_TYPES = 'ALL_TYPES';
const ALL_STATUSES = 'ALL_STATUSES';

interface SortConfig {
  key: keyof Report | null;
  direction: 'asc' | 'desc';
}

export default function ReportsPage() {
  const { theme } = useTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>(ALL_TYPES);
  const [filterStatus, setFilterStatus] = useState<string>(ALL_STATUSES);
  
  // Sort configuration
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  
  // Detail view and resolution
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);

  const limit = 10;

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('Authentication required');
        setError('Authentication required');
        return;
      }

      const filters: { type?: string; status?: string; search?: string } = {};
      if (filterType !== ALL_TYPES) filters.type = filterType;
      if (filterStatus !== ALL_STATUSES) filters.status = filterStatus;
      if (activeSearchTerm) filters.search = activeSearchTerm;

      // Add sort parameters
      let sortParams = '';
      if (sortConfig.key) {
        sortParams = `&sortBy=${sortConfig.key}&sortOrder=${sortConfig.direction}`;
      }

      const response = await api.reports.getAllReports(token, currentPage, limit, filters);

      if (response.reports && response.pagination) {
        setReports(response.reports);
        setTotalPages(response.pagination.totalPages);
      } else {
        toast.error('Failed to fetch reports');
        setError('Failed to fetch reports');
      }
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      toast.error(error.message || 'Failed to fetch reports');
      setError(error.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterType, filterStatus, activeSearchTerm, sortConfig]);

  const refreshTable = useCallback(() => {
    fetchReports();
    setSelectedReportIds(new Set());
  }, [fetchReports]);

  useEffect(() => {
    refreshTable();
  }, [refreshTable]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSearchTerm, filterType, filterStatus, sortConfig]);

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setActiveSearchTerm(searchInput);
  };

  const handleSort = (key: keyof Report | null) => {
    if (!key) return;
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const allIds = new Set(reports.map(r => r.id));
      setSelectedReportIds(allIds);
    } else {
      setSelectedReportIds(new Set());
    }
  };

  const handleSelectRow = (reportId: string, checked: boolean | 'indeterminate') => {
    setSelectedReportIds(prev => {
      const newSet = new Set(prev);
      if (checked === true) {
        newSet.add(reportId);
      } else {
        newSet.delete(reportId);
      }
      return newSet;
    });
  };

  const handleViewDetails = (report: Report) => {
    setSelectedReport(report);
    setIsDetailOpen(true);
  };

  const handleOpenResolve = (report: Report) => {
    setSelectedReport(report);
    setIsResolveOpen(true);
  };

  const handleOpenDeleteModal = (report: Report) => {
    setReportToDelete(report);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;

    setActionLoading(reportToDelete.id);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('Authentication required');
        setActionLoading(null);
        return;
      }
      await api.reports.deleteReport(reportToDelete.id, token);
      toast.success('Report deleted successfully');
      setIsDeleteModalOpen(false);
      setReportToDelete(null);
      refreshTable();
    } catch (error: any) {
      console.error('Error deleting report:', error);
      toast.error(error.message || 'Failed to delete report');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveReport = async (reportId: string, data: { status: ReportStatus; resolution: string }) => {
    try {
      setActionLoading(reportId);
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await api.reports.resolveReport(reportId, data, token);

      if (response.message && response.report) {
        toast.success(response.message);
        setReports((prevReports) =>
          prevReports.map((r) => (r.id === response.report.id ? response.report : r))
        );
        setIsResolveOpen(false);
        if (data.status === 'REJECTED' || data.status === 'RESOLVED') {
          setIsDetailOpen(false); 
        }
      } else {
        toast.success(response.message || 'Report processed successfully');
        fetchReports();
        setIsResolveOpen(false);
        if (data.status === 'REJECTED' || data.status === 'RESOLVED') {
          setIsDetailOpen(false);
        }
      }
    } catch (error: any) {
      console.error('Error resolving report:', error);
      toast.error(error.message || 'Failed to process report');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            Pending
          </Badge>
        );
      case 'RESOLVED':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Resolved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReportTypeBadge = (type: ReportType) => {
    switch (type) {
      case 'COPYRIGHT_VIOLATION':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            Copyright
          </Badge>
        );
      case 'INAPPROPRIATE_CONTENT':
        return (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
            Inappropriate
          </Badge>
        );
      case 'AI_GENERATION_ISSUE':
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
            AI Issue
          </Badge>
        );
      case 'OTHER':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            Other
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getEntityTypeAndName = (report: Report) => {
    const textMutedClass = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    const textPrimaryClass = theme === 'dark' ? 'text-white' : 'text-gray-900';

    if (report.track) {
      return (
        <div className="flex flex-col">
          <span className={`font-medium ${textPrimaryClass}`}>{report.track.title}</span>
          <span className={`text-sm ${textMutedClass}`}>Track by {report.track.artist.artistName}</span>
        </div>
      );
    } else if (report.album) {
      return (
        <div className="flex flex-col">
          <span className={`font-medium ${textPrimaryClass}`}>{report.album.title}</span>
          <span className={`text-sm ${textMutedClass}`}>Album by {report.album.artist.artistName}</span>
        </div>
      );
    } else if (report.playlist) {
      return (
        <div className="flex flex-col">
          <span className={`font-medium ${textPrimaryClass}`}>{report.playlist.name}</span>
          <span className={`text-sm ${textMutedClass}`}>Playlist by {report.playlist.user.name || report.playlist.user.username}</span>
        </div>
      );
    } else if (report.type === 'OTHER') {
      return (
        <div className="flex flex-col">
          <span className={`font-medium ${textPrimaryClass}`}>Other (Platform Issue / Feedback)</span>
          <span className={`text-sm ${textMutedClass}`}>General report</span>
        </div>
      );
    }
    return <span className={textPrimaryClass}>Uncategorized Entity</span>;
  };

  const handleRowClick = (report: Report, e: React.MouseEvent<HTMLTableRowElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[role="checkbox"]') || target.closest('[data-radix-dropdown-menu-trigger]') || target.closest('button')) {
      return;
    }
    handleViewDetails(report);
  };

  const isAllSelected = reports.length > 0 && selectedReportIds.size === reports.length;
  const isIndeterminate = selectedReportIds.size > 0 && selectedReportIds.size < reports.length;

  return (
    <div className={`container mx-auto space-y-6 p-4 pb-20 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className="mb-6">
        <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Reports Management
        </h1>
        <p className={`text-muted-foreground ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
          Manage and resolve user-submitted reports
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
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className={`w-[160px] rounded-md h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600 text-white' : ''}>
              <SelectItem value={ALL_TYPES}>All Types</SelectItem>
              <SelectItem value="COPYRIGHT_VIOLATION">Copyright Violation</SelectItem>
              <SelectItem value="INAPPROPRIATE_CONTENT">Inappropriate Content</SelectItem>
              <SelectItem value="AI_GENERATION_ISSUE">AI Generation Issue</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className={`w-[160px] rounded-md h-10 ${theme === 'dark' ? 'bg-[#3a3a3a] border-gray-600 text-white' : 'border-gray-300'}`}>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-600 text-white' : ''}>
              <SelectItem value={ALL_STATUSES}>All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && !selectedReport && <p>Loading reports...</p>}
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
                  
                  {/* Type column */}
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
                  
                  {/* Status column */}
                  <th 
                    scope="col" 
                    className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {sortConfig.key === 'status' ? (
                        sortConfig.direction === 'asc' ?
                          <ArrowUp className="ml-2 h-3 w-3" /> :
                          <ArrowDown className="ml-2 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-2 h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                  
                  {/* Entity column (not sortable) */}
                  <th scope="col" className="py-3 px-6 w-[250px]">Entity</th>
                  
                  {/* Reporter column */}
                  <th scope="col" className="py-3 px-6">Reported By</th>
                  
                  {/* Created At column */}
                  <th 
                    scope="col" 
                    className={`py-3 px-6 cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      Submitted
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
                {reports.length > 0 ? (
                  reports.map((report) => (
                    <tr
                      key={report.id}
                      onClick={(e) => handleRowClick(report, e)}
                      className={`border-b cursor-pointer ${theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'} ${
                        selectedReportIds.has(report.id) ? (theme === 'dark' ? 'bg-gray-700/50' : 'bg-blue-50') : ''
                      } ${actionLoading === report.id ? 'opacity-50 pointer-events-none' : ''} ${
                        report.status === 'PENDING' ? 
                          (theme === 'dark' ? 'bg-yellow-900/20 hover:bg-yellow-800/30' : 'bg-yellow-100/50 hover:bg-yellow-200/50') : 
                          ''
                      }`}
                    >
                      <td className="w-4 p-4">
                        <Checkbox
                          id={`select-row-${report.id}`}
                          checked={selectedReportIds.has(report.id)}
                          onCheckedChange={(checked) => handleSelectRow(report.id, checked)}
                          aria-label={`Select row for report ${report.id}`}
                          className={`${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'}`}
                          disabled={loading || actionLoading !== null}
                        />
                      </td>
                      <td className="py-4 px-6">{getReportTypeBadge(report.type)}</td>
                      <td className="py-4 px-6">{getStatusBadge(report.status)}</td>
                      <td className="py-4 px-6">{getEntityTypeAndName(report)}</td>
                      <td className="py-4 px-6">
                        {report.reporter.name || report.reporter.username || report.reporter.email}
                      </td>
                      <td className="py-4 px-6">
                        {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`text-red-600 hover:bg-red-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-red-500/20' : 'hover:bg-red-100'}`}
                            onClick={(e) => { e.stopPropagation(); handleOpenDeleteModal(report); }}
                            aria-label={`Delete report`}
                            disabled={loading || actionLoading !== null}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {report.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`text-green-600 hover:bg-green-100/10 h-8 w-8 p-0 ${theme === 'dark' ? 'hover:bg-green-500/20' : 'hover:bg-green-100'}`}
                              onClick={(e) => { e.stopPropagation(); handleOpenResolve(report); }}
                              aria-label={`Resolve report`}
                              disabled={loading || actionLoading !== null}
                            >
                              <Flag className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-4 px-6 text-center">No reports found {activeSearchTerm || filterType !== ALL_TYPES || filterStatus !== ALL_STATUSES ? 'matching your criteria' : ''}.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="min-w-[200px]">
              {selectedReportIds.size > 0 && (
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {selectedReportIds.size} report(s) selected
                </span>
              )}
            </div>
            <div className="flex justify-end">
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage <= 1 || loading || actionLoading !== null}
                    variant="outline"
                    size="sm">
                    Previous
                  </Button>
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage >= totalPages || loading || actionLoading !== null}
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

      {/* Use the extracted modals */}
      <ReportDetailModal
        report={selectedReport}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onResolve={handleOpenResolve}
        theme={theme}
      />

      <ResolveReportModal
        report={selectedReport}
        isOpen={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        onSubmit={handleResolveReport}
        theme={theme}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setReportToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        item={reportToDelete ? { id: reportToDelete.id, name: `Report ID: ${reportToDelete.id}`, email: '' } : null} // Adapt item structure as needed by ConfirmDeleteModal
        entityType="report"
        theme={theme}
      />
    </div>
  );
} 