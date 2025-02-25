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
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { set } from 'lodash';

export default function Header({
  isSidebarOpen,
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

  // ======== Mới thêm cho notifications ========
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  // (Bạn có thể định nghĩa type Notification thay vì any[])
  const notificationRef = useRef<HTMLDivElement>(null);
  // ============================================

  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  // Check if user is admin or artist
  const isAdminOrArtist =
    userData?.role === 'ADMIN' || userData?.currentProfile === 'ARTIST';

  // ==============================
  // 1) Đoạn code pusher subscribe
  // ==============================
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

  // ==============================
  // 2) Click outside để đóng dropdown
  //    a) Menu user dropdown
  //    b) Notification dropdown
  // ==============================
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Click ngoài user dropdown
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
      // Click ngoài notification dropdown
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

  // ============================
  // 3) Check auth
  // ============================
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

  // ============================
  // 4) Handle search
  // ============================
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (!isAuthenticated) {
        router.push('/login');
      } else {
        router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchQuery('');
      }
    }
  };

  // ============================
  // 5) Logout
  // ============================
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

  // ==============================
  // 6) Sự kiện click chuông
  // ==============================
  const handleBellClick = async () => {
    try {
      // 1. Toggle hiển thị dropdown
      setShowNotifications((prev) => !prev);

      // 2. Nếu dropdown sắp được mở => load danh sách notifications
      if (!showNotifications) {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        // Gọi API lấy danh sách thông báo
        const notificationsData = await api.notifications.getList(token);
        console.log('Fetched notifications:', notificationsData);
        if (notificationsData) {
          setNotifications(notificationsData);
        }
      }

      // 3. Đặt lại notificationCount = 0
      setNotificationCount(0);
      localStorage.setItem('notificationCount', '0');
    } catch (err) {
      console.error('Fetch notifications error:', err);
    }
  };

  // ==============================
  // 7) Switch profile
  // ==============================
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

  // =============================
  // 8) Thông báo thời gian thực
  // =============================
  useEffect(() => {
    const userDataStr = localStorage.getItem('userData');
    if (!userDataStr) return;

    const userData = JSON.parse(userDataStr);
    const userId = userData.id;

    const channel = pusher.subscribe(`user-${userId}`);
    console.log('Subscribed to Pusher channel:', `user-${userId}`);

    // Hàm xử lý sự kiện realtime cho thông báo mới
    const handleNewNotification = (data: {
      type: string;
      message: string;
      [key: string]: any;
    }) => {
      console.log('Received new notification event:', data);
      // Tăng số lượng thông báo
      setNotificationCount((prev) => {
        const newCount = prev + 1;
        localStorage.setItem('notificationCount', String(newCount));
        return newCount;
      });
      // Cập nhật danh sách thông báo nếu bạn muốn hiển thị chi tiết luôn
      setNotifications((prev) => [data, ...prev]);
    };

    // Bind event "notification" để nhận thông báo mới realtime
    channel.bind('notification', handleNewNotification);

    // Nếu vẫn muốn giữ sự kiện cũ, bạn có thể bind thêm
    const handleArtistRequestStatus = (data: { type: string }) => {
      console.log('Received artist request status event:', data);
      // Logic cho REQUEST_APPROVED/REQUEST_REJECTED (nếu cần)
    };
    channel.bind('artist-request-status', handleArtistRequestStatus);

    // Lấy số lượng lưu sẵn (nếu có)
    const savedCount = Number(localStorage.getItem('notificationCount') || '0');
    setNotificationCount(savedCount);

    return () => {
      channel.unbind('notification', handleNewNotification);
      channel.unbind('artist-request-status', handleArtistRequestStatus);
      pusher.unsubscribe(`user-${userId}`);
    };
  }, []);

  // Hàm thay đổi trạng thái read thông báo
  const handleNotificationClick = async (notification: any) => {
    // Nếu thông báo chưa đọc, gọi API đánh dấu là đã đọc
    if (!notification.isRead) {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) return;
        // Giả sử api.notifications.markAsRead là hàm gọi API backend
        await api.notifications.markAsRead(notification.id, token);
        // Cập nhật lại state notifications: thay đổi isRead của thông báo đó thành true
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

        {/* Navigation Links - Only show for regular users */}
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
            {/* Nút chuông Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                className={`p-2 rounded-full relative ${
                  theme === 'light' ? 'hover:bg-gray-200' : 'hover:bg-white/10'
                }`}
                onClick={handleBellClick}
              >
                <div className="relative">
                  <Notifications
                    className={`w-5 h-5 ${
                      theme === 'light' ? 'text-gray-700' : 'text-white'
                    }`}
                  />
                  {/* Badge chấm đỏ */}
                  {notificationCount > 0 && (
                    <span
                      style={{ height: '10px', width: '10px', right: '-10px' }}
                      className="absolute -top-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      {/* Nếu cần hiển thị số thì mở comment */}
                      {/* {notificationCount > 99 ? '99+' : notificationCount} */}
                    </span>
                  )}
                </div>
              </button>
              {/* Dropdown Notifications */}
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
                        {/* Hiển thị thêm thời gian nếu cần, ví dụ: */}
                        {/* <span className="block mt-1 text-xs text-gray-500">
                        {formatDate(item.createdAt)}
                      </span> */}
                      </div>
                    ))
                  )}

                  {/* Nút "Xem tất cả" */}
                  <div className="px-4 py-3">
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

            <button
              className={`p-2 rounded-full ${
                theme === 'light' ? 'hover:bg-gray-200' : 'hover:bg-white/10'
              }`}
            >
              <Settings
                className={`w-5 h-5 ${
                  theme === 'light' ? 'text-gray-700' : 'text-white'
                }`}
              />
            </button>
            {/* Theme toggle - For Admin and Artist */}
            {(userData?.role === 'ADMIN' ||
              userData?.currentProfile === 'ARTIST') && (
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full ${
                  theme === 'light' ? 'hover:bg-gray-200' : 'hover:bg-white/10'
                }`}
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-gray-700" />
                ) : (
                  <Sun className="w-5 h-5 text-white" />
                )}
              </button>
            )}
            <div className="relative" ref={dropdownRef}>
              <button
                className={`flex items-center justify-center w-8 h-8 rounded-full overflow-hidden ${
                  theme === 'light'
                    ? 'bg-gray-200 hover:bg-gray-200'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
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
                <div
                  className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 ${
                    theme === 'light' ? 'bg-white' : 'bg-[#282828]'
                  }`}
                >
                  <Link
                    href="/account"
                    className={`block px-4 py-2 text-sm ${
                      theme === 'light'
                        ? 'text-gray-700 hover:bg-gray-200'
                        : 'text-white hover:bg-white/10'
                    }`}
                    onClick={() => setShowDropdown(false)}
                  >
                    Account
                  </Link>

                  <Link
                    href={userData?.currentProfile === 'USER' 
                      ? `/profile/${userData?.id}`
                      : `/artist/profile/${userData?.artistProfile?.id}`}
                    className={`block px-4 py-2 text-sm ${
                      theme === 'light'
                        ? 'text-gray-700 hover:bg-gray-200'
                        : 'text-white hover:bg-white/10'
                    }`}
                    onClick={() => setShowDropdown(false)}
                  >
                    Profile
                  </Link>


                  {userData?.artistProfile?.isVerified && (
                    <button
                      onClick={handleSwitchProfile}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        theme === 'light'
                          ? 'text-gray-700 hover:bg-gray-200'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      Switch to{' '}
                      {userData.currentProfile === 'USER' ? 'Artist' : 'User'}{' '}
                      Profile
                    </button>
                  )}

                  {userData?.role === 'USER' && !userData?.artistProfile && (
                    <Link
                      href="/request-artist"
                      className={`block px-4 py-2 text-sm ${
                        theme === 'light'
                          ? 'text-gray-700 hover:bg-gray-200'
                          : 'text-white hover:bg-white/10'
                      }`}
                      onClick={() => setShowDropdown(false)}
                    >
                      Become an Artist
                    </Link>
                  )}

                  <div
                    className={`border-t my-1 ${
                      theme === 'light' ? 'border-gray-200' : 'border-white/10'
                    }`}
                  ></div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowDropdown(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm ${
                      theme === 'light'
                        ? 'text-gray-700 hover:bg-gray-200'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    Log out
                  </button>
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
    </header>
  );
}
