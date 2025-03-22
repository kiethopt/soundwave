import { Request, Response } from 'express';
import prisma from '../config/db';
import { Role, RecipientType } from '@prisma/client';

/**
 * 1) Lấy danh sách thông báo (có thể lọc ?isRead=true/false)
 */
export const deleteAllNotifications = async (req: Request, res: Response) => {
  try {
    // Lấy user từ middleware authenticate
    const user = (req as any).user; // Giả sử middleware gắn user vào req
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Xóa tất cả thông báo của user
    await prisma.notification.deleteMany({
      where: {
        userId: user.id, // Giả sử bảng notification có trường userId
      },
    });

    res.status(200).json({ message: 'All notifications deleted' });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
export const deleteReadNotifications = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    await prisma.notification.deleteMany({
      where: {
        userId: user.id,
        isRead: true, // Chỉ xóa các thông báo đã đọc
      },
    });
    res.status(200).json({ message: 'Read notifications deleted' });
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
export const getNotifications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user; // đã được gắn qua middleware authenticate
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return; // kết thúc hàm
    }

    // Lọc theo query ?isRead=true/false
    const { isRead } = req.query;
    let readFilter: boolean | undefined;
    if (isRead === 'true') readFilter = true;
    if (isRead === 'false') readFilter = false;

    // Xác định recipientType
    let recipientType: RecipientType;
    let recipientId: string;

    if (user.role === Role.ARTIST && user.artistProfile) {
      recipientType = RecipientType.ARTIST;
      recipientId = user.artistProfile.id;
    } else {
      recipientType = RecipientType.USER;
      recipientId = user.id;
    }

    const notifications = await prisma.notification.findMany({
      where: {
        recipientType,
        isRead: readFilter, // true|false|undefined
        ...(recipientType === RecipientType.ARTIST
          ? { artistId: recipientId }
          : { userId: recipientId }),
      },
      orderBy: { createdAt: 'desc' },
    });

    // Gửi response (không return đối tượng Response)
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * 2) Lấy số lượng thông báo chưa đọc (badge)
 */
export const getUnreadNotificationsCount = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    let recipientType: RecipientType;
    let recipientId: string;

    if (user.role === Role.ARTIST && user.artistProfile) {
      recipientType = RecipientType.ARTIST;
      recipientId = user.artistProfile.id;
    } else {
      recipientType = RecipientType.USER;
      recipientId = user.id;
    }

    const count = await prisma.notification.count({
      where: {
        recipientType,
        isRead: false,
        ...(recipientType === RecipientType.ARTIST
          ? { artistId: recipientId }
          : { userId: recipientId }),
      },
    });

    // Gửi response
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Get unread notifications count error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * 3) Đánh dấu 1 thông báo đã đọc
 *    @route PATCH /notifications/:notificationId/read
 */
export const markNotificationAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { notificationId } = req.params;

    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    // Kiểm tra xem notification có thuộc về user/artist này không
    let canMark = false;
    if (
      notification.recipientType === RecipientType.ARTIST &&
      user.role === Role.ARTIST &&
      user.artistProfile
    ) {
      canMark = notification.artistId === user.artistProfile.id;
    } else if (notification.recipientType === RecipientType.USER) {
      canMark = notification.userId === user.id;
    }

    if (!canMark) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * 4) Đánh dấu tất cả thông báo đã đọc
 *    @route PATCH /notifications/read-all
 */
export const markAllNotificationsAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    let recipientType: RecipientType;
    let recipientId: string;

    if (user.role === Role.ARTIST && user.artistProfile) {
      recipientType = RecipientType.ARTIST;
      recipientId = user.artistProfile.id;
    } else {
      recipientType = RecipientType.USER;
      recipientId = user.id;
    }

    await prisma.notification.updateMany({
      where: {
        recipientType,
        isRead: false,
        ...(recipientType === RecipientType.ARTIST
          ? { artistId: recipientId }
          : { userId: recipientId }),
      },
      data: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
