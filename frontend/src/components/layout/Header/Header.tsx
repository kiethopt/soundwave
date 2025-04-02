'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Notifications,
  DiscoverFilled,
  DiscoverOutline,
  Menu,
  Search,
  Settings,
  HomeOutline,
  HomeFilled,
  ProfileIcon,
  ArrowRight,
} from '@/components/ui/Icons';
import { Calendar } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@/types';
import pusher from '@/utils/pusher';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { MusicAuthDialog } from '@/components/ui/data-table/data-table-modals';

export default function Header({
  onMenuClick,
}: {
  isSidebarOpen?: boolean;
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isActive = (path: string) => pathname === path;
  const [notificationCount, setNotificationCount] = useState(0);

  // New notifications handling
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);

  const { theme } = useTheme();
  const router = useRouter();
  const { dialogOpen, setDialogOpen, handleProtectedAction } = useAuth();

  const isAdminOrArtist =
    userData?.role === 'ADMIN' || userData?.currentProfile === 'ARTIST';
  // Tính số thông báo chưa đọc từ danh sách notifications
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  useEffect(() => {
    const fetchInitialNotifications = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;
        const notificationsData = await api.notifications.getList(token);
        setNotifications(notificationsData);
      } catch (error) {
        console.error('Error fetching initial notifications:', error);
      }
    };

    if (isAuthenticated) {
      fetchInitialNotifications();
    }
  }, [isAuthenticated]);

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
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
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
      const canProceed = handleProtectedAction();
      if (canProceed) {
        router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchQuery('');
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

      localStorage.removeItem('userToken');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('userData');

      setIsAuthenticated(false);
      setUserData(null);

      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      pusher.disconnect();

      localStorage.removeItem('userToken');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('userData');

      window.location.href = '/login';
    }
  };

  const handleBellClick = async () => {
    try {
      const canProceed = handleProtectedAction();
      if (!canProceed) return;

      setShowNotifications((prev) => !prev);

      if (!showNotifications) {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const notificationsData = await api.notifications.getList(token);
        console.log('Fetched notifications:', notificationsData);
        if (notificationsData) {
          setNotifications(notificationsData);
        }
      }

      setNotificationCount(0);
      localStorage.setItem('notificationCount', '0');
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  const handleSwitchProfile = async () => {
    try {
      const canProceed = handleProtectedAction();
      if (!canProceed) return;

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

  // Xử lý Pusher cho thông báo real-time
  useEffect(() => {
    const userDataStr = localStorage.getItem('userData');
    if (!userDataStr) return;

    const userData = JSON.parse(userDataStr);
    const userId = userData.id;

    const channel = pusher.subscribe(`user-${userId}`);
    console.log('Subscribed to Pusher channel:', `user-${userId}`);

    const handleNewNotification = (data: {
      id: string;
      type: string;
      message: string;
      isRead: boolean;
      createdAt: string;
      [key: string]: any;
    }) => {
      console.log('Received new notification event:', data);
      setNotifications((prev) => [data, ...prev]); // Thêm thông báo mới vào đầu danh sách
    };

    channel.bind('notification', handleNewNotification);

    const handleArtistRequestStatus = (data: { type: string }) => {
      console.log('Received artist request status event:', data);
    };
    channel.bind('artist-request-status', handleArtistRequestStatus);

    const savedCount = Number(localStorage.getItem('notificationCount') || '0');
    setNotificationCount(savedCount);

    return () => {
      channel.unbind('notification', handleNewNotification);
      channel.unbind('artist-request-status', handleArtistRequestStatus);
      pusher.unsubscribe(`user-${userId}`);
    };
  }, []);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;
        await api.notifications.markAsRead(notification.id, token);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  return (
    <header
      className={`h-[72px] flex items-center justify-between px-2 md:px-4 lg:px-6 border-b ${
        theme === 'light'
          ? 'bg-white border-gray-200'
          : 'bg-[#111111] border-white/10'
      }`}
    >
      {/* Left Side */}
      <div className="flex items-center gap-2 md:gap-4 lg:gap-6">
        <button
          onClick={onMenuClick}
          className={`md:hidden p-2 ${
            theme === 'light'
              ? 'text-gray-600 hover:text-gray-900'
              : 'text-white/70 hover:text-white'
          }`}
        >
          <Menu className="w-6 h-6" />
        </button>

        {!isAdminOrArtist && (
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            <Link
              href="/"
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md ${
                isActive('/')
                  ? theme === 'light'
                    ? 'text-gray-900 bg-gray-200'
                    : 'text-white bg-[#282828]'
                  : theme === 'light'
                  ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  : 'text-white/70 hover:text-white hover:bg-[#282828]/50'
              }`}
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
                  ? theme === 'light'
                    ? 'text-gray-900 bg-gray-200'
                    : 'text-white bg-[#282828]'
                  : theme === 'light'
                  ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
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

            {/* Link Sự Kiện */}
            {isAdminOrArtist ? (
              <Link
                href="/EditEvent"
                className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md ${
                  isActive('/EditEvent')
                    ? theme === 'light'
                      ? 'text-gray-900 bg-gray-200'
                      : 'text-white bg-[#282828]'
                    : theme === 'light'
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    : 'text-white/70 hover:text-white hover:bg-[#282828]/50'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="hidden lg:inline">Event Management</span>
              </Link>
            ) : (
              <Link
                href="/event-total"
                className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md ${
                  isActive('/event-total')
                    ? theme === 'light'
                      ? 'text-gray-900 bg-gray-200'
                      : 'text-white bg-[#282828]'
                    : theme === 'light'
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    : 'text-white/70 hover:text-white hover:bg-[#282828]/50'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="hidden lg:inline">Event</span>
              </Link>
            )}

            <form onSubmit={handleSearch} className="relative w-[400px]">
              <Search
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  theme === 'light' ? 'text-gray-400' : 'text-white/40'
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className={`w-full rounded-md py-1.5 md:py-2 pl-10 pr-4 text-sm focus:outline-none ${
                  theme === 'light'
                    ? 'bg-gray-100 text-gray-900 placeholder:text-gray-500 focus:bg-gray-200'
                    : 'bg-white/10 text-white placeholder:text-white/40 focus:bg-white/20'
                }`}
              />
            </form>
          </div>
        )}
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 md:gap-4">
        {isAuthenticated ? (
          <>
            <div className="relative" ref={notificationRef}>
              {/* Nút thông báo */}
              <button
                className={`p-2 rounded-full relative cursor-pointer transition-all duration-300 ${
                  theme === 'light' ? 'hover:bg-gray-200' : 'hover:bg-white/10'
                } ${
                  unreadCount > 0
                    ? 'animate-pulse bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.8)]'
                    : ''
                }`}
                onClick={handleBellClick}
              >
                <div className="relative">
                  <Notifications
                    className={`w-5 h-5 ${
                      theme === 'light'
                        ? 'text-gray-700'
                        : unreadCount > 0
                        ? 'text-blue-400'
                        : 'text-white'
                    }`}
                  />
                  {unreadCount > 0 && (
                    <span
                      style={{ height: '10px', width: '10px', right: '-10px' }}
                      className="absolute -top-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center animate-ping"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              </button>
              {showNotifications && (
                <div
                  className={`absolute right-0 mt-2 w-80 max-h-[300px] overflow-auto rounded-lg shadow-lg py-3 z-50 ${
                    theme === 'light' ? 'bg-white' : 'bg-[#282828]'
                  }`}
                >
                  {notifications.length === 0 ? (
                    <p
                      className={`px-4 py-3 text-sm ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                      }`}
                    >
                      No notifications
                    </p>
                  ) : (
                    notifications.map((item, index) => (
                      <div
                        key={item.id}
                        className={`cursor-pointer px-4 py-3 transition-colors duration-200 
                        ${
                          item.isRead
                            ? theme === 'light'
                              ? 'bg-gray-50 text-gray-700'
                              : 'bg-gray-700 text-gray-200'
                            : theme === 'light'
                            ? 'bg-blue-50 text-gray-900 font-medium'
                            : 'bg-blue-900 text-white font-medium'
                        }
                        hover:opacity-90 ${
                          index !== notifications.length - 1
                            ? 'border-b border-gray-200'
                            : ''
                        }`}
                        onClick={() => handleNotificationClick(item)}
                      >
                        <p className="line-clamp-2 text-sm">{item.message}</p>
                      </div>
                    ))
                  )}
                  <div
                    className={`sticky bottom-0 px-4 py-3 ${
                      theme === 'light' ? 'bg-white' : 'bg-[#282828]'
                    } border-t border-gray-200`}
                  >
                    <Link href="/notifications">
                      <button
                        className={`w-full text-center text-sm py-2 rounded-lg transition-colors duration-200 ${
                          theme === 'light'
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-gray-800 text-white hover:bg-gray-700'
                        }`}
                      >
                        Xem tất cả
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar Button */}
            <div className="relative" ref={dropdownRef}>
              <button
                className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden cursor-pointer border-2 border-transparent hover:border-gray-300 transition-all duration-200"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src={userData?.avatar || '/images/default-avatar.jpg'}
                    alt="User avatar"
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                    style={{ objectFit: 'cover' }}
                    priority
                  />
                </div>
              </button>

              {showDropdown && (
                <div
                  className={`absolute right-0 mt-2 w-64 rounded-2xl shadow-lg overflow-hidden z-50 border ${
                    theme === 'light'
                      ? 'bg-white border-zinc-200'
                      : 'bg-[#111111] border-zinc-800'
                  }`}
                >
                  <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          <Image
                            src={
                              userData?.avatar || '/images/default-avatar.jpg'
                            }
                            alt={userData?.name || 'User'}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <div
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ${
                            theme === 'light' ? 'ring-white' : 'ring-zinc-900'
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <h2
                          className={`text-base font-semibold ${
                            theme === 'light'
                              ? 'text-zinc-900'
                              : 'text-zinc-100'
                          }`}
                        >
                          {userData?.name || userData?.username || 'User'}
                        </h2>
                        <p
                          className={`text-sm ${
                            theme === 'light'
                              ? 'text-zinc-600'
                              : 'text-zinc-400'
                          }`}
                        >
                          {userData?.role === 'ADMIN'
                            ? 'Administrator'
                            : userData?.currentProfile === 'ARTIST'
                            ? 'Artist'
                            : 'User'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`h-px ${
                      theme === 'light' ? 'bg-zinc-200' : 'bg-zinc-800'
                    }`}
                  />

                  <div className="p-2">
                    <Link
                      href={
                        userData?.role === 'ADMIN'
                          ? `/admin/profile/${userData.id}`
                          : userData?.currentProfile === 'USER'
                          ? `/profile/${userData?.id}`
                          : `/artist/profile/${userData?.artistProfile?.id}`
                      }
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 ${
                        theme === 'light'
                          ? 'hover:bg-zinc-50 text-zinc-900'
                          : 'hover:bg-zinc-800/50 text-zinc-100'
                      }`}
                      onClick={() => setShowDropdown(false)}
                    >
                      <ProfileIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">Profile</span>
                    </Link>

                    <Link
                      href="/settings"
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 ${
                        theme === 'light'
                          ? 'hover:bg-zinc-50 text-zinc-900'
                          : 'hover:bg-zinc-800/50 text-zinc-100'
                      }`}
                      onClick={() => setShowDropdown(false)}
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm font-medium">Settings</span>
                    </Link>

                    {userData?.artistProfile?.isVerified && (
                      <button
                        onClick={handleSwitchProfile}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 text-left ${
                          theme === 'light'
                            ? 'hover:bg-zinc-50 text-zinc-900'
                            : 'hover:bg-zinc-800/50 text-zinc-100'
                        }`}
                      >
                        {userData.currentProfile === 'USER' ? (
                          <ArrowRight className="w-4 h-4" />
                        ) : (
                          <ArrowLeft className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">
                          Switch to{' '}
                          {userData.currentProfile === 'USER'
                            ? 'Artist'
                            : 'User'}{' '}
                          Profile
                        </span>
                      </button>
                    )}

                    {userData?.role === 'USER' && !userData?.artistProfile && (
                      <Link
                        href="/request-artist"
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 ${
                          theme === 'light'
                            ? 'hover:bg-zinc-50 text-zinc-900'
                            : 'hover:bg-zinc-800/50 text-zinc-100'
                        }`}
                        onClick={() => setShowDropdown(false)}
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M12 5V19M5 12H19"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="text-sm font-medium">
                          Become an Artist
                        </span>
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        handleLogout();
                        setShowDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 text-left ${
                        theme === 'light'
                          ? 'hover:bg-zinc-50 text-zinc-900'
                          : 'hover:bg-zinc-800/50 text-zinc-100'
                      }`}
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 md:gap-4">
            <Link
              href="/register"
              className={`text-sm font-medium hidden md:block ${
                theme === 'light'
                  ? 'text-gray-600 hover:text-gray-900'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="bg-white text-black px-3 md:px-6 py-1.5 md:py-2 rounded-full text-sm font-medium hover:bg-white/90"
            >
              Log in
            </Link>
          </div>
        )}
      </div>

      <MusicAuthDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </header>
  );
}
