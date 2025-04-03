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
        await db_1.default.notification.deleteMany({
            where: {
                userId: user.id,
            },
        });
        res.status(200).json({ message: 'All notifications deleted' });
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
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        await db_1.default.notification.deleteMany({
            where: {
                userId: user.id,
                isRead: true,
            },
        });
        res.status(200).json({ message: 'Read notifications deleted' });
    }
    catch (error) {
        console.error('Error deleting read notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteReadNotifications = deleteReadNotifications;
const getNotifications = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { isRead } = req.query;
        let readFilter;
        if (isRead === 'true')
            readFilter = true;
        if (isRead === 'false')
            readFilter = false;
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
        const notifications = await db_1.default.notification.findMany({
            where: {
                recipientType,
                isRead: readFilter,
                ...(recipientType === client_1.RecipientType.ARTIST
                    ? { artistId: recipientId }
                    : { userId: recipientId }),
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(notifications);
    }
    catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
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
        let canMark = false;
        if (notification.recipientType === client_1.RecipientType.ARTIST &&
            user.role === client_1.Role.ARTIST &&
            user.artistProfile) {
            canMark = notification.artistId === user.artistProfile.id;
        }
        else if (notification.recipientType === client_1.RecipientType.USER) {
            canMark = notification.userId === user.id;
        }
        if (!canMark) {
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
        await db_1.default.notification.updateMany({
            where: {
                recipientType,
                isRead: false,
                ...(recipientType === client_1.RecipientType.ARTIST
                    ? { artistId: recipientId }
                    : { userId: recipientId }),
            },
            data: { isRead: true },
        });
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
//# sourceMappingURL=notification.controller.js.map