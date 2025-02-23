import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { api } from '@/utils/api';

export type NotificationType = {
  id: string;
  type: 'NEW_TRACK' | 'NEW_ALBUM' | 'EVENT_REMINDER' | 'NEW_FOLLOW';
  message: string;
  isRead: boolean;
  coverUrl?: string; // Nếu có ảnh track/album, nếu không dùng ảnh mặc định
  title?: string;    // Tiêu đề của track hoặc album (nếu có)
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
        // Lưu ý: api.notifications.getList sẽ gọi đến URL: `${process.env.NEXT_PUBLIC_API_URL}/notifications`
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
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Thông báo của bạn</h1>
        {notifications.length === 0 ? (
          <p className="text-gray-600">Không có thông báo nào.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notifications.map((notification) => (
              <Link key={notification.id} href={`/notification/${notification.id}`}>
                <a className="flex items-center bg-white rounded-lg shadow p-4 hover:shadow-md transition">
                  <div className="w-16 h-16 relative rounded-md overflow-hidden mr-4 flex-shrink-0">
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
                    <h2
                      className={`text-lg ${
                        notification.isRead
                          ? 'font-normal text-gray-700'
                          : 'font-semibold text-blue-600'
                      }`}
                    >
                      {notification.title || notification.message}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs mt-1">
                      {notification.isRead ? (
                        <span className="text-green-600">Đã đọc</span>
                      ) : (
                        <span className="text-red-600 font-medium">Chưa đọc</span>
                      )}
                    </p>
                  </div>
                </a>
              </Link>
            ))}
          </div>
        )}

        {/* Nút "Xem tất cả" để chuyển hướng tới trang chi tiết thông báo */}
        <div className="mt-8 text-center">
          <Link href="/notifications/all">
            <a className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Xem tất cả
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
