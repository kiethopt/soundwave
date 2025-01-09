// 'use client';

// import { useState } from 'react';
// import { api } from '@/utils/api';
// import { Artist } from '@/types';
// import { SearchableSelect } from '../ui/SearchableSelect';

// interface NewTrackUploadFormProps {
//   artists: Artist[];
// }

// export default function NewTrackUploadForm({
//   artists,
// }: NewTrackUploadFormProps) {
//   const [newTrack, setNewTrack] = useState({
//     title: '',
//     artistId: '',
//     featuredArtists: [] as string[],
//     duration: 0,
//     releaseDate: new Date().toISOString().split('T')[0],
//     audioFile: null as File | null,
//     coverFile: null as File | null,
//   });
//   const [isUploading, setIsUploading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsUploading(true);
//     setError(null);

//     if (!newTrack.artistId) {
//       setError('Please select a main artist');
//       setIsUploading(false);
//       return;
//     }

//     try {
//       const token = localStorage.getItem('userToken');
//       const formData = new FormData();

//       formData.append('title', newTrack.title);
//       formData.append('artistId', newTrack.artistId);

//       // Thêm từng featured artist vào formData
//       newTrack.featuredArtists.forEach((artistId, index) => {
//         formData.append(`featuredArtists[${index}]`, artistId);
//       });

//       formData.append('duration', newTrack.duration.toString());
//       formData.append('releaseDate', newTrack.releaseDate);

//       if (newTrack.audioFile) {
//         formData.append('audio', newTrack.audioFile);
//       }

//       if (newTrack.coverFile) {
//         formData.append('cover', newTrack.coverFile);
//       }

//       const response = await fetch(api.tracks.create(), {
//         method: 'POST',
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//         body: formData,
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.message || 'Failed to create track');
//       }

//       window.location.href = '/admin/tracks';
//     } catch (error: any) {
//       console.error('Error creating track:', error);
//       setError(
//         error instanceof Error ? error.message : 'Failed to create track'
//       );
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-6">
//       <div className="space-y-4">
//         <div>
//           <label htmlFor="title" className="block text-sm font-medium mb-1">
//             Title
//           </label>
//           <input
//             id="title"
//             type="text"
//             value={newTrack.title}
//             onChange={(e) =>
//               setNewTrack({ ...newTrack, title: e.target.value })
//             }
//             className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
//             required
//           />
//         </div>

//         <div className="space-y-2">
//           <label htmlFor="artist" className="block text-sm font-medium">
//             Main Artist
//           </label>
//           <SearchableSelect
//             options={artists.map((artist) => ({
//               id: artist.id,
//               name: artist.name,
//             }))}
//             value={newTrack.artistId}
//             onChange={(value) =>
//               setNewTrack({ ...newTrack, artistId: value as string })
//             }
//             placeholder="Select main artist"
//           />
//         </div>

//         <div className="space-y-2">
//           <label className="block text-sm font-medium">Featured Artists</label>
//           <SearchableSelect
//             options={artists.map((artist) => ({
//               id: artist.id,
//               name: artist.name,
//             }))}
//             value={newTrack.featuredArtists}
//             onChange={(value) =>
//               setNewTrack({ ...newTrack, featuredArtists: value as string[] })
//             }
//             placeholder="Select featured artists"
//             multiple
//           />
//         </div>

//         <div>
//           <label htmlFor="duration" className="block text-sm font-medium mb-1">
//             Duration (mm:ss)
//           </label>
//           <input
//             id="duration"
//             type="text"
//             placeholder="0:00"
//             pattern="[0-9]+:[0-5][0-9]"
//             value={
//               newTrack.duration
//                 ? `${Math.floor(newTrack.duration / 60)}:${(
//                     newTrack.duration % 60
//                   )
//                     .toString()
//                     .padStart(2, '0')}`
//                 : '0:00'
//             }
//             onChange={(e) => {
//               const [minutes, seconds] = e.target.value.split(':').map(Number);
//               setNewTrack({
//                 ...newTrack,
//                 duration: (minutes || 0) * 60 + (seconds || 0),
//               });
//             }}
//             className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
//             required
//           />
//         </div>

//         <div>
//           <label
//             htmlFor="releaseDate"
//             className="block text-sm font-medium mb-1"
//           >
//             Release Date
//           </label>
//           <input
//             id="releaseDate"
//             type="date"
//             value={newTrack.releaseDate}
//             onChange={(e) =>
//               setNewTrack({ ...newTrack, releaseDate: e.target.value })
//             }
//             className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
//             required
//           />
//         </div>

//         <div>
//           <label htmlFor="audioFile" className="block text-sm font-medium mb-1">
//             Audio File
//           </label>
//           <input
//             id="audioFile"
//             type="file"
//             accept="audio/*"
//             onChange={(e) =>
//               setNewTrack({
//                 ...newTrack,
//                 audioFile: e.target.files?.[0] || null,
//               })
//             }
//             className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent file:bg-white/20 file:border-0 file:mr-4 file:px-4 file:py-2 file:rounded-md file:text-sm file:font-medium hover:file:bg-white/30"
//             required
//           />
//         </div>

//         <div>
//           <label htmlFor="coverFile" className="block text-sm font-medium mb-1">
//             Cover Image (optional)
//           </label>
//           <input
//             id="coverFile"
//             type="file"
//             accept="image/*"
//             onChange={(e) =>
//               setNewTrack({
//                 ...newTrack,
//                 coverFile: e.target.files?.[0] || null,
//               })
//             }
//             className="w-full px-3 py-2 bg-white/[0.07] rounded-md border border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent file:bg-white/20 file:border-0 file:mr-4 file:px-4 file:py-2 file:rounded-md file:text-sm file:font-medium hover:file:bg-white/30"
//           />
//         </div>
//       </div>

//       {error && (
//         <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded">
//           {error}
//         </div>
//       )}

//       <button
//         type="submit"
//         disabled={isUploading}
//         className="w-full px-4 py-2 bg-white text-[#121212] rounded-md hover:bg-white/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
//       >
//         {isUploading ? 'Creating Track...' : 'Create Track'}
//       </button>
//     </form>
//   );
// }

import React from 'react';

const NewTrackUploadForm = () => {
  return <div>form upload track mới trong album</div>;
};

export default NewTrackUploadForm;
