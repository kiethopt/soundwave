"use client";

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
  const [hoveredNotification, setHoveredNotification] = useState<string | null>(null);

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

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('Bạn cần đăng nhập để thực hiện hành động này!');
        return;
      }

      // Gọi API để đánh dấu tất cả thông báo là đã đọc (giả sử có endpoint này)
      await api.notifications.markAllAsRead(token);

      // Cập nhật state cục bộ
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc!');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Có lỗi xảy ra khi đánh dấu đã đọc!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111111]">
        <p className="text-secondary animate-pulse">Đang tải thông báo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] py-8 px-6 pt-[72px]">
      {/* Nội dung chính - Chừa khoảng trống cho Header từ RootLayout */}
      <div className="max-w-4xl mx-auto pb-8">
        {/* Tiêu đề và nút đánh dấu tất cả đã đọc */}
        <div className="mb-6 flex justify-between items-center animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-primary inline-block">Thông báo</h1>
            <span className="ml-2 text-sm text-secondary">
              ({notifications.length})
            </span>
          </div>
          {notifications.length > 0 && notifications.some(n => !n.isRead) && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn-secondary"
            >
              Đánh dấu tất cả đã đọc
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <p className="text-lg text-secondary">Không có thông báo nào.</p>
            <Link href="/">
              <button className="btn-primary mt-4 animate-slide-up">Quay về trang chủ</button>
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
                          <span className="text-green-400">Đã đọc</span>
                        ) : (
                          <span className="text-red-400 font-medium animate-pulse">
                            Chưa đọc
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