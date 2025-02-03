'use client';

import { useEffect, useState } from 'react';
import 'react-toastify/dist/ReactToastify.css';

export default function ArtistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkArtistAccess = () => {
      try {
        const userData = localStorage.getItem('userData');
        const token = localStorage.getItem('userToken');

        if (!userData || !token) {
          window.location.href = '/login';
          return;
        }

        const user = JSON.parse(userData);
        if (
          !user.artistProfile?.isVerified ||
          user.currentProfile !== 'ARTIST'
        ) {
          window.location.href = '/';
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking artist access:', error);
        window.location.href = '/login';
      }
    };

    checkArtistAccess();
  }, []);

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-2" suppressHydrationWarning>
      {children}
    </div>
  );
}
