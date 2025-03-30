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
  const [hoveredNotification, setHoveredNotification] = useState<string | null>(
    null
  );

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
      await api.notifications.markAllAsRead(token);
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc!');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Có lỗi xảy ra khi đánh dấu đã đọc!');
    }
  };

  const handleDeleteNotifications = async () => {
    try {
      const token = localStorage.getItem('userToken');
      if (!token) {
        toast.error('Bạn cần đăng nhập để thực hiện hành động này!');
        return;
      }

      // Kiểm tra xem có thông báo chưa đọc nào không
      const hasUnread = notifications.some((n) => !n.isRead);
      const hasRead = notifications.some((n) => n.isRead);

      if (!hasRead) {
        toast.error('Không có thông báo đã đọc để xóa!');
        return;
      }

      // Hỏi người dùng muốn xóa gì
      let action: string | null;
      if (hasUnread) {
        action = prompt(
          'Bạn muốn xóa gì?\n- Nhập "all" để xóa tất cả thông báo\n- Nhập "read" để chỉ xóa thông báo đã đọc\n- Nhấn Cancel để hủy'
        );
      } else {
        // Nếu chỉ có thông báo đã đọc, chỉ hỏi xác nhận xóa tất cả
        if (!confirm('Bạn có chắc chắn muốn xóa tất cả thông báo đã đọc?')) {
          return;
        }
        action = 'all';
      }

      if (!action) return; // Người dùng nhấn Cancel

      if (action.toLowerCase() === 'all') {
        // Xóa tất cả thông báo
        await api.notifications.deleteAll(token);
        setNotifications([]);
        toast.success('Đã xóa tất cả thông báo!');
      } else if (action.toLowerCase() === 'read') {
        // Xóa chỉ thông báo đã đọc
        await api.notifications.deleteRead(token);
        setNotifications((prev) => prev.filter((n) => !n.isRead));
        toast.success('Đã xóa các thông báo đã đọc!');
      } else {
        toast.error('Lựa chọn không hợp lệ!');
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Có lỗi xảy ra khi xóa thông báo!');
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
      <div className="max-w-4xl mx-auto pb-8">
        <div className="mb-6 flex justify-between items-center animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-primary inline-block">
              Thông báo
            </h1>
            <span className="ml-2 text-sm text-secondary">
              ({notifications.length})
            </span>
          </div>
          <div className="space-x-2">
            {notifications.length > 0 &&
              notifications.some((n) => !n.isRead) && (
                <button onClick={handleMarkAllAsRead} className="btn-secondary">
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            {notifications.length > 0 && (
              <button
                onClick={handleDeleteNotifications}
                className="btn-secondary bg-red-600 hover:bg-red-700"
              >
                Xóa tất cả thông báo
              </button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <p className="text-lg text-secondary">Không có thông báo nào.</p>
            <Link href="/">
              <button className="btn-primary mt-4 animate-slide-up">
                Quay về trang chủ
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {notifications.map((notification, index) => (
              <div key={notification.id} className="animate-slide-up">
                <Link href={`/notification/${notification.id}`}>
                  <div
                    className={`dashboard-card flex items-center p-4 transition-all duration-300 ${
                      notification.isRead
                        ? 'opacity-80'
                        : 'border-l-4 border-blue-500'
                    } ${
                      index !== notifications.length - 1
                        ? 'border-b border-white/20'
                        : ''
                    } ${
                      hoveredNotification === notification.id
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
                        className={`text-lg font-semibold transition-colors duration-200 ${
                          notification.isRead
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
