'use client';

import { Track } from '@/types';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableTrackItem } from './SortableTrackItem';
import { API_URL } from '@/utils/config';

interface TrackListProps {
  tracks: Track[];
  albumId: string;
}

export default function TrackList({
  tracks: initialTracks,
  albumId,
}: TrackListProps) {
  const [tracks, setTracks] = useState(initialTracks);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTracks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reorderedTracks = arrayMove(items, oldIndex, newIndex);

        // Update track numbers
        const updatedTracks = reorderedTracks.map((track, index) => ({
          ...track,
          trackNumber: index + 1,
        }));

        // Save new order to database
        const token = localStorage.getItem('userToken');
        fetch(`${API_URL}/api/albums/${albumId}/tracks/reorder`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tracks: updatedTracks.map((track) => ({
              id: track.id,
              trackNumber: track.trackNumber,
            })),
          }),
        }).catch(console.error);

        return updatedTracks;
      });
    }
  };

  const togglePlay = (trackId: string) => {
    setCurrentlyPlaying(currentlyPlaying === trackId ? null : trackId);
  };

  return (
    <div className="w-full bg-black/20 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10">
        <div className="grid grid-cols-[16px_4fr_3fr_2fr_minmax(120px,1fr)] gap-4 text-sm text-white/60">
          <div className="text-center">#</div>
          <div>Title</div>
          <div>Artist</div>
          <div>Featured Artists</div>
          <div className="text-right pr-8">Duration</div>
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={tracks} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-white/10">
            {tracks.map((track) => (
              <SortableTrackItem
                key={track.id}
                track={track}
                isPlaying={currentlyPlaying === track.id}
                onPlayPause={() => togglePlay(track.id)}
                formatDuration={formatDuration}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
