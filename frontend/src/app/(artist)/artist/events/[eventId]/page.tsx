// 'use client';

// import { useCallback, useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import { api } from '@/utils/api';
// import toast from 'react-hot-toast';
// import { useTheme } from '@/contexts/ThemeContext';
// import { ArrowLeft, Edit, Trash2 } from '@/components/ui/Icons';
// import Link from 'next/link';
// import { EventType } from '@/types';
// import { EditEventModal } from '@/components/ui/data-table/data-table-modals';

// export default function EventDetailPage() {
//   const { eventId } = useParams();
//   const router = useRouter();
//   const [event, setEvent] = useState<EventType | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
//   const { theme } = useTheme();

//   useEffect(() => {
//     if (eventId) {
//       fetchEventDetails();
//     }
//   }, [eventId]);

//   const fetchEventDetails = useCallback(async () => {
//     try {
//       setIsLoading(true);
//       setError(null);
//       const token = localStorage.getItem('userToken');

//       if (!token) {
//         throw new Error('No authentication token found');
//       }

//       const data = await api.events.getEventById(eventId as string, token);
//       setEvent(data);
//     } catch (err) {
//       console.error('Error fetching event:', err);
//       setError(err instanceof Error ? err.message : 'Failed to load event');
//     } finally {
//       setIsLoading(false);
//     }
//   }, [eventId]);

//   const handleDeleteEvent = async () => {
//     if (!window.confirm('Are you sure you want to delete this event?')) return;

//     try {
//       const token = localStorage.getItem('userToken');
//       if (!token) throw new Error('No authentication token found');

//       await api.events.deleteEvent(eventId as string, token);
//       toast.success('Event deleted successfully');
//       router.push('/artist/events');
//     } catch (err) {
//       console.error('Error deleting event:', err);
//       toast.error('Failed to delete event');
//     }
//   };

//   const handleUpdateEvent = async (formData: FormData) => {
//     try {
//       const token = localStorage.getItem('userToken');
//       if (!token) {
//         toast.error('No authentication token found');
//         return;
//       }

//       await api.events.updateEvent(eventId as string, formData, token);
//       fetchEventDetails();
//       setEditingEvent(null);
//       toast.success('Event updated successfully');
//     } catch (error) {
//       console.error('Update event error:', error);
//       toast.error(
//         error instanceof Error ? error.message : 'Failed to update event'
//       );
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center p-8">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="p-4 bg-red-500/10 text-red-500 rounded">
//         Error: {error}
//       </div>
//     );
//   }

//   if (!event) {
//     return <div>Event not found</div>;
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <div className="flex justify-between items-center mb-6">
//         <Link href="/artist/events">
//           <ArrowLeft className="w-6 h-6" />
//         </Link>
//         <div className="flex gap-4">
//           <button
//             onClick={() => setEditingEvent(event)}
//             className="p-2 rounded-full transition-colors hover:bg-gray-200"
//           >
//             <Edit className="w-5 h-5" />
//           </button>
//           <button
//             onClick={handleDeleteEvent}
//             className="p-2 rounded-full transition-colors hover:bg-red-200"
//           >
//             <Trash2 className="w-5 h-5 text-red-500" />
//           </button>
//         </div>
//       </div>
//       <div className="bg-white p-4 rounded-lg shadow-md">
//         <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
//         <p className="text-lg mb-2">
//           <strong>Location:</strong> {event.location}
//         </p>
//         <p className="text-lg mb-2">
//           <strong>Start Date:</strong>{' '}
//           {new Date(event.startDate).toLocaleString()}
//         </p>
//         <p className="text-lg mb-2">
//           <strong>End Date:</strong> {new Date(event.endDate).toLocaleString()}
//         </p>
//         <p className="text-lg mb-2">
//           <strong>Description:</strong> {event.description}
//         </p>
//       </div>

//       {editingEvent && (
//         <EditEventModal
//           event={editingEvent}
//           onClose={() => setEditingEvent(null)}
//           onSubmit={handleUpdateEvent}
//         />
//       )}
//     </div>
//   );
// }

export default function EventDetailPage() {
  return <div>Event Detail Page</div>;
}
