'use client';

import './globals.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Header from '@/components/layout/Header/Header';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@/utils/api';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage =
    pathname?.includes('/login') || pathname?.includes('/register');

  useEffect(() => {
    // Chỉ kết nối SSE khi không phải trang auth và đang ở client-side
    if (isAuthPage || typeof window === 'undefined') return;

    let eventSource: EventSource;

    try {
      eventSource = new EventSource(api.sse.url, {
        withCredentials: true,
      });

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Root layout received SSE event:', data);

          if (data.type === 'FORCE_LOGOUT') {
            const currentUser = JSON.parse(
              localStorage.getItem('userData') || '{}'
            );
            if (data.userId === currentUser.id) {
              localStorage.removeItem('userToken');
              localStorage.removeItem('userData');
              router.push('/login?message=account_deactivated');
            }
          }
        } catch (error) {
          console.error('Error processing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        eventSource.close();
      };
    } catch (error) {
      console.error('Error setting up SSE:', error);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isAuthPage, router]);

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
