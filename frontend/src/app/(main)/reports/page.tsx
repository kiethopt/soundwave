'use client';

import { useEffect, useState, FormEvent } from 'react';
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
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Music, Album, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Define the platform report types for the dropdown
const platformReportTypeOptions = [
  { value: 'ACCOUNT_ISSUE', label: 'Account Issue' },
  { value: 'BUG_REPORT', label: 'Bug Report' },
  { value: 'GENERAL_FEEDBACK', label: 'General Feedback' },
  { value: 'UI_UX_ISSUE', label: 'UI/UX Issue' },
  { value: 'OTHER', label: 'Other' },
] as const; // Use 'as const' for stricter typing of values

export default function UserReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isGeneralReportOpen, setIsGeneralReportOpen] = useState(false);
  const [generalReportDescription, setGeneralReportDescription] = useState('');
  const [selectedPlatformReportType, setSelectedPlatformReportType] = useState<typeof platformReportTypeOptions[number]['value']>(platformReportTypeOptions[0].value);
  const [submittingGeneralReport, setSubmittingGeneralReport] = useState(false);
  const { theme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check user access and redirect if Admin or Artist
  useEffect(() => {
    const checkAccess = () => {
      try {
        const userData = localStorage.getItem('userData');
        if (!userData) {
          router.push('/login');
          return;
        }

        const user = JSON.parse(userData);
        
        // Redirect Admins to admin dashboard
        if (user.role === 'ADMIN') {
          router.push('/admin/dashboard');
          return;
        }
        
        // Redirect Artists to artist dashboard
        if (user.currentProfile === 'ARTIST') {
          router.push('/artist/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking user access:', error);
        router.push('/');
      }
    };

    checkAccess();
  }, [router]);

  useEffect(() => {
    fetchReports();
  }, [currentPage]);

  useEffect(() => {
    const reportId = searchParams.get('reportId');
    if (reportId && reports.length > 0) {
      const report = reports.find(r => r.id === reportId);
      if (report) {
        handleViewDetails(report);
      }
    }
  }, [reports, searchParams]);

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

        // Check if there's a reportId in the URL after loading reports
        const reportId = searchParams.get('reportId');
        if (reportId) {
          const report = response.reports.find((r: Report) => r.id === reportId);
          if (report) {
            setSelectedReport(report);
            setIsDetailOpen(true);
          }
        }
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
      case 'ACCOUNT_ISSUE':
        return (
          <Badge variant="outline" className="bg-sky-500/10 text-sky-500 border-sky-500/20">
            Account
          </Badge>
        );
      case 'BUG_REPORT':
        return (
          <Badge variant="outline" className="bg-pink-500/10 text-pink-500 border-pink-500/20">
            Bug
          </Badge>
        );
      case 'GENERAL_FEEDBACK':
        return (
          <Badge variant="outline" className="bg-teal-500/10 text-teal-500 border-teal-500/20">
            Feedback
          </Badge>
        );
      case 'UI_UX_ISSUE':
        return (
          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
            UI/UX
          </Badge>
        );
      case 'OTHER':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            Other
          </Badge>
        );
      default:
        // Fallback for any unhandled types, displays the raw type value
        // It's good practice to ensure all enum members are handled above
        return <Badge variant="outline">{String(type)}</Badge>; 
    }
  };

  const getEntityTypeAndName = (report: Report) => {
    const primaryTextClass = `font-medium ${theme === 'dark' ? 'text-neutral-100' : ''}`;
    const secondaryTextClass = `text-sm ${theme === 'light' ? 'text-gray-500' : 'text-neutral-400'}`;

    if (report.track) {
      return (
        <div className="flex flex-col">
          <span className={primaryTextClass}>{report.track.title}</span>
          <span className={secondaryTextClass}>Track by {report.track.artist.artistName}</span>
        </div>
      );
    } else if (report.album) {
      return (
        <div className="flex flex-col">
          <span className={primaryTextClass}>{report.album.title}</span>
          <span className={secondaryTextClass}>Album by {report.album.artist.artistName}</span>
        </div>
      );
    } else if (report.playlist) {
      return (
        <div className="flex flex-col">
          <span className={primaryTextClass}>{report.playlist.name}</span>
          <span className={secondaryTextClass}>Playlist by {report.playlist.user.name || report.playlist.user.username}</span>
        </div>
      );
    } else {
      // Handle reports not tied to a specific entity (Track, Album, Playlist)
      const platformReportOption = platformReportTypeOptions.find(option => option.value === report.type);

      if (platformReportOption) {
        let subText = 'Platform issue'; // Default subtext
        if (platformReportOption.value === 'GENERAL_FEEDBACK') {
          subText = 'General feedback';
        }

        return (
          <div className="flex flex-col">
            <span className={primaryTextClass}>{platformReportOption.label}</span>
            <span className={secondaryTextClass}>{subText}</span>
          </div>
        );
      } else {
        // Fallback for any other types that might not have an entity or are not in platformReportTypeOptions
        const formattedType = String(report.type)
          .toLowerCase()
          .replace(/_/g, ' ')
          .replace(/\b\w/g, char => char.toUpperCase());
        
        // Determine subtext for fallback cases as well
        let subText = 'Platform issue'; // Default subtext for fallback
        if (String(report.type) === 'GENERAL_FEEDBACK') { // Check original enum value string
          subText = 'General feedback';
        }

        return (
          <div className="flex flex-col">
            <span className={primaryTextClass}>{formattedType}</span>
            <span className={secondaryTextClass}>{subText}</span>
          </div>
        );
      }
    }
  };

  const handleOpenGeneralReportDialog = () => {
    setGeneralReportDescription('');
    setSelectedPlatformReportType(platformReportTypeOptions[0].value);
    setIsGeneralReportOpen(true);
  };

  const handleSubmitGeneralReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!generalReportDescription.trim()) {
      toast.error('Please provide a description for your report.');
      return;
    }
    setSubmittingGeneralReport(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('Authentication required');
        router.push('/login');
        return;
      }
      await api.reports.create(
        {
          type: selectedPlatformReportType as ReportType,
          description: generalReportDescription,
        },
        token
      );
      toast.success('Your report has been submitted. Thank you!');
      setIsGeneralReportOpen(false);
      setGeneralReportDescription('');
      fetchReports();
    } catch (error: any) {
      console.error('Error submitting general report:', error);
      toast.error(error.message || 'Failed to submit report');
    } finally {
      setSubmittingGeneralReport(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className={theme === 'dark' ? 'bg-neutral-800/70 border-neutral-700' : undefined}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className={theme === 'dark' ? 'text-neutral-100' : undefined}>My Reports</CardTitle>
            <Button 
              variant="outline"
              onClick={handleOpenGeneralReportDialog}
              className={theme === 'dark' ? 'bg-neutral-700 border-neutral-600 hover:bg-neutral-600 text-neutral-50' : undefined}
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Report a Platform Issue
            </Button>
          </div>
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
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${theme === 'light' ? 'divide-gray-200' : 'divide-neutral-700'}`}>
                    {reports.map((report) => (
                      <tr 
                        key={report.id} 
                        onClick={() => handleViewDetails(report)}
                        className={`cursor-pointer ${theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-neutral-700 text-neutral-200'} ${ 
                          (report.status === 'RESOLVED' || report.status === 'REJECTED') && report.resolvedAt && 
                          (new Date().getTime() - new Date(report.resolvedAt).getTime() < 7 * 24 * 60 * 60 * 1000) ? 
                            (theme === 'light' ? 'bg-blue-50 hover:bg-blue-100' : 'bg-blue-900/20 hover:bg-blue-800/30') : ''
                        }`}
                      >
                        <td className="px-4 py-3">{getReportTypeBadge(report.type)}</td>
                        <td className="px-4 py-3">{getStatusBadge(report.status)}</td>
                        <td className="px-4 py-3">{getEntityTypeAndName(report)}</td>
                        <td className="px-4 py-3">
                          {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
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

              {/* Entity Details Section with Cover Image */}
              {selectedReport.track && (
                <div className={`rounded-md p-3 ${theme === 'light' ? 'bg-gray-100' : 'bg-neutral-700'}`}>
                  <h3 className={`text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-neutral-300'}`}>Reported Track</h3>
                  <div className="flex gap-3 items-center">
                    <div className={`w-16 h-16 rounded flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      {selectedReport.track.coverUrl ? (
                        <img 
                          src={selectedReport.track.coverUrl} 
                          alt={selectedReport.track.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Music className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${theme === 'dark' ? 'text-neutral-100' : ''}`}>
                        {selectedReport.track.title}
                      </div>
                      <div className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-neutral-400'}`}>
                        Track by {selectedReport.track.artist.artistName}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReport.album && (
                <div className={`rounded-md p-3 ${theme === 'light' ? 'bg-gray-100' : 'bg-neutral-700'}`}>
                  <h3 className={`text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-neutral-300'}`}>Reported Album</h3>
                  <div className="flex gap-3 items-center">
                    <div className={`w-16 h-16 rounded flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      {selectedReport.album.coverUrl ? (
                        <img 
                          src={selectedReport.album.coverUrl} 
                          alt={selectedReport.album.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Music className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${theme === 'dark' ? 'text-neutral-100' : ''}`}>
                        {selectedReport.album.title}
                      </div>
                      <div className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-neutral-400'}`}>
                        Album by {selectedReport.album.artist.artistName}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReport.playlist && (
                <div className={`rounded-md p-3 ${theme === 'light' ? 'bg-gray-100' : 'bg-neutral-700'}`}>
                  <h3 className={`text-sm font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-neutral-300'}`}>Reported Playlist</h3>
                  <div className="flex gap-3 items-center">
                    <div className={`w-16 h-16 rounded flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      {selectedReport.playlist.coverUrl ? (
                        <img 
                          src={selectedReport.playlist.coverUrl} 
                          alt={selectedReport.playlist.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Music className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${theme === 'dark' ? 'text-neutral-100' : ''}`}>
                        {selectedReport.playlist.name}
                      </div>
                      <div className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-neutral-400'}`}>
                        Playlist by {selectedReport.playlist.user.name || selectedReport.playlist.user.username}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                  <p className={`rounded-md p-3 ${
                    selectedReport.resolvedAt && (new Date().getTime() - new Date(selectedReport.resolvedAt).getTime() < 7 * 24 * 60 * 60 * 1000) ? 
                      (theme === 'light' ? 'bg-blue-100/70 text-blue-900' : 'bg-blue-900/30 text-blue-100') :
                      (theme === 'light' ? 'bg-gray-100' : 'bg-neutral-700 text-neutral-200')
                  }`}>
                    {selectedReport.resolution}
                  </p>
                  {selectedReport.resolvedAt && (new Date().getTime() - new Date(selectedReport.resolvedAt).getTime() < 7 * 24 * 60 * 60 * 1000) && (
                    <p className={`mt-2 text-xs italic ${theme === 'light' ? 'text-blue-700' : 'text-blue-300'}`}>
                      This report was recently addressed by an admin
                    </p>
                  )}
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
              
              {/* Add Close button at the bottom */}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDetailOpen(false)}
                  className={`${
                    theme === 'dark' 
                      ? 'bg-neutral-700 border-neutral-600 hover:bg-neutral-600 text-neutral-100' 
                      : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* General Report Dialog */}
      <Dialog open={isGeneralReportOpen} onOpenChange={setIsGeneralReportOpen}>
        <DialogContent className={`sm:max-w-[525px] ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700 text-neutral-100' : ''}`}>
          <form onSubmit={handleSubmitGeneralReport}>
            <DialogHeader>
              <DialogTitle className={theme === 'dark' ? 'text-neutral-100' : undefined}>Report an Issue or Provide Feedback</DialogTitle>
              <DialogDescription className={theme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}>
                Please select the type of issue and describe it below. 
                This could be about incorrect account information, bugs, UI/UX suggestions, or general feedback.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="platform-report-type" className={theme === 'dark' ? 'text-neutral-300' : undefined}>
                  Report Type
                </Label>
                <Select 
                  value={selectedPlatformReportType} 
                  onValueChange={(value) => setSelectedPlatformReportType(value as typeof platformReportTypeOptions[number]['value'])}
                >
                  <SelectTrigger id="platform-report-type" className={theme === 'dark' ? 'bg-neutral-700 border-neutral-600 text-neutral-100 placeholder:text-neutral-400' : undefined}>
                    <SelectValue placeholder="Select a report type" />
                  </SelectTrigger>
                  <SelectContent className={theme === 'dark' ? 'bg-neutral-700 border-neutral-600 text-neutral-100' : 'bg-white'}>
                    {platformReportTypeOptions.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        className={theme === 'dark' ? 'hover:bg-neutral-600 focus:bg-neutral-600' : undefined}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="general-report-description" className={theme === 'dark' ? 'text-neutral-300' : undefined}>
                  Description
                </Label>
                <Textarea
                  id="general-report-description"
                  placeholder="Tell us about the issue..."
                  value={generalReportDescription}
                  onChange={(e) => setGeneralReportDescription(e.target.value)}
                  rows={5}
                  className={theme === 'dark' ? 'bg-neutral-700 border-neutral-600 text-neutral-100 placeholder:text-neutral-400' : undefined}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setIsGeneralReportOpen(false)}
                className={theme === 'dark' ? 'bg-neutral-700 border-neutral-600 hover:bg-neutral-600 text-neutral-100' : undefined}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={submittingGeneralReport || !generalReportDescription.trim()}
                className={theme === 'dark' ? 'bg-sky-600 hover:bg-sky-700 text-white' : 'bg-sky-500 hover:bg-sky-600 text-white'}
              >
                {submittingGeneralReport ? 'Submitting...' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 