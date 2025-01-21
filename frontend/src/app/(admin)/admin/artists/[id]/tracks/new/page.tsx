// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { api } from '@/utils/api';
// import { ArrowLeft } from 'lucide-react';
// import Link from 'next/link';
// import NewTrackUploadForm from '@/components/admin/NewTrackUploadForm';
// import { Artist } from '@/types';

// export default function NewTrack() {
//   const router = useRouter();
//   const [artists, setArtists] = useState<Artist[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // Fetch artists
//   useEffect(() => {
//     const fetchArtists = async () => {
//       try {
//         const token = localStorage.getItem('userToken');
//         if (!token) {
//           router.push('/login');
//           return;
//         }

//         const response = await fetch(api.artists.getAll(), {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         if (!response.ok) {
//           throw new Error('Failed to fetch artists');
//         }

//         const data = await response.json();
//         setArtists(data || []);
//       } catch (error) {
//         console.error('Failed to fetch artists:', error);
//         setError('Failed to fetch artists');
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchArtists();
//   }, [router]);

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

//   return (
//     <div className="container mx-auto p-6 space-y-8">
//       <div className="flex items-center justify-between mb-6">
//         <Link
//           href="/admin/tracks"
//           className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
//         >
//           <ArrowLeft className="w-5 h-5" />
//           <span>Back to Tracks</span>
//         </Link>
//         <h1 className="text-3xl font-bold tracking-tight">Add New Track</h1>
//       </div>
//       <div className="bg-[#121212] rounded-lg overflow-hidden border border-white/[0.08] p-6">
//         <NewTrackUploadForm artists={artists} />
//       </div>
//     </div>
//   );
// }

import React from 'react';

const page = () => {
  return (
    <div>
      <h1>New Track</h1>
    </div>
  );
};

export default page;
