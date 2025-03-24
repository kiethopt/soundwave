import { Request, Response } from 'express';
import prisma from '../config/db';  
import pusher from '../config/pusher'; 
import { Role, NotificationType, RecipientType } from '@prisma/client'; 

import * as eventService from '../services/event.service'; 

const canManageEvent = (user: any, eventArtistId: string): boolean => {
  if (!user) return false;

  if (user.role === Role.ADMIN) return true;

  return (
    user.artistProfile?.isVerified &&
    user.artistProfile?.id === eventArtistId
  );
};


export const createEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user; 
    if (!user) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const { title, description, location, startDate, endDate, artistId } = req.body;

    let targetArtistId: string;
    if (user.role === Role.ADMIN && artistId) {
      const targetArtist = await prisma.artistProfile.findFirst({
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
    } else if (
      user.artistProfile?.isVerified &&
      user.artistProfile?.id
    ) {
      targetArtistId = user.artistProfile.id;
    } else {
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

    const followers = await prisma.userFollow.findMany({
      where: {
        followingArtistId: targetArtistId,
        followingType: 'ARTIST',
      },
      select: { followerId: true },
    });

    const notificationsData = followers.map((follower) => ({
      type: NotificationType.NEW_EVENT,
      message: `Nghệ sĩ vừa tạo event mới: ${title}`,
      recipientType: RecipientType.USER,
      userId: follower.followerId,
      artistId: targetArtistId,
      senderId: targetArtistId,
    }));

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({ data: notificationsData });
      for (const follower of followers) {
        await pusher.trigger(`user-${follower.followerId}`, 'notification', {
          type: NotificationType.NEW_EVENT,
          message: `Nghệ sĩ vừa tạo event mới: ${title}`,
        });
      }
    }

    res.status(201).json({
      message: 'Event created successfully',
      event: newEvent,
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params; 
    if (!user) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const existingEvent = await prisma.event.findUnique({
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
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    if (!user) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const existingEvent = await prisma.event.findUnique({
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
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const toggleEventVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    if (!user) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }

    const existingEvent = await prisma.event.findUnique({
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

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { isActive: !existingEvent.isActive },
    });

    res.json({
      message: `Event ${updatedEvent.isActive ? 'activated' : 'hidden'} successfully`,
      event: updatedEvent,
    });
  } catch (error) {
    console.error('Toggle event error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getEventById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const event = await eventService.getEventById(id);

    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    res.json(event);
  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { artistId, isActive, page = 1, limit = 10 } = req.query;

    const filter: any = {};
    if (artistId) filter.artistId = artistId;
    if (typeof isActive !== 'undefined') {
      filter.isActive = isActive === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [events, total] = await Promise.all([
      eventService.getEvents({
        ...filter,
      }),
      prisma.event.count({ where: filter }),
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
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const joinEvent = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    console.error('Join event error:', error);
    res.status(400).json({ message: error.message || 'Cannot join event' });
  }
};

export const cancelJoinEvent = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error: any) {
    console.error('Cancel join event error:', error);
    res.status(400).json({ message: error.message || 'Cannot cancel join event' });
  }
};
