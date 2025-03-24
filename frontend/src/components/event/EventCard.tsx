import React from 'react';

interface Event {
  id: string;
  time: string;
  date: string;
  songOrAlbum: string;
  artistName: string;
  fileUrl?: string;
}

interface EventCardProps {
  event: Event;
  onClick: () => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  return (
    <div onClick={onClick} className="cursor-pointer border p-4 rounded hover:shadow-lg">
      <h3 className="font-semibold">{event.songOrAlbum}</h3>
      <p>Thời gian: {event.time}</p>
      <p>Ngày: {event.date}</p>
      <p>Nghệ sĩ: {event.artistName}</p>
      {event.fileUrl && (
        <audio controls src={event.fileUrl} className="w-full mt-2" />
      )}
    </div>
  );
}
