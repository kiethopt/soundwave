import { Request, Response } from 'express';
import * as EventService from '../services/event.service';


export async function createEvent(req: Request, res: Response): Promise<Response> {
  try {
    const data = req.body;
    if (req.file) {
      data.coverFile = req.file.path;
    }
    const newEvent = await EventService.createEvent(data);
    return res.status(201).json(newEvent);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}


export async function updateEvent(req: Request, res: Response): Promise<Response> {
  try {
    const { id } = req.params;
    const data = req.body;
    if (req.file) {
      data.coverFile = req.file.path;
    }
    const updatedEvent = await EventService.updateEvent(id, data);
    return res.status(200).json(updatedEvent);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}


export async function deleteEvent(req: Request, res: Response): Promise<Response> {
  try {
    const { id } = req.params;
    const deletedEvent = await EventService.deleteEvent(id);
    return res.status(200).json(deletedEvent);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}


export async function toggleEventVisibility(req: Request, res: Response): Promise<Response> {
  try {
    const { id } = req.params;
    const result = await EventService.toggleEventVisibility(id);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}


export async function addTracksToEvent(req: Request, res: Response): Promise<Response> {
  try {
    const { eventId } = req.params;
    const { trackIds } = req.body;
    const result = await EventService.addTracksToEvent(eventId, trackIds);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}


export async function searchEvent(req: Request, res: Response): Promise<Response> {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: 'Missing or invalid query parameter' });
    }
    const results = await EventService.searchEvent(query);
    return res.status(200).json(results);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}


export async function playEvent(req: Request, res: Response): Promise<Response> {
  try {
    const { eventId } = req.params;
    const userId = (req as any).user?.id || 'unknown';
    const result = await EventService.playEvent(eventId, userId);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}


export async function joinEvent(req: Request, res: Response): Promise<Response> {
  try {
    const { id } = req.params; 
    const userId = (req as any).user?.id || req.body.userId;
    const result = await EventService.joinEvent(id, userId);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}


export async function cancelJoinEvent(req: Request, res: Response): Promise<Response> {
  try {
    const { id } = req.params; // id của event
    const userId = (req as any).user?.id || req.body.userId;
    const result = await EventService.cancelJoinEvent(id, userId);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}


export async function getEventById(req: Request, res: Response): Promise<Response> {
  try {
    const { id } = req.params;
    const event = await EventService.getEventById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    return res.status(200).json(event);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}


export async function getAllEvents(req: Request, res: Response): Promise<Response> {
  try {
    const events = await EventService.getAllEvents();
    return res.status(200).json(events);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}
