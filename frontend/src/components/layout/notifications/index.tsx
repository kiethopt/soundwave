import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { api } from '@/utils/api';

// Định nghĩa icon cho từng loại thông báo
const notificationIcons = {
  NEW_TRACK: '/icons/track.svg',
  NEW_ALBUM: '/icons/album.svg',
  EVENT_REMINDER: '/icons/event.svg',
  NEW_FOLLOW: '/icons/follow.svg',
  ARTIST_REQUEST_APPROVE: '/icons/approve.svg',
  ARTIST_REQUEST_REJECT: '/icons/reject.svg',
};

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600 text-lg">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          {notifications.length > 0 && (
            <span className="text-sm text-gray-500">
              {notifications.filter((n) => !n.isRead).length} unread
            </span>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No notifications yet.</p>
            <p className="text-gray-400 mt-2">Check back later!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Link key={notification.id} href={`/notification/${notification.id}`}>
                <a
                  className={`flex items-center bg-white rounded-xl shadow-sm p-4 transition-all duration-200 hover:shadow-lg ${notification.isRead ? 'opacity-75' : 'border-l-4 border-blue-500'
                    }`}
                >
                  {/* Icon */}
                  <div className="w-12 h-12 relative rounded-full overflow-hidden mr-4 flex-shrink-0 bg-gray-100">
                    <Image
                      src={
                        notification.coverUrl ||
                        notificationIcons[notification.type] ||
                        '/images/default-notification.jpg'
                      }
                      alt={notification.title || 'Notification'}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>

                  {/* Nội dung */}
                  <div className="flex-1">
                    <h2
                      className={`text-lg ${notification.isRead
                          ? 'text-gray-600'
                          : 'text-gray-900 font-semibold'
                        }`}
                    >
                      {notification.title || notification.message}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Trạng thái */}
                  {!notification.isRead && (
                    <span className="ml-4 px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded-full">
                      New
                    </span>
                  )}
                </a>
              </Link>
            ))}
          </div>
        )}

        {/* Nút View All */}
        {notifications.length > 0 && (
          <div className="mt-10 text-center">
            <Link href="/notifications/all">
              <a className="inline-block px-8 py-3 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 transition-all duration-200">
                View All Notifications
              </a>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}