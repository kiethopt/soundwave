import { Request, Response } from 'express';
import prisma from '../config/db';
import { Role, RecipientType, Prisma } from '@prisma/client';

/**
 * 1) Lấy danh sách thông báo (có thể lọc ?isRead=true/false)
 */
export const deleteAllNotifications = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Tạo điều kiện where để xóa tất cả thông báo
    const whereConditions: Prisma.NotificationWhereInput[] = [
      {
        userId: user.id,
        recipientType: 'USER',
      },
    ];

    if (user.artistProfile && user.artistProfile.id) {
      whereConditions.push({
        artistId: user.artistProfile.id,
        recipientType: 'ARTIST',
      });
    }

    const deleteResult = await prisma.notification.deleteMany({
      where: {
        OR: whereConditions,
      },
    });

    console.log(`Deleted ${deleteResult.count} notifications for user ${user.id}`);

    res.status(200).json({
      message: 'All notifications deleted successfully',
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
export const deleteReadNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    // Lấy thông tin user từ request (giả sử middleware đã gắn user vào req)
    const user = (req as any).user;

    // Kiểm tra xem user có tồn tại không
    if (!user || !user.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Log thông tin để debug
    console.log('Deleting read notifications for user:', {
      id: user.id,
      role: user.role,
      artistProfile: user.artistProfile,
    });

    // Tạo điều kiện where để xóa thông báo đã đọc
    const whereConditions: Prisma.NotificationWhereInput[] = [
      {
        userId: user.id,
        recipientType: 'USER',
        isRead: true,
      },
    ];

    // Nếu user có artistProfile, thêm điều kiện để xóa thông báo ARTIST đã đọc
    if (user.artistProfile && user.artistProfile.id) {
      whereConditions.push({
        artistId: user.artistProfile.id,
        recipientType: 'ARTIST',
        isRead: true,
      });
    }

    // Thực hiện xóa các thông báo đã đọc
    const deleteResult = await prisma.notification.deleteMany({
      where: {
        OR: whereConditions,
      },
    });

    // Log kết quả
    console.log(`Deleted ${deleteResult.count} read notifications for user ${user.id}`);

    // Trả về phản hồi thành công
    res.status(200).json({
      message: 'Read notifications deleted successfully',
      deletedCount: deleteResult.count,
    });

  } catch (error) {
    // Xử lý lỗi chi tiết
    console.error('Error deleting read notifications:', error);

    // Kiểm tra loại lỗi cụ thể nếu cần
    if (error instanceof Error) {
      res.status(500).json({
        message: 'Internal server error',
        error: error.message,
      });
    } else {
      res.status(500).json({
        message: 'Internal server error',
        error: 'An unknown error occurred',
      });
    }
  }
};
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const whereConditions: Prisma.NotificationWhereInput[] = [
    { recipientType: 'USER', userId: user.id },
  ];
  if (user.artistProfile) {
    whereConditions.push({ recipientType: 'ARTIST', artistId: user.artistProfile.id });
  }

  const notifications = await prisma.notification.findMany({
    where: { OR: whereConditions },
    orderBy: { createdAt: 'desc' },
  });

  res.json(notifications);
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

    console.log('Notification:', notification);
    console.log('User:', { id: user.id, role: user.role, artistProfile: user.artistProfile });

    let canMark = false;
    if (notification.recipientType === RecipientType.ARTIST) {
      // Kiểm tra nếu user có artistProfile và artistId khớp
      if (user.artistProfile && notification.artistId === user.artistProfile.id) {
        canMark = true;
      }
    } else if (notification.recipientType === RecipientType.USER) {
      canMark = notification.userId === user.id;
      console.log('USER check:', { canMark, notificationUserId: notification.userId, userId: user.id });
    }

    if (!canMark) {
      console.log('Permission denied: User cannot mark this notification');
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

    // Log thông tin user để debug
    console.log('User:', {
      id: user.id,
      role: user.role,
      artistProfile: user.artistProfile,
      currentProfile: user.currentProfile,
    });

    // Tạo điều kiện where để lấy thông báo của user và artist (nếu có)
    const whereConditions: Prisma.NotificationWhereInput[] = [
      {
        recipientType: RecipientType.USER,
        userId: user.id,
        isRead: false,
      },
    ];

    // Nếu user có artistProfile, thêm điều kiện cho thông báo ARTIST
    if (user.artistProfile) {
      whereConditions.push({
        recipientType: RecipientType.ARTIST,
        artistId: user.artistProfile.id,
        isRead: false,
      });
    }

    // Đánh dấu tất cả thông báo chưa đọc thành đã đọc
    const updateResult = await prisma.notification.updateMany({
      where: {
        OR: whereConditions,
      },
      data: {
        isRead: true,
      },
    });

    // Log số lượng thông báo đã được đánh dấu
    console.log(`Marked ${updateResult.count} notifications as read for user ${user.id}`);

    res.json({
      message: 'All notifications marked as read',
      count: updateResult.count,
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
