'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-toastify';

interface Event {
  id: string;
  title: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  artistId: string;
}

export default function ViewEvent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const artistId = localStorage.getItem('artistId') || 'artist_id_placeholder';

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/events?artistId=${artistId}`);
      if (!res.ok) throw new Error('Cannot fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Error fetching events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Events</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        events.map((event) => (
          <Card key={event.id} className="border p-4">
            <CardHeader>
              <CardTitle>{event.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{event.description}</p>
              <p>Location: {event.location}</p>
              <p>
                Starts: {new Date(event.startDate).toLocaleString()} | Ends:{' '}
                {new Date(event.endDate).toLocaleString()}
              </p>
              <div className="flex space-x-2 mt-2">
                <Button variant="outline" onClick={() => window.location.href=`/artist/events/edit/${event.id}`}>
                  Edit
                </Button>
                <Button variant="destructive" onClick={() => window.location.href=`/artist/events/delete/${event.id}`}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
      <div className="mt-4">
        <Button onClick={() => window.location.href='/artist/events/create'}>Create New Event</Button>
      </div>
    </div>
  );
}
