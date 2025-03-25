"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = createEvent;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
exports.getEvents = getEvents;
exports.getEventById = getEventById;
exports.joinEvent = joinEvent;
exports.cancelJoinEvent = cancelJoinEvent;
exports.toggleEventVisibility = toggleEventVisibility;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function createEvent(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const event = yield prisma.event.create({
            data: {
                title: data.title,
                description: data.description,
                location: data.location,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                artistId: data.artistId,
            },
        });
        return event;
    });
}
function updateEvent(id, data) {
    return __awaiter(this, void 0, void 0, function* () {
        const event = yield prisma.event.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                location: data.location,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
            },
        });
        return event;
    });
}
function deleteEvent(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const event = yield prisma.event.delete({
            where: { id },
        });
        return event;
    });
}
function getEvents() {
    return __awaiter(this, arguments, void 0, function* (filter = {}) {
        const events = yield prisma.event.findMany({
            where: filter,
            orderBy: {
                createdAt: 'desc',
            },
        });
        return events;
    });
}
function getEventById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const event = yield prisma.event.findUnique({
            where: { id },
        });
        return event;
    });
}
function joinEvent(eventId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const existing = yield prisma.eventJoin.findUnique({
            where: { eventId_userId: { eventId, userId } },
        });
        if (existing) {
            throw new Error('User đã join event này rồi');
        }
        const joinRecord = yield prisma.eventJoin.create({
            data: { eventId, userId },
        });
        return joinRecord;
    });
}
function cancelJoinEvent(eventId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const canceled = yield prisma.eventJoin.delete({
            where: { eventId_userId: { eventId, userId } },
        });
        return canceled;
    });
}
function toggleEventVisibility(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const event = yield prisma.event.findUnique({
            where: { id },
            select: { isActive: true },
        });
        if (!event) {
            throw new Error('Event not found');
        }
        const updatedEvent = yield prisma.event.update({
            where: { id },
            data: { isActive: !event.isActive },
        });
        return updatedEvent;
    });
}
//# sourceMappingURL=event.service.js.map