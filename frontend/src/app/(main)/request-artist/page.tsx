// frontend\src\app\(main)\request-artist\page.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { useRouter } from 'next/navigation';

export default function RequestArtistPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('userData');

    // Kiểm tra đăng nhập
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    // Kiểm tra trạng thái yêu cầu
    const user = JSON.parse(userData);
    if (user.verificationRequestedAt) {
      setHasRequested(true);
    }
  }, [router]);

  const handleRequest = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      await api.auth.requestArtistRole(token);

      setHasRequested(true);
      alert(
        'Your request to become an artist has been submitted successfully!'
      );
    } catch (err) {
      console.error('Error requesting artist role:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Request to Become an Artist</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {hasRequested ? (
        <p className="text-green-500 mb-4">
          You have already submitted a request to become an artist.
        </p>
      ) : (
        <button
          onClick={handleRequest}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      )}
    </div>
  );
}
