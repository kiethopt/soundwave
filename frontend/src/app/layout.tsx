'use client';

import './globals.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Header from '@/components/layout/Header/Header';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import pusher from '@/utils/pusher';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type React from 'react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

// Tạo component con để xử lý theme
function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const isAuthPage = useMemo(
    () =>
      pathname?.includes('/login') ||
      pathname?.includes('/register') ||
      pathname?.includes('/reset-password') ||
      pathname?.includes('/forgot-password'),
    [pathname]
  );

  useEffect(() => {
    setMounted(true);
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
      const user = JSON.parse(userDataStr);
      setIsAdmin(user.role === 'ADMIN');
      const channel = pusher.subscribe(`user-${user.id}`);

      channel.bind('account-status', (data: any) => {
        if (data.type === 'ACCOUNT_DEACTIVATED') {
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
          localStorage.removeItem('sessionId');
          router.push('/login?message=account_deactivated');
        }
      });

      return () => {
        channel.unbind('account-status');
        pusher.unsubscribe(`user-${user.id}`);
      };
    }
  }, [router]);

  if (!mounted) {
    return null;
  }

  return (
    <div suppressHydrationWarning>
      {isAuthPage ? (
        <main suppressHydrationWarning>{children}</main>
      ) : (
        <div
          suppressHydrationWarning
          className={`flex flex-col h-screen ${
            theme === 'light' ? 'text-gray-900' : 'text-white'
          }`}
        >
          <div className="md:hidden" suppressHydrationWarning>
            <Header
              isSidebarOpen={isSidebarOpen}
              onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          </div>

          <div className="flex flex-1" suppressHydrationWarning>
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />

            <div
              className="flex-1 flex flex-col min-h-0"
              suppressHydrationWarning
            >
              <div className="hidden md:block" suppressHydrationWarning>
                <Header />
              </div>

              <main className="flex-1 relative" suppressHydrationWarning>
                <div
                  className="absolute inset-0 overflow-y-auto"
                  suppressHydrationWarning
                >
                  <div
                    suppressHydrationWarning
                    className={`min-h-full p-2 ${
                      theme === 'light' ? 'bg-gray-50' : 'bg-[#111111]'
                    }`}
                  >
                    {children}
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Component chính
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <ThemeProvider>
        <body className="bg-[#111]" suppressHydrationWarning>
          <LayoutContent>{children}</LayoutContent>
          <ToastContainer />
        </body>
      </ThemeProvider>
    </html>
  );
}
