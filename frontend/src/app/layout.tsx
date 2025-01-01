'use client';

import './globals.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Header from '@/components/layout/Header/Header';
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage =
    pathname?.includes('/login') || pathname?.includes('/register');

  return (
    <html lang="vi" suppressHydrationWarning={true}>
      <body className={isAuthPage ? '' : 'bg-[#222222]'}>
        {isAuthPage ? (
          <main>{children}</main>
        ) : (
          <div className="flex flex-col md:flex-row h-screen text-white">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-0">
              <Header />
              <main className="flex-1 overflow-y-auto p-2">{children}</main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
