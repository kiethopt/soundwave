'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Notifications,
  DiscoverFilled,
  DiscoverOutline,
  Home,
  Menu,
  Search,
  Settings,
  Library,
  HomeOutline,
  HomeFilled,
} from '@/components/ui/Icons';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@/types';
import pusher from '@/utils/pusher';
import { api } from '@/utils/api';
import { toast } from 'react-toastify';
import type React from 'react';

export default function Header({
  isSidebarOpen,
  onMenuClick,
}: {
  isSidebarOpen?: boolean;
  onMenuClick?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isActive = (path: string) => pathname === path;
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const userDataStr = localStorage.getItem('userData');
    if (!userDataStr) return;

    const userData = JSON.parse(userDataStr);
    const userId = userData.id;

    const channel = pusher.subscribe(`user-${userId}`);
    console.log('Subscribed to Pusher channel:', `user-${userId}`);

    const handleNotification = (data: { type: string }) => {
      console.log('Received notification event:', data);
      if (
        data.type === 'REQUEST_REJECTED' ||
        data.type === 'REQUEST_APPROVED'
      ) {
        setNotificationCount((prev) => {
          const newCount = prev + 1;
          localStorage.setItem('notificationCount', String(newCount));
          return newCount;
        });
      }
    };

    channel.bind('artist-request-status', handleNotification);

    const savedCount = Number(localStorage.getItem('notificationCount') || '0');
    setNotificationCount(savedCount);

    return () => {
      channel.unbind('artist-request-status', handleNotification);
      pusher.unsubscribe(`user-${userId}`);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('userToken');
      const storedUserData = localStorage.getItem('userData');

      if (token && storedUserData) {
        setIsAuthenticated(true);
        setUserData(JSON.parse(storedUserData));
      } else {
        setIsAuthenticated(false);
        setUserData(null);
      }
    };

    checkAuth();
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const sessionId = localStorage.getItem('sessionId');

      if (token && sessionId) {
        await api.auth.logout(token);
        pusher.disconnect();
      }

      localStorage.clear();
      setIsAuthenticated(false);
      setUserData(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      pusher.disconnect();
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  const handleBellClick = () => {
    setNotificationCount(0);
    localStorage.setItem('notificationCount', '0');
  };

  const handleSwitchProfile = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return;

      const response = await api.auth.switchProfile(token);

      if (
        response.user.artistProfile &&
        !response.user.artistProfile.isActive
      ) {
        toast.error('Your artist account has been deactivated');
        return;
      }

      localStorage.setItem('userData', JSON.stringify(response.user));
      toast.success(`Switched to ${response.user.currentProfile} profile`);

      if (response.user.currentProfile === 'ARTIST') {
        window.location.href = '/artist/dashboard';
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error switching profile:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to switch profile';
      toast.error(
        errorMessage.includes('deactivated')
          ? 'Your account has been deactivated'
          : errorMessage
      );
    }
    setShowDropdown(false);
  };

  return (
    <>
      <header
        className="h-[72px] bg-[#111111] flex items-center justify-between px-2 md:px-4 lg:px-6 border-b border-white/10"
        suppressHydrationWarning
      >
        {/* Left Side */}
        <div className="flex items-center gap-2 md:gap-4 lg:gap-6">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 text-white/70 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            <Link
              href="/"
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md ${
                isActive('/')
                  ? 'text-white bg-[#282828]'
                  : 'text-white/70 hover:text-white hover:bg-[#282828]/50'
              }`}
              suppressHydrationWarning
            >
              {isActive('/') ? (
                <HomeFilled className="w-5 h-5" />
              ) : (
                <HomeOutline className="w-5 h-5" />
              )}
              <span className="hidden lg:inline">Home</span>
            </Link>

            <Link
              href="/discover"
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md ${
                isActive('/discover')
                  ? 'text-white bg-[#282828]'
                  : 'text-white/70 hover:text-white hover:bg-[#282828]/50'
              }`}
            >
              {isActive('/discover') ? (
                <DiscoverFilled className="w-5 h-5" />
              ) : (
                <DiscoverOutline className="w-5 h-5" />
              )}
              <span className="hidden lg:inline">Discover</span>
            </Link>

            <form onSubmit={handleSearch} className="relative w-[400px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full bg-white/10 text-white rounded-md py-1.5 md:py-2 pl-10 pr-4 text-sm placeholder:text-white/40 focus:outline-none focus:bg-white/20"
              />
            </form>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 md:gap-4">
          {isAuthenticated ? (
            <>
              <button
                className="hidden lg:block p-2 hover:bg-white/10 rounded-full relative"
                onClick={handleBellClick}
              >
                <div className="relative">
                  <Notifications className="w-5 h-5 text-white" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </div>
              </button>
              <button className="hidden lg:block p-2 hover:bg-white/10 rounded-full">
                <Settings className="w-5 h-5 text-white" />
              </button>
              <div className="relative" ref={dropdownRef}>
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden bg-white/10 hover:bg-white/20"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <Image
                    src={userData?.avatar || '/images/default-avatar.jpg'}
                    alt="User avatar"
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                    priority
                  />
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#282828] rounded-md shadow-lg py-1 z-50">
                    <div className="lg:hidden">
                      <button
                        className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-white/10"
                        onClick={() => setShowDropdown(false)}
                      >
                        <Notifications className="w-4 h-4 mr-3" />
                        Notifications
                        {notificationCount > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                            {notificationCount}
                          </span>
                        )}
                      </button>
                      <button
                        className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-white/10"
                        onClick={() => setShowDropdown(false)}
                      >
                        <Settings className="w-4 h-4 mr-3" />
                        Settings
                      </button>
                      <div className="border-t border-white/10 my-1"></div>
                    </div>

                    <Link
                      href="/account"
                      className="block px-4 py-2 text-sm text-white hover:bg-white/10"
                      onClick={() => setShowDropdown(false)}
                    >
                      Account
                    </Link>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-white hover:bg-white/10"
                      onClick={() => setShowDropdown(false)}
                    >
                      Profile
                    </Link>

                    {userData?.artistProfile?.isVerified && (
                      <>
                        <button
                          onClick={handleSwitchProfile}
                          className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                        >
                          Switch to{' '}
                          {userData.currentProfile === 'USER'
                            ? 'Artist'
                            : 'User'}{' '}
                          Profile
                        </button>
                      </>
                    )}

                    {userData?.role === 'USER' && !userData?.artistProfile && (
                      <Link
                        href="/request-artist"
                        className="block px-4 py-2 text-sm text-white hover:bg-white/10"
                        onClick={() => setShowDropdown(false)}
                      >
                        Become an Artist
                      </Link>
                    )}

                    <div className="border-t border-white/10 my-1"></div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => router.push('/register')}
                className="text-white/70 hover:text-white text-sm font-medium hidden md:block"
              >
                Sign up
              </button>
              <button
                onClick={() => router.push('/login')}
                className="bg-white text-black px-3 md:px-6 py-1.5 md:py-2 rounded-full text-sm font-medium hover:bg-white/90"
              >
                Log in
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111111] border-t border-white/10 z-50">
        <div className="flex justify-around items-center h-16">
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 px-4 py-2 ${
              isActive('/') ? 'text-[#8B6450]' : 'text-white/70'
            }`}
          >
            {isActive('/') ? (
              <HomeFilled className="w-6 h-6" />
            ) : (
              <HomeOutline className="w-6 h-6" />
            )}
            <span className="text-xs">Home</span>
          </Link>

          <Link
            href="/discover"
            className={`flex flex-col items-center gap-1 px-4 py-2 ${
              isActive('/discover') ? 'text-[#8B6450]' : 'text-white/70'
            }`}
          >
            {isActive('/discover') ? (
              <DiscoverFilled className="w-6 h-6" />
            ) : (
              <DiscoverOutline className="w-6 h-6" />
            )}
            <span className="text-xs">Discover</span>
          </Link>

          <Link
            href="/search"
            className={`flex flex-col items-center gap-1 px-4 py-2 ${
              pathname.startsWith('/search')
                ? 'text-[#8B6450]'
                : 'text-white/70'
            }`}
          >
            <Search className="w-6 h-6" />
            <span className="text-xs">Search</span>
          </Link>

          <Link
            href="/library"
            className={`flex flex-col items-center gap-1 px-4 py-2 ${
              pathname.startsWith('/library')
                ? 'text-[#8B6450]'
                : 'text-white/70'
            }`}
          >
            <Library className="w-6 h-6" />
            <span className="text-xs">Library</span>
          </Link>
        </div>
      </div>
    </>
  );
}
