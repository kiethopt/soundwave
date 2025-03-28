'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { ArrowLeft, Check, X } from 'lucide-react';
import Link from 'next/link';
import { ArtistRequest } from '@/types';
import toast from 'react-hot-toast';
import { Facebook, Instagram } from '@/components/ui/Icons';
import { useTheme } from '@/contexts/ThemeContext';
import { RejectModal } from '@/components/ui/data-table/data-table-modals';

export default function ArtistRequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { theme } = useTheme();
  const { id } = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<ArtistRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }
        const response = await api.admin.getArtistRequestDetail(id, token);
        setRequest(response);
      } catch (err) {
        console.error('Error fetching request details:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch request details'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [id]);

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this artist request?'))
      return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      await api.admin.approveArtistRequest(request!.id, token);
      toast.success('Artist request approved successfully!');
      router.push('/admin/artist-requests');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to approve request'
      );
    }
  };

  const handleRejectClick = () => {
    setIsRejectModalOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    try {
      setIsRejectModalOpen(false);

      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.admin.rejectArtistRequest(
        request!.id,
        reason,
        token
      );
      if (response.hasPendingRequest === false) {
        toast.success('Artist request rejected successfully!');
      } else {
        toast.error('Failed to update request status');
      }
      router.push('/admin/artist-requests');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to reject request'
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center h-screen">
        Request not found
      </div>
    );
  }

  const formatSocialMediaLink = (
    platform: 'facebook' | 'instagram',
    value: string
  ) => {
    if (!value) return '#';

    try {
      if (value.startsWith('http')) {
        const url = new URL(value);
        return url.toString();
      }

      const cleanValue = value.replace(/^@/, '').replace(/\s+/g, '');
      switch (platform) {
        case 'facebook':
          return `https://facebook.com/${cleanValue}`;
        case 'instagram':
          return `https://instagram.com/${cleanValue}`;
        default:
          return '#';
      }
    } catch {
      return '#';
    }
  };

  return (
    <div
      className="container mx-auto mb-16 md:mb-0 p-4"
      suppressHydrationWarning
    >
      <div className="flex flex-col space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-4">
          {/* Back Button and Action Buttons Container */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
            {/* Back Button */}
            <div className="w-fit">
              <Link
                href="/admin/artist-requests"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  theme === 'light'
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
                    : 'bg-white/10 hover:bg-white/15 text-white/80 hover:text-white'
                }`}
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back</span>
              </Link>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center sm:justify-end gap-2">
              <button
                onClick={handleApprove}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-green-500/20 text-green-400 rounded-lg text-xs sm:text-sm min-w-[120px] sm:min-w-[140px]"
              >
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Approve</span>
              </button>
              <button
                onClick={handleRejectClick}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-red-500/20 text-red-400 rounded-lg text-xs sm:text-sm min-w-[120px] sm:min-w-[140px]"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div
          className={`rounded-xl sm:p-8 p-4 border ${
            theme === 'light' ? 'border-gray-300' : 'border-gray-400'
          }`}
        >
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
            {request.avatar && (
              <img
                src={request.avatar}
                alt={request.artistName}
                className={`w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover border-2 ${
                  theme === 'light' ? 'border-gray-200' : 'border-gray-400'
                }`}
              />
            )}
            <div className="space-y-2 text-center sm:text-left">
              <h1
                className={`text-2xl sm:text-3xl font-bold ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}
              >
                {request.artistName}
              </h1>
              <div
                className={`flex flex-col gap-2 ${
                  theme === 'light' ? 'text-gray-600' : 'text-white/60'
                } text-xs sm:text-sm`}
              >
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span>User:</span>
                  <span className="font-medium">{request.user.name}</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span>Email:</span>
                  <a
                    href={`mailto:${request.user.email}`}
                    className="font-medium hover:underline"
                  >
                    {request.user.email}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bio Section */}
            <div className="space-y-6">
              <div
                className={`${
                  theme === 'light'
                    ? 'bg-gray-100 border border-gray-300'
                    : 'bg-white/10'
                } p-4 sm:p-6 rounded-xl`}
              >
                <h3
                  className={`text-base sm:text-lg font-semibold mb-4 ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  Artist Bio
                </h3>
                <p
                  className={`leading-relaxed text-xs sm:text-sm ${
                    theme === 'light' ? 'text-gray-600' : 'text-white/60'
                  }`}
                >
                  {request.bio || 'No biography provided'}
                </p>
              </div>

              {/* Details Card */}
              <div
                className={`${
                  theme === 'light'
                    ? 'bg-gray-100 border border-gray-300'
                    : 'bg-white/10'
                } p-4 sm:p-6 rounded-xl`}
              >
                <h3
                  className={`text-base sm:text-lg font-semibold mb-4 ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  Request Details
                </h3>
                <dl className="space-y-3 text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                    <dt
                      className={
                        theme === 'light' ? 'text-gray-600' : 'text-white/60'
                      }
                    >
                      Request Date
                    </dt>
                    <dd className="font-medium">
                      {new Date(
                        request.verificationRequestedAt
                      ).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </dd>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                    <dt
                      className={
                        theme === 'light' ? 'text-gray-600' : 'text-white/60'
                      }
                    >
                      Status
                    </dt>
                    <dd
                      className="capitalize px-2 py-1 rounded-full text-center w-fit"
                      style={{
                        backgroundColor: request.isVerified
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(234, 179, 8, 0.1)',
                        color: request.isVerified ? '#34d399' : '#eab308',
                      }}
                    >
                      {request.isVerified ? 'approved' : 'pending'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Social Media Section */}
            {request.socialMediaLinks && (
              <div
                className={`${
                  theme === 'light'
                    ? 'bg-gray-100 border border-gray-300'
                    : 'bg-white/10'
                } p-4 sm:p-6 rounded-xl h-fit`}
              >
                <h3
                  className={`text-base sm:text-lg font-semibold mb-6 ${
                    theme === 'light' ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  Social Profiles
                </h3>
                <div className="space-y-3">
                  {request.socialMediaLinks.facebook && (
                    <a
                      href={formatSocialMediaLink(
                        'facebook',
                        request.socialMediaLinks.facebook
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-4 p-4 ${
                        theme === 'light'
                          ? 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                          : 'bg-white/20 hover:bg-white/30'
                      } rounded-lg text-xs sm:text-sm`}
                    >
                      <Facebook className="w-6 h-6 flex-shrink-0" />
                      <div className="truncate">
                        <p className="font-medium">Facebook</p>
                        <p className="text-xs truncate">
                          {request.socialMediaLinks.facebook}
                        </p>
                      </div>
                    </a>
                  )}

                  {request.socialMediaLinks.instagram && (
                    <a
                      href={formatSocialMediaLink(
                        'instagram',
                        request.socialMediaLinks.instagram
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-4 p-4 ${
                        theme === 'light'
                          ? 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                          : 'bg-white/20 hover:bg-white/30'
                      } rounded-lg text-xs sm:text-sm`}
                    >
                      <Instagram className="w-6 h-6 flex-shrink-0" />
                      <div className="truncate">
                        <p className="font-medium">Instagram</p>
                        <p className="text-xs truncate">
                          {request.socialMediaLinks.instagram}
                        </p>
                      </div>
                    </a>
                  )}

                  {!request.socialMediaLinks.facebook &&
                    !request.socialMediaLinks.instagram && (
                      <div className="text-center py-8 text-gray-500 text-xs sm:text-sm">
                        No social media links provided
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Reason Modal */}
      <RejectModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleRejectConfirm}
        theme={theme === 'dark' ? 'dark' : 'light'}
      />
    </div>
  );
}
