'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { ArrowLeft, Check, X, User, Link2 } from 'lucide-react';
import { ArtistRequest, Genre } from '@/types';
import toast from 'react-hot-toast';
import { Facebook, Instagram } from '@/components/ui/Icons';
import { useTheme } from '@/contexts/ThemeContext';
import { RejectModal, ApproveModal } from '@/components/ui/admin-modals';

export default function ArtistRequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { theme } = useTheme();
  const { id: requestId } = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<ArtistRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);

  useEffect(() => {
    const fetchDetailsAndGenres = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }
        const [requestResponse, genresResponse] = await Promise.all([
          api.admin.getArtistRequestDetail(requestId, token),
          api.genres.getAll(token)
        ]);

        setRequest(requestResponse);
        setAllGenres(genresResponse.genres || []);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetailsAndGenres();
  }, [requestId]);

  const handleApproveClick = () => {
    setShowApproveModal(true);
  };

  const handleApproveConfirm = async () => {
    try {
      setShowApproveModal(false);
      
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
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    try {
      setShowRejectModal(false);

      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.admin.rejectArtistRequest(
        request!.id,
        reason,
        token
      );

      toast.success(response.message || 'Artist request rejected successfully!');
      
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
              <button
                onClick={() => router.back()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  theme === 'light'
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
                    : 'bg-white/10 hover:bg-white/15 text-white/80 hover:text-white'
                }`}
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center sm:justify-end gap-2">
              <button
                onClick={handleApproveClick}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs sm:text-sm min-w-[120px] sm:min-w-[140px] transition-colors duration-150"
              >
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Approve</span>
              </button>
              <button
                onClick={handleRejectClick}
                className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs sm:text-sm min-w-[120px] sm:min-w-[140px] transition-colors duration-150"
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
            {request.avatarUrl ? (
              <img
                src={request.avatarUrl}
                alt={request.artistName}
                className={`w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover border-2 ${
                  theme === 'light' ? 'border-gray-200' : 'border-gray-400'
                }`}
              />
            ) : request.user?.avatar ? (
              <img
                src={request.user.avatar}
                alt={`${request.artistName} (User Avatar)`}
                className={`w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover border-2 ${
                  theme === 'light' ? 'border-gray-200' : 'border-gray-400'
                }`}
              />
            ) : (
              <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-2xl border-2 ${
                  theme === 'light' ? 'border-gray-200' : 'border-gray-400'
                } flex items-center justify-center bg-gray-100 dark:bg-gray-700`}>
                <User className={`w-16 h-16 ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
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
                  Additional Details
                </h3>
                <dl className="space-y-3">
                  <DetailItem
                    label="Status"
                    value={
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        request.status === 'PENDING' ? (theme === 'dark' ? 'bg-yellow-700 text-yellow-100' : 'bg-yellow-100 text-yellow-800') :
                        request.status === 'APPROVED' ? (theme === 'dark' ? 'bg-green-700 text-green-100' : 'bg-green-100 text-green-800') :
                        request.status === 'REJECTED' ? (theme === 'dark' ? 'bg-red-700 text-red-100' : 'bg-red-100 text-red-800') :
                        (theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800')
                      }`}>
                        {request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1).toLowerCase() : 'N/A'}
                      </span>
                    }
                    theme={theme}
                  />

                  {request.requestedLabelName && (
                    <DetailItem
                      label="Requested Label Name"
                      value={request.requestedLabelName}
                      theme={theme}
                    />
                  )}
                  {request.requestedGenres && request.requestedGenres.length > 0 && (
                    <DetailItem
                      label="Requested Genres"
                      value={
                        request.requestedGenres
                          .map(genreId => allGenres.find(g => g.id === genreId)?.name || genreId)
                          .join(', ')
                      }
                      theme={theme}
                    />
                  )}
                  {request.rejectionReason && request.status === 'REJECTED' && (
                     <DetailItem
                        label="Rejection Reason"
                        value={request.rejectionReason}
                        theme={theme}
                      />
                  )}
                  {request.idVerificationDocumentUrl && (
                    <DetailItem
                      label="ID Verification Document"
                      value={
                        <a href={request.idVerificationDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          View Document
                        </a>
                      }
                      theme={theme}
                    />
                  )}
                </dl>
              </div>
            </div>

            {/* Social Links and Portfolio Links Column */}
            <div className="space-y-6">
              {/* Social Media Section */}
              {request.socialMediaLinks && (Object.keys(request.socialMediaLinks).length > 0 && (request.socialMediaLinks.facebook || request.socialMediaLinks.instagram || request.socialMediaLinks.twitter)) ? (
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
                        href={request.socialMediaLinks.facebook}
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
                        href={request.socialMediaLinks.instagram}
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
                    {request.socialMediaLinks.twitter && (
                       <a
                        href={request.socialMediaLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-4 p-4 ${
                          theme === 'light'
                            ? 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                            : 'bg-white/20 hover:bg-white/30'
                        } rounded-lg text-xs sm:text-sm`}
                      >
                        <Link2 className="w-6 h-6 flex-shrink-0" /> 
                        <div className="truncate">
                          <p className="font-medium">Twitter</p>
                          <p className="text-xs truncate">
                            {request.socialMediaLinks.twitter}
                          </p>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`${
                    theme === 'light'
                      ? 'bg-gray-100 border border-gray-300'
                      : 'bg-white/10'
                  } p-4 sm:p-6 rounded-xl h-fit text-center text-gray-500 dark:text-gray-400`}
                >
                  No social media links provided.
                </div>
              )}

              {request.portfolioLinks && Array.isArray(request.portfolioLinks) && request.portfolioLinks.length > 0 ? (
                <div
                  className={`${
                    theme === 'light'
                      ? 'bg-gray-100 border border-gray-300'
                      : 'bg-white/10'
                  } p-4 sm:p-6 rounded-xl h-fit mt-6`}
                >
                  <h3
                    className={`text-base sm:text-lg font-semibold mb-6 ${
                      theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    Portfolio Links
                  </h3>
                  <div className="space-y-3">
                    {(request.portfolioLinks as Array<{ url: string }>).map((link: { url: string }, index: number) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-4 p-4 ${
                          theme === 'light'
                            ? 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                            : 'bg-white/20 hover:bg-white/30'
                        } rounded-lg text-xs sm:text-sm`}
                      >
                        <Link2 className="w-6 h-6 flex-shrink-0" />
                        <p className="truncate">{link.url}</p>
                      </a>
                    ))}
                  </div>
                </div>
              ) : request.portfolioLinks && typeof request.portfolioLinks === 'object' && Object.keys(request.portfolioLinks).length > 0 ? (
                <div
                  className={`${
                    theme === 'light'
                      ? 'bg-gray-100 border border-gray-300'
                      : 'bg-white/10'
                  } p-4 sm:p-6 rounded-xl h-fit mt-6`}
                >
                  <h3
                    className={`text-base sm:text-lg font-semibold mb-6 ${
                      theme === 'light' ? 'text-gray-900' : 'text-white'
                    }`}
                  >
                    Portfolio Links
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(request.portfolioLinks).map(([key, value]) => (
                      typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')) ? (
                        <a
                          key={key}
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-4 p-4 ${
                            theme === 'light'
                              ? 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                              : 'bg-white/20 hover:bg-white/30'
                          } rounded-lg text-xs sm:text-sm`}
                        >
                          <Link2 className="w-6 h-6 flex-shrink-0" />
                          <p className="truncate">{key}: {value}</p>
                        </a>
                      ) : null
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <RejectModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={(reason) => handleRejectConfirm(reason)}
        theme={theme}
      />

      <ApproveModal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        onConfirm={handleApproveConfirm}
        theme={theme}
        itemName={request?.artistName}
        itemType="artist request"
      />
    </div>
  );
}

const DetailItem = ({
  label,
  value,
  theme,
}: {
  label: string;
  value: string | React.ReactNode;
  theme: string;
}) => (
  <div className="flex flex-col sm:flex-row sm:justify-between">
    <dt
      className={`text-xs sm:text-sm font-medium ${
        theme === 'light' ? 'text-gray-500' : 'text-white/50'
      }`}
    >
      {label}
    </dt>
    <dd
      className={`mt-1 text-xs sm:text-sm sm:mt-0 ${
        theme === 'light' ? 'text-gray-900' : 'text-white'
      }`}
    >
      {value}
    </dd>
  </div>
);
