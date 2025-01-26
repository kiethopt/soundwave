'use client';

import './globals.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Header from '@/components/layout/Header/Header';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import pusher from '@/utils/pusher';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isAuthPage = useMemo(
    () =>
      pathname?.includes('/login') ||
      pathname?.includes('/register') ||
      pathname?.includes('/reset-password') ||
      pathname?.includes('/forgot-password'),
    [pathname]
  );

  useEffect(() => {
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
      const user = JSON.parse(userDataStr);
      const channel = pusher.subscribe(`user-${user.id}`);

      // Handle account deactivation
      channel.bind('account-status', (data: any) => {
        if (data.type === 'ACCOUNT_DEACTIVATED') {
          // Clear all auth data
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
          localStorage.removeItem('sessionId');

          // Redirect to login with message
          router.push('/login?message=account_deactivated');
        }
      });

      return () => {
        channel.unbind('account-status');
        pusher.unsubscribe(`user-${user.id}`);
      };
    }
  }, [router]);

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
        <ToastContainer />
      </body>
    </html>
  );
}
