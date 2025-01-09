// 'use client';

// import { Album, Artist } from '@/types';
// import { api } from '@/utils/api';
// import { useEffect, useState } from 'react';
// import { SearchableSelect } from '../ui/SearchableSelect';

// export interface TrackDetails {
//   title: string;
//   artist: string;
//   featuredArtists: string[];
//   duration: number;
//   trackNumber: number;
//   releaseDate: string;
//   audioMessageId?: string;
// }

// interface TrackUploadFormProps {
//   album: Album;
//   newTracks: File[];
//   trackDetails: { [key: string]: TrackDetails };
//   isUploading: boolean;
//   onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
//   onSubmit: (e: React.FormEvent) => Promise<void>;
//   onTrackDetailChange: (
//     fileName: string,
//     field: keyof TrackDetails,
//     value: any
//   ) => void;
// }

// export default function TrackUploadForm({
//   album,
//   newTracks,
//   trackDetails,
//   isUploading,
//   onFileChange,
//   onSubmit,
//   onTrackDetailChange,
// }: TrackUploadFormProps) {
//   const [artists, setArtists] = useState<Artist[]>([]);

//   useEffect(() => {
//     const fetchArtists = async () => {
//       try {
//         const response = await fetch(api.artists.getAllActive(), {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem('userToken')}`,
//           },
//         });
//         if (!response.ok) throw new Error('Failed to fetch artists');
//         const data = await response.json();
//         setArtists(data);
//       } catch (error) {
//         console.error('Error fetching artists:', error);
//       }
//     };
//     fetchArtists();
//   }, []);

//   return (
//     <form onSubmit={onSubmit} className="space-y-6">
//       <div className="flex items-center gap-4">
//         <input
//           type="file"
//           accept="audio/*"
//           multiple
//           onChange={onFileChange}
//           className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-white file:text-black hover:file:bg-white/90"
//         />
//       </div>

//       {newTracks.length > 0 && (
//         <div className="space-y-6">
//           {newTracks.map((file) => (
//             <div key={file.name} className="bg-white/5 p-6 rounded-lg">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div>
//                   <label className="block text-sm font-medium mb-2">
//                     Title
//                   </label>
//                   <input
//                     type="text"
//                     value={trackDetails[file.name]?.title || ''}
//                     onChange={(e) =>
//                       onTrackDetailChange(file.name, 'title', e.target.value)
//                     }
//                     className="w-full px-3 py-2 bg-white/10 rounded-md"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium mb-2">
//                     Artist
//                   </label>
//                   <SearchableSelect
//                     options={artists}
//                     value={trackDetails[file.name]?.artist || ''}
//                     onChange={(value) =>
//                       onTrackDetailChange(file.name, 'artist', value)
//                     }
//                     placeholder="Select artist"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium mb-2">
//                     Featured Artists
//                   </label>
//                   <SearchableSelect
//                     options={artists}
//                     value={trackDetails[file.name]?.featuredArtists || []}
//                     onChange={(value) =>
//                       onTrackDetailChange(file.name, 'featuredArtists', value)
//                     }
//                     placeholder="Select featured artists"
//                     multiple
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium mb-2">
//                     Duration (MM:SS)
//                   </label>
//                   <input
//                     type="text"
//                     value={
//                       trackDetails[file.name]?.duration
//                         ? `${Math.floor(
//                             trackDetails[file.name].duration / 60
//                           )}:${(trackDetails[file.name].duration % 60)
//                             .toString()
//                             .padStart(2, '0')}`
//                         : '0:00'
//                     }
//                     onChange={(e) => {
//                       const [minutes, seconds] = e.target.value
//                         .split(':')
//                         .map(Number);
//                       onTrackDetailChange(
//                         file.name,
//                         'duration',
//                         minutes * 60 + (seconds || 0)
//                       );
//                     }}
//                     className="w-full px-3 py-2 bg-white/10 rounded-md"
//                     pattern="[0-9]+:[0-5][0-9]"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium mb-2">
//                     Track Number
//                   </label>
//                   <input
//                     type="number"
//                     value={trackDetails[file.name]?.trackNumber || ''}
//                     onChange={(e) =>
//                       onTrackDetailChange(
//                         file.name,
//                         'trackNumber',
//                         parseInt(e.target.value)
//                       )
//                     }
//                     className="w-full px-3 py-2 bg-white/10 rounded-md"
//                     min="1"
//                     required
//                   />
//                 </div>
//               </div>
//             </div>
//           ))}
//           <button
//             type="submit"
//             disabled={isUploading}
//             className="w-full px-4 py-2 bg-white text-black rounded-full hover:bg-white/90 disabled:bg-white/50 disabled:cursor-not-allowed transition-colors"
//           >
//             {isUploading ? 'Uploading...' : 'Upload Tracks'}
//           </button>
//         </div>
//       )}
//     </form>
//   );
// }

import React from 'react';

const TrackUploadForm = () => {
  return <div>form upload single</div>;
};

export default TrackUploadForm;
