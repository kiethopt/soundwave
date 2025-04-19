'use client';

import './globals.css';
import Sidebar from '@/components/layout/Sidebar/Sidebar';
import Header from '@/components/layout/Header/Header';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import type React from 'react';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { TrackProvider, useTrack } from '@/contexts/TrackContext';
import PlayerBar from '@/components/layout/PlayerBar/PlayerBar';
import { MaintenanceProvider } from '@/contexts/MaintenanceContext';
import { MaintenanceBanner } from '@/components/ui/MaintenanceBanner';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { BackgroundProvider, useBackground } from '@/contexts/BackgroundContext';
import type { User } from '@/types';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { currentTrack } = useTrack();
  const { isMaintenanceMode, isLoading } = useMaintenance();
  const { backgroundStyle } = useBackground();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);

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
    const token = localStorage.getItem('userToken');
    const storedUserData = localStorage.getItem('userData');
    setIsAuthenticated(!!token);
    
    if (storedUserData) {
      try {
        setUserData(JSON.parse(storedUserData));
      } catch (e) {
        console.error("Error parsing user data in layout:", e);
        setUserData(null);
      }
    } else {
      setUserData(null);
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'userToken') {
        setIsAuthenticated(!!localStorage.getItem('userToken'));
      }
      if (event.key === 'userData') {
        const newUserData = localStorage.getItem('userData');
        if (newUserData) {
           try {
             setUserData(JSON.parse(newUserData));
           } catch (e) {
             console.error("Error parsing updated user data in layout:", e);
             setUserData(null);
           }
        } else {
          setUserData(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);

  }, [pathname]);

  if (!mounted) {
    return null;
  }

  const showPlayerBar = isAuthenticated && userData?.role !== 'ADMIN' && userData?.currentProfile === 'USER';

  return (
    <div suppressHydrationWarning>
      {isAuthPage ? (
        <main suppressHydrationWarning>{children}</main>
      ) : (
        <div
          suppressHydrationWarning
          className={`flex flex-col h-screen ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}
        >
          {isMaintenanceMode && !isLoading && (
            <div className="h-8" aria-hidden="true"></div>
          )}

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
      <ThemeProvider>
        <MaintenanceProvider>
          <TrackProvider>
            <BackgroundProvider>
              <body className="bg-[#111]" suppressHydrationWarning>
                <MaintenanceBanner />
                <LayoutContent>{children}</LayoutContent>
                <Toaster position="top-center" />
              </body>
            </BackgroundProvider>
          </TrackProvider>
        </MaintenanceProvider>
      </ThemeProvider>
    </html>
  );
}
