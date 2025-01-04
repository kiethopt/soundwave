// 'use client';

// import { Track } from '@/types';
// import { useSortable } from '@dnd-kit/sortable';
// import { CSS } from '@dnd-kit/utilities';
// import { useEffect, useRef } from 'react';
// import { GripVertical, Pause, Play } from '../ui/Icons';

// interface SortableTrackItemProps {
//   track: Track;
//   isPlaying: boolean;
//   onPlayPause: () => void;
//   formatDuration: (seconds: number) => string;
// }

// export function SortableTrackItem({
//   track,
//   isPlaying,
//   onPlayPause,
//   formatDuration,
// }: SortableTrackItemProps) {
//   const {
//     attributes,
//     listeners,
//     setNodeRef,
//     transform,
//     transition,
//     isDragging,
//   } = useSortable({ id: track.id });
//   const audioRef = useRef<HTMLAudioElement>(null);

//   const style = {
//     transform: CSS.Transform.toString(transform),
//     transition,
//   };

//   useEffect(() => {
//     const audio = audioRef.current;
//     if (audio) {
//       if (isPlaying) {
//         audio.play();
//       } else {
//         audio.pause();
//         audio.currentTime = 0;
//       }
//     }
//   }, [isPlaying]);

//   return (
//     <div
//       ref={setNodeRef}
//       style={style}
//       className={`group px-6 py-2 grid grid-cols-[16px_4fr_3fr_2fr_minmax(120px,1fr)] gap-4 items-center hover:bg-white/5 transition-colors ${
//         isDragging ? 'bg-white/10' : ''
//       }`}
//     >
//       {/* Track number/Play column */}
//       <div className="flex justify-center">
//         <div className="relative w-4 h-4 flex items-center justify-center">
//           <span className="absolute group-hover:hidden text-sm text-white/60">
//             {track.trackNumber}
//           </span>
//           <button
//             onClick={onPlayPause}
//             className="hidden group-hover:block w-4 h-4"
//           >
//             {isPlaying ? (
//               <Pause className="w-4 h-4 text-white" />
//             ) : (
//               <Play className="w-4 h-4 text-white" />
//             )}
//           </button>
//         </div>
//       </div>

//       {/* Title column */}
//       <div className="flex items-center min-w-0">
//         <span className="truncate font-medium text-white">{track.title}</span>
//       </div>

//       {/* Artist column */}
//       <div className="truncate text-sm text-white/60">{track.artist}</div>

//       {/* Featured Artists column */}
//       <div className="truncate text-sm text-white/60">
//         {track.featuredArtists || '-'}
//       </div>

//       {/* Duration and drag handle column */}
//       <div className="flex items-center justify-end gap-6 pr-2">
//         <span className="text-sm text-white/60">
//           {formatDuration(track.duration)}
//         </span>
//         <button
//           {...attributes}
//           {...listeners}
//           className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
//         >
//           <GripVertical className="w-4 h-4 text-white/40" />
//         </button>
//       </div>

//       <audio ref={audioRef} src={track.audioUrl} className="hidden" />
//     </div>
//   );
// }
