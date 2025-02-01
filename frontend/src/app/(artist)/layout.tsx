'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function ArtistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="p-4 h-full overflow-y-auto" suppressHydrationWarning>
      {children}
      <ToastContainer />
    </div>
  );
}
