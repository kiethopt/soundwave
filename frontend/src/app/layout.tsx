'use client';

import './globals.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Header from '@/components/layout/Header/Header';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import type React from 'react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { TrackProvider } from '@/contexts/TrackContext';
import PlayerBar from '@/components/layout/PlayerBar/PlayerBar';
import { BackgroundProvider, useBackground } from '@/contexts/BackgroundContext';
import { SessionProvider, useSession } from "@/contexts/SessionContext";
import { SocketProvider } from "@/contexts/SocketContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { backgroundStyle } = useBackground();
  const { user, isAuthenticated, loading } = useSession();

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
  }, []);

  useEffect(() => {
    if (user && pathname && router) {
      const isAdminPage = pathname.startsWith('/admin');
      const isArtistPage = pathname.startsWith('/artist');

      const isGenericUserPage = (
        pathname === '/' ||
        pathname.startsWith('/search') ||
        pathname.startsWith('/discover') ||
        pathname.startsWith('/playlists/') ||
        pathname.startsWith('/album/') ||
        pathname.startsWith('/genre/') ||
        (pathname.startsWith('/profile/') && pathname !== '/profile/me')
      );

      const isAdmin = user.role === 'ADMIN';
      const isArtist = user.currentProfile === 'ARTIST';

      if (isAdmin && !isAdminPage && isGenericUserPage) {
        console.log('Redirecting admin from user page:', pathname);
        router.push('/admin/dashboard');
      } else if (isArtist && !isArtistPage && isGenericUserPage) {
        console.log('Redirecting artist from user page:', pathname);
        router.push('/artist/dashboard');
      }
    }
  }, [user, pathname, router]);

  if (!mounted || loading) {
    return null;
  }

  const showPlayerBar = isAuthenticated && user?.role !== 'ADMIN' && user?.currentProfile === 'USER';

  return (
    <div suppressHydrationWarning>
      {isAuthPage ? (
        <main suppressHydrationWarning>{children}</main>
      ) : (
        <div
          suppressHydrationWarning
          className={`flex flex-col h-screen ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}
        >
          <div className="md:hidden" suppressHydrationWarning>
            <Header
              isSidebarOpen={isSidebarOpen}
              onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          </div>

          <div className="flex flex-1 overflow-hidden" suppressHydrationWarning>
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              isPlayerBarVisible={showPlayerBar}
            />
            <div
              className="flex-1 flex flex-col min-h-0"
              suppressHydrationWarning
            >
              <div className="hidden md:block" suppressHydrationWarning>
                <Header />
              </div>

              <main
                className={`flex-1 relative ${showPlayerBar ? 'pb-[90px]' : ''}`}
                suppressHydrationWarning
              >
                <div
                  className="absolute inset-0 overflow-y-auto"
                  suppressHydrationWarning
                >
                  <div
                    suppressHydrationWarning
                    className={`min-h-full p-2 ${theme === 'light' ? 'bg-gray-50' : ''}
                    ${showPlayerBar ? 'mb-[80px]' : ''}
                    `}
                    style={{
                      background: theme === 'dark' ? backgroundStyle : undefined,
                    }}
                  >
                    {children}
                  </div>
                </div>
              </main>
            </div>
          </div>

          {showPlayerBar && (
            <PlayerBar />
          )}
        </div>
      )}
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <SocketProvider>
        <SessionProvider>
          <TrackProvider>
            <ThemeProvider>
              <BackgroundProvider>
                <body className="bg-[#111]" suppressHydrationWarning>
                  <LayoutContent>{children}</LayoutContent>
                  <Toaster position="top-center" />
                </body>
              </BackgroundProvider>
            </ThemeProvider>
          </TrackProvider>
        </SessionProvider>
      </SocketProvider>
    </html>
  );
}
