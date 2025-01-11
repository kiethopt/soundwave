'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ArtistRequest } from '@/types';

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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!request) {
    return <div>Request not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center">
        <Link
          href="/admin/artist-requests"
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Artist Requests</span>
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Artist Request Details</h1>
      <div className="bg-[#121212] rounded-lg p-6">
        <div className="flex items-center space-x-4">
          {request.avatar && (
            <img
              src={request.avatar}
              alt={request.artistName}
              className="w-20 h-20 rounded-full"
            />
          )}
          <div>
            <h2 className="text-xl font-semibold">{request.artistName}</h2>
            <p className="text-white/60">{request.user.name}</p>
          </div>
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Bio</h3>
          <p className="text-white/80">{request.bio}</p>
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Social Media Links</h3>
          <ul>
            {request.socialMediaLinks?.facebook && (
              <li>
                <a
                  href={request.socialMediaLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Facebook
                </a>
              </li>
            )}
            {request.socialMediaLinks?.twitter && (
              <li>
                <a
                  href={request.socialMediaLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Twitter
                </a>
              </li>
            )}
            {request.socialMediaLinks?.instagram && (
              <li>
                <a
                  href={request.socialMediaLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
              </li>
            )}
          </ul>
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Requested At</h3>
          <p className="text-white/80">
            {new Date(request.verificationRequestedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
