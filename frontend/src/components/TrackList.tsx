// interface Track {
//   id: string;
//   title: string;
//   duration: number;
//   artist?: {
//     // Thêm optional chaining
//     artistName: string;
//   };
//   // ... other properties
// }

// interface TrackListProps {
//   tracks: Track[];
//   onAddToPlaylist?: (trackId: string) => void;
//   // ... other props
// }

// const TrackList = ({ tracks, onAddToPlaylist, ...props }: TrackListProps) => {
//   return (
//     <div className="space-y-2">
//       {tracks?.map(
//         (
//           track // Thêm optional chaining cho tracks
//         ) => (
//           <div
//             key={track.id}
//             className="flex items-center justify-between p-2 hover:bg-gray-100 rounded"
//           >
//             <div className="flex items-center space-x-4">
//               <div>
//                 <h3 className="font-medium">{track.title}</h3>
//                 {/* Thêm optional chaining cho artist */}
//                 <p className="text-sm text-gray-500">
//                   {track.artist?.artistName}
//                 </p>
//               </div>
//             </div>
//             <div className="flex items-center space-x-4">
//               <span className="text-sm text-gray-500">
//                 {formatDuration(track.duration)}
//               </span>
//               {onAddToPlaylist && (
//                 <button
//                   onClick={() => onAddToPlaylist(track.id)}
//                   className="p-2 hover:bg-gray-200 rounded"
//                 >
//                   <PlusIcon className="w-5 h-5" />
//                 </button>
//               )}
//             </div>
//           </div>
//         )
//       )}
//     </div>
//   );
// };

// export default TrackList;
