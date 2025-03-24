import { Request } from 'express';
import { Role } from '@prisma/client';
import prisma from '../config/db';
import { NotificationExtension } from '../prisma/extensions/notificationExtension';


export async function createEvent(data: any) {
  return prisma.event.create({
    data,
  });
}


export async function updateEvent(eventId: string, data: any) {
  return prisma.event.update({
    where: { id: eventId },
    data,
  });
}


export async function deleteEvent(eventId: string) {
  return prisma.event.delete({
    where: { id: eventId },
  });
}


export async function toggleEventVisibility(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Event không tồn tại');
  return prisma.event.update({
    where: { id: eventId },
    data: {
      isVisible: !event.isVisible,
    },
  });
}


export async function addTracksToEvent(eventId: string, trackIds: string[]) {
  const records = [];
  for (const trackId of trackIds) {
    const record = await prisma.eventTrack.create({
      data: {
        eventId,
        trackId,
      },
    });
    records.push(record);
  }
  return records;
}


export async function searchEvent(query: string) {
  return prisma.event.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
      ],
    },
  });
}


export async function playEvent(eventId: string, userId: string) {
  return { message: `User ${userId} play event ${eventId}` };
}


export async function joinEvent(eventId: string, userId: string) {
  const joinRecord = await prisma.eventParticipant.create({
    data: {
      eventId,
      userId,
    },
  });

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (event && event.artistId) {
    NotificationExtension.sendNotification(
      event.artistId,
      `User ${userId} đã tham gia event "${event.title || 'N/A'}"`
    );
  }
  return joinRecord;
}


export async function cancelJoinEvent(eventId: string, userId: string) {
  const cancelRecord = await prisma.eventParticipant.deleteMany({
    where: { eventId, userId },
  });

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (event && event.artistId) {
    NotificationExtension.sendNotification(
      event.artistId,
      `User ${userId} đã hủy tham gia event "${event.title || 'N/A'}"`
    );
  }
  return cancelRecord;
}


export async function getEventById(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: {
    },
  });
}


export async function getAllEvents() {
  return prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
  });
}
