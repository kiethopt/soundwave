'use client';

import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import { Report, ReportStatus, ReportType } from '@/types';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';

export default function UserReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    fetchReports();
  }, [currentPage]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('Authentication required');
        router.push('/login');
        return;
      }

      const response = await api.reports.getUserReports(token, currentPage, 10);

      if (response.reports && response.pagination) {
        setReports(response.reports);
        setTotalPages(response.pagination.totalPages);
      } else {
        toast.error('Failed to fetch reports');
      }
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      toast.error(error.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (report: Report) => {
    setSelectedReport(report);
    setIsDetailOpen(true);
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
    if (report.track) {
      return (
        <div className="flex flex-col">
          <span className={`font-medium ${theme === 'dark' ? 'text-neutral-100' : ''}`}>{report.track.title}</span>
          <span className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-neutral-400'}`}>Track by {report.track.artist.artistName}</span>
        </div>
      );
    } else if (report.album) {
      return (
        <div className="flex flex-col">
          <span className={`font-medium ${theme === 'dark' ? 'text-neutral-100' : ''}`}>{report.album.title}</span>
          <span className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-neutral-400'}`}>Album by {report.album.artist.artistName}</span>
        </div>
      );
    } else if (report.playlist) {
      return (
        <div className="flex flex-col">
          <span className={`font-medium ${theme === 'dark' ? 'text-neutral-100' : ''}`}>{report.playlist.name}</span>
          <span className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-neutral-400'}`}>Playlist by {report.playlist.user.name || report.playlist.user.username}</span>
        </div>
      );
    }
    return <span className={`${theme === 'dark' ? 'text-neutral-100' : ''}`}>Unknown Entity</span>;
  };

  return (
    <div className="container mx-auto py-8">
      <Card className={theme === 'dark' ? 'bg-neutral-800/70 border-neutral-700' : undefined}>
        <CardHeader>
          <CardTitle className={theme === 'dark' ? 'text-neutral-100' : undefined}>My Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-neutral-300' : ''}`}>Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-neutral-300' : ''}`}>You haven't submitted any reports yet.</div>
          ) : (
            <>
              <div className={`w-full rounded-md border ${theme === 'light' ? 'border-gray-200' : 'border-neutral-700'}`}>
                <table className="w-full">
                  <thead>
                    <tr className={`${theme === 'light' ? 'bg-gray-50 text-gray-600' : 'bg-neutral-700/60 text-neutral-200'}`}>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Content Reported</th>
                      <th className="px-4 py-3 text-left">Submitted</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'light' ? 'divide-gray-200' : 'divide-neutral-700'}`}>
                    {reports.map((report) => (
                      <tr 
                        key={report.id} 
                        className={`${theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-neutral-700 text-neutral-200'}`}
                      >
                        <td className="px-4 py-3">{getReportTypeBadge(report.type)}</td>
                        <td className="px-4 py-3">{getStatusBadge(report.status)}</td>
                        <td className="px-4 py-3">{getEntityTypeAndName(report)}</td>
                        <td className="px-4 py-3">
                          {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(report)}
                            className={theme === 'dark' ? 'bg-neutral-700 border-neutral-600 hover:bg-neutral-600 text-neutral-50' : undefined}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-neutral-300'}`}>
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage <= 1}
                    className={theme === 'dark' ? 'bg-neutral-700 border-neutral-600 hover:bg-neutral-600 text-neutral-50' : undefined}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    className={theme === 'dark' ? 'bg-neutral-700 border-neutral-600 hover:bg-neutral-600 text-neutral-50' : undefined}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className={`max-w-3xl ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-neutral-100' : ''}`}>
          <DialogHeader>
            <DialogTitle className={theme === 'dark' ? 'text-neutral-100' : undefined}>Report Details</DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className={`text-sm font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-neutral-300'}`}>Type</h3>
                  <div>{getReportTypeBadge(selectedReport.type)}</div>
                </div>
                <div>
                  <h3 className={`text-sm font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-neutral-300'}`}>Status</h3>
                  <div>{getStatusBadge(selectedReport.status)}</div>
                </div>
              </div>

              <div>
                <h3 className={`text-sm font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-neutral-300'}`}>Description</h3>
                <p className={`rounded-md p-3 ${theme === 'light' ? 'bg-gray-100' : 'bg-neutral-700 text-neutral-200'}`}>
                  {selectedReport.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className={`text-sm font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-neutral-300'}`}>Date Submitted</h3>
                  <p className={theme === 'dark' ? 'text-neutral-200' : undefined}>{new Date(selectedReport.createdAt).toLocaleString()}</p>
                </div>
                {selectedReport.status !== 'PENDING' && (
                  <div>
                    <h3 className={`text-sm font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-neutral-300'}`}>Date Resolved</h3>
                    <p className={theme === 'dark' ? 'text-neutral-200' : undefined}>
                      {selectedReport.resolvedAt
                        ? new Date(selectedReport.resolvedAt).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              {selectedReport.status !== 'PENDING' && selectedReport.resolution && (
                <div>
                  <h3 className={`text-sm font-medium mb-1 ${theme === 'light' ? 'text-gray-700' : 'text-neutral-300'}`}>Resolution</h3>
                  <p className={`rounded-md p-3 ${theme === 'light' ? 'bg-gray-100' : 'bg-neutral-700 text-neutral-200'}`}>
                    {selectedReport.resolution}
                  </p>
                </div>
              )}

              {selectedReport.status === 'PENDING' && (
                <div className={`rounded-md p-3 text-sm ${theme === 'dark' ? 'bg-blue-900/30 border border-blue-700/50 text-blue-200' : 'bg-blue-500/10 border border-blue-500/20'}`}>
                  <p>
                    Your report is being reviewed by our team. We'll update you when a decision
                    has been made.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 