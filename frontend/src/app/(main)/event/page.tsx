"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { api } from '@/utils/api';

export type EventType = {
  id: string;
  title: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
  coverUrl?: string;
};

export default function EventPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (!token) {
          toast.error('You need to log in to see events!');
          return;
        }
        const params = {}; // Adjust params as needed
        const data = await api.events.getAllEvents(params, token);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111111]">
        <p className="text-secondary animate-pulse">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111111] py-8 px-6 pt-[72px]">
      <div className="max-w-4xl mx-auto pb-8">
        <div className="mb-6 flex justify-between items-center animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-primary inline-block">Upcoming Events</h1>
            <span className="ml-2 text-sm text-secondary">
              ({events.length})
            </span>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <p className="text-lg text-secondary">No events available.</p>
            <Link href="/">
              <button className="btn-primary mt-4 animate-slide-up">Back to Home</button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {events.map((event, index) => (
              <div key={event.id} className="animate-slide-up">
                <Link href={`/event/${event.id}`}>
                  <div
                    className={`dashboard-card flex items-center p-4 transition-all duration-300 ${hoveredEvent === event.id
                      ? 'scale-102 shadow-lg'
                      : 'scale-100 shadow-md'
                    } ${index !== events.length - 1 ? 'border-b border-white/20' : ''}`}
                    onMouseEnter={() => setHoveredEvent(event.id)}
                    onMouseLeave={() => setHoveredEvent(null)}
                  >
                    <div className="w-14 h-14 relative rounded-md overflow-hidden mr-4 flex-shrink-0">
                      <Image
                        src={event.coverUrl || '/images/default-event.jpg'}
                        alt={event.title}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="transition-transform duration-300 hover:scale-110"
                      />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-semibold transition-colors duration-200 text-primary">
                        {event.title}
                      </h2>
                      <p className="text-sm text-secondary">
                        {new Date(event.startDate).toLocaleString()} - {new Date(event.endDate).toLocaleString()}
                      </p>
                      <p className="text-xs mt-1">
                        {event.location}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
