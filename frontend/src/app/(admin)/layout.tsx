'use client';

import { useTheme } from '@/contexts/ThemeContext';
import AdminRoute from '@/components/admin/AdminRoute';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <AdminRoute>
      <div
        className={theme === 'light' ? 'bg-white' : 'bg-[#111111]'}
        suppressHydrationWarning
      >
        {children}
      </div>
    </AdminRoute>
  );
}
