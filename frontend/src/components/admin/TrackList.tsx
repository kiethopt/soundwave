// 'use client';

// import { Track } from '@/types';
// import { useState } from 'react';

// interface TrackListProps {
//   tracks: Track[];
//   albumId: string;
//   albumCoverUrl?: string; // Prop để truyền coverUrl của album
// }

// export default function TrackList({
//   tracks,
//   albumId,
//   albumCoverUrl,
// }: TrackListProps) {
//   const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

//   const formatDuration = (seconds: number) => {
//     const minutes = Math.floor(seconds / 60);
//     const remainingSeconds = seconds % 60;
//     return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
//   };

//   const togglePlay = (trackId: string) => {
//     setCurrentlyPlaying(currentlyPlaying === trackId ? null : trackId);
//   };

//   // Hàm để lấy tên của artist (nếu artist là object hoặc string)
//   const getArtistName = (artist: string | { name: string }): string => {
//     if (typeof artist === 'object' && artist !== null) {
//       return artist.name;
//     }
//     return artist;
//   };

//   // Hàm để lấy danh sách tên của featured artists
//   const getFeaturedArtistsNames = (
//     artists: Array<{ name: string } | string>
//   ): string => {
//     return artists
//       .map((artist) => (typeof artist === 'object' ? artist.name : artist))
//       .join(', ');
//   };

//   return (
//     <div className="w-full bg-black/20 rounded-lg overflow-hidden">
//       <div className="px-6 py-4 border-b border-white/10">
//         <div className="grid grid-cols-[16px_4fr_3fr_2fr_minmax(120px,1fr)] gap-4 text-sm text-white/60">
//           <div className="text-center">#</div>
//           <div>Title</div>
//           <div>Artist</div>
//           <div>Featured Artists</div>
//           <div className="text-left">Duration</div>
//         </div>
//       </div>
//       <div className="divide-y divide-white/10">
//         {tracks.map((track) => (
//           <div
//             key={track.id}
//             className="grid grid-cols-[16px_4fr_3fr_2fr_minmax(120px,1fr)] gap-4 items-center px-6 py-4 hover:bg-white/5 transition-colors"
//           >
//             <div className="text-center">{track.trackNumber}</div>
//             <div className="flex items-center gap-3">
//               {track.coverUrl || albumCoverUrl ? (
//                 <img
//                   src={track.coverUrl || albumCoverUrl}
//                   alt={track.title}
//                   className="w-10 h-10 object-cover rounded"
//                 />
//               ) : (
//                 <div className="w-10 h-10 bg-white/10 rounded"></div>
//               )}
//               <span>{track.title}</span>
//             </div>
//             <div>{getArtistName(track.artist)}</div>
//             <div>
//               {track.featuredArtists && track.featuredArtists.length > 0
//                 ? getFeaturedArtistsNames(track.featuredArtists)
//                 : '-'}
//             </div>
//             <div className="text-left">{formatDuration(track.duration)}</div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

import React from 'react';

const TrackList = () => {
  return <div>TrackList trong trang detail albums</div>;
};

export default TrackList;
