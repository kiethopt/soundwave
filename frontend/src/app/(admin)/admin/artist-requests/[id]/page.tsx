'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { ArrowLeft, Check, X } from 'lucide-react';
import Link from 'next/link';
import { ArtistRequest } from '@/types';
import { toast } from 'react-toastify';
import { Facebook, Instagram } from '@/components/ui/Icons';

export default function ArtistRequestDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<ArtistRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequestDetails = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await api.admin.getArtistRequestDetails(id, token);
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

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this artist request?'))
      return;

    try {
      const token = localStorage.getItem('userToken');
      if (!token) throw new Error('No authentication token found');

      const response = await api.admin.rejectArtistRequest(request!.id, token);
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

    // Fix common URL patterns
    try {
      // If it's already a valid URL
      if (value.startsWith('http')) {
        const url = new URL(value);
        return url.toString();
      }

      // Handle username patterns
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
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/admin/artist-requests"
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Requests</span>
        </Link>

        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            <Check className="w-5 h-5" />
            Approve Request
          </button>
          <button
            onClick={handleReject}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <X className="w-5 h-5" />
            Reject Request
          </button>
        </div>
      </div>

      <div className="rounded-xl p-8 border border-gray-400">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-start gap-8 mb-10">
          {request.avatar && (
            <img
              src={request.avatar}
              alt={request.artistName}
              className="w-40 h-40 rounded-2xl object-cover border-2 border-gray-400"
            />
          )}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{request.artistName}</h1>
            <div className="flex items-center gap-4 text-white/50">
              <div className="flex items-center gap-2">
                <span className="text-sm ">User:</span>
                <span className="font-medium">{request.user.name}</span>
              </div>
              <div className="w-px h-5 bg-white/40" />
              <div className="flex items-center gap-2">
                <span className="text-sm">Email:</span>
                <a
                  href={`mailto:${request.user.email}`}
                  className="font-medium hover:text-white transition-colors"
                >
                  {request.user.email}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bio Section */}
          <div className="space-y-6">
            <div className="bg-white/10 p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">Artist Bio</h3>
              <p className="text-white/80 leading-relaxed">
                {request.bio || 'No biography provided'}
              </p>
            </div>

            {/* Details Card */}
            <div className="bg-white/10 p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-4">Request Details</h3>
              <dl className="space-y-3">
                <div className="flex justify-between items-center">
                  <dt className="text-white/50">Request Date</dt>
                  <dd className="font-medium">
                    {new Date(
                      request.verificationRequestedAt
                    ).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-white/50">Status</dt>
                  <dd
                    className="capitalize px-3 py-1 rounded-full text-sm"
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
            <div className="bg-white/10 p-6 rounded-xl h-fit">
              <h3 className="text-lg font-semibold mb-6">Social Profiles</h3>
              <div className="space-y-3">
                {request.socialMediaLinks.facebook && (
                  <a
                    href={formatSocialMediaLink(
                      'facebook',
                      request.socialMediaLinks.facebook
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-white/20 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Facebook className="w-6 h-6 flex-shrink-0" />
                    <div className="truncate">
                      <p className="font-medium">Facebook</p>
                      <p className="text-sm text-white/50 truncate">
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
                    className="flex items-center gap-4 p-4 bg-white/20 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Instagram className="w-6 h-6 flex-shrink-0" />
                    <div className="truncate">
                      <p className="font-medium">Instagram</p>
                      <p className="text-sm text-white/50 truncate">
                        {request.socialMediaLinks.instagram}
                      </p>
                    </div>
                  </a>
                )}

                {!request.socialMediaLinks.facebook &&
                  !request.socialMediaLinks.instagram && (
                    <div className="text-center py-8 text-gray-500">
                      No social media links provided
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
