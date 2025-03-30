'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { api } from '@/utils/api';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
  artistId: string;
  isJoined?: boolean;
  artistName?: string;
}

export default function EventTotal() {
  const token = localStorage.getItem('userToken') || '';
  const userId = localStorage.getItem('userId') || '';
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [joinStatus, setJoinStatus] = useState<Record<string, boolean>>({});
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const data = await api.events.getAllEvents({}, token);
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Error fetching events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    try {
      await api.events.joinEvent(eventId, userId, token);
      toast.success('Joined event successfully');
      setJoinStatus(prev => ({ ...prev, [eventId]: true }));
    } catch (error) {
      console.error('Error joining event:', error);
      toast.error('Error joining event');
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    try {
      await api.events.cancelJoinEvent(eventId, userId, token);
      toast.success('Cancelled join successfully');
      setJoinStatus(prev => ({ ...prev, [eventId]: false }));
    } catch (error) {
      console.error('Error cancelling event join:', error);
      toast.error('Error cancelling join');
    }
  };

  const handleToggleExpand = (eventId: string) => {
    setExpandedEvent(expandedEvent === eventId ? null : eventId);
  };

  const getShortDescription = (description: string) => {
    const lines = description.split('\n');
    if (lines.length > 2) {
      return `${lines.slice(0, 2).join('\n')}....`;
    }
    return description;
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">All Events</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(event => (
            <Card key={event.id} className="border p-4">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{event.title}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => handleToggleExpand(event.id)}>
                    {expandedEvent === event.id ? <ChevronUp /> : <ChevronDown />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p>{getShortDescription(event.description || '')}</p>
                <p>Location: {event.location}</p>
                <p>
                  Starts: {new Date(event.startDate).toLocaleString()} | Ends: {new Date(event.endDate).toLocaleString()}
                </p>
                <p><strong>Artist:</strong> {event.artistName || 'Default Artist'}</p>
                <div className="flex space-x-2 mt-2">
                  {joinStatus[event.id] ? (
                    <Button variant="destructive" onClick={() => handleCancelEvent(event.id)}>
                      Cancel Join
                    </Button>
                  ) : (
                    <Button onClick={() => handleJoinEvent(event.id)}>
                      Join
                    </Button>
                  )}
                </div>
                {expandedEvent === event.id && (
                  <div className="mt-4 space-y-2">
                    <p>{event.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}