"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_controller_1 = require("../controllers/event.controller");
const router = (0, express_1.Router)();
router.post('/events', event_controller_1.createEvent);
router.put('/events/:id', event_controller_1.updateEvent);
router.delete('/events/:id', event_controller_1.deleteEvent);
router.get('/events', event_controller_1.getAllEvents);
router.get('/events/:id', event_controller_1.getEventById);
router.post('/events/:id/join', event_controller_1.joinEvent);
router.post('/events/:id/cancel-join', event_controller_1.cancelJoinEvent);
exports.default = router;
//# sourceMappingURL=event.routes.js.map