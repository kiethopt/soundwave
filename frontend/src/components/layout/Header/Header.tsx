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
import type { SearchSuggestion } from '@/types';
import { disconnectSocket } from '@/utils/socket';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { LogOut, Clock, Flag, Eye, CheckCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { MusicAuthDialog } from '@/components/ui/data-table/data-table-modals';
import { useSession } from '@/contexts/SessionContext';
import { useSocket } from '@/contexts/SocketContext';

// Define RecipientType locally for frontend use
enum RecipientType { 
  USER = 'USER',
  ARTIST = 'ARTIST'
}

// Define expected Notification type from socket independently
// Include all necessary fields from base Notification + potential additions
interface SocketNotification {
  id: string;
  type: string; 
  message: string;
  isRead: boolean;
  recipientType?: RecipientType | 'ADMIN' | string; 
  userId?: string; 
  artistId?: string; 
  senderId?: string; 
  createdAt: string; 
  claimId?: string | null;
  reportId?: string | null; // For report related notifications
  labelId?: string | null; // For label related notifications
  labelName?: string | null; // For label related notifications
  rejectionReason?: string | null; // For rejection notifications
  sender?: { 
      id: string;
      name?: string | null;
      username?: string | null;
      avatar?: string | null; // Added avatar for sender display
   } | null;
   // For new track/album by followed artist
   track?: { id: string; title: string; coverUrl?: string | null; artist?: { artistName?: string } };
   album?: { id: string; title: string; coverUrl?: string | null; artist?: { artistName?: string } };
}

export default function Header({
  onMenuClick,
}: {
  isSidebarOpen?: boolean;
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  const { user, isAuthenticated, loading, updateUserSession } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isActive = (path: string) => pathname === path;
  const [notificationCount, setNotificationCount] = useState(0);

  // Notifications handling
  const [showNotifications, setShowNotifications] = useState(false);
  const { socket, isConnected } = useSocket();
  const [notifications, setNotifications] = useState<SocketNotification[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

  // Search suggestions handling
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { theme } = useTheme();
  const router = useRouter();
  const { dialogOpen, setDialogOpen, handleProtectedAction } = useAuth();

  const isAdminOrArtist = user?.role === 'ADMIN' || user?.currentProfile === 'ARTIST';

  const filterNotificationsByProfile = (allNotifications: any[]) => {
    if (!user) return [];
    return allNotifications.filter(
      (n) => n.recipientType === user.currentProfile
    );
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Add this debugging helper before the fetchAndSetNotifications function
  const checkUnreadNotifications = () => {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    console.log('Current notification state:', { 
      notificationCount, 
      actualUnreadCount: unreadCount,
      notificationsLength: notifications.length,
      hasUnreadNotifications: unreadCount > 0,
      buttonShouldBeDisabled: notificationCount === 0
    });
    return unreadCount;
  };

  const fetchAndSetNotifications = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token || !user) return;

      const allNotificationsData = await api.notifications.getList(token);
      // console.log('[Header] Fetched All Notifications:', allNotificationsData);

      // Sửa logic lọc cho Admin
      let relevantNotifications;
      if (user.role === 'ADMIN') {
        // Admin thấy tất cả thông báo gửi đến userId của họ (thường là thông báo hệ thống/request)
        relevantNotifications = allNotificationsData.filter(
          (n: any) => n.userId === user.id && n.recipientType === 'USER'
        );
        // console.log('[Header] Filtered Admin Notifications:', relevantNotifications);
      } else {
        // Logic cũ cho non-admin users, lọc theo currentProfile
        relevantNotifications = allNotificationsData.filter(
          (n: any) => n.recipientType === user.currentProfile &&
                      (n.recipientType === 'USER' ? n.userId === user.id : n.artistId === user.artistProfile?.id)
        );
        // console.log(`[Header] Filtered ${user.currentProfile} Notifications:`, relevantNotifications);
      }

      setNotifications(relevantNotifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      const currentUnreadCount = relevantNotifications.filter((n:any) => !n.isRead).length;
      setNotificationCount(currentUnreadCount);
      localStorage.setItem('notificationCount', String(currentUnreadCount));

      // Cập nhật lại userData nếu cần (ví dụ: sau khi switch profile)
      // const newUserData = await api.auth.getMe(token);
      // localStorage.setItem('userData', JSON.stringify(newUserData));

    } catch (error) {
      console.error('Error fetching/setting notifications:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAndSetNotifications();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (socket && isConnected) {
       console.log("[Header] Setting up 'notification' listener on socket:", socket.id);
       
       const handleNotification = (data: SocketNotification) => { 
          console.log(`[Header] Received notification event`, data);
          const expectedUserId = user?.id;
          const expectedArtistProfileId = user?.artistProfile?.id;

          let shouldProcess = false;
          let toastMessage = data.message; // Default toast message

          if (user?.role === 'ADMIN') { 
             if (data?.userId === expectedUserId && data.recipientType === RecipientType.USER) { // Admin specific system/user notifications
                shouldProcess = true;
                console.log(`[Header] Processing ADMIN notification for self:`, data); 
             }
          } else { // User/Artist logic
             if (data?.recipientType === RecipientType.USER && data?.userId === expectedUserId) {
                shouldProcess = true;
                console.log(`[Header] Processing USER notification:`, data);
             } else if (data?.recipientType === RecipientType.ARTIST && data?.artistId === expectedArtistProfileId) {
                shouldProcess = true;
                console.log(`[Header] Processing ARTIST notification:`, data);
             }
          }

          // Specific toast messages for new notification types
          if (shouldProcess) {
            if (data.type === 'LABEL_REGISTRATION_APPROVED') {
              toastMessage = `Your label "${data.labelName || 'Unknown Label'}" has been approved!`;
            } else if (data.type === 'LABEL_REGISTRATION_REJECTED') {
              toastMessage = `Your label "${data.labelName || 'Unknown Label'}" was rejected. Reason: ${data.rejectionReason || 'Not specified'}`;
            }

             setNotifications(prev => [data, ...prev].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50)); 
             if (!data.isRead) { 
               setHasUnread(true);
               // Update notificationCount for immediate feedback
               setNotificationCount(prevCount => {
                 const newCount = prevCount + 1;
                 localStorage.setItem('notificationCount', String(newCount));
                 return newCount;
               });
             }
             toast.success(toastMessage || 'New notification'); 
          } else {
             console.log(`[Header] Filtering: Ignoring notification. Data userId: ${data?.userId}, artistId: ${data?.artistId}, recipientType: ${data?.recipientType}. Expected User: ${expectedUserId}, Expected Artist: ${expectedArtistProfileId}`);
          }
       };

      socket.on('notification', handleNotification);

      return () => {
        console.log("[Header] Cleaning up 'notification' listener on socket:", socket.id);
        socket.off('notification', handleNotification);
      };
    } else {
        console.log("[Header] Socket not available or not connected, skipping listener setup.");
    }
  }, [socket, isConnected, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
     const token = localStorage.getItem('userToken');
      if (token && user && user.role !== 'ADMIN' && user.currentProfile !== 'ARTIST') {
        api.history.saveSearch(token, searchQuery.trim())
          .catch(err => console.error("Failed to save search history:", err));
      }

      const canProceed = handleProtectedAction();
      if (canProceed) {
        router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        setShowSearchSuggestions(false);
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
      updateUserSession(null, null);
      setNotifications([]);
      setNotificationCount(0);
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
      window.location.href = '/login';
    }
  };

  const handleBellClick = async () => {
    try {
      const canProceed = handleProtectedAction();
      if (!canProceed || !user) return;

      const opening = !showNotifications;
      setShowNotifications((prev) => !prev);

      if (opening) {
        // Check unread notifications before fetching
        checkUnreadNotifications();
        
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const allNotificationsData = await api.notifications.getList(token);
        console.log('Fetched notifications on bell click:', allNotificationsData);
        const relevantNotifications = filterNotificationsByProfile(allNotificationsData);

        setNotifications((prevRelevant) => {
            const existingIds = new Set(prevRelevant.map(n => n.id));
            const newRelevantToAdd = relevantNotifications.filter(n => !existingIds.has(n.id));
            return [...newRelevantToAdd, ...prevRelevant].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });

        const currentUnreadCount = relevantNotifications.filter(n => !n.isRead).length;
        console.log('Current unread count:', currentUnreadCount, 'Button should be disabled:', currentUnreadCount === 0);
        setNotificationCount(currentUnreadCount);
        if (String(currentUnreadCount) !== localStorage.getItem('notificationCount')) {
          localStorage.setItem('notificationCount', String(currentUnreadCount));
        }
      }
    } catch (err) {
      console.error('Fetch/filter notifications error on bell click:', err);
    }
  };

  const handleSwitchProfile = async () => {
    try {
      const canProceed = handleProtectedAction();
      if (!canProceed) return;

      const token = localStorage.getItem('userToken');
      if (!token) return;

      const response = await api.auth.switchProfile(token);

      updateUserSession(response.user, token);

      if (response.user.currentProfile === 'ARTIST' && !response.user.artistProfile?.isActive) {
        toast.error('Your artist account has been deactivated');
      }

      toast.success(`Switched to ${response.user.currentProfile} profile`);
      setShowDropdown(false);

      if (response.user.currentProfile === 'ARTIST' && response.user.artistProfile?.isActive) {
        window.location.href = '/artist/dashboard';
      } else if (response.user.currentProfile === 'USER') {
        window.location.href = '/';
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

      if (!notification.isRead) {
        await api.notifications.markAsRead(notification.id, token);

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );

        setNotificationCount((prev) => {
          const newCount = Math.max(prev - 1, 0);
          localStorage.setItem('notificationCount', String(newCount));
          return newCount;
        });
      }

      setShowNotifications(false);

      if (notification.type === 'NEW_REPORT_SUBMITTED' || notification.type === 'REPORT_RESOLVED') {
        if (user?.role === 'ADMIN') {
          router.push('/admin/reports');
        } else {
          if (notification.reportId) {
            router.push(`/reports?reportId=${notification.reportId}`);
          } else {
            router.push('/reports');
          }
        }
      } else if (notification.type === 'LABEL_REGISTRATION_APPROVED') {
        toast.success(notification.message || 'Your label registration was approved!');
      } else if (notification.type === 'LABEL_REGISTRATION_REJECTED') {
        toast.error(notification.message || 'Your label registration was rejected.');
      }

    } catch (error) {
      console.error('Error marking notification as read:', error);
      const err = error as Error;
      if (err.message === 'Forbidden') {
        toast.error('Permission denied');
      } else {
        toast.error('Failed to update notification');
      }
    }
  };

  const fetchSearchSuggestions = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    setIsLoadingSuggestions(true);
    try {
      const suggestions = await api.history.getSuggestions(token, 5);
      setSearchSuggestions(suggestions || []);
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      setSearchSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSearchFocus = () => {
    if (isAuthenticated) {
       setShowSearchSuggestions(true);
       fetchSearchSuggestions();
    }
  };

  const handleClearSuggestions = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem('userToken');
    if (!token) {
      console.warn("Attempted to clear history without authentication.");
      return;
    }

    try {
      await api.history.deleteSearchHistory(token);
      setSearchSuggestions([]);
    } catch (error) {
      console.error("Error clearing search history:", error);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setShowSearchSuggestions(false);
    setSearchQuery('');
     switch (suggestion.type) {
      case 'Artist':
        router.push(`/artist/profile/${suggestion.data.id}`);
        break;
      case 'Track':
        router.push(`/track/${suggestion.data.id}`);
        break;
      case 'Album':
        router.push(`/album/${suggestion.data.id}`);
        break;
      default:
        break;
    }
  };

  const handleDiscoverClick = () => {
    if (isAuthenticated) {
      router.push('/discover');
    } else {
      setDialogOpen(true);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleMarkAllNotificationsAsRead = async () => {
    const token = localStorage.getItem('userToken');
    if (!token || !user) {
      toast.error('Authentication required to mark notifications as read.');
      return;
    }

    // Check unread notifications before marking all as read
    const actualUnreadCount = checkUnreadNotifications();
    if (actualUnreadCount === 0) {
      toast.success('No unread notifications to mark as read.');
      return;
    }

    try {
      const response = await api.notifications.markAllAsRead(token);
      if (response.success || response.message === 'All notifications marked as read') { 
        setNotifications(prevNotifications => 
          prevNotifications.map(n => ({ ...n, isRead: true }))
        );
        setNotificationCount(0);
        localStorage.setItem('notificationCount', '0');
        toast.success('All notifications marked as read.');
      } else {
        toast.error(response.message || 'Failed to mark all notifications as read.');
      }
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      toast.error(error.message || 'An error occurred.');
    }
  };

  return (
    <header
      className={`h-[72px] flex items-center justify-between px-2 md:px-4 lg:px-6 border-b sticky top-0 z-40 ${theme === 'light'
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

        {isAuthenticated && !isAdminOrArtist && (
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            <Link
              href="/"
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md transition-colors ${isActive('/')
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

            <button
              onClick={handleDiscoverClick}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md transition-colors ${isActive('/discover')
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
            </button>

            <div className="relative w-[400px]" ref={searchRef}>
              <form onSubmit={handleSearch} className="relative">
                <Search
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none ${theme === 'light' ? 'text-gray-400' : 'text-white/40'}`}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onFocus={handleSearchFocus}
                  placeholder="Search Artists, Tracks, Albums"
                  className={`w-full rounded-md py-1.5 md:py-2 pl-10 pr-4 text-sm focus:outline-none ${theme === 'light'
                    ? 'bg-gray-100 text-gray-900 placeholder:text-gray-500 focus:bg-gray-200'
                    : 'bg-white/10 text-white placeholder:text-white/40 focus:bg-white/20'
                    }`}
                  aria-haspopup="listbox"
                  aria-expanded={showSearchSuggestions}
                  autoComplete="off"
                />
              </form>

              {showSearchSuggestions && isAuthenticated && (
                <div
                  className={`absolute mt-1 w-full rounded-md shadow-lg max-h-60 overflow-y-auto z-50 border ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#282828] border-white/10'}`}
                  role="listbox"
                >
                  {isLoadingSuggestions ? (
                    <div className={`px-4 py-3 text-sm text-center ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>Loading suggestions...</div>
                  ) : searchSuggestions.length > 0 ? (
                    searchSuggestions.map((suggestion, index) => (
                      <button
                        key={`${suggestion.type}-${suggestion.data.id}-${index}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 ease-in-out border-b last:border-b-0 ${theme === 'light' ? 'hover:bg-gray-100 border-gray-100' : 'hover:bg-white/10 border-white/10'}`}
                        role="option"
                        aria-selected="false"
                      >
                        <Clock className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-gray-400' : 'text-white/50'}`} />
                        <Image
                          src={suggestion.type === 'Artist'
                            ? suggestion.data.avatar || '/images/default-avatar.jpg'
                            : suggestion.data.coverUrl || '/images/default-cover.png'}
                          alt={suggestion.type === 'Artist' ? suggestion.data.artistName || 'Artist' : suggestion.data.title || 'Media'}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded object-cover shrink-0"
                        />
                        <div className="flex-1 overflow-hidden">
                          <p className={`text-sm font-medium truncate ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>
                            {suggestion.type === 'Artist' ? suggestion.data.artistName : suggestion.data.title}
                          </p>
                          <p className={`text-xs truncate ${theme === 'light' ? 'text-gray-500' : 'text-white/60'}`}>
                            {suggestion.type}
                            {suggestion.type !== 'Artist' && suggestion.data.artist && ` • ${suggestion.data.artist.artistName}`}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className={`px-4 py-3 text-sm text-center ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>No recent searches found.</div>
                  )}
                  {!isLoadingSuggestions && searchSuggestions.length > 0 && (
                     <div className={`sticky bottom-0 px-3 py-2 ${theme === 'light' ? 'bg-white/95 backdrop-blur-sm' : 'bg-[#282828]/95 backdrop-blur-sm'} border-t ${theme === 'light' ? 'border-gray-200' : 'border-white/10'}`}>
                       <button
                         onClick={handleClearSuggestions}
                         className={`w-full text-center text-sm py-1.5 rounded-md transition-colors duration-200 ${theme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'}`}
                       >
                         Clear recent searches
                       </button>
                     </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 md:gap-4">
        {isLoggingOut ? (
          <div className="w-8 h-8"></div>
        ) : isAuthenticated ? (
          <>
            {user?.artistProfile?.isVerified && (
               <button
                 onClick={handleSwitchProfile}
                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${theme === 'light'
                     ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                     : 'bg-white/10 text-white hover:bg-white/20'
                 }`}
               >
                 {user.currentProfile === 'USER' ? (
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
                className={`p-2 rounded-full relative cursor-pointer transition-colors duration-200 ease-in-out flex items-center justify-center ${theme === 'light' ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' : 'text-gray-400 hover:bg-white/10 hover:text-white'} ${notificationCount > 0 ? 'text-[#A57865]' : ''}`}
                onClick={handleBellClick}
                aria-label={`Notifications (${notificationCount} unread)`}
              >
                <Notifications
                    className={`w-5 h-5 transition-colors ${notificationCount > 0 ? 'text-[#A57865]' : ''}`}
                  />
                  {notificationCount > 0 && (
                    <span
                       className="absolute top-0 right-0 -mt-1 -mr-1 flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full"
                       aria-hidden="true"
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
                       No relevant notifications for {user?.currentProfile} profile
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
                    className={`sticky bottom-0 px-3 py-2 flex items-center gap-2 ${theme === 'light' ? 'bg-white/95 backdrop-blur-sm' : 'bg-[#282828]/95 backdrop-blur-sm'} border-t ${theme === 'light' ? 'border-gray-200' : 'border-white/10'}`}
                  >
                    <Link href="/notifications" className="flex-1 block">
                      <button
                        className={`w-full text-center text-sm py-1.5 rounded-md transition-colors duration-200 flex items-center justify-center gap-1.5 ${theme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        onClick={() => setShowNotifications(false)}
                      >
                        <Eye className="w-4 h-4" />
                        View All
                      </button>
                    </Link>
                    <button
                      className={`flex-1 text-center text-sm py-1.5 rounded-md transition-colors duration-200 flex items-center justify-center gap-1.5 ${unreadCount === 0 ? (theme === 'light' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white/5 text-white/40 cursor-not-allowed') : (theme === 'light' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20')}`}
                      onClick={handleMarkAllNotificationsAsRead}
                      disabled={unreadCount === 0}
                    >
                      <CheckCheck className="w-4 h-4" />
                      Mark All Read
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden cursor-pointer border-2 border-transparent hover:border-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A57865]"
                onClick={() => setShowDropdown(!showDropdown)}
                aria-haspopup="true"
                aria-expanded={showDropdown}
              >
                <div className="relative w-full h-full rounded-full overflow-hidden">
                  <Image
                    src={user?.currentProfile === 'ARTIST' && user?.artistProfile?.avatar
                      ? user.artistProfile.avatar
                      : user?.avatar || '/images/default-avatar.jpg'}
                    alt="User avatar"
                    fill
                    sizes="32px"
                    className="object-cover"
                    priority
                  />
                </div>
              </button>

              {showDropdown && (
                <div
                  className={`absolute right-0 mt-2 w-64 rounded-2xl shadow-lg overflow-hidden z-50 border ${theme === 'light' ? 'bg-white border-zinc-200' : 'bg-[#111111] border-zinc-800'}`}
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                >
                  <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full overflow-hidden">
                          <Image
                            src={
                              user?.currentProfile === 'ARTIST' && user?.artistProfile?.avatar
                                ? user.artistProfile.avatar
                                : user?.avatar || '/images/default-avatar.jpg'
                            }
                            alt={
                              user?.currentProfile === 'ARTIST'
                                ? user?.artistProfile?.artistName || 'Artist'
                                : user?.name || 'User'
                            }
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <div
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ${theme === 'light' ? 'ring-white' : 'ring-zinc-900'}`}
                          aria-label="Online status"
                        />
                      </div>
                      <div className="flex-1">
                        <h2
                          className={`text-base font-semibold truncate ${theme === 'light' ? 'text-zinc-900' : 'text-zinc-100'}`}
                        >
                          {user?.currentProfile === 'ARTIST'
                            ? user?.artistProfile?.artistName || user?.name
                            : user?.name || user?.username || 'User'
                          }
                        </h2>
                        <p
                          className={`text-sm ${theme === 'light' ? 'text-zinc-600' : 'text-zinc-400'}`}
                        >
                          {user?.role === 'ADMIN'
                            ? 'Administrator'
                            : user?.currentProfile === 'ARTIST'
                              ? 'Artist'
                              : 'User'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`h-px ${theme === 'light' ? 'bg-zinc-200' : 'bg-zinc-800'}`} />

                  <div className="p-2" role="none">
                    <Link
                      href={
                        user?.role === 'ADMIN'
                          ? `/admin/profile/${user.id}`
                          : user?.currentProfile === 'USER'
                            ? `/profile/${user?.id}`
                            : `/artist/profile/${user?.artistProfile?.id}`
                      }
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 ${theme === 'light' ? 'hover:bg-zinc-50 text-zinc-900' : 'hover:bg-zinc-800/50 text-zinc-100'}`}
                      onClick={() => setShowDropdown(false)}
                      role="menuitem"
                    >
                      <ProfileIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">Profile</span>
                    </Link>

                    {user?.role === 'USER' && user?.currentProfile === 'USER' && (
                      <Link
                        href="/reports"
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 ${theme === 'light' ? 'hover:bg-zinc-50 text-zinc-900' : 'hover:bg-zinc-800/50 text-zinc-100'}`}
                        onClick={() => setShowDropdown(false)}
                        role="menuitem"
                      >
                        <Flag className="w-4 h-4" />
                        <span className="text-sm font-medium">My Reports</span>
                      </Link>
                    )}

                    {user?.role === 'USER' && user?.currentProfile === 'USER' && (
                      <Link
                        href="/settings"
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 ${theme === 'light' ? 'hover:bg-zinc-50 text-zinc-900' : 'hover:bg-zinc-800/50 text-zinc-100'}`}
                        onClick={() => setShowDropdown(false)}
                        role="menuitem"
                      >
                        <Settings className="w-4 h-4" />
                        <span className="text-sm font-medium">Settings</span>
                      </Link>
                    )}

                    {user?.role === 'USER' && !user?.artistProfile && !user?.hasPendingArtistRequest && (
                      <Link
                        href="/choose-artist-action"
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 ${theme === 'light' ? 'hover:bg-zinc-50 text-zinc-900' : 'hover:bg-zinc-800/50 text-zinc-100'}`}
                        onClick={() => setShowDropdown(false)}
                        role="menuitem"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
                      role="menuitem"
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