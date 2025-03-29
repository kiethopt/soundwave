'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';
import { api } from '@/utils/api';

interface Event {
  id: string;
  title: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
  artistId: string;
  isJoined?: boolean;
}

export default function EventTotal() {
  const token = localStorage.getItem('userToken') || '';
  const userId = localStorage.getItem('userId') || '';
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [joinStatus, setJoinStatus] = useState<Record<string, boolean>>({});

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

  const handleViewDetails = async (eventId: string) => {
    try {
      const eventDetail = await api.events.getEventById(eventId, token);
      console.log('Event Detail:', eventDetail);
      toast.success('Event detail fetched successfully');
    } catch (error) {
      console.error('Error fetching event detail:', error);
      toast.error('Error fetching event detail');
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">All Events</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        events.map(event => (
          <Card key={event.id} className="border p-4">
            <CardHeader>
              <CardTitle>{event.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{event.description}</p>
              <p>Location: {event.location}</p>
              <p>
                Starts: {new Date(event.startDate).toLocaleString()} | Ends: {new Date(event.endDate).toLocaleString()}
              </p>
              <div className="flex space-x-2 mt-2">
                <Button variant="outline" onClick={() => handleViewDetails(event.id)}>
                  View Details
                </Button>
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
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
