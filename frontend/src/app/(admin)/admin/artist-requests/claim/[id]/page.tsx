'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link
import { api } from '@/utils/api';
import { ArrowLeft, Check, X, ExternalLink } from 'lucide-react'; // Thêm ExternalLink
import { ArtistClaimRequest } from '@/types'; // Thay đổi kiểu dữ liệu
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { RejectModal, ApproveModal } from '@/components/ui/admin-modals';
import Image from 'next/image'; // Import Image

// Đổi tên component
export default function ClaimRequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { theme } = useTheme();
  // Đổi tên biến id để rõ ràng hơn (không bắt buộc)
  const { id: claimId } = use(params);
  const router = useRouter();
  // Sử dụng kiểu ArtistClaimRequest
  const [request, setRequest] = useState<ArtistClaimRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);

  useEffect(() => {
    const fetchClaimRequestDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }
        // Gọi API mới để lấy chi tiết claim request
        const response = await api.admin.getArtistClaimRequestDetail(claimId, token);
        setRequest(response);
      } catch (err) {
        console.error('Error fetching claim request details:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch claim request details'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchClaimRequestDetails();
  }, [claimId]);

  const handleApproveClick = () => {
    // Chỉ cho phép duyệt nếu đang ở trạng thái PENDING
    if (request?.status !== 'PENDING') {
        toast.error('This claim request has already been processed.');
        return;
    }
    setShowApproveModal(true);
  };

  const handleApproveConfirm = async () => {
    if (!request) return;
    setShowApproveModal(false);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      // Gọi API mới để duyệt claim
      await api.admin.approveArtistClaim(request.id, token);
      toast.success('Artist claim request approved successfully!');
      // Cập nhật trạng thái request cục bộ để UI phản ánh ngay lập tức
      setRequest(prev => prev ? { ...prev, status: 'APPROVED' } : null);
      // Có thể không cần redirect ngay, để admin xem lại kết quả
      // router.push('/admin/artist-requests?tab=claim');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to approve claim request'
      );
    }
  };

  const handleRejectClick = () => {
    // Chỉ cho phép từ chối nếu đang ở trạng thái PENDING
    if (request?.status !== 'PENDING') {
        toast.error('This claim request has already been processed.');
        return;
    }
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!request) return;
    setShowRejectModal(false);
    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      // Gọi API mới để từ chối claim
      await api.admin.rejectArtistClaim(
        request.id,
        reason,
        token
      );
      toast.success('Artist claim request rejected successfully!');
      // Cập nhật trạng thái request cục bộ
      setRequest(prev => prev ? { ...prev, status: 'REJECTED', rejectionReason: reason } : null);
      // router.push('/admin/artist-requests?tab=claim');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to reject claim request'
      );
    }
  };

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('vi-VN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
        <div className={`animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 ${theme === 'dark' ? 'border-white' : 'border-gray-900'}`}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[calc(100vh-150px)] ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
        <p>Error loading claim request:</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => router.back()}
          className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            theme === 'light'
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
              : 'bg-white/10 hover:bg-white/15 text-white/80 hover:text-white'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-150px)]">
        Claim Request not found
      </div>
    );
  }

  const isProcessed = request.status !== 'PENDING';

  return (
    <div
      className="container mx-auto mb-16 md:mb-0 p-4"
      suppressHydrationWarning
    >
      <div className="flex flex-col space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
            {/* Back Button */}
            <div className="w-fit">
              <button
                onClick={() => router.push('/admin/artist-requests?tab=claim')} // Điều hướng về tab claim
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  theme === 'light'
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
                    : 'bg-white/10 hover:bg-white/15 text-white/80 hover:text-white'
                }`}
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>Back to Claims</span>
              </button>
            </div>

            {/* Action Buttons (chỉ hiển thị nếu chưa xử lý) */}
            {!isProcessed && (
                <div className="flex justify-center sm:justify-end gap-2">
                <button
                    onClick={handleApproveClick}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs sm:text-sm min-w-[120px] sm:min-w-[140px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isProcessed}
                >
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Approve</span>
                </button>
                <button
                    onClick={handleRejectClick}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs sm:text-sm min-w-[120px] sm:min-w-[140px] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isProcessed}
                >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Reject</span>
                </button>
                </div>
            )}
          </div>
        </div>

        {/* Main Content Card */}
        <div
          className={`rounded-xl sm:p-8 p-4 border ${
            theme === 'light' ? 'border-gray-300' : 'border-gray-400'
          }`}
        >
          {/* Profile Header - Thông tin nghệ sĩ được claim */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 pb-6 border-b border-dashed border-gray-500">
            {request.artistProfile.avatar && (
              <Image // Use Next Image for optimization
                src={request.artistProfile.avatar}
                alt={request.artistProfile.artistName}
                width={128} // Specify width
                height={128} // Specify height
                className={`w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 ${
                  theme === 'light' ? 'border-gray-200' : 'border-gray-400'
                }`}
              />
            )}
            <div className="space-y-2 text-center sm:text-left">
              <h2 className={`text-xs uppercase tracking-wider mb-1 ${theme === 'light' ? 'text-gray-500' : 'text-white/50'}`}>Claiming Artist Profile</h2>
              <h1
                className={`text-2xl sm:text-3xl font-bold ${
                  theme === 'light' ? 'text-gray-900' : 'text-white'
                }`}
              >
                {request.artistProfile.artistName}
              </h1>
               {/* Thêm link đến trang artist profile nếu có */}
               {/* <Link href={`/artist/${request.artistProfile.id}`} passHref>
                 <a target="_blank" rel="noopener noreferrer" className={`text-xs inline-flex items-center gap-1 hover:underline ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>
                   View Profile <ExternalLink size={12} />
                 </a>
               </Link> */}
            </div>
          </div>

           {/* Submitted By Section - Thông tin người gửi claim */}
          <div className="mb-8">
             <h2 className={`text-xs uppercase tracking-wider mb-3 ${theme === 'light' ? 'text-gray-500' : 'text-white/50'}`}>Submitted By User</h2>
             <div className="flex items-center gap-4">
                {request.claimingUser.avatar && (
                   <Image
                        src={request.claimingUser.avatar}
                        alt={request.claimingUser.name || request.claimingUser.username || ''}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                )}
                <div>
                    <p className={`font-medium ${theme === 'light' ? 'text-gray-800' : 'text-white/90'}`}>{request.claimingUser.name || request.claimingUser.username}</p>
                    <a href={`mailto:${request.claimingUser.email}`} className={`text-sm hover:underline ${theme === 'light' ? 'text-gray-600' : 'text-white/60'}`}>
                        {request.claimingUser.email}
                    </a>
                </div>
             </div>
          </div>


          {/* Main Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Proof Section - Hiển thị bằng chứng */}
            <div className="md:col-span-2 space-y-6">
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
                  Provided Proof
                </h3>
                {request.proof && Array.isArray(request.proof) && request.proof.length > 0 ? (
                  <ul className="space-y-3">
                    {request.proof.map((proofItem: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <ExternalLink className={`w-4 h-4 mt-1 flex-shrink-0 ${theme === 'light' ? 'text-gray-500' : 'text-white/50'}`} />
                        {proofItem.match(/\.(jpeg|jpg|gif|png|webp)$/) != null ? (
                          // Hiển thị ảnh nếu là URL ảnh
                          <div className="flex flex-col">
                            <a href={proofItem} target="_blank" rel="noopener noreferrer" className={`text-sm break-all hover:underline ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>
                              {proofItem}
                            </a>
                            <a href={proofItem} target="_blank" rel="noopener noreferrer" className="mt-2">
                                <Image
                                    src={proofItem}
                                    alt={`Proof ${index + 1}`}
                                    width={300} // Giới hạn chiều rộng
                                    height={200} // Giới hạn chiều cao
                                    className="rounded object-contain max-w-full h-auto border border-gray-500/50"
                                    // style={{ maxWidth: '300px', maxHeight: '200px' }} // Đảm bảo ảnh không quá lớn
                                />
                            </a>
                          </div>
                        ) : (
                          // Hiển thị link nếu không phải ảnh
                          <a href={proofItem} target="_blank" rel="noopener noreferrer" className={`text-sm break-all hover:underline ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}>
                            {proofItem}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-white/50'}`}>
                    No proof provided.
                  </p>
                )}
              </div>
            </div>

            {/* Details Section - Chi tiết claim */}
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
                  Claim Details
                </h3>
                <dl className="space-y-3 text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                    <dt className={theme === 'light' ? 'text-gray-600' : 'text-white/60'}>
                      Submitted Date
                    </dt>
                    <dd className="font-medium">
                      {formatDate(request.submittedAt)}
                    </dd>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                    <dt className={theme === 'light' ? 'text-gray-600' : 'text-white/60'}>
                      Status
                    </dt>
                    <dd
                      className={`capitalize px-2 py-1 rounded-full text-center w-fit font-medium ${
                        request.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700'
                          : request.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1).toLowerCase() : 'N/A'}
                    </dd>
                  </div>

                  {/* Hiển thị thông tin duyệt/từ chối nếu có */}
                  {request.reviewedAt && (
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                      <dt className={theme === 'light' ? 'text-gray-600' : 'text-white/60'}>
                        Reviewed Date
                      </dt>
                      <dd className="font-medium">
                        {formatDate(request.reviewedAt)}
                      </dd>
                    </div>
                  )}
                   {request.reviewedByAdmin && (
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                      <dt className={theme === 'light' ? 'text-gray-600' : 'text-white/60'}>
                        Reviewed By
                      </dt>
                      <dd className="font-medium">
                        {/* Safely access name with optional chaining and provide a fallback */}
                        {request.reviewedByAdmin?.name ?? 'Unknown Admin'}
                      </dd>
                    </div>
                  )}
                   {request.status === 'REJECTED' && request.rejectionReason && (
                     <div className="flex flex-col gap-1 sm:gap-4">
                      <dt className={theme === 'light' ? 'text-gray-600' : 'text-white/60'}>
                        Rejection Reason
                      </dt>
                      <dd className={`font-medium mt-1 p-2 rounded text-xs ${theme === 'light' ? 'bg-red-50 text-red-900' : 'bg-red-900/30 text-red-300'}`}>
                        {request.rejectionReason}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
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
        itemName={request?.artistProfile.artistName} // Pass artistName to itemName
        itemType="artist claim" // Specify itemType
      />
    </div>
  );
} 