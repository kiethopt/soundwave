'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from '@/contexts/ThemeContext';

export type EventType = {
  id: string;
  title: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
};

export default function UserTotal() {
  const { theme } = useTheme();
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState<boolean>(false);
  const [joinStatus, setJoinStatus] = useState<{ [key: string]: boolean }>({});

  const userId =
    typeof window !== 'undefined'
      ? localStorage.getItem('userId') || 'user_id_placeholder'
      : 'user_id_placeholder';

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const data = await api.events.getListEvent();
        setEvents(data);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Error fetching events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleViewDetails = async (eventId: string) => {
    try {
      const eventDetail = await api.events.getDetailEvent(eventId);
      setSelectedEvent(eventDetail);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('Error fetching event detail:', error);
      toast.error('Error fetching event detail');
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    try {
      await api.events.joinEvent(eventId, userId);
      toast.success('Joined event successfully');
      setJoinStatus(prev => ({ ...prev, [eventId]: true }));
    } catch (error) {
      console.error('Error joining event:', error);
      toast.error('Error joining event');
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    try {
      await api.events.cancelEvent(eventId, userId);
      toast.success('Cancelled join successfully');
      setJoinStatus(prev => ({ ...prev, [eventId]: false }));
    } catch (error) {
      console.error('Error cancelling event join:', error);
      toast.error('Error cancelling join');
    }
  };

  return (
    <div
      className={`min-h-screen py-8 ${theme === 'light' ? 'text-black' : 'text-white'}`}
      style={{ background: 'linear-gradient(to bottom, #7B3F00 33%, #000000 67%)' }}
    >
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6 text-center">Event List</h1>
        {loading ? (
          <p className="text-center text-lg">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="text-center text-lg">No events available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Card
                key={event.id}
                className={`p-4 rounded shadow border border-[#A57865] ${
                  theme === 'light' ? 'bg-white' : 'bg-gray-800'
                }`}
              >
                <CardHeader className="border-b border-[#A57865] pb-2 mb-2">
                  <CardTitle className="text-2xl font-bold">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-base">{event.description}</p>
                  <p className="text-sm font-medium">Location: {event.location}</p>
                  <p className="text-sm">
                    Time: {new Date(event.startDate).toLocaleString()} - {new Date(event.endDate).toLocaleString()}
                  </p>
                  <div className="flex items-center space-x-3 mt-3">
                    <Button variant="outline" onClick={() => handleViewDetails(event.id)}>
                      <i className="fas fa-search" />
                    </Button>
                    {joinStatus[event.id] ? (
                      <Button variant="destructive" onClick={() => handleCancelEvent(event.id)}>
                        Cancel Join
                      </Button>
                    ) : (
                      <Button variant="default" onClick={() => handleJoinEvent(event.id)}>
                        Join
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent
          className={`p-6 rounded ${theme === 'light' ? 'bg-white' : 'bg-gray-800'} flex flex-col items-center text-center`}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent ? (
            <div className="mt-4 space-y-3">
              <h2 className="text-xl font-semibold">{selectedEvent.title}</h2>
              <p className="text-base">{selectedEvent.description}</p>
              <p className="text-sm font-medium">Location: {selectedEvent.location}</p>
              <p className="text-sm">
                Time: {new Date(selectedEvent.startDate).toLocaleString()} - {new Date(selectedEvent.endDate).toLocaleString()}
              </p>
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
