'use client';

import './globals.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Header from '@/components/layout/Header/Header';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/utils/api';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAuthPage =
    pathname?.includes('/login') || pathname?.includes('/register');

  useEffect(() => {
    if (isAuthPage || typeof window === 'undefined') return;

    let eventSource: EventSource;
    let reconnectTimer: NodeJS.Timeout;

    const connectSSE = () => {
      try {
        const token = localStorage.getItem('userToken');
        const userData = localStorage.getItem('userData');
        if (!token || !userData) return;

        // Đóng kết nối cũ nếu có
        if (eventSource) {
          eventSource.close();
        }

        eventSource = new EventSource(`${api.sse.url}?token=${token}`);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'FORCE_LOGOUT') {
              const currentUser = JSON.parse(userData);
              if (data.userId === currentUser.id) {
                localStorage.removeItem('userToken');
                localStorage.removeItem('userData');
                router.push('/login');
                if (eventSource) {
                  eventSource.close();
                }
              }
            }
          } catch (error) {
            console.error('Error processing SSE message:', error);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
          }
          // Chỉ reconnect nếu vẫn còn token
          const currentToken = localStorage.getItem('userToken');
          if (currentToken) {
            reconnectTimer = setTimeout(connectSSE, 5000);
          }
        };
      } catch (error) {
        console.error('Error setting up SSE:', error);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [isAuthPage, router]);

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
