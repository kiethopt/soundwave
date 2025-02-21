"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', auth_middleware_1.authenticate, notification_controller_1.getNotifications);
router.get('/unread-count', auth_middleware_1.authenticate, notification_controller_1.getUnreadNotificationsCount);
router.patch('/:notificationId/read', auth_middleware_1.authenticate, notification_controller_1.markNotificationAsRead);
router.patch('/read-all', auth_middleware_1.authenticate, notification_controller_1.markAllNotificationsAsRead);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map