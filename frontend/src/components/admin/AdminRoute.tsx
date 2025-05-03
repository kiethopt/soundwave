'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/utils/api';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
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

        await api.auth.validateToken(token);
        setIsVerified(true);
      } catch (error) {
        console.error('Error verifying admin:', error);
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        router.push('/login');
      }
    };

    verifyAdmin();
  }, [router, pathname]);

  if (!isVerified) {
    return null;
  }

  return <>{children}</>;
}
