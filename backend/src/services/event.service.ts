import { PrismaClient, Event } from '@prisma/client';
const prisma = new PrismaClient();

interface CreateEventInput {
  title: string;
  description?: string;
  location: string;
  startDate: Date | string;
  endDate: Date | string;
  artistId: string;
}

interface UpdateEventInput {
  title: string;
  description?: string;
  location: string;
  startDate: Date | string;
  endDate: Date | string;
}

export async function createEvent(data: CreateEventInput): Promise<Event> {
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

export async function updateEvent(
  id: string,
  data: UpdateEventInput
): Promise<Event> {
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

export async function deleteEvent(id: string): Promise<Event> {
  const event = await prisma.event.delete({
    where: { id },
  });
  return event;
}

export async function getEvents(filter: any = {}): Promise<Event[]> {
  const events = await prisma.event.findMany({
    where: filter,
    orderBy: {
      createdAt: 'desc',
    },
  });
  return events;
}

export async function getEventById(id: string): Promise<Event | null> {
  const event = await prisma.event.findUnique({
    where: { id },
  });
  return event;
}

export async function joinEvent(eventId: string, userId: string) {
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

export async function cancelJoinEvent(eventId: string, userId: string) {
  const canceled = await prisma.eventJoin.delete({
    where: { eventId_userId: { eventId, userId } },
  });
  return canceled;
}

export async function toggleEventVisibility(id: string): Promise<Event> {
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
