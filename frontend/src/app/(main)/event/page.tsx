'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/utils/api';
import { toast } from 'react-toastify';
import { ChevronRight } from 'lucide-react';

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
  const router = useRouter();
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
        const params = {};
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const Section = ({
    title,
    viewAllLink,
    children,
  }: {
    title: string;
    viewAllLink?: string;
    children: React.ReactNode;
  }) => (
    <div className="mb-10">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold">{title}</h2>
        {viewAllLink && (
          <button
            onClick={() => router.push(viewAllLink)}
            className="text-sm text-primary flex items-center hover:underline"
          >
            See All <ChevronRight size={16} />
          </button>
        )}
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen w-full px-6 py-8">
      <h1 className="text-4xl font-bold mb-6">Upcoming Events</h1>
      <div className="h-px bg-white/20 w-full mb-8"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {events.map(event => (
          <div
            key={event.id}
            className="cursor-pointer bg-white p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
            onMouseEnter={() => setHoveredEvent(event.id)}
            onMouseLeave={() => setHoveredEvent(null)}
            onClick={() => router.push(`/event/${event.id}`)}
          >
            <div className="relative">
              <div className="w-full h-48 relative overflow-hidden rounded-lg mb-4">
                <Image
                  src={event.coverUrl || '/images/default-event.jpg'}
                  alt={event.title}
                  layout="fill"
                  objectFit="cover"
                  className="transition-transform duration-300 hover:scale-105"
                />
              </div>
              <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
              <p className="text-sm text-gray-700 mb-2">{event.description}</p>
              <p className="text-sm text-gray-500">
                {new Date(event.startDate).toLocaleString()} - {new Date(event.endDate).toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">{event.location}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
