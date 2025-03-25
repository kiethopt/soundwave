// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Button } from '@/components/ui/button';
// import { toast } from 'react-toastify';

// interface EventDetailProps {
//   eventId: string;
//   userId: string;
// }

// export function EventDetail({ eventId, userId }: EventDetailProps) {
//   const [event, setEvent] = useState<any>(null);
//   const [joined, setJoined] = useState(false);

//   useEffect(() => {
//     axios.get(`/api/event/${eventId}`)
//       .then(response => setEvent(response.data))
//       .catch(() => toast.error('Không thể tải thông tin event'));
//   }, [eventId]);

//   const handleJoin = () => {
//     axios.post('/api/event/join', { eventId, userId })
//       .then(() => {
//         toast.success('Tham gia event thành công');
//         setJoined(true);
//       })
//       .catch(() => toast.error('Không thể tham gia event'));
//   };

//   const handleCancel = () => {
//     axios.post('/api/event/cancel', { eventId, userId })
//       .then(() => {
//         toast.success('Hủy tham gia event thành công');
//         setJoined(false);
//       })
//       .catch(() => toast.error('Không thể hủy tham gia event'));
//   };

//   if (!event) return <div>Đang tải...</div>;

//   return (
//     <div className="p-4 border rounded">
//       <h2 className="text-xl font-bold">{event.songOrAlbum}</h2>
//       <p>Thời gian: {event.time}</p>
//       <p>Ngày: {event.date}</p>
//       <p>Nghệ sĩ: {event.artistName}</p>
//       {event.fileUrl && (
//         <audio controls src={event.fileUrl} className="w-full mt-2" />
//       )}
//       <div className="mt-4">
//         {joined ? (
//           <Button onClick={handleCancel}>Hủy tham gia</Button>
//         ) : (
//           <Button onClick={handleJoin}>Tham gia event</Button>
//         )}
//       </div>
//     </div>
//   );
// }
