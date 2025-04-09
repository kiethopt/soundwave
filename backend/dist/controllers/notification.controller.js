"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getUnreadNotificationsCount = exports.getNotifications = exports.deleteReadNotifications = exports.deleteAllNotifications = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const deleteAllNotifications = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const whereConditions = [
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
        const deleteResult = await db_1.default.notification.deleteMany({
            where: {
                OR: whereConditions,
            },
        });
        console.log(`Deleted ${deleteResult.count} notifications for user ${user.id}`);
        res.status(200).json({
            message: 'All notifications deleted successfully',
            deletedCount: deleteResult.count,
        });
    }
    catch (error) {
        console.error('Error deleting all notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteAllNotifications = deleteAllNotifications;
const deleteReadNotifications = async (req, res) => {
    try {
        const user = req.user;
        if (!user || !user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        console.log('Deleting read notifications for user:', {
            id: user.id,
            role: user.role,
            artistProfile: user.artistProfile,
        });
        const whereConditions = [
            {
                userId: user.id,
                recipientType: 'USER',
                isRead: true,
            },
        ];
        if (user.artistProfile && user.artistProfile.id) {
            whereConditions.push({
                artistId: user.artistProfile.id,
                recipientType: 'ARTIST',
                isRead: true,
            });
        }
        const deleteResult = await db_1.default.notification.deleteMany({
            where: {
                OR: whereConditions,
            },
        });
        console.log(`Deleted ${deleteResult.count} read notifications for user ${user.id}`);
        res.status(200).json({
            message: 'Read notifications deleted successfully',
            deletedCount: deleteResult.count,
        });
    }
    catch (error) {
        console.error('Error deleting read notifications:', error);
        if (error instanceof Error) {
            res.status(500).json({
                message: 'Internal server error',
                error: error.message,
            });
        }
        else {
            res.status(500).json({
                message: 'Internal server error',
                error: 'An unknown error occurred',
            });
        }
    }
};
exports.deleteReadNotifications = deleteReadNotifications;
const getNotifications = async (req, res) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const whereConditions = [
        { recipientType: 'USER', userId: user.id },
    ];
    if (user.artistProfile) {
        whereConditions.push({ recipientType: 'ARTIST', artistId: user.artistProfile.id });
    }
    const notifications = await db_1.default.notification.findMany({
        where: { OR: whereConditions },
        orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
};
exports.getNotifications = getNotifications;
const getUnreadNotificationsCount = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        let recipientType;
        let recipientId;
        if (user.role === client_1.Role.ARTIST && user.artistProfile) {
            recipientType = client_1.RecipientType.ARTIST;
            recipientId = user.artistProfile.id;
        }
        else {
            recipientType = client_1.RecipientType.USER;
            recipientId = user.id;
        }
        const count = await db_1.default.notification.count({
            where: {
                recipientType,
                isRead: false,
                ...(recipientType === client_1.RecipientType.ARTIST
                    ? { artistId: recipientId }
                    : { userId: recipientId }),
            },
        });
        res.json({ unreadCount: count });
    }
    catch (error) {
        console.error('Get unread notifications count error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getUnreadNotificationsCount = getUnreadNotificationsCount;
const markNotificationAsRead = async (req, res) => {
    try {
        const user = req.user;
        const { notificationId } = req.params;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const notification = await db_1.default.notification.findUnique({
            where: { id: notificationId },
        });
        if (!notification) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }
        console.log('Notification:', notification);
        console.log('User:', { id: user.id, role: user.role, artistProfile: user.artistProfile });
        let canMark = false;
        if (notification.recipientType === client_1.RecipientType.ARTIST) {
            if (user.artistProfile && notification.artistId === user.artistProfile.id) {
                canMark = true;
            }
        }
        else if (notification.recipientType === client_1.RecipientType.USER) {
            canMark = notification.userId === user.id;
            console.log('USER check:', { canMark, notificationUserId: notification.userId, userId: user.id });
        }
        if (!canMark) {
            console.log('Permission denied: User cannot mark this notification');
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        await db_1.default.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });
        res.json({ message: 'Notification marked as read' });
    }
    catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        console.log('User:', {
            id: user.id,
            role: user.role,
            artistProfile: user.artistProfile,
            currentProfile: user.currentProfile,
        });
        const whereConditions = [
            {
                recipientType: client_1.RecipientType.USER,
                userId: user.id,
                isRead: false,
            },
        ];
        if (user.artistProfile) {
            whereConditions.push({
                recipientType: client_1.RecipientType.ARTIST,
                artistId: user.artistProfile.id,
                isRead: false,
            });
        }
        const updateResult = await db_1.default.notification.updateMany({
            where: {
                OR: whereConditions,
            },
            data: {
                isRead: true,
            },
        });
        console.log(`Marked ${updateResult.count} notifications as read for user ${user.id}`);
        res.json({
            message: 'All notifications marked as read',
            count: updateResult.count,
        });
    }
    catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
//# sourceMappingURL=notification.controller.js.map