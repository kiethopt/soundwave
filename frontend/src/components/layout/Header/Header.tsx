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
  ArrowLeft,
} from '@/components/ui/Icons';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@/types';
import { getSocket, disconnectSocket } from '@/utils/socket';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { LogOut } from 'lucide-react';
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

  // --- Add state for logging out --- //
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // --- End add state for logging out --- //

  const { theme } = useTheme();
  const router = useRouter();
  const { dialogOpen, setDialogOpen, handleProtectedAction } = useAuth();

  const isAdminOrArtist =
    userData?.role === 'ADMIN' || userData?.currentProfile === 'ARTIST';

  // Helper function to filter notifications based on current profile
  const filterNotificationsByProfile = (allNotifications: any[]) => {
    if (!userData) return [];
    return allNotifications.filter(
      (n) => n.recipientType === userData.currentProfile
    );
  };

  // Calculate unread count based on currently relevant notifications
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Function to fetch, filter, and update notifications state
  const fetchAndSetNotifications = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token || !userData) return;

      const allNotificationsData = await api.notifications.getList(token);
      const relevantNotifications = filterNotificationsByProfile(allNotificationsData);

      setNotifications(relevantNotifications);
      const currentUnreadCount = relevantNotifications.filter(n => !n.isRead).length;
      setNotificationCount(currentUnreadCount);
      localStorage.setItem('notificationCount', String(currentUnreadCount));

    } catch (error) {
      console.error('Error fetching/setting notifications:', error);
    }
  };

  // Fetch initial notifications based on current profile
  useEffect(() => {
    if (isAuthenticated && userData) { // Depend on userData
      fetchAndSetNotifications();
    }
  }, [isAuthenticated, userData]); // Add userData dependency

  // Handle Socket.IO connection and events
  useEffect(() => {
    if (!userData?.id || !isAuthenticated) return;

    const socket = getSocket();

    const handleNewNotification = (data: any) => {
      console.log('Received new notification event via Socket.IO:', data);
      if (data.recipientType !== userData.currentProfile) {
        console.log(`Ignoring notification for ${data.recipientType} profile while viewing ${userData.currentProfile}`);
        return;
      }
      setNotifications((prev) => {
        if (prev.some((n) => n.id === data.id)) return prev;
        return [data, ...prev];
      });
      if (!data.isRead) {
        setNotificationCount((prev) => {
          const newCount = prev + 1;
          localStorage.setItem('notificationCount', String(newCount));
          return newCount;
        });
      }
      const fetchAndUpdateUserData = async () => {
        const token = localStorage.getItem('userToken');
        if (!token) return
        try {
          const newUserData = await api.auth.getMe(token);
          if (newUserData) {
            localStorage.setItem('userData', JSON.stringify(newUserData));
            setUserData(newUserData);
          } else {
            console.warn('Received null user data after notification');
          }
        } catch (error) {
          console.error('Failed to fetch updated user data after notification:', error);
        }
      };
      fetchAndUpdateUserData();
    };

    const handleArtistRequestStatus = (data: any) => {
      console.log('Received artist request status event via Socket.IO:', data);
      const fetchAndUpdateUserData = async () => {
        const token = localStorage.getItem('userToken');
        if (!token) return
        try {
          const newUserData = await api.auth.getMe(token);
          if (newUserData) {
            localStorage.setItem('userData', JSON.stringify(newUserData));
            setUserData(newUserData);
          } else {
            console.warn('Received null user data after status update');
          }
        } catch (error) {
          console.error('Failed to fetch updated user data after status update:', error);
        }
      };
      fetchAndUpdateUserData();
    };

    socket.on('notification', handleNewNotification);
    socket.on('artist-request-status', handleArtistRequestStatus);

    const savedCount = Number(localStorage.getItem('notificationCount') || '0');
    setNotificationCount(savedCount);

    return () => {
      console.log('Cleaning up Header socket listeners');
      socket.off('notification', handleNewNotification);
      socket.off('artist-request-status', handleArtistRequestStatus);
    };
  }, [userData, isAuthenticated]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check authentication and set initial userData
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('userToken');
      if (!token) {
          setIsAuthenticated(false);
          setUserData(null);
          return;
      }

      try {
          const fetchedUserData = await api.auth.getMe(token);
          
          if (fetchedUserData) {
              setIsAuthenticated(true);
              setUserData(fetchedUserData);
              localStorage.setItem('userData', JSON.stringify(fetchedUserData));
          } else {
              console.warn("Couldn't fetch user data with existing token.");
              localStorage.removeItem('userToken');
              localStorage.removeItem('sessionId');
              localStorage.removeItem('userData');
              setIsAuthenticated(false);
              setUserData(null);
          }
      } catch (e) {
          console.error("Failed to fetch user data:", e);
          localStorage.removeItem('userToken');
          localStorage.removeItem('sessionId');
          localStorage.removeItem('userData');
          setIsAuthenticated(false);
          setUserData(null);
      }
    };
    checkAuth();
    // Add listener for storage changes to sync across tabs/windows
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'userData' || event.key === 'userToken') {
            checkAuth();
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);

  }, [router]);

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
    setIsLoggingOut(true);

    try {
      const token = localStorage.getItem('userToken');
      const sessionId = localStorage.getItem('sessionId');

      if (token && sessionId) {
        await api.auth.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      disconnectSocket();

      // Dọn dẹp local storage (State reset is now done above)
      localStorage.removeItem('userToken');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('userData');
      localStorage.removeItem('notificationCount');
      localStorage.removeItem('hasPendingRequest');

      // Chuyển hướng về trang đăng nhập bằng reload
      window.location.href = '/login';
    }
  };

  const handleBellClick = async () => {
    try {
      const canProceed = handleProtectedAction();
      if (!canProceed || !userData) return; // Check userData

      setShowNotifications((prev) => !prev);

      if (!showNotifications) { // Only fetch/update if opening the dropdown
        const token = localStorage.getItem('userToken');
        if (!token) return;

        // Fetch, filter based on CURRENT profile, and update state/count
        const allNotificationsData = await api.notifications.getList(token);
        console.log('Fetched notifications on bell click:', allNotificationsData);
        const relevantNotifications = filterNotificationsByProfile(allNotificationsData);

        // Merge new relevant notifications with existing relevant ones, preventing duplicates
        setNotifications((prevRelevant) => {
            const existingIds = new Set(prevRelevant.map(n => n.id));
            const newRelevantToAdd = relevantNotifications.filter(n => !existingIds.has(n.id));
            // Combine and sort (optional, most recent first)
            return [...newRelevantToAdd, ...prevRelevant].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });

        // Reset visual count and storage count for the current profile's notifications
        const currentUnreadCount = relevantNotifications.filter(n => !n.isRead).length;
        setNotificationCount(currentUnreadCount);
        localStorage.setItem('notificationCount', String(currentUnreadCount));

        // Consider marking relevant unread notifications as read on the backend *if* that's the desired UX
        // This requires iterating `relevantNotifications` and calling `api.notifications.markAsRead`
        // For now, just updating the display count.
      }
    } catch (err) {
      console.error('Fetch/filter notifications error on bell click:', err);
    }
  };

  // Function to handle switching profiles
  const handleSwitchProfile = async () => {
    try {
      const canProceed = handleProtectedAction();
      if (!canProceed) return;

      const token = localStorage.getItem('userToken');
      if (!token) return;

      const response = await api.auth.switchProfile(token);

      if (response.user.artistProfile && !response.user.artistProfile.isActive) {
        toast.error('Your artist account has been deactivated');
        return;
      }

      localStorage.setItem('userData', JSON.stringify(response.user));
      setUserData(response.user); // Update state immediately

      // Fetch notifications for the new profile (handled by useEffect dependency)
      toast.success(`Switched to ${response.user.currentProfile} profile`);
      setShowDropdown(false); // Close dropdown if open

      // Redirect based on new profile using window.location.href for a full reload
      // This ensures components remount with the correct profile data
      if (response.user.currentProfile === 'ARTIST') {
        window.location.href = '/artist/dashboard';
      } else {
        window.location.href = '/'; // Redirect to home for USER profile
      }
    } catch (error) {
      console.error('Error switching profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch profile';
      toast.error(
        errorMessage.includes('deactivated')
          ? 'Your account has been deactivated'
          : errorMessage
      );
    }
  };

  const handleNotificationClick = async (notification: any) => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) return;

      await api.notifications.markAsRead(notification.id, token);

      // Update state locally
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n
        )
      );

      // Decrement the visual unread count if it was unread
      if (!notification.isRead) {
        setNotificationCount((prev) => {
          const newCount = Math.max(prev - 1, 0);
          // Update localStorage count as well (optional, fetchAndSetNotifications handles it mostly)
          // localStorage.setItem('notificationCount', String(newCount));
          return newCount;
        });
      }

      // Optional: Navigate based on notification type
      // if (notification.type === 'NEW_FOLLOW') { router.push(...) }

    } catch (error) {
      console.error('Error marking notification as read:', error);
      const err = error as Error;
      if (err.message === 'Forbidden') {
        toast.error('You do not have permission to mark this notification as read');
      } else {
        toast.error('Failed to mark notification as read');
      }
    }
  };

  return (
    <header
      className={`h-[72px] flex items-center justify-between px-2 md:px-4 lg:px-6 border-b ${theme === 'light'
        ? 'bg-white border-gray-200'
        : 'bg-[#1c1c1c] border-white/10'
        }`}
    >
      {/* Left Side */}
      <div className="flex items-center gap-2 md:gap-4 lg:gap-6">
        <button
          onClick={onMenuClick}
          className={`md:hidden p-2 ${theme === 'light'
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
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md ${isActive('/')
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
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md ${isActive('/discover')
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
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${theme === 'light' ? 'text-gray-400' : 'text-white/40'}`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className={`w-full rounded-md py-1.5 md:py-2 pl-10 pr-4 text-sm focus:outline-none ${theme === 'light'
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
        {isLoggingOut ? (
          // Render nothing or a spinner while logging out
          <div className="w-8 h-8"></div> // Placeholder to maintain layout spacing
        ) : isAuthenticated ? (
          <>
            {/* Bi-directional Artist/User Switch Button */}
            {userData?.artistProfile?.isVerified && (
               <button
                 onClick={async () => {
                   // handleSwitchProfile handles the logic for both directions
                   await handleSwitchProfile();
                 }}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                   theme === 'light'
                     ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                     : 'bg-white/10 text-white hover:bg-white/20'
                 }`}
               >
                 {userData.currentProfile === 'USER' ? (
                   <>
                     <ArrowRight className="w-4 h-4" />
                     <span>Artist Dashboard</span>
                   </>
                 ) : (
                   <>
                     <ArrowLeft className="w-4 h-4" />
                     <span>Go to User</span>
                   </>
                 )}
               </button>
            )}

            <div className="relative" ref={notificationRef}>
              <button
                className={`p-2 rounded-full relative cursor-pointer transition-colors duration-200 ease-in-out flex items-center justify-center ${theme === 'light' ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' : 'text-gray-400 hover:bg-white/10 hover:text-white'} ${notificationCount > 0 ? 'text-blue-500' : ''}`}
                onClick={handleBellClick}
                aria-label="Notifications"
              >
                <Notifications
                    className={`w-5 h-5 transition-colors ${notificationCount > 0 ? 'text-[#A57865]' : ''}`}
                  />
                  {notificationCount > 0 && (
                    <span
                       className="absolute top-0 right-0 -mt-1 -mr-1 flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full"
                    >
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
              </button>
              {showNotifications && (
                <div
                  className={`absolute right-0 mt-2 w-80 max-h-[400px] overflow-y-auto rounded-lg shadow-xl py-1 z-50 border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#282828] border-white/10'}`}
                >
                   {notifications.length === 0 ? (
                     <p className={`px-4 py-3 text-sm text-center ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                       No relevant notifications for {userData?.currentProfile} profile
                     </p>
                   ) : (
                     notifications.map((item) => (
                       <div
                         key={item.id}
                         className={`cursor-pointer px-4 py-2.5 transition-colors duration-150 ease-in-out border-b last:border-b-0
                           ${item.isRead
                             ? theme === 'light'
                               ? 'bg-white hover:bg-gray-50 text-gray-600'
                               : 'bg-[#282828] hover:bg-white/5 text-gray-400'
                             : theme === 'light'
                               ? 'bg-blue-50 hover:bg-blue-100 text-gray-900 font-medium'
                               : 'bg-blue-900/30 hover:bg-blue-900/50 text-white font-medium'
                           }
                           ${theme === 'light' ? 'border-gray-100' : 'border-white/10'}`}
                         onClick={() => handleNotificationClick(item)}
                       >
                         <p className="line-clamp-3 text-sm leading-snug">{item.message}</p>
                         <p className={`text-xs mt-1 ${item.isRead ? (theme === 'light' ? 'text-gray-400' : 'text-gray-500') : (theme === 'light' ? 'text-blue-600' : 'text-blue-400')}`}>
                           {new Date(item.createdAt).toLocaleString()}
                         </p>
                       </div>
                     ))
                   )}
                   <div
                    className={`sticky bottom-0 px-3 py-2 ${theme === 'light' ? 'bg-white/95 backdrop-blur-sm' : 'bg-[#282828]/95 backdrop-blur-sm'} border-t ${theme === 'light' ? 'border-gray-200' : 'border-white/10'}`}
                  >
                    <Link href="/notifications" className="block">
                      <button
                        className={`w-full text-center text-sm py-1.5 rounded-md transition-colors duration-200 ${theme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        onClick={() => setShowNotifications(false)}
                      >
                        View All Notifications
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
                  className={`absolute right-0 mt-2 w-64 rounded-2xl shadow-lg overflow-hidden z-50 border ${theme === 'light' ? 'bg-white border-zinc-200' : 'bg-[#111111] border-zinc-800'}`}
                >
                  <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          <Image
                            src={
                              userData?.currentProfile === 'ARTIST' && userData?.artistProfile?.avatar
                                ? userData.artistProfile.avatar
                                : userData?.avatar || '/images/default-avatar.jpg'
                            }
                            alt={
                              userData?.currentProfile === 'ARTIST'
                                ? userData?.artistProfile?.artistName || 'Artist'
                                : userData?.name || 'User'
                            }
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <div
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ${theme === 'light' ? 'ring-white' : 'ring-zinc-900'}`}
                        />
                      </div>
                      <div className="flex-1">
                        <h2
                          className={`text-base font-semibold ${theme === 'light' ? 'text-zinc-900' : 'text-zinc-100'}`}
                        >
                          {userData?.currentProfile === 'ARTIST' 
                            ? userData?.artistProfile?.artistName || userData?.name
                            : userData?.name || userData?.username || 'User'
                          }
                        </h2>
                        <p
                          className={`text-sm ${theme === 'light' ? 'text-zinc-600' : 'text-zinc-400'}`}
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

                  <div className={`h-px ${theme === 'light' ? 'bg-zinc-200' : 'bg-zinc-800'}`} />

                  <div className="p-2">
                    <Link
                      href={
                        userData?.role === 'ADMIN'
                          ? `/admin/profile/${userData.id}`
                          : userData?.currentProfile === 'USER'
                            ? `/profile/${userData?.id}`
                            : `/artist/profile/${userData?.artistProfile?.id}`
                      }
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 ${theme === 'light' ? 'hover:bg-zinc-50 text-zinc-900' : 'hover:bg-zinc-800/50 text-zinc-100'}`}
                      onClick={() => setShowDropdown(false)}
                    >
                      <ProfileIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">Profile</span>
                    </Link>

                    <Link
                      href="/settings"
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 ${theme === 'light' ? 'hover:bg-zinc-50 text-zinc-900' : 'hover:bg-zinc-800/50 text-zinc-100'}`}
                      onClick={() => setShowDropdown(false)}
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm font-medium">Settings</span>
                    </Link>

                    {userData?.role === 'USER' && !userData?.artistProfile && (
                      <Link
                        href="/request-artist"
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 ${theme === 'light' ? 'hover:bg-zinc-50 text-zinc-900' : 'hover:bg-zinc-800/50 text-zinc-100'}`}
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
                      className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 text-left ${theme === 'light' ? 'hover:bg-zinc-50 text-zinc-900' : 'hover:bg-zinc-800/50 text-zinc-100'}`}
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
              className={`text-sm font-medium hidden md:block ${theme === 'light' ? 'text-gray-600 hover:text-gray-900' : 'text-white/70 hover:text-white'}`}
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