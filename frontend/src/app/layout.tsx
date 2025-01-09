'use client';

import './globals.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Header from '@/components/layout/Header/Header';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAuthPage =
    pathname?.includes('/login') ||
    pathname?.includes('/register') ||
    pathname?.includes('/reset-password') ||
    pathname?.includes('/forgot-password');

  return (
    <html lang="vi" suppressHydrationWarning={true}>
      <body className={isAuthPage ? '' : 'bg-[#222222]'}>
        {isAuthPage ? (
          <main>{children}</main>
        ) : (
          <div className="flex flex-col h-screen text-white">
            {/* Mobile Header */}
            <div className="md:hidden">
              <Header
                isSidebarOpen={isSidebarOpen}
                onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
              />

              {/* Main Content */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Desktop Header */}
                <div className="hidden md:block">
                  <Header />
                </div>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-2 md:p-4">
                  {children}
                </main>
              </div>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
