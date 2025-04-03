"use strict";
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
async function createEvent(data) {
    const event = await prisma.event.create({
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
}
async function updateEvent(id, data) {
    const event = await prisma.event.update({
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
}
async function deleteEvent(id) {
    const event = await prisma.event.delete({
        where: { id },
    });
    return event;
}
async function getEvents(filter = {}) {
    const events = await prisma.event.findMany({
        where: filter,
        orderBy: {
            createdAt: 'desc',
        },
    });
    return events;
}
async function getEventById(id) {
    const event = await prisma.event.findUnique({
        where: { id },
    });
    return event;
}
async function joinEvent(eventId, userId) {
    const existing = await prisma.eventJoin.findUnique({
        where: { eventId_userId: { eventId, userId } },
    });
    if (existing) {
        throw new Error('User đã join event này rồi');
    }
    const joinRecord = await prisma.eventJoin.create({
        data: { eventId, userId },
    });
    return joinRecord;
}
async function cancelJoinEvent(eventId, userId) {
    const canceled = await prisma.eventJoin.delete({
        where: { eventId_userId: { eventId, userId } },
    });
    return canceled;
}
async function toggleEventVisibility(id) {
    const event = await prisma.event.findUnique({
        where: { id },
        select: { isActive: true },
    });
    if (!event) {
        throw new Error('Event not found');
    }
    const updatedEvent = await prisma.event.update({
        where: { id },
        data: { isActive: !event.isActive },
    });
    return updatedEvent;
}
//# sourceMappingURL=event.service.js.map