'use client';

import { useEffect, useState } from 'react';
import { api } from '@/utils/api';
import toast from 'react-hot-toast';
import { Check, X } from 'lucide-react';

export type EventType = {
  id: string;
  title: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
  artistId: string;
  artistName: string;
};

export default function EventPage() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [isJoined, setIsJoined] = useState<boolean>(false);

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const exampleEvents = [
    {
      id: '1',
      title: 'SUMMER MUSIC CONCERT',
      description:
        "Join us for an evening of live music with top artists. This event will feature multiple performances and a variety of food and drink options. Don't miss out!",
      location: 'Central Park, NY',
      startDate: '2025-06-20T18:00:00Z',
      endDate: '2025-06-20T21:00:00Z',
      artistId: 'artistProfileId1',
      artistName: 'Default Artist',
    },
    {
      id: '2',
      title: 'MODERN ART EXHIBITION',
      description:
        'Explore the latest works from contemporary artists. The exhibition will include interactive installations and guided tours. A must-see for art enthusiasts!',
      location: 'Art Gallery, San Francisco, CA',
      startDate: '2025-07-10T10:00:00Z',
      endDate: '2025-07-10T18:00:00Z',
      artistId: 'artistProfileId2',
      artistName: 'Default Artist',
    },
    {
      id: '3',
      title: 'GOURMET FOOD FESTIVAL',
      description:
        "Taste culinary delights from around the world. Featuring chefs from various cuisines and cultures, this festival is a food lover's paradise. Come hungry!",
      location: 'Food Plaza, Chicago, IL',
      startDate: '2025-08-05T12:00:00Z',
      endDate: '2025-08-05T20:00:00Z',
      artistId: 'artistProfileId3',
      artistName: 'Default Artist',
    },
  ];

  const handleJoinEvent = () => {
    setIsJoined(true);
    toast.success('You have joined the event!');
  };

  const handleCancelJoin = () => {
    setIsJoined(false);
    toast('You have canceled joining the event.');
  };

  const handleEventClick = (event: EventType) => {
    setSelectedEvent(event);
  };

  const closeModal = () => {
    setSelectedEvent(null);
  };

  return (
    <div className="min-h-screen w-full px-6 py-8">
      <h1 className="text-4xl font-bold mb-6">Upcoming Events</h1>
      <div className="h-px bg-white/20 w-full mb-8"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {exampleEvents.map((event) => (
          <div
            key={event.id}
            className="cursor-pointer bg-gradient-to-b from-[#000000] to-[#ffffff] p-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
            onMouseEnter={() => setHoveredEvent(event.id)}
            onMouseLeave={() => setHoveredEvent(null)}
            onClick={() => handleEventClick(event)}
          >
            <div className="relative">
              <div className="w-full h-48 relative overflow-hidden rounded-lg mb-4">
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url('https://i.pinimg.com/736x/c8/82/9d/c8829d119acbd6bd54bfa6effd1fb99d.jpg')`,
                  }}
                ></div>
              </div>
              <div className="flex justify-between">
                <div className="text-left">
                  <h3 className="text-lg font-semibold mb-2">Title:</h3>
                  <h3 className="text-lg font-semibold mb-2">Location:</h3>
                  <h3 className="text-lg font-semibold mb-2">Start Date:</h3>
                  <h3 className="text-lg font-semibold mb-2">End Date:</h3>
                  <h3 className="text-lg font-semibold mb-2">Description:</h3>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                  <p className="text-sm text-gray-700 mb-2">{event.location}</p>
                  <p className="text-sm text-gray-500 mb-2">
                    {new Date(event.startDate).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mb-2">
                    {new Date(event.endDate).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-700">{event.description}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-[#000000] to-[#ffffff] p-6 rounded-lg shadow-lg w-11/12 max-w-lg relative">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              onClick={closeModal}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex justify-between">
              <div className="text-left">
                <h3 className="text-3xl font-bold mb-4">Title:</h3>
                <h3 className="text-lg font-semibold mb-2">Artist:</h3>
                <h3 className="text-lg font-semibold mb-2">Location:</h3>
                <h3 className="text-lg font-semibold mb-2">Start Date:</h3>
                <h3 className="text-lg font-semibold mb-2">End Date:</h3>
                <h3 className="text-lg font-semibold mb-2">Description:</h3>
              </div>
              <div className="text-right">
                <h3 className="text-3xl font-bold mb-4">
                  {selectedEvent.title}
                </h3>
                <p className="text-lg text-gray-700 mb-2">
                  {selectedEvent.artistName}
                </p>
                <p className="text-lg text-gray-700 mb-2">
                  {selectedEvent.location}
                </p>
                <p className="text-lg text-gray-700 mb-2">
                  {new Date(selectedEvent.startDate).toLocaleString()}
                </p>
                <p className="text-lg text-gray-700 mb-2">
                  {new Date(selectedEvent.endDate).toLocaleString()}
                </p>
                <p className="text-lg text-gray-700">
                  {selectedEvent.description}
                </p>
              </div>
            </div>
            <div className="flex justify-center space-x-4 mt-6">
              {!isJoined ? (
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded-lg flex items-center"
                  onClick={handleJoinEvent}
                >
                  <Check className="mr-2 w-5 h-5" /> Join Event
                </button>
              ) : (
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center"
                  onClick={handleCancelJoin}
                >
                  <X className="mr-2 w-5 h-5" /> Cancel Join
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
