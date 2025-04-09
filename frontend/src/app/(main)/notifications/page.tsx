'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { api } from '@/utils/api';

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
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredNotification, setHoveredNotification] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          toast.error('You need to log in to view notifications!');
          return;
        }
        const data = await api.notifications.getList(token);
        setNotifications(data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        toast.error('Error fetching notifications');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
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
          setNotifications([]); // Reset state
          toast.success('All notifications have been deleted!');
        } else {
          throw new Error('Failed to delete all notifications');
        }
      } else if (action.toLowerCase() === 'read') {
        const response = await api.notifications.deleteRead(token);
        if (response.message === 'Read notifications deleted successfully') {
          // Tải lại danh sách từ server để đồng bộ
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111111]">
        <p className="text-secondary animate-pulse">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] py-8 px-6 pt-[72px]">
      <div className="max-w-4xl mx-auto pb-8">
        <div className="mb-6 flex justify-between items-center animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-primary inline-block">
              Notifications
            </h1>
            <span className="ml-2 text-sm text-secondary">
              ({notifications.length})
            </span>
          </div>
          <div className="space-x-2">
            {notifications.length > 0 &&
              notifications.some((n) => !n.isRead) && (
                <button onClick={handleMarkAllAsRead} className="btn-secondary">
                  Mark all as read
                </button>
              )}
            {notifications.length > 0 && (
              <button
                onClick={handleDeleteNotifications}
                className="btn-secondary bg-red-600 hover:bg-red-700"
              >
                Delete all notifications
              </button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <p className="text-lg text-secondary">No notifications available.</p>
            <Link href="/">
              <button className="btn-primary mt-4 animate-slide-up">
                Back to homepage
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {notifications.map((notification, index) => (
              <div key={notification.id} className="animate-slide-up">
                <Link href={`/notification/${notification.id}`}>
                  <div
                    className={`dashboard-card flex items-center p-4 transition-all duration-300 ${notification.isRead
                      ? 'opacity-80'
                      : 'border-l-4 border-blue-500'
                      } ${index !== notifications.length - 1
                        ? 'border-b border-white/20'
                        : ''
                      } ${hoveredNotification === notification.id
                        ? 'scale-102 shadow-lg'
                        : 'scale-100 shadow-md'
                      }`}
                    onMouseEnter={() => setHoveredNotification(notification.id)}
                    onMouseLeave={() => setHoveredNotification(null)}
                  >
                    <div className="w-14 h-14 relative rounded-md overflow-hidden mr-4 flex-shrink-0">
                      <Image
                        src={
                          notification.coverUrl ||
                          (notification.type === 'NEW_ALBUM'
                            ? '/images/default-album.jpg'
                            : '/images/default-track.jpg')
                        }
                        alt={notification.title || 'Notification cover'}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="transition-transform duration-300 hover:scale-110"
                      />
                    </div>
                    <div className="flex-1">
                      <h2
                        className={`text-lg font-semibold transition-colors duration-200 ${notification.isRead
                          ? 'text-secondary'
                          : 'text-blue-400'
                          }`}
                      >
                        {notification.title || notification.message}
                      </h2>
                      <p className="text-sm text-secondary">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs mt-1">
                        {notification.isRead ? (
                          <span className="text-green-400">Read</span>
                        ) : (
                          <span className="text-red-400 font-medium animate-pulse">
                            Unread
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}