'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/utils/api';
import type { User } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';

export type NotificationType = {
  id: string;
  type:
  | 'NEW_TRACK'
  | 'NEW_ALBUM'
  | 'EVENT_REMINDER'
  | 'NEW_FOLLOW'
  | 'ARTIST_REQUEST_APPROVE'
  | 'ARTIST_REQUEST_REJECT';
  message: string;
  isRead: boolean;
  coverUrl?: string;
  title?: string;
  createdAt: string;
  senderId?: string;
  recipientType: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredNotification, setHoveredNotification] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { theme } = useTheme();
  const router = useRouter();

  const filterNotificationsByProfile = (allNotifications: NotificationType[], user: User | null) => {
    if (!user) return [];
    return allNotifications.filter(
      (n: any) => n.recipientType === user.currentProfile
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      let user: User | null = null;
      let token: string | null = null;
      try {
        token = localStorage.getItem('userToken');
        const storedUserData = localStorage.getItem('userData');

        if (!token) {
          router.replace('/login');
          return;
        }

        if (storedUserData) {
          try {
            user = JSON.parse(storedUserData);
            setCurrentUser(user);
          } catch (e) {
            console.error("Failed to parse user data from localStorage", e);
            user = await api.auth.getMe(token);
            if(user) {
              localStorage.setItem('userData', JSON.stringify(user));
              setCurrentUser(user);
            } else {
              throw new Error("Failed to fetch user data after parse error");
            }
          }
        } else {
           user = await api.auth.getMe(token);
            if (user) {
              localStorage.setItem('userData', JSON.stringify(user));
              setCurrentUser(user);
            } else {
               throw new Error("Failed to fetch user data");
            }
        }

        if (!user) {
          toast.error("Could not load user data.");
          setLoading(false);
          return;
        }

        const allNotifications = await api.notifications.getList(token);

        const relevantNotifications = filterNotificationsByProfile(allNotifications, user);

        setNotifications(relevantNotifications);

      } catch (error) {
        console.error('Error fetching data:', error);
        if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('Forbidden'))) {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            setCurrentUser(null);
            toast.error('Authentication error. Please log in again.');
        } else {
             toast.error('Error fetching notifications');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('You need to log in to perform this action!');
        return;
      }
      await api.notifications.markAllAsRead(token);
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
      toast.success('All notifications have been marked as read!');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('An error occurred while marking notifications as read!');
    }
  };

  const getDeleteAction = (hasUnread: boolean, hasRead: boolean): string | null => {
    if (hasUnread && hasRead) {
      return prompt(
        'What do you want to delete?\n- Enter "all" to delete all notifications\n- Enter "read" to delete only read notifications\n- Press Cancel to abort'
      );
    } else if (hasRead && !hasUnread) {
      return confirm('Are you sure you want to delete all read notifications?') ? 'all' : null;
    }
    return null;
  };

  const handleDeleteNotifications = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('You need to log in to perform this action!');
        return;
      }

      const hasUnread = notifications.some((n) => !n.isRead);
      const hasRead = notifications.some((n) => n.isRead);

      if (!hasRead && !hasUnread) {
        toast.error('There are no notifications to delete!');
        return;
      }

      if (!hasRead) {
        toast.error('There are no read notifications to delete!');
        return;
      }

      const action = getDeleteAction(hasUnread, hasRead);
      if (!action) return;

      if (action.toLowerCase() === 'all') {
        const response = await api.notifications.deleteAll(token);
        if (response.message === 'All notifications deleted successfully') {
          setNotifications([]);
          toast.success('All notifications have been deleted!');
        } else {
          throw new Error('Failed to delete all notifications');
        }
      } else if (action.toLowerCase() === 'read') {
        const response = await api.notifications.deleteRead(token);
        if (response.message === 'Read notifications deleted successfully') {
          const updatedData = await api.notifications.getList(token);
          setNotifications(updatedData);
          toast.success('Read notifications have been deleted!');
        } else {
          throw new Error('Failed to delete read notifications');
        }
      } else {
        toast.error('Invalid choice!');
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('An error occurred while deleting notifications!');
    }
  };

  const handleNotificationClick = async (notification: NotificationType) => {
    const token = localStorage.getItem('userToken');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }

    const path = notification.type === 'NEW_FOLLOW' && notification.senderId
      ? `/profile/${notification.senderId}`
      : `/notification/${notification.id}`;

    let markedAsReadSuccess = true; // Flag to track success
    if (!notification.isRead) {
      try {
        await api.notifications.markAsRead(notification.id, token);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: true } : n
          )
        );
      } catch (error) {
        markedAsReadSuccess = false; // Mark as failed
        console.error('Error marking notification as read:', error);
        toast.error('Failed to mark notification as read');
        return;
      }
    }

    // Only navigate if marking as read was successful (or not needed)
    if (markedAsReadSuccess) {
       router.push(path);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center pt-[72px] ${theme === 'light' ? 'bg-gray-100' : 'bg-[#111111]'}`}>
        <p className={`${theme === 'light' ? 'text-gray-500' : 'text-secondary'} animate-pulse`}>
            Loading notifications...
        </p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-8 px-3 pt-[72px] flex flex-col ${theme === 'light' ? 'bg-gray-50' : 'bg-[#111111]'}`}>
      <div className="w-full mb-6 flex items-center animate-fade-in px-6">
        <div>
          <h1 className={`text-2xl font-bold inline-block ${theme === 'light' ? 'text-gray-900' : 'text-primary'}`}>
            Notifications
          </h1>
          <span className={`ml-2 text-sm ${theme === 'light' ? 'text-gray-600' : 'text-secondary'}`}>
            ({notifications.length})
          </span>
        </div>
        <div className="space-x-2 ml-auto">
          {notifications.length > 0 &&
            notifications.some((n) => !n.isRead) && (
              <button 
                onClick={handleMarkAllAsRead} 
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${theme === 'light' ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                Mark all as read
              </button>
            )}
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteNotifications}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${theme === 'light' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-red-600 text-white hover:bg-red-700'}`}>
              Delete notifications
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto pb-8 flex flex-col flex-grow w-full">
        {notifications.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center animate-fade-in">
            <p className={`text-lg ${theme === 'light' ? 'text-gray-500' : 'text-secondary'}`}>
              No relevant notifications for your {currentUser?.currentProfile || 'current'} profile.
            </p>
            <Link href="/">
              <button className={`mt-4 px-5 py-2.5 rounded-md text-sm font-semibold transition-colors duration-200 ${theme === 'light' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-[#A57865] text-white hover:bg-[#946a58]'} animate-slide-up`}>
                Back to homepage
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className="animate-slide-up cursor-pointer group"
                onClick={() => handleNotificationClick(notification)}
                onMouseEnter={() => setHoveredNotification(notification.id)}
                onMouseLeave={() => setHoveredNotification(null)}
              >
                <div
                  className={`flex items-center p-4 transition-all duration-300 rounded-lg border ${ 
                    theme === 'light' 
                      ? 'bg-white border-gray-200 group-hover:shadow-md'
                      : 'bg-[#1c1c1c] border-white/10 group-hover:bg-[#282828]'
                    } ${notification.isRead
                      ? 'opacity-80'
                      : theme === 'light' ? 'border-l-4 border-blue-500' : 'border-l-4 border-[#A57865]'
                    } ${hoveredNotification === notification.id
                      ? 'scale-[1.01] shadow-lg'
                      : 'scale-100'
                    }`}
                >
                  <div className="w-14 h-14 relative rounded-md overflow-hidden mr-4 flex-shrink-0">
                    <Image
                      src={
                        notification.coverUrl ||
                        (notification.type === 'NEW_ALBUM'
                          ? '/images/default-album.jpg'
                          : notification.type === 'NEW_FOLLOW'
                            ? '/images/default-avatar.jpg'
                            : '/images/default-track.jpg')
                      }
                      alt={notification.title || 'Notification cover'}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-1">
                    <h2
                      className={`text-lg font-semibold transition-colors duration-200 ${notification.isRead
                        ? (theme === 'light' ? 'text-gray-600' : 'text-secondary')
                        : (theme === 'light' ? 'text-blue-600' : 'text-[#A57865]')
                        }`}
                    >
                      {notification.title || notification.message}
                    </h2>
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-secondary'}`}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs mt-1">
                      {notification.isRead ? (
                        <span className={`${theme === 'light' ? 'text-green-600' : 'text-green-400'}`}>Read</span>
                      ) : (
                        <span className={`${theme === 'light' ? 'text-red-600' : 'text-red-400'} font-medium animate-pulse`}>
                          Unread
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}