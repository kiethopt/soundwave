"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Check,
  X,
  User,
  CalendarDays,
  Info,
  FileText,
  Tag,
  HelpCircle,
  Image as ImageIcon,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Briefcase
} from 'lucide-react';
import Image from 'next/image';
import { LabelRegistrationRequest, ArtistProfile, User as AdminUser, RequestStatus } from '@/types';

interface LabelRequestDetail extends LabelRegistrationRequest {
  requestingArtist: Pick<ArtistProfile, 'id' | 'artistName' | 'avatar'> & {
    user?: Pick<AdminUser, 'email' | 'name'>;
  };
  reviewedByAdmin?: Pick<AdminUser, 'id' | 'name'>;
  createdLabel?: { id: string; name: string; logoUrl?: string | null; };
}

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  theme,
  children,
  confirmVariant = "default"
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText: string;
  theme: string;
  children?: React.ReactNode;
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className={`rounded-lg shadow-xl p-6 w-full max-w-md ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}>
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="mb-6 text-sm opacity-90">{message}</div>
        {children}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm} variant={confirmVariant} className={confirmVariant === 'default' ? (theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600 text-white') : ''}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function LabelRequestDetailPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [requestDetail, setRequestDetail] = useState<LabelRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const fetchRequestDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error("Authentication required.");
        router.push('/login');
        return;
      }
      const response = await api.admin.getLabelRegistrationById(token, id);
      if (response && response.data) {
        setRequestDetail(response.data);
      } else {
        toast.error("Failed to load label request details.");
        setRequestDetail(null);
      }
    } catch (error: any) {
      console.error("Error fetching label request details:", error);
      toast.error(error.message || "Could not load label request details.");
      setRequestDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchRequestDetail();
  }, [fetchRequestDetail]);

  const handleApprove = async () => {
    if (!requestDetail) return;
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading(true);
    toast.loading('Approving request...', { id: 'approve-label' });
    try {
      await api.admin.approveLabelRegistration(token, requestDetail.id);
      toast.success('Label request approved successfully!', { id: 'approve-label' });
      setIsApproveModalOpen(false);
      fetchRequestDetail();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve label request.', { id: 'approve-label' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!requestDetail || !rejectionReason.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    setActionLoading(true);
    toast.loading('Rejecting request...', { id: 'reject-label' });
    try {
      await api.admin.rejectLabelRegistration(token, requestDetail.id, rejectionReason);
      toast.success('Label request rejected successfully.', { id: 'reject-label' });
      setIsRejectModalOpen(false);
      setRejectionReason('');
      fetchRequestDetail();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject label request.', { id: 'reject-label' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusPill = (status?: RequestStatus) => {
    if (!status) return null;
    let pillClass = 'px-3 py-1.5 text-xs font-semibold rounded-full inline-flex items-center ';
    let text = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    let IconComponent: React.ElementType = HelpCircle;

    switch (status) {
      case RequestStatus.PENDING:
        pillClass += theme === 'dark' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700';
        IconComponent = ShieldAlert;
        break;
      case RequestStatus.APPROVED:
        pillClass += theme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700';
        IconComponent = ShieldCheck;
        break;
      case RequestStatus.REJECTED:
        pillClass += theme === 'dark' ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700';
        IconComponent = ShieldX;
        break;
      default:
        pillClass += theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-700';
        text = 'Unknown';
    }
    return (
      <span className={pillClass}>
        <IconComponent className="w-4 h-4 mr-1.5" />
        {text}
      </span>
    );
  };

  const DetailItem = ({ icon: Icon, label, value, children, className }: { icon?: React.ElementType, label: string, value?: string | null | React.ReactNode, children?: React.ReactNode, className?: string }) => (
    <div className={`py-4 ${className}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <div className="flex items-center">
        {Icon && <Icon className={`w-5 h-5 mr-2 flex-shrink-0 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />}
        <div className={`flex-grow text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
          {value}
          {children}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-black'}`}>
        <p className="text-lg animate-pulse">Loading request details...</p>
      </div>
    );
  }

  if (!requestDetail) {
    return (
      <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-black'}`}>
        <Button onClick={() => router.push('/admin/labels')} variant="outline" className="mb-6 group">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" /> Back to Label Management
        </Button>
        <div className={`text-center p-10 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-white shadow-md'}`}>
            <HelpCircle className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-red-500' : 'text-red-600'}`} />
            <p className="text-xl font-semibold">Label registration request not found.</p>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>The request you are looking for might have been deleted or does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-6 lg:p-8 ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-5xl mx-auto">
        <Button onClick={() => router.push('/admin/labels')} variant="ghost" className={`mb-6 group ${theme === 'dark' ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'}`}>
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Label Management
        </Button>

        <header className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-center">
                <Tag className={`w-10 h-10 mr-4 flex-shrink-0 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600' }`} />
                <div>
                    <h1 className={`text-3xl md:text-4xl font-bold leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        {requestDetail.requestedLabelName}
                    </h1>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Label Registration Request</p>
                </div>
            </div>
            {getStatusPill(requestDetail.status)}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column: Logo & Actions */}
          <div className={`lg:col-span-1 space-y-6 p-6 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
            <div>
              <h2 className={`text-lg font-semibold mb-3 pb-2 border-b ${theme === 'dark' ? 'text-slate-200 border-slate-700' : 'text-slate-700 border-slate-200'}`}>Requested Logo</h2>
              {requestDetail.requestedLabelLogoUrl ? (
                <Image
                  src={requestDetail.requestedLabelLogoUrl}
                  alt={`${requestDetail.requestedLabelName} Logo`}
                  width={256}
                  height={256}
                  className="rounded-lg object-cover aspect-square border-2 border-opacity-50 w-full max-w-xs mx-auto shadow-md hover:shadow-xl transition-shadow duration-300"
                />
              ) : (
                <div className={`w-full aspect-square max-w-xs mx-auto flex items-center justify-center rounded-lg border-2 border-dashed ${theme === 'dark' ? 'border-slate-700 bg-slate-700/50' : 'border-slate-300 bg-slate-100'}`}>
                  <ImageIcon className={`w-20 h-20 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
              )}
            </div>

            {requestDetail.status === RequestStatus.PENDING && (
              <div className={`pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                <h3 className={`text-md font-semibold mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Actions</h3>
                <div className="flex flex-col space-y-3">
                  <Button
                    onClick={() => setIsApproveModalOpen(true)}
                    disabled={actionLoading}
                    className={`w-full ${theme === 'dark' ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                  >
                    <Check className="mr-2 h-5 w-5" /> Approve Request
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    <X className="mr-2 h-5 w-5" /> Reject Request
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Details */}
          <div className={`lg:col-span-2 p-6 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
            <h2 className={`text-xl font-semibold mb-4 pb-3 border-b ${theme === 'dark' ? 'text-slate-200 border-slate-700' : 'text-slate-700 border-slate-200'}`}>Request Information</h2>
            <div className="divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'}">
              <DetailItem icon={Tag} label="Requested Label Name" value={requestDetail.requestedLabelName} />
              <DetailItem icon={FileText} label="Description">
                <p className={`text-sm whitespace-pre-wrap ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  {requestDetail.requestedLabelDescription || <span className="italic opacity-70">No description provided.</span>}
                </p>
              </DetailItem>
              <DetailItem icon={User} label="Requesting Artist">
                <div className="flex items-center mt-1">
                  {requestDetail.requestingArtist?.avatar && (
                    <Image
                      src={requestDetail.requestingArtist.avatar}
                      alt={requestDetail.requestingArtist.artistName || 'Artist Avatar'}
                      width={36}
                      height={36}
                      className="rounded-full mr-2.5 border border-opacity-20"
                    />
                  )}
                  <div>
                    <span
                      onClick={() => router.push(`/artist/profile/${requestDetail.requestingArtist?.id}`)}
                      className={`font-medium cursor-pointer hover:underline ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                    >
                      {requestDetail.requestingArtist?.artistName || <span className="italic opacity-70">Unknown Artist</span>}
                    </span>
                    {requestDetail.requestingArtist?.user?.email && (
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                            {requestDetail.requestingArtist.user.email}
                        </p>
                    )}
                  </div>
                </div>
              </DetailItem>
              <DetailItem icon={CalendarDays} label="Submission Date" value={requestDetail.submittedAt ? new Date(requestDetail.submittedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'} />
              <DetailItem icon={HelpCircle} label="Current Status">
                 {getStatusPill(requestDetail.status)}
              </DetailItem>

              {requestDetail.reviewedAt && (
                <DetailItem icon={CalendarDays} label="Reviewed Date" value={new Date(requestDetail.reviewedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} />
              )}
              {requestDetail.reviewedByAdmin && (
                 <DetailItem icon={User} label="Reviewed By" value={requestDetail.reviewedByAdmin.name || 'Admin'} />
              )}
              {requestDetail.status === RequestStatus.REJECTED && requestDetail.rejectionReason && (
                <DetailItem icon={FileText} label="Rejection Reason" value={requestDetail.rejectionReason} />
              )}
              {requestDetail.status === RequestStatus.APPROVED && requestDetail.createdLabel && (
                <DetailItem icon={Briefcase} label="Created Label">
                    <div className="flex items-center mt-1">
                        {requestDetail.createdLabel.logoUrl && (
                            <Image
                                src={requestDetail.createdLabel.logoUrl}
                                alt={`${requestDetail.createdLabel.name} Logo`}
                                width={36}
                                height={36}
                                className="rounded-md object-cover aspect-square border border-opacity-20 mr-2.5"
                            />
                        )}
                        <span
                            onClick={() => router.push(`/admin/labels/${requestDetail.createdLabel?.id}`)}
                            className={`font-medium cursor-pointer hover:underline ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                        >
                            {requestDetail.createdLabel.name} <span className={`text-xs opacity-70`}> (ID: {requestDetail.createdLabel.id})</span>
                        </span>
                    </div>
                </DetailItem>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        onConfirm={handleApprove}
        title="Approve Label Request"
        message={<p>Are you sure you want to approve the request for label <strong className="font-semibold">{requestDetail?.requestedLabelName}</strong> by <strong className="font-semibold">{requestDetail?.requestingArtist?.artistName || 'Selected Artist'}</strong>? This will create a new label and assign it to the artist.</p>}
        confirmText="Confirm Approve"
        theme={theme}
        confirmVariant="default" // Green button will be handled by className prop for Button
      />

      <ConfirmationModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleReject}
        title="Reject Label Request"
        message={<p>Are you sure you want to reject the request for label <strong className="font-semibold">{requestDetail?.requestedLabelName}</strong>?</p>}
        confirmText="Confirm Reject"
        theme={theme}
        confirmVariant="destructive"
      >
        <div className="mt-4">
            <label htmlFor="rejectionReason" className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Reason for Rejection (Required)</label>
            <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className={`w-full p-2 border rounded shadow-sm text-sm ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'border-slate-300 text-slate-900 placeholder-slate-500'}`}
                placeholder="Provide a clear reason..."
            />
        </div>
      </ConfirmationModal>
    </div>
  );
}
