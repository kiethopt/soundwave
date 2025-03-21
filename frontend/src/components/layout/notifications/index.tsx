import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { api } from '@/utils/api';

export type NotificationType = {
  id: string;
  type: 'NEW_TRACK' | 'NEW_ALBUM' | 'EVENT_REMINDER' | 'NEW_FOLLOW' | 'ARTIST_REQUEST_APPROVE' | 'ARTIST_REQUEST_REJECT';
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
          toast.error('Bạn cần đăng nhập để xem thông báo!');
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">Thông báo của bạn</h1>
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center">Không có thông báo nào.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {notifications.map((notification) => (
              <Link key={notification.id} href={`/notification/${notification.id}`}>
                <a className="flex items-center bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-transform transform hover:scale-105 border border-gray-200">
                  <div className="w-20 h-20 relative rounded-lg overflow-hidden mr-5 flex-shrink-0">
                    <Image
                      src={
                        notification.coverUrl ||
                        (notification.type === 'NEW_ALBUM'
                          ? '/images/default-album.jpg'
                          : '/images/default-track.jpg')
                      }
                      alt={notification.title || 'Notification cover'}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className={`text-lg ${notification.isRead ? 'text-gray-700' : 'text-blue-600 font-semibold'}`}>
                      {notification.title || notification.message}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs mt-2 font-medium ${notification.isRead ? 'text-green-600' : 'text-red-600'}">
                      {notification.isRead ? 'Đã đọc' : 'Chưa đọc'}
                    </p>
                  </div>
                </a>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/notifications/all">
            <a className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition">
              Xem tất cả
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
