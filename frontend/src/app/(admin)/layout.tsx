'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = () => {
      try {
        const userData = localStorage.getItem('userData');
        const token = localStorage.getItem('userToken');

        if (!userData || !token) {
          router.push('/login');
          return;
        }

        const user = JSON.parse(userData);
        if (user.role !== 'ADMIN') {
          router.push('/');
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking admin:', error);
        router.push('/login');
      }
    };

    checkAdmin();
  }, [router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <div className="p-4">{children}</div>;
}
