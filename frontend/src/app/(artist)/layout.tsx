'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function ArtistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const checkArtistAccess = () => {
      try {
        const userData = localStorage.getItem('userData');
        const token = localStorage.getItem('userToken');

        if (!userData || !token) {
          router.push('/login');
          return;
        }

        const user = JSON.parse(userData);
        if (
          !user.artistProfile?.isVerified ||
          user.currentProfile !== 'ARTIST'
        ) {
          router.push('/');
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking artist access:', error);
        router.push('/login');
      }
    };

    checkArtistAccess();
  }, [router]);

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div
      className={`h-full ${
        theme === 'light'
          ? 'bg-gray-50 text-gray-900'
          : 'bg-[#111111] text-white'
      }`}
      suppressHydrationWarning
    >
      <Toaster position="top-center" reverseOrder={false} />
      {children}
    </div>
  );
}
