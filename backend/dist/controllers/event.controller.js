"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelJoinEvent = exports.joinEvent = exports.getAllEvents = exports.getEventById = exports.toggleEventVisibility = exports.deleteEvent = exports.updateEvent = exports.createEvent = void 0;
const db_1 = __importDefault(require("../config/db"));
const pusher_1 = __importDefault(require("../config/pusher"));
const client_1 = require("@prisma/client");
const eventService = __importStar(require("../services/event.service"));
const canManageEvent = (user, eventArtistId) => {
    if (!user)
        return false;
    if (user.role === client_1.Role.ADMIN)
        return true;
    return (user.artistProfile?.isVerified &&
        user.artistProfile?.id === eventArtistId);
};
const createEvent = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const { title, description, location, startDate, endDate, artistId } = req.body;
        let targetArtistId;
        if (user.role === client_1.Role.ADMIN && artistId) {
            const targetArtist = await db_1.default.artistProfile.findFirst({
                where: {
                    id: artistId,
                    isVerified: true,
                },
            });
            if (!targetArtist) {
                res.status(404).json({ message: 'Artist not found or not verified' });
                return;
            }
            targetArtistId = targetArtist.id;
        }
        else if (user.artistProfile?.isVerified &&
            user.artistProfile?.id) {
            targetArtistId = user.artistProfile.id;
        }
        else {
            res.status(403).json({ message: 'Not authorized to create events' });
            return;
        }
        const eventData = {
            title,
            description,
            location,
            startDate,
            endDate,
            artistId: targetArtistId,
        };
        const newEvent = await eventService.createEvent(eventData);
        const followers = await db_1.default.userFollow.findMany({
            where: {
                followingArtistId: targetArtistId,
                followingType: 'ARTIST',
            },
            select: { followerId: true },
        });
        const notificationsData = followers.map((follower) => ({
            type: client_1.NotificationType.NEW_EVENT,
            message: `The artist just created a new event: ${title}`,
            recipientType: client_1.RecipientType.USER,
            userId: follower.followerId,
            artistId: targetArtistId,
            senderId: targetArtistId,
        }));
        if (notificationsData.length > 0) {
            await db_1.default.notification.createMany({ data: notificationsData });
            for (const follower of followers) {
                await pusher_1.default.trigger(`user-${follower.followerId}`, 'notification', {
                    type: client_1.NotificationType.NEW_EVENT,
                    message: `The artist just created a new event: ${title}`,
                });
            }
        }
        res.status(201).json({
            message: 'Event created successfully',
            event: newEvent,
        });
    }
    catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createEvent = createEvent;
const updateEvent = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        if (!user) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const existingEvent = await db_1.default.event.findUnique({
            where: { id },
            select: { artistId: true },
        });
        if (!existingEvent) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }
        if (!canManageEvent(user, existingEvent.artistId)) {
            res.status(403).json({ message: 'You can only update your own events' });
            return;
        }
        const { title, description, location, startDate, endDate } = req.body;
        const updatedEvent = await eventService.updateEvent(id, {
            title,
            description,
            location,
            startDate,
            endDate,
        });
        res.json({
            message: 'Event updated successfully',
            event: updatedEvent,
        });
    }
    catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateEvent = updateEvent;
const deleteEvent = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        if (!user) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const existingEvent = await db_1.default.event.findUnique({
            where: { id },
            select: { artistId: true },
        });
        if (!existingEvent) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }
        if (!canManageEvent(user, existingEvent.artistId)) {
            res.status(403).json({ message: 'You can only delete your own events' });
            return;
        }
        await eventService.deleteEvent(id);
        res.json({ message: 'Event deleted successfully' });
    }
    catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteEvent = deleteEvent;
const toggleEventVisibility = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        if (!user) {
            res.status(403).json({ message: 'Forbidden' });
            return;
        }
        const existingEvent = await db_1.default.event.findUnique({
            where: { id },
            select: { artistId: true, isActive: true },
        });
        if (!existingEvent) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }
        if (!canManageEvent(user, existingEvent.artistId)) {
            res.status(403).json({ message: 'You can only toggle your own events' });
            return;
        }
        const updatedEvent = await db_1.default.event.update({
            where: { id },
            data: { isActive: !existingEvent.isActive },
        });
        res.json({
            message: `Event ${updatedEvent.isActive ? 'activated' : 'hidden'} successfully`,
            event: updatedEvent,
        });
    }
    catch (error) {
        console.error('Toggle event error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.toggleEventVisibility = toggleEventVisibility;
const getEventById = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await eventService.getEventById(id);
        if (!event) {
            res.status(404).json({ message: 'Event not found' });
            return;
        }
        res.json(event);
    }
    catch (error) {
        console.error('Get event by ID error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getEventById = getEventById;
const getAllEvents = async (req, res) => {
    try {
        const { artistId, isActive, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (artistId)
            filter.artistId = artistId;
        if (typeof isActive !== 'undefined') {
            filter.isActive = isActive === 'true';
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [events, total] = await Promise.all([
            eventService.getEvents({
                ...filter,
            }),
            db_1.default.event.count({ where: filter }),
        ]);
        const slicedEvents = events.slice(skip, skip + Number(limit));
        res.json({
            events: slicedEvents,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getAllEvents = getAllEvents;
const joinEvent = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { eventId } = req.body;
        if (!eventId) {
            res.status(400).json({ message: 'Missing eventId' });
            return;
        }
        const joinRecord = await eventService.joinEvent(eventId, user.id);
        res.json({
            message: 'Joined event successfully',
            joinRecord,
        });
    }
    catch (error) {
        console.error('Join event error:', error);
        res.status(400).json({ message: error.message || 'Cannot join event' });
    }
};
exports.joinEvent = joinEvent;
const cancelJoinEvent = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const { eventId } = req.body;
        if (!eventId) {
            res.status(400).json({ message: 'Missing eventId' });
            return;
        }
        const cancelRecord = await eventService.cancelJoinEvent(eventId, user.id);
        res.json({
            message: 'Canceled join event successfully',
            cancelRecord,
        });
    }
    catch (error) {
        console.error('Cancel join event error:', error);
        res.status(400).json({ message: error.message || 'Cannot cancel join event' });
    }
};
exports.cancelJoinEvent = cancelJoinEvent;
//# sourceMappingURL=event.controller.js.map