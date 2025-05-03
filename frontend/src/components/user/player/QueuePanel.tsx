import { useTrack } from "@/contexts/TrackContext";
import { Music, X, Trash2 } from "lucide-react";
import { Play, Pause} from '@/components/ui/Icons';
import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Track } from "@/types";
import Image from "next/image";

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QueuePanel({ isOpen, onClose }: QueuePanelProps) {
  const { 
    queue, 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack, 
    reorderQueue, 
    removeFromQueue,
    clearQueue
  } = useTrack();
  
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);

  if (!isOpen) return null;
  
  const currentIndex = queue.findIndex(track => track.id === currentTrack?.id);
  const rotatedQueue = currentIndex !== -1 ? [...queue.slice(currentIndex), ...queue.slice(0, currentIndex)] : queue;

  const handleDragEnd = (result: DropResult) => {
    // Dropped outside the list
    if (!result.destination) return;
    
    // Convert rotated indices to original queue indices
    const sourceIndex = (result.source.index + currentIndex) % queue.length;
    const destIndex = (result.destination.index + currentIndex) % queue.length;
    
    // Call reorderQueue with the corrected indices
    reorderQueue(sourceIndex, destIndex);
  };
  
  const handleTrackAction = (track: Track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        playTrack(track);
      }
    } else {
      playTrack(track);
    }
  };

  return (
    <div className="fixed right-0 top-0 z-40 h-full w-80 md:w-96 bg-[#121212] border-l border-white/10 overflow-hidden pb-[90px]">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-medium text-white">Now Playing Queue</h3>
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={clearQueue}
                className="p-2 rounded-full hover:bg-white/10"
                title="Clear queue"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        
        {/* Queue content */}
        <div className="flex-1 overflow-y-auto">
          {queue.length > 0 ? (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="queue">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="divide-y divide-white/10"
                  >
                    {rotatedQueue.map((track, index) => (
                      <Draggable key={track.id} draggableId={track.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`px-4 py-3 flex items-center gap-3 ${
                              snapshot.isDragging ? 'bg-white/5' : ''
                            } ${
                              currentTrack?.id === track.id ? 'bg-white/10' : ''
                            }`}
                            onMouseEnter={() => setHoveredTrackId(track.id)}
                            onMouseLeave={() => setHoveredTrackId(null)}
                          >
                            <div className="w-8 h-8 flex-shrink-0">
                              {track.coverUrl ? (
                                <Image 
                                  src={track.coverUrl} 
                                  alt={track.title} 
                                  className="w-full h-full object-cover rounded-sm"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center rounded-sm bg-white/10">
                                  <Music className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0 flex flex-col">
                              <span className={`font-medium truncate ${
                                currentTrack?.id === track.id ? 'text-[#A57865]' : 'text-white'
                              }`}>
                                {track.title}
                              </span>
                              <span className="text-xs truncate text-white/60">
                                {track.artist.artistName}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleTrackAction(track)}
                                className="p-1.5 rounded-full hover:bg-white/10"
                              >
                                {currentTrack?.id === track.id && isPlaying ? (
                                  <Pause className="w-4 h-4 text-white" />
                                ) : (
                                  <Play className="w-4 h-4 text-white" />
                                )}
                              </button>
                              
                              <button
                                onClick={() => removeFromQueue(index)}
                                className={`p-1.5 rounded-full hover:bg-white/10 ${
                                  hoveredTrackId === track.id ? 'opacity-100' : 'opacity-0'
                                } transition-opacity`}
                              >
                                <X className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <Music className="w-12 h-12 mb-2 text-white/20" />
              <p className="text-white/60">
                Your queue is empty
              </p>
              <p className="text-sm text-white/40">
                Add tracks to play next
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
