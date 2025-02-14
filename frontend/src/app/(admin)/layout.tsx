'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkAdmin = () => {
      try {
        const userData = localStorage.getItem('userData');
        const token = localStorage.getItem('userToken');

        if (!userData || !token) {
          window.location.href = '/login';
          return;
        }

        const user = JSON.parse(userData);
        if (user.role !== 'ADMIN') {
          window.location.href = '/';
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking admin:', error);
        window.location.href = '/login';
      }
    };

    checkAdmin();
  }, []);

  if (!mounted || isLoading) {
    return null;
  }

  return (
    <div className={theme === 'light' ? 'bg-white' : 'bg-[#111111]'}>
      {children}
    </div>
  );
}
